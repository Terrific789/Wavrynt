import { buildAndroid } from '../build/android.js';

export async function build(args) {
  const [platform, directory = '.', ...extra] = args;
  if (platform !== 'android' || extra.length) throw new Error('Usage: wavrynt build android [directory]');
  return buildAndroid(directory);
}
