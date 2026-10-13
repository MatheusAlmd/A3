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

## Licenças

O aviso de licença do template Expo está preservado em [`LICENSE`](LICENSE). As dependências mantêm suas próprias licenças.
