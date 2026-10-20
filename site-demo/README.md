# Demonstração Coleta

Site estático com um celular em HTML/CSS/JavaScript e o aplicativo Expo dentro de um iframe em `/app/`. O app está no modo demonstração: dados fictícios e alterações em memória.

## Estrutura

- `index.html`: celular, rotação por arraste, abertura do app e retorno pela barrinha inferior.
- `app/`: exportação web do aplicativo.
- `coleta-icon.png`: ícone da demonstração.
- `vercel.json`: fallback das rotas do app para `app/index.html`.

O celular fica plano quando está parado e de frente. O reflexo fica oculto com o app aberto. Em telas estreitas, a pose inicial é frontal e o tamanho respeita a largura e a altura disponíveis. A barrinha inferior fecha o app; Esc também funciona. Abrir e fechar aceita navegação pelo teclado.

## Atualizar o aplicativo

Na raiz do repositório, em PowerShell:

```powershell
$env:EXPO_BASE_URL = '/app'
$env:EXPO_PUBLIC_DEMO_MODE = 'true'
npx expo export --platform web --output-dir site-demo/app
```

`app.config.ts` lê `EXPO_BASE_URL` em `experiments.baseUrl`. Use o prefixo `/app` para que links, JavaScript e fontes apontem para o diretório correto. Ao voltar ao desenvolvimento na raiz, limpe a variável `EXPO_BASE_URL` da sessão do terminal.

## Publicar no projeto existente

```sh
cd site-demo
npx vercel link --yes --project coleta-a3
npx vercel --prod --yes
```

Use a conta/equipe que contém `coleta-a3`. A pasta `.vercel/` é local e não deve ser versionada, assim como os arquivos `.env*`. A publicação usa os arquivos estáticos prontos, sem etapa de build.

## Conferir antes de apresentar

Abra Coleta, explore os três perfis, use a barrinha para fechar e abra novamente. Arraste o fundo ou a borda do aparelho para girar e use Centralizar para voltar à posição frontal. Confira o toque em um aparelho real e a legibilidade no projetor; o tamanho é limitado pela função `fit()`.
