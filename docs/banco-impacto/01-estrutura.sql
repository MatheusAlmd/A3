-- =====================================================================
-- Coleta · Módulo de Impacto (PostgreSQL 16+)
-- Mede o efeito da coleta sob demanda: km evitados, diesel, CO2 e R$,
-- comparando a rota fixa de hoje com a rota realizada pelo Coleta.
-- Recorte: Subprefeitura Capela do Socorro (Socorro, Cidade Dutra, Grajaú).
-- Ordem de execução: 01-estrutura.sql → 02-dados.sql → 03-consultas.sql
-- =====================================================================

DROP SCHEMA IF EXISTS impacto CASCADE;
CREATE SCHEMA impacto;
SET search_path TO impacto;

-- ---------------------------------------------------------------------
-- 1. Território (dados oficiais)
-- ---------------------------------------------------------------------
CREATE TABLE subprefeitura (
    id              SMALLINT PRIMARY KEY,
    nome            VARCHAR(80)  NOT NULL UNIQUE,
    concessionaria  VARCHAR(40)  NOT NULL,
    populacao       INTEGER      NOT NULL CHECK (populacao > 0),
    domicilios      INTEGER      NOT NULL CHECK (domicilios > 0),
    ano_censo       SMALLINT     NOT NULL,
    fonte           TEXT         NOT NULL
);

CREATE TABLE distrito (
    id                SMALLINT PRIMARY KEY,
    subprefeitura_id  SMALLINT     NOT NULL REFERENCES subprefeitura(id),
    nome              VARCHAR(80)  NOT NULL,
    latitude          NUMERIC(9,6) NOT NULL,
    longitude         NUMERIC(9,6) NOT NULL,
    UNIQUE (subprefeitura_id, nome)
);

-- ---------------------------------------------------------------------
-- 2. Parâmetros do cálculo (cada número tem fonte)
-- ---------------------------------------------------------------------
CREATE TABLE parametro (
    chave          VARCHAR(40)   PRIMARY KEY,
    descricao      VARCHAR(120)  NOT NULL,
    valor          NUMERIC(12,4) NOT NULL CHECK (valor > 0),
    unidade        VARCHAR(20)   NOT NULL,
    fonte          TEXT          NOT NULL,
    oficial        BOOLEAN       NOT NULL,
    atualizado_em  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Leitura de um parâmetro (usada pelo trigger e pelas consultas)
CREATE FUNCTION fn_parametro(p_chave VARCHAR) RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    SELECT valor FROM impacto.parametro WHERE chave = p_chave
$$;

-- ---------------------------------------------------------------------
-- 3. Operação: caminhões, rota fixa de referência e execuções
--    caminhao.id_externo / execucao_rota.id_rota_externa ligam ao
--    banco Management (TRUCK e COLLECTION_ROUTE) pelo Id, sem FK entre bancos.
-- ---------------------------------------------------------------------
CREATE TABLE caminhao (
    id           SERIAL      PRIMARY KEY,
    id_externo   UUID        UNIQUE,              -- TRUCK.Id no banco Management
    placa        CHAR(7)     NOT NULL UNIQUE,
    distrito_id  SMALLINT    NOT NULL REFERENCES distrito(id)
);

CREATE TABLE rota_referencia (
    id            SERIAL       PRIMARY KEY,
    caminhao_id   INTEGER      NOT NULL UNIQUE REFERENCES caminhao(id),
    distrito_id   SMALLINT     NOT NULL REFERENCES distrito(id),
    km_fixo       NUMERIC(6,1) NOT NULL CHECK (km_fixo > 0),  -- km da rota fixa por turno
    dias_semana   SMALLINT     NOT NULL DEFAULT 6 CHECK (dias_semana BETWEEN 1 AND 7)
);

CREATE TABLE execucao_rota (
    id                  SERIAL        PRIMARY KEY,
    rota_referencia_id  INTEGER       NOT NULL REFERENCES rota_referencia(id),
    id_rota_externa     UUID,                                -- COLLECTION_ROUTE.Id (Management)
    data                DATE          NOT NULL,
    km_realizado        NUMERIC(6,1)  NOT NULL CHECK (km_realizado >= 0),
    minutos             SMALLINT      NOT NULL CHECK (minutos > 0),
    paradas             SMALLINT      NOT NULL CHECK (paradas >= 0),
    kg_coletados        INTEGER       NOT NULL CHECK (kg_coletados >= 0),
    -- Calculados pelo trigger trg_execucao_impacto a partir de parametro:
    km_fixo             NUMERIC(6,1),
    km_evitado          NUMERIC(7,1),
    litros_evitados     NUMERIC(9,2),
    co2_evitado_kg      NUMERIC(10,2),
    economia_reais      NUMERIC(11,2),
    UNIQUE (rota_referencia_id, data)
);

-- ---------------------------------------------------------------------
-- 4. Demanda do cidadão: pontos críticos e solicitações
--    solicitacao.id_externo liga a COLLECTION_REQUEST (banco Routing).
-- ---------------------------------------------------------------------
CREATE TABLE ponto_critico (
    id           SMALLINT     PRIMARY KEY,
    distrito_id  SMALLINT     NOT NULL REFERENCES distrito(id),
    descricao    VARCHAR(120) NOT NULL,
    latitude     NUMERIC(9,6) NOT NULL,
    longitude    NUMERIC(9,6) NOT NULL
);

CREATE TABLE solicitacao (
    id                SERIAL       PRIMARY KEY,
    id_externo        UUID,                                  -- COLLECTION_REQUEST.Id (Routing)
    distrito_id       SMALLINT     NOT NULL REFERENCES distrito(id),
    ponto_critico_id  SMALLINT     REFERENCES ponto_critico(id),
    latitude          NUMERIC(9,6) NOT NULL,
    longitude         NUMERIC(9,6) NOT NULL,
    status            VARCHAR(12)  NOT NULL
                      CHECK (status IN ('Pending','Assigned','Collected','Cancelled')),
    criado_em         TIMESTAMPTZ  NOT NULL,
    atribuido_em      TIMESTAMPTZ,
    coletado_em       TIMESTAMPTZ,
    CHECK (atribuido_em IS NULL OR atribuido_em >= criado_em),
    CHECK (coletado_em  IS NULL OR coletado_em  >= criado_em),
    CHECK (status <> 'Collected' OR coletado_em IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 5. Índices (consultas por período, distrito e fila)
-- ---------------------------------------------------------------------
CREATE INDEX ix_execucao_data          ON execucao_rota (data);
CREATE INDEX ix_solicitacao_distrito   ON solicitacao (distrito_id, criado_em);
CREATE INDEX ix_solicitacao_ponto      ON solicitacao (ponto_critico_id) WHERE ponto_critico_id IS NOT NULL;
CREATE INDEX ix_solicitacao_pendente   ON solicitacao (criado_em) WHERE status = 'Pending';

-- ---------------------------------------------------------------------
-- 6. Trigger: toda execução registrada já sai com o impacto calculado
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_calcula_impacto() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_km_fixo NUMERIC;
BEGIN
    SELECT km_fixo INTO v_km_fixo FROM impacto.rota_referencia WHERE id = NEW.rota_referencia_id;
    NEW.km_fixo         := v_km_fixo;
    NEW.km_evitado      := GREATEST(v_km_fixo - NEW.km_realizado, 0);
    NEW.litros_evitados := NEW.km_evitado / impacto.fn_parametro('km_por_litro');
    NEW.co2_evitado_kg  := NEW.litros_evitados * impacto.fn_parametro('kg_co2_por_litro');
    NEW.economia_reais  := NEW.litros_evitados * impacto.fn_parametro('preco_diesel');
    RETURN NEW;
END $$;

CREATE TRIGGER trg_execucao_impacto
    BEFORE INSERT OR UPDATE OF km_realizado, rota_referencia_id ON execucao_rota
    FOR EACH ROW EXECUTE FUNCTION fn_calcula_impacto();

-- ---------------------------------------------------------------------
-- 7. Procedure: chamada pelo back quando a rota termina (última parada)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_registrar_execucao(
    p_placa          CHAR(7),
    p_data           DATE,
    p_km_realizado   NUMERIC,
    p_minutos        INTEGER,
    p_paradas        INTEGER,
    p_kg             INTEGER,
    p_id_rota        UUID DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_ref INTEGER;
BEGIN
    SELECT r.id INTO v_ref
    FROM impacto.rota_referencia r
    JOIN impacto.caminhao c ON c.id = r.caminhao_id
    WHERE c.placa = p_placa;

    IF v_ref IS NULL THEN
        RAISE EXCEPTION 'Caminhão % sem rota de referência cadastrada', p_placa;
    END IF;

    INSERT INTO impacto.execucao_rota
        (rota_referencia_id, id_rota_externa, data, km_realizado, minutos, paradas, kg_coletados)
    VALUES (v_ref, p_id_rota, p_data, p_km_realizado, p_minutos, p_paradas, p_kg)
    ON CONFLICT (rota_referencia_id, data) DO UPDATE
        SET km_realizado = EXCLUDED.km_realizado,
            minutos      = EXCLUDED.minutos,
            paradas      = EXCLUDED.paradas,
            kg_coletados = EXCLUDED.kg_coletados;
END $$;

-- ---------------------------------------------------------------------
-- 8. Views de impacto
-- ---------------------------------------------------------------------
CREATE VIEW vw_impacto_diario AS
SELECT e.data,
       d.id   AS distrito_id,
       d.nome AS distrito,
       COUNT(*)                 AS rotas,
       SUM(e.km_fixo)           AS km_fixo,
       SUM(e.km_realizado)      AS km_realizado,
       SUM(e.km_evitado)        AS km_evitado,
       SUM(e.litros_evitados)   AS litros_evitados,
       SUM(e.co2_evitado_kg)    AS co2_evitado_kg,
       SUM(e.economia_reais)    AS economia_reais
FROM execucao_rota e
JOIN rota_referencia r ON r.id = e.rota_referencia_id
JOIN distrito d        ON d.id = r.distrito_id
GROUP BY e.data, d.id, d.nome;

CREATE VIEW vw_impacto_mensal AS
SELECT date_trunc('month', data)::date AS mes,
       distrito,
       SUM(rotas)            AS rotas,
       SUM(km_evitado)       AS km_evitado,
       SUM(litros_evitados)  AS litros_evitados,
       ROUND(SUM(co2_evitado_kg) / 1000, 2) AS co2_evitado_t,
       SUM(economia_reais)   AS economia_reais,
       ROUND(100 * SUM(km_evitado) / NULLIF(SUM(km_fixo), 0), 1) AS reducao_pct
FROM vw_impacto_diario
GROUP BY 1, 2;

CREATE VIEW vw_tempo_atendimento AS
SELECT d.nome AS distrito,
       COUNT(*)                                             AS solicitacoes,
       COUNT(*) FILTER (WHERE s.status = 'Collected')       AS coletadas,
       COUNT(*) FILTER (WHERE s.status = 'Cancelled')       AS canceladas,
       ROUND(AVG(EXTRACT(EPOCH FROM s.atribuido_em - s.criado_em) / 60)) AS min_ate_atribuir,
       ROUND(AVG(EXTRACT(EPOCH FROM s.coletado_em  - s.criado_em) / 60)) AS min_ate_coletar
FROM solicitacao s
JOIN distrito d ON d.id = s.distrito_id
GROUP BY d.nome;

-- Ranking de pontos críticos (materializada: consulta pesada, atualizada 1x por dia)
CREATE MATERIALIZED VIEW mv_ranking_pontos_criticos AS
SELECT p.id,
       p.descricao,
       d.nome AS distrito,
       COUNT(s.id) AS solicitacoes_90d,
       RANK() OVER (ORDER BY COUNT(s.id) DESC) AS posicao
FROM ponto_critico p
JOIN distrito d          ON d.id = p.distrito_id
LEFT JOIN solicitacao s  ON s.ponto_critico_id = p.id
                        AND s.criado_em >= (SELECT MAX(criado_em) FROM solicitacao) - INTERVAL '90 days'
GROUP BY p.id, p.descricao, d.nome;

-- ---------------------------------------------------------------------
-- 9. Função de resumo (mesmos números da aba Impacto do app)
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_resumo_impacto(p_dias INTEGER DEFAULT 30, p_distrito SMALLINT DEFAULT NULL)
RETURNS TABLE (
    rotas BIGINT, km_fixo NUMERIC, km_realizado NUMERIC, km_evitado NUMERIC,
    litros_evitados NUMERIC, co2_evitado_kg NUMERIC, economia_reais NUMERIC, reducao_pct NUMERIC
)
LANGUAGE sql STABLE AS $$
    SELECT SUM(rotas), SUM(km_fixo), SUM(km_realizado), SUM(km_evitado),
           ROUND(SUM(litros_evitados), 1), ROUND(SUM(co2_evitado_kg), 1), ROUND(SUM(economia_reais), 2),
           ROUND(100 * SUM(km_evitado) / NULLIF(SUM(km_fixo), 0), 1)
    FROM impacto.vw_impacto_diario
    WHERE data > (SELECT MAX(data) FROM impacto.execucao_rota) - p_dias
      AND (p_distrito IS NULL OR distrito_id = p_distrito)
$$;
