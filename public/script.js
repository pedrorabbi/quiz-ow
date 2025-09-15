// Variável global para armazenar o template HTML criado
let currentHtmlTemplate = null;

async function createHtmlTemplate() {
  // Mostrar o loader de página inteira
  const pageLoader = document.getElementById("page-loader");
  const loaderText = document.getElementById("loader-text");

  if (pageLoader && loaderText) {
    loaderText.textContent = "Criando quiz...";
    pageLoader.style.display = "flex";
  }

  try {
    // Coleta os valores dos campos do formulário pelo ID
  const vertical = document.getElementById("vertical").value;
  const domain = document.getElementById("domain").value;
  const primaryColor = document.getElementById("primaryColor").value;
  const secondaryColor = document.getElementById("secondaryColor").value;
  const hoverColor = document.getElementById("hoverColor").value;

  const footnote = document.getElementById("footnote").value;
  const adLabel = footnote; // Usar o mesmo valor do rodapé
  const title = document.getElementById("title").value;
  const description = "-";
  const buttonText = document.getElementById("buttonText").value;
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
  const questions = items
    .filter((item) => item.type === "question")
    .map((item) => ({
      question: item.question,
      options: item.options,
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
      loaders: items.filter((item) => item.type === "loader"),
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
        // Salvar o template HTML globalmente para uso no modal
        currentHtmlTemplate = json.html_array;

        // Salvar quiz no histórico antes de criar o link
        saveQuizToHistory();

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
  } catch (error) {
    // Erro geral na função
    console.error("Erro na criação do quiz:", error);
    const apiResponse = document.getElementById("apiResponse");
    if (apiResponse) {
      apiResponse.textContent = `❌ Erro: ${error.message}`;
      apiResponse.style.color = "red";
    }
  } finally {
    // Sempre esconder o loader de página inteira
    if (pageLoader) {
      pageLoader.style.display = "none";
    }
  }
}

// Função que cria o link do quiz a partir do template HTML gerado
function createLink(htmlTemplate) {
  // Mostrar o loader de página inteira para criação do link
  const pageLoader = document.getElementById("page-loader");
  const loaderText = document.getElementById("loader-text");

  if (pageLoader && loaderText) {
    loaderText.textContent = "Criando link do quiz...";
    pageLoader.style.display = "flex";
  }

  const quizName = document.getElementById("vertical").value;

  // Configuração dos headers para a requisição da criação do link
  const myHeaders = new Headers();
  myHeaders.append("X-ElegantQuiz-ApiKey", "cmbr8lju0000009l85ri155xj");
  myHeaders.append("Content-Type", "application/json");

  // Corpo da requisição com nome do quiz e dados do template HTML
  const raw = JSON.stringify({
    name: quizName,
    data: {
      html: htmlTemplate, // Usa o template HTML retornado
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
        // Mostrar modal de sucesso em vez da mensagem antiga
        showSuccessModal();
      } else {
        // Exibe erro na criação do link
        linkResponse.textContent = `❌ Erro ao criar o link: ${JSON.stringify(
          result
        )}`;
        linkResponse.style.color = "red";
      }
    })
    .catch((error) => console.error(error))
    .finally(() => {
      // Sempre esconder o loader de página inteira
      if (pageLoader) {
        pageLoader.style.display = "none";
      }
    });
}

// Variáveis para controle do drag and drop
let draggedElement = null;

// Função para configurar drag and drop em um elemento (pergunta ou loader)
function setupDragAndDrop(element) {
  element.addEventListener("dragstart", function (e) {
    draggedElement = this;
    this.style.opacity = "0.5";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", this.outerHTML);
  });

  element.addEventListener("dragend", function (e) {
    this.style.opacity = "";
    // Limpar todos os indicadores
    document
      .querySelectorAll(".question-block, .loader-block")
      .forEach((block) => {
        block.classList.remove(
          "drag-over",
          "drag-over-top",
          "drag-over-bottom"
        );
      });
    draggedElement = null;
  });

  element.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (this !== draggedElement && draggedElement) {
      // Remover classes de outros elementos
      document
        .querySelectorAll(".question-block, .loader-block")
        .forEach((block) => {
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

  element.addEventListener("drop", function (e) {
    e.preventDefault();

    if (this !== draggedElement && draggedElement) {
      const container = document.getElementById("questionsContainer");
      const rect = this.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      try {
        // Inserir na posição correta
        if (e.clientY < midpoint) {
          container.insertBefore(draggedElement, this);
        } else {
          container.insertBefore(draggedElement, this.nextSibling);
        }

        // Renumerar e atualizar com delay maior para estabilidade
        setTimeout(() => {
          renumberQuestions();
          resetPreview();
          updatePreview();
        }, 100);
      } catch (error) {
        console.error("Erro durante reordenação:", error);
      }
    }

    // Limpar classes
    this.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
  });
}

// Função para renumerar as perguntas e loaders após reordenação
function renumberQuestions() {
  try {
    // Renumerar baseado na ordem atual no DOM
    const container = document.getElementById("questionsContainer");
    if (!container) return;

    const allBlocks = Array.from(container.children);
    let questionIndex = 1;
    let loaderIndex = 1;

    allBlocks.forEach((block) => {
      if (block.classList.contains("question-block")) {
        const questionNumber = block.querySelector(".question-number");
        if (questionNumber) {
          questionNumber.textContent = `Pergunta ${questionIndex}`;
          questionIndex++;
        }
      } else if (block.classList.contains("loader-block")) {
        const loaderLabel = block.querySelector(".loader-label");
        if (loaderLabel) {
          loaderLabel.textContent = `Loader ${loaderIndex}`;
          loaderIndex++;
        }
      }
    });
  } catch (error) {
    console.error("Erro ao renumerar blocos:", error);
  }
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div class="loader-label">Loader ${index + 1}</div>
            <button type="button" onclick="removeLoader(this)" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 4px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex: 0; width: fit-content;" title="Excluir loader">
              <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
            </button>
          </div>
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
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="question-number">Pergunta ${index + 1}</div>
            <button type="button" onclick="removeQuestion(this)" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 4px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex: 0; width: fit-content;" title="Excluir pergunta">
              <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
            </button>
          </div>
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

// Função para remover uma pergunta
function removeQuestion(button) {
  const questionBlock = button.closest(".question-block");
  if (questionBlock) {
    questionBlock.remove();

    // Renumerar perguntas após remoção
    setTimeout(() => {
      renumberQuestions();
      resetPreview();
      updatePreview();
    }, 10);
  }
}

// Função para remover um loader
function removeLoader(button) {
  const loaderBlock = button.closest(".loader-block");
  if (loaderBlock) {
    loaderBlock.remove();

    // Renumerar loaders após remoção
    setTimeout(() => {
      renumberQuestions();
      resetPreview();
      updatePreview();
    }, 10);
  }
}

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

// Variável para controlar o step atual no preview
let currentPreviewStep = 0;

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

// Inicializar preview quando a página carregar
document.addEventListener("DOMContentLoaded", function () {
  // Adicionar listeners apenas para inputs do formulário (não do preview)
  const formInputs = document.querySelectorAll(
    'input[type="text"]:not(#previewNameInput):not(#previewEmailInput), input[type="color"]'
  );
  formInputs.forEach((input) => {
    input.addEventListener("input", () => {
      // Só resetar o preview para inputs que afetam a estrutura das perguntas
      if (
        input.classList.contains("question-input") ||
        input.classList.contains("option-input") ||
        input.classList.contains("loader-input")
      ) {
        resetPreview();
        updatePreview();
      } else {
        // Para outros campos (título, descrição, etc.), apenas atualizar sem resetar
        updatePreview();
      }
    });
  });

  // Adicionar listener para o checkbox de retenção
  const withRetentionCheckbox = document.getElementById("withRetention");
  if (withRetentionCheckbox) {
    withRetentionCheckbox.addEventListener("change", toggleRetentionFields);
    // Inicializar estado
    toggleRetentionFields();
  }

  // Configurar drag and drop para blocos já existentes
  const existingBlocks = document.querySelectorAll(
    ".question-block, .loader-block"
  );
  existingBlocks.forEach(setupDragAndDrop);

  // Configurar o container para aceitar drops
  const questionsContainer = document.getElementById("questionsContainer");
  if (questionsContainer) {
    questionsContainer.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    questionsContainer.addEventListener("drop", function (e) {
      e.preventDefault();
      // Se soltar em área vazia, adicionar no final
      if (e.target === this && draggedElement) {
        try {
          this.appendChild(draggedElement);
          setTimeout(() => {
            renumberQuestions();
            resetPreview();
            updatePreview();
          }, 100);
        } catch (error) {
          console.error("Erro ao soltar no container:", error);
        }
      }
    });

    // Adicionar eventos para prevenir comportamento padrão
    questionsContainer.addEventListener("dragenter", function (e) {
      e.preventDefault();
    });

    questionsContainer.addEventListener("dragleave", function (e) {
      // Limpar indicadores quando sair do container
      if (!questionsContainer.contains(e.relatedTarget)) {
        document
          .querySelectorAll(".question-block, .loader-block")
          .forEach((block) => {
            block.classList.remove(
              "drag-over",
              "drag-over-top",
              "drag-over-bottom"
            );
          });
      }
    });
  }

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

  // Atualizar preview inicial
  updatePreview();

  // Carregar histórico ao iniciar
  loadQuizHistory();

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

  // Configura a UI de tradução
  enableSimpleTranslationUI();
});

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

    translateButton.addEventListener("click", (e) => {
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
  toggleRetentionFields();
  renumberQuestions();
  resetPreview();
  updatePreview();

  // Scroll para o topo
  window.scrollTo(0, 0);
}

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

// Funções para controlar o modal de sucesso
function showSuccessModal() {
  const modal = document.getElementById("success-modal");
  if (modal) {
    modal.style.display = "flex";
    setupModalEvents();
  }
}

function hideSuccessModal() {
  const modal = document.getElementById("success-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function setupModalEvents() {
  // Botão fechar
  const closeBtn = document.getElementById("close-modal-btn");
  if (closeBtn) {
    closeBtn.onclick = hideSuccessModal;
  }

  // Botão copiar HTML
  const copyBtn = document.getElementById("copy-html-btn");
  if (copyBtn) {
    copyBtn.onclick = copyHtmlTemplate;
  }

  // Fechar modal clicando no overlay
  const modal = document.getElementById("success-modal");
  if (modal) {
    modal.onclick = function(e) {
      if (e.target === modal) {
        hideSuccessModal();
      }
    };
  }

  // Fechar modal com ESC
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      hideSuccessModal();
    }
  });
}

function copyHtmlTemplate() {
  if (!currentHtmlTemplate) {
    alert("Nenhum template HTML disponível para copiar.");
    return;
  }

  // Copiar para clipboard
  navigator.clipboard.writeText(currentHtmlTemplate).then(() => {
    // Atualizar botão para mostrar sucesso
    const copyBtn = document.getElementById("copy-html-btn");
    if (copyBtn) {
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span class="material-symbols-rounded">check</span>Copiado!';
      copyBtn.classList.add("copied");

      // Voltar ao estado original após 2 segundos
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.classList.remove("copied");
      }, 2000);
    }
  }).catch(err => {
    console.error("Erro ao copiar:", err);
    alert("Erro ao copiar o código HTML.");
  });
}
