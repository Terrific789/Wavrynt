import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access, symlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { inspectApplication } from '../packages/cli/src/build/application.js';
import { generateAndroid } from '../packages/cli/src/generators/android.js';
import { buildAndroid, checkPrerequisites, runProcess, wrapperCommand } from '../packages/cli/src/build/android.js';
import { main } from '../packages/cli/src/main.js';

async function sandbox(fn) {
  const root = await mkdtemp(join(tmpdir(), 'wavrynt-android-'));
  const config = { app: { name: 'Test "App" & $value', id: 'com.example.test', version: '1.2.3' },
    frontend: { framework: 'vanilla', root: './frontend', entry: 'index.html' } };
  const save = () => writeFile(join(root, 'wavrynt.config.mjs'), `export default ${JSON.stringify(config)}`);
  try {
    await mkdir(join(root, 'frontend'));
    await writeFile(join(root, 'frontend/index.html'), '<h1>Original</h1>');
    await save();
    await fn(root, config, save);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('generates complete host and stages nested assets without altering sources', () => sandbox(async root => {
  await mkdir(join(root, 'frontend/css'));
  await writeFile(join(root, 'frontend/css/main.css'), 'body { color: red }');
  const generated = await generateAndroid(await inspectApplication(join(root, 'frontend')));
  const gradle = await readFile(join(generated.project, 'app/build.gradle.kts'), 'utf8');
  assert.match(gradle, /applicationId = "com.example.test"/);
  assert.match(gradle, /versionName = "1.2.3"/);
  assert.ok(!gradle.includes('__APP_'));
  assert.ok(gradle.includes('\\$value'));
  assert.equal(await readFile(join(generated.project, 'app/src/main/assets/css/main.css'), 'utf8'), 'body { color: red }');
  assert.equal(await readFile(join(root, 'frontend/index.html'), 'utf8'), '<h1>Original</h1>');
  for (const file of ['settings.gradle.kts', 'app/src/main/AndroidManifest.xml',
    'app/src/main/java/dev/wavrynt/runtime/MainActivity.kt', 'app/src/main/java/dev/wavrynt/runtime/NativeBridge.kt',
    'app/src/main/assets/__wavrynt/sdk.js', 'app/src/main/res/values/strings.xml']) await access(join(generated.project, file));
  for (const file of ['gradlew', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.properties']) {
    assert.deepEqual(await readFile(join(generated.project, file)),
      await readFile(new URL(`../platforms/android/template/${file}`, import.meta.url)));
  }
  const properties = await readFile(join(generated.project, 'gradle/wrapper/gradle-wrapper.properties'), 'utf8');
  assert.match(properties, /gradle-8\.11\.1-bin\.zip/);
  assert.match(properties, /distributionSha256Sum=f397b287023acdba1e9f6fc5ea72d22dd63669d59ed4a289a29b1a76eee151c6/);
  if (process.platform !== 'win32') assert.ok((await stat(join(generated.project, 'gradlew'))).mode & 0o111);
}));

test('root websites omit generated output, backend, tooling and hidden files; rebuilds contain no stale assets', () => sandbox(async (root, config, save) => {
  config.frontend.root = '.'; await save();
  await writeFile(join(root, 'index.html'), 'root site');
  for (const folder of ['backend', 'node_modules', '.git', '.wavrynt']) {
    await mkdir(join(root, folder)); await writeFile(join(root, folder, 'secret.txt'), 'private');
  }
  await writeFile(join(root, '.env'), 'SECRET=private');
  await writeFile(join(root, 'old.js'), 'old');
  const first = await generateAndroid(await inspectApplication(root));
  await rm(join(root, 'old.js'));
  const second = await generateAndroid(await inspectApplication(root));
  assert.notEqual(first.project, second.project);
  for (const file of ['backend', 'node_modules', '.git', '.wavrynt', '.env', 'wavrynt.config.mjs', 'old.js']) {
    await assert.rejects(access(join(second.project, 'app/src/main/assets', file)), { code: 'ENOENT' });
  }
  assert.equal(await readFile(join(root, '.env'), 'utf8'), 'SECRET=private');
  await access(join(first.project, 'app/src/main/assets/old.js'));
}));

for (const [description, change, expected] of [
  ['escaping root', c => { c.frontend.root = '..'; }, /escapes/],
  ['escaping entry', c => { c.frontend.entry = '../index.html'; }, /escapes/],
  ['missing entry', c => { c.frontend.entry = 'missing.html'; }, /existing staged HTML/],
  ['directory entry', c => { c.frontend.entry = '.'; }, /existing staged HTML/],
  ['invalid ID', c => { c.app.id = 'bad-id'; }, /app.id/],
  ['disabled platform', c => { c.platforms = { android: { enabled: false } }; }, /disabled/],
  ['unsupported framework', c => { c.frontend.framework = 'react'; }, /vanilla/]
]) test(`rejects ${description}`, () => sandbox(async (root, config, save) => {
  change(config); await save(); await assert.rejects(inspectApplication(root), expected);
}));

test('rejects invalid application paths and missing config', () => sandbox(async root => {
  await assert.rejects(inspectApplication(join(root, 'absent')), /Application directory/);
  await assert.rejects(inspectApplication(join(root, 'frontend/index.html')), /Application directory/);
  await rm(join(root, 'wavrynt.config.mjs'));
  await assert.rejects(inspectApplication(root), /No wavrynt.config/);
}));

test('reserved SDK asset paths cannot be overwritten', () => sandbox(async root => {
  await mkdir(join(root, 'frontend/__wavrynt'));
  await assert.rejects(inspectApplication(root), /reserved/);
}));

test('rejects linked frontend and generated output directories', () => sandbox(async root => {
  await mkdir(join(root, 'target'));
  await symlink(join(root, 'target'), join(root, 'frontend/link'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(inspectApplication(root), /symbolic links/);
  await rm(join(root, 'frontend/link'));
  await symlink(join(root, 'target'), join(root, '.wavrynt'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(generateAndroid(await inspectApplication(root)), /real directory/);
}));

test('reports all missing build prerequisites', async () => {
  await assert.rejects(checkPrerequisites({ env: {} }), error => {
    assert.match(error.message, /JDK/); assert.match(error.message, /Gradle/); assert.match(error.message, /ANDROID_HOME/); return true;
  });
});

test('checks JDK, SDK and wrapper without global Gradle or PATH', () => sandbox(async root => {
  const env = { JAVA_HOME: join(root, 'jdk'), ANDROID_HOME: join(root, 'sdk') };
  const { project } = await generateAndroid(await inspectApplication(root));
  const paths = [join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'),
    join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac'),
    join(env.ANDROID_HOME, 'platforms/android-35/android.jar'),
    join(env.ANDROID_HOME, 'build-tools/35.0.0', process.platform === 'win32' ? 'aapt2.exe' : 'aapt2'),
    join(env.ANDROID_HOME, 'build-tools/35.0.0/lib/apksigner.jar')];
  for (const path of paths) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, 'fixture'); }
  const run = async (command, args) => {
    assert.equal(command, paths[0]); assert.deepEqual(args, ['-version']);
    return 'openjdk version "23.0.2"';
  };
  assert.equal((await checkPrerequisites({ project, env, run })).gradle, wrapperCommand(project));
  await assert.rejects(checkPrerequisites({ project, env, run: async () => 'version "8"' }), /JDK 17/);
  await rm(paths[2]);
  await assert.rejects(checkPrerequisites({ project, env, run }), /Platform 35/);
  await rm(join(project, 'gradle/wrapper/gradle-wrapper.jar'));
  await assert.rejects(checkPrerequisites({ project, env, run }), /Wrapper files are missing/);
}));

test('build orchestration invokes assembleDebug and verifies its artifact (simulated compiler)', () => sandbox(async root => {
  const result = await buildAndroid(root, {
    prerequisites: async ({ project }) => ({ gradle: wrapperCommand(project), env: {} }),
    run: async (command, args, { cwd }) => {
      assert.equal(command, wrapperCommand(cwd)); assert.ok(args.includes(':app:assembleDebug'));
      const apk = join(cwd, 'app/build/outputs/apk/debug/app-debug.apk');
      await mkdir(dirname(apk), { recursive: true }); await writeFile(apk, 'test artifact, not a real APK');
    }
  });
  await access(result.apk);
}));

test('selects the project wrapper on Windows, Linux and macOS', () => {
  assert.equal(wrapperCommand('project', 'win32'), join('project', 'gradlew.bat'));
  for (const platform of ['linux', 'darwin']) assert.equal(wrapperCommand('project', platform), join('project', 'gradlew'));
});

test('wrapper execution failures propagate without global Gradle fallback', () => sandbox(async root => {
  let calls = 0;
  await assert.rejects(buildAndroid(root, {
    prerequisites: async ({ project }) => ({ gradle: wrapperCommand(project), env: {} }),
    run: async (command, args, { cwd }) => {
      calls++;
      assert.equal(command, wrapperCommand(cwd));
      throw new Error('Wrapper distribution download failed: connection refused');
    }
  }), /Wrapper distribution download failed: connection refused/);
  assert.equal(calls, 1);
}));

test('failed or missing compiler output never reports success', () => sandbox(async root => {
  const prerequisites = async () => ({ gradle: 'fake', env: {} });
  await assert.rejects(buildAndroid(root, { prerequisites, run: async () => { throw new Error('Compilation failed'); } }), /Compilation failed/);
  await assert.rejects(buildAndroid(root, { prerequisites, run: async () => {} }), /No APK build success/);
  await assert.rejects(buildAndroid(root, { prerequisites: async () => { throw new Error('Missing tools'); } }), /Missing tools/);
}));

test('CLI rejects unsupported build targets and extra arguments', async () => {
  await assert.rejects(main(['build', 'ios']), /Usage/);
  await assert.rejects(main(['build', 'android', '.', 'extra']), /Usage/);
});

test('process runner captures output and propagates nonzero exit', async () => {
  assert.match(await runProcess(process.execPath, ['-e', 'console.log("ok")'], { capture: true }), /ok/);
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.exit(7)'], { capture: true }), /failed \(7\)/);
});

test('Windows batch launcher handles spaces and build arguments', { skip: process.platform !== 'win32' }, () => sandbox(async root => {
  const launcher = join(root, 'tool folder/gradle.cmd');
  await mkdir(dirname(launcher));
  await writeFile(launcher, '@echo off\r\necho %*\r\nexit /b 0\r\n');
  const output = await runProcess(launcher, ['--no-daemon', '--console=plain', ':app:assembleDebug'], { capture: true });
  assert.match(output, /--console=plain :app:assembleDebug/);
}));
