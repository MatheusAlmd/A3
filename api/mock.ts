// Mock da API Coleta como Vercel Function. O vercel.json reescreve /account, /management,
// /routing e /openapi para cá, com o caminho original em ?__path=.
// Os dados ficam na memória da instância: voltam ao estado inicial quando ela é reciclada.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createMockApp } from '../mock-server/server';

const app = createMockApp({ simulate: true, secret: process.env.MOCK_JWT_SECRET || undefined });
const TICK_MS = 20_000;
let lastTick = Date.now();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://mock.local');
  const original = url.searchParams.get('__path');
  if (original) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = original + (query ? `?${query}` : '');
  }
  // Sem processo contínuo: a simulação avança conforme o tempo passado entre requisições.
  const steps = Math.min(30, Math.floor((Date.now() - lastTick) / TICK_MS));
  if (steps > 0) {
    lastTick += steps * TICK_MS;
    for (let i = 0; i < steps; i++) app.tick();
  }
  await app.handle(req, res);
}
