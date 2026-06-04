# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["whisperx>=3.1"]
# ///
"""Force-align generated narration to its source text using whisperX.

The TTS pipeline (scripts/generate-audio.ts) records exact per-chunk audio
boundaries, so alignment runs one chunk at a time against *known* text --
whisperX only has to place word onsets within a ~3000-char window.

Usage:   uv run scripts/align-audio.py <slug>
Reads:   .audio-work/{slug}.wav  +  public/audio/{slug}.timings.json
Writes:  public/audio/{slug}.words.json
         [{"w": word, "s": startSec, "e": endSec, "p": paragraphIndex}, ...]
"""
import json
import sys


def assign_paragraphs(chunk):
    """Flatten a chunk's paragraphs into (token, paragraph_index) pairs."""
    pairs = []
    for para in chunk["paragraphs"]:
        for token in para["text"].split():
            pairs.append((token, para["index"]))
    return pairs


def interpolate_missing(words):
    """Fill in timestamps whisperX could not align (e.g. bare numbers) by
    spreading them evenly between their timed neighbours."""
    n = len(words)
    i = 0
    while i < n:
        if words[i]["s"] is not None:
            i += 1
            continue
        # Find the run of untimed words [i, j) and its timed neighbours.
        j = i
        while j < n and words[j]["s"] is None:
            j += 1
        prev_end = words[i - 1]["e"] if i > 0 else 0.0
        next_start = words[j]["s"] if j < n else prev_end
        step = (next_start - prev_end) / (j - i)
        for k in range(i, j):
            words[k]["s"] = prev_end + step * (k - i)
            words[k]["e"] = prev_end + step * (k - i + 1)
        i = j
    return words


def main():
    slug = sys.argv[1]
    wav_path = f".audio-work/{slug}.wav"
    with open(f"public/audio/{slug}.timings.json") as f:
        timings = json.load(f)

    import whisperx  # deferred: slow import

    device = "cpu"
    audio = whisperx.load_audio(wav_path)
    model, metadata = whisperx.load_align_model(language_code="en", device=device)

    out_words = []
    aligned_count = 0
    total_count = 0

    for ci, chunk in enumerate(timings["chunks"]):
        token_paras = assign_paragraphs(chunk)
        text = " ".join(tok for tok, _ in token_paras)
        segment = {"start": chunk["startSeconds"], "end": chunk["endSeconds"], "text": text}
        result = whisperx.align([segment], model, metadata, audio, device, return_char_alignments=False)

        # whisperX tokenizes the given text on whitespace, so word entries
        # correspond 1:1 (in order) with our tokens; entries it cannot align
        # come back without start/end.
        aligned_words = [w for seg in result["segments"] for w in seg["words"]]
        if len(aligned_words) != len(token_paras):
            raise AssertionError(
                f"chunk {ci}: {len(aligned_words)} aligned words vs {len(token_paras)} tokens"
            )

        for (token, para_index), aw in zip(token_paras, aligned_words):
            has_time = "start" in aw and "end" in aw
            out_words.append(
                {
                    "w": token,
                    "s": round(aw["start"], 3) if has_time else None,
                    "e": round(aw["end"], 3) if has_time else None,
                    "p": para_index,
                }
            )
            aligned_count += 1 if has_time else 0
            total_count += 1
        print(f"chunk {ci + 1}/{len(timings['chunks'])} aligned", file=sys.stderr)

    out_words = interpolate_missing(out_words)

    # Sanity: timestamps must be monotonically non-decreasing.
    for prev, cur in zip(out_words, out_words[1:]):
        if cur["s"] + 0.5 < prev["s"]:  # allow tiny aligner jitter
            raise AssertionError(f"non-monotonic timestamps: {prev} -> {cur}")

    out_path = f"public/audio/{slug}.words.json"
    with open(out_path, "w") as f:
        json.dump({"slug": slug, "words": out_words}, f)

    coverage = 100.0 * aligned_count / max(total_count, 1)
    print(f"wrote {out_path}: {total_count} words, {coverage:.1f}% directly aligned")


if __name__ == "__main__":
    main()
