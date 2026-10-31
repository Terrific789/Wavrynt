import { spawn } from 'node:child_process';
import { stat, realpath } from 'node:fs/promises';
import { join, delimiter, resolve } from 'node:path';
import { inspectApplication } from './application.js';
import { generateAndroid } from '../generators/android.js';

async function file(path) { try { return (await stat(path)).isFile(); } catch { return false; } }
async function executable(name, env) {
  for (const directory of (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)) {
    const path = join(directory.replace(/^"|"$/g, ''), name);
    if (await file(path)) return realpath(path);
  }
  return null;
}

export function runProcess(command, args, { cwd, env = process.env, capture = false } = {}) {
  // Windows batch launchers need cmd.exe. Only fixed build arguments are accepted;
  // never interpolate config values or application paths into a shell command.
  if (process.platform === 'win32' && /\.(bat|cmd)$/i.test(command)) {
    if (/["%!\r\n&|<>^]/.test(command) || args.some(arg => !/^[\w:.=-]+$/.test(arg))) {
      throw new Error('Unsupported shell characters in Gradle Wrapper path or arguments. Use an application path without shell metacharacters.');
    }
    args = ['/d', '/s', '/c', `""${command}" ${args.join(' ')}"`];
    command = env.ComSpec ?? 'cmd.exe';
  }
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true,
      windowsVerbatimArguments: process.platform === 'win32' && args[0] === '/d',
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let output = '';
    if (capture) {
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
    }
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolvePromise(output);
      else reject(new Error(`${command} failed (${signal ?? code}). ${output.trim()}`));
    });
  });
}

export function wrapperCommand(project, platform = process.platform) {
  return join(project, platform === 'win32' ? 'gradlew.bat' : 'gradlew');
}

export async function checkPrerequisites({ project, env = process.env, run = runProcess } = {}) {
  const errors = [];
  const javaName = process.platform === 'win32' ? 'java.exe' : 'java';
  const java = env.JAVA_HOME ? join(env.JAVA_HOME, 'bin', javaName) : await executable(javaName, env);
  if (!java || !await file(java)) errors.push('Install JDK 17–23 (17 recommended) and set JAVA_HOME to its installation directory.');
  else {
    try {
      const output = await run(java, ['-version'], { env, capture: true });
      const major = Number(output.match(/version "(\d+)/)?.[1]);
      if (!(major >= 17 && major <= 23)) errors.push('JDK 17–23 is required for Gradle 8.11.1. Set JAVA_HOME accordingly.');
      const javac = join(java, '..', process.platform === 'win32' ? 'javac.exe' : 'javac');
      if (!await file(javac)) errors.push('JAVA_HOME must point to a JDK, not a JRE (javac is missing).');
    } catch (error) { errors.push(`Java could not start: ${error.message}`); }
  }
  const gradle = project ? wrapperCommand(project) : null;
  if (!gradle || !await file(gradle) ||
      !await file(join(project, 'gradle/wrapper/gradle-wrapper.jar')) ||
      !await file(join(project, 'gradle/wrapper/gradle-wrapper.properties'))) {
    errors.push('Gradle Wrapper files are missing from the generated project. Restore the shared Android template and rebuild.');
  }
  const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
  if (!sdk) errors.push('Set ANDROID_HOME to your Android SDK directory.');
  else {
    if (!await file(join(sdk, 'platforms/android-35/android.jar'))) errors.push('Install Android SDK Platform 35: sdkmanager "platforms;android-35"');
    const buildTools = join(sdk, 'build-tools/35.0.0');
    if (!await file(join(buildTools, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2')) ||
        !await file(join(buildTools, 'lib/apksigner.jar'))) errors.push('Install Android Build Tools 35.0.0: sdkmanager "build-tools;35.0.0"');
  }
  if (errors.length) throw new Error(`Android build prerequisites missing:\n- ${errors.join('\n- ')}\nAccept Android SDK licenses with sdkmanager --licenses.`);
  return { gradle, env: { ...env, ANDROID_HOME: resolve(sdk), ANDROID_SDK_ROOT: resolve(sdk) } };
}

export async function buildAndroid(directory = '.', { prerequisites = checkPrerequisites, run = runProcess } = {}) {
  const application = await inspectApplication(directory);
  const generated = await generateAndroid(application);
  console.log(`Android project: ${generated.project}`);
  try {
    const toolchain = await prerequisites({ project: generated.project });
    await run(toolchain.gradle, ['--no-daemon', '--console=plain', ':app:assembleDebug'], {
      cwd: generated.project, env: toolchain.env
    });
    const apk = await stat(generated.apk);
    if (!apk.isFile() || apk.size === 0) throw new Error('Gradle did not produce a non-empty debug APK.');
  } catch (error) {
    throw new Error(`${error.message}\nGenerated project retained at: ${generated.project}\nNo APK build success was verified.`);
  }
  console.log(`Debug APK: ${generated.apk}`);
  return generated;
}
