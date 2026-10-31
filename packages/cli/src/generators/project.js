import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateFrontend } from './frontend.js';
import { generateBackend } from './backend.js';
import { generateConfig } from './config.js';

export async function generateProject(root, name) {
  await mkdir(root); // deliberately fails if target exists; no overwriting
  await generateFrontend(root);
  await generateBackend(root);
  await generateConfig(root, name);
  await writeFile(join(root, '.gitignore'), 'node_modules/\n.env\n.env.*\n!.env.example\n.wavrynt/\ndist/\n');
  await writeFile(join(root, 'README.md'), `# ${name}\n\nGenerated using Wavrynt.\n\n- frontend/: web assets\n- backend/: optional server source\n- wavrynt.config.mjs: project configuration\n`);
}
