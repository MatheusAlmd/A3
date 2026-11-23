# Módulo de Impacto (Banco de Dados)

Resposta à banca: o banco agora **mede o impacto** do sistema com dados reais de São Paulo.
Ele compara a rota fixa de hoje com a rota feita pelo Coleta e calcula km evitados, diesel, CO₂ e R$.
Recorte: Subprefeitura **Capela do Socorro** (Socorro, Cidade Dutra e Grajaú), 605.383 habitantes (Censo 2022).

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `01-estrutura.sql` | Schema `impacto`: 8 tabelas, constraints, índices, trigger, procedure, views, view materializada e função de resumo. |
| `02-dados.sql` | Dados: território e parâmetros oficiais + 90 dias simulados (3.510 turnos de caminhão, 2.053 pedidos). Gerado por `scripts/gerar-sql-impacto.ts`. |
| `03-consultas.sql` | 12 consultas para mostrar na apresentação. A consulta 11 grava uma rota nova para demonstrar a procedure e o trigger. |

Rodar (PostgreSQL 16+):

```sh
psql -d coleta -f 01-estrutura.sql
psql -d coleta -f 02-dados.sql
psql -d coleta -f 03-consultas.sql
```

## Modelo

```
subprefeitura 1─N distrito 1─N caminhao 1─1 rota_referencia 1─N execucao_rota
                  distrito 1─N ponto_critico 1─N solicitacao
                  distrito 1─N solicitacao
parametro (consumo, fator de CO₂, preço do diesel...) → usado pelo trigger
```

- **rota_referencia**: a rota fixa de hoje de cada caminhão (km por turno). É a base de comparação.
- **execucao_rota**: cada turno realizado pelo Coleta. O trigger `trg_execucao_impacto` calcula sozinho `km_evitado`, `litros_evitados`, `co2_evitado_kg` e `economia_reais`.
- **solicitacao / ponto_critico**: pedidos dos cidadãos e os locais onde o lixo acumula de forma recorrente.
- **parametro**: todo número do cálculo tem fonte e a marcação oficial ou estimativa.

Ligação com o back atual (sem FK entre bancos, como já é feito): `caminhao.id_externo` = `TRUCK.Id`,
`execucao_rota.id_rota_externa` = `COLLECTION_ROUTE.Id`, `solicitacao.id_externo` = `COLLECTION_REQUEST.Id`.

## Conceitos de BD usados

Modelagem e normalização (3FN), chaves e FKs, CHECK e UNIQUE, índices compostos e parciais, trigger,
procedure, função, views, view materializada com ranking (`RANK() OVER`), agregações com `FILTER`,
`date_trunc` e consultas analíticas por período e por distrito.

## Fórmulas

```
km_evitado      = km da rota fixa − km realizado
litros_evitados = km_evitado ÷ consumo (1,1 km/L)
co2_evitado_kg  = litros × 2,603 kg CO₂/L
economia_reais  = litros × R$ 7,25/L
```

## Números (últimos 30 dias da simulação)

| Indicador | Valor |
| --- | --- |
| Turnos de caminhão | 1.170 |
| Km evitados | 8.914,5 km (11,1% a menos que a rota fixa) |
| Diesel economizado | 8.104 L |
| CO₂ evitado | 21,1 t |
| Economia | R$ 58.757 |
| Projeção anual | 254 t de CO₂ · R$ 707 mil |

## Fontes

| Dado | Fonte |
| --- | --- |
| População e domicílios | IBGE, Censo 2022 (Coletânea de indicadores das subprefeituras, Prefeitura de SP) |
| 842 caminhões, 12 mil t/dia | SP Regula, coleta domiciliar |
| 3.549.352 t de lixo domiciliar em 2025 | Prefeitura de SP, coleta de lixo segundo origem 2025 |
| Diesel S10 R$ 7,25/L | ANP, síntese semanal, capital paulista, 01 a 07/11/2026 |
| 2,603 kg CO₂/L e 0,98 a 1,26 km/L | Marques (UnB, 2018), citando o Inventário Nacional |
| Meta de corte de 50% do CO₂ da frota até 2028 | Lei municipal 16.802/2018 (ICCT, 2024) |

Estimativas do grupo (marcadas no banco e no app): 45 caminhões na subprefeitura (proporção da população),
65 km por turno e o cenário de 12% de redução. As rotas e pedidos são **simulados** até o app operar com a concessionária.

## O que o back (.NET) precisa reproduzir

1. **Banco**: criar o schema rodando `01-estrutura.sql` (ou mapear as tabelas no EF Core) e carregar `02-dados.sql`.
2. **Ao fechar uma rota** (última parada confirmada): chamar
   `CALL impacto.sp_registrar_execucao(placa, data, km_realizado, minutos, paradas, kg, route_id)`.
3. **Endpoints** usados pelo app:
   - `GET /management/impact?days=30&districtId=3` (só gestor). `days` = 7, 30 ou 90; `districtId` opcional.
   - `GET /routing/impact` (qualquer usuário logado): resumo de 30 dias para o cartão do cidadão.
4. **Formato da resposta**: o tipo `ImpactSummary` em `src/api/impact.ts`. O mock (`mock-server/`) já responde
   nesse formato e serve de referência. Os totais saem de `impacto.fn_resumo_impacto(dias, distrito)`, o semanal de
   `vw_impacto_diario`, os distritos de `vw_impacto_diario` + `vw_tempo_atendimento` e os pontos críticos de
   `mv_ranking_pontos_criticos`.
