import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.env.EXPO_PUBLIC_DEMO_MODE = 'false';
process.env.EXPO_PUBLIC_API_URL = 'http://api.example.test';
const clientPromise = import('../src/api/client');
const demoPromise = import('../src/api/demo');
const spec = JSON.parse(readFileSync('docs/openapi.json', 'utf8'));
const originalFetch = globalThis.fetch;
test('real client covers every documented operation and sends Bearer, bodies and queries correctly', async () => {
  const { api, configureSession } = await clientPromise;
  const { demoLogin } = await demoPromise;
  const calls: { method: string; path: string; init: RequestInit }[] = [];
  const token = demoLogin('Manager');
  token.accessToken = 'local-test-token';
  configureSession(token);
  globalThis.fetch = (async (input, init) => {
    const u = new URL(String(input));
    calls.push({ method: init?.method || 'GET', path: u.pathname, init: init || {} });
    return new Response(JSON.stringify([]), { status: 200 });
  }) as typeof fetch;
  try {
    const id = '44444444-4444-4444-8444-444444444444';
    await api.login('test@example.com', 'test');
    await api.register({ name: 'Test', email: 'test@example.com', password: 'test' });
    await api.me();
    await api.users('Driver');
    await api.user(id);
    await api.createUser({
      name: 'Test',
      email: 'test@example.com',
      password: 'test',
      role: 'Driver',
    });
    await api.setActive(id, false);
    await api.trucks();
    await api.truck(id);
    await api.createTruck({
      plate: 'ABC-1D23',
      description: null,
      capacityKg: null,
      driverId: null,
    });
    await api.assignDriver(id, null);
    await api.locations();
    await api.locations(true);
    await api.location(id);
    await api.location(id, true);
    await api.updateLocation(id, {
      latitude: 0,
      longitude: 0,
      speedKmh: null,
      heading: null,
      recordedAt: null,
    });
    await api.routes('Planned', id);
    await api.route(id);
    await api.currentRoute();
    await api.createRoute({
      name: 'Test',
      truckId: id,
      scheduledFor: null,
      start: null,
      stops: [{ latitude: 0, longitude: 0, address: null }],
      optimize: true,
    });
    await api.startRoute(id);
    await api.cancelRoute(id);
    await api.completeStop(id, id);
    await api.collections('Pending', id);
    await api.mine();
    await api.collection(id);
    await api.createCollection({ latitude: 0, longitude: 0, address: null, description: null });
    await api.cancelCollection(id);
    await api.retryCollection(id);
    await api.preview(-23.55, -46.65);
    const documented = Object.entries(spec.paths).flatMap(([path, methods]: [string, any]) =>
      Object.keys(methods)
        .filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m))
        .map((method) => ({ path, method: method.toUpperCase() })),
    );
    for (const op of documented) {
      const pattern = new RegExp('^' + op.path.replace(/\{[^}]+\}/g, '[^/]+') + '$');
      assert.ok(
        calls.some((c) => c.method === op.method && pattern.test(c.path)),
        `${op.method} ${op.path} is covered`,
      );
    }
    assert.equal(calls.length, documented.length);
    const authCall = calls.find((c) => c.path === '/account/me')!;
    assert.equal(
      (authCall.init.headers as Record<string, string>).Authorization,
      'Bearer local-test-token',
    );
    assert.ok(!(calls[0].init.headers as Record<string, string>).Authorization);
    const assign = calls.find((c) => c.path.endsWith('/driver'))!;
    assert.deepEqual(JSON.parse(String(assign.init.body)), { driverId: null });
    const collection = calls.find(
      (c) => c.method === 'POST' && c.path === '/routing/collection-requests',
    )!;
    assert.deepEqual(JSON.parse(String(collection.init.body)), {
      latitude: 0,
      longitude: 0,
      address: null,
      description: null,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test('204 is an empty route; validation, 401 and malformed responses surface correctly', async () => {
  const { api, configureSession, request } = await clientPromise;
  const { demoLogin } = await demoPromise;
  try {
    globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
    assert.equal(await api.currentRoute(), null);
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ detail: 'Confira os campos.', errors: { email: ['Inválido'] } }),
        { status: 400 },
      )) as typeof fetch;
    await assert.rejects(
      () => api.register({ name: 'Test', email: 'bad', password: 'test' }),
      (e: any) => e.status === 400 && e.fields.email[0] === 'Inválido',
    );
    let expired = false;
    configureSession(demoLogin('Citizen'), () => {
      expired = true;
    });
    globalThis.fetch = (async () => new Response('{}', { status: 401 })) as typeof fetch;
    await assert.rejects(() => api.me(), { status: 401 });
    assert.ok(expired);
    expired = false;
    await assert.rejects(() => api.login('wrong@example.com', 'wrong'), { status: 401 });
    assert.equal(expired, false);
    globalThis.fetch = (async () => new Response('invalid', { status: 200 })) as typeof fetch;
    await assert.rejects(() => request('GET', '/account/me'), /resposta inválida/);
  } finally {
    globalThis.fetch = originalFetch;
    configureSession(null);
  }
});
