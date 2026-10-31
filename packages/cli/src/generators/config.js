import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG_FILE } from '@wavrynt/config';

export function appId(name) {
  const token = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'application';
  return `com.example.${/^[a-z]/.test(token) ? token : 'app' + token}`;
}
export function configText(name, root = './frontend') {
  return `export default ${JSON.stringify({
    app: {name, id: appId(name), version: '0.1.0'},
    frontend: {framework: 'vanilla', root, entry: 'index.html'},
    backend: {type: 'none'},
    platforms: {android: {enabled: true}}
  }, null, 2)};\n`;
}
export async function generateConfig(root, name) {
  await writeFile(join(root, CONFIG_FILE), configText(name), {flag: 'wx'});
}
