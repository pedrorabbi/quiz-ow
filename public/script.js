async function createHtmlTemplate() {
  // Coleta os valores dos campos do formulário pelo ID
  const vertical = document.getElementById("vertical").value;
  const domain = document.getElementById("domain").value;
  const primaryColor = document.getElementById("primaryColor").value;
  const secondaryColor = document.getElementById("secondaryColor").value;
  const hoverColor = document.getElementById("hoverColor").value;

  const adLabel = document.getElementById("adLabel").value;
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const buttonText = document.getElementById("buttonText").value;
  const footnote = document.getElementById("footnote").value;
  const greeting = document.getElementById("greeting").value;

  // Verificar se é com retenção para incluir name/email labels
  const withRetention = document.getElementById("withRetention").checked;
  const nameLabel = withRetention
    ? document.getElementById("nameLabel").value
    : "";
  const emailLabel = withRetention
    ? document.getElementById("emailLabel").value
    : "";

  // Coleta as perguntas, loaders e opções adicionadas dinamicamente no formulário
  const items = [];
  const allBlocks = Array.from(document.querySelectorAll(".question-block, .loader-block"));

  allBlocks.forEach((block) => {
    if (block.classList.contains("question-block")) {
      // É uma pergunta
      const questionText = block.querySelector(".question-input").value;
      const optionInputs = block.querySelectorAll(".option-input");
      const options = Array.from(optionInputs)
        .map((input) => input.value.trim())
        .filter((option) => option !== ""); // Remove opções vazias
      if (questionText && options.length) {
        items.push({ type: "question", question: questionText, options });
      }
    } else if (block.classList.contains("loader-block")) {
      // É um loader
      const loaderText = block.querySelector(".loader-input").value.trim();
      if (loaderText) {
        items.push({ type: "loader", text: loaderText });
      }
    }
  });

  // Separar perguntas dos loaders para compatibilidade com a API atual
  const questions = items.filter(item => item.type === "question").map(item => ({
    question: item.question,
    options: item.options
  }));

  // Montagem do corpo do request para a API que gera o template HTML
  const htmlTemplate = await fetch("/proxy/template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "form-basic",
      inserterUrl: "https://ow-webhook-379661335618.us-east1.run.app/webhook",
      inserterOptions: {
        vertical: vertical,
        domain: domain,
        service: "pubsub",
      },
      color: {
        primary: primaryColor,
        secondary: secondaryColor,
        hover: hoverColor,
      },
      adLabel: adLabel,
      messages: {
        description: description,
        title: title,
        name: nameLabel,
        email: emailLabel,
        button: buttonText,
        footnote: footnote,
        greeting: greeting,
      },
      questions: questions,
      loaders: items.filter(item => item.type === "loader"),
    }),
  })
    .then(async (res) => {
      // Tratamento da resposta da API
      const json = await res.json();
      console.log(json);
      const apiResponse = document.getElementById("apiResponse");

      if (json.error) {
        // Exibe erro na interface, formatando quebras de linha
        apiResponse.innerHTML = `❌ Erro: ${json.error.replace(/\n/g, "<br>")}`;
        apiResponse.style.color = "red";
      } else if (json.html_array) {
        // Caso sucesso, informa ao usuário e chama função para criar link
        apiResponse.textContent = "✅ Quiz criado com sucesso!";
        apiResponse.style.color = "green";
        createLink(json.html_array);
      } else {
        // Caso resposta inesperada
        apiResponse.textContent = "⚠️ Resposta inesperada da API.";
        apiResponse.style.color = "orange";
      }
    })
    .catch((err) => {
      // Exibe erro de comunicação com a API
      const apiResponse = document.getElementById("apiResponse");
      apiResponse.textContent = `❌ Erro: ${err.message}`;
      apiResponse.style.color = "red";
    });
}

// Função que cria o link do quiz a partir do template HTML gerado
function createLink(htmlTemplate) {
  const quizName = document.getElementById("quizName").value;

  // Configuração dos headers para a requisição da criação do link
  const myHeaders = new Headers();
  myHeaders.append("X-ElegantQuiz-ApiKey", "cmbr8lju0000009l85ri155xj");
  myHeaders.append("Content-Type", "application/json");

  // Corpo da requisição com nome do quiz e dados do template HTML
  const raw = JSON.stringify({
    name: quizName,
    data: {
      html_array: [htmlTemplate], // Usa o template HTML retornado
    },
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  // Envia requisição para criar o link do quiz
  fetch("https://custom-embed.humberto-56a.workers.dev/s/", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      const linkResponse = document.getElementById("linkResponse");
      if (!linkResponse) return;
      if (result.success) {
        // Exibe link criado com sucesso na interface
        linkResponse.innerHTML = `
          <div>✅ Link criado com sucesso!</div>
          <div style="font-size: 14px;">${result.file}</div>
        `;
        linkResponse.style.color = "green";
      } else {
        // Exibe erro na criação do link
        linkResponse.textContent = `❌ Erro ao criar o link: ${JSON.stringify(
          result
        )}`;
        linkResponse.style.color = "red";
      }
    })
    .catch((error) => console.error(error));
}

// Variáveis para controle do drag and drop
let draggedElement = null;

// Função para configurar drag and drop em um elemento de pergunta
function setupDragAndDrop(questionElement) {
  questionElement.addEventListener("dragstart", function (e) {
    draggedElement = this;
    this.style.opacity = "0.5";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", this.outerHTML);
  });

  questionElement.addEventListener("dragend", function (e) {
    this.style.opacity = "";
    // Limpar todos os indicadores
    document.querySelectorAll(".question-block").forEach((block) => {
      block.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
    });
    draggedElement = null;
  });

  questionElement.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (this !== draggedElement) {
      // Remover classes de outros elementos
      document.querySelectorAll(".question-block").forEach((block) => {
        if (block !== this) {
          block.classList.remove(
            "drag-over",
            "drag-over-top",
            "drag-over-bottom"
          );
        }
      });

      this.classList.add("drag-over");

      const rect = this.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (e.clientY < midpoint) {
        this.classList.add("drag-over-top");
        this.classList.remove("drag-over-bottom");
      } else {
        this.classList.add("drag-over-bottom");
        this.classList.remove("drag-over-top");
      }
    }
  });

  questionElement.addEventListener("drop", function (e) {
    e.preventDefault();

    if (this !== draggedElement) {
      const container = document.getElementById("questionsContainer");
      const rect = this.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      // Inserir na posição correta
      if (e.clientY < midpoint) {
        container.insertBefore(draggedElement, this);
      } else {
        container.insertBefore(draggedElement, this.nextSibling);
      }

      // Renumerar e atualizar
      setTimeout(() => {
        renumberQuestions();
        resetPreview();
        updatePreview();
      }, 50);
    }

    // Limpar classes
    this.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
  });
}

// Função para renumerar as perguntas e loaders após reordenação
function renumberQuestions() {
  const questionBlocks = document.querySelectorAll(".question-block");
  const loaderBlocks = document.querySelectorAll(".loader-block");
  
  let questionIndex = 1;
  let loaderIndex = 1;
  
  // Renumerar perguntas
  questionBlocks.forEach((block) => {
    const questionNumber = block.querySelector(".question-number");
    if (questionNumber) {
      questionNumber.textContent = `Pergunta ${questionIndex}`;
      questionIndex++;
    }
  });
  
  // Renumerar loaders
  loaderBlocks.forEach((block) => {
    const loaderLabel = block.querySelector(".loader-label");
    if (loaderLabel) {
      loaderLabel.textContent = `Loader ${loaderIndex}`;
      loaderIndex++;
    }
  });
}

// Função auxiliar para adicionar um loader ao formulário
function addLoader() {
  const container = document.getElementById("questionsContainer");
  const index = container.children.length;

  // Cria um novo bloco de loader
  const loaderDiv = document.createElement("div");
  loaderDiv.classList.add("loader-block");
  loaderDiv.draggable = true;
  loaderDiv.innerHTML = `
          <div class="drag-handle">≡≡</div>
          <div class="loader-label">Loader ${index + 1}</div>
          <div class="floating-label-group">
            <input type="text" placeholder=" " class="loader-input" />
            <label>Texto do loader</label>
          </div>
        `;
  container.appendChild(loaderDiv);

  // Adicionar event listener ao novo input
  const input = loaderDiv.querySelector("input");
  input.addEventListener("input", () => {
    resetPreview();
    updatePreview();
  });

  // Adicionar eventos de drag and drop
  setupDragAndDrop(loaderDiv);

  // Reconfigurar eventos após adicionar novo loader
  setTimeout(() => {
    const loaderInput = loaderDiv.querySelector("input");
    loaderInput.removeEventListener("input", updatePreview);
    loaderInput.addEventListener("input", () => {
      resetPreview();
      updatePreview();
    });
  }, 10);

  resetPreview();
  updatePreview();
}

// Função auxiliar para adicionar uma nova pergunta ao formulário
function addQuestion() {
  const container = document.getElementById("questionsContainer");
  const index = container.children.length;

  // Cria um novo bloco de pergunta com dois campos de opção iniciais
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("question-block");
  questionDiv.draggable = true;
  questionDiv.innerHTML = `
          <div class="drag-handle">≡≡</div>
          <div class="question-number">Pergunta ${index + 1}</div>
          <div class="floating-label-group">
            <input type="text" placeholder=" " class="question-input" />
            <label>Texto da Pergunta</label>
          </div>
          <div class="options-container">
            <div class="floating-label-group">
              <input type="text" placeholder=" " class="option-input" />
              <label>Opção 1</label>
            </div>
            <div class="floating-label-group">
              <input type="text" placeholder=" " class="option-input" />
              <label>Opção 2</label>
            </div>
          </div>
          <button type="button" onclick="addOption(this)">Adicionar Opção</button>
        `;
  container.appendChild(questionDiv);

  // Adicionar event listeners aos novos inputs
  const inputs = questionDiv.querySelectorAll("input");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      resetPreview();
      updatePreview();
    });
  });

  // Adicionar eventos de drag and drop
  setupDragAndDrop(questionDiv);

  // Reconfigurar todos os eventos após adicionar nova pergunta
  setTimeout(() => {
    const allInputs = questionDiv.querySelectorAll("input");
    allInputs.forEach((input) => {
      // Remover listeners antigos para evitar duplicação
      input.removeEventListener("input", updatePreview);
      input.addEventListener("input", () => {
        if (
          input.classList.contains("question-input") ||
          input.classList.contains("option-input")
        ) {
          resetPreview();
        }
        updatePreview();
      });
    });
  }, 10);

  resetPreview();
  updatePreview();
}

// Função auxiliar para adicionar uma nova opção dentro de uma pergunta existente
function addOption(button) {
  // O botão está dentro do bloco da pergunta, pega o container de opções anterior ao botão
  const optionsContainer = button.previousElementSibling;

  // Conta quantas opções já existem para definir o número da nova opção
  const optionCount =
    optionsContainer.querySelectorAll(".floating-label-group").length + 1;

  // Cria o novo campo de input e label para a nova opção
  const wrapper = document.createElement("div");
  wrapper.className = "floating-label-group";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = " ";
  input.classList.add("option-input");
  input.addEventListener("input", updatePreview);
  const label = document.createElement("label");
  label.textContent = `Opção ${optionCount}`;
  wrapper.appendChild(input);
  wrapper.appendChild(label);
  optionsContainer.appendChild(wrapper);

  updatePreview();
}

// Função para atualizar o preview em tempo real
function updatePreview() {
  try {
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
    const description =
      document.getElementById("description")?.value ||
      "Descrição do formulário";
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

    if (previewAdLabel) previewAdLabel.textContent = adLabel;
    if (previewTitle) previewTitle.textContent = title;
    if (previewGreeting) previewGreeting.textContent = greeting;
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

    // Atualizar perguntas
    updatePreviewQuestions();
  } catch (error) {
    console.error("Erro ao atualizar preview:", error);
  }
}

// Variável para controlar o step atual no preview
let currentPreviewStep = 0;

// Função para atualizar as perguntas no preview
function updatePreviewQuestions() {
  try {
    const questionsContainer = document.getElementById("previewQuestions");
    if (!questionsContainer) return;

    const allBlocks = Array.from(document.querySelectorAll(".question-block, .loader-block"));

    // Limpar conteúdo existente no preview
    questionsContainer.innerHTML = "";

    if (allBlocks.length === 0) {
      // Mostrar pergunta de exemplo se não houver nada
      const questionDiv = createPreviewQuestion(
        "Pergunta de exemplo",
        ["Opção 1", "Opção 2"],
        0,
        1
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
          // É uma pergunta
          const questionInput = currentBlock.querySelector(".question-input");
          const questionText =
            questionInput?.value || `Pergunta ${currentPreviewStep + 1}`;
          const optionInputs = currentBlock.querySelectorAll(".option-input");

          const options = Array.from(optionInputs)
            .map((input, index) => ({ value: input?.value?.trim() || "", index: index + 1 }))
            .filter((option) => option.value !== "")
            .map((option) => option.value);

          // Garantir pelo menos 2 opções para o preview
          const displayOptions = options.length > 0 ? options : ["Opção 1", "Opção 2"];

          const questionDiv = createPreviewQuestion(
            questionText,
            displayOptions,
            currentPreviewStep,
            allBlocks.length
          );
          questionsContainer.appendChild(questionDiv);
        } else if (currentBlock.classList.contains("loader-block")) {
          // É um loader
          const loaderInput = currentBlock.querySelector(".loader-input");
          const loaderText = loaderInput?.value || "WIR SUCHEN DIE BESTEN KREDITOPTIONEN FÜR SIE ...";
          
          const loaderDiv = createPreviewLoader(
            loaderText,
            currentPreviewStep,
            allBlocks.length
          );
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

  // Indicador de progresso
  if (totalSteps > 1) {
    const progressDiv = document.createElement("div");
    progressDiv.style.cssText =
      "display: flex; gap: 4px; margin-bottom: 15px; justify-content: center;";

    for (let i = 0; i < totalSteps; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: 8px; 
        height: 8px; 
        border-radius: 50%; 
        background-color: ${i <= stepIndex ? "#22C55D" : "#ddd"};
        transition: background-color 0.3s ease;
      `;
      progressDiv.appendChild(dot);
    }

    questionDiv.appendChild(progressDiv);
  }

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
        const questionBlocks = document.querySelectorAll(".question-block");
        if (currentPreviewStep < questionBlocks.length - 1) {
          currentPreviewStep++;
          updatePreviewQuestions();
        } else {
          // Última pergunta - mostrar formulário
          document.getElementById("previewQuestions").style.display = "none";
          document.getElementById("previewForm").style.display = "block";
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
function createPreviewLoader(loaderText, stepIndex, totalSteps) {
  const loaderDiv = document.createElement("div");
  loaderDiv.className = "preview-loader";
  loaderDiv.style.cssText = "text-align: center; margin-bottom: 20px;";

  // Indicador de progresso
  if (totalSteps > 1) {
    const progressDiv = document.createElement("div");
    progressDiv.style.cssText =
      "display: flex; gap: 4px; margin-bottom: 15px; justify-content: center;";

    for (let i = 0; i < totalSteps; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: 8px; 
        height: 8px; 
        border-radius: 50%; 
        background-color: ${i <= stepIndex ? "#22C55D" : "#ddd"};
        transition: background-color 0.3s ease;
      `;
      progressDiv.appendChild(dot);
    }

    loaderDiv.appendChild(progressDiv);
  }

  // Texto do loader
  const loaderTextDiv = document.createElement("div");
  loaderTextDiv.textContent = loaderText;
  loaderTextDiv.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    color: #22C55D;
    margin: 40px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;

  // Animação de loading (pontos)
  const dotsDiv = document.createElement("div");
  dotsDiv.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
  `;

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.style.cssText = `
      width: 12px;
      height: 12px;
      background-color: #22C55D;
      border-radius: 50%;
      animation: loadingDot 1.2s infinite ease-in-out;
      animation-delay: ${i * 0.2}s;
    `;
    dotsDiv.appendChild(dot);
  }

  loaderDiv.appendChild(loaderTextDiv);
  loaderDiv.appendChild(dotsDiv);

  // Avançar automaticamente após 2 segundos
  setTimeout(() => {
    const allBlocks = Array.from(document.querySelectorAll(".question-block, .loader-block"));
    if (currentPreviewStep < allBlocks.length - 1) {
      currentPreviewStep++;
      updatePreviewQuestions();
    } else {
      // Última step - mostrar formulário
      document.getElementById("previewQuestions").style.display = "none";
      document.getElementById("previewForm").style.display = "block";
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
    };

    option.onmouseleave = function () {
      this.style.backgroundColor = secondaryColor;
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

// Inicializar preview quando a página carregar
document.addEventListener("DOMContentLoaded", function () {
  // Adicionar listeners apenas para inputs do formulário (não do preview)
  const formInputs = document.querySelectorAll(
    'input[type="text"]:not(#previewNameInput):not(#previewEmailInput), input[type="color"]'
  );
  formInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (
        input.classList.contains("question-input") ||
        input.classList.contains("option-input") ||
        input.classList.contains("loader-input")
      ) {
        resetPreview();
      }
      updatePreview();
    });
  });

  // Adicionar listener para o checkbox de retenção
  const withRetentionCheckbox = document.getElementById("withRetention");
  if (withRetentionCheckbox) {
    withRetentionCheckbox.addEventListener("change", toggleRetentionFields);
    // Inicializar estado
    toggleRetentionFields();
  }

  // Configurar drag and drop para perguntas já existentes
  const existingQuestions = document.querySelectorAll(".question-block");
  existingQuestions.forEach(setupDragAndDrop);

  // Configurar o container para aceitar drops
  const questionsContainer = document.getElementById("questionsContainer");
  if (questionsContainer) {
    questionsContainer.addEventListener("dragover", function (e) {
      e.preventDefault();
    });

    questionsContainer.addEventListener("drop", function (e) {
      e.preventDefault();
      // Se soltar em área vazia, adicionar no final
      if (e.target === this && draggedElement) {
        this.appendChild(draggedElement);
        setTimeout(() => {
          renumberQuestions();
          resetPreview();
          updatePreview();
        }, 50);
      }
    });
  }

  // Atualizar preview inicial
  updatePreview();
});
