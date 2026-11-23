// Gera docs/banco-simulacao/02-dados.sql com o mesmo motor usado pelo botão do app.
// Uso: npx tsx scripts/gerar-sql-simulacao.ts [semente]
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { DADOS, DIVERGENCIAS, FONTES } from '../src/simulador/fontes';
import { SEMENTE_PADRAO, simulacaoPublica, simular } from '../src/simulador/motor';
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
} from '../src/simulador/regiao';

const semente = Number(process.argv[2] || SEMENTE_PADRAO);
const sim = simular(semente);
const q = (v: string | null | undefined) => (v == null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
const hora = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const h = createHash('sha256').update(sim.id).digest('hex');
const uuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
const lines: string[] = [];
const out = (s = '') => lines.push(s);
const lote = <T>(cabecalho: string, xs: T[], f: (x: T) => string, tamanho = 500) => {
  for (let i = 0; i < xs.length; i += tamanho) {
    out(cabecalho);
    out(
      xs
        .slice(i, i + tamanho)
        .map((x) => `  ${f(x)}`)
        .join(',\n') + ';',
    );
    out();
  }
};

out('-- Dados do simulador de 1 mês: Grajaú, outubro de 2026.');
out(
  `-- Gerado por scripts/gerar-sql-simulacao.ts (semente ${semente}, motor ${sim.versaoMotor}). Não edite à mão.`,
);
out(
  '-- Roda depois de 01-estrutura.sql. Fontes, dados e região têm selo; turnos e pedidos são simulados.',
);
out('SET search_path TO impacto;');
out('BEGIN;');
out();
lote(
  'INSERT INTO fonte_dado (id, nome, orgao, url, acessado_em, observacao) VALUES',
  FONTES,
  (f) =>
    `(${q(f.id)}, ${q(f.nome)}, ${q(f.orgao)}, ${q(f.url)}, ${q(f.acessadoEm)}, ${q(f.observacao ?? null)})`,
);
lote(
  'INSERT INTO dado_regional (chave, descricao, valor, unidade, selo, fonte_id, nota) VALUES',
  DADOS,
  (d) =>
    `(${q(d.chave)}, ${q(d.descricao)}, ${d.valor}, ${q(d.unidade)}, ${q(d.selo)}, ${q(d.fonteId)}, ${q(d.nota || null)})`,
);
lote(
  'INSERT INTO divergencia (id, dado, valor_a, fonte_a, valor_b, fonte_b, decisao) VALUES',
  sim.relatorio.divergencias,
  (v) =>
    `(${v.id}, ${q(v.dado)}, ${q(v.valorA)}, ${q(v.fonteA)}, ${q(v.valorB)}, ${q(v.fonteB)}, ${q(v.decisao)})`,
);
lote(
  'INSERT INTO setor_censitario (id, distrito_id, nome, latitude, longitude, populacao, domicilios, provisorio, selo) VALUES',
  SETORES,
  (s) =>
    `(${s.id}, ${REGIAO.distritoId}, ${q(s.nome)}, ${s.latitude}, ${s.longitude}, ${s.populacao}, ${s.domicilios}, true, ${q(s.selo)})`,
);
lote(
  'INSERT INTO setor_coleta (setor_id, dias_semana, turno, hora_inicio, fonte_id, selo) VALUES',
  SETORES,
  (s) =>
    `(${s.id}, '{${DIAS_GRUPO[s.grupo].join(',')}}', ${q(s.turno)}, ${q(hora(TURNOS[s.turno].inicio))}, 'spregula-cep', 'estimado')`,
);
const pontos = [
  `('transbordo', ${q(TRANSBORDO.nome)}, NULL, ${TRANSBORDO.latitude}, ${TRANSBORDO.longitude}, NULL, NULL, NULL, 'estimado')`,
  `('garagem', ${q(GARAGEM.nome)}, NULL, ${GARAGEM.latitude}, ${GARAGEM.longitude}, NULL, NULL, NULL, 'estimado')`,
  ...FEIRAS.map((f) => {
    const s = SETORES.find((x) => x.id === f.setorId)!;
    return `('feira', ${q(`Feira ${f.id} (${s.nome})`)}, ${s.id}, ${s.latitude}, ${s.longitude}, ${f.semana}, ${q(hora(f.inicio))}, ${q(hora(f.fim))}, 'estimado')`;
  }),
];
lote(
  'INSERT INTO ponto_interesse (tipo, nome, setor_id, latitude, longitude, dia_semana, hora_inicio, hora_fim, selo) VALUES',
  pontos,
  (p) => p,
);
lote(
  'INSERT INTO calendario_dia (data, chuva_mm, feriado, eleicao, fonte_id) VALUES',
  DIAS,
  (d) => `(${q(d.data)}, ${CHUVA[d.dia - 1]}, ${d.feriado}, ${d.eleicao}, 'inmet')`,
);
const pub = simulacaoPublica(sim);
out(
  'INSERT INTO simulacao (id, codigo, distrito_id, mes, cenario, semente, versao_motor, status, resumo, relatorio) VALUES',
);
out(
  `  (${q(uuid)}, ${q(sim.id)}, ${REGIAO.distritoId}, '2026-10-01', 'unico', ${semente}, ${q(sim.versaoMotor)}, 'done', ${q(JSON.stringify({ totals: pub.resumo.totals, demanda: pub.demanda, operacao: pub.operacao }))}, ${q(JSON.stringify({ portaoA: pub.relatorio.portaoA, portaoB: pub.relatorio.portaoB, selos: pub.relatorio.selos, calibracao: pub.relatorio.calibracao }))});`,
);
out();
lote(
  'INSERT INTO execucao_rota (rota_referencia_id, data, km_realizado, minutos, paradas, kg_coletados, simulacao_id, km_sem_app) VALUES',
  sim.turnos,
  (t) =>
    `(${t.rotaReferenciaId}, ${q(t.data)}, ${t.kmComApp}, ${t.minutos}, ${t.paradas}, ${t.kg}, ${q(uuid)}, ${t.kmSemApp})`,
);
lote(
  'INSERT INTO solicitacao (distrito_id, latitude, longitude, status, criado_em, atribuido_em, coletado_em, simulacao_id, tipo, setor_id, kg) VALUES',
  sim.pedidos,
  (p) =>
    `(${REGIAO.distritoId}, ${p.latitude}, ${p.longitude}, ${q(p.status)}, ${q(p.criadoEm)}, ${q(p.atribuidoEm)}, ${q(p.coletadoEm)}, ${q(uuid)}, ${q(p.tipo)}, ${p.setorId}, ${p.kg})`,
);
lote(
  'INSERT INTO evento_simulado (simulacao_id, instante, tipo, detalhe) VALUES',
  sim.eventos,
  (e) => `(${q(uuid)}, ${q(e.instante)}, ${q(e.tipo)}, ${q(JSON.stringify(e.detalhe))})`,
  1000,
);
out('COMMIT;');

const destino = path.join(__dirname, '..', 'docs', 'banco-simulacao', '02-dados.sql');
writeFileSync(destino, lines.join('\n') + '\n');
console.log(
  `${destino}: ${sim.turnos.length} turnos, ${sim.pedidos.length} pedidos, ${sim.eventos.length} eventos (simulação ${uuid})`,
);
