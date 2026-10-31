import { cp } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const template = resolve(here, '../../../../templates/vanilla');
export async function generateFrontend(root) {
  await cp(template, join(root, 'frontend'), { recursive: true, errorOnExist: true, force: false });
}
