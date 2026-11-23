// Fotos dos pontos de coleta: ficam só na memória desta sessão do app.
// Não vão para a API, não são gravadas no aparelho e somem ao fechar ou recarregar o app.
const fotos = new Map<string, string>();

export const guardarFotoDaSessao = (pedidoId: string, uri: string) => fotos.set(pedidoId, uri);
export const fotoDaSessao = (pedidoId: string) => fotos.get(pedidoId) ?? null;
