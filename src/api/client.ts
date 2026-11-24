import { ApiError, problemMessage } from './errors';
import { demoRequest } from './demo';
import type { ImpactSummary } from './impact';
import type { RelatorioVeracidade } from '../simulador/motor';
import type { StatusSimulacao } from '../simulador/servico';
import type {
  Collection,
  CollectionInput,
  CollectionStatus,
  DispatchPreview,
  LocationInput,
  Login,
  RegisterInput,
  Role,
  Route,
  RouteInput,
  RouteStatus,
  RouteSummary,
  Truck,
  TruckInput,
  TruckLocation,
  User,
  UserInput,
} from './types';

// Servidor escolhido na hora, só na web: ?api=https://servidor usa o back nesse endereço,
// ?api=demo força o modo demonstração e ?api= (vazio) volta ao padrão do build.
// A escolha fica guardada neste navegador.
function escolhaNaWeb(): string | null {
  if (typeof window === 'undefined' || !window.location?.search) return lerEscolha();
  let valor: string | null = null;
  try {
    valor = new URLSearchParams(window.location.search).get('api');
  } catch {
    return lerEscolha();
  }
  if (valor === null) return lerEscolha();
  try {
    if (valor.trim() === '') window.localStorage?.removeItem('coleta.api');
    else window.localStorage?.setItem('coleta.api', valor.trim());
  } catch {}
  return valor.trim() || null;
}
function lerEscolha(): string | null {
  try {
    return typeof window !== 'undefined'
      ? (window.localStorage?.getItem('coleta.api') ?? null)
      : null;
  } catch {
    return null;
  }
}
const escolha = escolhaNaWeb();
// Padrão: chama o back de verdade. O modo demonstração só liga com EXPO_PUBLIC_DEMO_MODE=true
// (site de demonstração) ou com ?api=demo.
export const DEMO_MODE = escolha
  ? escolha === 'demo'
  : process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
// 'same-origin': o app é servido pelo próprio servidor da API (versão executável).
const configuredUrl =
  escolha && escolha !== 'demo'
    ? escolha
    : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5073';
export const API_URL = configuredUrl === 'same-origin' ? '' : configuredUrl.replace(/\/$/, '');
export const API_LABEL = API_URL || 'o mesmo endereço do app';
let session: Login | null = null;
let onExpired: (() => void) | null = null;
export function configureSession(value: Login | null, expired?: () => void) {
  session = value;
  if (expired) onExpired = expired;
}
const query = (params: Record<string, unknown>) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
};
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const publicRoute = path === '/account/login' || path === '/account/register';
  if (!publicRoute && session && Date.parse(session.expiresAt) <= Date.now()) {
    onExpired?.();
    throw new ApiError(401, 'Sua sessão terminou. Entre novamente.');
  }
  if (DEMO_MODE) return demoRequest<T>(method, path, body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(!publicRoute && session
          ? { Authorization: `${session.tokenType || 'Bearer'} ${session.accessToken}` }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return null as T;
    const content = await response.text();
    let payload: any = {};
    if (content) {
      try {
        payload = JSON.parse(content);
      } catch {
        if (response.ok)
          throw new ApiError(response.status, 'O servidor retornou uma resposta inválida.');
      }
    }
    if (!response.ok) {
      if (response.status === 401 && !publicRoute) onExpired?.();
      throw new ApiError(
        response.status,
        publicRoute && response.status === 401
          ? 'E-mail ou senha incorretos.'
          : problemMessage(response.status, payload),
        payload.errors || {},
      );
    }
    return payload as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (controller.signal.aborted)
      throw new ApiError(0, `O servidor (${API_LABEL}) demorou para responder. Tente novamente.`);
    throw new ApiError(
      0,
      `Não foi possível conectar ao servidor (${API_LABEL}). Confira se o back está ligado e se libera CORS para este endereço.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
export const api = {
  login: (email: string, password: string) =>
    request<Login>('POST', '/account/login', { email, password }),
  register: (data: RegisterInput) => request<User>('POST', '/account/register', data),
  me: () => request<User>('GET', '/account/me'),
  users: (role?: Role) => request<User[]>('GET', '/account/users' + query({ role })),
  user: (id: string) => request<User>('GET', `/account/users/${encodeURIComponent(id)}`),
  createUser: (data: UserInput) => request<User>('POST', '/account/users', data),
  setActive: (id: string, active: boolean) =>
    request<User>('PATCH', `/account/users/${encodeURIComponent(id)}/active` + query({ active })),
  trucks: () => request<Truck[]>('GET', '/management/trucks'),
  truck: (id: string) => request<Truck>('GET', `/management/trucks/${encodeURIComponent(id)}`),
  createTruck: (data: TruckInput) => request<Truck>('POST', '/management/trucks', data),
  assignDriver: (id: string, driverId: string | null) =>
    request<Truck>('PUT', `/management/trucks/${encodeURIComponent(id)}/driver`, { driverId }),
  locations: (management = false) =>
    request<TruckLocation[]>(
      'GET',
      management ? '/management/trucks/locations' : '/routing/trucks/locations',
    ),
  location: (id: string, management = false) =>
    request<TruckLocation>(
      'GET',
      `/${management ? 'management' : 'routing'}/trucks/${encodeURIComponent(id)}/location`,
    ),
  updateLocation: (id: string, data: LocationInput) =>
    request<TruckLocation>('POST', `/routing/trucks/${encodeURIComponent(id)}/location`, data),
  routes: (status?: RouteStatus, truckId?: string) =>
    request<RouteSummary[]>('GET', '/management/routes' + query({ status, truckId })),
  route: (id: string) => request<Route>('GET', `/management/routes/${encodeURIComponent(id)}`),
  currentRoute: () => request<Route | null>('GET', '/management/routes/current'),
  createRoute: (data: RouteInput) => request<Route>('POST', '/management/routes', data),
  startRoute: (id: string) =>
    request<Route>('POST', `/management/routes/${encodeURIComponent(id)}/start`),
  cancelRoute: (id: string) =>
    request<Route>('POST', `/management/routes/${encodeURIComponent(id)}/cancel`),
  completeStop: (id: string, stopId: string) =>
    request<Route>(
      'POST',
      `/management/routes/${encodeURIComponent(id)}/stops/${encodeURIComponent(stopId)}/complete`,
    ),
  collections: (status?: CollectionStatus, truckId?: string) =>
    request<Collection[]>('GET', '/routing/collection-requests' + query({ status, truckId })),
  mine: () => request<Collection[]>('GET', '/routing/collection-requests/mine'),
  collection: (id: string) =>
    request<Collection>('GET', `/routing/collection-requests/${encodeURIComponent(id)}`),
  createCollection: (data: CollectionInput) =>
    request<Collection>('POST', '/routing/collection-requests', data),
  cancelCollection: (id: string) =>
    request<Collection>('POST', `/routing/collection-requests/${encodeURIComponent(id)}/cancel`),
  retryCollection: (id: string) =>
    request<Collection>('POST', `/routing/collection-requests/${encodeURIComponent(id)}/retry`),
  impact: (days = 30, districtId: number | null = null, simulationId?: string) =>
    request<ImpactSummary>(
      'GET',
      '/management/impact' +
        query({
          days: String(days),
          districtId: districtId == null ? undefined : String(districtId),
          simulationId,
        }),
    ),
  simulate: (data: { regiao: string; mes: string; semente: number }) =>
    request<StatusSimulacao>('POST', '/simulations', data),
  activeSimulation: () => request<StatusSimulacao | null>('GET', '/simulations'),
  simulation: (id: string) =>
    request<StatusSimulacao>('GET', `/simulations/${encodeURIComponent(id)}`),
  simulationReport: (id: string) =>
    request<RelatorioVeracidade>('GET', `/simulations/${encodeURIComponent(id)}/report`),
  deleteSimulation: (id: string) =>
    request<null>('DELETE', `/simulations/${encodeURIComponent(id)}`),
  publicImpact: () => request<ImpactSummary>('GET', '/routing/impact'),
  preview: (latitude: number, longitude: number) =>
    request<DispatchPreview>(
      'GET',
      '/routing/collection-requests/preview' + query({ latitude, longitude }),
    ),
};
