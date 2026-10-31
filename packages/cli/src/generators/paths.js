import { resolve, basename, dirname, sep } from 'node:path';

export function projectPath(name, cwd = process.cwd()) {
  if (!name || name === '.' || name === '..' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new Error('Project name must start with a letter and contain only letters, digits, hyphens or underscores.');
  }
  const root = resolve(cwd, name);
  if (dirname(root) !== resolve(cwd) || basename(root) !== name) throw new Error('Project must be a direct child of the current directory.');
  return root;
}
export function inside(root, candidate) {
  const fullRoot = resolve(root);
  const fullCandidate = resolve(candidate);
  return fullCandidate === fullRoot || fullCandidate.startsWith(fullRoot + sep);
}
