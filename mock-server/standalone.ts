// Ponto de entrada do Coleta.exe: serve o app web exportado e o mock da API na mesma porta
// e abre o navegador. Também roda sem empacotar: npm run build:web-local && npm run standalone.
import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SEED_ACCOUNTS, SEED_PASSWORD, startMockServer, type RunningMock } from './server';

const FIRST_PORT = Number(process.env.COLETA_PORT || 5073);

function webReader() {
  const decode = (file: string) => {
    try {
      return decodeURIComponent(file);
    } catch {
      return null;
    }
  };
  let sea: typeof import('node:sea') | null = null;
  try {
    sea = require('node:sea') as typeof import('node:sea');
    if (!sea.isSea()) sea = null;
  } catch {
    sea = null;
  }
  if (sea) {
    const embedded = sea;
    return {
      read(file: string) {
        const key = decode(file);
        if (!key) return null;
        try {
          return Buffer.from(embedded.getAsset(`web${key}`));
        } catch {
          return null;
        }
      },
    };
  }
  const root = path.resolve(
    process.env.COLETA_WEB_DIR || path.join(__dirname, '..', 'build', 'web'),
  );
  return {
    read(file: string) {
      const key = decode(file);
      if (!key) return null;
      const full = path.normalize(path.join(root, key));
      if (!full.startsWith(root + path.sep)) return null;
      try {
        return readFileSync(full);
      } catch {
        return null;
      }
    },
  };
}

function openBrowser(url: string) {
  const command =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, () => {});
}

function lanAddress() {
  // Prefere o IP da rede local (Wi-Fi/cabo) a interfaces de VPN.
  const all = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'));
  const rank = (a: string) =>
    a.startsWith('192.168.')
      ? 0
      : a.startsWith('10.')
        ? 1
        : /^172\.(1[6-9]|2\d|3[01])\./.test(a)
          ? 2
          : 3;
  return all.map((i) => i!.address).sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

async function alreadyRunning(port: number) {
  try {
    const response = await fetch(`http://localhost:${port}/openapi/v1.json`, {
      signal: AbortSignal.timeout(1500),
    });
    const spec = (await response.json()) as { info?: { title?: string } };
    return !!spec.info?.title?.includes('ProjetoA3');
  } catch {
    return false;
  }
}

async function main() {
  process.title = 'Coleta A3';
  const web = webReader();
  if (!web.read('/index.html')) {
    console.error('O app web não foi encontrado. Gere com: npm run build:exe');
    process.exit(1);
  }
  let running: RunningMock | null = null;
  for (let port = FIRST_PORT; port < FIRST_PORT + 10 && !running; port++) {
    try {
      running = await startMockServer(port, '0.0.0.0', { web, log: false });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      if (await alreadyRunning(port)) {
        const url = `http://localhost:${port}`;
        console.log(`O Coleta já está aberto em ${url}. Abrindo o navegador...`);
        openBrowser(url);
        setTimeout(() => process.exit(0), 4000);
        return;
      }
    }
  }
  if (!running) throw new Error('Nenhuma porta livre entre 5073 e 5082.');
  const port = new URL(running.url).port;
  const url = `http://localhost:${port}`;
  const ip = lanAddress();
  const labels = { Manager: 'Gestor', Driver: 'Motorista', Citizen: 'Cidadão' };
  console.log('');
  console.log('  COLETA · A3 — aplicativo + API de demonstração');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Abra no navegador:  ${url}`);
  if (ip) console.log(`  No celular (mesmo Wi-Fi):  http://${ip}:${port}`);
  console.log('');
  console.log(`  Contas de teste (senha: ${SEED_PASSWORD})`);
  for (const a of SEED_ACCOUNTS) console.log(`    ${labels[a.role].padEnd(10)} ${a.email}`);
  console.log('');
  console.log('  Mantenha esta janela aberta durante o uso. Fechar a janela encerra o app');
  console.log('  e os dados voltam ao estado inicial na próxima abertura.');
  console.log('');
  openBrowser(url);
  const stop = () => void running!.close().then(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error) => {
  console.error('Não foi possível iniciar o Coleta:', error);
  setTimeout(() => process.exit(1), 15000);
});
