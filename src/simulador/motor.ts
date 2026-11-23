// Fase 3 do simulador: motor de eventos discretos.
// Percorre os 31 dias de outubro de 2026 no Grajaú, evento por evento, com semente fixa:
// a mesma semente gera sempre o mesmo mês. Os problemas nascem primeiro; só uma parte
// vira pedido no app. Cada pedido vai para o caminhão em serviço de menor desvio,
// a mesma regra do CollectionDispatcher do back.
import { impactDataset, impactFromKm, PARAMETERS, type ImpactSummary } from '../api/impact';
import { DADOS, DIVERGENCIAS, FONTES, dado, portaoA, type Divergencia, type Selo } from './fontes';
import {
  CHUVA,
  DIAS,
  DIAS_GRUPO,
  FEIRAS,
  GARAGEM,
  REGIAO,
  SETORES,
  TRANSBORDO,
  TURNOS,
  coletaHoje,
  distanciaKm,
  proximaPassagem,
  rng,
  type Setor,
  type Turno,
} from './regiao';

export type TipoPedido = 'descarte_irregular' | 'coleta_nao_passou' | 'volume_extra';
export const TIPO_LABEL: Record<TipoPedido, string> = {
  descarte_irregular: 'Descarte irregular',
  coleta_nao_passou: 'Coleta não passou',
  volume_extra: 'Volume extra',
};

export interface PedidoSim {
  id: number;
  tipo: TipoPedido;
  setorId: number;
  latitude: number;
  longitude: number;
  criadoEm: string;
  atribuidoEm: string | null;
  coletadoEm: string | null;
  status: 'Collected' | 'Cancelled';
  placa: string | null;
  desvioKm: number;
  kg: number;
  semAppKm: number;
  semAppHoras: number;
}
export interface TurnoSim {
  id: number;
  rotaReferenciaId: number;
  placa: string;
  data: string;
  turno: Turno;
  setorId: number;
  kmRota: number;
  kmDesvio: number;
  kmSemApp: number;
  kmComApp: number;
  viagens: number;
  kg: number;
  minutos: number;
  paradas: number;
  pedidos: number;
}
export interface EventoSim {
  instante: string;
  tipo: string;
  detalhe: Record<string, string | number>;
}
export interface Calibracao {
  alvo: string;
  simulado: string;
  referencia: string;
  faixa: string;
  ok: boolean;
}
export interface RelatorioVeracidade {
  portaoA: { ok: boolean; problemas: string[] };
  portaoB: boolean;
  selos: Record<Selo, number>;
  itensEstimadosDaRegiao: string[];
  divergencias: Divergencia[];
  calibracao: Calibracao[];
  fontes: typeof FONTES;
  dados: typeof DADOS;
}
export interface Simulacao {
  id: string;
  regiao: typeof REGIAO;
  cenario: 'unico';
  semente: number;
  versaoMotor: string;
  criadaEm: string;
  resumo: ImpactSummary;
  demanda: {
    problemas: number;
    problemasPorTipo: Record<TipoPedido, number>;
    pedidos: number;
    pedidosPorTipo: Record<TipoPedido, number>;
    cancelados: number;
    adocaoFinal: number;
    domiciliosComApp: number;
    horasComApp: Record<TipoPedido, number>;
    horasSemApp: Record<TipoPedido, number>;
    kgPorPedidos: number;
    janelaHoras: number;
    semJanela: { kmEvitados: number; horasDescarte: number } | null;
  };
  operacao: {
    turnos: number;
    kmMedioTurno: number;
    toneladasRota: number;
    toneladasGeradas: number;
    viagensTransbordo: number;
    setoresSemColeta: number;
  };
  dias: {
    data: string;
    chuvaMm: number;
    pedidos: number;
    problemas: number;
    domiciliosComApp: number;
  }[];
  pedidos: PedidoSim[];
  turnos: TurnoSim[];
  eventos: EventoSim[];
  relatorio: RelatorioVeracidade;
}

export const VERSAO_MOTOR = '1.0.0';
export const SEMENTE_PADRAO = 20261031;
const INICIO_UTC = Date.UTC(2026, 9, 1, 3, 0); // 01/10/2026 00h00 em São Paulo (UTC-3)
const iso = (min: number) => new Date(INICIO_UTC + Math.round(min) * 60000).toISOString();
const r1 = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const br = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d });

function poisson(r: () => number, lambda: number) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(r)));
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > l);
  return k - 1;
}
function normal(r: () => number) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}
const exp = (r: () => number, media: number) => -Math.log(1 - r()) * media;

function sorteiaSetor(r: () => number, bonus: (s: Setor) => number = () => 1) {
  const pesos = SETORES.map((s) => s.peso * bonus(s));
  let x = r() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SETORES.length; i++) {
    x -= pesos[i];
    if (x <= 0) return SETORES[i];
  }
  return SETORES[SETORES.length - 1];
}

// Reparte n caminhões entre setores pelo peso (maior resto), pelo menos 1 por setor.
function reparte(setores: Setor[], n: number) {
  const soma = setores.reduce((a, s) => a + s.peso, 0);
  const cotas = setores.map((s) => (n * s.peso) / soma);
  const base = cotas.map((c) => Math.max(1, Math.floor(c)));
  let falta = n - base.reduce((a, b) => a + b, 0);
  const ordem = cotas.map((c, i) => [c - Math.floor(c), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; falta > 0; k = (k + 1) % ordem.length, falta--) base[ordem[k][1]]++;
  return setores.flatMap((s, i) => Array(base[i]).fill(s) as Setor[]);
}

export function simular(
  semente = SEMENTE_PADRAO,
  opcoes: { janelaHoras?: number; comparar?: boolean } = {},
): Simulacao {
  const janelaMin = (opcoes.janelaHoras ?? dado('janela_agrupamento')) * 60;
  const r = rng(semente);
  const eventos: EventoSim[] = [];
  const ev = (min: number, tipo: string, detalhe: Record<string, string | number>) =>
    eventos.push({ instante: iso(min), tipo, detalhe });

  const lixoPessoa = dado('lixo_por_pessoa');
  const carga = dado('carga_maxima') * 1000;
  const a0 = dado('adocao_inicial');
  const a1 = dado('adocao_final');
  const atencao = dado('atencao');
  const vizinhos = dado('vizinhos_que_veem');
  const taxaSac = dado('taxa_chamado_sac');
  const domicilios = dado('domicilios_ocupados');
  const descartesMes = (dado('chamados_descarte_capela') * dado('parte_grajau')) / taxaSac;

  // Frota: as 22 rotas de referência do Grajaú no schema impacto (mesmas placas).
  const rotas = impactDataset().baseRoutes.filter((b) => b.districtId === REGIAO.distritoId);
  const nNoturno = Math.round(rotas.length * 0.59); // turno da noite cobre os setores mais densos
  const turnoDe = (i: number): Turno => (i < nNoturno ? 'noturno' : 'diurno');
  const listas: Record<string, Setor[]> = {};
  for (const t of ['noturno', 'diurno'] as Turno[])
    for (const g of ['A', 'B'] as const)
      listas[t + g] = reparte(
        SETORES.filter((s) => s.turno === t && s.grupo === g),
        t === 'noturno' ? nNoturno : rotas.length - nNoturno,
      );
  const frota = rotas.map((b, i) => {
    const t = turnoDe(i);
    const k = t === 'noturno' ? i : i - nNoturno;
    return { rota: b, turno: t, setorA: listas[t + 'A'][k], setorB: listas[t + 'B'][k] };
  });

  // ---- Turnos de coleta (rota fixa) ----
  interface Execucao extends TurnoSim {
    inicio: number;
    fim: number;
    livreEm: number;
    janelasTransbordo: [number, number][];
    setor: Setor;
    velocidade: number;
  }
  const execucoes: Execucao[] = [];
  const backlog = new Map<number, number>(); // kg que ficou sem coleta por setor
  const falhas: { setor: Setor; dia: number; minuto: number; kg: number; domicilios: number }[] =
    [];
  let setoresSemColeta = 0;
  let id = 1;
  for (const d of DIAS) {
    const idx = d.dia - 1;
    const chuvaForte = CHUVA[idx] >= 20;
    for (const s of SETORES) {
      if (!coletaHoje(s, d.semana)) continue;
      const dias = DIAS_GRUPO[s.grupo];
      const pos = dias.indexOf(d.semana);
      const anterior = dias[(pos + dias.length - 1) % dias.length];
      const intervalo = (d.semana - anterior + 7) % 7 || 7;
      let kgSetor = s.populacao * lixoPessoa * intervalo + (backlog.get(s.id) ?? 0);
      backlog.set(s.id, 0);
      const pFalha = dado('falha_coleta') + (chuvaForte ? dado('falha_coleta_chuva') : 0);
      if (r() < pFalha) {
        const kgFalha = kgSetor * 0.15; // um trecho do setor fica sem coleta
        kgSetor -= kgFalha;
        setoresSemColeta++;
        backlog.set(s.id, kgFalha); // sem o app, a próxima passagem leva esse lixo
        falhas.push({
          setor: s,
          dia: idx,
          minuto: TURNOS[s.turno].inicio + 180,
          kg: kgFalha,
          domicilios: Math.round(s.domicilios * 0.15),
        });
      }
      const equipe = frota.filter(
        (f) => (DIAS_GRUPO.A.includes(d.semana) ? f.setorA : f.setorB).id === s.id,
      );
      for (const f of equipe) {
        const kg = kgSetor / equipe.length;
        const viagens = Math.max(1, Math.ceil(kg / carga));
        const dist = distanciaKm(TRANSBORDO, s);
        const kmRota = r1(28 + r() * 8 + 2 * viagens * dist);
        const vel = chuvaForte ? dado('velocidade_chuva') : dado('velocidade');
        const paradas = Math.round(kg / 60);
        const minutos = Math.round((kmRota / vel) * 60 + paradas * 0.6);
        const inicio = idx * 1440 + TURNOS[f.turno].inicio;
        const fim = Math.max(idx * 1440 + TURNOS[f.turno].fim, inicio + minutos);
        const janelas: [number, number][] = [];
        for (let v = 1; v < viagens; v++) {
          const meio = inicio + ((fim - inicio) * v) / viagens;
          janelas.push([meio - 30, meio + 30]);
        }
        execucoes.push({
          id: id++,
          rotaReferenciaId: f.rota.id,
          placa: f.rota.plate,
          data: d.data,
          turno: f.turno,
          setorId: s.id,
          kmRota,
          kmDesvio: 0,
          kmSemApp: kmRota,
          kmComApp: kmRota,
          viagens,
          kg: Math.round(kg),
          minutos,
          paradas,
          pedidos: 0,
          inicio,
          fim,
          livreEm: inicio,
          janelasTransbordo: janelas,
          setor: s,
          velocidade: vel,
        });
        ev(inicio, 'turno_inicio', { placa: f.rota.plate, setor: s.id });
        ev(fim, 'turno_fim', { placa: f.rota.plate, km: kmRota, viagens });
      }
    }
  }

  const posicao = (e: Execucao, t: number) => {
    if (e.janelasTransbordo.some(([a, b]) => t >= a && t <= b)) return null; // no transbordo
    const ang = ((t - e.inicio) / 45) * Math.PI;
    return {
      latitude: e.setor.latitude + Math.sin(ang) * 0.005,
      longitude: e.setor.longitude + Math.cos(ang) * 0.005,
    };
  };

  // ---- Problemas do mês (nascem antes de virar pedido) ----
  interface Problema {
    tipo: TipoPedido;
    setor: Setor;
    minuto: number;
    latitude: number;
    longitude: number;
    kg: number;
    reportado: boolean;
    reporteEm: number;
    dia: number;
  }
  const problemas: Problema[] = [];
  const dias: Simulacao['dias'] = [];
  const fatorSemana = [0.7, 1.25, 1.0, 1.0, 1.0, 1.0, 1.05];
  const somaSemana = DIAS.reduce((a, d) => a + fatorSemana[d.semana], 0);
  for (const d of DIAS) {
    const idx = d.dia - 1;
    const adocao = a0 + (a1 - a0) * Math.pow(idx / 30, 0.8);
    const comApp = Math.round(domicilios * adocao);
    const chuvaOntem = idx > 0 ? CHUVA[idx - 1] : 0;
    const fChuva = 1 + Math.min(0.6, chuvaOntem / 40);
    const lambda = ((descartesMes * fatorSemana[d.semana]) / somaSemana) * fChuva;
    const feirasHoje = new Set(FEIRAS.filter((f) => f.semana === d.semana).map((f) => f.setorId));
    const pDescarte = 1 - Math.pow(1 - adocao * atencao, vizinhos);
    const antes = problemas.length;
    for (let k = poisson(r, lambda); k > 0; k--) {
      const s = sorteiaSetor(r, (x) => (feirasHoje.has(x.id) ? 1.5 : 1));
      const minuto = idx * 1440 + 360 + r() * 960;
      const reportado = r() < pDescarte;
      problemas.push({
        tipo: 'descarte_irregular',
        setor: s,
        minuto,
        latitude: s.latitude + (r() - 0.5) * 0.016,
        longitude: s.longitude + (r() - 0.5) * 0.016,
        kg: Math.round(60 + r() * 340),
        reportado,
        reporteEm: minuto + exp(r, 120),
        dia: idx,
      });
    }
    for (let k = poisson(r, comApp * dado('volume_extra')); k > 0; k--) {
      const s = sorteiaSetor(r);
      const minuto = idx * 1440 + 420 + r() * 780;
      problemas.push({
        tipo: 'volume_extra',
        setor: s,
        minuto,
        latitude: s.latitude + (r() - 0.5) * 0.016,
        longitude: s.longitude + (r() - 0.5) * 0.016,
        kg: Math.round(40 + r() * 110),
        reportado: true,
        reporteEm: minuto,
        dia: idx,
      });
    }
    for (const f of falhas.filter((x) => x.dia === idx)) {
      const minuto = idx * 1440 + f.minuto;
      const p = 1 - Math.pow(1 - adocao * atencao, f.domicilios);
      problemas.push({
        tipo: 'coleta_nao_passou',
        setor: f.setor,
        minuto,
        latitude: f.setor.latitude + (r() - 0.5) * 0.01,
        longitude: f.setor.longitude + (r() - 0.5) * 0.01,
        kg: Math.round(f.kg),
        reportado: r() < p,
        reporteEm: minuto + exp(r, 60),
        dia: idx,
      });
    }
    dias.push({
      data: d.data,
      chuvaMm: CHUVA[idx],
      pedidos: 0,
      problemas: problemas.length - antes,
      domiciliosComApp: comApp,
    });
  }

  // ---- Fila de eventos: pedidos em ordem de tempo, despacho de menor desvio ----
  const fila = problemas.filter((p) => p.reportado).sort((a, b) => a.reporteEm - b.reporteEm);
  for (const p of problemas)
    ev(p.minuto, 'problema', { tipo: p.tipo, setor: p.setor.id, reportado: p.reportado ? 1 : 0 });
  const pedidos: PedidoSim[] = [];
  const semAppKm = dado('km_sem_app_por_ponto');
  for (const p of fila) {
    const criado = p.reporteEm;
    const diaIdx = Math.min(30, Math.floor(criado / 1440));
    const semAppHoras =
      p.tipo === 'descarte_irregular'
        ? dado('prazo_sem_app_descarte')
        : p.tipo === 'volume_extra'
          ? dado('prazo_sem_app_volume')
          : (proximaPassagem(p.setor, diaIdx, criado - diaIdx * 1440) - criado) / 60;
    ev(criado, 'pedido', { tipo: p.tipo, setor: p.setor.id });
    let t = criado + 2 + r() * 10; // motorista aceita
    // Pedido urgente (coleta não passou) só vai para caminhão em serviço agora; os outros
    // podem esperar um caminhão que passe no setor dentro da janela de agrupamento.
    const janela = p.tipo === 'coleta_nao_passou' ? 0 : janelaMin;
    type Escolha = { e: Execucao; desvio: number; fimServico: number; ida: number };
    let escolhido: Escolha | null = null;
    for (let tentativa = 0; tentativa < 6 && !escolhido; tentativa++) {
      let melhor: Escolha | null = null;
      for (const e of execucoes) {
        if (e.inicio > t + janela || t > e.fim - 30) continue;
        const inicio = Math.max(t, e.inicio, e.livreEm);
        const pos = posicao(e, inicio);
        if (!pos) continue;
        let desvio = 2 * distanciaKm(pos, p);
        if (e.setorId === p.setor.id) desvio *= 0.5; // o caminhão já passa pelo setor
        const ida = (desvio / 2 / e.velocidade) * 60;
        const fimServico = inicio + ida + 11;
        if (fimServico > e.fim + 45) continue;
        if (
          !melhor ||
          desvio < melhor.desvio - 0.05 ||
          (Math.abs(desvio - melhor.desvio) <= 0.05 && fimServico < melhor.fimServico)
        )
          melhor = { e, desvio, fimServico, ida };
      }
      if (melhor) escolhido = melhor;
      else {
        const prox = execucoes
          .filter((e) => e.inicio > t)
          .reduce((m, e) => Math.min(m, e.inicio), Infinity);
        if (!Number.isFinite(prox)) break;
        t = prox + 5;
      }
    }
    const cancela = !escolhido || (escolhido.fimServico - criado > 24 * 60 && r() < 0.15);
    const pedido: PedidoSim = {
      id: pedidos.length + 1,
      tipo: p.tipo,
      setorId: p.setor.id,
      latitude: r1(p.latitude, 5),
      longitude: r1(p.longitude, 5),
      criadoEm: iso(criado),
      atribuidoEm: escolhido && !cancela ? iso(t) : null,
      coletadoEm: escolhido && !cancela ? iso(escolhido.fimServico) : null,
      status: cancela ? 'Cancelled' : 'Collected',
      placa: escolhido && !cancela ? escolhido.e.placa : null,
      desvioKm: escolhido && !cancela ? r1(escolhido.desvio, 2) : 0,
      kg: p.kg,
      semAppKm: p.tipo === 'coleta_nao_passou' ? 0 : semAppKm,
      semAppHoras: r1(semAppHoras),
    };
    if (escolhido && !cancela) {
      const e = escolhido.e;
      e.livreEm = escolhido.fimServico + escolhido.ida;
      e.kmDesvio = r1(e.kmDesvio + escolhido.desvio, 2);
      e.kmComApp = r1(e.kmRota + e.kmDesvio);
      e.kmSemApp = r1(e.kmSemApp + pedido.semAppKm);
      e.kg += p.kg;
      e.pedidos++;
      e.paradas++;
      ev(t, 'atribuicao', { pedido: pedido.id, placa: e.placa, desvioKm: pedido.desvioKm });
      ev(escolhido.fimServico, 'coleta', { pedido: pedido.id, placa: e.placa, kg: p.kg });
      dias[diaIdx].pedidos++;
    } else {
      ev(criado + 480, 'cancelado', { pedido: pedido.id });
    }
    pedidos.push(pedido);
  }
  eventos.sort((a, b) => (a.instante < b.instante ? -1 : a.instante > b.instante ? 1 : 0));

  const turnos: TurnoSim[] = execucoes.map(
    ({
      inicio: _i,
      fim: _f,
      livreEm: _l,
      janelasTransbordo: _j,
      setor: _s,
      velocidade: _v,
      ...t
    }) => ({
      ...t,
      kmComApp: r1(t.kmRota + t.kmDesvio),
      kmSemApp: r1(t.kmSemApp),
    }),
  );

  // ---- Resumo no mesmo formato da aba Impacto ----
  const coletados = pedidos.filter((p) => p.status === 'Collected');
  const kmSem = turnos.reduce((a, t) => a + t.kmSemApp, 0);
  const kmCom = turnos.reduce((a, t) => a + t.kmComApp, 0);
  const evitado = kmSem - kmCom;
  const imp = impactFromKm(evitado);
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const minutosAtendimento = coletados.map(
    (p) => (Date.parse(p.coletadoEm!) - Date.parse(p.criadoEm)) / 60000,
  );
  const semanas = new Map<string, { baselineKm: number; actualKm: number }>();
  for (const t of turnos) {
    const dt = new Date(`${t.data}T12:00:00Z`);
    const seg = new Date(dt.getTime() - ((dt.getUTCDay() + 6) % 7) * 86400000)
      .toISOString()
      .slice(0, 10);
    const w = semanas.get(seg) ?? { baselineKm: 0, actualKm: 0 };
    w.baselineKm += t.kmSemApp;
    w.actualKm += t.kmComApp;
    semanas.set(seg, w);
  }
  const porSetor = SETORES.map((s) => ({
    s,
    n: coletados.filter((p) => p.setorId === s.id).length,
  }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const resumo: ImpactSummary = {
    isSimulation: true,
    subprefecture: {
      name: REGIAO.subprefeitura,
      concessionaire: REGIAO.concessionaria,
      population: 605383,
      households: 212747,
      censusYear: 2022,
      source: 'IBGE, Censo 2022 (Coletânea de indicadores das subprefeituras, Prefeitura de SP)',
    },
    city: {
      trucks: 842,
      tonsPerDay: 12000,
      domesticTons2025: 3549352,
      sourceFleet: 'SP Regula, coleta domiciliar',
      sourceTons: 'Prefeitura de SP, coleta de lixo segundo origem 2025',
    },
    period: { from: DIAS[0].data, to: DIAS[30].data, days: 31 },
    districtId: REGIAO.distritoId,
    parameters: PARAMETERS.filter((p) =>
      ['km_por_litro', 'kg_co2_por_litro', 'preco_diesel'].includes(p.key),
    ),
    totals: {
      routes: turnos.length,
      requests: pedidos.length,
      collected: coletados.length,
      baselineKm: r1(kmSem),
      actualKm: r1(kmCom),
      avoidedKm: r1(evitado),
      avoidedLiters: r1(imp.liters),
      avoidedCo2Kg: r1(imp.co2),
      savedBrl: Math.round(imp.brl),
      reductionPct: kmSem ? r1((100 * evitado) / kmSem) : 0,
      avgServiceMinutes: Math.round(media(minutosAtendimento)),
    },
    weekly: [...semanas.entries()].map(([weekStart, w]) => ({
      weekStart,
      baselineKm: r1(w.baselineKm),
      actualKm: r1(w.actualKm),
      avoidedCo2Kg: r1(impactFromKm(w.baselineKm - w.actualKm).co2),
    })),
    districts: [
      {
        id: REGIAO.distritoId,
        name: REGIAO.nome,
        routes: turnos.length,
        avoidedKm: r1(evitado),
        avoidedCo2Kg: r1(imp.co2),
        savedBrl: Math.round(imp.brl),
        avgServiceMinutes: Math.round(media(minutosAtendimento)),
      },
    ],
    hotspots: porSetor.map(({ s, n }) => ({
      id: s.id,
      districtId: REGIAO.distritoId,
      label: s.nome,
      latitude: s.latitude,
      longitude: s.longitude,
      weight: s.peso,
      district: REGIAO.nome,
      requests: n,
    })),
    projection: {
      avoidedKm: r1(evitado * 12),
      avoidedLiters: r1(imp.liters * 12),
      avoidedCo2Kg: r1(imp.co2 * 12),
      savedBrl: Math.round(imp.brl * 12),
    },
  };

  const tipos: TipoPedido[] = ['descarte_irregular', 'coleta_nao_passou', 'volume_extra'];
  const conta = <T>(xs: T[], f: (x: T) => TipoPedido) =>
    Object.fromEntries(tipos.map((k) => [k, xs.filter((x) => f(x) === k).length])) as Record<
      TipoPedido,
      number
    >;
  const horasCom = Object.fromEntries(
    tipos.map((k) => [
      k,
      r1(
        media(
          coletados
            .filter((p) => p.tipo === k)
            .map((p) => (Date.parse(p.coletadoEm!) - Date.parse(p.criadoEm)) / 3600000),
        ),
      ),
    ]),
  ) as Record<TipoPedido, number>;
  const horasSem = Object.fromEntries(
    tipos.map((k) => [k, r1(media(pedidos.filter((p) => p.tipo === k).map((p) => p.semAppHoras)))]),
  ) as Record<TipoPedido, number>;

  const toneladasRota =
    execucoes.reduce((a, e) => a + e.kg, 0) / 1000 - coletados.reduce((a, p) => a + p.kg, 0) / 1000;
  const toneladasGeradas = (dado('populacao') * lixoPessoa * 31) / 1000;
  const kmMedioTurno = turnos.reduce((a, t) => a + t.kmRota, 0) / turnos.length;
  const descartes = problemas.filter((p) => p.tipo === 'descarte_irregular').length;
  const alvoSac = dado('chamados_descarte_capela') * dado('parte_grajau');
  const diasChuva = CHUVA.filter((v) => v > 1).length;
  const totalChuva = r1(CHUVA.reduce((a, b) => a + b, 0));
  const diasDeColeta = DIAS.filter((d) => d.semana !== 0).length;
  const kgDiaMaxGrajau = (toneladasRota / diasDeColeta) * 1000;

  const calibracao: Calibracao[] = [
    {
      alvo: 'Chuva no mês (INMET, Interlagos)',
      simulado: `${br(totalChuva)} mm em ${diasChuva} dias`,
      referencia: `${br(dado('chuva_total'))} mm em ${dado('dias_chuva')} dias`,
      faixa: 'igual ao oficial',
      ok: Math.abs(totalChuva - dado('chuva_total')) < 0.2 && diasChuva === dado('dias_chuva'),
    },
    {
      alvo: 'Lixo coletado na rota fixa x lixo gerado',
      simulado: `${br(toneladasRota, 0)} t`,
      referencia: `${br(toneladasGeradas, 0)} t (moradores × ${br(lixoPessoa, 3)} kg/dia × 31)`,
      faixa: '±10%',
      ok: Math.abs(toneladasRota / toneladasGeradas - 1) <= 0.1,
    },
    {
      alvo: 'Chamados de descarte que a Prefeitura receberia',
      simulado: `${Math.round(descartes * taxaSac)} chamados`,
      referencia: `${Math.round(alvoSac)} (767 da subprefeitura × 63,6%)`,
      faixa: '±15%',
      ok: Math.abs((descartes * taxaSac) / alvoSac - 1) <= 0.15,
    },
    {
      alvo: 'Km por turno da rota fixa',
      simulado: `${br(kmMedioTurno)} km`,
      referencia: '73 km no módulo de impacto (65 × 1,12)',
      faixa: '60 a 130 km',
      ok: kmMedioTurno >= 60 && kmMedioTurno <= 130,
    },
    {
      alvo: 'Lixo do Grajaú no transbordo Santo Amaro',
      simulado: `${Math.round(kgDiaMaxGrajau / 1000)} t por dia de coleta`,
      referencia: '2.500 a 3.000 t/dia para 8 subprefeituras',
      faixa: 'menos de 2.500 t/dia',
      ok: kgDiaMaxGrajau / 1000 < 2500,
    },
    {
      alvo: 'Pedidos no app x problemas',
      simulado: `${br(pedidos.length, 0)} pedidos`,
      referencia: `${br(problemas.length, 0)} problemas`,
      faixa: 'pedidos ≤ problemas',
      ok: pedidos.length <= problemas.length,
    },
  ];

  const divergencias = [...DIVERGENCIAS];
  if (Math.abs(kmMedioTurno - 73) / 73 > 0.15)
    divergencias.push({
      id: DIVERGENCIAS.length + 1,
      dado: 'Km por turno da rota fixa no Grajaú',
      valorA: '73 km (65 km do grupo × 1,12)',
      fonteA: 'modulo-impacto',
      valorB: `${br(kmMedioTurno)} km pela distância até o transbordo Santo Amaro`,
      fonteB: 'spregula-transbordos',
      decisao: 'O simulador usa a distância calculada; o módulo de impacto deve revisar os 65 km.',
    });

  const selos = { oficial: 0, derivado: 0, estimado: 0, hipotese: 0 } as Record<Selo, number>;
  for (const d of DADOS) selos[d.selo]++;

  const pa = portaoA();
  return {
    id: `sim-${REGIAO.id}-${REGIAO.mes}-${semente}`,
    regiao: REGIAO,
    cenario: 'unico',
    semente,
    versaoMotor: VERSAO_MOTOR,
    criadaEm: new Date().toISOString(),
    resumo,
    demanda: {
      problemas: problemas.length,
      problemasPorTipo: conta(problemas, (p) => p.tipo),
      pedidos: pedidos.length,
      pedidosPorTipo: conta(pedidos, (p) => p.tipo),
      cancelados: pedidos.filter((p) => p.status === 'Cancelled').length,
      adocaoFinal: a1,
      domiciliosComApp: dias[30].domiciliosComApp,
      horasComApp: horasCom,
      horasSemApp: horasSem,
      kgPorPedidos: coletados.reduce((a, p) => a + p.kg, 0),
      janelaHoras: janelaMin / 60,
      semJanela:
        opcoes.comparar === false || janelaMin === 0
          ? null
          : (() => {
              const b = simular(semente, { janelaHoras: 0, comparar: false });
              return {
                kmEvitados: b.resumo.totals.avoidedKm,
                horasDescarte: b.demanda.horasComApp.descarte_irregular,
              };
            })(),
    },
    operacao: {
      turnos: turnos.length,
      kmMedioTurno: r1(kmMedioTurno),
      toneladasRota: Math.round(toneladasRota),
      toneladasGeradas: Math.round(toneladasGeradas),
      viagensTransbordo: turnos.reduce((a, t) => a + t.viagens, 0),
      setoresSemColeta,
    },
    dias,
    pedidos,
    turnos,
    eventos,
    relatorio: {
      portaoA: pa,
      portaoB: calibracao.every((c) => c.ok),
      selos,
      itensEstimadosDaRegiao: [
        'Setores provisórios (posição e peso) até o coletor trazer os setores do IBGE',
        'Grupo e turno da coleta por setor até a consulta por CEP',
        'Distribuição da chuva entre os dias (total e dias de chuva são oficiais)',
        'Lugar e dia das feiras (a quantidade é derivada)',
        `Coordenada do transbordo (${TRANSBORDO.endereco}) e da garagem (${GARAGEM.nome})`,
      ],
      divergencias,
      calibracao,
      fontes: FONTES,
      dados: DADOS,
    },
  };
}

// Resumo leve para a API (sem as listas grandes).
export function simulacaoPublica(s: Simulacao) {
  const { pedidos: _p, turnos: _t, eventos, ...resto } = s;
  return { ...resto, totalEventos: eventos.length };
}
export type SimulacaoPublica = ReturnType<typeof simulacaoPublica>;
