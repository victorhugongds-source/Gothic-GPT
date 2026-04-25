document.addEventListener("DOMContentLoaded", async () => {

  const btnTema = document.getElementById("toggleTema");
  const btn = document.getElementById("btnEnviar");
  const input = document.getElementById("inputChat");
  const chat = document.getElementById("chatArea");
  const btnMic = document.getElementById("btnMic");
  const btnAudio = document.getElementById("btnAudio");

  // ===============================
  // 🔐 CARREGAR CONFIG (keys.json)
  // ===============================
  let endpoint, deployment, apiKey, apiVersion;

  async function carregarConfig() {
    try {
      const response = await fetch("keys.json");
      const config = await response.json();

      endpoint = config.endpoint;
      deployment = config.deployment;
      apiKey = config.apiKey;
      apiVersion = config.apiVersion;

      console.log("🔐 Config carregada com sucesso");
    } catch (e) {
      console.error("Erro ao carregar keys.json", e);
      alert("Erro ao carregar configuração da IA");
    }
  }

  await carregarConfig(); // 🔴 garante que carregou antes de usar

  // ===============================
  // 🌗 TEMA
  // ===============================
  if (localStorage.getItem("tema") === "light") {
    document.body.classList.add("light-mode");
    btnTema.innerText = "☀️";
  }

  btnTema.onclick = () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    btnTema.innerText = isLight ? "☀️" : "🌙";
    localStorage.setItem("tema", isLight ? "light" : "dark");
  };

  // ===============================
  // 🔊 FALA
  // ===============================
  function falar(texto) {
    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(texto);
    speech.lang = "pt-BR";

    if (recognition && ouvindo) recognition.stop();

    speech.onend = () => {
      if (ouvindo) recognition.start();
    };

    speechSynthesis.speak(speech);
  }

  // ===============================
  // 🎤 MICROFONE
  // ===============================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition;
  let ouvindo = false;
  let modoAudio = false;
  let bloqueado = false;

  if (SpeechRecognition) {

    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      if (modoAudio) {
        btnAudio.style.background = "red";
      } else {
        btnMic.classList.add("gravando");
      }
    };

    recognition.onend = () => {
      btnMic.classList.remove("gravando");
      if (ouvindo) setTimeout(() => recognition.start(), 800);
    };

    recognition.onresult = (event) => {

      if (bloqueado) return;

      const result = event.results[event.results.length - 1];

      if (!result.isFinal) return;

      const texto = result[0].transcript.trim();

      if (!texto) return;

      bloqueado = true;

      chat.innerHTML += `
        <div class="msg-container" style="justify-content:flex-end">
          <div class="msg user">${texto}</div>
        </div>
      `;

      chat.scrollTop = chat.scrollHeight;

      enviar(texto);
    };
  }

  // 🎤 botão mic
  btnMic.onclick = () => {
    if (!recognition) return;

    ouvindo = !ouvindo;

    if (ouvindo) {
      recognition.start();
    } else {
      recognition.stop();
    }
  };

  // 🔊 botão áudio contínuo
  btnAudio.onclick = () => {

    modoAudio = !modoAudio;

    if (modoAudio) {
      btnAudio.innerText = "🛑 Parar";
      btnAudio.style.background = "crimson";

      btnMic.style.display = "none";

      ouvindo = true;
      recognition.start();

    } else {
      btnAudio.innerText = "🔊 Áudio";
      btnAudio.style.background = "";

      btnMic.style.display = "inline-block";

      ouvindo = false;
      recognition.stop();
    }
  };

  // ===============================
  // 💬 CHAT + IA
  // ===============================
  btn.onclick = () => enviar();

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviar();
  });

  async function enviar(textoVoz = null) {

    if (!endpoint || !apiKey) {
      alert("Configuração da IA não carregada");
      return;
    }

    const pergunta = textoVoz || input.value.trim();
    if (!pergunta) return;

    if (!textoVoz) {
      chat.innerHTML += `
        <div class="msg-container" style="justify-content:flex-end">
          <div class="msg user">${pergunta}</div>
        </div>
      `;
    }

    input.value = "";
    btn.disabled = true;

    chat.innerHTML += `
      <div class="msg-container" id="typingContainer">
        <div class="avatar">🦇</div>
        <div class="msg bot typing">Vlad está escrevendo</div>
      </div>
    `;

    try {

      const url = endpoint + "openai/deployments/" + deployment + "/chat/completions?api-version=" + apiVersion;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Você é Vlad Tepes, vampiro assistente do SENAI." },
            { role: "user", content: pergunta }
          ],
          max_completion_tokens: 5000
        })
      });

      const data = await response.json();

      document.getElementById("typingContainer")?.remove();

      let resposta = "🦇 Silêncio...";

      if (data.choices?.length > 0) {
        resposta = data.choices[0].message.content;
      }

      chat.innerHTML += `
        <div class="msg-container">
          <div class="avatar">🦇</div>
          <div class="msg bot">${resposta}</div>
        </div>
      `;

      chat.scrollTop = chat.scrollHeight;

      falar(resposta);
      bloqueado = false;
      btn.disabled = false;

    } catch (error) {

      document.getElementById("typingContainer")?.remove();

      chat.innerHTML += `<div class="msg bot">Erro na conexão...</div>`;
      falar("Erro na conexão");

      bloqueado = false;
      btn.disabled = false;
    }
  }

});