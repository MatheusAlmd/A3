// O cliente HTTP real do app contra o mock da API, validando cada resposta com docs/openapi.json.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEED_PASSWORD, startMockServer, type RunningMock } from '../mock-server/server';

const spec = JSON.parse(readFileSync('docs/openapi.json', 'utf8'));
let mock: RunningMock;
let client: typeof import('../src/api/client');
let errors: typeof import('../src/api/errors');
const covered = new Set<string>();
const violations: string[] = [];
const originalFetch = globalThis.fetch;

// ---- validador mínimo de JSON Schema (o suficiente para o contrato) ----
function resolve(schema: any): any {
  return schema?.$ref ? resolve(spec.components.schemas[schema.$ref.split('/').pop()]) : schema;
}
function validate(schema: any, value: any, at: string, out: string[]) {
  schema = resolve(schema);
  if (!schema) return;
  if (schema.oneOf || schema.anyOf) {
    const options = schema.oneOf || schema.anyOf;
    const ok = options.some((o: any) => {
      const e: string[] = [];
      validate(o, value, at, e);
      return !e.length;
    });
    if (!ok) out.push(`${at}: nenhuma alternativa de oneOf aceita ${JSON.stringify(value)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    out.push(`${at}: ${JSON.stringify(value)} fora do enum`);
    return;
  }
  const types: string[] = schema.type ? [].concat(schema.type) : [];
  if (types.length) {
    const kind =
      value === null
        ? 'null'
        : Array.isArray(value)
          ? 'array'
          : Number.isInteger(value)
            ? 'integer'
            : typeof value;
    const ok = types.some((t) => t === kind || (t === 'number' && kind === 'integer'));
    if (!ok) {
      out.push(`${at}: esperado ${types.join('|')}, veio ${kind}`);
      return;
    }
  }
  if (typeof value === 'string' && schema.format === 'uuid' && !/^[0-9a-f-]{36}$/i.test(value))
    out.push(`${at}: uuid inválido`);
  if (typeof value === 'string' && schema.format === 'date-time' && Number.isNaN(Date.parse(value)))
    out.push(`${at}: date-time inválido`);
  if (Array.isArray(value) && schema.items)
    value.forEach((v, i) => validate(schema.items, v, `${at}[${i}]`, out));
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || [])
      if (!(key in value)) out.push(`${at}.${key}: obrigatório ausente`);
    for (const [key, sub] of Object.entries(schema.properties || {}))
      if (key in value) validate(sub, value[key], `${at}.${key}`, out);
  }
}
function operationFor(method: string, pathname: string) {
  for (const [template, ops] of Object.entries<any>(spec.paths)) {
    const re = new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`);
    if (re.test(pathname) && ops[method.toLowerCase()]) {
      // Prefere o caminho literal (ex.: /routes/current) ao parametrizado (/routes/{id}).
      const literal = Object.keys(spec.paths).find(
        (t) => t === pathname && spec.paths[t][method.toLowerCase()],
      );
      const key = literal || template;
      return { key: `${method} ${key}`, op: spec.paths[key][method.toLowerCase()] };
    }
  }
  return null;
}

before(async () => {
  mock = await startMockServer(0, '127.0.0.1', { simulate: false });
  process.env.EXPO_PUBLIC_DEMO_MODE = 'false';
  process.env.EXPO_PUBLIC_API_URL = mock.url;
  client = await import('../src/api/client');
  errors = await import('../src/api/errors');
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    const url = new URL(String(input));
    const method = init?.method || 'GET';
    const found = operationFor(method, url.pathname);
    if (!found) {
      violations.push(`${method} ${url.pathname}: operação fora do contrato`);
      return response;
    }
    covered.add(found.key);
    const text = await response.clone().text();
    const documented = found.op.responses[String(response.status)];
    if (response.status < 400 && !documented)
      violations.push(`${found.key}: status ${response.status} não documentado`);
    const schema = documented?.content && Object.values<any>(documented.content)[0].schema;
    if (schema && text) {
      const out: string[] = [];
      validate(schema, JSON.parse(text), found.key, out);
      violations.push(...out);
    }
    if (response.status >= 400) {
      const body = JSON.parse(text);
      if (body.status !== response.status || typeof body.title !== 'string')
        violations.push(`${found.key}: erro ${response.status} sem ProblemDetails`);
    }
    return response;
  }) as typeof fetch;
});
after(async () => {
  globalThis.fetch = originalFetch;
  await mock.close();
});

async function as(email: string, password = SEED_PASSWORD) {
  const session = await client.api.login(email, password);
  client.configureSession(session);
  return session;
}
async function rejects(promise: Promise<unknown>, status: number) {
  await assert.rejects(promise, (e: any) => {
    assert.ok(e instanceof errors.ApiError, String(e));
    assert.equal(e.status, status, e.message);
    return true;
  });
}

test('autenticação: JWT, senha errada, sem token, perfil sem permissão', async () => {
  client.configureSession(null);
  await rejects(client.api.login('camila@exemplo.com', 'errada'), 401);
  await rejects(client.api.me(), 401);
  const session = await as('camila@exemplo.com');
  assert.equal(session.tokenType, 'Bearer');
  assert.equal(session.accessToken.split('.').length, 3);
  assert.ok(Date.parse(session.expiresAt) > Date.now());
  assert.equal((await client.api.me()).role, 'Manager');
  await as('mariana@exemplo.com');
  await rejects(client.api.users(), 403);
  await rejects(client.api.trucks(), 403);
  await rejects(client.api.collections(), 403);
});

test('cidadão: cadastro, login, prévia, solicitação atribuída, cancelamento', async () => {
  client.configureSession(null);
  const user = await client.api.register({
    name: 'Ana Prof',
    email: 'ana@teste.com',
    password: 'segredo1',
  });
  assert.equal(user.role, 'Citizen');
  await rejects(
    client.api.register({ name: 'Ana', email: 'ANA@teste.com', password: 'segredo1' }),
    409,
  );
  await assert.rejects(
    client.api.register({ name: '', email: 'x', password: '1' }),
    (e: any) => e.status === 400 && !!e.fields.email && !!e.fields.password && !!e.fields.name,
  );
  await as('ana@teste.com', 'segredo1');
  const near = { latitude: -23.556, longitude: -46.66 };
  const preview = await client.api.preview(near.latitude, near.longitude);
  assert.equal(preview.hasCandidate, true);
  const created = await client.api.createCollection({
    ...near,
    address: 'Rua Teste, 1',
    description: null,
  });
  assert.equal(created.status, 'Assigned');
  assert.ok(created.routeStopId);
  assert.equal((await client.api.mine()).length, 1);
  assert.equal((await client.api.collection(created.id)).id, created.id);
  const far = await client.api.createCollection({
    latitude: -19.92,
    longitude: -43.94,
    address: null,
    description: 'Belo Horizonte, fora do alcance',
  });
  assert.equal(far.status, 'Pending');
  assert.equal((await client.api.retryCollection(far.id)).status, 'Pending');
  const cancelled = await client.api.cancelCollection(created.id);
  assert.equal(cancelled.status, 'Cancelled');
  await rejects(client.api.cancelCollection(created.id), 409);
  await rejects(client.api.retryCollection(created.id), 409);
  assert.ok((await client.api.locations()).length >= 1);
  await as('mariana@exemplo.com');
  await rejects(client.api.collection(created.id), 403);
});

test('motorista: rota atual, GPS, conclusão das paradas e rota encerrada', async () => {
  await as('rafael@exemplo.com');
  const route = await client.api.currentRoute();
  assert.ok(route);
  assert.equal(route.status, 'InProgress');
  await client.api.updateLocation(route.truckId, {
    latitude: -23.554,
    longitude: -46.656,
    speedKmh: 20,
    heading: 180,
    recordedAt: new Date().toISOString(),
  });
  const position = await client.api.location(route.truckId);
  assert.equal(position.isOnline, true);
  await rejects(
    client.api.updateLocation('77777777-7777-4777-8777-777777777777', {
      latitude: 0,
      longitude: 0,
      speedKmh: null,
      heading: null,
      recordedAt: null,
    }),
    403,
  );
  let current = await client.api.route(route.id);
  for (const stop of current.stops.filter((s) => s.status === 'Pending'))
    current = await client.api.completeStop(route.id, stop.id);
  assert.equal(current.status, 'Completed');
  assert.equal(Number(current.pendingStops), 0);
  await rejects(client.api.completeStop(route.id, current.stops[0].id), 409);
  assert.equal(await client.api.currentRoute(), null); // 204
  await as('mariana@exemplo.com');
  const mine = await client.api.mine();
  assert.ok(mine.some((c) => c.address === 'Rua Bela Cintra, 720' && c.status === 'Collected'));
});

test('gestor: equipe, frota, rotas, filtros e validações', async () => {
  await as('camila@exemplo.com');
  const driver = await client.api.createUser({
    name: 'Novo Motorista',
    email: 'novo@exemplo.com',
    password: 'motor123',
    role: 'Driver',
  });
  assert.equal(driver.role, 'Driver');
  assert.ok((await client.api.users('Driver')).some((u) => u.id === driver.id));
  assert.equal((await client.api.user(driver.id)).email, 'novo@exemplo.com');
  await assert.rejects(
    client.api.createTruck({ plate: '12', description: null, capacityKg: null, driverId: null }),
    (e: any) => e.status === 400 && !!e.fields.plate,
  );
  const truck = await client.api.createTruck({
    plate: 'abc1d23',
    description: 'Teste',
    capacityKg: 5000,
    driverId: null,
  });
  assert.equal(truck.plate, 'ABC1D23');
  await rejects(
    client.api.createTruck({
      plate: 'ABC-1D23',
      description: null,
      capacityKg: null,
      driverId: null,
    }),
    409,
  );
  assert.equal((await client.api.assignDriver(truck.id, driver.id)).driverId, driver.id);
  assert.equal((await client.api.truck(truck.id)).id, truck.id);
  assert.ok((await client.api.trucks()).length >= 3);
  await rejects(client.api.location(truck.id, true), 404);
  assert.ok(Array.isArray(await client.api.locations(true)));
  await rejects(
    client.api.createRoute({
      name: 'X',
      truckId: '99999999-9999-4999-8999-999999999999',
      scheduledFor: null,
      start: null,
      stops: [{ latitude: 0, longitude: 0, address: null }],
    }),
    404,
  );
  const route = await client.api.createRoute({
    name: 'Teste otimizada',
    truckId: truck.id,
    scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
    start: { latitude: -23.55, longitude: -46.63 },
    stops: [
      { latitude: -23.6, longitude: -46.7, address: 'Longe' },
      { latitude: -23.551, longitude: -46.631, address: 'Perto' },
    ],
    optimize: true,
  });
  assert.equal(route.status, 'Planned');
  assert.equal(route.stops[0].address, 'Perto');
  assert.ok(Number(route.estimatedDistanceKm) > 0);
  assert.ok((await client.api.routes('Planned', truck.id)).some((r) => r.id === route.id));
  await rejects(client.api.routes('Invalido' as any), 400);
  const started = await client.api.startRoute(route.id);
  assert.equal(started.status, 'InProgress');
  await rejects(client.api.startRoute(route.id), 409);
  assert.equal((await client.api.cancelRoute(route.id)).status, 'Cancelled');
  await rejects(client.api.cancelRoute(route.id), 409);
  assert.ok((await client.api.collections('Pending')).every((c) => c.status === 'Pending'));
  assert.equal((await client.api.setActive(driver.id, false)).active, false);
  client.configureSession(null);
  await rejects(client.api.login('novo@exemplo.com', 'motor123'), 401);
  await as('camila@exemplo.com');
  assert.equal((await client.api.setActive(driver.id, true)).active, true);
});

test('cobre todas as operações do contrato e todas as respostas seguem o schema', () => {
  const all = Object.entries<any>(spec.paths).flatMap(([p, ops]) =>
    Object.keys(ops).map((m) => `${m.toUpperCase()} ${p}`),
  );
  const missing = all.filter((key) => !covered.has(key));
  assert.deepEqual(missing, [], `operações não exercitadas: ${missing.join(', ')}`);
  assert.deepEqual(violations, []);
});
