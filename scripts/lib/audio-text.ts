import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { Nodes } from 'mdast';

export interface ChunkParagraph {
  /** Index into the speech-paragraph array (stable across chunking). */
  index: number;
  text: string;
}

export interface SpeechChunk {
  /** Text sent to the TTS API: paragraphs joined by blank lines. */
  text: string;
  paragraphs: ChunkParagraph[];
}

/** Collapse internal whitespace (soft line breaks etc.) to single spaces. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Flatten inline content to speakable text: links keep their text, images
 *  and footnote references disappear, emphasis/strong markers are dropped. */
function inlineText(node: Nodes): string {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      return node.value;
    case 'break':
      return ' ';
    case 'image':
    case 'imageReference':
    case 'footnoteReference':
    case 'html':
      return '';
    default:
      return 'children' in node ? node.children.map(inlineText).join('') : '';
  }
}

/**
 * Replace LaTeX equations with hand-written spoken English before TTS.
 * The map (data/equation-speech.json) holds exact source strings — e.g.
 * "$\\sigma^2$" → "sigma squared" — applied longest-first as plain string
 * replacement so a short equation never shadows a longer one containing it.
 */
export function applyEquationSpeech(
  markdown: string,
  map: Record<string, string>
): string {
  const entries = Object.entries(map).sort(([a], [b]) => b.length - a.length);
  let out = markdown;
  for (const [equation, spoken] of entries) {
    out = out.split(equation).join(spoken);
  }
  return out;
}

/**
 * Convert a review's markdown body into the ordered list of paragraphs to
 * read aloud. Headings and blockquote paragraphs become their own entries;
 * footnote definitions, images, code blocks, and raw HTML are skipped.
 */
export function speechParagraphsFromMarkdown(markdown: string): string[] {
  const tree = remark().use(remarkGfm).parse(markdown);
  const paragraphs: string[] = [];

  const visitBlock = (node: Nodes): void => {
    switch (node.type) {
      case 'footnoteDefinition':
      case 'html':
      case 'code':
      case 'thematicBreak':
        return;
      case 'heading':
      case 'paragraph': {
        const text = collapse(inlineText(node));
        if (text) paragraphs.push(text);
        return;
      }
      default:
        if ('children' in node) node.children.forEach(visitBlock);
    }
  };

  tree.children.forEach(visitBlock);
  return paragraphs;
}

/**
 * Pack consecutive paragraphs into chunks of at most `maxChars` (counting
 * the blank-line separators), never splitting a paragraph. A paragraph
 * longer than `maxChars` gets a chunk to itself.
 */
export function groupIntoChunks(paragraphs: string[], maxChars: number): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  let current: ChunkParagraph[] = [];
  let length = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({ text: current.map((p) => p.text).join('\n\n'), paragraphs: current });
    current = [];
    length = 0;
  };

  paragraphs.forEach((text, index) => {
    if (current.length > 0 && length + 2 + text.length > maxChars) flush();
    length += (current.length > 0 ? 2 : 0) + text.length;
    current.push({ index, text });
  });
  flush();

  return chunks;
}
