import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { projectPath } from '../generators/paths.js';
import { generateProject } from '../generators/project.js';

export async function create(args) {
  const [name, ...extra] = args;
  if (!name || extra.length) throw new Error('Usage: wavrynt create <name>');
  const root = projectPath(name);
  if (existsSync(root)) throw new Error(`Target already exists: ${root}`);
  try {
    await generateProject(root, name);
  } catch (error) {
    // Remove only the folder created by this command; leave pre-existing targets alone.
    if (existsSync(root)) await rm(root, {recursive: true, force: true});
    throw error;
  }
  console.log(`Created ${root}\nNext: wavrynt doctor ${name}`);
  return root;
}
