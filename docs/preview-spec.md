# Google Docs submission preview

Status: basic preview implemented; broader design notes retained from 2026-09-13. The “Basic implementation scope” section below describes the shipped subset; other proposed behavior remains design guidance. The supplied example establishes Title → Heading 1 → Heading 2, with no deeper heading levels. Simple native tables and explicit LaTeX are agreed; native Docs equation conversion is out of scope.

## Purpose

Help entrants see how their review will appear in this app and fix formatting before submitting to the next ACX review contest. Previewing does not submit, publish, or assess an entry's eligibility or quality.

The central promise: a document imported using the new submission format produces the same article content, typography, images, and footnote interactions as its preview. The preview is a current fetch, not a frozen submission or a guarantee about future edits.

## Proposed authoring rules

Use ordinary Google Docs formatting wherever possible. Teach one convention per feature. Do not infer structure from writing style, font size, or the contents of a quotation.

| Feature | Author's instruction | App behavior |
| --- | --- | --- |
| Review title | Apply **Title** to the first nonempty paragraph. Exactly one title. The file name is not the review title. | Render once as the article's page heading (`h1`). |
| Sections | Apply **Heading 1**. | Render as `h2`. |
| Subsections | Apply **Heading 2**. Do not use deeper heading levels. | Render as `h3`. Heading 2 must follow a Heading 1 parent. |
| Body text | Use **Normal text**. Leave a blank line between paragraphs (Enter twice). Use Shift+Enter for a line break within one unit. | App controls font, size, width, spacing, and color. Extra blank paragraphs do not create custom spacing. |
| Emphasis and links | Use native bold, italic, underline, strikethrough, and hyperlinks. | Preserve these inline semantics, including underline as requested by the example. Highlighting, custom fonts, and text colors do not carry meaning in this format. |
| Prose quotations | Select Normal text paragraphs and use **Increase indent once**, starting from an unindented paragraph. Leave a blank line between paragraphs (Enter twice). | Consecutive indented paragraphs form one blockquote with distinct paragraphs. Lists are recognized before quote indentation. |
| Poetry quotations | Use the same quote indentation. Ordinary Enter may separate short verse lines; a **blank line** separates stanzas. If any line in a consecutive group exceeds 60 characters, use Shift+Enter within a single paragraph to make the stanza explicit. | Preserve explicit line breaks within a stanza and paragraph spacing between stanzas. Long lines can wrap on narrow screens. |
| Inline quotations | Type quotation marks within a normal paragraph. | Ordinary text; no automatic blockquote detection. |
| Footnotes | Use the native **Insert footnote** command. Do not type reference numbers or maintain a notes section manually. | Number by reference order, open with the site's footnote UI, and show the end-of-article footnote list. Preserve paragraphs, emphasis, and links in notes. |
| Separators | Insert a native **Horizontal line**. | Render the site's thematic separator. Lines of asterisks, hyphens, underscores, or page breaks are not separator syntax. |
| Images | Insert an image **in line with text**, in its own paragraph. Add a caption or descriptive alt text. | Use the site's image sizing policy; preserve aspect ratio and supported source cropping. Do not enlarge images simply to fill the page. |
| Image captions | Immediately after the image, add one **centered, italic Normal text paragraph**. | Attach it as a figure caption, preserving inline emphasis and links. If explicit alt text is absent, use the caption’s plain text as alt text; do not warn about missing alt text when a caption exists. Centering elsewhere does not create captions. |
| Lists | Use native numbered or bulleted lists; use list indentation for nesting. | Preserve ordering, starting number, nesting, and inline formatting. |
| Tables | Use a native rectangular table with a header in its first row. No merged cells or layout tables. | Render a semantic table; preserve text, emphasis, and links. Allow horizontal scrolling on small screens. |

Quote details: a first-line indent, leading spaces, tabs, italics, or smaller text alone never creates a quote. One indentation level is the supported quote convention; nested quotations can use quotation marks inside the block. Keep attribution in the last quote paragraph or in a normal paragraph after it. Indentation values exported by Docs need a small numeric tolerance; determine that from the fixture rather than comparing CSS strings literally.

Paragraph validation: two adjacent nonempty prose paragraphs without an intervening empty paragraph are an error. Exception: a run of adjacent indented paragraphs is a poetry stanza when every source line is at most 60 Unicode characters (excluding surrounding whitespace). If any line exceeds 60 characters, flag the group and require Shift+Enter within one paragraph to confirm the intended unit. A lone long quote paragraph is ordinary prose and is valid. Shift+Enter is a valid break within a single paragraph; automatic visual wrapping is never an error. An empty paragraph means actual empty/whitespace-only source content, not merely extra CSS paragraph spacing. Preserve source empties until validation finishes. Do not silently join ambiguous paragraphs. Error copy: “Leave a blank line between paragraphs, or use Shift+Enter if these lines belong together.”

Exempt structurally defined boundaries: titles/headings and the content next to them, separate list items, separate table cells/rows, image-caption pairs, separators, and separate native footnote definitions. Within a list item, table cell, or footnote containing multiple prose paragraphs, the normal blank-line rule applies. An image or other structural block interrupts prose adjacency. Blank lines inside a quote do not terminate the quote if the next substantive paragraph has the same quote indentation.

Heading validation is sequential: `Heading 1 → Heading 2 → Heading 1` is valid. Heading 2 before any Heading 1 is invalid; Heading 3–6 are unsupported. Returning to Heading 1 is always allowed. A title followed only by body text is valid.

### Advanced content

Keep these instructions in an expandable advanced section so ordinary entrants do not need to learn them:

- **Equations:** authors type LaTeX directly. A paragraph whose trimmed text is `$$...$$` renders as a display equation, including when the opening and closing delimiters share one source line, as in the supplied example. Recognize this source form before Markdown rendering and normalize it to the renderer's display-math representation. Inline math uses `\(` and `\)` delimiters, with explicit parser handling. Single `$` characters remain ordinary currency/text. Preserve backslashes and formula characters across Google Docs styling runs; do not apply prose cleanup inside formulas. Invalid LaTeX, unmatched delimiters, or commands unsupported by KaTeX produce an actionable diagnostic with a source location and visible fallback. Do not enable KaTeX commands that load external resources or inject trusted HTML. Native Google Docs equations are unsupported: ask authors to replace them with explicit LaTeX. No ODT conversion or OCR is required.
- **Code:** propose literal backticks for inline code and fenced blocks for multiline code. Preserve whitespace within fences. The Markdown renderer can render code, but the historical Docs cleanup explicitly strips it; the new profile must not do so.
- **Superscript/subscript:** preserve native character formatting as semantic `sup`/`sub`; superscript digits are never guessed to be footnote references. Confirm styling and export behavior in fixtures before advertising support.

Do not interpret general Markdown typed in Docs as an alternative formatting language. The proposed code forms and agreed math delimiters above are explicit, isolated exceptions. Escape other literal Markdown characters so prose does not accidentally become a heading, list, link, or separator.

### Formatting that does not carry over

Explain once that this is a reading view, not a page-layout replica: margins, fonts, colors, highlighting, alignment outside captions, page breaks, headers, footers, and page numbers do not determine the app layout. Comments and suggestions are not submission text; authors should resolve suggestions before previewing. Warn when detectable structures contain content that cannot be represented, such as text boxes, complex drawings, merged table cells, or unsupported embedded objects. Never claim exhaustive detection when the export itself omits information.

## User flow

### `/preview` — guide and input

Lead with “Check how your review will look before you submit.” Include:

1. A concise formatting guide with paired source instructions and rendered examples, especially prose versus poetry quotes.
2. A link to the example Google Doc and its app preview; authors can make their own copy.
3. A labeled Google Docs URL input and **Preview** button. Enter submits; errors are associated with the field.
4. Sharing instructions: enable **Anyone with the link → Viewer**, with export permitted. No app login or Google authorization is required for v1. “Publish to web” is not required.
5. A brief statement that preview does not enter the contest, and a link to the actual submission instructions when available.

Put the input near the top so returning users need not scroll through the guide.

### `/preview?url=<encoded Google Docs URL>` — result

The URL parameter is sufficient to reopen the preview. Normalize ordinary Docs share/edit/view links into a validated document identity. Strip irrelevant tracking parameters; preserve any required access resource key. Initially accept ordinary `/document/d/<id>/...` links; explain how to get a standard sharing link when given a published-to-web or other unsupported link.

Header contains the source link, editable URL, **Refresh preview**, **Formatting guide**, last successful fetch time, and status. Refresh fetches current content after the author edits in Docs; no automatic polling.

States:

- Loading: visible progress text while fetching and converting.
- Success: “Preview ready — no formatting issues detected.” This is not a submission eligibility judgment.
- Recoverable problems: “Preview ready with 2 errors and 3 warnings.” Render everything that can be represented, with conspicuous placeholders for lost content.
- Fetch failure: actionable message and retry; do not present an empty article as success.

Show a compact status summary at the top and expandable diagnostics. Each diagnostic has severity, explanation, source excerpt/location, a concrete fix, and a jump to the affected preview block where possible. Do not place diagnostic markers inside normal article typography unless needed for a missing-content placeholder.

Below the header, reuse the actual article layout, title styles, `ReviewContent`, footnote sheet, and endnote list. No voting, rating, favorites, audio, or reading-progress writes for a preview. It should be naturally responsive like a real article; device emulation controls are optional later work.

When refreshing fails, any retained prior rendering must be explicitly labeled stale, including its successful fetch time. An older in-flight request must not overwrite a newer URL's result.

## Diagnostics

| Severity | Cases | Behavior |
| --- | --- | --- |
| Fetch failure | Malformed/unsupported URL, inaccessible or missing document, export disabled, timeout, Google throttling, document too large, non-document response | Explain the next step. Do not assert “private” when the response cannot distinguish private from deleted. |
| Formatting error | Ambiguous adjacent prose paragraphs, missing/multiple/misplaced Title, skipped heading level, unsupported heading depth, unresolved native footnote, failed image, unrenderable equation or malformed math delimiters, unsupported structure that loses content | Continue where safe; mark preview incomplete and identify the offending content. Do not silently repair hierarchy or discard text. |
| Warning | Image with neither alt text nor a caption, unsupported visual styling, nonstandard indentation, content flattened with a disclosed loss of formatting | Show the actual fallback and explain how to use the supported convention. Group repeated cosmetic warnings. |

Validation runs on the structured source before lossy normalization. Empty paragraphs do not count as content before the title; images and other substantive blocks do. A missing title gets an interface placeholder, not a title guessed from the first paragraph. Multiple titles remain visible as content and are flagged; they never split the document into multiple reviews.

Distinguish the native footnote-area separator from a user-inserted thematic line. Identify footnotes by source relationships, not by number-pattern heuristics. Validate every reference/definition relationship and retain note contents even when a relationship fails.

## Technical approach

Create a versioned **submission-v1** conversion profile shared by preview and future contest ingestion. Historical reviews retain their existing parser and per-review exceptions.

Suggested pipeline:

`validated document identity → bounded server fetch → source structure + locations → diagnostics → normalized article → existing rendering components`

Keep fetching, parsing, validation, asset processing, and rendering independently testable. Return title, normalized body, footnotes, image dimensions, diagnostics, and fetch timestamp. A normalized block representation should retain stable IDs and source excerpts for diagnostic navigation. Either emit carefully escaped Markdown or render an equivalent safe tree; both paths must share the production article semantics.

Relevant existing code:

- `scripts/lib/gdoc-html.ts`: HTML export fetch, style decoding, native footnotes, lists, captions, and legacy repair heuristics. Reuse well-defined primitives, not the complete cleanup pipeline.
- `lib/markdown.ts`: GFM/KaTeX rendering, footnotes, and image sizing. Its raw HTML support assumes curated content; add an appropriate sanitization boundary for untrusted previews.
- `scripts/lib/process-gdoc-images.ts`: cropping and asset processing, currently coupled to persistent R2 uploads and manifest writes. Extract pure transformations for ephemeral previews.
- `components/review-content.tsx`, `components/footnotes-section.tsx`, and `app/reviews/[slug]/page.tsx`: shared presentation and footnote interactions.

Fetch in a server endpoint; do not depend on cross-origin browser access to Google Docs. Do not reuse the batch importer's disk cache, multi-minute retries, R2 uploads, or review manifest writes. Provisional limits: 30-second total request budget, 20 MiB decoded HTML, 50 images, 10 MiB per image, and 40 megapixels per decoded image; tune against realistic entries and hosting limits. Enforce streaming byte limits and aggregate asset limits, not just Content-Length.

Only construct requests to approved Google export endpoints from validated IDs. Validate redirects and any image fetch destinations; deny private-network targets. Sanitize generated article and footnote HTML, links, and image types before browser rendering. Bound conversion work and rate-limit anonymous fetching.

Use ephemeral image processing with the same crop and sizing functions as import, passing dimensions directly instead of requiring the committed manifest. Do not persist applicant images in the public contest bucket. Preview content is not added to the database, review index, sitemap, or search. Use `noindex`, `Cache-Control: no-store`, and a no-referrer policy; omit full document URLs and content from application analytics and logs where controlled. A preview URL contains the source link and is not a secret-access mechanism.

## Example Google Doc and feasibility checks

Use the user-supplied [Example ACX Review](https://docs.google.com/document/d/1pJZg5qvL2GOy0ppOqKEE65Tv001PaVUhpo6hEC4R284/edit?tab=t.0) as the starting point. Its HTML and ODT exports were inspected on 2026-09-13. Before publishing the guide, complete coverage of every promised feature and maintain an exported fixture and expected rendering in the repository. The source document has not been edited by this work.

Extend the existing example to include a short introduction, two main sections, nested subsections, bold/italic/struck text, a hyperlink, a two-paragraph prose quote, two poetry stanzas with explicit line breaks, native footnotes, a horizontal line, a cropped image with alt text and caption, nested lists, a numbered list starting above 1, a simple table, and any agreed advanced features. Prefer original sample poetry and an owned or permissively licensed image.

The example doubles as a copyable template. Explain formatting in normal body text so those explanations cannot be mistaken for captions or quotations. Provide a separate deliberately invalid fixture for diagnostics, not deliberate errors in the public template.

Feasibility checks required before implementation commitments:

1. Verify anonymous HTML export retains Title identity, headings, paragraph indentation, manual breaks, native footnotes, separators, captions, image alt text/crops, literal LaTeX, and advanced content. Do not assume the API's richer model is available in HTML export.
2. Determine behavior for Docs tabs. V1 proposes a single-tab document. Google has a tab-aware document model; exports must not silently preview only part of an entry. If complete tab detection is unavailable anonymously, state the limitation explicitly and decide whether another export transport is needed before promising completeness.
3. Check export-disabled documents and common Google error/login responses, including HTTP 200 responses that are not a document.
4. Prove preview/import equality with the same fixture, including image processing and footnote interactions.

## Acceptance criteria and delivery

First settle the authoring conventions, then validate the example export, implement the shared profile/diagnostics and safe fetch path, and finally build the two screens and author guide.

- Unit fixtures cover every supported feature, heading order, missing/multiple titles, malformed footnotes, unsupported structures, literal Markdown, URL validation, and size/time failures.
- Browser tests cover guide-to-preview navigation, refresh after edits, failure recovery, stale request handling, diagnostic jumps, responsive tables/images, and footnote interactions.
- Security checks cover script/HTML injection in body and notes, unsafe links, image fetches, and redirect handling.
- A valid fixture yields no errors, and preview/import normalized output is identical. Historical import tests continue to pass.
- Manually inspect the public example at desktop and phone widths and compare it with a real article layout before launch.

Open discussion: whether code needs initial support. Simple tables and explicit LaTeX are now agreed. Title and two heading levels, blank-line paragraph separation, centered italic captions, and caption-as-alt fallback follow the supplied example and user instructions. The example currently demonstrates display math only; add an inline example if advertising inline support.

## References

- [Google Docs title and heading styles](https://support.google.com/docs/answer/116338): source UI conventions for named styles.
- [Google Docs footnotes](https://support.google.com/docs/answer/86629): native footnote authoring.
- [Google document resource model](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents): named styles, paragraphs, and tabs; this does not guarantee HTML-export fidelity.
- [Google Docs link-sharing privacy](https://support.google.com/docs/answer/10381817): distinction between restricted documents and anyone-with-link access.


## Evidence from the example and archive (2026-09-13)

- The archive contains 847 Markdown review files. A scan found 38 Markdown tables across 24 files (about 2.8%). This is a lower bound for historical use: image-based tables and tables lost during older conversions are not counted, and review files are not necessarily unique contest submissions.
- Substantive examples: `data/reviews/2026-book-reviews/from-here-to-equality.md` has eight comparison/data tables; `data/reviews/2024-book-reviews/the-signal-and-the-noise-by-nate-silver.md` has four probability/calibration tables; `data/reviews/2025-non-book-reviews/schools-a-review.md` compares levels of understanding. Recommendation: support simple tables, while rejecting merged/nested/layout tables.
- The supplied example retains an explicit `title` class, semantic h1/h2 headings, 36pt quote indentation, empty paragraphs, native footnote links, a horizontal rule, an image crop, alt text, and a centered italic caption in HTML export.
- The first poetry stanza contains manual `br` breaks. The second stanza contains four adjacent nonempty paragraphs without blanks: three boundaries should trigger the proposed paragraph error. This should be corrected in the public example or copied into a deliberately invalid test fixture.
- The example says images are always full width (subject to portrait sizing). Current `lib/image-size.ts` also limits enlargement to 2× natural size and keeps short images/equations at natural size. Guide wording should reflect the actual shared sizing policy.
- The example includes underline, caps heading depth at Heading 2, and requires both centering and italics for captions; those are now reflected above. It has an empty Videos heading and later lists embedded videos as unsupported; remove the empty heading from the public template.
- In the earlier version of the example, the sample native equation was a 115×34 PNG in HTML. In ODT, `Object 2/content.xml` contains MathML with a fraction, a root, and placeholder symbols. This demonstrates structural extraction, not complete equation fidelity. Include completed formulas in subsequent fixtures.
- The [Docs API Equation schema](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents#Equation) exposes suggestion IDs but no formula payload. [Google’s supported exports](https://developers.google.com/workspace/drive/api/guides/ref-export-formats) include ODT; the ODT finding above comes from inspecting this actual document, not from an assumed API capability.


### Updated example inspection

The updated HTML export now includes a native three-column table with a header and four data rows, and a literal `$$...$$` quadratic formula in one paragraph. The formula retains its LaTeX backslashes and characters. This verifies source extraction, not yet conversion through the new submission parser. The example explicitly excludes the native Docs equation editor and no longer lists tables as unsupported.

The second poetry stanza still uses separate paragraphs without blank lines, so the three ambiguous boundaries remain an example correction. The empty Videos heading and overly absolute image-width wording also remain. No edits have been made to the Google Doc by the agent.


## Basic implementation scope

The initial implementation uses one `/preview` route, with an optional `url` query parameter. It shares the article presentation and provides a reusable submission parser; switching the eventual contest importer to this profile is later work. Embedded raster images are processed ephemerally; remote assets unsupported by this first version receive visible diagnostics. The new poetry rule supersedes the earlier example-correction notes: its second stanza is now valid when all lines are at most 60 characters.


## Basic rate limiting

Before each Google export request, validate the URL and reserve a quota slot: five requests per client IP per UTC minute and 60 requests service-wide per UTC minute. These are fixed windows; the next minute resets the quota. Failed Google requests still count, while invalid URLs, landing-page visits, and quota refusals do not. Keep the existing two-conversion per-process concurrency ceiling.

Production uses the existing shared `rate_limits` database table, with atomic conditional counter updates in a write transaction. Roll back both reservations on quota refusal. If the limiter cannot be reached, do not fetch Google. Show a retry message in the preview error header; local database contention uses a short retry delay. Development without a configured database uses a bounded process-local counter map. No new database migration is required.

Use the app's existing client-IP proxy convention (`x-forwarded-for`, then `x-real-ip`, otherwise a shared unknown bucket); the deployment proxy must overwrite these headers. The service-wide ceiling also applies when clients rotate IP addresses. Store hashed, normalized IP keys and remove expired preview counters without modifying auth counters. These fixed-window limits protect Google exports across app instances; they are not a general-purpose edge traffic filter.

### Shared review presentation

Published reviews and previews use the same `ReviewArticle` component, `ReviewContent`, footnote UI, and global typography styles. The source adapters supply title, body HTML, and footnotes; published-only metadata and controls are optional slots. Preview tables use semantic header/body sections and compact single-paragraph cells, and captioned images use the same figure/paragraph structure as published reviews.
