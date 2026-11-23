# Coleta: regras do ponto de coleta

O app agora mostra as regras do ponto de coleta na confirmação do pedido. As regras aparecem como
aviso; quem vai aplicá-las é o back.

---

## Parte 1 · Para você, Anthony

**O que mudou no front:**

- Confirmação do pedido: aviso "Regras do ponto de coleta", dizendo que a conferência está em
  implantação no servidor. O pedido segue normalmente enquanto isso.
- Nada mudou na API: o `POST /routing/collection-requests` continua igual.

**Regras que o back vai aplicar (o limitador):**

1. Ponto de coleta é público: qualquer cidadão pode usar e acompanhar.
2. Entre pontos ativos criados por cidadãos diferentes, distância mínima de 2 km.
3. O lixo não pode estar dentro de uma casa ou terreno particular.
4. Ninguém pode adotar um ponto só para si.

A regra 2 sai da geolocalização. As regras 3 e 4 dependem de conferência (endereço ou moderação
do gestor).

**Decisões em aberto (combinar com o Matheus antes de implementar):**

1. Ponto a menos de 2 km: o pedido novo é **recusado** (o cidadão vê o ponto existente) ou é
   **juntado** ao ponto existente? O prompt abaixo usa "recusar" até essa decisão sair.
2. Regras 3 e 4: a conferência fica com o gestor (moderação) ou é automática pelo endereço?

**Está pronto quando:** dois cidadãos diferentes não conseguem abrir pontos ativos a menos de
2 km um do outro, e o erro volta em ProblemDetails com uma mensagem clara em português.

---

## Parte 2 · Para o Claude (copie e cole)

```
No back do app Coleta (C#/.NET 10, EF Core, PostgreSQL, domínio Routing), implemente o limitador de pontos de coleta. Não mude o front nem os outros domínios.

Regras:
1. Ponto de coleta é público: nenhum cidadão é dono de um ponto.
2. Ao criar um pedido (POST /routing/collection-requests), se já existir um pedido ATIVO (Pending ou Assigned) de OUTRO cidadão a menos de 2 km do ponto informado (distância haversine entre latitude e longitude), recuse com 409 e ProblemDetails: title "Já existe um ponto de coleta por perto", detail com a distância em km e o id do ponto existente. Pedidos do mesmo cidadão não entram nessa regra.
3. Deixe a distância mínima configurável (padrão 2 km) em appsettings.
4. Prepare, sem ligar ainda, um ponto de extensão para validar que o lixo não está em residência nem em ponto "adotado" (por exemplo, uma interface IValidadorDePonto chamada antes de salvar), para receber depois uma moderação do gestor.
5. Crie um índice que ajude a busca por pedidos ativos por região (por exemplo, por status e coordenadas).
6. Testes: dois cidadãos a 1,5 km -> o segundo recebe 409; a 2,5 km -> os dois passam; mesmo cidadão a 0,5 km -> passa; pedido cancelado não bloqueia.
7. Atualize o Swagger com a resposta 409.

Mostre o plano antes de mexer e rode os testes no fim.
```
