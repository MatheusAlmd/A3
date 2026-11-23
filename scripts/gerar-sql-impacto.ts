// Gera docs/banco-impacto/02-dados.sql a partir do mesmo gerador usado pelo app (src/api/impact.ts).
// Uso: npx tsx scripts/gerar-sql-impacto.ts
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { DISTRICTS, HOTSPOTS, PARAMETERS, SUBPREFECTURE, impactDataset } from '../src/api/impact';

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const lines: string[] = [];
const out = (s = '') => lines.push(s);

const { baseRoutes, runs, requests } = impactDataset();

out('-- Dados do módulo de impacto: Capela do Socorro.');
out('-- Gerado por scripts/gerar-sql-impacto.ts. Não edite à mão.');
out('-- Território e parâmetros: dados oficiais com fonte. Execuções e solicitações: simulação.');
out('SET search_path TO impacto;');
out('BEGIN;');
out();
out(
  'INSERT INTO subprefeitura (id, nome, concessionaria, populacao, domicilios, ano_censo, fonte) VALUES',
);
out(
  `  (1, ${q(SUBPREFECTURE.name)}, ${q(SUBPREFECTURE.concessionaire)}, ${SUBPREFECTURE.population}, ${SUBPREFECTURE.households}, ${SUBPREFECTURE.censusYear}, ${q(SUBPREFECTURE.source)});`,
);
out();
out('INSERT INTO distrito (id, subprefeitura_id, nome, latitude, longitude) VALUES');
out(
  DISTRICTS.map(
    (d) => `  (${d.id}, 1, ${q(d.name)}, ${d.center.latitude}, ${d.center.longitude})`,
  ).join(',\n') + ';',
);
out();
out('INSERT INTO parametro (chave, descricao, valor, unidade, fonte, oficial) VALUES');
out(
  PARAMETERS.map(
    (p) =>
      `  (${q(p.key)}, ${q(p.label)}, ${p.value}, ${q(p.unit)}, ${q(p.source)}, ${p.official})`,
  ).join(',\n') + ';',
);
out();
out('INSERT INTO ponto_critico (id, distrito_id, descricao, latitude, longitude) VALUES');
out(
  HOTSPOTS.map(
    (h) => `  (${h.id}, ${h.districtId}, ${q(h.label)}, ${h.latitude}, ${h.longitude})`,
  ).join(',\n') + ';',
);
out();
out('INSERT INTO caminhao (id, placa, distrito_id) VALUES');
out(baseRoutes.map((b) => `  (${b.id}, ${q(b.plate)}, ${b.districtId})`).join(',\n') + ';');
out("SELECT setval('caminhao_id_seq', (SELECT MAX(id) FROM caminhao));");
out();
out('INSERT INTO rota_referencia (id, caminhao_id, distrito_id, km_fixo) VALUES');
out(
  baseRoutes.map((b) => `  (${b.id}, ${b.id}, ${b.districtId}, ${b.baselineKm})`).join(',\n') + ';',
);
out("SELECT setval('rota_referencia_id_seq', (SELECT MAX(id) FROM rota_referencia));");
out();
out(`-- ${runs.length} execuções de rota (o trigger calcula km evitado, litros, CO2 e R$)`);
for (let i = 0; i < runs.length; i += 500) {
  out(
    'INSERT INTO execucao_rota (rota_referencia_id, data, km_realizado, minutos, paradas, kg_coletados) VALUES',
  );
  out(
    runs
      .slice(i, i + 500)
      .map(
        (r) =>
          `  (${r.baseRouteId}, '${r.date}', ${r.actualKm}, ${r.minutes}, ${r.stops}, ${r.kg})`,
      )
      .join(',\n') + ';',
  );
}
out();
out(`-- ${requests.length} solicitações de cidadãos`);
for (let i = 0; i < requests.length; i += 500) {
  out(
    'INSERT INTO solicitacao (distrito_id, ponto_critico_id, latitude, longitude, status, criado_em, atribuido_em, coletado_em) VALUES',
  );
  out(
    requests
      .slice(i, i + 500)
      .map(
        (r) =>
          `  (${r.districtId}, ${r.hotspotId ?? 'NULL'}, ${r.latitude}, ${r.longitude}, '${r.status}', '${r.createdAt}', ${r.assignedAt ? `'${r.assignedAt}'` : 'NULL'}, ${r.collectedAt ? `'${r.collectedAt}'` : 'NULL'})`,
      )
      .join(',\n') + ';',
  );
}
out();
out('REFRESH MATERIALIZED VIEW mv_ranking_pontos_criticos;');
out('COMMIT;');

const file = path.join(__dirname, '..', 'docs', 'banco-impacto', '02-dados.sql');
writeFileSync(file, lines.join('\n') + '\n');
console.log(`Gerado ${file}: ${runs.length} execuções, ${requests.length} solicitações.`);
