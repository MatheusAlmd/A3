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
  // Prefere o IP da rede local (Wi-Fi/cabo) a interfaces de VPN.
  const all = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'));
  const rank = (a) =>
    a.startsWith('192.168.')
      ? 0
      : a.startsWith('10.')
        ? 1
        : /^172\.(1[6-9]|2\d|3[01])\./.test(a)
          ? 2
          : 3;
  return all.map((i) => i.address).sort((a, b) => rank(a) - rank(b))[0] || null;
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
