import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { extname } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp' };
const assets = Object.fromEntries(readdirSync('client/dist', { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile()).map(entry => {
    const file = entry.parentPath + '/' + entry.name;
    return [file.slice('client/dist'.length), [types[extname(file)] ?? 'application/octet-stream',
      readFileSync(file).toString('base64')]];
  }));
mkdirSync('dist/server', { recursive: true });
mkdirSync('dist/.openai', { recursive: true });
const worker = readFileSync('worker/index.js', 'utf8').replace("import { assets } from './assets.js';",
  'const assets = ' + JSON.stringify(assets) + ';');
writeFileSync('dist/server/index.js', worker);
copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json');
