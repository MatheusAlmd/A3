-- Consultas de impacto para a apresentação. Rodar depois de 01 e 02.
SET search_path TO impacto;

-- 1. Resumo dos últimos 30 dias (é o que a aba Impacto do app mostra)
SELECT * FROM fn_resumo_impacto(30);

-- 2. Mesmo resumo só para o Grajaú
SELECT * FROM fn_resumo_impacto(30, 3::smallint);

-- 3. Impacto por mês e por distrito
SELECT * FROM vw_impacto_mensal ORDER BY mes, distrito;

-- 4. Distrito que mais economizou no período
SELECT distrito,
       SUM(km_evitado)                     AS km_evitado,
       ROUND(SUM(co2_evitado_kg) / 1000, 2) AS co2_evitado_t,
       SUM(economia_reais)                 AS economia_reais
FROM vw_impacto_diario
GROUP BY distrito
ORDER BY economia_reais DESC;

-- 5. Evolução semanal: km da rota fixa x km realizados
SELECT date_trunc('week', data)::date AS semana,
       SUM(km_fixo)      AS km_rota_fixa,
       SUM(km_realizado) AS km_coleta,
       SUM(km_evitado)   AS km_evitado
FROM vw_impacto_diario
GROUP BY 1
ORDER BY 1;

-- 6. Tempo médio de atendimento ao cidadão por distrito
SELECT * FROM vw_tempo_atendimento ORDER BY min_ate_coletar;

-- 7. Top 5 pontos críticos (lixo acumulado recorrente)
SELECT posicao, descricao, distrito, solicitacoes_90d
FROM mv_ranking_pontos_criticos
ORDER BY posicao
LIMIT 5;

-- 8. Caminhões com maior economia (onde o Coleta mais ajuda)
SELECT c.placa, d.nome AS distrito,
       COUNT(*)              AS turnos,
       SUM(e.km_evitado)     AS km_evitado,
       SUM(e.economia_reais) AS economia_reais
FROM execucao_rota e
JOIN rota_referencia r ON r.id = e.rota_referencia_id
JOIN caminhao c        ON c.id = r.caminhao_id
JOIN distrito d        ON d.id = r.distrito_id
GROUP BY c.placa, d.nome
ORDER BY economia_reais DESC
LIMIT 10;

-- 9. Projeção anual (média diária × 313 dias de coleta, segunda a sábado)
SELECT ROUND(SUM(km_evitado)      / COUNT(DISTINCT data) * 313)        AS km_ano,
       ROUND(SUM(litros_evitados) / COUNT(DISTINCT data) * 313)        AS litros_ano,
       ROUND(SUM(co2_evitado_kg)  / COUNT(DISTINCT data) * 313 / 1000) AS co2_t_ano,
       ROUND(SUM(economia_reais)  / COUNT(DISTINCT data) * 313)        AS reais_ano
FROM vw_impacto_diario
WHERE data > (SELECT MAX(data) FROM execucao_rota) - 30;

-- 10. Impacto por mil habitantes (compara com outras subprefeituras no futuro)
SELECT s.nome,
       ROUND(SUM(v.co2_evitado_kg) / (s.populacao / 1000.0), 2) AS kg_co2_por_mil_hab
FROM vw_impacto_diario v
JOIN distrito d      ON d.id = v.distrito_id
JOIN subprefeitura s ON s.id = d.subprefeitura_id
GROUP BY s.nome, s.populacao;

-- 11. Demonstração do trigger e da procedure: registrar uma rota que acabou de terminar
CALL sp_registrar_execucao(
    'SJN9P23',  -- placa de um caminhão do Socorro
    DATE '2026-11-23', 54.0, 280, 165, 11200
);
SELECT data, km_fixo, km_realizado, km_evitado, litros_evitados, co2_evitado_kg, economia_reais
FROM execucao_rota
WHERE data = DATE '2026-11-23';

-- 12. Parâmetros e fontes usados no cálculo
SELECT chave, descricao, valor, unidade, oficial, fonte FROM parametro ORDER BY oficial DESC, chave;
