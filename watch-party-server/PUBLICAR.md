# Publicar o servidor no Render

O site continua na hospedagem atual. Este serviço hospeda somente as salas e o chat.

1. Envie os arquivos atualizados do repositório ao GitHub, incluindo `watch-party-server/` e `js/watch-party-config.js`.
2. Entre em https://dashboard.render.com com sua conta e conecte o repositório AniVerse.
3. Selecione **New → Web Service**. Use:

| Campo | Valor |
| --- | --- |
| Branch | main |
| Runtime | Node |
| Root Directory | watch-party-server |
| Build Command | npm install --omit=dev |
| Start Command | npm start |
| Health Check Path | /health |
| Instances | 1 |

4. Adicione a variável `ALLOWED_ORIGINS`. Se o site estiver em `https://jonarasgames.github.io/AniVerse/`, use `https://jonarasgames.github.io,http://localhost:8000,http://127.0.0.1:8000`. A origem não inclui o caminho `/AniVerse/` nem barra final. Acrescente a origem exata de um domínio próprio se ele for usado.
5. Crie o serviço. O plano Free serve para experimentar; ele suspende após 15 minutos sem tráfego e pode levar cerca de um minuto para voltar. Para uso contínuo sem suspensão por inatividade, escolha uma instância paga. Confira preços e condições atuais no painel antes de contratar.
6. Espere o estado **Live** e abra `https://ENDERECO-DO-SERVICO/health`; a resposta deve conter `"ok":true`.
7. Edite `js/watch-party-config.js` na raiz do AniVerse, colocando a URL HTTPS do serviço entre as aspas, e publique a alteração no GitHub. Não use `/health` nessa configuração. Aguarde a publicação do site.
8. No endereço público do AniVerse, teste a sala em dois aparelhos, um deles pelo 4G/5G. O convite deve conter a URL pública do site. Com o serviço online, o terminal local e o computador podem ser desligados.

Ao criar ou entrar em uma sala, o site aguarda até 90 segundos por um servidor que esteja iniciando, com indicador de espera, tempo decorrido e cancelamento. A criação/entrada continua automaticamente quando a conexão chega. Se não houver resposta, oferece **Tentar novamente**. Esse aviso também cobre reconexões e não garante que uma falha seja apenas suspensão do plano gratuito.

Com a URL online configurada, entrar no site também dispara uma única requisição pública a `/health` em segundo plano, após a primeira renderização. Isso adianta a inicialização sem abrir o painel, criar sala ou manter uma conexão de sala ativa. Não há ping periódico para manter o serviço acordado. Uma aba aberta em segundo plano espera ficar visível; sem internet, aguarda a conexão voltar. A prontidão só é confirmada pela conexão real ao usar as salas.

As salas ficam na memória de uma única instância. Reiniciar, suspender ou publicar novamente o servidor encerra as salas abertas. Não ative múltiplas instâncias enquanto não houver armazenamento compartilhado.

Os PNGs das prévias e `episode-previews.json` devem ser publicados junto com o site, não gerados no servidor de salas.

Documentação oficial: https://render.com/docs/your-first-deploy, https://render.com/docs/free, https://render.com/docs/websocket.
