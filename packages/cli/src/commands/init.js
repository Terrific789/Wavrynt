import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { CONFIG_FILE } from '@wavrynt/config';
import { configText } from '../generators/config.js';

// Initialize without relocating an existing site's files.
export async function init(directory) {
  const root = resolve(directory);
  const path = join(root, CONFIG_FILE);
  if (existsSync(path)) throw new Error(`${CONFIG_FILE} already exists; no overwrite.`);
  const frontend = existsSync(join(root, 'frontend', 'index.html')) ? './frontend' : existsSync(join(root, 'index.html')) ? '.' : null;
  if (!frontend) throw new Error('Expected frontend/index.html or index.html.');
  await writeFile(path, configText(basename(root), frontend), {flag: 'wx'});
  console.log(`Created ${path}. Existing frontend files were not moved.`);
}
