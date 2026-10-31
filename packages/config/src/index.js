import { access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONFIG_FILE = 'wavrynt.config.mjs';
export { CONFIG_FILE };

export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return ['Configuration must export an object.'];
  }
  if (!config.app || typeof config.app !== 'object') errors.push('app is required.');
  else {
    if (typeof config.app.name !== 'string' || !config.app.name.trim()) errors.push('app.name must be a non-empty string.');
    if (typeof config.app.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(config.app.id)) errors.push('app.id must be a valid reverse-domain ID, e.g. com.example.app.');
  }
  if (config.frontend?.framework !== 'vanilla') errors.push('frontend.framework must be "vanilla" for v0.0.1.');
  if (typeof config.frontend?.root !== 'string' || !config.frontend.root.trim()) errors.push('frontend.root must be a non-empty string.');
  if (typeof config.frontend?.entry !== 'string' || !config.frontend.entry.trim()) errors.push('frontend.entry must be a non-empty string.');
  if (config.backend?.type !== undefined && config.backend.type !== 'none' && config.backend.type !== 'http') errors.push('backend.type must be "none" or "http".');
  if (config.backend?.type === 'http' && (typeof config.backend.baseUrl !== 'string' || !/^https?:\/\//.test(config.backend.baseUrl))) errors.push('backend.baseUrl must start with http:// or https://.');
  if (config.app?.version !== undefined && (typeof config.app.version !== 'string' || !config.app.version.trim())) errors.push('app.version must be a non-empty string.');
  for (const field of ['name', 'version']) {
    if (typeof config.app?.[field] === 'string' && /[\u0000-\u001f\u007f]/.test(config.app[field])) errors.push(`app.${field} cannot contain control characters.`);
  }
  if (config.platforms !== undefined && (!config.platforms || typeof config.platforms !== 'object' || Array.isArray(config.platforms))) errors.push('platforms must be an object.');
  const android = config.platforms?.android;
  if (android !== undefined && (!android || typeof android !== 'object' || Array.isArray(android))) errors.push('platforms.android must be an object.');
  else if (android?.enabled !== undefined && typeof android.enabled !== 'boolean') errors.push('platforms.android.enabled must be a boolean.');
  return errors;
}

export async function loadConfig(projectDir) {
  const filepath = join(resolve(projectDir), CONFIG_FILE);
  await access(filepath);
  // Config is executable developer-owned code, analogous to vite.config.js.
  const { default: config } = await import(pathToFileURL(filepath).href + `?t=${Date.now()}`);
  return { config, errors: validateConfig(config), filepath };
}
