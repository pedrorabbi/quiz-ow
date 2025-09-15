// Módulo para sistema de preview do quiz

// Variável para controlar o step atual no preview
let currentPreviewStep = 0;

// Função para atualizar o preview em tempo real
function updatePreview(showTitleInForm = null) {
  try {
    // Se não foi especificado, detectar automaticamente se estamos no formulário
    if (showTitleInForm === null) {
      const previewForm = document.getElementById("previewForm");
      showTitleInForm = previewForm && previewForm.style.display === "block";
    }

    // Atualizar cores
    const primaryColor =
      document.getElementById("primaryColor")?.value || "#22C55D";
    const secondaryColor =
      document.getElementById("secondaryColor")?.value || "#16A349";
    const hoverColor =
      document.getElementById("hoverColor")?.value || "#16A349";

    // Atualizar textos
    const adLabel = document.getElementById("adLabel")?.value || "Ad Label";
    const title = document.getElementById("title")?.value || "Título do Quiz";
    const greeting =
      document.getElementById("greeting")?.value || "Subtítulo do quiz";
    const description = document.getElementById("description")?.value || "-";
    const nameLabel = document.getElementById("nameLabel")?.value || "Seu nome";
    const emailLabel =
      document.getElementById("emailLabel")?.value || "Seu email";
    const buttonText = document.getElementById("buttonText")?.value || "Enviar";
    const footnote =
      document.getElementById("footnote")?.value || "Rodapé do formulário";

    // Aplicar no preview com verificações
    const previewAdLabel = document.getElementById("previewAdLabel");
    const previewTitle = document.getElementById("previewTitle");
    const previewGreeting = document.getElementById("previewGreeting");
    const previewDescription = document.getElementById("previewDescription");
    const previewButton = document.getElementById("previewButton");
    const previewFootnote = document.getElementById("previewFootnote");

    if (previewAdLabel) {
      previewAdLabel.textContent = adLabel;
      previewAdLabel.style.display = "none";
    }
    if (previewTitle) {
      previewTitle.textContent = title;
      // Sempre ocultar título durante as perguntas, só mostrar no formulário final
      previewTitle.style.display = showTitleInForm ? "block" : "none";
    }
    if (previewGreeting) {
      previewGreeting.textContent = greeting;
      previewGreeting.style.display = "none";
    }
    if (previewDescription) previewDescription.textContent = description;
    if (previewButton) {
      previewButton.textContent = buttonText;
      previewButton.style.backgroundColor = primaryColor;
    }
    if (previewFootnote) previewFootnote.textContent = footnote;

    // Atualizar placeholders dos inputs
    const nameInput = document.getElementById("previewNameInput");
    const emailInput = document.getElementById("previewEmailInput");
    if (nameInput) nameInput.placeholder = nameLabel;
    if (emailInput) emailInput.placeholder = emailLabel;

    // Atualizar perguntas apenas se não estivermos no formulário final
    const previewForm = document.getElementById("previewForm");
    const isShowingForm = previewForm && previewForm.style.display === "block";
    const previewContent = document.getElementById("previewContent");

    // Ajustar padding baseado no estado
    if (previewContent) {
      if (isShowingForm) {
        // Formulário: manter padding normal
        previewContent.style.padding = "20px";
      } else {
        // Perguntas: remover padding vertical
        previewContent.style.padding = "0 20px";
      }
    }

    if (!isShowingForm) {
      updatePreviewQuestions();
    }
  } catch (error) {
    console.error("Erro ao atualizar preview:", error);
  }
}

// Função para atualizar a barra de progresso no topo
function updateTopProgressBar(currentQuestionStep, totalSteps) {
  const topProgressFill = document.getElementById("topProgressFill");
  if (!topProgressFill) return;

  // Cada step (pergunta ou formulário) representa uma parte igual
  // currentQuestionStep = quantas perguntas já foram respondidas (0, 1, 2, etc.)
  // totalSteps = total de perguntas + 1 formulário
  const progress = (currentQuestionStep / totalSteps) * 100;
  topProgressFill.style.width = `${progress}%`;
}

// Função para atualizar as perguntas no preview
function updatePreviewQuestions() {
  try {
    const questionsContainer = document.getElementById("previewQuestions");
    if (!questionsContainer) return;

    const allBlocks = Array.from(
      document.querySelectorAll(".question-block, .loader-block")
    );
    const questionBlocks = Array.from(
      document.querySelectorAll(".question-block")
    );

    // Total de steps = perguntas + formulário
    const totalSteps = questionBlocks.length + 1;

    // Contar quantas perguntas já foram respondidas (antes do step atual)
    let questionsAnswered = 0;
    for (let i = 0; i < currentPreviewStep; i++) {
      if (allBlocks[i] && allBlocks[i].classList.contains("question-block")) {
        questionsAnswered++;
      }
    }

    // Atualizar barra de progresso no topo
    updateTopProgressBar(questionsAnswered, totalSteps);

    // Limpar conteúdo existente no preview
    questionsContainer.innerHTML = "";

    if (allBlocks.length === 0) {
      // Mostrar pergunta de exemplo se não houver nada
      const questionDiv = createPreviewQuestion(
        "Pergunta de exemplo",
        ["Opção 1", "Opção 2"],
        0,
        2 // 1 pergunta + 1 formulário
      );
      questionsContainer.appendChild(questionDiv);
    } else {
      // Mostrar apenas o step atual (pergunta ou loader)
      if (currentPreviewStep >= allBlocks.length) {
        currentPreviewStep = 0;
      }

      const currentBlock = allBlocks[currentPreviewStep];
      if (currentBlock) {
        if (currentBlock.classList.contains("question-block")) {
          // É uma pergunta - contar quantas perguntas vieram antes
          let questionIndex = 0;
          for (let i = 0; i < currentPreviewStep; i++) {
            if (allBlocks[i].classList.contains("question-block")) {
              questionIndex++;
            }
          }

          const questionInput = currentBlock.querySelector(".question-input");
          const questionText =
            questionInput?.value || `Pergunta ${questionIndex + 1}`;
          const optionInputs = currentBlock.querySelectorAll(".option-input");

          const options = Array.from(optionInputs)
            .map((input, index) => ({
              value: input?.value?.trim() || "",
              index: index + 1,
            }))
            .filter((option) => option.value !== "")
            .map((option) => option.value);

          // Garantir pelo menos 2 opções para o preview
          const displayOptions =
            options.length > 0 ? options : ["Opção 1", "Opção 2"];

          const questionDiv = createPreviewQuestion(
            questionText,
            displayOptions,
            questionIndex,
            totalSteps
          );
          questionsContainer.appendChild(questionDiv);
        } else if (currentBlock.classList.contains("loader-block")) {
          // É um loader - não conta como step
          const loaderInput = currentBlock.querySelector(".loader-input");
          const loaderText =
            loaderInput?.value ||
            "WIR SUCHEN DIE BESTEN KREDITOPTIONEN FÜR SIE ...";

          const loaderDiv = createPreviewLoader(loaderText);
          questionsContainer.appendChild(loaderDiv);
        }
      }
    }

    // Atualizar cores das opções
    updatePreviewColors();

    // Mostrar/esconder formulário
    const previewForm = document.getElementById("previewForm");
    if (previewForm) {
      previewForm.style.display = "none";
    }
  } catch (error) {
    console.error("Erro ao atualizar perguntas do preview:", error);
  }
}

// Função para criar uma pergunta no preview
function createPreviewQuestion(questionText, options, stepIndex, totalSteps) {
  const questionDiv = document.createElement("div");
  questionDiv.className = "preview-question";
  questionDiv.style.marginBottom = "20px";

  const questionTitle = document.createElement("h4");
  questionTitle.textContent = questionText;
  questionTitle.style.margin = "0 0 15px 0";
  questionTitle.style.color = "#333";
  questionTitle.style.textAlign = "center";

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "preview-options";

  options.forEach((optionText, optIndex) => {
    if (optionText.trim()) {
      const optionButton = document.createElement("button");
      optionButton.className = "preview-option";
      optionButton.textContent = optionText;
      optionButton.style.cssText =
        "display: block; width: 100%; padding: 12px; margin: 8px 0; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s ease;";

      // Adicionar evento de click para avançar para próximo step
      optionButton.addEventListener("click", () => {
        const allBlocks = Array.from(
          document.querySelectorAll(".question-block, .loader-block")
        );
        if (currentPreviewStep < allBlocks.length - 1) {
          currentPreviewStep++;
          updatePreviewQuestions();
        } else {
          // Última pergunta - mostrar formulário
          document.getElementById("previewQuestions").style.display = "none";
          document.getElementById("previewForm").style.display = "block";
          // Atualizar progress bar para mostrar que estamos no formulário
          const questionBlocks = document.querySelectorAll(".question-block");
          const totalSteps = questionBlocks.length + 1;
          // Todas as perguntas foram respondidas, estamos no formulário
          updateTopProgressBar(questionBlocks.length, totalSteps);
          // Mostrar título no formulário final
          updatePreview(true);
        }
      });

      optionsDiv.appendChild(optionButton);
    }
  });

  questionDiv.appendChild(questionTitle);
  questionDiv.appendChild(optionsDiv);

  return questionDiv;
}

// Função para criar um loader no preview
function createPreviewLoader(loaderText) {
  const loaderDiv = document.createElement("div");
  loaderDiv.className = "preview-loader";
  loaderDiv.style.cssText = "text-align: center; margin-bottom: 20px;";

  // Texto do loader
  const loaderTextDiv = document.createElement("div");
  loaderTextDiv.textContent = loaderText;
  loaderTextDiv.style.cssText = `font-size: 18px;
    font-weight: bold;
    color: #22C55D;
    margin: 40px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;

  // Animação de loading (pontos)
  const dotsDiv = document.createElement("div");
  dotsDiv.style.cssText = `display: flex;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
  `;

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.style.cssText = `width: 12px;
      height: 12px;
      background-color: #22C55D;
      border-radius: 50%;
      animation: loadingDot 1.2s infinite ease-in-out;
      animation-delay: " + i * 0.2 + "s;
    `;
    dotsDiv.appendChild(dot);
  }

  loaderDiv.appendChild(loaderTextDiv);
  loaderDiv.appendChild(dotsDiv);

  // Avançar automaticamente após 2 segundos
  setTimeout(() => {
    const allBlocks = Array.from(
      document.querySelectorAll(".question-block, .loader-block")
    );
    if (currentPreviewStep < allBlocks.length - 1) {
      currentPreviewStep++;
      updatePreviewQuestions();
    } else {
      // Última step - mostrar formulário
      document.getElementById("previewQuestions").style.display = "none";
      document.getElementById("previewForm").style.display = "block";
      // Atualizar progress bar para mostrar que estamos no formulário
      const questionBlocks = document.querySelectorAll(".question-block");
      const totalSteps = questionBlocks.length + 1;
      // Todas as perguntas foram respondidas, estamos no formulário
      updateTopProgressBar(questionBlocks.length, totalSteps);
      // Mostrar título no formulário final
      updatePreview(true);
    }
  }, 2000);

  return loaderDiv;
}

// Função para resetar o preview para o primeiro step
function resetPreview() {
  currentPreviewStep = 0;
  document.getElementById("previewQuestions").style.display = "block";
  document.getElementById("previewForm").style.display = "none";
  updatePreviewQuestions();
  // Garantir que o título fique oculto durante as perguntas
  updatePreview(false);
}

// Função para atualizar cores do preview
function updatePreviewColors() {
  const primaryColor =
    document.getElementById("primaryColor").value || "#22C55D";
  const secondaryColor =
    document.getElementById("secondaryColor").value || "#16A349";
  const hoverColor = document.getElementById("hoverColor").value || "#16A349";

  const previewOptions = document.querySelectorAll(".preview-option");
  previewOptions.forEach((option) => {
    option.style.backgroundColor = secondaryColor;
    option.style.color = "white";

    // Remover listeners antigos se existirem
    option.onmouseenter = null;
    option.onmouseleave = null;

    // Adicionar novos eventos de hover
    option.onmouseenter = function () {
      this.style.backgroundColor = hoverColor;
      this.style.color = "white";
    };

    option.onmouseleave = function () {
      this.style.backgroundColor = secondaryColor;
      this.style.color = "white";
    };
  });
}

// Função para controlar exibição dos campos de retenção
function toggleRetentionFields() {
  const withRetention = document.getElementById("withRetention").checked;
  const retentionFields = document.getElementById("retentionFields");
  const previewNameContainer = document.getElementById(
    "previewNameInputContainer"
  );
  const previewEmailContainer = document.getElementById(
    "previewEmailInputContainer"
  );

  if (withRetention) {
    retentionFields.style.display = "flex";
    // Mostrar campos no preview
    if (previewNameContainer) previewNameContainer.style.display = "flex";
    if (previewEmailContainer) previewEmailContainer.style.display = "flex";
  } else {
    retentionFields.style.display = "none";
    // Esconder campos no preview
    if (previewNameContainer) previewNameContainer.style.display = "none";
    if (previewEmailContainer) previewEmailContainer.style.display = "none";
  }

  updatePreview();
}

// Função para configurar eventos do preview
function setupPreviewEvents() {
  // Adicionar listener ao botão do formulário do preview
  const previewButton = document.getElementById("previewButton");
  if (previewButton) {
    previewButton.addEventListener("click", () => {
      // Completar barra de progresso quando enviar formulário
      const questionBlocks = document.querySelectorAll(".question-block");
      const totalSteps = questionBlocks.length + 1;
      // Formulário enviado = todos os steps completados
      updateTopProgressBar(totalSteps, totalSteps);
    });
  }

  // Adicionar listener para o checkbox de retenção
  const withRetentionCheckbox = document.getElementById("withRetention");
  if (withRetentionCheckbox) {
    withRetentionCheckbox.addEventListener("change", toggleRetentionFields);
    // Inicializar estado
    toggleRetentionFields();
  }
}