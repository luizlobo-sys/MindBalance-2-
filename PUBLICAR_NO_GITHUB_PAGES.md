# Publicar o MindBalance no GitHub Pages

Tempo estimado: 10 minutos. Custo: zero. No final você terá um endereço assim:

```
https://SEU-USUARIO.github.io/mindbalance/
```

O GitHub só **hospeda os arquivos**. Os registros dos alunos continuam ficando no aparelho de cada um.

## Antes de começar

- Uma conta no GitHub (https://github.com/signup). Se o projeto for da escola, vale criar uma conta da equipe em vez de usar a pessoal de um aluno.
- A pasta `mindbalance` descompactada. Dentro dela deve aparecer o `index.html` junto das pastas `css`, `js` e `icons`.
- O repositório precisa ser **público** (no plano gratuito, o GitHub Pages só publica repositórios públicos). Não há nada sigiloso nos arquivos.

---

## Caminho A: pelo site do GitHub (sem instalar nada)

**1. Criar o repositório**

1. Entre em https://github.com/new
2. Em *Repository name*, escreva `mindbalance` (sem espaços nem acentos).
3. Marque **Public**.
4. Clique em **Create repository**.

**2. Enviar os arquivos**

1. Na página do repositório novo, clique em **uploading an existing file**.
2. Abra a pasta `mindbalance` no seu computador, selecione **tudo o que está dentro dela** (`index.html`, `sw.js`, `manifest.webmanifest`, `README.md` e as pastas `css`, `js`, `icons`, `tests`) e **arraste** para a área da página.
3. Espere o envio terminar. Confira se as pastas aparecem na lista (por exemplo `css/style.css`).
4. Clique em **Commit changes**.

> Importante: arraste os arquivos e pastas, **não** o arquivo .zip. O GitHub não descompacta zip. Use Chrome ou Edge, que mantêm a estrutura das pastas.

**3. Ligar o GitHub Pages**

1. No repositório, clique em **Settings** (Configurações).
2. No menu da esquerda, clique em **Pages**.
3. Em *Build and deployment*, deixe *Source* como **Deploy from a branch**.
4. Em *Branch*, escolha **main** e a pasta **/ (root)**. Clique em **Save**.
5. Espere de 1 a 3 minutos e atualize a página. Aparece o aviso *Your site is live at ...* com o endereço.

---

## Caminho B: pelo Git (para quem já usa)

```bash
cd mindbalance
git init
git add .
git commit -m "MindBalance 2.0"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/mindbalance.git
git push -u origin main
```

O GitHub não aceita mais senha no `git push`. Entre pelo navegador quando o Git pedir, ou use um *personal access token* (GitHub, Settings, Developer settings). Depois faça o passo 3 do Caminho A para ligar o Pages.

---

## Conferindo se deu certo

Abra o endereço no celular e verifique:

- [ ] A tela de boas-vindas aparece e o app carrega sem tela em branco.
- [ ] Dá para fazer um check-in e ele continua lá depois de recarregar a página.
- [ ] A respiração guiada abre e o círculo anima.
- [ ] Em **Configurações**, o PIN pode ser ativado (isso só funciona em endereço https, que o GitHub Pages fornece).
- [ ] No Chrome do Android, o menu ⋮ oferece **Instalar app**. No iPhone (Safari), use Compartilhar e depois **Adicionar à Tela de Início**.
- [ ] Depois de instalado, o app abre mesmo com o modo avião ligado.

Dica: gere um QR Code do endereço (qr-code-generator.com ou o próprio Chrome, em *Compartilhar*) para colocar no pôster da feira.

## Atualizando o site

1. Mude o número em `CACHE` no arquivo `sw.js` (por exemplo de `mindbalance-v2.0.0` para `mindbalance-v2.0.1`).
2. No GitHub, abra o arquivo, clique no lápis, edite e confirme com **Commit changes**. Para vários arquivos, use **Add file, Upload files** de novo.
3. Espere cerca de 1 minuto. Quem já tinha o app aberto vê a versão nova ao reabrir.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Página 404 | Em Settings, Pages, confira se a branch é `main` e a pasta é `/ (root)`. Confira também se o `index.html` está na raiz do repositório, e não dentro de outra pasta. |
| Tela sem estilo ou em branco | As pastas `css` e `js` não foram enviadas. Repita o envio arrastando as pastas. |
| Continua aparecendo a versão antiga | Mude o `CACHE` em `sw.js` e recarregue duas vezes (ou limpe os dados do site). |
| "Proteção por PIN indisponível" | Você abriu o arquivo direto do computador. Use o endereço https do GitHub Pages. |
| Os registros sumiram | Dados ficam no navegador. Se o aluno limpou os dados do navegador ou trocou de aparelho, só o backup (Configurações, Baixar backup) recupera. |

## Para apresentar na LUMINI

Dados que você pode citar sobre o projeto, todos verificáveis no repositório:

- Roda 100% no navegador, sem servidor e sem coleta de dados.
- 60 testes automatizados (pasta `tests`) cobrindo check-in, diário, respiração, painel, PIN com criptografia e backup.
- Funciona offline e pode ser instalado como aplicativo.
