// Serviço das rotas /simulations, usado pelo modo demonstração (dentro do app) e pelo mock da API.
// No back real, o mesmo motor roda num serviço Node atrás do Ingress (fase 5).
import { REGIAO } from './regiao';
import { SEMENTE_PADRAO, simulacaoPublica, simular, type Simulacao } from './motor';

export const ETAPAS = [
  'Carregando a região do Grajaú',
  'Gerando moradores e problemas',
  'Rodando os caminhões',
  'Conferindo a calibração',
  'Gravando o mês',
];
const DURACAO_MS = 2500; // tempo de exibição do progresso no app

export interface StatusSimulacao {
  id: string;
  status: 'running' | 'done';
  progresso: number;
  etapa: string;
  simulacao: ReturnType<typeof simulacaoPublica> | null;
}

export class ErroSimulacao extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const guardadas = new Map<string, { sim: Simulacao; inicio: number }>();

export function criarSimulacao(
  body: { regiao?: string; mes?: string; semente?: number } = {},
): StatusSimulacao {
  if ((body.regiao ?? REGIAO.id) !== REGIAO.id)
    throw new ErroSimulacao(400, 'Por enquanto só o Grajaú tem região digital montada.');
  if ((body.mes ?? REGIAO.mes) !== REGIAO.mes)
    throw new ErroSimulacao(
      400,
      'Por enquanto só outubro de 2026 tem chuva e calendário carregados.',
    );
  const semente = Number.isInteger(body.semente) ? Number(body.semente) : SEMENTE_PADRAO;
  if (semente < 1 || semente > 2147483647)
    throw new ErroSimulacao(400, 'A semente deve ser um número inteiro positivo.');
  const sim = simular(semente);
  guardadas.clear(); // uma simulação ativa por vez
  guardadas.set(sim.id, { sim, inicio: Date.now() });
  return statusSimulacao(sim.id);
}

function pegar(id: string) {
  const g = guardadas.get(id);
  if (!g) throw new ErroSimulacao(404, 'Simulação não encontrada. Rode de novo pelo botão.');
  return g;
}

export function statusSimulacao(id: string): StatusSimulacao {
  const g = pegar(id);
  const progresso = Math.min(1, (Date.now() - g.inicio) / DURACAO_MS);
  const done = progresso >= 1;
  return {
    id,
    status: done ? 'done' : 'running',
    progresso,
    etapa: done
      ? 'Pronto'
      : ETAPAS[Math.min(ETAPAS.length - 1, Math.floor(progresso * ETAPAS.length))],
    simulacao: done ? simulacaoPublica(g.sim) : null,
  };
}

export const simulacaoAtiva = () => {
  const [g] = guardadas.values();
  return g ? statusSimulacao(g.sim.id) : null;
};
export const relatorioSimulacao = (id: string) => pegar(id).sim.relatorio;
export const impactoSimulacao = (id: string) => pegar(id).sim.resumo;
export const simulacaoCompleta = (id: string) => pegar(id).sim;
export function apagarSimulacao(id: string) {
  pegar(id);
  guardadas.delete(id);
}
