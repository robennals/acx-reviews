#!/usr/bin/env tsx
/**
 * CLI for the cross-source dedup pass. Detection + delete logic lives in
 * scripts/lib/dedupe-cross-source.ts (also called from fetch-from-gdocs.ts).
 *
 * Usage:
 *   tsx scripts/dedupe-cross-source.ts            # dry run
 *   tsx scripts/dedupe-cross-source.ts --apply    # actually delete files
 */

import { runDedupeCrossSource } from './lib/dedupe-cross-source';

const apply = process.argv.includes('--apply');
runDedupeCrossSource({ apply });
if (apply) {
  console.log(`\nℹ️  Run \`pnpm generate-index\` to refresh the index.`);
}
