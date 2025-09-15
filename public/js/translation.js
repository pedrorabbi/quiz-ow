// Módulo para funcionalidade de tradução

/**
 * Coleta todos os textos do formulário e os retorna em um objeto estruturado.
 * @returns {object} Objeto com todos os textos do quiz.
 */
function getCurrentQuizDataFromForm() {
  const quizData = {
    title: document.getElementById("title").value,
    nameLabel: document.getElementById("nameLabel").value,
    emailLabel: document.getElementById("emailLabel").value,
    buttonText: document.getElementById("buttonText").value,
    footnote: document.getElementById("footnote").value,
    items: [],
  };

  const allBlocks = document.querySelectorAll(".question-block, .loader-block");
  allBlocks.forEach((block) => {
    if (block.classList.contains("question-block")) {
      const questionText = block.querySelector(".question-input").value;
      const optionInputs = block.querySelectorAll(".option-input");
      const options = Array.from(optionInputs)
        .map((input) => input.value.trim())
        .filter(Boolean);
      if (questionText) {
        quizData.items.push({
          type: "question",
          question: questionText,
          options,
        });
      }
    } else if (block.classList.contains("loader-block")) {
      const loaderText = block.querySelector(".loader-input").value.trim();
      if (loaderText) {
        quizData.items.push({ type: "loader", text: loaderText });
      }
    }
  });

  return quizData;
}

/**
 * Preenche o formulário com os dados de um objeto de quiz traduzido.
 * @param {object} translatedQuiz - O objeto do quiz com os textos traduzidos.
 */
function populateFormWithTranslatedData(translatedQuiz) {
  if (!translatedQuiz) return;

  // Preencher campos básicos
  if (translatedQuiz.title)
    document.getElementById("title").value = translatedQuiz.title;
  if (translatedQuiz.nameLabel)
    document.getElementById("nameLabel").value = translatedQuiz.nameLabel;
  if (translatedQuiz.emailLabel)
    document.getElementById("emailLabel").value = translatedQuiz.emailLabel;
  if (translatedQuiz.buttonText)
    document.getElementById("buttonText").value = translatedQuiz.buttonText;
  if (translatedQuiz.footnote)
    document.getElementById("footnote").value = translatedQuiz.footnote;

  // Preencher perguntas e loaders
  const allBlocks = document.querySelectorAll(".question-block, .loader-block");
  let itemIndex = 0;
  if (translatedQuiz.items) {
    allBlocks.forEach((block) => {
      const item = translatedQuiz.items[itemIndex];
      if (!item) return;

      if (
        block.classList.contains("question-block") &&
        item.type === "question"
      ) {
        block.querySelector(".question-input").value = item.question;
        const optionInputs = block.querySelectorAll(".option-input");
        optionInputs.forEach((input, i) => {
          if (item.options[i]) {
            input.value = item.options[i];
          }
        });
        itemIndex++;
      } else if (
        block.classList.contains("loader-block") &&
        item.type === "loader"
      ) {
        block.querySelector(".loader-input").value = item.text;
        itemIndex++;
      }
    });
  }
}

/**
 * Função principal para traduzir o formulário atual usando o endpoint do servidor.
 * @param {string} targetLanguage - O código do idioma de destino (ex: 'es', 'en').
 */
async function translateCurrentFormViaServer(targetLanguage) {
  const statusElement = document.getElementById("liveTranslateStatus");
  const liveTranslateSelect = document.getElementById("liveTranslateSelect");
  const pageLoader = document.getElementById("page-loader");
  const loaderText = document.getElementById("loader-text");

  // Mapeia código para nome do idioma
  const languageNames = {
    zh: "Chinês (Mandarim)",
    hi: "Hindi",
    en: "Inglês",
    es: "Espanhol",
    ar: "Árabe",
    bn: "Bengali",
    fr: "Francês",
    ru: "Russo",
    pt: "Português",
    id: "Indonésio",
    ur: "Urdu",
    de: "Alemão",
    ja: "Japonês",
    sw: "Suaíli",
    mr: "Marathi",
    te: "Telugu",
    tr: "Turco",
    ta: "Tâmil",
    ko: "Coreano",
    vi: "Vietnamita",
    it: "Italiano",
    th: "Tailandês",
    gu: "Gujarati",
    kn: "Kannada",
    fa: "Persa (Farsi)",
    pl: "Polonês",
    uk: "Ucraniano",
    ml: "Malayalam",
    or: "Oriya",
    my: "Birmanês",
    nl: "Holandês",
    ps: "Pashto",
    si: "Sinhala",
    am: "Amárico",
    ne: "Nepalês",
    he: "Hebraico",
    cs: "Tcheco",
    hu: "Húngaro",
    ro: "Romeno",
    el: "Grego",
  };

  try {
    // Mostrar o loader de página inteira
    loaderText.textContent = `Traduzindo para ${
      languageNames[targetLanguage] || targetLanguage
    }...`;
    pageLoader.style.display = "flex";

    liveTranslateSelect.disabled = true;

    const quizData = getCurrentQuizDataFromForm();

    const response = await fetch("/translate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizData, targetLanguage }),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(
        errorResult.error || "Falha na comunicação com o servidor."
      );
    }

    const translatedQuiz = await response.json();

    populateFormWithTranslatedData(translatedQuiz);

    statusElement.textContent = "Tradução concluída!";
    statusElement.style.color = "#22C55D";

    resetPreview();
    updatePreview();
  } catch (error) {
    console.error("Erro ao traduzir via servidor:", error);
    statusElement.textContent = `Erro: ${error.message}`;
    statusElement.style.color = "#ef4444";
  } finally {
    // Esconder o loader de página inteira
    pageLoader.style.display = "none";
    liveTranslateSelect.disabled = false;
    setTimeout(() => {
      statusElement.textContent = "";
      statusElement.style.color = "#666";
      liveTranslateSelect.value = "";
    }, 4000);
  }
}

/**
 * Habilita a UI de tradução.
 */
function enableSimpleTranslationUI() {
  const loaderElement = document.getElementById("translationLoader");
  const sectionElement = document.getElementById("translationSection");
  const liveTranslateSelect = document.getElementById("liveTranslateSelect");

  if (loaderElement) loaderElement.style.display = "none";
  if (sectionElement) {
    sectionElement.style.opacity = "1";
    sectionElement.style.background = "#f0f9ff";
  }

  if (liveTranslateSelect) {
    liveTranslateSelect.disabled = false;
    liveTranslateSelect.style.opacity = "1";
    liveTranslateSelect.innerHTML = `
            <option value="">Selecione um idioma...</option>
            <option value="zh">🇨🇳 Chinês (Mandarim)</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="en">🇺🇸 Inglês</option>
            <option value="es">🇪🇸 Espanhol</option>
            <option value="ar">🇸🇦 Árabe</option>
            <option value="bn">🇧🇩 Bengali</option>
            <option value="fr">🇫🇷 Francês</option>
            <option value="ru">🇷🇺 Russo</option>
            <option value="pt">🇧🇷 Português</option>
            <option value="id">🇮🇩 Indonésio</option>
            <option value="ur">🇵🇰 Urdu</option>
            <option value="de">🇩🇪 Alemão</option>
            <option value="ja">🇯🇵 Japonês</option>
            <option value="sw">🇹🇿 Suaíli</option>
            <option value="mr">🇮🇳 Marathi</option>
            <option value="te">🇮🇳 Telugu</option>
            <option value="tr">🇹🇷 Turco</option>
            <option value="ta">🇮🇳 Tâmil</option>
            <option value="ko">🇰🇷 Coreano</option>
            <option value="vi">🇻🇳 Vietnamita</option>
            <option value="it">🇮🇹 Italiano</option>
            <option value="th">🇹🇭 Tailandês</option>
            <option value="gu">🇮🇳 Gujarati</option>
            <option value="kn">🇮🇳 Kannada</option>
            <option value="fa">🇮🇷 Persa (Farsi)</option>
            <option value="pl">🇵🇱 Polonês</option>
            <option value="uk">🇺🇦 Ucraniano</option>
            <option value="ml">🇮🇳 Malayalam</option>
            <option value="or">🇮🇳 Oriya</option>
            <option value="my">🇲🇲 Birmanês</option>
            <option value="nl">🇳🇱 Holandês</option>
            <option value="ps">🇦🇫 Pashto</option>
            <option value="si">🇱🇰 Sinhala</option>
            <option value="am">🇪🇹 Amárico</option>
            <option value="ne">🇳🇵 Nepalês</option>
            <option value="he">🇮🇱 Hebraico</option>
            <option value="cs">🇨🇿 Tcheco</option>
            <option value="hu">🇭🇺 Húngaro</option>
            <option value="ro">🇷🇴 Romeno</option>
            <option value="el">🇬🇷 Grego</option>
        `;
  }
}

// Função para configurar eventos de tradução
function setupTranslationEvents() {
  // Adicionar listener para o dropdown de tradução em tempo real
  const liveTranslateSelect = document.getElementById("liveTranslateSelect");
  if (liveTranslateSelect) {
    liveTranslateSelect.addEventListener("change", (e) => {
      const selectedLanguage = e.target.value;
      if (selectedLanguage) {
        translateCurrentFormViaServer(selectedLanguage);
      }
    });
  }
}