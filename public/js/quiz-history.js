// Módulo para gerenciamento do histórico de quizzes

// Funções para gerenciar histórico de quizzes
function saveQuizToHistory() {
  const quizData = {
    id: Date.now(),
    createdAt: new Date().toLocaleString("pt-BR"),
    vertical: document.getElementById("vertical").value,
    domain: document.getElementById("domain").value,
    withRetention: document.getElementById("withRetention").checked,
    title: document.getElementById("title").value,
    nameLabel: document.getElementById("nameLabel").value,
    emailLabel: document.getElementById("emailLabel").value,
    buttonText: document.getElementById("buttonText").value,
    footnote: document.getElementById("footnote").value,
    primaryColor: document.getElementById("primaryColor").value,
    secondaryColor: document.getElementById("secondaryColor").value,
    hoverColor: document.getElementById("hoverColor").value,

    // Salvar perguntas e loaders
    items: [],
  };

  // Coletar todos os blocos (perguntas e loaders) na ordem atual
  const allBlocks = Array.from(
    document.querySelectorAll(".question-block, .loader-block")
  );

  allBlocks.forEach((block) => {
    if (block.classList.contains("question-block")) {
      // É uma pergunta
      const questionText = block.querySelector(".question-input").value;
      const optionInputs = block.querySelectorAll(".option-input");
      const options = Array.from(optionInputs)
        .map((input) => input.value.trim())
        .filter((option) => option !== "");

      if (questionText && options.length) {
        quizData.items.push({
          type: "question",
          question: questionText,
          options: options,
        });
      }
    } else if (block.classList.contains("loader-block")) {
      // É um loader
      const loaderText = block.querySelector(".loader-input").value.trim();
      if (loaderText) {
        quizData.items.push({
          type: "loader",
          text: loaderText,
        });
      }
    }
  });

  // Carregar histórico existente
  let history = JSON.parse(localStorage.getItem("quizHistory") || "[]");

  // Adicionar novo quiz no início
  history.unshift(quizData);

  // Manter apenas os últimos 10 quizzes
  if (history.length > 10) {
    history = history.slice(0, 10);
  }

  // Salvar no localStorage
  localStorage.setItem("quizHistory", JSON.stringify(history));

  // Atualizar exibição do histórico
  loadQuizHistory();
}

function loadQuizHistory() {
  const history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
  const historyList = document.getElementById("historyList");
  const noHistory = document.getElementById("noHistory");

  if (history.length === 0) {
    historyList.style.display = "none";
    noHistory.style.display = "block";
    return;
  }

  historyList.style.display = "flex";
  noHistory.style.display = "none";
  historyList.innerHTML = "";

  history.forEach((quiz, index) => {
    const historyItem = document.createElement("div");
    historyItem.style.cssText = `border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      background: #f9f9f9;
      margin-bottom: 8px;
    `;

    // Header do item com informações básicas
    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = `display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    `;

    const infoDiv = document.createElement("div");
    infoDiv.style.flex = "1";

    const titleDiv = document.createElement("div");
    titleDiv.style.cssText =
      "font-weight: bold; font-size: 14px; color: #333; margin-bottom: 4px;";
    titleDiv.textContent = quiz.title || quiz.vertical || "Quiz sem título";

    const detailsDiv = document.createElement("div");
    detailsDiv.style.cssText = "font-size: 12px; color: #666;";
    detailsDiv.textContent = `${quiz.createdAt} • ${
      quiz.items.filter((i) => i.type === "question").length
    } perguntas • ${
      quiz.items.filter((i) => i.type === "loader").length
    } loaders`;

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(detailsDiv);

    // Container dos botões
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = "display: flex; gap: 8px; align-items: center;";

    // Botão de expandir/colapsar
    const toggleButton = document.createElement("button");
    toggleButton.innerHTML =
      '<span class="material-symbols-rounded" style="font-size: 16px;">expand_more</span>';
    toggleButton.title = "Expandir detalhes";
    toggleButton.style.cssText = `padding: 4px;
      background: transparent;
      color: #666;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      width: fit-content;
      flex: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const duplicateButton = document.createElement("button");
    duplicateButton.innerHTML =
      '<span class="material-symbols-rounded" style="font-size: 16px;">content_copy</span>';
    duplicateButton.title = "Duplicar quiz";
    duplicateButton.style.cssText = `padding: 4px;
      background: transparent;
      color: #22C55D;
      border: 1px solid #22C55D;
      border-radius: 4px;
      cursor: pointer;
      width: fit-content;
      flex: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Botão de traduzir
    const translateButton = document.createElement("button");
    translateButton.innerHTML =
      '<span class="material-symbols-rounded" style="font-size: 16px;">translate</span>';
    translateButton.title = "Traduzir quiz";
    translateButton.style.cssText = `padding: 4px;
      background: transparent;
      color: #3B82F6;
      border: 1px solid #3B82F6;
      border-radius: 4px;
      cursor: pointer;
      width: fit-content;
      flex: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 1;
    `;
    translateButton.disabled = false;
    translateButton.setAttribute("data-action", "translate");

    buttonsDiv.appendChild(toggleButton);
    buttonsDiv.appendChild(duplicateButton);
    buttonsDiv.appendChild(translateButton);

    headerDiv.appendChild(infoDiv);
    headerDiv.appendChild(buttonsDiv);

    // Conteúdo expandível com detalhes dos steps
    const expandableDiv = document.createElement("div");
    expandableDiv.style.cssText = `display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    `;

    // Lista de steps
    if (quiz.items && quiz.items.length > 0) {
      const stepsTitle = document.createElement("div");
      stepsTitle.style.cssText =
        "font-weight: bold; font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase;";
      stepsTitle.textContent = "Steps do Quiz:";
      expandableDiv.appendChild(stepsTitle);

      quiz.items.forEach((item, stepIndex) => {
        const stepDiv = document.createElement("div");
        stepDiv.style.cssText =
          `padding: 8px;
          margin: 4px 0;
          border-radius: 4px;
          font-size: 12px;
          ` +
          (item.type === "question"
            ? "background: #f0f9ff; border-left: 3px solid #0ea5e9;"
            : "background: #f0fdf4; border-left: 3px solid #22c55e;");

        if (item.type === "question") {
          stepDiv.innerHTML = `
            <strong>Pergunta:</strong> ${item.question}<br>
            <em>Opções: ${item.options.join(", ")}
          `;
        } else {
          stepDiv.innerHTML = `<strong>Loader:</strong> ${item.text}`;
        }
        expandableDiv.appendChild(stepDiv);
      });
    }

    historyItem.appendChild(headerDiv);
    historyItem.appendChild(expandableDiv);
    historyList.appendChild(historyItem);

    // Event listeners para os botões
    toggleButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = expandableDiv.style.display === "block";
      expandableDiv.style.display = isVisible ? "none" : "block";
      toggleButton.innerHTML = `<span class="material-symbols-rounded" style="font-size: 16px;">${
        isVisible ? "expand_more" : "expand_less"
      }</span>`;
    });

    duplicateButton.addEventListener("click", (e) => {
      e.stopPropagation();
      duplicateQuiz(quiz);
    });

    translateButton.addEventListener("click", async (e) => {
      e.stopPropagation();
      const lang = prompt(
        "Digite o código do idioma para traduzir (ex: en, es, fr):"
      );
      if (lang) {
        // Carrega o quiz do histórico para o formulário e depois traduz
        duplicateQuiz(quiz);
        setTimeout(() => translateCurrentFormViaServer(lang), 100);
      }
    });
  });
}

function duplicateQuiz(quizData) {
  // Limpar formulário atual
  document.getElementById("vertical").value = "";
  document.getElementById("domain").value = "";
  document.getElementById("withRetention").checked = false;
  document.getElementById("title").value = "";
  document.getElementById("nameLabel").value = "";
  document.getElementById("emailLabel").value = "";
  document.getElementById("buttonText").value = "";
  document.getElementById("footnote").value = "";
  document.getElementById("primaryColor").value = "#22C55D";
  document.getElementById("secondaryColor").value = "#16A349";
  document.getElementById("hoverColor").value = "#16A349";
  document.getElementById("questionsContainer").innerHTML = "";

  // Preencher com dados do quiz
  document.getElementById("vertical").value = quizData.vertical || "";
  document.getElementById("domain").value = quizData.domain || "";
  document.getElementById("withRetention").checked =
    quizData.withRetention || false;
  document.getElementById("title").value = quizData.title || "";
  document.getElementById("nameLabel").value = quizData.nameLabel || "";
  document.getElementById("emailLabel").value = quizData.emailLabel || "";
  document.getElementById("buttonText").value = quizData.buttonText || "";
  document.getElementById("footnote").value = quizData.footnote || "";
  document.getElementById("primaryColor").value =
    quizData.primaryColor || "#22C55D";
  document.getElementById("secondaryColor").value =
    quizData.secondaryColor || "#16A349";
  document.getElementById("hoverColor").value =
    quizData.hoverColor || "#16A349";

  // Adicionar perguntas e loaders
  if (quizData.items) {
    quizData.items.forEach((item) => {
      if (item.type === "question") {
        addQuestion();
        const newQuestionBlock = document.querySelector(
          ".question-block:last-child"
        );
        newQuestionBlock.querySelector(".question-input").value = item.question;
        const optionsContainer =
          newQuestionBlock.querySelector(".options-container");
        optionsContainer.innerHTML = ""; // Limpa opções padrão
        item.options.forEach((opt, i) => {
          addOption(
            newQuestionBlock.querySelector('button[onclick="addOption(this)"]')
          );
          const optionInputs =
            optionsContainer.querySelectorAll(".option-input");
          optionInputs[i].value = opt;
        });
      } else if (item.type === "loader") {
        addLoader();
        const newLoaderBlock = document.querySelector(
          ".loader-block:last-child"
        );
        newLoaderBlock.querySelector(".loader-input").value = item.text;
      }
    });
  }

  // Atualizar UI
  setTimeout(async () => {
    toggleRetentionFields();
    renumberQuestions();
    resetPreview();
    updatePreview();

    // Scroll para o topo
    window.scrollTo(0, 0);
  }, 100);
}