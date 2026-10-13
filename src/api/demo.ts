import { ApiError } from './errors';
import type {
  Collection,
  CollectionInput,
  Coordinate,
  DispatchPreview,
  Login,
  Role,
  Route,
  RouteInput,
  Stop,
  Truck,
  TruckLocation,
  User,
} from './types';

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
const now = () => new Date().toISOString();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const ids = {
  citizen: '11111111-1111-4111-8111-111111111111',
  driver: '22222222-2222-4222-8222-222222222222',
  manager: '33333333-3333-4333-8333-333333333333',
  truck: '44444444-4444-4444-8444-444444444444',
  route: '55555555-5555-4555-8555-555555555555',
};
export const DEMO_POINT = { latitude: -23.5554, longitude: -46.6576 };
export const demoUsers: User[] = [
  {
    id: ids.citizen,
    name: 'Mariana Lima',
    email: 'mariana@exemplo.com',
    role: 'Citizen',
    active: true,
    createdAt: ago(6000),
  },
  {
    id: ids.driver,
    name: 'Rafael Souza',
    email: 'rafael@exemplo.com',
    role: 'Driver',
    active: true,
    createdAt: ago(5000),
  },
  {
    id: ids.manager,
    name: 'Camila Santos',
    email: 'camila@exemplo.com',
    role: 'Manager',
    active: true,
    createdAt: ago(7000),
  },
  {
    id: uuid(),
    name: 'Lucas Ferreira',
    email: 'lucas@exemplo.com',
    role: 'Driver',
    active: true,
    createdAt: ago(4000),
  },
];
let currentUser: User | null = null;
const trucks: Truck[] = [
  {
    id: ids.truck,
    plate: 'FRT-2A48',
    description: 'Compactador • Centro',
    capacityKg: 8000,
    driverId: ids.driver,
    active: true,
    createdAt: ago(4000),
  },
  {
    id: uuid(),
    plate: 'GHK-5B12',
    description: 'Compactador • Zona oeste',
    capacityKg: 6500,
    driverId: demoUsers[3].id,
    active: true,
    createdAt: ago(3000),
  },
];
const makeStop = (
  sequence: number,
  address: string,
  latitude: number,
  longitude: number,
  completed = false,
): Stop => ({
  id: uuid(),
  sequence,
  address,
  latitude,
  longitude,
  status: completed ? 'Completed' : 'Pending',
  origin: 'Planned',
  collectionRequestId: null,
  completedAt: completed ? ago(28) : null,
});
const routes: Route[] = [
  {
    id: ids.route,
    name: 'Centro • manhã',
    truckId: ids.truck,
    status: 'InProgress',
    start: { latitude: -23.56, longitude: -46.665 },
    scheduledFor: ago(90),
    createdAt: ago(1440),
    startedAt: ago(75),
    finishedAt: null,
    estimatedDistanceKm: 8.4,
    pendingStops: 3,
    stops: [
      makeStop(1, 'Rua da Consolação, 890', -23.553, -46.654, true),
      makeStop(2, 'Rua Augusta, 1.240', -23.557, -46.659, true),
      makeStop(3, 'Rua Bela Cintra, 720', -23.5554, -46.6576),
      makeStop(4, 'Rua Frei Caneca, 540', -23.5541, -46.65),
      makeStop(5, 'Rua Haddock Lobo, 310', -23.5582, -46.662),
    ],
  },
  {
    id: uuid(),
    name: 'Zona oeste • tarde',
    truckId: trucks[1].id,
    status: 'Planned',
    start: null,
    scheduledFor: new Date(Date.now() + 7200000).toISOString(),
    createdAt: ago(120),
    startedAt: null,
    finishedAt: null,
    estimatedDistanceKm: 5.2,
    pendingStops: 2,
    stops: [
      makeStop(1, 'Rua Oscar Freire, 600', -23.566, -46.667),
      makeStop(2, 'Rua dos Pinheiros, 210', -23.567, -46.676),
    ],
  },
];
const locations: TruckLocation[] = trucks.map((t, i) => ({
  truckId: t.id,
  latitude: -23.552 - i * 0.006,
  longitude: -46.661 - i * 0.003,
  speedKmh: i ? null : 18,
  heading: 90,
  recordedAt: ago(i ? 30 : 0.2),
  receivedAt: ago(i ? 30 : 0.2),
  isOnline: !i,
}));
const request = (status: Collection['status'], address: string, minutes: number): Collection => ({
  id: uuid(),
  requesterId: ids.citizen,
  ...DEMO_POINT,
  address,
  description: 'Sacos de resíduos separados em frente ao portão.',
  status,
  truckId: status === 'Assigned' ? ids.truck : null,
  routeId: status === 'Assigned' ? ids.route : null,
  routeStopId: null,
  detourKm: status === 'Assigned' ? 0.3 : null,
  distanceFromTruckKm: status === 'Assigned' ? 1.2 : null,
  assignmentAttempts: 1,
  createdAt: ago(minutes),
  assignedAt: status === 'Assigned' ? ago(minutes - 1) : null,
  collectedAt: status === 'Collected' ? ago(minutes - 20) : null,
  cancelledAt: null,
});
const requests: Collection[] = [
  request('Assigned', 'Rua Bela Cintra, 720', 12),
  request('Pending', 'Rua Frei Caneca, 540', 34),
  request('Collected', 'Rua Augusta, 1.240', 1440),
  request('Collected', 'Rua da Consolação, 890', 4300),
];
requests[0].routeStopId = routes[0].stops[2].id;
routes[0].stops[2].origin = 'CollectionRequest';
routes[0].stops[2].collectionRequestId = requests[0].id;

export function demoLogin(role: Role): Login {
  currentUser = demoUsers.find((u) => u.role === role)!;
  return {
    accessToken: 'demo-only',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: currentUser,
  };
}
export function setDemoUser(user: User | null) {
  currentUser = user;
}
function find<T extends { id: string }>(list: T[], id: string): T {
  const value = list.find((v) => v.id === id);
  if (!value) throw new ApiError(404, 'Registro não encontrado.');
  return value;
}
function manager() {
  if (currentUser?.role !== 'Manager')
    throw new ApiError(403, 'Apenas o gestor pode realizar esta ação.');
}
const summarize = (r: Route) => ({
  id: r.id,
  name: r.name,
  truckId: r.truckId,
  status: r.status,
  scheduledFor: r.scheduledFor,
  totalStops: r.stops.length,
  pendingStops: r.pendingStops,
});
function routePermission(route: Route) {
  if (
    currentUser?.role !== 'Manager' &&
    (currentUser?.role !== 'Driver' || find(trucks, route.truckId).driverId !== currentUser.id)
  )
    throw new ApiError(403, 'Esta rota pertence a outro motorista.');
}
function preview(point: Coordinate): DispatchPreview {
  // Fictional availability and distances, not a replacement for server optimization.
  const route = routes.find(
    (r) =>
      r.status === 'InProgress' &&
      locations.some(
        (l) =>
          l.truckId === r.truckId && l.isOnline && Date.now() - Date.parse(l.receivedAt) < 180000,
      ),
  );
  const eligible =
    !!route &&
    Math.abs(Number(point.latitude) - DEMO_POINT.latitude) < 0.08 &&
    Math.abs(Number(point.longitude) - DEMO_POINT.longitude) < 0.08;
  return {
    hasCandidate: eligible,
    truckId: eligible ? route!.truckId : null,
    routeId: eligible ? route!.id : null,
    insertBeforeStopId: eligible
      ? route!.stops.find((s) => s.status === 'Pending')?.id || null
      : null,
    detourKm: eligible ? 0.3 : null,
    distanceFromTruckKm: eligible ? 1.2 : null,
    score: eligible ? 0.3 : null,
  };
}
function assign(collection: Collection) {
  collection.assignmentAttempts = Number(collection.assignmentAttempts) + 1;
  const p = preview(collection);
  if (!p.hasCandidate) return collection;
  const route = find(routes, p.routeId!);
  const stop: Stop = {
    id: uuid(),
    sequence: route.stops.length + 1,
    latitude: collection.latitude,
    longitude: collection.longitude,
    address: collection.address,
    status: 'Pending',
    origin: 'CollectionRequest',
    collectionRequestId: collection.id,
    completedAt: null,
  };
  const index = route.stops.findIndex((s) => s.id === p.insertBeforeStopId);
  route.stops.splice(index < 0 ? route.stops.length : index, 0, stop);
  route.stops.forEach((s, i) => (s.sequence = i + 1));
  route.pendingStops = route.stops.filter((s) => s.status === 'Pending').length;
  Object.assign(collection, {
    status: 'Assigned',
    truckId: p.truckId,
    routeId: route.id,
    routeStopId: stop.id,
    detourKm: p.detourKm,
    distanceFromTruckKm: p.distanceFromTruckKm,
    assignedAt: now(),
  });
  return collection;
}

export async function demoRequest<T>(method: string, path: string, body?: any): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 260));
  const url = new URL(path, 'https://demo.invalid');
  const p = url.pathname;
  let value: any;
  if (p === '/account/register' || (p === '/account/users' && method === 'POST')) {
    if (p.endsWith('users')) manager();
    if (demoUsers.some((u) => u.email.toLowerCase() === body.email.toLowerCase()))
      throw new ApiError(409, 'Este e-mail já está cadastrado.');
    const u: User = {
      id: uuid(),
      name: body.name,
      email: body.email,
      role: p.endsWith('register') ? 'Citizen' : body.role,
      active: true,
      createdAt: now(),
    };
    demoUsers.push(u);
    value = u;
  } else if (p === '/account/login') {
    const user = demoUsers.find(
      (u) => u.email.toLowerCase() === body.email.toLowerCase() && u.active,
    );
    if (!user)
      throw new ApiError(401, 'Conta não encontrada na demonstração. Use os atalhos de perfil.');
    currentUser = user;
    value = {
      accessToken: 'demo-only',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      user,
    };
  } else {
    if (!currentUser || !currentUser.active) throw new ApiError(401, 'Entre para continuar.');
    if (p === '/account/me') value = currentUser;
    else if (p === '/account/users') {
      manager();
      value = demoUsers.filter(
        (u) => !url.searchParams.has('role') || u.role === url.searchParams.get('role'),
      );
    } else if (/^\/account\/users\/[^/]+\/active$/.test(p)) {
      manager();
      const u = find(demoUsers, p.split('/')[3]);
      u.active = url.searchParams.get('active') === 'true';
      value = u;
    } else if (/^\/account\/users\/[^/]+$/.test(p)) {
      manager();
      value = find(demoUsers, p.split('/')[3]);
    } else if (p === '/management/trucks' && method === 'POST') {
      manager();
      if (trucks.some((t) => t.plate === body.plate))
        throw new ApiError(409, 'Esta placa já foi cadastrada.');
      const t = { ...body, id: uuid(), active: true, createdAt: now() };
      trucks.push(t);
      value = t;
    } else if (p === '/management/trucks') {
      manager();
      value = trucks;
    } else if (p === '/management/trucks/locations' || p === '/routing/trucks/locations')
      value = locations.map((l) => ({
        ...l,
        isOnline: l.isOnline && Date.now() - Date.parse(l.receivedAt) < 180000,
      }));
    else if (/^\/management\/trucks\/[^/]+\/driver$/.test(p)) {
      manager();
      const t = find(trucks, p.split('/')[3]);
      if (body.driverId) {
        const u = find(demoUsers, body.driverId);
        if (u.role !== 'Driver' || !u.active)
          throw new ApiError(400, 'Selecione um motorista ativo.');
      }
      t.driverId = body.driverId;
      value = t;
    } else if (/^\/(management|routing)\/trucks\/[^/]+\/location$/.test(p)) {
      const truckId = p.split('/')[3];
      const t = find(trucks, truckId);
      if (method === 'POST') {
        if (currentUser.role !== 'Driver' || t.driverId !== currentUser.id)
          throw new ApiError(403, 'Você não está vinculado a este caminhão.');
        let l = locations.find((l) => l.truckId === truckId);
        if (!l) {
          l = { truckId, ...body, recordedAt: now(), receivedAt: now(), isOnline: true };
          locations.push(l!);
        }
        Object.assign(l!, body, {
          recordedAt: body.recordedAt || now(),
          receivedAt: now(),
          isOnline: true,
        });
        value = l;
      } else {
        value = locations.find((l) => l.truckId === truckId);
        if (!value) throw new ApiError(404, 'Este caminhão ainda não compartilhou sua posição.');
      }
    } else if (/^\/management\/trucks\/[^/]+$/.test(p)) {
      manager();
      value = find(trucks, p.split('/')[3]);
    } else if (p === '/management/routes/current') {
      const mine = trucks.filter((t) => t.driverId === currentUser!.id).map((t) => t.id);
      value =
        routes.find((r) => mine.includes(r.truckId) && r.status === 'InProgress') ||
        routes
          .filter((r) => mine.includes(r.truckId) && r.status === 'Planned')
          .sort((a, b) => (a.scheduledFor || '').localeCompare(b.scheduledFor || ''))[0] ||
        null;
    } else if (p === '/management/routes' && method === 'POST') {
      manager();
      find(trucks, body.truckId);
      const input = body as RouteInput;
      const r: Route = {
        ...input,
        id: uuid(),
        status: 'Planned',
        createdAt: now(),
        startedAt: null,
        finishedAt: null,
        estimatedDistanceKm: 0,
        pendingStops: input.stops.length,
        stops: input.stops.map((s, i) => ({
          ...s,
          id: uuid(),
          sequence: i + 1,
          status: 'Pending',
          origin: 'Planned',
          collectionRequestId: null,
          completedAt: null,
        })),
      };
      routes.push(r);
      value = r;
    } else if (p === '/management/routes') {
      manager();
      value = routes
        .filter(
          (r) =>
            (!url.searchParams.has('status') || r.status === url.searchParams.get('status')) &&
            (!url.searchParams.has('truckId') || r.truckId === url.searchParams.get('truckId')),
        )
        .map(summarize);
    } else if (/^\/management\/routes\/[^/]+/.test(p)) {
      const r = find(routes, p.split('/')[3]);
      routePermission(r);
      if (p.endsWith('/start')) {
        if (
          r.status !== 'Planned' ||
          routes.some((o) => o.id !== r.id && o.truckId === r.truckId && o.status === 'InProgress')
        )
          throw new ApiError(
            409,
            'Não é possível iniciar: verifique o status e outras rotas deste caminhão.',
          );
        r.status = 'InProgress';
        r.startedAt = now();
      } else if (p.endsWith('/cancel')) {
        manager();
        if (!['Planned', 'InProgress'].includes(r.status))
          throw new ApiError(409, 'Esta rota já foi encerrada.');
        r.status = 'Cancelled';
        r.finishedAt = now();
        requests
          .filter((c) => c.routeId === r.id && c.status === 'Assigned')
          .forEach((c) =>
            Object.assign(c, {
              status: 'Pending',
              truckId: null,
              routeId: null,
              routeStopId: null,
              assignedAt: null,
              detourKm: null,
              distanceFromTruckKm: null,
            }),
          );
      } else if (p.endsWith('/complete')) {
        if (r.status !== 'InProgress')
          throw new ApiError(409, 'Inicie a rota para registrar a coleta.');
        const s = find(r.stops, p.split('/')[5]);
        if (s.status !== 'Pending') throw new ApiError(409, 'Esta parada já foi atendida.');
        s.status = 'Completed';
        s.completedAt = now();
        const c = requests.find((c) => c.id === s.collectionRequestId);
        if (c) {
          c.status = 'Collected';
          c.collectedAt = now();
        }
        r.pendingStops = r.stops.filter((s) => s.status === 'Pending').length;
        if (!r.pendingStops) {
          r.status = 'Completed';
          r.finishedAt = now();
        }
      }
      value = r;
    } else if (p === '/routing/collection-requests/preview')
      value = preview({
        latitude: Number(url.searchParams.get('latitude')),
        longitude: Number(url.searchParams.get('longitude')),
      });
    else if (p === '/routing/collection-requests/mine')
      value = requests.filter((c) => c.requesterId === currentUser!.id);
    else if (p === '/routing/collection-requests' && method === 'POST') {
      const c: Collection = {
        ...(body as CollectionInput),
        id: uuid(),
        requesterId: currentUser.id,
        status: 'Pending',
        truckId: null,
        routeId: null,
        routeStopId: null,
        detourKm: null,
        distanceFromTruckKm: null,
        assignmentAttempts: 0,
        createdAt: now(),
        assignedAt: null,
        collectedAt: null,
        cancelledAt: null,
      };
      requests.unshift(c);
      value = assign(c);
    } else if (p === '/routing/collection-requests') {
      manager();
      value = requests.filter(
        (c) =>
          (!url.searchParams.has('status') || c.status === url.searchParams.get('status')) &&
          (!url.searchParams.has('truckId') || c.truckId === url.searchParams.get('truckId')),
      );
    } else if (/^\/routing\/collection-requests\/[^/]+/.test(p)) {
      const c = find(requests, p.split('/')[3]);
      if (c.requesterId !== currentUser.id && currentUser.role !== 'Manager')
        throw new ApiError(403, 'Esta solicitação pertence a outro usuário.');
      if (p.endsWith('/cancel')) {
        if (!['Pending', 'Assigned'].includes(c.status))
          throw new ApiError(409, 'Esta coleta já foi encerrada.');
        if (c.routeId) {
          const r = find(routes, c.routeId);
          r.stops = r.stops.filter((s) => s.id !== c.routeStopId);
          r.stops.forEach((s, i) => (s.sequence = i + 1));
          r.pendingStops = r.stops.filter((s) => s.status === 'Pending').length;
        }
        c.status = 'Cancelled';
        c.cancelledAt = now();
      } else if (p.endsWith('/retry')) {
        if (c.status !== 'Pending')
          throw new ApiError(409, 'Somente solicitações pendentes podem ser reatribuídas.');
        assign(c);
      }
      value = c;
    } else throw new ApiError(404, 'Operação não disponível na demonstração.');
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
