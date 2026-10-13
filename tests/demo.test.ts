import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoLogin, demoRequest, DEMO_POINT } from '../src/api/demo';
import type { Collection, Route, Truck, User } from '../src/api/types';

test('collection dispatch, cancellation, driver collection and route lifecycle stay coherent', async () => {
  demoLogin('Citizen');
  const assigned = await demoRequest<Collection>('POST', '/routing/collection-requests', {
    ...DEMO_POINT,
    address: 'Teste de integração',
    description: null,
  });
  assert.equal(assigned.status, 'Assigned');
  assert.ok(assigned.routeStopId);
  demoLogin('Driver');
  let current = await demoRequest<Route>('GET', '/management/routes/current');
  assert.ok(current.stops.some((s) => s.id === assigned.routeStopId));
  const collected = await demoRequest<Route>(
    'POST',
    `/management/routes/${current.id}/stops/${assigned.routeStopId}/complete`,
  );
  assert.equal(collected.stops.find((s) => s.id === assigned.routeStopId)?.status, 'Completed');
  demoLogin('Citizen');
  assert.equal(
    (await demoRequest<Collection>('GET', `/routing/collection-requests/${assigned.id}`)).status,
    'Collected',
  );
  await assert.rejects(
    () => demoRequest('POST', `/routing/collection-requests/${assigned.id}/cancel`),
    { status: 409 },
  );
  const cancellable = await demoRequest<Collection>('POST', '/routing/collection-requests', {
    ...DEMO_POINT,
    address: null,
    description: null,
  });
  await demoRequest('POST', `/routing/collection-requests/${cancellable.id}/cancel`);
  demoLogin('Driver');
  current = await demoRequest<Route>('GET', '/management/routes/current');
  assert.ok(!current.stops.some((s) => s.id === cancellable.routeStopId));
  demoLogin('Citizen');
  const pending = await demoRequest<Collection>('POST', '/routing/collection-requests', {
    latitude: 0,
    longitude: 0,
    address: null,
    description: null,
  });
  assert.equal(pending.status, 'Pending');
  const retried = await demoRequest<Collection>(
    'POST',
    `/routing/collection-requests/${pending.id}/retry`,
  );
  assert.equal(retried.status, 'Pending');
  assert.equal(Number(retried.assignmentAttempts), 2);
  await assert.rejects(() => demoRequest('GET', '/account/users'), { status: 403 });
  demoLogin('Driver');
  current = await demoRequest<Route>('GET', '/management/routes/current');
  for (const stop of current.stops.filter((s) => s.status === 'Pending'))
    current = await demoRequest<Route>(
      'POST',
      `/management/routes/${current.id}/stops/${stop.id}/complete`,
    );
  assert.equal(current.status, 'Completed');
  assert.equal(await demoRequest('GET', '/management/routes/current'), null);
});
test('manager creates a driver, links a truck, cancels a route and changes account access', async () => {
  demoLogin('Manager');
  const user = await demoRequest<User>('POST', '/account/users', {
    name: 'Pessoa de teste',
    email: 'integration@exemplo.com',
    password: 'demo-test',
    role: 'Driver',
  });
  const truck = await demoRequest<Truck>('POST', '/management/trucks', {
    plate: 'TST-1A01',
    description: null,
    capacityKg: null,
    driverId: null,
  });
  await demoRequest('PUT', `/management/trucks/${truck.id}/driver`, { driverId: user.id });
  assert.equal(
    (await demoRequest<Truck>('GET', `/management/trucks/${truck.id}`)).driverId,
    user.id,
  );
  const route = await demoRequest<Route>('POST', '/management/routes', {
    name: 'Rota de teste',
    truckId: truck.id,
    scheduledFor: null,
    start: null,
    optimize: true,
    stops: [{ ...DEMO_POINT, address: null }],
  });
  assert.equal(route.status, 'Planned');
  await demoRequest('POST', `/management/routes/${route.id}/start`);
  await assert.rejects(() => demoRequest('POST', `/management/routes/${route.id}/start`), {
    status: 409,
  });
  assert.equal(
    (await demoRequest<Route>('POST', `/management/routes/${route.id}/cancel`)).status,
    'Cancelled',
  );
  assert.equal(
    (await demoRequest<User>('PATCH', `/account/users/${user.id}/active?active=false`)).active,
    false,
  );
  await assert.rejects(
    () => demoRequest('POST', '/account/login', { email: user.email, password: 'demo-test' }),
    { status: 401 },
  );
});
