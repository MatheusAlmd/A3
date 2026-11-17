// Sobe o mock da API e o app Expo já apontando para ele, com um único comando.
//   npm run dev:api        → navegador (http://localhost:8081)
//   npm run dev:api -- --lan → também para celular com Expo Go na mesma rede Wi-Fi
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const lan = process.argv.includes('--lan');
const port = Number(process.env.MOCK_PORT || 5073);

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const item of list || [])
      if (item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.'))
        return item.address;
  return null;
}
const host = lan ? lanAddress() : 'localhost';
if (lan && !host) console.warn('Não encontrei o IP da rede. Usando localhost.');
const apiUrl = `http://${host || 'localhost'}:${port}`;

const children = [];
function run(args, extraEnv, label) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: label ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (label)
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (chunk) =>
        String(chunk)
          .split(/\r?\n/)
          .filter(Boolean)
          .forEach((line) => console.log(`[${label}] ${line}`)),
      );
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label || 'expo'}] encerrou com código ${code}.`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}
function shutdown(code = 0) {
  for (const child of children) if (!child.killed) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run(['--import', 'tsx', 'mock-server/index.ts'], { MOCK_PORT: String(port) }, 'api');
run(
  [require.resolve('expo/bin/cli', { paths: [root] }), 'start', ...(lan ? [] : ['--web'])],
  { EXPO_PUBLIC_DEMO_MODE: 'false', EXPO_PUBLIC_API_URL: apiUrl },
  null,
);
console.log(`[dev] App em modo real, conectado a ${apiUrl}`);
