# Cola da apresentação A3

## O projeto em 3 frases

- **Problema:** as rotas de coleta são fixas e montadas à mão. Um pedido novo fica de fora, e o caminhão não sabe quem pediu coleta perto dele.
- **Solução:** o cidadão pede a coleta pelo app e o sistema coloca essa parada na rota do caminhão que precisa desviar menos, na hora.
- **Como:** o app (front, Matheus) mostra e envia os pedidos; o servidor (back, Anthony) decide o caminhão e guarda tudo no banco.

Os 3 requisitos principais (Must Have): **solicitar coleta**, **despacho automático** e **gestão da frota**.

## Minha parte: o front

**O que você fez?** O app Coleta, de celular. Cada pessoa entra e vê as telas do seu perfil: cidadão, motorista ou gestor.

**Com o que foi feito?** React Native com Expo e TypeScript. Um código só vira app de Android, iPhone e uma versão web.

**Por que app e não site?** Quem usa está na rua. O app acessa o GPS e o mapa do celular.

**Como o app fala com o back?** Pela API. Cada ação vira uma chamada, e o app manda junto o token (JWT) que recebeu no login.

**O que cada perfil faz?**
- Cidadão: pede a coleta e acompanha (Aguardando, Atribuída, Coletada).
- Motorista: segue as paradas, abre o Google Maps e confirma cada coleta.
- Gestor: vê os pedidos, cria rotas, cadastra caminhões e pessoas.

**O app decide qual caminhão vai?** Não. Ele só mostra uma prévia. Quem decide é o back.

**Atualiza em tempo real?** Quase: as telas principais buscam os dados de novo a cada 15 a 20 segundos. Tempo real de verdade (SignalR) é o próximo passo.

**E o GPS do motorista?** Ele liga "Compartilhar GPS" e o app envia a posição a cada 20 segundos, com o app aberto.

**Funciona sem o servidor?** Sim, no modo demonstração, com dados fictícios. Serve para apresentar e testar.

## O sistema inteiro

**Back-end:** C# com .NET 10 (ASP.NET Core), EF Core para falar com o banco e JWT para o login.

**Banco:** PostgreSQL 17, com um banco para cada área:

| Área | Cuida de | Tabelas |
| --- | --- | --- |
| Account | Usuários e login | USER |
| Management | Caminhões e rotas | TRUCK, COLLECTION_ROUTE, ROUTE_STOP |
| Routing | Pedidos e GPS | COLLECTION_REQUEST, TRUCK_LOCATION |

**Como as tabelas se ligam:** o caminhão (TRUCK) liga o motorista (USER) às rotas e à posição. Cada parada (ROUTE_STOP) pode vir de um pedido do cidadão (COLLECTION_REQUEST). Entre bancos diferentes não tem chave estrangeira: a ligação é pelo Id, e os serviços conversam por um mediador HTTP.

**Arquitetura:** monolito modular. Um código só, mas roda como 3 serviços separados (mesma imagem Docker; a variável APP_DOMAIN diz qual área cada um é). Um Ingress recebe as chamadas e manda para o serviço certo. Roda com Docker Compose e Kubernetes. Em desenvolvimento usa banco em memória.

**O algoritmo (CollectionDispatcher):** para cada caminhão, calcula quantos km a mais a rota ficaria com a nova parada. Se passar do limite, descarta. Entre os que sobram, ganha o de menor desvio + mais perto.

**Ciclo do pedido:** Pending → Assigned → Collected. Pode virar Cancelled se o cidadão cancelar. Se a rota for cancelada, volta para Pending. Sem caminhão elegível, fica Pending e o sistema tenta de novo a cada 30 segundos.

## Perguntas difíceis

**O front já está ligado ao back?** O app já tem todas as chamadas da API prontas, seguindo o contrato (Swagger). Falta testar os dois juntos em celulares reais; por isso a demonstração usa dados fictícios.

**Por que um banco por área e não um só?** Cada serviço cuida dos seus dados e pode crescer sozinho. O custo disso é o que o grupo está estudando.

**Qual o risco dessa separação?** Não tem transação entre bancos. Se uma etapa falhar no meio, hoje só fica no log. A melhoria planejada é usar fila (outbox).

**Onde fica a segurança?** No back. O app esconde telas por perfil, mas é o back que confere o token em toda chamada.

**A distância é pelas ruas?** Ainda não, é em linha reta. Usar as ruas de verdade (OSRM) e a capacidade do caminhão está nos próximos passos.

**Não sabe a resposta?** Diga que essa parte é do back e passe para o Anthony.
