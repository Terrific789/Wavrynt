import { create } from './commands/create.js';
import { install } from './commands/install.js';
import { init } from './commands/init.js';
import { doctor } from './commands/doctor.js';
import { build } from './commands/build.js';

function help() {
  console.log(`Wavrynt CLI
Commands:
  wavrynt install              Prepare shared Wavrynt home
  wavrynt create <name>        Generate a new project in current directory
  wavrynt init [directory]     Register existing vanilla web project
  wavrynt doctor [directory]   Validate config and frontend entry
  wavrynt build android [dir]  Generate Android project and compile debug APK
  wavrynt help                 Show help

Android builds require JDK 17–23 and Android SDK 35. The Wrapper downloads Gradle 8.11.1.`);
}
export async function main(args) {
  const [command, ...rest] = args;
  switch (command) {
    case undefined: case 'help': case '--help': case '-h': return help();
    case 'install': return install(rest);
    case 'create': return create(rest);
    case 'init': return init(rest[0] ?? '.');
    case 'doctor': return doctor(rest[0] ?? '.');
    case 'build': return build(rest);
    default: throw new Error(`Unknown command: ${command}. Run "wavrynt help".`);
  }
}
