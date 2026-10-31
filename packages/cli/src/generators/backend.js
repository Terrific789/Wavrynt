import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// No backend language is forced on the developer at project creation.
export async function generateBackend(root) {
  const directory = join(root, 'backend');
  await mkdir(directory);
  await writeFile(join(directory, 'README.md'), `# Backend\n\nOptional. Add a backend here or connect to an existing remote API.\n\nThe first integrated backend will be generic HTTP, demonstrated with FastAPI.\n`);
}
