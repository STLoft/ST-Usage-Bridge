import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This script lives in the plugin's own folder: SillyTavern/plugins/<folder>.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const config = path.join(ROOT, 'config.yaml');
const target = path.join(ROOT, 'src', 'endpoints', 'backends', 'chat-completions.js');
const plugin = path.join(HERE, 'index.js');
// Installed for all users (third-party) or for one user (data/<user>/extensions).
const extDirs = [path.join(ROOT, 'public', 'scripts', 'extensions', 'third-party')];
const dataDir = path.join(ROOT, 'data');
if (fs.existsSync(dataDir)) {
    for (const user of fs.readdirSync(dataDir)) extDirs.push(path.join(dataDir, user, 'extensions'));
}
// The extension folder can have any name, so look for its manifest.
function isMessageMeta(folder) {
    try {
        return JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8')).display_name === 'Message Meta';
    } catch {
        return false;
    }
}

const hasExt = extDirs.some(dir =>
    fs.existsSync(dir) && fs.readdirSync(dir).some(name => isMessageMeta(path.join(dir, name))));

console.log('=== Usage Bridge 설치 점검 ===');
console.log('config.yaml:', fs.existsSync(config) ? 'OK' : '없음');
console.log('server plugin:', fs.existsSync(plugin) ? 'OK' : '없음');
console.log('UI extension:', hasExt ? 'OK' : '없음');

if (fs.existsSync(config)) {
    const text = fs.readFileSync(config, 'utf8');
    const match = text.match(/^\s*enableServerPlugins\s*:\s*(true|false)\s*$/m);
    console.log('enableServerPlugins:', match ? match[1] : '항목 없음');
}

if (fs.existsSync(target)) {
    const text = fs.readFileSync(target, 'utf8');
    console.log(
        'core hook:',
        text.includes('/* Usage Bridge hook start */') ? 'OK' : '미설치',
    );
}
