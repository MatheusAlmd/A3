-- Consultas do simulador de 1 mês (rodar depois de 01-estrutura.sql e 02-dados.sql)
SET search_path TO impacto;

-- 1. Resumo do mês simulado (mesmos números da aba Impacto em modo simulação)
SELECT * FROM fn_resumo_simulacao((SELECT id FROM simulacao ORDER BY criada_em DESC LIMIT 1));

-- 2. Tempo até resolver por tipo de pedido
SELECT tipo, pedidos, atendidos, horas_ate_resolver
FROM vw_simulacao_pedidos
ORDER BY pedidos DESC;

-- 3. Chuva x pedidos por dia (a chuva vem do calendário com fonte INMET)
SELECT c.data, c.chuva_mm,
       COUNT(s.id) AS pedidos
FROM calendario_dia c
LEFT JOIN solicitacao s ON s.simulacao_id IS NOT NULL AND (s.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = c.data
GROUP BY c.data, c.chuva_mm
ORDER BY c.data;

-- 4. Setores com mais pedidos, com o peso de cada um na população (RANK)
SELECT st.nome, st.populacao, COUNT(s.id) AS pedidos,
       RANK() OVER (ORDER BY COUNT(s.id) DESC) AS posicao
FROM setor_censitario st
LEFT JOIN solicitacao s ON s.setor_id = st.id
GROUP BY st.id, st.nome, st.populacao;

-- 5. Linhagem: cada número usado, com selo e fonte (relatório de veracidade)
SELECT d.chave, d.valor, d.unidade, d.selo, f.orgao, f.url
FROM dado_regional d
LEFT JOIN fonte_dado f ON f.id = d.fonte_id
ORDER BY d.selo, d.chave;

-- 6. Quanto de cada selo entra no simulador
SELECT * FROM vw_selos ORDER BY dados DESC;

-- 7. Divergências entre fontes públicas e a decisão tomada
SELECT dv.dado, dv.valor_a, fa.orgao AS fonte_a, dv.valor_b, fb.orgao AS fonte_b, dv.decisao
FROM divergencia dv
JOIN fonte_dado fa ON fa.id = dv.fonte_a
JOIN fonte_dado fb ON fb.id = dv.fonte_b
ORDER BY dv.id;

-- 8. Portão A no banco: oficial ou derivado sem fonte (deve voltar vazio)
SELECT chave FROM dado_regional WHERE selo IN ('oficial','derivado') AND fonte_id IS NULL;

-- 9. Dado real e simulado separados: o módulo de impacto continua igual
SELECT 'real' AS origem, COUNT(*) FROM execucao_rota WHERE simulacao_id IS NULL
UNION ALL
SELECT 'simulado', COUNT(*) FROM execucao_rota WHERE simulacao_id IS NOT NULL;

-- 10. Linha do tempo de um pedido no log de eventos
SELECT instante AT TIME ZONE 'America/Sao_Paulo' AS hora, tipo, detalhe
FROM evento_simulado
WHERE detalhe->>'pedido' = '1'
ORDER BY instante;

-- 11. Apagar a simulação apaga turnos, pedidos e eventos dela (ON DELETE CASCADE)
-- DELETE FROM simulacao WHERE codigo = 'sim-grajau-2026-10-20261031';
