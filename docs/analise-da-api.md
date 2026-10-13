# Coleta — análise do contrato e decisões de interface

Contrato: `docs/openapi.json`, OpenAPI 3.1.1, ProjetoA3 — Coleta de Lixo, v1. Aplicativo: React Native + Expo + TypeScript.

## Jornadas

**Cidadão (Citizen):** cadastro público → login → solicitar coleta por coordenadas, endereço opcional e observação opcional → simular disponibilidade → confirmar → acompanhar Pending/Assigned/Collected/Cancelled → cancelar quando ainda possível ou tentar nova atribuição quando pendente. Navegação: Início, Coletas, Mapa, Perfil.

**Motorista (Driver):** login → rota atual ou próxima planejada → iniciar → compartilhar GPS em primeiro plano a cada 20 s → consultar paradas em sequência → abrir navegação externa → confirmar coleta. A última parada pendente concluída encerra a rota no servidor. Navegação: Minha rota, Mapa, Perfil.

**Gestor (Manager):** login → resumo operacional → solicitações → rotas (listar, filtrar, criar, iniciar, cancelar e completar paradas) → frota (listar, cadastrar e vincular/desvincular motorista) → equipe (listar, cadastrar com perfil e ativar/desativar). Navegação: Visão geral, Rotas, Frota, Equipe; solicitações acessíveis pelo resumo.

## Decisões fundamentadas no contrato

- A autenticação retorna `accessToken`, `expiresAt` e o perfil do usuário. O aplicativo escolhe a navegação pelo perfil retornado; o cadastro público sempre cria Citizen. A troca de perfis existe somente na demonstração.
- Há uma rota própria para o motorista: `GET /management/routes/current`. `204` significa ausência de rota e deve produzir uma tela vazia útil.
- `GET /management/routes` retorna resumos, não o detalhe com paradas. O detalhe é obtido em `GET /management/routes/{id}`.
- `POST /management/routes` produz Planned. Iniciar depende de `/start`. Não há endpoint genérico de edição de rota, inclusão avulsa de paradas, remoção ou conclusão manual de rota.
- `Skipped` existe no enum de paradas, mas não existe endpoint para pular uma parada. Não será oferecida essa ação.
- Não há ETA, comprovantes, fotos, categoria de resíduo, peso coletado, pagamento, avaliação, push, recuperação de senha, alteração de perfil ou exclusão de caminhão. Nenhuma dessas funcionalidades é apresentada como disponível.
- Endereço é uma anotação; localização válida depende de latitude e longitude. A interface permite GPS ou coordenadas manuais. Geocodificação de endereços não é prometida.
- Preview apresenta `hasCandidate`, `distanceFromTruckKm` e `detourKm`. Distância não deve ser convertida em minutos nem descrita como ETA. A atribuição definitiva é a resposta da criação; o preview pode ficar desatualizado.
- Pending significa fila de atribuição automática. Assigned significa vinculação a caminhão/rota, não necessariamente que o caminhão já está chegando.
- A posição do caminhão tem `isOnline`, `recordedAt` e `receivedAt`. A interface distingue última posição de GPS atualizado e não presume online pela existência de coordenadas.
- A documentação da posição gerencial menciona rota em andamento, mas o schema `TruckLocationResponse` não possui `routeId`. O gestor cruza rotas e caminhões por `truckId`; não inventa esse campo.
- Os schemas permitem números também como strings. Tipos preservam essa possibilidade e o código converte explicitamente para cálculos/mapas.
- Campos anuláveis marcados required são enviados explicitamente com `null` quando vazios. A ativação de usuário usa `PATCH /account/users/{id}/active?active=true`, sem corpo.
- Não há refresh token nem endpoint de logout. Ao expirar ou receber 401, o aplicativo remove a sessão e pede novo login. Logout remove a sessão local.
- O contrato indica gestor/dono/motorista em descrições, mas não publica uma matriz completa de permissões. Navegação limita as ações por perfil, e o servidor deve aplicar autorização. 403 aparece com mensagem própria; a GUI não contorna autorização.

## Arquitetura e integração

Cliente HTTP tipado cobre todas as operações documentadas. Modo padrão: demonstração com dados fictícios e alterações em memória. Modo real: `EXPO_PUBLIC_DEMO_MODE=false` e `EXPO_PUBLIC_API_URL` apontando ao back-end. Tokens nativos em SecureStore; no preview web, somente em memória. Requisições têm timeout, interpretação de ProblemDetails/ValidationProblemDetails e tratamento de 204.

GPS: solicitação explícita de permissão e transmissão apenas durante rota InProgress, com app em primeiro plano e compartilhamento habilitado. Encerrar sessão, sair da rota ativa ou colocar app em segundo plano interrompe os envios. Rastreamento contínuo em segundo plano exige implementação adicional com development build, serviço e task de localização.

Mapas nativos usam react-native-maps; no preview web, um mapa esquemático local é identificado como ilustrativo. Linhas entre paradas mostram sequência e não uma navegação calculada por ruas. Navegação por ruas usa o aplicativo de mapas do aparelho. Uma build Android com Google Maps exige chave do provedor.

## Design, acessibilidade e responsividade

Paleta: verde floresta, verde suave, creme e lima. Tipografia Manrope com hierarquia clara. Cards com contraste, bordas discretas e raios consistentes. Ícones vetoriais. Estados não dependem apenas de cor. Alvos de toque mínimos de 44 px, textos escaláveis, labels acessíveis, safe areas e formulários com ajuste de teclado. A largura útil permanece confortável em tablet e no preview desktop; telefones utilizam a tela inteira, sem menu lateral.

## Estados essenciais

Carregamento inicial, atualização por gesto, lista vazia, sem rota, sem motorista, sem localização, permissão de GPS negada, sem caminhão elegível, erro de rede, timeout, validação por campo, sessão expirada, acesso negado e conflito 409. Ações de criação/conclusão bloqueiam envio duplicado enquanto aguardam o servidor. Cancelamentos e desativação exigem confirmação contextual no aplicativo.

## Pontos a confirmar com o back-end

1. Regras de senha, formatos de placa e validação de paradas não detalhadas no OpenAPI.
2. Perfis autorizados a listar posições, iniciar rotas, completar paradas e tentar atribuição.
3. Política de cancelar uma solicitação já atribuída e cancelar rotas em andamento.
4. Duração do token, configuração CORS no preview web e URL acessível pelo celular.
5. Suporte a tracking em segundo plano, push, geocodificação e navegação calculada, se entrarem em escopo futuro.

Referências técnicas: [Expo](https://docs.expo.dev/), [Location](https://docs.expo.dev/versions/latest/sdk/location/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [MapView](https://docs.expo.dev/versions/latest/sdk/map-view/), [acessibilidade React Native](https://reactnative.dev/docs/accessibility).
