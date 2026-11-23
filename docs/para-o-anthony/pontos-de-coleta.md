# Coleta: foto e regras do ponto de coleta

O app agora deixa o cidadão anexar uma foto do lixo ao criar o pedido e mostra as regras do ponto
de coleta. A foto fica só na memória da sessão do app: não é enviada para a API nem guardada.
As regras aparecem como aviso; quem vai aplicá-las é o back.

---

## Parte 1 · Para você, Anthony

**O que mudou no front:**

- Criar coleta: novo campo "Foto do lixo (opcional)", com câmera ou galeria. A foto aparece na
  confirmação e no detalhe do pedido até o app ser fechado.
- Confirmação: aviso "Regras do ponto de coleta", dizendo que a conferência está em implantação
  no servidor. O pedido segue normalmente enquanto isso.
- Nada mudou na API: o `POST /routing/collection-requests` continua igual.

**Regras que o back vai aplicar (o limitador):**

1. Ponto de coleta é público: qualquer cidadão pode usar e acompanhar.
2. Entre pontos ativos criados por cidadãos diferentes, distância mínima de 2 km. Se já existir
   um ponto ativo a menos de 2 km, o pedido novo não abre um ponto novo: é recusado com a
   mensagem do ponto existente, ou ligado a ele (decidir com o Matheus).
3. O lixo não pode estar dentro de uma casa ou terreno particular.
4. Ninguém pode adotar um ponto só para si.

A regra 2 sai da geolocalização. As regras 3 e 4 dependem de conferência (foto, endereço ou
moderação do gestor). Hoje a foto não chega ao servidor; se ela for usada na validação, o front
precisa enviá-la e o back deve descartá-la depois de conferir.

**Decisões em aberto (combinar com o Matheus antes de implementar):**

1. Ponto a menos de 2 km: o pedido novo é **recusado** (o cidadão vê o ponto existente) ou é
   **juntado** ao ponto existente? O prompt abaixo usa "recusar" até essa decisão sair.
2. Foto: hoje ela não chega ao servidor, então o back não consegue conferir por ela se o lixo está
   em residência. Opções: (a) o app envia a foto só para essa conferência e o back apaga logo
   depois, sem gravar; (b) a conferência fica com o gestor, sem foto no servidor.

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
4. Prepare, sem ligar ainda, um ponto de extensão para validar que o lixo não está em residência nem em ponto "adotado" (por exemplo, uma interface IValidadorDePonto chamada antes de salvar), para receber depois a foto ou uma moderação do gestor. A foto, se vier, nunca deve ser gravada.
5. Crie um índice que ajude a busca por pedidos ativos por região (por exemplo, por status e coordenadas).
6. Testes: dois cidadãos a 1,5 km -> o segundo recebe 409; a 2,5 km -> os dois passam; mesmo cidadão a 0,5 km -> passa; pedido cancelado não bloqueia.
7. Atualize o Swagger com a resposta 409.

Mostre o plano antes de mexer e rode os testes no fim.
```
