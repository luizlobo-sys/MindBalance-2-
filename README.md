# MindBalance

Aplicativo web de bem-estar para estudantes: check-in de humor, diário, respiração guiada, práticas de atenção e um painel para perceber padrões. Projeto **LUMINI 2026**, Escola Arte de Crescer (Araguatins, TO).

Funciona no celular e no computador, pode ser instalado na tela inicial e abre sem internet depois do primeiro acesso.

> O MindBalance é uma ferramenta de autoconhecimento. Ele **não faz diagnóstico** e **não substitui** psicólogos(as) ou médicos(as).

## O que tem

| Tela | O que faz |
|---|---|
| Início | Saudação, plantinha que cresce com os cuidados, humor de hoje, atalhos e dica do dia |
| Check-in | Humor, energia, horas de sono, emoções, fatores do dia e anotação (um por dia, com opção de registrar "ontem") |
| Respirar | 4 respirações guiadas com animação (5-5, quadrada, 4-7-8, 4-6) e 5 práticas guiadas (5-4-3-2-1, atenção ao presente, escaneamento do corpo, gratidão, pausa entre os estudos) |
| Diário | Escrever, editar, excluir e buscar entradas, com ideias para começar |
| Painel | Gráfico de humor (14, 30 ou 90 dias), calendário do mês, distribuição, emoções e fatores mais frequentes, padrões nos registros e resumo para levar a uma conversa |
| Configurações | Tema claro/escuro, lembrete diário, PIN com criptografia, backup (baixar e restaurar), instalar no celular, contatos de ajuda |

Também há o botão **Preciso de ajuda** (CVV 188, SAMU 192, Polícia 190, Disque 100) sempre visível. Se o texto do diário ou do check-in indicar sofrimento intenso, o app mostra uma mensagem de acolhimento com esses contatos.

## Privacidade (como funciona de verdade)

- Os registros ficam no **localStorage do navegador**, neste aparelho. **Nada é enviado para servidores.** O GitHub só hospeda os arquivos do site.
- Com **PIN ativado**, os dados são criptografados (AES-GCM de 256 bits, chave derivada do PIN com PBKDF2). Isso protege contra quem usa o mesmo aparelho; **não substitui a senha do celular**. PINs curtos são mais fáceis de adivinhar, então prefira 6 caracteres ou mais.
- **Sem PIN, os dados ficam sem criptografia** no navegador.
- Se o PIN for esquecido, **não há recuperação**. Faça backup.
- O arquivo de backup (.json) **não é criptografado**.
- O resumo do painel **não inclui** o texto do diário nem das anotações.

## Limitações

- Os dados **não sincronizam** entre aparelhos. Para trocar de aparelho, use baixar/restaurar backup.
- Limpar os dados do navegador apaga os registros.
- O lembrete diário só aparece com o app aberto ou instalado; navegadores não permitem avisos com o app totalmente fechado.
- A detecção de palavras de sofrimento é simples (lista de expressões) e pode errar para os dois lados. Ela não substitui o cuidado de pessoas.
- Os "padrões" do painel são apenas médias dos próprios registros e não provam causa e efeito.

## Como publicar

Veja o passo a passo em [PUBLICAR_NO_GITHUB_PAGES.md](PUBLICAR_NO_GITHUB_PAGES.md).

## Como rodar no computador

Abrir o `index.html` com duplo clique já funciona. Algumas funções (instalar como app, uso offline e PIN) só funcionam em endereço seguro. Para testar tudo localmente:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura

```
index.html              página única (as telas são montadas por js/app.js)
css/style.css           estilos, tema claro e escuro
js/content.js           textos, exercícios, dicas, contatos de ajuda
js/storage.js           salvamento local, PIN/criptografia, validação de backup
js/app.js               telas, rotas e lógica
sw.js                   service worker (uso offline)
manifest.webmanifest    dados para instalar como app
icons/                  ícones
tests/                  testes automatizados (opcional)
```

Para editar os exercícios, as dicas ou os contatos, mexa só em `js/content.js`.

## Testes automatizados (opcional)

```bash
cd tests && npm install
cd .. && python3 -m http.server 8765 &
cd tests && node run.js
```

O roteiro simula um aluno usando o app (check-in, diário, respiração, painel, PIN, backup) e confere 60 pontos.

## Atualizando o site depois de publicado

Mude o número em `CACHE` no arquivo `sw.js` (por exemplo `mindbalance-v2.0.1`) a cada publicação. Assim, quem já instalou o app recebe a versão nova.
