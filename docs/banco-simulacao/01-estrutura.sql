-- =====================================================================
-- Simulador de 1 mês do Coleta: estrutura no PostgreSQL
-- Roda DEPOIS de docs/banco-impacto/01-estrutura.sql e 02-dados.sql.
-- Nove tabelas novas no schema impacto + simulacao_id nas tabelas que já existem.
-- Dado real e simulado ficam no mesmo banco, separados por simulacao_id
-- (NULL = dado real ou de demonstração), e o mesmo trigger calcula o impacto dos dois.
-- =====================================================================
SET search_path TO impacto;
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Linhagem dos dados: fonte, número com selo e divergências
-- ---------------------------------------------------------------------
CREATE TABLE fonte_dado (
    id           VARCHAR(40)  PRIMARY KEY,
    nome         VARCHAR(200) NOT NULL,
    orgao        VARCHAR(120) NOT NULL,
    url          TEXT         NOT NULL,
    acessado_em  DATE         NOT NULL,
    licenca      VARCHAR(80),
    hash_sha256  CHAR(64),                 -- preenchido pelo coletor ao baixar o arquivo
    observacao   TEXT
);

CREATE TABLE dado_regional (
    chave      VARCHAR(40)   PRIMARY KEY,
    descricao  VARCHAR(200)  NOT NULL,
    valor      NUMERIC(14,4) NOT NULL,
    unidade    VARCHAR(30)   NOT NULL,
    selo       VARCHAR(10)   NOT NULL CHECK (selo IN ('oficial','derivado','estimado','hipotese')),
    fonte_id   VARCHAR(40)   REFERENCES fonte_dado(id),
    nota       TEXT,
    -- Portão A no banco: oficial e derivado sempre têm fonte
    CHECK (selo IN ('estimado','hipotese') OR fonte_id IS NOT NULL)
);

CREATE TABLE divergencia (
    id        SMALLINT     PRIMARY KEY,
    dado      VARCHAR(160) NOT NULL,
    valor_a   TEXT         NOT NULL,
    fonte_a   VARCHAR(40)  NOT NULL REFERENCES fonte_dado(id),
    valor_b   TEXT         NOT NULL,
    fonte_b   VARCHAR(40)  NOT NULL REFERENCES fonte_dado(id),
    decisao   TEXT         NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. Região digital
-- ---------------------------------------------------------------------
CREATE TABLE setor_censitario (
    id           SMALLINT     PRIMARY KEY,
    distrito_id  SMALLINT     NOT NULL REFERENCES distrito(id),
    nome         VARCHAR(80)  NOT NULL,
    latitude     NUMERIC(9,6) NOT NULL,
    longitude    NUMERIC(9,6) NOT NULL,
    populacao    INTEGER      NOT NULL CHECK (populacao >= 0),
    domicilios   INTEGER      NOT NULL CHECK (domicilios >= 0),
    provisorio   BOOLEAN      NOT NULL DEFAULT TRUE,   -- TRUE até entrar o setor do IBGE
    selo         VARCHAR(10)  NOT NULL CHECK (selo IN ('oficial','derivado','estimado','hipotese'))
);

CREATE TABLE setor_coleta (
    setor_id     SMALLINT    PRIMARY KEY REFERENCES setor_censitario(id),
    dias_semana  SMALLINT[]  NOT NULL,                  -- 0 = domingo
    turno        VARCHAR(8)  NOT NULL CHECK (turno IN ('diurno','noturno')),
    hora_inicio  TIME        NOT NULL,
    fonte_id     VARCHAR(40) REFERENCES fonte_dado(id),
    selo         VARCHAR(10) NOT NULL CHECK (selo IN ('oficial','derivado','estimado','hipotese'))
);

CREATE TABLE ponto_interesse (
    id           SERIAL       PRIMARY KEY,
    tipo         VARCHAR(12)  NOT NULL CHECK (tipo IN ('feira','ecoponto','transbordo','garagem')),
    nome         VARCHAR(120) NOT NULL,
    setor_id     SMALLINT     REFERENCES setor_censitario(id),
    latitude     NUMERIC(9,6) NOT NULL,
    longitude    NUMERIC(9,6) NOT NULL,
    dia_semana   SMALLINT     CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio  TIME,
    hora_fim     TIME,
    selo         VARCHAR(10)  NOT NULL CHECK (selo IN ('oficial','derivado','estimado','hipotese')),
    CHECK (tipo <> 'feira' OR (dia_semana IS NOT NULL AND hora_inicio < hora_fim))
);

CREATE TABLE calendario_dia (
    data       DATE         PRIMARY KEY,
    chuva_mm   NUMERIC(5,1) NOT NULL CHECK (chuva_mm >= 0),
    feriado    BOOLEAN      NOT NULL DEFAULT FALSE,
    eleicao    BOOLEAN      NOT NULL DEFAULT FALSE,
    fonte_id   VARCHAR(40)  REFERENCES fonte_dado(id)
);

-- ---------------------------------------------------------------------
-- 3. Rodadas do simulador e log de eventos
-- ---------------------------------------------------------------------
CREATE TABLE simulacao (
    id            UUID         PRIMARY KEY,
    codigo        VARCHAR(60)  NOT NULL UNIQUE,        -- sim-grajau-2026-10-<semente>
    distrito_id   SMALLINT     NOT NULL REFERENCES distrito(id),
    mes           DATE         NOT NULL CHECK (EXTRACT(DAY FROM mes) = 1),
    cenario       VARCHAR(20)  NOT NULL DEFAULT 'unico',
    semente       INTEGER      NOT NULL CHECK (semente > 0),
    versao_motor  VARCHAR(12)  NOT NULL,
    status        VARCHAR(10)  NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','error')),
    criada_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resumo        JSONB,
    relatorio     JSONB,
    UNIQUE (distrito_id, mes, cenario, semente, versao_motor)
);

CREATE TABLE evento_simulado (
    id            BIGSERIAL    PRIMARY KEY,
    simulacao_id  UUID         NOT NULL REFERENCES simulacao(id) ON DELETE CASCADE,
    instante      TIMESTAMPTZ  NOT NULL,
    tipo          VARCHAR(20)  NOT NULL
                  CHECK (tipo IN ('turno_inicio','turno_fim','problema','pedido','atribuicao','coleta','cancelado')),
    detalhe       JSONB        NOT NULL DEFAULT '{}'
);
CREATE INDEX ix_evento_simulacao ON evento_simulado (simulacao_id, instante);

-- ---------------------------------------------------------------------
-- 4. Tabelas que já existem ganham simulacao_id
-- ---------------------------------------------------------------------
ALTER TABLE execucao_rota
    ADD COLUMN simulacao_id UUID REFERENCES simulacao(id) ON DELETE CASCADE,
    ADD COLUMN km_sem_app   NUMERIC(6,1) CHECK (km_sem_app IS NULL OR km_sem_app >= 0),
    ADD CHECK (simulacao_id IS NOT NULL OR km_sem_app IS NULL);

-- Uma execução por rota e por dia: uma regra para o dado real, outra por simulação.
ALTER TABLE execucao_rota DROP CONSTRAINT execucao_rota_rota_referencia_id_data_key;
CREATE UNIQUE INDEX ux_execucao_real ON execucao_rota (rota_referencia_id, data) WHERE simulacao_id IS NULL;
CREATE UNIQUE INDEX ux_execucao_sim  ON execucao_rota (simulacao_id, rota_referencia_id, data) WHERE simulacao_id IS NOT NULL;

ALTER TABLE solicitacao
    ADD COLUMN simulacao_id UUID REFERENCES simulacao(id) ON DELETE CASCADE,
    ADD COLUMN tipo VARCHAR(20) CHECK (tipo IN ('descarte_irregular','coleta_nao_passou','volume_extra')),
    ADD COLUMN setor_id SMALLINT REFERENCES setor_censitario(id),
    ADD COLUMN kg INTEGER CHECK (kg IS NULL OR kg >= 0);
CREATE INDEX ix_solicitacao_simulacao ON solicitacao (simulacao_id, criado_em) WHERE simulacao_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 5. Trigger: na simulação, o "km fixo" é o km sem o app (rota fixa + zeladoria)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcula_impacto() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_km_fixo NUMERIC;
BEGIN
    IF NEW.simulacao_id IS NOT NULL AND NEW.km_sem_app IS NOT NULL THEN
        v_km_fixo := NEW.km_sem_app;
    ELSE
        SELECT km_fixo INTO v_km_fixo FROM impacto.rota_referencia WHERE id = NEW.rota_referencia_id;
    END IF;
    NEW.km_fixo         := v_km_fixo;
    -- Na simulação o km evitado pode ser negativo (o app pode custar km); no real segue >= 0.
    NEW.km_evitado      := CASE WHEN NEW.simulacao_id IS NULL
                                THEN GREATEST(v_km_fixo - NEW.km_realizado, 0)
                                ELSE v_km_fixo - NEW.km_realizado END;
    NEW.litros_evitados := NEW.km_evitado / impacto.fn_parametro('km_por_litro');
    NEW.co2_evitado_kg  := NEW.litros_evitados * impacto.fn_parametro('kg_co2_por_litro');
    NEW.economia_reais  := NEW.litros_evitados * impacto.fn_parametro('preco_diesel');
    RETURN NEW;
END $$;

DROP TRIGGER trg_execucao_impacto ON execucao_rota;
CREATE TRIGGER trg_execucao_impacto
    BEFORE INSERT OR UPDATE OF km_realizado, km_sem_app, rota_referencia_id ON execucao_rota
    FOR EACH ROW EXECUTE FUNCTION fn_calcula_impacto();

-- A procedure do back continua gravando só dado real.
CREATE OR REPLACE PROCEDURE sp_registrar_execucao(
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
    ON CONFLICT (rota_referencia_id, data) WHERE simulacao_id IS NULL DO UPDATE
        SET km_realizado = EXCLUDED.km_realizado,
            minutos      = EXCLUDED.minutos,
            paradas      = EXCLUDED.paradas,
            kg_coletados = EXCLUDED.kg_coletados;
END $$;

-- ---------------------------------------------------------------------
-- 6. Views: as antigas mostram só dado real; as novas, uma simulação
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_impacto_diario AS
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
WHERE e.simulacao_id IS NULL
GROUP BY e.data, d.id, d.nome;

CREATE OR REPLACE VIEW vw_tempo_atendimento AS
SELECT d.nome AS distrito,
       COUNT(*)                                             AS solicitacoes,
       COUNT(*) FILTER (WHERE s.status = 'Collected')       AS coletadas,
       COUNT(*) FILTER (WHERE s.status = 'Cancelled')       AS canceladas,
       ROUND(AVG(EXTRACT(EPOCH FROM s.atribuido_em - s.criado_em) / 60)) AS min_ate_atribuir,
       ROUND(AVG(EXTRACT(EPOCH FROM s.coletado_em  - s.criado_em) / 60)) AS min_ate_coletar
FROM solicitacao s
JOIN distrito d ON d.id = s.distrito_id
WHERE s.simulacao_id IS NULL
GROUP BY d.nome;

CREATE VIEW vw_simulacao_diaria AS
SELECT e.simulacao_id,
       e.data,
       c.chuva_mm,
       COUNT(*)               AS turnos,
       SUM(e.km_fixo)         AS km_sem_app,
       SUM(e.km_realizado)    AS km_com_app,
       SUM(e.km_evitado)      AS km_evitado,
       SUM(e.co2_evitado_kg)  AS co2_evitado_kg,
       SUM(e.kg_coletados)    AS kg_coletados
FROM execucao_rota e
LEFT JOIN calendario_dia c ON c.data = e.data
WHERE e.simulacao_id IS NOT NULL
GROUP BY e.simulacao_id, e.data, c.chuva_mm;

CREATE VIEW vw_simulacao_pedidos AS
SELECT s.simulacao_id,
       s.tipo,
       COUNT(*)                                       AS pedidos,
       COUNT(*) FILTER (WHERE s.status = 'Collected') AS atendidos,
       ROUND(AVG(EXTRACT(EPOCH FROM s.coletado_em - s.criado_em) / 3600), 1) AS horas_ate_resolver
FROM solicitacao s
WHERE s.simulacao_id IS NOT NULL
GROUP BY s.simulacao_id, s.tipo;

-- Quanto de cada selo entra nos números usados (relatório de veracidade)
CREATE VIEW vw_selos AS
SELECT selo, COUNT(*) AS dados
FROM dado_regional
GROUP BY selo;

-- ---------------------------------------------------------------------
-- 7. Resumo: p_simulacao NULL = dado real (igual ao módulo de impacto)
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_resumo_simulacao(p_simulacao UUID)
RETURNS TABLE (
    turnos BIGINT, km_sem_app NUMERIC, km_com_app NUMERIC, km_evitado NUMERIC,
    litros_evitados NUMERIC, co2_evitado_kg NUMERIC, economia_reais NUMERIC, reducao_pct NUMERIC
)
LANGUAGE sql STABLE AS $$
    SELECT COUNT(*), SUM(km_fixo), SUM(km_realizado), SUM(km_evitado),
           ROUND(SUM(litros_evitados), 1), ROUND(SUM(co2_evitado_kg), 1), ROUND(SUM(economia_reais), 2),
           ROUND(100 * SUM(km_evitado) / NULLIF(SUM(km_fixo), 0), 1)
    FROM impacto.execucao_rota
    WHERE simulacao_id = p_simulacao
$$;

COMMIT;
