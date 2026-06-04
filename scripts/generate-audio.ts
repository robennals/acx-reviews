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
const MAX_CHUNK_CHARS = 3000;
const DEFAULT_MODEL = 'gemini-3.1-flash-tts-preview';
const DEFAULT_VOICE = 'Charon';
const STYLE_PREFIX =
  'Narrate the following passage from a book review in a warm, measured, engaged audiobook style:\n\n';

interface CliArgs {
  slug: string;
  voices: string[];
  model: string;
  sample: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let voices: string[] = [];
  let model = DEFAULT_MODEL;
  let sample = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sample') sample = true;
    else if (arg === '--voice' || arg === '--voices') voices = argv[++i].split(',');
    else if (arg === '--model') model = argv[++i];
    else positional.push(arg);
  }
  const slug = positional[0];
  if (!slug) {
    console.error('Usage: generate-audio.ts <slug> [--voice <name>] [--sample] [--model <id>]');
    process.exit(1);
  }
  if (voices.length === 0) voices = [DEFAULT_VOICE];
  return { slug, voices, model, sample };
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
  };

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`Gemini TTS failed after ${attempt} attempts: ${res.status} ${await res.text()}`);
      const waitSeconds = 15 * attempt;
      console.log(`  ${res.status} from API, retrying in ${waitSeconds}s (attempt ${attempt})...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini TTS error ${res.status}: ${await res.text()}`);

    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
    if (!part) throw new Error(`No audio in response: ${JSON.stringify(json).slice(0, 500)}`);
    usage.inputTokens += json.usageMetadata?.promptTokenCount ?? 0;
    usage.outputTokens += json.usageMetadata?.candidatesTokenCount ?? 0;
    return Buffer.from(part.inlineData.data, 'base64');
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

async function generate(
  chunks: SpeechChunk[],
  voice: string,
  model: string,
  apiKey: string
): Promise<{ pcmBuffers: Buffer[]; usage: TtsUsage }> {
  const usage: TtsUsage = { inputTokens: 0, outputTokens: 0 };
  const pcmBuffers: Buffer[] = [];
  for (const [i, chunk] of chunks.entries()) {
    const pcm = await synthesizeChunk(chunk.text, voice, model, apiKey, usage);
    const seconds = pcm.length / (SAMPLE_RATE * 2);
    console.log(`  chunk ${i + 1}/${chunks.length}: ${chunk.text.length} chars -> ${seconds.toFixed(1)}s`);
    pcmBuffers.push(pcm);
  }
  return { pcmBuffers, usage };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set (expected in .env.local)');

  const file = findReviewFile(args.slug);
  const { content } = matter(readFileSync(file, 'utf8'));
  // Hand-written equation → spoken-English mappings (see the JSON file).
  const equationMap = existsSync('data/equation-speech.json')
    ? JSON.parse(readFileSync('data/equation-speech.json', 'utf8'))
    : {};
  const spoken = applyEquationSpeech(content, equationMap);
  const leftoverMath = spoken.match(/\$[^$\n]+\$/g);
  if (leftoverMath) {
    console.warn(
      `  WARNING: ${leftoverMath.length} unmapped $…$ spans (add to data/equation-speech.json):`,
      leftoverMath.slice(0, 5).join('  ')
    );
  }
  const paragraphs = speechParagraphsFromMarkdown(spoken);
  const allChunks = groupIntoChunks(paragraphs, MAX_CHUNK_CHARS);
  const chunks = args.sample ? allChunks.slice(0, 1) : allChunks;
  console.log(`${args.slug}: ${paragraphs.length} paragraphs, ${chunks.length}${args.sample ? ' (sample)' : ''} of ${allChunks.length} chunks, model ${args.model}`);

  mkdirSync('public/audio/samples', { recursive: true });
  mkdirSync('.audio-work', { recursive: true });

  for (const voice of args.voices) {
    console.log(`\nVoice: ${voice}`);
    const { pcmBuffers, usage } = await generate(chunks, voice, args.model, apiKey);
    const pcm = Buffer.concat(pcmBuffers);
    const totalSeconds = pcm.length / (SAMPLE_RATE * 2);

    if (args.sample) {
      const outPath = `public/audio/samples/${args.slug}.${voice}.m4a`;
      encodeM4a(pcm, outPath);
      console.log(`  wrote ${outPath} (${totalSeconds.toFixed(1)}s)`);
    } else {
      const audioPath = `public/audio/${args.slug}.m4a`;
      const wavPath = `.audio-work/${args.slug}.wav`;
      encodeM4a(pcm, audioPath);
      writeFileSync(wavPath, wavFromPcm(pcm, SAMPLE_RATE));

      const timings = chunkTimings(pcmBuffers.map((b) => b.length), SAMPLE_RATE);
      const timingsJson = {
        slug: args.slug,
        voice,
        model: args.model,
        sampleRate: SAMPLE_RATE,
        durationSeconds: totalSeconds,
        chunks: chunks.map((chunk, i) => ({ ...timings[i], paragraphs: chunk.paragraphs })),
      };
      writeFileSync(`public/audio/${args.slug}.timings.json`, JSON.stringify(timingsJson, null, 2));
      console.log(`  wrote ${audioPath} (${(totalSeconds / 60).toFixed(1)} min), ${wavPath}, timings JSON`);
    }
    // Flash TTS list price: $0.50/1M text-in, $10/1M audio-out tokens.
    const estCost = (usage.inputTokens / 1e6) * 0.5 + (usage.outputTokens / 1e6) * 10;
    console.log(`  tokens: ${usage.inputTokens} in / ${usage.outputTokens} out (~$${estCost.toFixed(3)})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
