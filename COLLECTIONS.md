# Clube de conquistas

A interface fica no botão de troféu e reúne conquistas, álbum sazonal e sala de prêmios. O histórico de conquistas existente é preservado. A coleção tem armazenamento independente por perfil no navegador; não há sincronização entre aparelhos.

## Regras da coleção

- Cada episódio concluído pela primeira vez no sistema gera 100 pontos. Reassistir não gera pontos, mesmo em outra temporada mensal. Episódios anteriores à introdução da coleção não recebem pontos retroativos.
- Cada 300 pontos da temporada gera um pacote de três cartas. Abrir o pacote salva as cartas imediatamente; fechar a animação não as perde. É necessário colá-las para completar as páginas.
- As duas primeiras cartas têm probabilidades de 60% comum, 28% rara, 10% épica e 2% lendária. A terceira é rara (70%), épica (25%) ou lendária (5%). Pode haver repetidas no mesmo pacote.
- Repetidas viram 10/20/40/80 fragmentos, conforme a raridade. Criar uma carta específica custa 30/60/120/240 fragmentos. Cartas criadas também precisam ser coladas.
- Cada página completa libera um selo e 30 fragmentos; cada categoria, um título e 80 fragmentos; o álbum completo, um troféu e 200 fragmentos. Cada prêmio só pode ser resgatado uma vez por álbum. Os cosméticos podem ser usados como destaque no clube.
- Há 24 cartas por álbum, três categorias e duas páginas de quatro cartas por categoria.
- Colar as 24 cartas de um álbum libera automaticamente seus renders como avatares em **Gerenciar perfis → lápis → Personagens**, junto da biblioteca normal. O resgate do troféu é separado. Os avatares ficam disponíveis apenas no perfil que completou o álbum e continuam liberados depois da virada do mês.

## Temporadas

A coleção estreia em 1º de novembro de 2026. Antes disso, não concede pontos nem permite abrir pacotes. Dados de testes anteriores à estreia não aparecem na estante oficial. A virada acontece no primeiro dia do mês, conforme o relógio local. Novembro de 2026 começa com Piratas; seguem Cosmos, Espíritos, Dragões, Neon e Expedição Selvagem, em um ciclo de seis temas. Cada mês tem seu próprio álbum, mesmo quando o tema volta.

Pontos parciais não passam para o próximo mês. Pacotes já conquistados continuam no álbum de origem. Cartas, prêmios e fragmentos são preservados. Álbuns anteriores podem ser completados com os pacotes guardados ou com cartas criadas usando fragmentos.

## Manutenção e validação

Cada edição mensal pode ter um banner com os personagens à direita e uma logo PNG separada à esquerda. Adicione `banner.png` e `logo.png` em `images/seasons/AAAA-MM/`. O [guia de novembro](images/seasons/2026-11/README.md) contém medidas e instruções. As artes dos álbuns arquivados permanecem ligadas à pasta do mês original.

Para substituir os ícones das cartas por renders individuais, ajustar os acabamentos e exportar GIFs, veja [CARD_IMAGES.md](CARD_IMAGES.md).

- `js/collection-engine.js`: regras, catálogo dos temas e persistência em `aniverse:collection:v1:<perfil>`.
- `js/achievements-hub.js`: interface e interação; `css/achievements-hub.css`: apresentação e animações.
- `js/video-player.js`: conclusão normal ou avanço automático durante os créditos; `js/script.js`: conclusão do player nativo de TV. Todos usam a mesma deduplicação.
- `npm run test:collections`: nove testes independentes de navegador sobre a economia, persistência, virada mensal e isolamento de perfis.

O relógio, o progresso e os sorteios são locais. A coleção é cosmética; para competições ou recompensas com valor externo, a validação precisaria passar por um servidor.
