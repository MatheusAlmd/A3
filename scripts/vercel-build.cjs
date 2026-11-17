// Build da Vercel: site do celular (site-demo) + app web em /app conectado ao mock da API
// servido pela função api/mock.ts no mesmo domínio.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'vercel-dist');
const appDir = path.join(out, 'app');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'coleta-icon.png', 'licenses.txt'])
  fs.copyFileSync(path.join(root, 'site-demo', file), path.join(out, file));

const env = {
  ...process.env,
  EXPO_BASE_URL: '/app',
  EXPO_PUBLIC_DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE || 'false',
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'same-origin',
};
execFileSync(
  process.execPath,
  [
    require.resolve('expo/bin/cli', { paths: [root] }),
    'export',
    '--platform',
    'web',
    '--output-dir',
    appDir,
    '--max-workers',
    '1',
  ],
  { cwd: root, env, stdio: 'inherit' },
);
execFileSync(process.execPath, [path.join(root, 'site-demo', 'prepare-export.cjs')], {
  cwd: root,
  env: { ...process.env, EXPORT_DIR: appDir },
  stdio: 'inherit',
});
console.log('Build da Vercel pronto em vercel-dist/');
