// Mirrors docs/openapi.json. Numeric fields may arrive as JSON numbers or strings.
export type Numeric = number | string;
export type Role = 'Citizen' | 'Driver' | 'Manager';
export type CollectionStatus = 'Pending' | 'Assigned' | 'Collected' | 'Cancelled';
export type RouteStatus = 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
export interface Coordinate {
  latitude: Numeric;
  longitude: Numeric;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}
export interface Login {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: User;
}
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}
export interface UserInput extends RegisterInput {
  role: Role;
}
export interface TruckInput {
  plate: string;
  description: string | null;
  capacityKg: Numeric | null;
  driverId: string | null;
}
export interface Truck extends TruckInput {
  id: string;
  active: boolean;
  createdAt: string;
}
export interface TruckLocation extends Coordinate {
  truckId: string;
  speedKmh: Numeric | null;
  heading: Numeric | null;
  recordedAt: string;
  receivedAt: string;
  isOnline: boolean;
}
export interface LocationInput extends Coordinate {
  speedKmh: Numeric | null;
  heading: Numeric | null;
  recordedAt: string | null;
}
export interface CollectionInput extends Coordinate {
  address: string | null;
  description: string | null;
}
export interface Collection extends CollectionInput {
  id: string;
  requesterId: string;
  status: CollectionStatus;
  truckId: string | null;
  routeId: string | null;
  routeStopId: string | null;
  detourKm: Numeric | null;
  distanceFromTruckKm: Numeric | null;
  assignmentAttempts: Numeric;
  createdAt: string;
  assignedAt: string | null;
  collectedAt: string | null;
  cancelledAt: string | null;
}
export interface DispatchPreview {
  hasCandidate: boolean;
  truckId: string | null;
  routeId: string | null;
  insertBeforeStopId: string | null;
  detourKm: Numeric | null;
  distanceFromTruckKm: Numeric | null;
  score: Numeric | null;
}
export interface StopInput extends Coordinate {
  address: string | null;
}
export interface Stop extends StopInput {
  id: string;
  sequence: Numeric;
  status: 'Pending' | 'Completed' | 'Skipped';
  origin: 'Planned' | 'CollectionRequest';
  collectionRequestId: string | null;
  completedAt: string | null;
}
export interface RouteInput {
  name: string;
  truckId: string;
  scheduledFor: string | null;
  start: Coordinate | null;
  stops: StopInput[];
  optimize?: boolean;
}
export interface RouteSummary {
  id: string;
  name: string;
  truckId: string;
  status: RouteStatus;
  scheduledFor: string | null;
  totalStops: Numeric;
  pendingStops: Numeric;
}
export interface Route extends Omit<RouteSummary, 'totalStops'> {
  start: Coordinate | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  estimatedDistanceKm: Numeric;
  stops: Stop[];
}
export interface Problem {
  title?: string | null;
  detail?: string | null;
  status?: Numeric | null;
  errors?: Record<string, string[]>;
}
