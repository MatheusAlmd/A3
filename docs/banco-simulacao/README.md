# Simulador de 1 mês (Grajaú, outubro de 2026)

Botão **Simular 1 mês** na aba Impacto do gestor. Simula um mês de uso do Coleta no Grajaú
sobre dados públicos conferidos. Moradores, pedidos e operação são simulados. Cada número tem selo:
oficial, derivado, estimado ou hipótese.

## Onde está cada parte

| Parte | Arquivo |
| --- | --- |
| Fontes, dados com selo e divergências (fase 1) | `src/simulador/fontes.ts` |
| Coletor dos arquivos brutos (roda numa máquina com acesso aos sites públicos) | `scripts/coletar-fontes.ts` |
| Região digital do Grajaú (fase 2) | `src/simulador/regiao.ts` |
| Motor de eventos, calibração e relatório (fase 3) | `src/simulador/motor.ts` |
| Rotas `/simulations` no modo demonstração e no mock | `src/simulador/servico.ts` |
| Botão, progresso, faixa SIMULAÇÃO e relatório (fase 4) | `src/screens/Simulation.tsx` |
| Banco: estrutura, dados e consultas (fase 5) | `docs/banco-simulacao/01-estrutura.sql`, `02-dados.sql`, `03-consultas.sql` |

## Como rodar

```bash
npx tsx scripts/gerar-sql-simulacao.ts          # gera 02-dados.sql (semente padrão 20261031)
psql -d coleta -f docs/banco-impacto/01-estrutura.sql
psql -d coleta -f docs/banco-impacto/02-dados.sql
psql -d coleta -f docs/banco-simulacao/01-estrutura.sql
psql -d coleta -f docs/banco-simulacao/02-dados.sql
psql -d coleta -f docs/banco-simulacao/03-consultas.sql
```

## Resultado com a semente 20261031

| Métrica | Valor |
| --- | --- |
| Domicílios com o app no fim do mês | 4.054 (3%, hipótese) |
| Problemas no mês / pedidos no app | 1.726 / 645 |
| Tempo até limpar um descarte | 5,3 h com o app; 72 h sem (hipótese) |
| Coleta que não passou | 1,4 h com o app; 49,2 h sem (próxima passagem) |
| Km evitados | 659 km (1,0%), 1,56 t de CO₂, R$ 4.345 |
| Mesmo mês sem a janela de 12 h no despacho | 1.047 km a MAIS, descarte em 2,4 h |
| Calibração (Portão B) | 6 de 6 alvos dentro da faixa |

## O que ainda é estimado

Os sites da Prefeitura, do IBGE e do INMET não abrem no ambiente onde o simulador foi montado. Por isso
estes itens estão com selo **estimado** até o coletor rodar numa máquina com acesso:

- setores provisórios (posição e peso) no lugar dos setores censitários do IBGE;
- grupo e turno da coleta por setor no lugar da consulta por CEP da SP Regula;
- chuva de cada dia (o total de 271,2 mm e os 19 dias de chuva são oficiais);
- lugar e dia das feiras (a quantidade, 33, é derivada);
- coordenadas do transbordo e da garagem.

## Divergência nova encontrada pela simulação

O módulo de impacto usa 73 km por turno no Grajaú. Pela distância até o transbordo Santo Amaro,
o turno dá cerca de 104 km. O valor de 65 km do módulo de impacto deve ser revisto.
