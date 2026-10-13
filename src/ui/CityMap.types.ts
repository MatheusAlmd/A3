import type { Coordinate, Stop, TruckLocation } from '../api/types';
export interface CityMapProps {
  height?: number;
  point?: Coordinate | null;
  locations?: TruckLocation[];
  stops?: Stop[];
  onPoint?: (point: { latitude: number; longitude: number }) => void;
  onTruck?: (truckId: string) => void;
  interactive?: boolean;
}
