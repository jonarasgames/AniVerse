<div align="center">
  <img src="https://raw.githubusercontent.com/jonarasgames/AniVerse/main/images/logo.png" width="120" style="border-radius: 50%; animation: pulse 2s infinite;">
</div>

<h1 align="center" style="font-family: 'Comic Sans MS', cursive; color: #00ccff; animation: glow 1.5s ease-in-out infinite alternate;">
  ✨🌌 AniVerse 🌌✨
</h1>

<p align="center">
  <a href="https://jonarasgames.github.io/AniVerse/">
    <img src="https://www.animatedimages.org/data/media/523/animated-button-image-0022.gif" width="200" style="margin: 10px;">
  </a>
</p>

<div align="center" style="font-family: Tahoma; background: linear-gradient(135deg, #ccf, #eef); border-radius: 16px; padding: 15px; border: 3px dashed #88f; box-shadow: 0 0 20px #99f;">
  <img src="https://www.animatedimages.org/data/media/2027/animated-anime-image-0016.gif" width="80">
  <img src="https://www.animatedimages.org/data/media/2027/animated-anime-image-0007.gif" width="80">
  <img src="https://www.animatedimages.org/data/media/2027/animated-anime-image-0005.gif" width="80">
</div>

---

## 🌀 Sobre o Projeto

<div style="animation: slide-in 1s ease-out;">
  <strong>AniVerse</strong> é um portal visualmente encantado para fãs de animes.
  <br><br>
  Tudo aqui foi feito por <strong>Jonaras</strong> — lógica, layout, identidade e glitter visual.
</div>

---

## 🎉 Destaques animados

<ul style="animation: bounce-in 1.2s ease-in-out;">
  <li>Visual chamativo e colorido</li>
  <li>Player com temporadas e episódios</li>
  <li>Músicas de animes com player retrô</li>
  <li>Galeria de personagens com avatar custom</li>
  <li>Modo escuro incluso</li>
  <li>Totalmente feito por mim e ajudinha de Copilot (Jonaras)</li>
</ul>

---

## 🧑‍🎤 Galeria

<p align="center">
  <img src="https://raw.githubusercontent.com/jonarasgames/AniVerse/main/images/IMG_20250628_194305.png" width="80" style="animation: wiggle 1s infinite;">
  <img src="https://raw.githubusercontent.com/jonarasgames/AniVerse/main/images/IMG_20250628_203832.png" width="80" style="animation: pulse 2s infinite;">
  <img src="https://raw.githubusercontent.com/jonarasgames/AniVerse/main/images/IMG_20250707_193600.png" width="80" style="animation: bounce 1s infinite alternate;">
</p>

---

## 🌐 Site Oficial

Clique no botão abaixo para acessar:

<p align="center">
  <a href="https://jonarasgames.github.io/AniVerse/">
    <img src="https://www.animatedimages.org/data/media/523/animated-button-image-0018.gif" width="200">
  </a>
</p>

---

## 📫 Contato

💌 Email: [gamesjonaras@gmail.com](mailto:gamesjonaras@gmail.com)

---

<div align="center" style="font-size: 16px; font-family: 'Comic Sans MS'; color: #3399ff; animation: glow 1.5s infinite alternate;">
  Feito com nostalgia, brilho e carinho por <strong>Jonaras</strong> 🌟
</div>

---

<img src="https://www.animatedimages.org/data/media/1154/animated-star-image-0016.gif" width="40" style="position: fixed; top: 10px; left: 10px; animation: float 5s ease-in-out infinite;">
<img src="https://www.animatedimages.org/data/media/1154/animated-star-image-0023.gif" width="40" style="position: fixed; bottom: 10px; right: 10px; animation: float 4s ease-in-out infinite reverse;">

---

## 📺 Samsung TV (Tizen) + modo TV no projeto

Se você quer transformar este projeto em app para **Samsung TV**, o caminho mais simples é usar o próprio site como **Web App Tizen**.

### 1) O que já foi adaptado neste repositório
- Suporte de navegação por controle remoto (setas + Enter + voltar).
- Modo TV com foco visual maior para cards e botões.
- Ativação automática em user-agent de TV Samsung/Tizen.
- Ativação manual via URL: `?tv=1` (desativar: `?tv=0`).

### 2) Como criar um app Samsung com este projeto
1. Instale o **Tizen Studio** + extensão de TV.
2. Crie um projeto **Web Application**.
3. Copie os arquivos deste repositório para dentro do projeto.
4. Ajuste o `config.xml` com permissões mínimas de internet e resolução Full HD.
5. Rode no emulador de TV Samsung e teste o controle remoto.
6. Gere o pacote `.wgt` para instalar na TV (modo dev).

### 3) Dicas de compatibilidade para TV
- Prefira vídeos em HLS/MP4 amplamente compatíveis.
- Evite dependências pesadas e animações excessivas.
- Sempre teste navegação sem mouse (somente setas/Enter/Back).
- Garanta foco visível em todos os elementos interativos.

Se quiser, no próximo passo eu também posso montar um `config.xml` completo e checklist de publicação na loja da Samsung.


### 4) Troubleshooting rápido (TV no navegador)
- Se as setas não navegarem e só moverem o cursor do mouse, ative o modo com `?tv=1` e pressione o botão central/OK para focar no site.
- Se a música travar durante a reprodução, teste outra rede/qualidade e recarregue a faixa (alguns streams oscilam em TVs com conexão instável).
- O player agora tenta reconectar automaticamente quando detectar buffering/stall.
