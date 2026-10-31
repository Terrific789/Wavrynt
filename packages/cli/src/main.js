import { mkdir, readFile, writeFile, access, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, CONFIG_FILE } from '@wavrynt/config';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const templateDir = resolve(sourceDir, '../../..', 'templates/vanilla');

function help() {
  console.log(`Wavrynt Framework (foundation v0.0.1)
Commands:
  wavrynt create <folder>   Create a vanilla HTML/CSS/JS app
  wavrynt init [folder]     Add config to an existing vanilla app
  wavrynt doctor [folder]   Validate the app configuration and files
  wavrynt help              Show this help

Android build is not implemented yet.`);
}

function slug(text) {
  const result = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return result || 'app';
}
function appId(name) {
  return `com.example.${slug(name).replace(/-/g, '')}`;
}
function configText(name, root = '.') {
  return `export default ${JSON.stringify({
    app: {name, id: appId(name), version: '0.1.0'},
    frontend: {framework: 'vanilla', root, entry: 'index.html'},
    backend: {type: 'none'},
    platforms: {android: {enabled: true}},
  }, null, 2)};
`;
}

async function init(directory) {
  const dir = resolve(directory);
  const configPath = join(dir, CONFIG_FILE);
  if (existsSync(configPath)) throw new Error(`${CONFIG_FILE} already exists; no files overwritten.`);
  if (!existsSync(join(dir, 'index.html')) && !existsSync(join(dir, 'www', 'index.html'))) {
    throw new Error('Expected index.html or www/index.html. Use "create" to generate a new project.');
  }
  const root = existsSync(join(dir, 'index.html')) ? '.' : './www';
  await writeFile(configPath, configText(dir.split(/[\/]/).at(-1), root), { flag: 'wx' });
  console.log(`Created ${configPath}
Next: wavrynt doctor ${dir}`);
}

async function create(directory) {
  if (!directory) throw new Error('Usage: wavrynt create <folder>');
  const dir = resolve(directory);
  if (existsSync(dir)) throw new Error(`Target directory already exists: ${dir}`);
  await mkdir(dir, {recursive:true});
  await cp(templateDir, join(dir, 'www'), {recursive:true});
  await writeFile(join(dir, CONFIG_FILE), configText(dir.split(/[\/]/).at(-1), './www'), {flag:'wx'});
  console.log(`Created Wavrynt vanilla project: ${dir}
Next: wavrynt doctor ${dir}`);
}

async function doctor(directory) {
  const dir = resolve(directory);
  const {config, errors} = await loadConfig(dir);
  if (errors.length) {
    for (const error of errors) console.error(`✗ ${error}`);
    throw new Error(`Invalid ${CONFIG_FILE}`);
  }
  const root = resolve(dir, config.frontend.root);
  const entry = resolve(root, config.frontend.entry);
  if (!(entry === root || entry.startsWith(root + (process.platform === 'win32' ? '\\' : '/')))) throw new Error('frontend.entry must stay within frontend.root.');
  await access(entry);
  console.log(`✓ Config valid
✓ Frontend: ${config.frontend.framework}
✓ Entry found: ${entry}
✓ Backend: ${config.backend?.type ?? 'none'}
✓ Node.js: ${process.version}
! Android build system: not implemented in this milestone`);
}

export async function main(args) {
  const [command, target] = args;
  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h': return help();
    case 'create': return create(target);
    case 'init': return init(target ?? '.');
    case 'doctor': return doctor(target ?? '.');
    default: throw new Error(`Unknown command: ${command}. Run "wavrynt help".`);
  }
}
