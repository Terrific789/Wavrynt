import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Installation of the CLI binary itself is handled separately by npm.
// This command prepares a per-user location for future SDKs/toolchains.
export async function install(args = []) {
  if (args.length) throw new Error('Usage: wavrynt install');
  const home = process.env.WAVRYNT_HOME || join(homedir(), '.wavrynt');
  await mkdir(join(home, 'toolchains'), { recursive: true });
  await mkdir(join(home, 'cache'), { recursive: true });
  await writeFile(join(home, 'installation.json'), JSON.stringify({schemaVersion: 1, toolchains: []}, null, 2) + '\n', {flag: 'wx'}).catch(err => { if(err.code !== 'EEXIST') throw err; });
  console.log(`Shared Wavrynt home ready: ${home}`);
  console.log('Toolchain downloads will be added in a later milestone.');
  return home;
}
