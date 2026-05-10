/**
 * Wrapper around gray-matter's stringify that disables YAML line-folding.
 *
 * Default gray-matter (via js-yaml) folds scalars longer than 80 chars
 * onto multiple lines using the `>-` indicator. That's valid YAML but
 * produces noisy diffs and uglier file headers for long titles/slugs.
 * Setting lineWidth to -1 disables folding entirely.
 */

import matter from 'gray-matter';
import yaml from 'js-yaml';

export function stringifyMarkdown(content: string, data: Record<string, unknown>): string {
  return matter.stringify(content, data, {
    language: 'yaml',
    engines: {
      yaml: {
        parse: yaml.load.bind(yaml) as never,
        stringify: (obj: unknown) => yaml.dump(obj, { lineWidth: -1 }),
      },
    },
  } as Parameters<typeof matter.stringify>[2]);
}
