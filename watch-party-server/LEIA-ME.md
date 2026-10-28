# Servidor de salas do AniVerse

No PowerShell, dentro desta pasta:

```powershell
npm.cmd install
npm.cmd start
```

Abra http://localhost:3001/health para conferir `ok: true`. Encerre com Ctrl+C.

O servidor aceita a origem http://localhost:8000 e http://127.0.0.1:8000. Para outra origem, configure `ALLOWED_ORIGINS` com endereços separados por vírgula, sem caminho ou barra final. `PORT` define a porta na hospedagem.

As salas ficam na memória, têm até oito participantes e encerram quando todos saem. Reiniciar o processo apaga as salas. O convite é o identificador aleatório da sala. Ao desconectar, o participante sai; se for anfitrião, o controle passa para outro participante. O site tenta entrar novamente ao reconectar; uma sala que ficou vazia já terá encerrado. Senha e sessão durável ainda não estão disponíveis.

## Testar no site

1. Deixe este servidor ligado e abra o AniVerse em http://localhost:8000.
2. Escolha um perfil, abra um episódio e use o botão de pessoas nos controles do player, ao lado da tela cheia.
3. Crie a sala, copie o convite e abra-o em outra janela ou navegador. A criação preserva o tempo e o estado atual do anfitrião. O convidado é posicionado no ponto atual da sala e pode clicar em **Estou pronto** para liberar a reprodução.
4. O anfitrião usa os controles normais para iniciar, pausar, avançar ou trocar de episódio. O painel permite conversar, transferir controle e sair. Fechar o episódio com X mantém a sala e pausa a reprodução do anfitrião; a barra inferior permite voltar ou escolher outro anime. Use **Sair** para deixar a sala.

## Escolha de episódios e sugestões

O botão de lista aparece apenas em tela cheia, no computador e no celular. No modo normal, use os seletores ao lado/abaixo do vídeo. O catálogo para trocar anime fica dentro do painel **Assistir junto**: o anfitrião vê **Trocar anime** e os convidados veem **Sugerir anime**. A escolha do anfitrião altera a sala inteira; a escolha de um convidado vira sugestão, que o anfitrião pode aceitar ou dispensar. Toda troca de anime, temporada ou episódio volta a aguardar a prontidão dos participantes.

As prévias agora são imagens prontas. O navegador lê `episode-previews.json` e carrega os PNGs de `images/episode-previews/`, adiantando as imagens da temporada em segundo plano com prioridade baixa. Abrir a lista não cria tags de vídeo, canvases nem requisições aos episódios. Imagens já cadastradas em `thumbnail`, `previewImage` ou `image` continuam sendo respeitadas.

Para gerar os PNGs, na raiz do repositório use `npm.cmd run previews`. O gerador usa a dependência de desenvolvimento `ffmpeg-static`, extrai uma cena por episódio e grava apenas uma imagem de 240×135. Ele exige leitura parcial HTTP, limita a leitura a 8 MiB por tentativa e não grava vídeos. Fontes sem acesso parcial, bloqueadas ou lentas ficam sem prévia em vez de carregar um episódio inteiro. A execução seguinte reaproveita os PNGs existentes. Para uma temporada específica: `npm.cmd run previews -- --anime 36 --season 1`.

Publique `episode-previews.json` e a pasta `images/episode-previews/` junto com o site. O servidor de salas não é necessário para servir essas imagens. A geração é feita uma vez no computador de quem administra o catálogo; os visitantes só baixam as imagens.

A sincronização não aplica histórico individual aos convidados. Eventos gerados pelo alinhamento não disparam novas correções imediatamente; os saltos automáticos individuais de abertura e encerramento ficam desativados para convidados. O anfitrião mantém seu player ao entrar alguém na sala.

Após atualizar `server.js`, reinicie o processo com Ctrl+C e `npm.cmd start`. Isso encerra as salas antigas; crie outra sala para testar os eventos novos.

No computador, o vídeo fica à esquerda e as informações e o chat à direita; durante uma sala, o chat permanece aberto. No celular, o painel acompanha a rolagem. Em tela cheia, o botão de pessoas abre o painel sobre o vídeo. O indicador Online informa a conexão com o servidor; os ms medem o tempo de ida e volta de um comando confirmado, não a velocidade da internet ou a defasagem do vídeo.

No celular, o modo normal mostra os controles abaixo da imagem e mantém o título fora do vídeo. Na vertical, o banner permanece. Na horizontal, o banner é retirado, o X fica ao lado e o vídeo usa mais altura; ao girar, a janela volta ao topo. Em tela cheia, os controles voltam a sobrepor a imagem. Telas touch grandes não são tratadas como TV apenas pelo tamanho.

Convidados acompanham o anfitrião; volume e tela cheia são individuais. A prontidão é manual: esta versão não pausa todo o grupo automaticamente se um participante ficar carregando. As mensagens ficam limitadas às últimas 50 e não são gravadas em disco. A conexão da sala não garante que a fonte externa do episódio esteja acessível em todos os aparelhos.

O endereço localhost só serve no próprio computador. Para publicar, hospede o servidor com HTTPS, configure `ALLOWED_ORIGINS` com a origem pública do AniVerse e defina `window.ANIVERSE_WATCH_SERVER` com a URL HTTPS do servidor antes de carregar `js/watch-party.js`. Não coloque senhas ou credenciais nessa configuração pública.

O cliente Socket.IO está incluído em `js/vendor/`, com a licença do projeto. O arquivo `css/watch-party.css` contém o layout e `js/watch-party.js` contém a integração com o player.

Eventos com confirmação `{ok, error?}`: `room:create`, `room:join`, `room:get`, `room:leave`, `room:ready`, `room:transfer`, `playback:update`, `playback:episode`, `chat:send`. O servidor envia `room:state` e `chat:message`. O tempo é contado em segundos, `updatedAt` em milissegundos; `revision` aumenta a cada comando de reprodução. O site deve apresentar chat como texto, sem interpretar HTML.

Execute `npm.cmd test` para testar conexões reais, comandos, permissões, chat e encerramento da sala.
