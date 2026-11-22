# Guia do Front: App Coleta

## O app em 1 minuto

O front é o **app Coleta**: o aplicativo de celular que as pessoas usam. Ele mostra as informações e envia os pedidos; quem decide qual caminhão atende cada coleta é o back-end.

- **Cidadão:** pede uma coleta e acompanha o status.
- **Motorista:** vê a rota do dia, vai de parada em parada e confirma cada coleta.
- **Gestor:** acompanha os pedidos, cria rotas, cadastra caminhões e pessoas.

O app sabe quem você é pelo login e mostra só as telas do seu perfil.

## Tecnologias usadas

A base é **React Native + Expo + TypeScript**: um só código vira app de Android, de iPhone e uma versão web.

| Tecnologia | Para que serve |
| --- | --- |
| React Native | Cria o app de celular usando React. |
| Expo (SDK 57) | Facilita rodar, testar e gerar o app sem configurar Android/iPhone na mão. |
| TypeScript | JavaScript com tipos: avisa erros antes de rodar. |
| Expo Router | Navegação entre telas, como as rotas de um site. |
| react-native-maps | Mapa real no celular. Na web aparece um mapa ilustrativo. |
| expo-location | GPS do celular (motorista e cidadão). |
| expo-secure-store | Guarda o login com segurança no celular. |
| Lucide | Ícones. |
| Fonte Manrope | Fonte de todos os textos. |

Testes: `npm test` roda os testes automáticos; `npm run typecheck` confere os tipos.

## Como o código está organizado

| Pasta | O que tem |
| --- | --- |
| `src/app/` | As rotas de cada tela e quem pode acessar cada uma. |
| `src/screens/` | As telas: login, cidadão, motorista, gestor, mapa, perfil. |
| `src/ui/` | Peças visuais reaproveitadas: botões, cartões, cores, mapa. |
| `src/api/` | A conversa com o back-end e o modo demonstração. |
| `src/state/` | O login (sessão) do usuário. |
| `src/hooks/` | Lógicas reaproveitadas: buscar dados e enviar GPS. |
| `src/navigation/` | As abas de baixo de cada perfil. |
| `docs/` | Contrato da API (`openapi.json`), análise da API e materiais da apresentação. |
| `tests/` | Testes automáticos. |
| `mock-server/` | Mock da API para rodar app + back juntos. |
| `site-demo/` | Site de demonstração com o celular 3D e o app dentro. |

Arquivos-chave: `src/api/client.ts` (todas as chamadas à API), `src/api/demo.ts` (dados fictícios) e `src/ui/theme.ts` (cores e textos dos status).

## Como uma tela funciona por dentro

Toda tela segue o mesmo caminho:

1. **Tela** (ex.: Suas coletas) mostra os dados.
2. **useResource** busca os dados e repete a cada 15 a 20 s.
3. **client.ts** monta a chamada e envia o token (JWT).
4. Vai para **demo.ts** (modo demonstração, dados fictícios) ou para a **API do back-end** (C# / .NET, porta 5073), que guarda tudo no PostgreSQL.

A resposta volta pelo mesmo caminho. Enquanto espera, a tela mostra "Só um instante…"; se der erro, mostra a mensagem e um botão "Tentar novamente".

## O que cada perfil faz

| Perfil | Abas | O que dá para fazer |
| --- | --- | --- |
| Cidadão | Início, Coletas, Mapa, Perfil | Pedir coleta (GPS ou ponto no mapa), ver se tem caminhão perto, acompanhar, cancelar, tentar de novo. |
| Motorista | Minha rota, Mapa, Perfil | Ver a rota do dia, iniciar, abrir o Google Maps até a parada, confirmar a coleta, ligar o GPS. |
| Gestor | Visão geral, Rotas, Frota, Equipe | Ver o resumo, criar e cancelar rotas, cadastrar caminhões e pessoas, ligar motorista ao caminhão. |

Status de uma coleta: **Aguardando** (sem caminhão), **Atribuída** (na rota de um caminhão), **Coletada** (motorista confirmou), **Cancelada**. Quando o motorista confirma a última parada, a rota fecha sozinha.

## Modo demonstração x back-end real

| | Modo demonstração | Back-end real |
| --- | --- | --- |
| Dados | Fictícios, no próprio app (`demo.ts`) | API do back (C# / .NET) |
| Precisa de servidor? | Não | Sim, porta 5073 |
| Login | Botões "Explorar como Cidadão/Motorista/Gestor" | E-mail e senha |
| Mudanças ficam salvas? | Não | Sim, no PostgreSQL |

Para trocar, no `.env`: `EXPO_PUBLIC_DEMO_MODE=false` e `EXPO_PUBLIC_API_URL=http://IP-DO-COMPUTADOR:5073`.

## Mapa, GPS, login e segurança

- **Mapa:** real no celular; ilustrativo na web. A linha entre paradas mostra a ordem, não o caminho pelas ruas. "Abrir navegação" abre o Google Maps.
- **GPS do motorista:** ligado em "Compartilhar GPS"; envia a posição a cada 20 s, só com o app aberto.
- **Login:** o back devolve um token JWT. No celular fica no SecureStore; na web, só na memória. Token vencido ou 401 desloga.
- **Segurança:** o app esconde telas por perfil, mas quem garante a permissão é o back.

## Limites atuais e próximos passos

Não tem hoje: previsão de chegada, foto, notificação, recuperar senha, editar perfil, pular parada, exclusão de caminhão.

- [ ] Testar o app ligado ao back em Android e iPhone
- [ ] Mapa e status em tempo real (SignalR)
- [ ] GPS do motorista com o app em segundo plano

Melhorias possíveis: mostrar a placa do caminhão no mapa; seletor de data na criação de rota; escolher o ponto de saída da rota.

## Glossário rápido

| Termo | Em palavras simples |
| --- | --- |
| Front-end | A parte que a pessoa vê e toca: as telas. |
| Back-end | O servidor que guarda os dados e toma as decisões. |
| API | O "cardápio" de pedidos que o front pode fazer ao back. |
| Endpoint | Um item desse cardápio, ex.: `GET /account/me`. |
| OpenAPI / Swagger | O documento que descreve a API inteira. |
| JWT (token) | Crachá digital que prova quem você é, com validade. |
| Componente | Peça de tela reaproveitável. |
| Hook | Função do React com uma lógica reaproveitável. |
| Polling | Buscar os dados de novo de tempos em tempos. |
| 401 / 403 / 404 / 409 | Não logado / sem permissão / não encontrado / conflito. |
| SignalR | Tecnologia de tempo real planejada pelo back. |
