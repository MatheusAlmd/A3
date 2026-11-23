// Fase 2 do simulador: região digital do Grajaú em outubro de 2026.
// Tudo sai de fontes.ts. Onde o dado bruto ainda não foi baixado (setores do IBGE, ruas do
// OpenStreetMap, horário por CEP, planilha de feiras, chuva diária do INMET), a região usa uma
// versão provisória com selo "estimado", que o coletor substitui sem mudar o motor.
import { dado, type Selo } from './fontes';

export const REGIAO = {
  id: 'grajau',
  nome: 'Grajaú',
  subprefeitura: 'Capela do Socorro',
  concessionaria: 'Ecourbis',
  mes: '2026-10',
  mesLabel: 'outubro de 2026',
  distritoId: 3, // id do Grajaú no schema impacto
};

export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type Turno = 'diurno' | 'noturno';
export interface Setor {
  id: number;
  nome: string;
  latitude: number;
  longitude: number;
  peso: number; // parte dos moradores do distrito
  grupo: 'A' | 'B'; // A: seg, qua, sex · B: ter, qui, sáb
  turno: Turno;
  populacao: number;
  domicilios: number;
  selo: Selo;
}

// Setores provisórios (selo estimado): posição aproximada e peso pela densidade conhecida
// (norte mais denso, perto da estação; sul em área de manancial). O coletor troca pelos
// setores censitários do IBGE.
const BASE: [string, number, number, number, 'A' | 'B', Turno][] = [
  ['Setor 01 · norte, Estação Grajaú', -23.74, -46.7, 0.11, 'A', 'noturno'],
  ['Setor 02 · norte', -23.742, -46.68, 0.1, 'B', 'noturno'],
  ['Setor 03 · nordeste', -23.75, -46.665, 0.08, 'A', 'diurno'],
  ['Setor 04 · centro-oeste', -23.756, -46.7, 0.1, 'B', 'noturno'],
  ['Setor 05 · centro, Av. Dona Belmira Marin', -23.76, -46.684, 0.11, 'A', 'noturno'],
  ['Setor 06 · centro-leste', -23.765, -46.668, 0.09, 'B', 'diurno'],
  ['Setor 07 · centro-sul oeste', -23.775, -46.698, 0.08, 'A', 'noturno'],
  ['Setor 08 · centro-sul', -23.778, -46.68, 0.09, 'B', 'noturno'],
  ['Setor 09 · sudeste, margem da Billings', -23.782, -46.662, 0.07, 'A', 'diurno'],
  ['Setor 10 · sul', -23.793, -46.692, 0.07, 'B', 'diurno'],
  ['Setor 11 · sul', -23.798, -46.672, 0.06, 'A', 'diurno'],
  ['Setor 12 · extremo sul, manancial', -23.808, -46.652, 0.04, 'B', 'diurno'],
];

const POP = dado('populacao');
const DOM = dado('domicilios_ocupados');

export const SETORES: Setor[] = BASE.map(([nome, latitude, longitude, peso, grupo, turno], i) => ({
  id: i + 1,
  nome,
  latitude,
  longitude,
  peso,
  grupo,
  turno,
  populacao: Math.round(POP * peso),
  domicilios: Math.round(DOM * peso),
  selo: 'estimado',
}));

// Av. Miguel Yunes, 746 (SP Regula). Coordenada aproximada, selo estimado.
export const TRANSBORDO = {
  nome: 'Transbordo Santo Amaro (Ecourbis)',
  endereco: 'Av. Miguel Yunes, 746, Santo Amaro',
  latitude: -23.666,
  longitude: -46.709,
};
// Garagem da Ecourbis não é publicada: o motor parte do transbordo (selo estimado).
export const GARAGEM = { ...TRANSBORDO, nome: 'Garagem (estimada junto ao transbordo)' };

export const TURNOS: Record<Turno, { inicio: number; fim: number }> = {
  diurno: { inicio: 7 * 60, fim: 15 * 60 + 20 },
  noturno: { inicio: 19 * 60, fim: 27 * 60 + 20 }, // termina 03h20 do dia seguinte
};

// Dias da coleta por grupo (0 = domingo).
export const DIAS_GRUPO: Record<'A' | 'B', number[]> = { A: [1, 3, 5], B: [2, 4, 6] };

export const DIAS = Array.from({ length: 31 }, (_, i) => {
  const data = `2026-10-${String(i + 1).padStart(2, '0')}`;
  const semana = new Date(`${data}T12:00:00Z`).getUTCDay();
  return {
    data,
    dia: i + 1,
    semana,
    feriado: i + 1 === 12, // Nossa Senhora Aparecida, segunda-feira
    eleicao: i + 1 === 4 || i + 1 === 25, // TRE-SP
  };
});

// Chuva diária. Oficial: 271,2 mm no mês e 19 dias acima de 1 mm (INMET, Interlagos), com
// temporal citado em 14/10. A distribuição entre os dias é estimada até o coletor ler o
// arquivo do INMET; o total e a contagem de dias batem com o oficial.
export const CHUVA: number[] = (() => {
  const r = rng(271);
  const total = dado('chuva_total');
  const nDias = dado('dias_chuva');
  const dias = new Set<number>([14]);
  while (dias.size < nDias) dias.add(1 + Math.floor(r() * 31));
  const pesos = new Map<number, number>();
  for (const d of dias) pesos.set(d, d === 14 ? 0 : -Math.log(1 - r()) + 0.15);
  const restoPeso = [...pesos.values()].reduce((a, b) => a + b, 0);
  const dia14 = 52; // maior chuva do mês fica no dia do temporal
  const mm = Array(31).fill(0) as number[];
  for (const [d, p] of pesos)
    mm[d - 1] = d === 14 ? dia14 : Math.max(1.2, ((total - dia14) * p) / restoPeso);
  for (let i = 0; i < 31; i++) if (!dias.has(i + 1)) mm[i] = r() < 0.4 ? 0.2 : 0;
  // ajuste fino para o total oficial exato
  const soma = mm.reduce((a, b) => a + b, 0);
  const maior = mm.indexOf(Math.max(...mm.filter((_, i) => i !== 13)));
  mm[maior] += total - soma;
  return mm.map((v) => Math.round(v * 10) / 10);
})();

export interface Feira {
  id: number;
  setorId: number;
  semana: number; // 2 a 6 e 0 (terça a domingo)
  inicio: number;
  fim: number;
}
// Feiras: quantidade derivada (proporcional à população), lugar e dia estimados.
export const FEIRAS: Feira[] = (() => {
  const r = rng(975);
  const total = dado('feiras_grajau');
  const dias = [2, 3, 4, 5, 6, 0];
  return Array.from({ length: total }, (_, i) => {
    let x = r();
    let setor = SETORES[0];
    for (const s of SETORES) {
      x -= s.peso;
      if (x <= 0) {
        setor = s;
        break;
      }
    }
    return {
      id: i + 1,
      setorId: setor.id,
      semana: dias[i % dias.length],
      inicio: 8 * 60,
      fim: 14 * 60,
    };
  });
})();

export const coletaHoje = (setor: Setor, semana: number) =>
  DIAS_GRUPO[setor.grupo].includes(semana);

// Próxima passagem da coleta no setor depois do dia (índice 0-30) e do minuto informado.
export function proximaPassagem(setor: Setor, diaIndice: number, minutoDoDia: number) {
  for (let k = 0; k < 8; k++) {
    const idx = diaIndice + k;
    const semana = (DIAS[0].semana + idx) % 7;
    const inicio = TURNOS[setor.turno].inicio;
    if (coletaHoje(setor, semana) && (k > 0 || minutoDoDia < inicio))
      return idx * 1440 + inicio + 120;
  }
  return (diaIndice + 2) * 1440;
}

const R_TERRA = 6371;
export function distanciaKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRA * Math.asin(Math.sqrt(h)) * dado('fator_ruas');
}
