// Mock HTTP do back-end ProjetoA3 (docs/openapi.json). Substitui temporariamente a API real:
// mesmas rotas, formatos, códigos de status, JWT e ProblemDetails, com dados em memória.
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';
import openapiSpec from '../docs/openapi.json';
import type {
  Collection,
  CollectionStatus,
  Coordinate,
  DispatchPreview,
  Role,
  Route,
  RouteStatus,
  Stop,
  Truck,
  TruckLocation,
  User,
} from '../src/api/types';

export const SEED_PASSWORD = 'coleta123';
export const SEED_ACCOUNTS = [
  { role: 'Manager', email: 'camila@exemplo.com', name: 'Camila Santos' },
  { role: 'Driver', email: 'rafael@exemplo.com', name: 'Rafael Souza' },
  { role: 'Citizen', email: 'mariana@exemplo.com', name: 'Mariana Lima' },
] as const;

export interface MockOptions {
  /** Movimenta caminhões em rota quando o motorista não envia GPS real. */
  simulate?: boolean;
  /** Tempo de validade do token em minutos. */
  tokenMinutes?: number;
  /** Mostra uma linha por requisição no terminal. */
  log?: boolean;
  /** Serve também o app web exportado (modo executável). Recebe um caminho como /index.html. */
  web?: { read(file: string): Buffer | null };
  /** Segredo fixo do JWT (ex.: várias instâncias serverless aceitam os mesmos tokens). */
  secret?: string;
}

const API_PATH = /^\/(account|management|routing|openapi)(\/|$)/;
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const ONLINE_MS = 3 * 60_000;
const MAX_DETOUR_KM = 15;
const ROLES: Role[] = ['Citizen', 'Driver', 'Manager'];
const COLLECTION_STATUS: CollectionStatus[] = ['Pending', 'Assigned', 'Collected', 'Cancelled'];
const ROUTE_STATUS: RouteStatus[] = ['Planned', 'InProgress', 'Completed', 'Cancelled'];
const GUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

type Account = User & { passwordHash: string };
type Location = TruckLocation & { simulated: boolean };

class HttpError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
    public errors?: Record<string, string[]>,
  ) {
    super(detail || title);
  }
}
const badRequest = (errors: Record<string, string[]>) =>
  new HttpError(400, 'Revise os campos destacados.', Object.values(errors)[0]?.[0], errors);
const notFound = (detail = 'Registro não encontrado.') =>
  new HttpError(404, 'Não encontrado', detail);
const conflict = (detail: string) => new HttpError(409, 'Conflito', detail);
const forbidden = (detail = 'Seu perfil não tem acesso a esta ação.') =>
  new HttpError(403, 'Acesso negado', detail);
const unauthorized = (detail = 'Entre para continuar.') =>
  new HttpError(401, 'Não autenticado', detail);

const now = () => new Date().toISOString();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const num = (value: unknown) =>
  value === null || value === undefined || value === '' ? NaN : Number(value);

function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}
function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

export function haversineKm(a: Coordinate, b: Coordinate) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const [lat1, lon1, lat2, lon2] = [a.latitude, a.longitude, b.latitude, b.longitude].map(Number);
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
function pathKm(points: Coordinate[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return round(total);
}

function createStore() {
  const ids = {
    citizen: '11111111-1111-4111-8111-111111111111',
    driver: '22222222-2222-4222-8222-222222222222',
    manager: '33333333-3333-4333-8333-333333333333',
    truck: '44444444-4444-4444-8444-444444444444',
    route: '55555555-5555-4555-8555-555555555555',
    driver2: '66666666-6666-4666-8666-666666666666',
    truck2: '77777777-7777-4777-8777-777777777777',
  };
  const seedHash = hashPassword(SEED_PASSWORD);
  const account = (id: string, name: string, email: string, role: Role, minutes: number) =>
    ({
      id,
      name,
      email,
      role,
      active: true,
      createdAt: ago(minutes),
      passwordHash: seedHash,
    }) as Account;
  const users: Account[] = [
    account(ids.manager, 'Camila Santos', 'camila@exemplo.com', 'Manager', 7000),
    account(ids.driver, 'Rafael Souza', 'rafael@exemplo.com', 'Driver', 5000),
    account(ids.driver2, 'Lucas Ferreira', 'lucas@exemplo.com', 'Driver', 4000),
    account(ids.citizen, 'Mariana Lima', 'mariana@exemplo.com', 'Citizen', 6000),
  ];
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
      id: ids.truck2,
      plate: 'GHK-5B12',
      description: 'Compactador • Zona oeste',
      capacityKg: 6500,
      driverId: ids.driver2,
      active: true,
      createdAt: ago(3000),
    },
  ];
  const stop = (
    sequence: number,
    address: string,
    latitude: number,
    longitude: number,
    completed = false,
  ): Stop => ({
    id: randomUUID(),
    sequence,
    latitude,
    longitude,
    address,
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
      estimatedDistanceKm: 0,
      pendingStops: 0,
      stops: [
        stop(1, 'Rua da Consolação, 890', -23.553, -46.654, true),
        stop(2, 'Rua Augusta, 1.240', -23.557, -46.659, true),
        stop(3, 'Rua Bela Cintra, 720', -23.5554, -46.6576),
        stop(4, 'Rua Frei Caneca, 540', -23.5541, -46.65),
        stop(5, 'Rua Haddock Lobo, 310', -23.5582, -46.662),
      ],
    },
    {
      id: randomUUID(),
      name: 'Zona oeste • tarde',
      truckId: ids.truck2,
      status: 'Planned',
      start: null,
      scheduledFor: new Date(Date.now() + 2 * 3_600_000).toISOString(),
      createdAt: ago(120),
      startedAt: null,
      finishedAt: null,
      estimatedDistanceKm: 0,
      pendingStops: 0,
      stops: [
        stop(1, 'Rua Oscar Freire, 600', -23.566, -46.667),
        stop(2, 'Rua dos Pinheiros, 210', -23.567, -46.676),
      ],
    },
  ];
  routes.forEach(refreshRoute);
  const locations: Location[] = [
    {
      truckId: ids.truck,
      latitude: -23.552,
      longitude: -46.661,
      speedKmh: 18,
      heading: 90,
      recordedAt: now(),
      receivedAt: now(),
      isOnline: true,
      simulated: true,
    },
    {
      truckId: ids.truck2,
      latitude: -23.558,
      longitude: -46.664,
      speedKmh: null,
      heading: null,
      recordedAt: ago(30),
      receivedAt: ago(30),
      isOnline: false,
      simulated: false,
    },
  ];
  const request = (
    status: CollectionStatus,
    address: string,
    minutes: number,
    point: Coordinate = { latitude: -23.5554, longitude: -46.6576 },
  ): Collection => ({
    id: randomUUID(),
    requesterId: ids.citizen,
    latitude: point.latitude,
    longitude: point.longitude,
    address,
    description: 'Sacos de resíduos separados em frente ao portão.',
    status,
    truckId: null,
    routeId: null,
    routeStopId: null,
    detourKm: null,
    distanceFromTruckKm: null,
    assignmentAttempts: 1,
    createdAt: ago(minutes),
    assignedAt: null,
    collectedAt: status === 'Collected' ? ago(minutes - 20) : null,
    cancelledAt: null,
  });
  const collections: Collection[] = [
    request('Assigned', 'Rua Bela Cintra, 720', 12),
    // Fora do alcance dos caminhões em rota: permanece na fila até uma rota passar perto.
    request('Pending', 'Avenida Itaquera, 8.000', 34, { latitude: -23.542, longitude: -46.456 }),
    request('Collected', 'Rua Augusta, 1.240', 1440),
    request('Collected', 'Rua da Consolação, 890', 4300),
  ];
  // A coleta atribuída corresponde à parada 3 da rota em andamento.
  const linked = routes[0].stops[2];
  linked.origin = 'CollectionRequest';
  linked.collectionRequestId = collections[0].id;
  Object.assign(collections[0], {
    truckId: ids.truck,
    routeId: ids.route,
    routeStopId: linked.id,
    detourKm: 0.3,
    distanceFromTruckKm: 0.6,
    assignedAt: ago(11),
  });
  return { users, trucks, routes, locations, collections };
}

function refreshRoute(route: Route) {
  route.stops.forEach((s, i) => (s.sequence = i + 1));
  route.pendingStops = route.stops.filter((s) => s.status === 'Pending').length;
  route.estimatedDistanceKm = pathKm([...(route.start ? [route.start] : []), ...route.stops]);
}

function optimizeStops<T extends Coordinate>(start: Coordinate | null, stops: T[]): T[] {
  if (stops.length < 3 && !start) return stops;
  const rest = [...stops];
  const ordered: T[] = [];
  let current: Coordinate = start || rest.shift()!;
  if (!start) ordered.push(current as T);
  while (rest.length) {
    let best = 0;
    for (let i = 1; i < rest.length; i++)
      if (haversineKm(current, rest[i]) < haversineKm(current, rest[best])) best = i;
    current = rest.splice(best, 1)[0];
    ordered.push(current as T);
  }
  return ordered;
}

export function createMockApp(options: MockOptions = {}) {
  const { simulate = true, tokenMinutes = 8 * 60, log = false, web } = options;
  const db = createStore();
  const secret = options.secret ? Buffer.from(options.secret) : randomBytes(32);

  // ---------- autenticação ----------
  const b64 = (value: Buffer | string) => Buffer.from(value).toString('base64url');
  const sign = (data: string) => createHmac('sha256', secret).update(data).digest('base64url');
  function issueToken(user: Account) {
    const exp = Math.floor(Date.now() / 1000) + tokenMinutes * 60;
    const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp,
      }),
    );
    return {
      accessToken: `${head}.${body}.${sign(`${head}.${body}`)}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }
  function authenticate(req: IncomingMessage): Account {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw unauthorized();
    const [head, body, signature] = token.split('.');
    if (!head || !body || !signature) throw unauthorized('Token inválido.');
    const expected = Buffer.from(sign(`${head}.${body}`));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw unauthorized('Token inválido.');
    let payload: { sub?: string; exp?: number };
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw unauthorized('Token inválido.');
    }
    if (!payload.exp || payload.exp * 1000 <= Date.now()) throw unauthorized('Token expirado.');
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user || !user.active) throw unauthorized('Conta indisponível.');
    return user;
  }
  const publicUser = ({ passwordHash: _hash, ...user }: Account): User => user;
  const requireManager = (user: Account) => {
    if (user.role !== 'Manager') throw forbidden('Apenas o gestor pode realizar esta ação.');
  };

  // ---------- validação ----------
  function text(errors: Record<string, string[]>, field: string, value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) {
      errors[field] = [`Informe ${label}.`];
      return '';
    }
    return value.trim();
  }
  function optionalText(
    errors: Record<string, string[]>,
    field: string,
    value: unknown,
    max = 300,
  ) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') {
      errors[field] = ['Valor inválido.'];
      return null;
    }
    if (value.length > max) errors[field] = [`Use no máximo ${max} caracteres.`];
    return value.trim() || null;
  }
  function coordinate(errors: Record<string, string[]>, value: any, prefix = '') {
    const latitude = num(value?.latitude);
    const longitude = num(value?.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
      errors[`${prefix}latitude`] = ['Latitude deve estar entre -90 e 90.'];
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
      errors[`${prefix}longitude`] = ['Longitude deve estar entre -180 e 180.'];
    return { latitude, longitude };
  }
  function optionalNumber(errors: Record<string, string[]>, field: string, value: unknown) {
    if (value === null || value === undefined) return null;
    const n = num(value);
    if (!Number.isFinite(n)) errors[field] = ['Informe um número válido.'];
    return n;
  }
  function optionalDate(errors: Record<string, string[]>, field: string, value: unknown) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      errors[field] = ['Informe uma data válida.'];
      return null;
    }
    return new Date(value).toISOString();
  }
  function account(errors: Record<string, string[]>, body: any) {
    const name = text(errors, 'name', body?.name, 'o nome');
    const email = text(errors, 'email', body?.email, 'o e-mail').toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = ['Informe um e-mail válido.'];
    if (typeof body?.password !== 'string' || body.password.length < 6)
      errors.password = ['A senha deve ter pelo menos 6 caracteres.'];
    if (name.length > 120) errors.name = ['Use no máximo 120 caracteres.'];
    return { name, email, password: String(body?.password ?? '') };
  }
  function ensureValid(errors: Record<string, string[]>) {
    if (Object.keys(errors).length) throw badRequest(errors);
  }
  function enumQuery<T extends string>(url: URL, key: string, values: readonly T[]) {
    const value = url.searchParams.get(key);
    if (value === null || value === '') return null;
    if (!values.includes(value as T))
      throw badRequest({ [key]: [`Valor inválido. Use: ${values.join(', ')}.`] });
    return value as T;
  }
  function guidQuery(url: URL, key: string) {
    const value = url.searchParams.get(key);
    if (value === null || value === '') return null;
    if (!new RegExp(`^${GUID}$`).test(value))
      throw badRequest({ [key]: ['Identificador inválido.'] });
    return value.toLowerCase();
  }

  // ---------- domínio ----------
  const findUser = (id: string) => db.users.find((u) => u.id === id) || null;
  const findTruck = (id: string) => {
    const truck = db.trucks.find((t) => t.id === id);
    if (!truck) throw notFound('Caminhão não encontrado.');
    return truck;
  };
  const findRoute = (id: string) => {
    const route = db.routes.find((r) => r.id === id);
    if (!route) throw notFound('Rota não encontrada.');
    return route;
  };
  const findCollection = (id: string) => {
    const c = db.collections.find((r) => r.id === id);
    if (!c) throw notFound('Solicitação não encontrada.');
    return c;
  };
  const isOnline = (l: { receivedAt: string }) => Date.now() - Date.parse(l.receivedAt) < ONLINE_MS;
  const locationView = ({ simulated: _simulated, ...l }: Location): TruckLocation => ({
    ...l,
    isOnline: isOnline(l),
  });
  const summary = (r: Route) => ({
    id: r.id,
    name: r.name,
    truckId: r.truckId,
    status: r.status,
    scheduledFor: r.scheduledFor,
    totalStops: r.stops.length,
    pendingStops: r.pendingStops,
  });
  function routeAccess(user: Account, route: Route) {
    if (user.role === 'Manager') return;
    if (user.role === 'Driver' && findTruck(route.truckId).driverId === user.id) return;
    throw forbidden('Esta rota pertence a outro motorista.');
  }

  function preview(point: Coordinate): DispatchPreview {
    let best: DispatchPreview | null = null;
    for (const route of db.routes.filter((r) => r.status === 'InProgress')) {
      const location = db.locations.find((l) => l.truckId === route.truckId);
      if (!location || !isOnline(location)) continue;
      const pending = route.stops.filter((s) => s.status === 'Pending');
      const chain: Coordinate[] = [location, ...pending];
      // Inserção mais barata: testa a parada entre cada par consecutivo e no final.
      for (let i = 1; i <= chain.length; i++) {
        const prev = chain[i - 1];
        const next = chain[i];
        const detour = next
          ? haversineKm(prev, point) + haversineKm(point, next) - haversineKm(prev, next)
          : haversineKm(prev, point);
        if (detour > MAX_DETOUR_KM) continue;
        if (!best || detour < Number(best.detourKm)) {
          best = {
            hasCandidate: true,
            truckId: route.truckId,
            routeId: route.id,
            insertBeforeStopId: next ? pending[i - 1].id : null,
            detourKm: round(detour),
            distanceFromTruckKm: round(haversineKm(location, point)),
            score: round(detour, 3),
          };
        }
      }
    }
    return (
      best || {
        hasCandidate: false,
        truckId: null,
        routeId: null,
        insertBeforeStopId: null,
        detourKm: null,
        distanceFromTruckKm: null,
        score: null,
      }
    );
  }
  function assign(collection: Collection) {
    collection.assignmentAttempts = Number(collection.assignmentAttempts) + 1;
    const p = preview(collection);
    if (!p.hasCandidate) return collection;
    const route = findRoute(p.routeId!);
    const stop: Stop = {
      id: randomUUID(),
      sequence: 0,
      latitude: Number(collection.latitude),
      longitude: Number(collection.longitude),
      address: collection.address,
      status: 'Pending',
      origin: 'CollectionRequest',
      collectionRequestId: collection.id,
      completedAt: null,
    };
    const index = p.insertBeforeStopId
      ? route.stops.findIndex((s) => s.id === p.insertBeforeStopId)
      : route.stops.length;
    route.stops.splice(index < 0 ? route.stops.length : index, 0, stop);
    refreshRoute(route);
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
  function releaseCollections(route: Route) {
    for (const c of db.collections.filter((c) => c.routeId === route.id && c.status === 'Assigned'))
      Object.assign(c, {
        status: 'Pending',
        truckId: null,
        routeId: null,
        routeStopId: null,
        detourKm: null,
        distanceFromTruckKm: null,
        assignedAt: null,
      });
  }
  // Reprocessamento automático da fila: só conta tentativa quando há caminhão elegível.
  const retryPending = () =>
    db.collections
      .filter((c) => c.status === 'Pending' && preview(c).hasCandidate)
      .forEach((c) => assign(c));

  // ---------- rotas HTTP ----------
  type Ctx = { req: IncomingMessage; url: URL; body: any; params: string[]; user: () => Account };
  type Result = { status?: number; body?: unknown; location?: string };
  const table: [string, RegExp, (ctx: Ctx) => Result][] = [];
  const on = (method: string, pattern: string, handler: (ctx: Ctx) => Result) =>
    table.push([method, new RegExp(`^${pattern.replace(/\{id\}/g, `(${GUID})`)}/?$`), handler]);

  // Account
  on('POST', '/account/login', ({ body }) => {
    const errors: Record<string, string[]> = {};
    const email = text(errors, 'email', body?.email, 'o e-mail').toLowerCase();
    const password = text(errors, 'password', body?.password, 'a senha');
    ensureValid(errors);
    const user = db.users.find((u) => u.email === email);
    if (!user || !user.active || !checkPassword(password, user.passwordHash))
      throw new HttpError(401, 'Não autenticado', 'E-mail ou senha incorretos.');
    return { body: { ...issueToken(user), tokenType: 'Bearer', user: publicUser(user) } };
  });
  const createAccount = (body: any, role: Role | null) => {
    const errors: Record<string, string[]> = {};
    const data = account(errors, body);
    if (role === null && !ROLES.includes(body?.role)) errors.role = ['Selecione um perfil válido.'];
    ensureValid(errors);
    if (db.users.some((u) => u.email === data.email))
      throw conflict('Este e-mail já está cadastrado.');
    const user: Account = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      role: role || body.role,
      active: true,
      createdAt: now(),
      passwordHash: hashPassword(data.password),
    };
    db.users.push(user);
    return { status: 201, body: publicUser(user), location: `/account/users/${user.id}` };
  };
  on('POST', '/account/register', ({ body }) => createAccount(body, 'Citizen'));
  on('GET', '/account/me', ({ user }) => ({ body: publicUser(user()) }));
  on('POST', '/account/users', ({ user, body }) => {
    requireManager(user());
    return createAccount(body, null);
  });
  on('GET', '/account/users', ({ user, url }) => {
    requireManager(user());
    const role = enumQuery(url, 'role', ROLES);
    return { body: db.users.filter((u) => !role || u.role === role).map(publicUser) };
  });
  on('GET', '/account/users/{id}', ({ user, params }) => {
    requireManager(user());
    const found = findUser(params[0]);
    if (!found) throw notFound('Usuário não encontrado.');
    return { body: publicUser(found) };
  });
  on('PATCH', '/account/users/{id}/active', ({ user, params, url }) => {
    const me = user();
    requireManager(me);
    const raw = url.searchParams.get('active')?.toLowerCase();
    if (raw !== 'true' && raw !== 'false')
      throw badRequest({ active: ['Informe active=true ou active=false.'] });
    const found = findUser(params[0]);
    if (!found) throw notFound('Usuário não encontrado.');
    if (found.id === me.id && raw === 'false')
      throw badRequest({ active: ['Você não pode desativar a própria conta.'] });
    found.active = raw === 'true';
    return { body: publicUser(found) };
  });

  // Management · caminhões
  on('POST', '/management/trucks', ({ user, body }) => {
    requireManager(user());
    const errors: Record<string, string[]> = {};
    const plate = text(errors, 'plate', body?.plate, 'a placa').toUpperCase();
    if (plate && !/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(plate))
      errors.plate = ['Use uma placa no formato ABC-1234 ou ABC1D23.'];
    const description = optionalText(errors, 'description', body?.description, 200);
    const capacityKg = optionalNumber(errors, 'capacityKg', body?.capacityKg);
    if (capacityKg !== null && !(capacityKg > 0))
      errors.capacityKg = ['A capacidade deve ser positiva.'];
    const driverId = body?.driverId ?? null;
    if (driverId !== null) {
      const driver = typeof driverId === 'string' ? findUser(driverId) : null;
      if (!driver || driver.role !== 'Driver' || !driver.active)
        errors.driverId = ['Selecione um motorista ativo.'];
    }
    ensureValid(errors);
    const key = (p: string) => p.replace('-', '');
    if (db.trucks.some((t) => key(t.plate) === key(plate)))
      throw conflict('Esta placa já foi cadastrada.');
    const truck: Truck = {
      id: randomUUID(),
      plate,
      description,
      capacityKg,
      driverId,
      active: true,
      createdAt: now(),
    };
    db.trucks.push(truck);
    return { status: 201, body: truck, location: `/management/trucks/${truck.id}` };
  });
  on('GET', '/management/trucks', ({ user }) => {
    requireManager(user());
    return { body: db.trucks };
  });
  const allLocations = ({ user }: Ctx) => {
    user();
    return { body: db.locations.map(locationView) };
  };
  on('GET', '/management/trucks/locations', allLocations);
  on('GET', '/routing/trucks/locations', allLocations);
  on('GET', '/management/trucks/{id}', ({ user, params }) => {
    requireManager(user());
    return { body: findTruck(params[0]) };
  });
  on('PUT', '/management/trucks/{id}/driver', ({ user, params, body }) => {
    requireManager(user());
    const truck = findTruck(params[0]);
    if (!body || !('driverId' in body))
      throw badRequest({ driverId: ['Informe driverId (ou null para desvincular).'] });
    const driverId = body.driverId;
    if (driverId !== null) {
      const driver = typeof driverId === 'string' ? findUser(driverId) : null;
      if (!driver || driver.role !== 'Driver' || !driver.active)
        throw badRequest({ driverId: ['Selecione um motorista ativo.'] });
    }
    truck.driverId = driverId;
    return { body: truck };
  });
  const getLocation = ({ user, params }: Ctx) => {
    user();
    findTruck(params[0]);
    const location = db.locations.find((l) => l.truckId === params[0]);
    if (!location) throw notFound('Este caminhão ainda não compartilhou sua posição.');
    return { body: locationView(location) };
  };
  on('GET', '/management/trucks/{id}/location', getLocation);
  on('GET', '/routing/trucks/{id}/location', getLocation);
  on('POST', '/routing/trucks/{id}/location', ({ user, params, body }) => {
    const me = user();
    const truck = findTruck(params[0]);
    if (me.role !== 'Driver' || truck.driverId !== me.id)
      throw forbidden('Você não está vinculado a este caminhão.');
    const errors: Record<string, string[]> = {};
    const point = coordinate(errors, body);
    const speedKmh = optionalNumber(errors, 'speedKmh', body?.speedKmh);
    const heading = optionalNumber(errors, 'heading', body?.heading);
    const recordedAt = optionalDate(errors, 'recordedAt', body?.recordedAt);
    ensureValid(errors);
    let location = db.locations.find((l) => l.truckId === truck.id);
    if (!location) {
      location = { truckId: truck.id } as Location;
      db.locations.push(location);
    }
    Object.assign(location, point, {
      speedKmh,
      heading,
      recordedAt: recordedAt || now(),
      receivedAt: now(),
      simulated: false,
    });
    retryPending();
    return { body: locationView(location) };
  });

  // Management · rotas
  on('POST', '/management/routes', ({ user, body }) => {
    requireManager(user());
    const errors: Record<string, string[]> = {};
    const name = text(errors, 'name', body?.name, 'o nome da rota');
    const scheduledFor = optionalDate(errors, 'scheduledFor', body?.scheduledFor);
    const start = body?.start ? coordinate(errors, body.start, 'start.') : null;
    const truckId = typeof body?.truckId === 'string' ? body.truckId : '';
    if (!new RegExp(`^${GUID}$`).test(truckId)) errors.truckId = ['Selecione um caminhão.'];
    if (!Array.isArray(body?.stops) || body.stops.length === 0)
      errors.stops = ['Inclua pelo menos uma parada.'];
    const stops = (Array.isArray(body?.stops) ? body.stops : []).map((s: any, i: number) => ({
      ...coordinate(errors, s, `stops[${i}].`),
      address: optionalText(errors, `stops[${i}].address`, s?.address),
    }));
    ensureValid(errors);
    findTruck(truckId);
    const ordered = body.optimize === false ? stops : optimizeStops(start, stops);
    const route: Route = {
      id: randomUUID(),
      name,
      truckId,
      status: 'Planned',
      start,
      scheduledFor,
      createdAt: now(),
      startedAt: null,
      finishedAt: null,
      estimatedDistanceKm: 0,
      pendingStops: 0,
      stops: ordered.map((s: Coordinate & { address: string | null }) => ({
        id: randomUUID(),
        sequence: 0,
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.address,
        status: 'Pending' as const,
        origin: 'Planned' as const,
        collectionRequestId: null,
        completedAt: null,
      })),
    };
    refreshRoute(route);
    db.routes.push(route);
    return { status: 201, body: route, location: `/management/routes/${route.id}` };
  });
  on('GET', '/management/routes', ({ user, url }) => {
    requireManager(user());
    const status = enumQuery(url, 'status', ROUTE_STATUS);
    const truckId = guidQuery(url, 'truckId');
    return {
      body: db.routes
        .filter((r) => (!status || r.status === status) && (!truckId || r.truckId === truckId))
        .map(summary),
    };
  });
  on('GET', '/management/routes/current', ({ user }) => {
    const me = user();
    const mine = db.trucks.filter((t) => t.driverId === me.id).map((t) => t.id);
    const route =
      db.routes.find((r) => mine.includes(r.truckId) && r.status === 'InProgress') ||
      db.routes
        .filter((r) => mine.includes(r.truckId) && r.status === 'Planned')
        .sort((a, b) => (a.scheduledFor || '9').localeCompare(b.scheduledFor || '9'))[0];
    return route ? { body: route } : { status: 204 };
  });
  on('GET', '/management/routes/{id}', ({ user, params }) => {
    const route = findRoute(params[0]);
    routeAccess(user(), route);
    return { body: route };
  });
  on('POST', '/management/routes/{id}/start', ({ user, params }) => {
    const route = findRoute(params[0]);
    routeAccess(user(), route);
    if (route.status !== 'Planned') throw conflict('Somente rotas planejadas podem ser iniciadas.');
    if (db.routes.some((r) => r.truckId === route.truckId && r.status === 'InProgress'))
      throw conflict('Este caminhão já tem uma rota em andamento.');
    route.status = 'InProgress';
    route.startedAt = now();
    retryPending();
    return { body: route };
  });
  on('POST', '/management/routes/{id}/cancel', ({ user, params }) => {
    const me = user();
    requireManager(me);
    const route = findRoute(params[0]);
    if (route.status !== 'Planned' && route.status !== 'InProgress')
      throw conflict('Esta rota já foi encerrada.');
    route.status = 'Cancelled';
    route.finishedAt = now();
    releaseCollections(route);
    retryPending();
    return { body: route };
  });
  on('POST', `/management/routes/{id}/stops/{id}/complete`, ({ user, params }) => {
    const route = findRoute(params[0]);
    routeAccess(user(), route);
    const stop = route.stops.find((s) => s.id === params[1]);
    if (!stop) throw notFound('Parada não encontrada nesta rota.');
    if (route.status !== 'InProgress') throw conflict('Inicie a rota para registrar a coleta.');
    if (stop.status !== 'Pending') throw conflict('Esta parada já foi atendida.');
    stop.status = 'Completed';
    stop.completedAt = now();
    const collection = db.collections.find((c) => c.id === stop.collectionRequestId);
    if (collection && collection.status === 'Assigned') {
      collection.status = 'Collected';
      collection.collectedAt = now();
    }
    refreshRoute(route);
    if (!route.pendingStops) {
      route.status = 'Completed';
      route.finishedAt = now();
    }
    return { body: route };
  });

  // Routing · solicitações de coleta
  on('GET', '/routing/collection-requests/preview', ({ user, url }) => {
    user();
    const errors: Record<string, string[]> = {};
    const point = coordinate(errors, {
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
    });
    ensureValid(errors);
    return { body: preview(point) };
  });
  on('GET', '/routing/collection-requests/mine', ({ user }) => {
    const me = user();
    return { body: db.collections.filter((c) => c.requesterId === me.id) };
  });
  on('POST', '/routing/collection-requests', ({ user, body }) => {
    const me = user();
    const errors: Record<string, string[]> = {};
    const point = coordinate(errors, body);
    const address = optionalText(errors, 'address', body?.address, 200);
    const description = optionalText(errors, 'description', body?.description, 500);
    ensureValid(errors);
    const collection: Collection = {
      id: randomUUID(),
      requesterId: me.id,
      ...point,
      address,
      description,
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
    db.collections.unshift(collection);
    assign(collection);
    return {
      status: 201,
      body: collection,
      location: `/routing/collection-requests/${collection.id}`,
    };
  });
  on('GET', '/routing/collection-requests', ({ user, url }) => {
    requireManager(user());
    const status = enumQuery(url, 'status', COLLECTION_STATUS);
    const truckId = guidQuery(url, 'truckId');
    return {
      body: db.collections.filter(
        (c) => (!status || c.status === status) && (!truckId || c.truckId === truckId),
      ),
    };
  });
  const ownCollection = (me: Account, id: string) => {
    const c = findCollection(id);
    if (c.requesterId !== me.id && me.role !== 'Manager')
      throw forbidden('Esta solicitação pertence a outro usuário.');
    return c;
  };
  on('GET', '/routing/collection-requests/{id}', ({ user, params }) => ({
    body: ownCollection(user(), params[0]),
  }));
  on('POST', '/routing/collection-requests/{id}/cancel', ({ user, params }) => {
    const c = ownCollection(user(), params[0]);
    if (c.status !== 'Pending' && c.status !== 'Assigned')
      throw conflict('Esta coleta já foi encerrada.');
    if (c.routeId) {
      const route = findRoute(c.routeId);
      route.stops = route.stops.filter((s) => s.id !== c.routeStopId);
      refreshRoute(route);
    }
    c.status = 'Cancelled';
    c.cancelledAt = now();
    return { body: c };
  });
  on('POST', '/routing/collection-requests/{id}/retry', ({ user, params }) => {
    const c = ownCollection(user(), params[0]);
    if (c.status !== 'Pending')
      throw conflict('Somente solicitações pendentes podem ser reatribuídas.');
    return { body: assign(c) };
  });

  // Extras do mock (fora do contrato)
  on('GET', '', () => ({
    body: {
      name: 'ProjetoA3 - Coleta de Lixo (mock)',
      openapi: '/openapi/v1.json',
      seedPassword: SEED_PASSWORD,
      accounts: SEED_ACCOUNTS,
    },
  }));
  on('GET', '/openapi/v1.json', () => {
    return { body: openapiSpec };
  });

  // ---------- servidor ----------
  function send(res: ServerResponse, status: number, body?: unknown, contentType?: string) {
    res.statusCode = status;
    if (body === undefined) return res.end();
    res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  }
  function problem(res: ServerResponse, error: HttpError, instance: string) {
    send(
      res,
      error.status,
      {
        type: `https://tools.ietf.org/html/rfc9110#section-15.${error.status >= 500 ? 6 : 5}`,
        title: error.title,
        status: error.status,
        ...(error.detail ? { detail: error.detail } : {}),
        instance,
        ...(error.errors ? { errors: error.errors } : {}),
      },
      'application/problem+json; charset=utf-8',
    );
  }
  async function readBody(req: IncomingMessage) {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1_000_000) throw new HttpError(413, 'Corpo da requisição muito grande.');
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      throw badRequest({ body: ['O corpo da requisição não é um JSON válido.'] });
    }
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const started = Date.now();
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.setHeader('Access-Control-Max-Age', '600');
    const url = new URL(req.url || '/', 'http://mock.local');
    const pathname = url.pathname.replace(/\/+$/, '');
    try {
      if (req.method === 'OPTIONS') return send(res, 204);
      if (web && (req.method === 'GET' || req.method === 'HEAD') && !API_PATH.test(pathname)) {
        // App web: arquivo exportado ou, para rotas do app (/login, /citizen...), o index.html.
        let file = pathname || '/index.html';
        let content = web.read(file);
        if (!content && !path.extname(file)) content = web.read((file = '/index.html'));
        if (!content) throw notFound('Arquivo não encontrado.');
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', file.includes('/_expo/') ? 'max-age=31536000' : 'no-cache');
        return res.end(req.method === 'HEAD' ? undefined : content);
      }
      const matches = table.filter(([, pattern]) => pattern.test(pathname));
      const match = matches.find(([method]) => method === req.method);
      if (!match) {
        if (matches.length) {
          res.setHeader('Allow', matches.map(([m]) => m).join(', '));
          throw new HttpError(405, 'Método não permitido.');
        }
        throw notFound('Rota inexistente na API.');
      }
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method!) ? await readBody(req) : undefined;
      const params = (match[1].exec(pathname) || []).slice(1).map((p) => p.toLowerCase());
      let cached: Account | null = null;
      const result = match[2]({
        req,
        url,
        body,
        params,
        user: () => (cached ??= authenticate(req)),
      });
      if (result.location) res.setHeader('Location', result.location);
      send(res, result.status || 200, result.body === undefined ? undefined : clone(result.body));
    } catch (error) {
      if (error instanceof HttpError) problem(res, error, pathname);
      else {
        console.error(error);
        problem(res, new HttpError(500, 'Erro interno no mock.'), pathname);
      }
    } finally {
      if (log && req.method !== 'OPTIONS')
        console.log(
          `${req.method} ${url.pathname}${url.search} → ${res.statusCode} (${Date.now() - started} ms)`,
        );
    }
  }

  // Simulação: mantém online os caminhões em rota que não recebem GPS real e
  // reprocessa a fila de solicitações pendentes, como o back-end faz.
  function tick() {
    for (const route of db.routes.filter((r) => r.status === 'InProgress')) {
      const location = db.locations.find((l) => l.truckId === route.truckId);
      const next = route.stops.find((s) => s.status === 'Pending');
      if (!next) continue;
      if (location && !location.simulated && isOnline(location)) continue;
      const from: Coordinate = location || route.start || next;
      const distance = haversineKm(from, next);
      const step = distance > 0.05 ? Math.min(1, 0.08 / distance) : 0;
      const latitude = round(
        Number(from.latitude) + (Number(next.latitude) - Number(from.latitude)) * step,
        6,
      );
      const longitude = round(
        Number(from.longitude) + (Number(next.longitude) - Number(from.longitude)) * step,
        6,
      );
      const value: Location = {
        truckId: route.truckId,
        latitude,
        longitude,
        speedKmh: step ? 18 : 0,
        heading: location?.heading ?? 90,
        recordedAt: now(),
        receivedAt: now(),
        isOnline: true,
        simulated: true,
      };
      if (location) Object.assign(location, value);
      else db.locations.push(value);
    }
    retryPending();
  }

  return { handle, tick, simulate, db };
}

export interface RunningMock {
  server: Server;
  url: string;
  close: () => Promise<void>;
}
export async function startMockServer(
  port = 5073,
  host = '0.0.0.0',
  options: MockOptions = {},
): Promise<RunningMock> {
  const app = createMockApp(options);
  const server = createServer((req, res) => void app.handle(req, res));
  const timer = app.simulate ? setInterval(app.tick, 20_000) : null;
  timer?.unref();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    server,
    url: `http://localhost:${actualPort}`,
    close: () =>
      new Promise((resolve) => {
        if (timer) clearInterval(timer);
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
