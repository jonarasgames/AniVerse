# Renders — Piratas

Coloque aqui os PNGs transparentes dos personagens, na ordem das cartas:

```text
Piratas/
  1.png    ← primeira carta
  2.png    ← segunda carta
  3.png    ← terceira carta
  ...
  24.png   ← última carta
```

Por exemplo, se você escolher Luffy para a primeira carta, salve o render dele como `1.png`. Se escolher Zoro para a segunda, use `2.png`. A escolha dos personagens é sua.

Use números sem zero à esquerda: `1.png`, e não `01.png`. Mantenha a extensão `.png` em minúsculas. Os renders aparecem inteiros, preservando a transparência; você pode recortar a margem transparente antes de salvar para o personagem ocupar melhor a carta.

As imagens são encontradas automaticamente. Para colocar os nomes dos personagens nas cartas, use o campo `name` da temporada `2026-11` em `card-art.json`. A estreia é em novembro de 2026; não há editor de renders na interface pública.

| Arquivos | Página | IDs em card-art.json |
|---|---|---|
| 1.png a 4.png | 1 | 0-0 a 0-3 |
| 5.png a 8.png | 2 | 0-4 a 0-7 |
| 9.png a 12.png | 3 | 1-0 a 1-3 |
| 13.png a 16.png | 4 | 1-4 a 1-7 |
| 17.png a 20.png | 5 | 2-0 a 2-3 |
| 21.png a 24.png | 6 | 2-4 a 2-7 |

Enquanto um arquivo não tiver sido adicionado, a carta exibe “Imagem em breve”.
