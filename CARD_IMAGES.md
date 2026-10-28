# Renders dos personagens

O fluxo principal é colocar os PNGs diretamente no repositório, em uma pasta por tema. A pasta inicial já está criada:

```text
images/cards/Piratas/
  1.png
  2.png
  3.png
  ...
  24.png
```

## Como adicionar

1. Escolha e recorte o render de cada personagem, preservando o fundo transparente.
2. Salve o primeiro como `1.png` dentro de `images/cards/Piratas/`, o segundo como `2.png`, e assim por diante até `24.png`.
3. Adicione os arquivos ao Git e publique como de costume. O site encontra cada PNG automaticamente, pela ordem das cartas.

Por exemplo: se Luffy for a primeira carta, o arquivo dele será `images/cards/Piratas/1.png`. Você escolhe os personagens e a ordem. Não há editor de renders acessível aos visitantes. A estreia de Piratas é em novembro de 2026.

Use números **sem zero à esquerda** e extensão **.png** em minúsculas. A área do render na carta é quadrada, mas o arquivo pode ser vertical ou horizontal: o personagem aparece inteiro, sem recorte automático. Recorte margens transparentes excessivas antes de salvar para aproveitar melhor o espaço. Tanto o álbum quanto o GIF preservam a transparência.

## Ordem e nomes

| Cartas / arquivos | Página | IDs no JSON |
|---|---|---|
| 1.png a 4.png | 1 | `0-0` a `0-3` |
| 5.png a 8.png | 2 | `0-4` a `0-7` |
| 9.png a 12.png | 3 | `1-0` a `1-3` |
| 13.png a 16.png | 4 | `1-4` a `1-7` |
| 17.png a 20.png | 5 | `2-0` a `2-3` |
| 21.png a 24.png | 6 | `2-4` a `2-7` |

Os nomes dos personagens são separados dos nomes dos arquivos. Para trocar o nome da primeira carta, por exemplo, edite `name` em `card-art.json`:

```json
"0-0": {
  "src": "",
  "name": "Luffy",
  "x": 50,
  "y": 50
}
```

Com `src` vazio, o caminho automático por tema e número continua funcionando. Para publicar nomes e posições, edite diretamente a temporada `2026-11` em `card-art.json`. Apenas a configuração publicada no repositório é usada; prévias locais do antigo editor são ignoradas.

## Próximos temas

Os nomes de pasta previstos são `Piratas`, `Cosmos`, `Espiritos`, `Dragoes`, `Neon` e `Expedicao`, todos dentro de `images/cards/`. Cada tema usa `1.png` até `24.png`. Respeite maiúsculas/minúsculas nos nomes das pastas.

A mesma pasta é reutilizada quando o tema volta. Trocar um PNG altera sua aparência em todas as temporadas que usam esse tema. Se quiser renders diferentes por edição mensal, coloque-os em uma pasta separada e informe os caminhos específicos no `src` da respectiva temporada em `card-art.json`.

## Acabamentos e movimento

- **Comum:** acabamento fosco, sem brilho artificial sobre a cena.
- **Rara:** reflexo brilhante que acompanha o cursor.
- **Épica:** película holográfica com reflexos de várias cores.
- **Lendária:** moldura e superfície metálicas douradas.

No computador, passe o mouse sobre a carta sem clicar para inclinar e mover a iluminação. O efeito respeita a preferência de movimento reduzido e o modo de desempenho. O efeito não depende do clique de colar ou de revelar.

## Exportar um GIF

No álbum, clique em **Exportar coleção em GIF**, escolha de uma a seis cartas que você já adquiriu e clique em **Gerar GIF 3D**. Quando a prévia estiver pronta, use **Baixar GIF**.

O arquivo tem 420 × 500 pixels, repete em loop e mostra cada carta por aproximadamente dois segundos, com inclinação em perspectiva e brilho correspondente à raridade. A exportação acontece neste navegador e não altera a coleção. Há um botão para cancelar durante a geração.

Arquivos do próprio site são a opção mais simples. Links externos só podem entrar no GIF se o servidor permitir acesso à imagem por CORS. Se o navegador bloquear o link na exportação, use uma imagem publicada no projeto. A carta ainda pode exibir normalmente esse link no álbum.
