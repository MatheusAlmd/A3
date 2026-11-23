// Impacto da coleta sob demanda na Subprefeitura Capela do Socorro.
// Um único gerador determinístico alimenta o modo demonstração, o mock da API e o script SQL
// (docs/banco-impacto/02-dados.sql), para que app e banco mostrem os mesmos números.
// Os parâmetros oficiais têm fonte; os operacionais são estimativas do grupo e estão marcados.

export interface ImpactParameter {
  key: string;
  label: string;
  value: number;
  unit: string;
  source: string;
  official: boolean;
}
export interface District {
  id: number;
  name: string;
  center: { latitude: number; longitude: number };
  trucks: number;
}
export interface Hotspot {
  id: number;
  districtId: number;
  label: string;
  latitude: number;
  longitude: number;
  weight: number;
}
export interface RouteRun {
  id: number;
  baseRouteId: number;
  districtId: number;
  date: string; // AAAA-MM-DD
  baselineKm: number;
  actualKm: number;
  minutes: number;
  stops: number;
  kg: number;
}
export interface DemandRequest {
  id: number;
  districtId: number;
  hotspotId: number | null;
  latitude: number;
  longitude: number;
  status: 'Collected' | 'Cancelled';
  createdAt: string;
  assignedAt: string | null;
  collectedAt: string | null;
}
export interface BaseRoute {
  id: number;
  districtId: number;
  plate: string;
  baselineKm: number;
}

export const SUBPREFECTURE = {
  name: 'Capela do Socorro',
  concessionaire: 'Ecourbis',
  population: 605383,
  households: 212747,
  censusYear: 2022,
  source: 'IBGE, Censo 2022 (Coletânea de indicadores das subprefeituras, Prefeitura de SP)',
};

export const CITY = {
  trucks: 842,
  tonsPerDay: 12000,
  domesticTons2025: 3549352,
  sourceFleet: 'SP Regula, coleta domiciliar',
  sourceTons: 'Prefeitura de SP, coleta de lixo segundo origem 2025',
};

export const PARAMETERS: ImpactParameter[] = [
  {
    key: 'km_por_litro',
    label: 'Consumo do caminhão compactador',
    value: 1.1,
    unit: 'km/L',
    source: 'Medição em caminhões compactadores (UnB, 2018: 0,98 a 1,26 km/L)',
    official: false,
  },
  {
    key: 'kg_co2_por_litro',
    label: 'Emissão do diesel',
    value: 2.603,
    unit: 'kg CO₂/L',
    source: 'Inventário Nacional de emissões, citado em UnB (2018)',
    official: true,
  },
  {
    key: 'preco_diesel',
    label: 'Preço do diesel S10',
    value: 7.25,
    unit: 'R$/L',
    source: 'ANP, capital paulista, semana 01 a 07/11/2026',
    official: true,
  },
  {
    key: 'caminhoes_subprefeitura',
    label: 'Caminhões na subprefeitura',
    value: 45,
    unit: 'caminhões',
    source: '842 caminhões da cidade × 5,29% da população paulistana',
    official: false,
  },
  {
    key: 'km_rota_fixa',
    label: 'Km médio da rota fixa por turno',
    value: 65,
    unit: 'km',
    source: 'Valor do grupo, inclui ida e volta ao transbordo Santo Amaro',
    official: false,
  },
  {
    key: 'reducao_cenario',
    label: 'Redução de km no cenário simulado',
    value: 12,
    unit: '%',
    source: 'Hipótese para a simulação; validar com dados da concessionária',
    official: false,
  },
];
const param = (key: string) => PARAMETERS.find((p) => p.key === key)!.value;

export const DISTRICTS: District[] = [
  { id: 1, name: 'Socorro', center: { latitude: -23.6705, longitude: -46.7045 }, trucks: 9 },
  { id: 2, name: 'Cidade Dutra', center: { latitude: -23.7135, longitude: -46.6985 }, trucks: 14 },
  { id: 3, name: 'Grajaú', center: { latitude: -23.7745, longitude: -46.6795 }, trucks: 22 },
];

export const HOTSPOTS: Hotspot[] = [
  {
    id: 1,
    districtId: 1,
    label: 'Av. Atlântica, próximo à Ponte do Socorro',
    latitude: -23.6648,
    longitude: -46.7092,
    weight: 5,
  },
  {
    id: 2,
    districtId: 1,
    label: 'Largo do Socorro',
    latitude: -23.6731,
    longitude: -46.7037,
    weight: 4,
  },
  {
    id: 3,
    districtId: 1,
    label: 'Rua Dr. Abelardo Vergueiro César',
    latitude: -23.6789,
    longitude: -46.7001,
    weight: 2,
  },
  {
    id: 4,
    districtId: 2,
    label: 'Av. Senador Teotônio Vilela, altura do Autódromo',
    latitude: -23.7062,
    longitude: -46.6973,
    weight: 6,
  },
  {
    id: 5,
    districtId: 2,
    label: 'Estação Primavera-Interlagos',
    latitude: -23.7149,
    longitude: -46.7004,
    weight: 3,
  },
  {
    id: 6,
    districtId: 2,
    label: 'Av. Interlagos, trecho comercial',
    latitude: -23.7011,
    longitude: -46.6918,
    weight: 3,
  },
  {
    id: 7,
    districtId: 2,
    label: 'Rua Ministro Américo Marco Antônio',
    latitude: -23.7232,
    longitude: -46.7056,
    weight: 2,
  },
  {
    id: 8,
    districtId: 3,
    label: 'Estação Grajaú',
    latitude: -23.7357,
    longitude: -46.6967,
    weight: 7,
  },
  {
    id: 9,
    districtId: 3,
    label: 'Av. Dona Belmira Marin',
    latitude: -23.7661,
    longitude: -46.6849,
    weight: 6,
  },
  {
    id: 10,
    districtId: 3,
    label: 'Feira livre do Parque Residencial Cocaia',
    latitude: -23.7553,
    longitude: -46.6812,
    weight: 4,
  },
  {
    id: 11,
    districtId: 3,
    label: 'Rua Gaspar Leme',
    latitude: -23.7798,
    longitude: -46.6744,
    weight: 3,
  },
  {
    id: 12,
    districtId: 3,
    label: 'Av. Antônio Carlos Benjamin dos Santos',
    latitude: -23.7901,
    longitude: -46.6703,
    weight: 3,
  },
];

export const DATASET_DAYS = 90;
// Fim fixo do conjunto simulado, para que app, mock e banco tenham as mesmas datas.
export const DATASET_END = '2026-11-21';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const dayString = (base: Date, offset: number) =>
  new Date(base.getTime() + offset * 86400000).toISOString().slice(0, 10);

let cached: { baseRoutes: BaseRoute[]; runs: RouteRun[]; requests: DemandRequest[] } | null = null;

export function impactDataset() {
  if (cached) return cached;
  const r = rng(20261121);
  const end = new Date(`${DATASET_END}T00:00:00Z`);
  const start = new Date(end.getTime() - (DATASET_DAYS - 1) * 86400000);
  const reduction = param('reducao_cenario') / 100;
  const baseKm = param('km_rota_fixa');

  const baseRoutes: BaseRoute[] = [];
  let routeId = 1;
  for (const d of DISTRICTS)
    for (let i = 0; i < d.trucks; i++) {
      const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
      const plate = `${letters[Math.floor(r() * 23)]}${letters[Math.floor(r() * 23)]}${letters[Math.floor(r() * 23)]}${Math.floor(r() * 10)}${letters[Math.floor(r() * 23)]}${String(Math.floor(r() * 100)).padStart(2, '0')}`;
      // Grajaú é mais extenso e mais distante do transbordo: rotas um pouco mais longas.
      const factor = d.id === 3 ? 1.12 : d.id === 2 ? 1.0 : 0.88;
      baseRoutes.push({
        id: routeId++,
        districtId: d.id,
        plate,
        baselineKm: round(baseKm * factor * (0.85 + r() * 0.3)),
      });
    }

  const runs: RouteRun[] = [];
  const requests: DemandRequest[] = [];
  let runId = 1;
  let reqId = 1;
  for (let day = 0; day < DATASET_DAYS; day++) {
    const date = dayString(start, day);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 0) continue; // coleta domiciliar de segunda a sábado
    // Adoção cresce ao longo do período: o app começa com poucos pedidos e ganha escala.
    const adoption = 0.55 + 0.45 * (day / (DATASET_DAYS - 1));
    for (const b of baseRoutes) {
      const cut = Math.min(0.24, Math.max(0.02, reduction * adoption * (0.7 + r() * 0.6)));
      const actual = round(b.baselineKm * (1 - cut));
      runs.push({
        id: runId++,
        baseRouteId: b.id,
        districtId: b.districtId,
        date,
        baselineKm: b.baselineKm,
        actualKm: actual,
        minutes: Math.round(actual * (4.6 + r() * 1.2)),
        stops: Math.round(120 + r() * 90),
        kg: Math.round(9000 + r() * 4500),
      });
    }
    const dailyRequests = Math.round((24 + r() * 16) * adoption * (weekday === 1 ? 1.35 : 1));
    for (let i = 0; i < dailyRequests; i++) {
      const pick = r() * HOTSPOTS.reduce((s, h) => s + h.weight, 0) * 1.6;
      let acc = 0;
      let hotspot: Hotspot | null = null;
      for (const h of HOTSPOTS) {
        acc += h.weight;
        if (pick <= acc) {
          hotspot = h;
          break;
        }
      }
      const district = hotspot
        ? DISTRICTS.find((d) => d.id === hotspot!.districtId)!
        : DISTRICTS[r() < 0.2 ? 0 : r() < 0.45 ? 1 : 2];
      const center = hotspot ?? district.center;
      const lat = round(center.latitude + (r() - 0.5) * (hotspot ? 0.003 : 0.02), 5);
      const lon = round(center.longitude + (r() - 0.5) * (hotspot ? 0.003 : 0.02), 5);
      const created = new Date(`${date}T00:00:00Z`).getTime() + (6 + r() * 12) * 3600000;
      const cancelled = r() < 0.06;
      const assignMin = 3 + r() * 40;
      const collectMin = assignMin + 50 + r() * 260;
      requests.push({
        id: reqId++,
        districtId: district.id,
        hotspotId: hotspot?.id ?? null,
        latitude: lat,
        longitude: lon,
        status: cancelled ? 'Cancelled' : 'Collected',
        createdAt: new Date(created).toISOString(),
        assignedAt: cancelled ? null : new Date(created + assignMin * 60000).toISOString(),
        collectedAt: cancelled ? null : new Date(created + collectMin * 60000).toISOString(),
      });
    }
  }
  cached = { baseRoutes, runs, requests };
  return cached;
}

export interface ImpactSummary {
  isSimulation: boolean;
  subprefecture: typeof SUBPREFECTURE;
  city: typeof CITY;
  period: { from: string; to: string; days: number };
  districtId: number | null;
  parameters: ImpactParameter[];
  totals: {
    routes: number;
    requests: number;
    collected: number;
    baselineKm: number;
    actualKm: number;
    avoidedKm: number;
    avoidedLiters: number;
    avoidedCo2Kg: number;
    savedBrl: number;
    reductionPct: number;
    avgServiceMinutes: number;
  };
  weekly: { weekStart: string; baselineKm: number; actualKm: number; avoidedCo2Kg: number }[];
  districts: {
    id: number;
    name: string;
    routes: number;
    avoidedKm: number;
    avoidedCo2Kg: number;
    savedBrl: number;
    avgServiceMinutes: number;
  }[];
  hotspots: (Hotspot & { district: string; requests: number })[];
  projection: { avoidedKm: number; avoidedLiters: number; avoidedCo2Kg: number; savedBrl: number };
}

export const impactFromKm = (km: number) => {
  const liters = km / param('km_por_litro');
  return {
    liters,
    co2: liters * param('kg_co2_por_litro'),
    brl: liters * param('preco_diesel'),
  };
};

export function impactSummary(days = 30, districtId: number | null = null): ImpactSummary {
  const span = Math.max(1, Math.min(DATASET_DAYS, Math.round(days)));
  const data = impactDataset();
  const end = new Date(`${DATASET_END}T00:00:00Z`);
  const from = new Date(end.getTime() - (span - 1) * 86400000).toISOString().slice(0, 10);
  const inPeriod = (date: string) => date >= from && date <= DATASET_END;
  const runs = data.runs.filter(
    (x) => inPeriod(x.date) && (districtId == null || x.districtId === districtId),
  );
  const reqs = data.requests.filter(
    (x) =>
      inPeriod(x.createdAt.slice(0, 10)) && (districtId == null || x.districtId === districtId),
  );
  const served = (list: DemandRequest[]) => list.filter((x) => x.collectedAt);
  const avgMinutes = (list: DemandRequest[]) => {
    const s = served(list);
    return s.length
      ? Math.round(
          s.reduce(
            (acc, x) => acc + (Date.parse(x.collectedAt!) - Date.parse(x.createdAt)) / 60000,
            0,
          ) / s.length,
        )
      : 0;
  };
  const sum = (list: RouteRun[]) => {
    const baseline = list.reduce((a, x) => a + x.baselineKm, 0);
    const actual = list.reduce((a, x) => a + x.actualKm, 0);
    const avoided = baseline - actual;
    const fx = impactFromKm(avoided);
    return { baseline, actual, avoided, ...fx };
  };
  const t = sum(runs);

  const weeks = new Map<string, RouteRun[]>();
  for (const x of runs) {
    const d = new Date(`${x.date}T12:00:00Z`);
    const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, [...(weeks.get(key) || []), x]);
  }
  const weekly = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, list]) => {
      const w = sum(list);
      return {
        weekStart,
        baselineKm: round(w.baseline),
        actualKm: round(w.actual),
        avoidedCo2Kg: round(w.co2),
      };
    });

  const districts = DISTRICTS.filter((d) => districtId == null || d.id === districtId).map((d) => {
    const dr = runs.filter((x) => x.districtId === d.id);
    const s = sum(dr);
    return {
      id: d.id,
      name: d.name,
      routes: dr.length,
      avoidedKm: round(s.avoided),
      avoidedCo2Kg: round(s.co2),
      savedBrl: round(s.brl, 2),
      avgServiceMinutes: avgMinutes(reqs.filter((x) => x.districtId === d.id)),
    };
  });

  const hotspots = HOTSPOTS.filter((h) => districtId == null || h.districtId === districtId)
    .map((h) => ({
      ...h,
      district: DISTRICTS.find((d) => d.id === h.districtId)!.name,
      requests: reqs.filter((x) => x.hotspotId === h.id).length,
    }))
    .sort((a, b) => b.requests - a.requests);

  // Projeção anual: média diária do período × 313 dias de coleta (segunda a sábado).
  const workdays = new Set(runs.map((x) => x.date)).size || 1;
  const perDay = t.avoided / workdays;
  const year = impactFromKm(perDay * 313);

  return {
    isSimulation: true,
    subprefecture: SUBPREFECTURE,
    city: CITY,
    period: { from, to: DATASET_END, days: span },
    districtId,
    parameters: PARAMETERS,
    totals: {
      routes: runs.length,
      requests: reqs.length,
      collected: served(reqs).length,
      baselineKm: round(t.baseline),
      actualKm: round(t.actual),
      avoidedKm: round(t.avoided),
      avoidedLiters: round(t.liters),
      avoidedCo2Kg: round(t.co2),
      savedBrl: round(t.brl, 2),
      reductionPct: t.baseline ? round((t.avoided / t.baseline) * 100) : 0,
      avgServiceMinutes: avgMinutes(reqs),
    },
    weekly,
    districts,
    hotspots,
    projection: {
      avoidedKm: Math.round(perDay * 313),
      avoidedLiters: Math.round(year.liters),
      avoidedCo2Kg: Math.round(year.co2),
      savedBrl: Math.round(year.brl),
    },
  };
}
