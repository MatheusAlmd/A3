const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, 'app');
const inside = relative => {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error('Caminho fora da exportação.');
  return target;
};
const exportedAssets = inside('assets/node_modules');
const publicAssets = inside('assets/vendor');
if (fs.existsSync(exportedAssets)) {
  if (fs.existsSync(publicAssets)) {
    fs.cpSync(exportedAssets, publicAssets, { recursive: true });
    fs.rmSync(exportedAssets, { recursive: true });
  } else {
    fs.renameSync(exportedAssets, publicAssets);
  }
}

const htmlPath = inside('index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*src="(\/app\/[^"?]+\.js)"/g)].map(match => match[1]);
if (scripts.length !== 1) throw new Error('A preparação espera uma exportação web com um bundle principal.');
for (const url of scripts) {
  const sourcePath = inside(url.slice('/app/'.length));
  const original = fs.readFileSync(sourcePath, 'utf8');
  const prepared = original.replaceAll('/assets/node_modules/', '/assets/vendor/');
  if (prepared === original) continue;
  const digest = crypto.createHash('sha256').update(prepared).digest('hex').slice(0, 32);
  const name = path.basename(sourcePath).replace(/-[a-f0-9]{32}\.js$/, '-' + digest + '.js');
  const targetPath = inside(path.join(path.relative(root, path.dirname(sourcePath)), name));
  fs.writeFileSync(targetPath, prepared);
  html = html.replaceAll(url, '/app/' + path.relative(root, targetPath).split(path.sep).join('/'));
  if (sourcePath !== targetPath) fs.unlinkSync(sourcePath);
}
fs.writeFileSync(htmlPath, html);
console.log('Exportação preparada: recursos públicos em app/assets/vendor/.');
