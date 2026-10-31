import { mkdir, lstat, mkdtemp, cp, readFile, writeFile, copyFile, chmod } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
// Kotlin string templates require escaping '$' in addition to JSON string escaping.
const kotlin = value => JSON.stringify(value).replaceAll('$', '\\$');

export async function generateAndroid(application) {
  const { root, config, frontend, files, entryPath } = application;
  let parent = root;
  for (const part of ['.wavrynt', 'android']) {
    parent = join(parent, part);
    await mkdir(parent).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const stat = await lstat(parent);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Generated output must be a real directory: ${parent}`);
  }
  // Each build owns a fresh directory: no stale assets, no deletion of user files.
  const project = await mkdtemp(join(parent, 'build-'));
  await cp(join(repository, 'platforms/android/template'), project, { recursive: true });
  // A checkout or template copied from Windows may not retain executable mode.
  if (process.platform !== 'win32') await chmod(join(project, 'gradlew'), 0o755);
  const gradle = join(project, 'app/build.gradle.kts');
  const values = {
    __APP_ID__: kotlin(config.app.id),
    __APP_VERSION__: kotlin(config.app.version ?? '0.1.0'),
    __ENTRY_LITERAL__: kotlin(JSON.stringify(entryPath)),
    __LABEL_LITERAL__: kotlin(JSON.stringify(config.app.name))
  };
  await writeFile(gradle, (await readFile(gradle, 'utf8')).replace(/__[A-Z_]+__/g, token => values[token] ?? token));
  const resources = join(project, 'app/src/main/res/values');
  await mkdir(resources, { recursive: true });
  const label = JSON.stringify(config.app.name).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", "\\'");
  await writeFile(join(resources, 'strings.xml'), `<resources><string name="app_name">${label}</string></resources>\n`);
  const assets = join(project, 'app/src/main/assets');
  for (const file of files) {
    const destination = join(assets, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(frontend, file), destination);
  }
  await mkdir(join(assets, '__wavrynt'), { recursive: true });
  await copyFile(join(repository, 'packages/sdk/src/wavrynt.js'), join(assets, '__wavrynt/sdk.js'));
  return { project, apk: join(project, 'app/build/outputs/apk/debug/app-debug.apk') };
}
