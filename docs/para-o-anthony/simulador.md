# Coleta: simulador no back (fase 5)

O botão **Simular 1 mês** já funciona no app e no mock. Falta o back: rodar o SQL novo e subir um
serviço Node que atende `/simulations`. O domínio do back (Account, Management, Routing) não muda.

Detalhes do simulador e números de referência: `docs/banco-simulacao/README.md`.

---

## Parte 1 · Para você, Anthony

**Já está pronto (neste repositório, branch `main`):**

- Motor do simulador em TypeScript: `src/simulador/` (fontes com selo, região do Grajaú, motor, serviço).
- Botão Simular 1 mês na aba Impacto, funcionando no modo demonstração e no mock.
- SQL testado no PostgreSQL: `docs/banco-simulacao/01-estrutura.sql` (9 tabelas, `simulacao_id`,
  trigger e views), `02-dados.sql` (mês de exemplo) e `03-consultas.sql`.

**O que você faz:**

1. Rodar no banco, nesta ordem: `banco-impacto/01` e `02` (se ainda não rodou), depois
   `banco-simulacao/01-estrutura.sql`. O `02-dados.sql` é só para teste.
2. Subir um serviço Node chamado `simulador` no Docker Compose (e no Kubernetes), usando o motor de
   `src/simulador`. Ele grava no schema `impacto`.
3. No Ingress, mandar o prefixo `/simulations` para esse serviço. Só gestor acessa, com o mesmo JWT do back.

| Rota | Resposta |
| --- | --- |
| `POST /simulations` | 202 com o status (id, progresso, etapa) |
| `GET /simulations` | Simulação ativa ou null |
| `GET /simulations/{id}` | Status e, quando pronta, o mês simulado |
| `GET /simulations/{id}/report` | Relatório de veracidade |
| `DELETE /simulations/{id}` | 204; apaga tudo dela no banco |

**Está pronto quando:** o botão roda com o back ligado e, com a semente 20261031,
`fn_resumo_simulacao` dá 594 turnos e 659,2 km evitados. Apagar a simulação remove turnos, pedidos
e eventos dela, e o dado real não muda.

---

## Parte 2 · Para o Claude (copie e cole)

Cole no Claude com o repositório do back aberto e o do front (MatheusAlmd/A3) ao lado.

```
Você vai integrar o simulador de 1 mês do app Coleta ao back (C#/.NET 10, PostgreSQL 17, Docker Compose, Kubernetes e Ingress). Não mude os domínios existentes (Account, Management, Routing) nem o front.

Referências no repositório do front (MatheusAlmd/A3):
- src/simulador/motor.ts: função simular(semente) e simulacaoPublica(s). Depende de src/simulador/fontes.ts, src/simulador/regiao.ts e src/api/impact.ts.
- src/simulador/servico.ts: contrato das rotas e formato StatusSimulacao (id, status running|done, progresso 0-1, etapa, simulacao).
- scripts/gerar-sql-simulacao.ts: como cada resultado vira linha no banco.
- docs/banco-simulacao/01-estrutura.sql: tabelas, trigger e views.

Tarefas:
1. Banco: aplicar docs/banco-impacto/01-estrutura.sql e 02-dados.sql (se ainda não existirem) e depois docs/banco-simulacao/01-estrutura.sql como migração. Não aplicar docs/banco-simulacao/02-dados.sql fora do ambiente de teste.
2. Serviço simulador (Node 22 + TypeScript): copiar src/simulador e src/api/impact.ts do front e expor:
   POST /simulations {regiao:'grajau', mes:'2026-10', semente} -> 202 + StatusSimulacao
   GET /simulations -> simulação ativa ou null
   GET /simulations/{id} -> StatusSimulacao (progresso pode ser real)
   GET /simulations/{id}/report -> relatorio da simulação
   DELETE /simulations/{id} -> 204, apaga a linha de simulacao (o ON DELETE CASCADE apaga o resto)
   Erros em ProblemDetails (title, status, detail), como o back. Região ou mês diferentes de grajau/2026-10 -> 400.
3. Gravação: quando a simulação terminar, gravar numa transação, com o pacote pg, as mesmas linhas que scripts/gerar-sql-simulacao.ts gera: simulacao (status done, resumo e relatorio em JSONB), execucao_rota (simulacao_id, km_realizado = kmComApp, km_sem_app = kmSemApp), solicitacao (simulacao_id, tipo, setor_id, kg) e evento_simulado. As tabelas fonte_dado, dado_regional, divergencia, setor_censitario, setor_coleta, ponto_interesse e calendario_dia são carregadas uma vez, do 02-dados.sql sem as linhas da simulação, ou pelo serviço na subida.
4. Autenticação: validar o mesmo JWT do back e aceitar só o papel Manager.
5. Docker Compose e Kubernetes: serviço simulador com DATABASE_URL e a chave do JWT; no Ingress, o prefixo /simulations vai para o simulador.
6. Testes: com a semente 20261031, SELECT * FROM impacto.fn_resumo_simulacao(<id>) deve dar 594 turnos, km_evitado 659,2 e co2_evitado_kg perto de 1560. Depois do DELETE, nenhuma linha com aquele simulacao_id sobra, e impacto.vw_impacto_diario continua igual para o dado real.

Mostre o plano antes de mexer e rode os testes no fim.
```
