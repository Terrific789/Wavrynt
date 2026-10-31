import { access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { loadConfig } from '@wavrynt/config';
import { inside } from '../generators/paths.js';

export async function doctor(directory) {
  const root = resolve(directory);
  const { config, errors } = await loadConfig(root);
  if (errors.length) throw new Error(errors.join('\n'));
  const frontend = resolve(root, config.frontend.root);
  const entry = resolve(frontend, config.frontend.entry);
  if (!inside(root, frontend) || !inside(frontend, entry)) throw new Error('Frontend path escapes the project directory.');
  await access(entry);
  console.log(`✓ Config valid\n✓ Frontend: ${config.frontend.framework}\n✓ Entry: ${entry}\n✓ Backend: ${config.backend?.type ?? 'none'}\nAndroid: run wavrynt build android to validate the toolchain and compile.`);
}
