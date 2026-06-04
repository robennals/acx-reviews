# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["whisperx>=3.1"]
# ///
"""Force-align generated narration to its source text using whisperX.

The TTS pipeline (scripts/generate-audio.ts) records exact per-chunk audio
boundaries, so alignment runs one chunk at a time against *known* text --
whisperX only has to place word onsets within a ~3000-char window.

The output vocabulary is always the source text's tokens: whisperX entries
that don't correspond to a source token (split artifacts like "book.*" ->
"book.*","*", or anything it invents) can never appear in the output. Their
only possible effect is a bad timestamp via a coincidental difflib match,
which the regression scrub below catches and re-interpolates.

Usage:   uv run scripts/align-audio.py <slug>
         uv run scripts/align-audio.py --self-test   (no model/audio needed)
Reads:   .audio-work/{slug}.wav  +  public/audio/{slug}.timings.json
Writes:  public/audio/{slug}.words.json
         [{"w": word, "s": startSec, "e": endSec, "p": paragraphIndex}, ...]
"""
import difflib
import json
import sys


def assign_paragraphs(chunk):
    """Flatten a chunk's paragraphs into (token, paragraph_index) pairs."""
    pairs = []
    for para in chunk["paragraphs"]:
        for token in para["text"].split():
            pairs.append((token, para["index"]))
    return pairs


def map_tokens(ours, theirs):
    """Positional mapping {ours_index: theirs_index} via exact-equality
    matching blocks. Tokens whisperX split or invented simply don't map."""
    matcher = difflib.SequenceMatcher(None, ours, theirs, autojunk=False)
    mapping = {}
    for a, b, size in matcher.get_matching_blocks():
        for k in range(size):
            mapping[a + k] = b + k
    return mapping


def words_from_alignment(token_paras, aligned_words):
    """Build output words for one chunk: every source token, in order, with
    timestamps where whisperX provided a trustworthy match."""
    ours = [tok for tok, _ in token_paras]
    theirs = [w["word"] for w in aligned_words]
    mapping = map_tokens(ours, theirs)
    out = []
    for i, (token, para_index) in enumerate(token_paras):
        aw = aligned_words[mapping[i]] if i in mapping else {}
        has_time = "start" in aw and "end" in aw
        out.append(
            {
                "w": token,
                "s": round(aw["start"], 3) if has_time else None,
                "e": round(aw["end"], 3) if has_time else None,
                "p": para_index,
            }
        )
    return out, len(mapping)


def scrub_regressions(words, jitter=0.25):
    """Null out timestamps that run backwards. A whisperX entry that isn't
    really our word (hallucinated or split) can only hurt us by winning a
    coincidental match against an equal-looking token elsewhere in the
    chunk; the giveaway is a timestamp behind the running high-water mark.
    Nulled words get re-placed by interpolation."""
    high = 0.0
    for w in words:
        if w["s"] is None:
            continue
        if w["s"] + jitter < high or (w["e"] is not None and w["e"] < w["s"]):
            w["s"] = None
            w["e"] = None
        else:
            high = max(high, w["s"])
    return words


def interpolate_missing(words):
    """Fill in missing timestamps by spreading them evenly between their
    timed neighbours. Clamped so output stays monotonic even when the
    neighbours disagree (next start earlier than previous end)."""
    n = len(words)
    i = 0
    while i < n:
        if words[i]["s"] is not None:
            i += 1
            continue
        j = i
        while j < n and words[j]["s"] is None:
            j += 1
        prev_end = words[i - 1]["e"] if i > 0 else 0.0
        next_start = words[j]["s"] if j < n else prev_end
        # Real timestamps may slightly overlap (prev end past next start);
        # anchor at the earlier of the two so filled-in starts can never
        # overtake the next real start.
        lo = min(prev_end, next_start)
        step = (next_start - lo) / (j - i)
        for k in range(i, j):
            words[k]["s"] = round(lo + step * (k - i), 3)
            words[k]["e"] = round(lo + step * (k - i + 1), 3)
        i = j
    return words


def check_monotonic(words, jitter=0.5):
    for prev, cur in zip(words, words[1:]):
        if cur["s"] + jitter < prev["s"]:
            raise AssertionError(f"non-monotonic timestamps: {prev} -> {cur}")


def finalize(words):
    """Shared post-processing: scrub suspect timestamps, fill gaps, verify."""
    words = interpolate_missing(scrub_regressions(words))
    check_monotonic(words)
    return words


def self_test():
    def tp(text, p=0):
        return [(tok, p) for tok in text.split()]

    def aw(word, s=None, e=None):
        d = {"word": word}
        if s is not None:
            d["start"] = s
            d["end"] = e
        return d

    # 1. Split artifacts (the brothers-karamazov case): extra '*' and '[1]'
    # entries; output is exactly the source tokens, monotonic.
    token_paras = tp("read the book.* There are exceptions.[1] But still")
    aligned = [
        aw("read", 0.0, 0.2), aw("the", 0.3, 0.4), aw("book.*", 0.5, 0.8),
        aw("*"),  # split artifact, no timestamps
        aw("There", 1.0, 1.2), aw("are", 1.3, 1.4),
        aw("exceptions.[", 1.5, 1.9), aw("[1]"),  # split pair
        aw("But", 2.1, 2.2), aw("still", 2.3, 2.5),
    ]
    words, _ = words_from_alignment(token_paras, aligned)
    words = finalize(words)
    assert [w["w"] for w in words] == [t for t, _ in token_paras], "vocabulary changed"
    assert words[6]["s"] is not None, "split token not interpolated"
    print("PASS: split artifacts produce source vocabulary, all timed")

    # 2. Hallucinated word not in the source: ignored entirely.
    token_paras = tp("alpha beta gamma")
    aligned = [aw("alpha", 0.0, 0.2), aw("INVENTED", 0.25, 0.3), aw("beta", 0.4, 0.5), aw("gamma", 0.6, 0.7)]
    words, _ = words_from_alignment(token_paras, aligned)
    words = finalize(words)
    assert [w["w"] for w in words] == ["alpha", "beta", "gamma"]
    assert words[1]["s"] == 0.4, "beta should keep its real timestamp"
    print("PASS: hallucinated word ignored")

    # 3. Hallucinated duplicate of a common word steals the match and would
    # drag a timestamp backwards: scrubbed and re-interpolated.
    token_paras = tp("one two the three four the five")
    aligned = [
        aw("one", 0.0, 0.2), aw("two", 0.3, 0.4),
        aw("the", 0.5, 0.6), aw("three", 0.7, 0.8), aw("four", 0.9, 1.0),
        aw("the", 0.05, 0.1),  # bogus regressed timestamp for second "the"
        aw("five", 1.3, 1.5),
    ]
    words, _ = words_from_alignment(token_paras, aligned)
    words = finalize(words)
    check_monotonic(words, jitter=0.0)
    assert 1.0 <= words[5]["s"] <= 1.3, f"regressed 'the' not re-placed: {words[5]}"
    print("PASS: regressed timestamp scrubbed and re-interpolated")

    # 4. whisperX drops words entirely: interpolated between neighbours.
    token_paras = tp("start middle1 middle2 middle3 end")
    aligned = [aw("start", 0.0, 1.0), aw("end", 4.0, 4.5)]
    words, _ = words_from_alignment(token_paras, aligned)
    words = finalize(words)
    assert all(w["s"] is not None for w in words)
    assert words[1]["s"] == 1.0 and words[3]["e"] == 4.0
    print("PASS: dropped words interpolated")

    # 5. Disagreeing neighbours (next start before previous end): clamped,
    # still monotonic.
    token_paras = tp("a b c")
    aligned = [aw("a", 0.0, 2.0), aw("c", 1.5, 2.5)]
    words, _ = words_from_alignment(token_paras, aligned)
    words = finalize(words)
    check_monotonic(words, jitter=0.0)
    print("PASS: clamped interpolation stays monotonic")

    print("self-test: 5/5 passed")


def main():
    if sys.argv[1] == "--self-test":
        self_test()
        return

    slug = sys.argv[1]
    wav_path = f".audio-work/{slug}.wav"
    with open(f"public/audio/{slug}.timings.json") as f:
        timings = json.load(f)

    import whisperx  # deferred: slow import

    device = "cpu"
    audio = whisperx.load_audio(wav_path)
    model, metadata = whisperx.load_align_model(language_code="en", device=device)

    out_words = []
    matched_total = 0
    token_total = 0

    for ci, chunk in enumerate(timings["chunks"]):
        token_paras = assign_paragraphs(chunk)
        text = " ".join(tok for tok, _ in token_paras)
        segment = {"start": chunk["startSeconds"], "end": chunk["endSeconds"], "text": text}
        result = whisperx.align([segment], model, metadata, audio, device, return_char_alignments=False)

        aligned_words = [w for seg in result["segments"] for w in seg["words"]]
        words, matched = words_from_alignment(token_paras, aligned_words)
        if matched < 0.95 * len(token_paras):
            raise AssertionError(
                f"chunk {ci}: only {matched}/{len(token_paras)} tokens matched "
                f"whisperX output ({len(aligned_words)} entries)"
            )
        out_words.extend(words)
        matched_total += matched
        token_total += len(token_paras)
        print(f"chunk {ci + 1}/{len(timings['chunks'])} aligned", file=sys.stderr)

    out_words = finalize(out_words)

    out_path = f"public/audio/{slug}.words.json"
    with open(out_path, "w") as f:
        json.dump({"slug": slug, "words": out_words}, f)

    coverage = 100.0 * matched_total / max(token_total, 1)
    print(f"wrote {out_path}: {token_total} words, {coverage:.1f}% directly aligned")


if __name__ == "__main__":
    main()
