# A3 · Coleta

Aplicativo de coleta de lixo em React Native, Expo e TypeScript. A navegação muda conforme o perfil autenticado: cidadão, motorista ou gestor.

## Funcionalidades

- **Cidadão:** cadastro, login, solicitação de coleta, consulta de disponibilidade, acompanhamento, cancelamento e nova tentativa de atribuição.
- **Motorista:** consulta e início da rota, sequência de paradas, compartilhamento de localização e confirmação de coleta.
- **Gestor:** visão operacional, solicitações, rotas, frota, vínculos de motoristas e gestão de usuários.

O aplicativo inclui estados de carregamento, listas vazias, erros de rede, validação de formulários e sessão expirada. As telas usam áreas seguras, textos escaláveis e controles com rótulos de acessibilidade.

## Executar

Requisitos: Node.js 24, npm e Expo Go compatível com o SDK 57 ou um development build.

```sh
npm ci
npm start
```

Abra o aplicativo pelo QR code do Expo. Para executar a prévia no navegador:

```sh
npm run web
```

A versão web utiliza o mesmo código React Native, com um mapa ilustrativo. No celular, os mapas usam `react-native-maps`.

## Modo demonstração

O modo demonstração funciona sem servidor e está habilitado por padrão. Na entrada, escolha um dos três perfis. A troca de perfil também está disponível na tela de perfil.

Os dados são fictícios, compartilhados entre os perfis na mesma sessão e reiniciados ao recarregar o aplicativo. O login demonstrativo não verifica senhas reais. Solicitações, paradas, rotas, caminhões e usuários podem ser manipulados para explorar os fluxos.

## Rodar com o mock da API

Enquanto o back-end real não está disponível, a pasta [`mock-server/`](mock-server/) traz um servidor que imita a API do contrato `docs/openapi.json`: mesmas rotas, formatos, códigos de status, login com JWT, erros ProblemDetails e CORS. Os dados ficam em memória e voltam ao estado inicial quando o servidor para.

Um único comando sobe o mock na porta 5073 e o app no navegador, já conectado a ele:

```sh
npm ci
npm run dev:api
```

Abra `http://localhost:8081`. Contas de teste, todas com a senha `coleta123`:

| Perfil | E-mail |
| --- | --- |
| Gestor | `camila@exemplo.com` |
| Motorista | `rafael@exemplo.com` |
| Cidadão | `mariana@exemplo.com` |

Também é possível criar uma conta de cidadão pela tela de cadastro. Na prévia web o token fica só na memória: recarregar a página encerra a sessão.

Para abrir no celular com Expo Go, na mesma rede Wi-Fi do computador, use `npm run dev:api -- --lan` e leia o QR code. O app passa a usar o IP do computador para falar com o mock; o firewall do Windows pode pedir permissão para o Node.

O que o mock faz, além de responder às rotas:

- Atribui cada nova solicitação ao caminhão em rota com o menor desvio (inserção mais barata, até 15 km) e reprocessa a fila de pendentes.
- Mantém online e em movimento os caminhões com rota em andamento quando o motorista não está compartilhando o GPS.
- Reordena as paradas de rotas novas pelo vizinho mais próximo (`optimize`) e calcula a distância estimada.
- Aplica as permissões por perfil: gestor, motorista do caminhão ou dono da solicitação.

Para subir só o mock: `npm run mock`. As variáveis `MOCK_PORT`, `MOCK_SIMULATE=false` e `MOCK_LOG=false` ajustam porta, simulação e log. O teste `tests/mock-server.test.ts` usa o cliente HTTP do app contra o mock, exercita todas as operações do contrato e valida cada resposta com o schema do OpenAPI.

Quando o back-end real estiver pronto, basta rodá-lo na porta 5073 no lugar do mock, ou apontar `EXPO_PUBLIC_API_URL` para ele.

## Conectar à API

Copie `.env.example` para `.env` e configure a URL do servidor:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=http://IP-DO-COMPUTADOR:5073
```

Reinicie o Expo após alterar as variáveis. Em celular físico, use o IP do computador na mesma rede, com o servidor acessível por essa interface. No emulador Android, o endereço usual do computador é `10.0.2.2`. A prévia web pode exigir configuração de CORS no servidor. Use HTTPS no ambiente de produção.

O contrato está em [`docs/openapi.json`](docs/openapi.json). O cliente HTTP cobre todas as operações documentadas, interpreta respostas vazias e erros ProblemDetails e envia JWT nas operações autenticadas.

O login usa `/account/login`, e `user.role` determina a navegação. O cadastro público cria um cidadão e direciona para login. Em caso de expiração do token ou resposta 401, a sessão é encerrada. No aplicativo nativo, o token fica no SecureStore; na prévia web, apenas em memória. A autorização de cada operação deve ser aplicada pelo servidor.

## Mapas e localização

Para uma build Android com Google Maps, configure `GOOGLE_MAPS_API_KEY` no ambiente de build e habilite o SDK correspondente. A chave é usada pelo plugin de configuração. Credenciais de servidor não devem ser colocadas em variáveis `EXPO_PUBLIC_*`, pois elas fazem parte do aplicativo distribuído.

O motorista ativa **Compartilhar GPS** durante uma rota em andamento. Com permissão concedida, o aplicativo envia a posição a cada 20 segundos enquanto estiver em primeiro plano. Encerrar a rota ou sessão e colocar o aplicativo em segundo plano interrompem os envios.

As linhas entre paradas representam sua sequência. **Abrir navegação** direciona ao serviço externo de mapas para obter o trajeto pelas ruas.

## Estrutura

| Diretório | Responsabilidade |
| --- | --- |
| `src/app/` | Rotas e layouts do Expo Router, protegidos por sessão e perfil |
| `src/screens/` | Telas e fluxos dos três perfis |
| `src/navigation/` | Navegação entre telas e configuração das abas |
| `src/ui/` | Tema, componentes, ilustrações e mapas por plataforma |
| `src/api/` | Cliente HTTP, modelos, erros e transporte demonstrativo |
| `src/state/` | Sessão e armazenamento do token |
| `src/hooks/` | Atualização de dados e envio de localização |
| `docs/` | Contrato da API e decisões de integração |
| `tests/` | Testes do cliente HTTP e dos fluxos demonstrativos |

## Verificação

```sh
npm run typecheck
npm run lint
npm test
npm run export:web
npm run export:native
```

Os testes verificam cobertura das operações do contrato, autenticação, campos anuláveis, respostas 204/400/401 e os ciclos de coleta, rota, usuários e frota. As exportações geram bundles; não produzem APK ou IPA.

Para servir a versão web exportada, execute `npm run preview` e abra `http://127.0.0.1:4173`.

## Limites atuais

- Rastreamento de localização funciona em primeiro plano. Rastreamento em segundo plano exige implementação adicional e configuração nativa.
- O contrato não oferece ETA, fotos, comprovantes, recuperação de senha, notificações push ou edição de perfil.
- A integração com o servidor e o comportamento de mapas, GPS, teclado e acessibilidade precisam ser validados em aparelhos Android e iOS antes da distribuição.
- Consulte `npm audit` ao atualizar dependências. Atualizações do ecossistema Expo devem manter as versões compatíveis com o SDK utilizado.

Detalhes do contrato e das decisões de interface: [`docs/analise-da-api.md`](docs/analise-da-api.md).

## Site de demonstração

A pasta [`site-demo/`](site-demo/) contém o celular interativo e a exportação web do app em `/app/`, com publicação estática no projeto Vercel `coleta-a3`. As instruções para atualizar e publicar estão no [guia da demonstração](site-demo/README.md).

## Licenças

O aviso de licença do template Expo está preservado em [`LICENSE`](LICENSE). As dependências mantêm suas próprias licenças.
