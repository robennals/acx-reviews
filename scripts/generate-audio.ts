/**
 * Generate narration audio for a review using Gemini TTS.
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-audio.ts <slug> [--voice Charon] [--model <id>]
 *   pnpm exec tsx scripts/generate-audio.ts <slug> --sample --voices Charon,Sulafat,Iapetus,Gacrux
 *
 * Outputs (gitignored):
 *   public/audio/{slug}.m4a              full narration (AAC 96kbps mono)
 *   public/audio/{slug}.timings.json     per-chunk start/end + paragraph text
 *   .audio-work/{slug}.wav               lossless copy for whisperX alignment
 *   public/audio/samples/{slug}.{voice}.m4a   --sample mode (first chunk only)
 */
import { config as loadEnv } from 'dotenv';
import { Agent, fetch as undiciFetch } from 'undici';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import matter from 'gray-matter';
import {
  speechParagraphsFromMarkdown,
  groupIntoChunks,
  applyEquationSpeech,
  type SpeechChunk,
} from './lib/audio-text';
import { wavFromPcm, chunkTimings } from './lib/audio-encode';

loadEnv({ path: '.env.local' });

const SAMPLE_RATE = 24000; // Gemini TTS output: 16-bit mono PCM at 24kHz
// Provider-dependent chunk size, picked by ear and by measurement:
// - Gemini TTS audibly degrades within a generation (speech rate +12.7%
//   mean / +43% worst from first to last third of ~3-minute chunks, voice
//   losing its prompt anchor) — it needs ~70s chunks.
// - gpt-4o-mini-tts stays solid across 6-minute generations (listening
//   test on works-by-isaac-bickerstaff), and fewer seams give better
//   continuity. Its hard input cap is 2k tokens, so ~5.5k chars max.
const OPENAI_CHUNK_CHARS = 5500;
const GEMINI_CHUNK_CHARS = 1100;
// gpt-4o-mini-tts (Sage) won the final bake-off: pacing consistency at
// least as good as gemini-2.5-flash, ~$0.015/min, and 5,000 req/min rate
// limits vs Gemini's 100 req/day. Gemini models remain available via
// --model for comparison runs.
const DEFAULT_MODEL = 'gpt-4o-mini-tts';
const DEFAULT_VOICE = 'sage';
const STYLE_INSTRUCTIONS =
  'Narrate in a warm, measured, engaged audiobook style. ' +
  'Keep a steady, unhurried pace throughout — never rush, even through plot summaries, lists, or asides.';
const STYLE_PREFIX = STYLE_INSTRUCTIONS.replace('Narrate', 'Narrate the following passage from a book review') + '\n\n';

// OpenAI models ("gpt-…", "tts-…") speak via /v1/audio/speech; everything
// else is a Gemini generateContent TTS model.
function isOpenAiModel(model: string): boolean {
  return model.startsWith('gpt-') || model.startsWith('tts-');
}

interface CliArgs {
  slug: string;
  voices: string[];
  model: string;
  sample: boolean;
  /** Chunk indices to regenerate; all other chunks reuse the existing WAV. */
  onlyChunks: number[] | null;
  /** Override MAX_CHUNK_CHARS (experiments). */
  maxChars: number;
  /** Write outputs under this name instead of the slug (experiments). */
  outName: string;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let voices: string[] = [];
  let model = DEFAULT_MODEL;
  let sample = false;
  let onlyChunks: number[] | null = null;
  let maxChars = 0; // 0 = provider default, resolved in main()
  let outName = '';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sample') sample = true;
    else if (arg === '--voice' || arg === '--voices') voices = argv[++i].split(',');
    else if (arg === '--model') model = argv[++i];
    else if (arg === '--chunks') onlyChunks = argv[++i].split(',').map(Number);
    else if (arg === '--max-chars') maxChars = Number(argv[++i]);
    else if (arg === '--as') outName = argv[++i];
    else positional.push(arg);
  }
  const slug = positional[0];
  if (!slug) {
    console.error(
      'Usage: generate-audio.ts <slug> [--voice <name>] [--sample] [--model <id>] [--chunks 0,3]'
    );
    process.exit(1);
  }
  if (voices.length === 0) voices = [DEFAULT_VOICE];
  return { slug, voices, model, sample, onlyChunks, maxChars, outName: outName || slug };
}

/** Slice the previous run's lossless WAV back into per-chunk PCM buffers
 *  using the recorded chunk timings (exact: they came from byte lengths). */
function pcmFromPreviousRun(slug: string, expectedChunks: number): Buffer[] {
  const wavPath = `.audio-work/${slug}.wav`;
  const timingsPath = `public/audio/${slug}.timings.json`;
  if (!existsSync(wavPath) || !existsSync(timingsPath)) {
    throw new Error(`--chunks needs a previous run (${wavPath} + ${timingsPath})`);
  }
  const timings = JSON.parse(readFileSync(timingsPath, 'utf8'));
  if (timings.chunks.length !== expectedChunks) {
    throw new Error(
      `--chunks: text now chunks into ${expectedChunks} but previous run had ${timings.chunks.length} (source changed? regenerate fully)`
    );
  }
  const pcm = readFileSync(wavPath).subarray(44); // strip WAV header
  return timings.chunks.map((c: { startSeconds: number; endSeconds: number }) =>
    pcm.subarray(
      Math.round(c.startSeconds * SAMPLE_RATE) * 2,
      Math.round(c.endSeconds * SAMPLE_RATE) * 2
    )
  );
}

function findReviewFile(slug: string): string {
  const matches = globSync(`data/reviews/*/${slug}.md`);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one review for slug "${slug}", found: ${matches.join(', ') || 'none'}`);
  }
  return matches[0];
}

interface TtsUsage {
  inputTokens: number;
  outputTokens: number;
}

const longHaul = new Agent({ headersTimeout: 15 * 60_000, bodyTimeout: 15 * 60_000 });

async function synthesizeChunk(
  text: string,
  voice: string,
  model: string,
  apiKey: string,
  usage: TtsUsage
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: STYLE_PREFIX + text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
    // Book reviews legitimately discuss disease, violence, and sex (e.g.
    // Ibsen's Ghosts -> syphilis): without this, narration randomly fails
    // with PROHIBITED_CONTENT false positives.
    safetySettings: [
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
    ].map((category) => ({ category, threshold: 'BLOCK_NONE' })),
  };

  for (let attempt = 1; ; attempt++) {
    let res: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      res = await undiciFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        // Long generations (esp. the pro model) can exceed undici's default
        // 5-minute header timeout; allow up to 15 minutes per chunk.
        dispatcher: longHaul,
      });
    } catch (err) {
      if (attempt >= 5) throw err;
      const waitSeconds = 15 * attempt;
      console.log(`  network error (${(err as Error).cause ?? err}), retrying in ${waitSeconds}s (attempt ${attempt})...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`Gemini TTS failed after ${attempt} attempts: ${res.status} ${await res.text()}`);
      const waitSeconds = 15 * attempt;
      console.log(`  ${res.status} from API, retrying in ${waitSeconds}s (attempt ${attempt})...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini TTS error ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as any;
    const part = json.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
    if (!part) {
      const reason = json.candidates?.[0]?.finishReason;
      // PROHIBITED_CONTENT: stochastic safety false-positive on literary
      // content. OTHER: opaque transient generation failure (seen on the
      // pro model). Both usually succeed on retry.
      if ((reason === 'PROHIBITED_CONTENT' || reason === 'OTHER') && attempt < 5) {
        console.log(`  no audio (${reason}, attempt ${attempt}), retrying...`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw new Error(`No audio in response (${reason}): ${JSON.stringify(json).slice(0, 300)}`);
    }
    usage.inputTokens += json.usageMetadata?.promptTokenCount ?? 0;
    usage.outputTokens += json.usageMetadata?.candidatesTokenCount ?? 0;
    return Buffer.from(part.inlineData.data, 'base64');
  }
}

let loggedRateLimits = false;

async function synthesizeChunkOpenAi(
  text: string,
  voice: string,
  model: string,
  apiKey: string
): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    let res: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      res = await undiciFetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          instructions: STYLE_INSTRUCTIONS,
          response_format: 'pcm', // raw 24kHz 16-bit mono, same as Gemini
        }),
        dispatcher: longHaul,
      });
    } catch (err) {
      if (attempt >= 5) throw err;
      const waitSeconds = 15 * attempt;
      console.log(`  network error (${(err as Error).cause ?? err}), retrying in ${waitSeconds}s...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (!loggedRateLimits) {
      loggedRateLimits = true;
      console.log(
        `  openai rate limits: ${res.headers.get('x-ratelimit-limit-requests') ?? '?'} req/min`
      );
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`OpenAI TTS failed after ${attempt} attempts: ${res.status} ${await res.text()}`);
      const waitSeconds = 15 * attempt;
      console.log(`  ${res.status} from API, retrying in ${waitSeconds}s (attempt ${attempt})...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`OpenAI TTS error ${res.status}: ${await res.text()}`);
    try {
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      // Stream errors (e.g. ERR_HTTP2_STREAM_ERROR) can hit mid-body too.
      if (attempt >= 5) throw err;
      const waitSeconds = 15 * attempt;
      console.log(`  body read error (${err}), retrying in ${waitSeconds}s...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
    }
  }
}

/** Encode to AAC (.m4a): markedly better than MP3 for speech at the same
 *  bitrate and just as universally playable. +faststart fronts the moov
 *  atom so playback and range-request seeking start instantly from R2. */
function encodeM4a(pcm: Buffer, outPath: string): void {
  execFileSync(
    'ffmpeg',
    [
      '-y', '-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', 'pipe:0',
      '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', outPath,
    ],
    { input: pcm, stdio: ['pipe', 'ignore', 'pipe'] }
  );
}

/** Run `tasks` with at most `limit` in flight; results keep input order. */
async function asyncPool<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

// Concurrent chunk synthesis per review. OpenAI allows 5,000 req/min, so
// even with several review workers this stays far under the limit; the win
// is generation wall-clock dropping from sum-of-chunks to ~longest chunk.
const CHUNK_CONCURRENCY = 4;

async function generate(
  chunks: SpeechChunk[],
  voice: string,
  model: string,
  apiKey: string,
  reusePcm: (Buffer | null)[] | null,
  cacheDir: string
): Promise<{ pcmBuffers: Buffer[]; usage: TtsUsage }> {
  const usage: TtsUsage = { inputTokens: 0, outputTokens: 0 };
  mkdirSync(cacheDir, { recursive: true });

  const synthesizeOne = async (chunk: SpeechChunk, i: number): Promise<Buffer> => {
    // Per-chunk PCM cache: a rerun after a crash (quota, network) resumes
    // instead of re-paying for chunks already synthesized.
    const hash = createHash('sha1').update(`${model}\0${voice}\0${chunk.text}`).digest('hex').slice(0, 12);
    const cachePath = `${cacheDir}/${i}-${hash}.pcm`;
    let reused = reusePcm?.[i] ?? null;
    if (!reused && existsSync(cachePath)) reused = readFileSync(cachePath);

    let pcm: Buffer;
    if (reused) {
      pcm = reused;
    } else {
      // The model occasionally rolls a whole chunk read absurdly fast
      // (observed: 19.5 chars/sec vs the ~15 norm). Re-roll fast chunks a
      // couple of times and keep the attempt closest to normal pace; only
      // accepted audio enters the cache.
      let best: Buffer | null = null;
      let bestDelta = Infinity;
      for (let roll = 1; roll <= 3; roll++) {
        const attemptPcm = isOpenAiModel(model)
          ? await synthesizeChunkOpenAi(chunk.text, voice, model, apiKey)
          : await synthesizeChunk(chunk.text, voice, model, apiKey, usage);
        const rate = chunk.text.length / (attemptPcm.length / (SAMPLE_RATE * 2));
        const delta = Math.abs(rate - 15);
        if (delta < bestDelta) {
          best = attemptPcm;
          bestDelta = delta;
        }
        if (rate <= 17.5) break;
        console.log(`    fast roll on chunk ${i + 1} (${rate.toFixed(1)} chars/sec), re-rolling (${roll}/3)...`);
      }
      pcm = best!;
      writeFileSync(cachePath, pcm);
    }

    const seconds = pcm.length / (SAMPLE_RATE * 2);
    const rate = chunk.text.length / seconds;
    const note = reused
      ? ' (reused)'
      : rate > 17.5
        ? `  WARNING: still fast after re-rolls (${rate.toFixed(1)} chars/sec)`
        : '';
    console.log(
      `  chunk ${i + 1}/${chunks.length}: ${chunk.text.length} chars -> ${seconds.toFixed(1)}s${note}`
    );
    return pcm;
  };

  // Gemini chunks stay serial: its daily quota makes bursts pointless.
  const limit = isOpenAiModel(model) ? CHUNK_CONCURRENCY : 1;
  const pcmBuffers = await asyncPool(
    limit,
    chunks.map((chunk, i) => () => synthesizeOne(chunk, i))
  );
  return { pcmBuffers, usage };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const openai = isOpenAiModel(args.model);
  const apiKey = openai ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(`${openai ? 'OPENAI' : 'GEMINI'}_API_KEY not set (expected in .env.local)`);
  }
  if (!openai && args.voices.length === 1 && args.voices[0] === DEFAULT_VOICE) {
    args.voices = ['Sulafat']; // Gemini's bake-off voice
  }

  const file = findReviewFile(args.slug);
  const { content } = matter(readFileSync(file, 'utf8'));
  // Hand-written equation → spoken-English mappings (see the JSON file).
  const equationMap = existsSync('data/equation-speech.json')
    ? JSON.parse(readFileSync('data/equation-speech.json', 'utf8'))
    : {};
  const spoken = applyEquationSpeech(content, equationMap);
  // Require LaTeX-ish content (a backslash command or ^/_ scripts) so plain
  // dollar amounts ('$12 ... $3.50') don't trip the warning.
  const leftoverMath = spoken.match(/\$[^$\n]*(?:\\[a-zA-Z]+|[^$\n][\^_])[^$\n]*\$/g);
  if (leftoverMath) {
    console.warn(
      `  WARNING: ${leftoverMath.length} unmapped $…$ spans (add to data/equation-speech.json):`,
      leftoverMath.slice(0, 5).join('  ')
    );
  }
  const paragraphs = speechParagraphsFromMarkdown(spoken);
  const maxChars = args.maxChars || (openai ? OPENAI_CHUNK_CHARS : GEMINI_CHUNK_CHARS);
  const allChunks = groupIntoChunks(paragraphs, maxChars);
  const chunks = args.sample ? allChunks.slice(0, 1) : allChunks;
  console.log(`${args.slug}: ${paragraphs.length} paragraphs, ${chunks.length}${args.sample ? ' (sample)' : ''} of ${allChunks.length} chunks, model ${args.model}`);

  mkdirSync('public/audio/samples', { recursive: true });
  mkdirSync('.audio-work', { recursive: true });

  // --chunks N,M: keep every other chunk's PCM from the previous run.
  let reusePcm: (Buffer | null)[] | null = null;
  if (args.onlyChunks) {
    if (args.sample) throw new Error('--chunks and --sample are mutually exclusive');
    const previous = pcmFromPreviousRun(args.outName, allChunks.length);
    reusePcm = previous.map((buf, i) => (args.onlyChunks!.includes(i) ? null : buf));
    console.log(`regenerating chunks [${args.onlyChunks.join(', ')}], reusing the rest`);
  }

  for (const voice of args.voices) {
    console.log(`\nVoice: ${voice}`);
    const { pcmBuffers, usage } = await generate(
      chunks, voice, args.model, apiKey, reusePcm,
      `.audio-work/${args.outName}.chunks`
    );
    const pcm = Buffer.concat(pcmBuffers);
    const totalSeconds = pcm.length / (SAMPLE_RATE * 2);

    if (args.sample) {
      const outPath = `public/audio/samples/${args.outName}.${voice}.m4a`;
      encodeM4a(pcm, outPath);
      console.log(`  wrote ${outPath} (${totalSeconds.toFixed(1)}s)`);
    } else {
      const audioPath = `public/audio/${args.outName}.m4a`;
      const wavPath = `.audio-work/${args.outName}.wav`;
      encodeM4a(pcm, audioPath);
      writeFileSync(wavPath, wavFromPcm(pcm, SAMPLE_RATE));

      const timings = chunkTimings(pcmBuffers.map((b) => b.length), SAMPLE_RATE);
      const timingsJson = {
        slug: args.outName,
        voice,
        model: args.model,
        sampleRate: SAMPLE_RATE,
        durationSeconds: totalSeconds,
        chunks: chunks.map((chunk, i) => ({ ...timings[i], paragraphs: chunk.paragraphs })),
      };
      writeFileSync(`public/audio/${args.outName}.timings.json`, JSON.stringify(timingsJson, null, 2));
      console.log(`  wrote ${audioPath} (${(totalSeconds / 60).toFixed(1)} min), ${wavPath}, timings JSON`);
    }
    // Per-1M-token list prices (ai.google.dev/gemini-api/docs/pricing).
    // 3.1-flash-tts-preview is priced at the pro tier, not the flash tier.
    const PRICES: Record<string, [number, number]> = {
      'gemini-2.5-flash-preview-tts': [0.5, 10],
      'gemini-2.5-pro-preview-tts': [1, 20],
      'gemini-3.1-flash-tts-preview': [1, 20],
    };
    const [inPrice, outPrice] = PRICES[args.model] ?? [1, 20];
    const estCost = openai
      ? (totalSeconds / 60) * 0.015 // gpt-4o-mini-tts ~$0.015/min audio
      : (usage.inputTokens / 1e6) * inPrice + (usage.outputTokens / 1e6) * outPrice;
    console.log(
      openai
        ? `  ~$${estCost.toFixed(3)} (est. $0.015/min)`
        : `  tokens: ${usage.inputTokens} in / ${usage.outputTokens} out (~$${estCost.toFixed(3)})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
