document.addEventListener("DOMContentLoaded", async () => {

  const btnTema = document.getElementById("toggleTema");
  const btn = document.getElementById("btnEnviar");
  const input = document.getElementById("inputChat");
  const chat = document.getElementById("chatArea");
  const btnMic = document.getElementById("btnMic");
  const btnAudio = document.getElementById("btnAudio");

  // ===============================
  // 🔐 CONFIG (keys.json)
  // ===============================
  let endpoint, deployment, apiKey, apiVersion;

  async function carregarConfig() {
    const response = await fetch("keys.json");
    const config = await response.json();

    endpoint = config.endpoint;
    deployment = config.deployment;
    apiKey = config.apiKey;
    apiVersion = config.apiVersion;
  }

  await carregarConfig();

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
  // 🔊 AZURE SPEECH (SUBSTITUÍDO)
  // ===============================
  function falar(texto) {

    if (!texto || typeof SpeechSDK === "undefined") return;

    if (recognition && ouvindo) recognition.stop();

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(apiKey, "eastus2");
    speechConfig.speechSynthesisVoiceName = "pt-BR-AntonioNeural";

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(
      texto,
      result => {
        synthesizer.close();

        if (recognition && ouvindo) {
          recognition.start();
        }
      },
      error => {
        console.error("Erro TTS:", error);
        synthesizer.close();

        if (recognition && ouvindo) {
          recognition.start();
        }
      }
    );
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

    recognition.onend = () => {
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

  btnMic.onclick = () => {
    if (!recognition) return;

    ouvindo = !ouvindo;

    if (ouvindo) recognition.start();
    else recognition.stop();
  };

  btnAudio.onclick = () => {

    modoAudio = !modoAudio;

    if (modoAudio) {
      btnAudio.innerText = "🛑 Parar";
      btnMic.style.display = "none";

      ouvindo = true;
      recognition.start();

    } else {
      btnAudio.innerText = "🔊 Áudio";
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
            { role: "system", content: "Você é Vlad Tepes, vampiro assistente do SENAI.Não utilize markdown." },
            { role: "user", content: pergunta }
          ],
          max_completion_tokens: 9000
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

    } catch {

      document.getElementById("typingContainer")?.remove();

      chat.innerHTML += `<div class="msg bot">Erro na conexão...</div>`;
      falar("Erro na conexão");

      bloqueado = false;
      btn.disabled = false;
    }
  }

});