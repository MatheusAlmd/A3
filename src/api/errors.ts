import type { Problem } from './types';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function problemMessage(status: number, problem: Problem): string {
  if (status === 401) return 'Sua sessão terminou. Entre novamente para continuar.';
  if (status === 403) return 'Seu perfil não tem acesso a esta ação.';
  if (status === 404) return 'Este registro não foi encontrado. Atualize a tela.';
  return (
    problem.detail ||
    problem.title ||
    (status === 409
      ? 'O registro mudou ou já existe. Atualize e tente novamente.'
      : 'Não foi possível concluir. Tente novamente.')
  );
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocorreu um erro. Tente novamente.';
}
