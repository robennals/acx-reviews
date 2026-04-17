export interface ExtractedFootnote {
  id: string;
  raw: string;
}

export interface ExtractedFootnotes {
  body: string;
  footnotes: ExtractedFootnote[];
}

export function extractFootnotes(markdown: string): ExtractedFootnotes {
  return { body: markdown, footnotes: [] };
}
