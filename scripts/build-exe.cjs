// Gera release/Coleta.exe: um único executável com o app web e o mock da API.
// Usa o Single Executable Applications do Node (https://nodejs.org/api/single-executable-applications.html).
//   npm run build:exe            → exporta o app web, empacota e gera o .exe
//   npm run build:exe -- --skip-web → reaproveita build/web já exportado
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const build = path.join(root, 'build');
const webDir = path.join(build, 'web');
const exeDir = path.join(build, 'exe');
const release = path.join(root, 'release');
const exeName = process.platform === 'win32' ? 'Coleta.exe' : 'Coleta';
const node = process.execPath;
const step = (text) => console.log(`\n▸ ${text}`);

if (!process.argv.includes('--skip-web')) {
  step('Exportando o app web conectado à própria origem (modo real, sem demonstração)');
  fs.rmSync(webDir, { recursive: true, force: true });
  execFileSync(
    node,
    [
      require.resolve('expo/bin/cli', { paths: [root] }),
      'export',
      '--platform',
      'web',
      '--output-dir',
      webDir,
      '--clear',
      '--max-workers',
      '1',
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, EXPO_PUBLIC_DEMO_MODE: 'false', EXPO_PUBLIC_API_URL: 'same-origin' },
    },
  );
}
if (!fs.existsSync(path.join(webDir, 'index.html'))) {
  console.error('build/web/index.html não existe. Rode sem --skip-web.');
  process.exit(1);
}

step('Empacotando o servidor em um arquivo');
fs.rmSync(exeDir, { recursive: true, force: true });
fs.mkdirSync(exeDir, { recursive: true });
const bundle = path.join(exeDir, 'coleta.cjs');
require('esbuild').buildSync({
  entryPoints: [path.join(root, 'mock-server', 'standalone.ts')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outfile: bundle,
  logLevel: 'warning',
});

step('Gerando o blob do executável com o app web embutido');
const assets = {};
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else assets[`web/${path.relative(webDir, full).split(path.sep).join('/')}`] = full;
  }
})(webDir);
const blob = path.join(exeDir, 'sea-prep.blob');
const config = path.join(exeDir, 'sea-config.json');
fs.writeFileSync(
  config,
  JSON.stringify(
    {
      main: bundle,
      output: blob,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
      assets,
    },
    null,
    2,
  ),
);
execFileSync(node, ['--experimental-sea-config', config], { cwd: root, stdio: 'inherit' });

step(`Criando release/${exeName}`);
fs.mkdirSync(release, { recursive: true });
const exe = path.join(release, exeName);
fs.rmSync(exe, { force: true });
fs.copyFileSync(node, exe);
execFileSync(
  node,
  [
    require.resolve('postject/dist/cli.js', { paths: [root] }),
    exe,
    'NODE_SEA_BLOB',
    blob,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    ...(process.platform === 'darwin' ? ['--macho-segment-name', 'NODE_SEA'] : []),
  ],
  { cwd: root, stdio: 'inherit' },
);
fs.copyFileSync(
  path.join(root, 'docs', 'LEIA-ME-executavel.txt'),
  path.join(release, 'LEIA-ME.txt'),
);
const size = (fs.statSync(exe).size / 1024 / 1024).toFixed(0);
console.log(
  `\n✔ ${path.relative(root, exe)} pronto (${size} MB, ${Object.keys(assets).length} arquivos do app embutidos).`,
);
