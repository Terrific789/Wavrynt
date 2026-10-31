import { lstat, realpath, readdir } from 'node:fs/promises';
import { dirname, resolve, join, relative, isAbsolute, sep, extname } from 'node:path';
import { CONFIG_FILE, loadConfig } from '@wavrynt/config';
import { inside } from '../generators/paths.js';

const excluded = name => name.startsWith('.') || ['node_modules', 'backend', CONFIG_FILE].includes(name);

export async function inspectApplication(directory = '.') {
  let root = resolve(directory);
  try { if (!(await lstat(root)).isDirectory()) throw new Error(); }
  catch { throw new Error(`Application directory does not exist or is not a directory: ${root}`); }
  for (;;) {
    try { await lstat(join(root, CONFIG_FILE)); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(root);
    if (parent === root) throw new Error(`No ${CONFIG_FILE} found in ${resolve(directory)} or its parents. Run wavrynt init first.`);
    root = parent;
  }
  root = await realpath(root);
  const { config, errors } = await loadConfig(root);
  if (errors.length) throw new Error(errors.join('\n'));
  if (config.platforms?.android?.enabled === false) throw new Error('Android is disabled in platforms.android.enabled.');
  const frontend = resolve(root, config.frontend.root);
  const entry = resolve(frontend, config.frontend.entry);
  if (!inside(root, frontend) || !inside(frontend, entry) || isAbsolute(config.frontend.entry)) {
    throw new Error('Frontend path escapes the project directory or entry is absolute.');
  }
  // Reject links in every path component, including an ancestor of the frontend.
  let current = root;
  for (const part of relative(root, frontend).split(sep).filter(Boolean)) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Frontend symbolic links are not supported: ${current}`);
    if (part.startsWith('.')) throw new Error('Frontend root cannot be inside a hidden/generated directory.');
  }
  if (!(await lstat(frontend)).isDirectory()) throw new Error(`Frontend root is not a directory: ${frontend}`);
  const files = [];
  async function walk(folder) {
    for (const name of await readdir(folder)) {
      if (excluded(name)) continue;
      if (name === '__wavrynt') throw new Error('__wavrynt is reserved for the runtime SDK.');
      const path = join(folder, name);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error(`Frontend symbolic links are not supported: ${path}`);
      if (stat.isDirectory()) await walk(path);
      else if (stat.isFile()) files.push(relative(frontend, path));
      else throw new Error(`Unsupported frontend file: ${path}`);
    }
  }
  await walk(frontend);
  if (!files.includes(relative(frontend, entry)) || !/\.html?$/i.test(extname(entry))) {
    throw new Error(`Frontend entry must be an existing staged HTML file: ${entry}`);
  }
  return { root, config, frontend, files, entryPath: relative(frontend, entry).split(sep).map(encodeURIComponent).join('/') };
}
