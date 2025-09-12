async function createHtmlTemplate() {
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
        // Caso sucesso, informa ao usuário e chama função para criar link
        apiResponse.textContent = "✅ Quiz criado com sucesso!";
        apiResponse.style.color = "green";
        
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
}

// Função que cria o link do quiz a partir do template HTML gerado
function createLink(htmlTemplate) {
  const quizName = document.getElementById("vertical").value;

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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
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
  const questionBlock = button.closest('.question-block');
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
  const loaderBlock = button.closest('.loader-block');
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
    const description =
      document.getElementById("description")?.value || "-";
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
});

// Funções para gerenciar histórico de quizzes
function saveQuizToHistory() {
  const quizData = {
    id: Date.now(),
    createdAt: new Date().toLocaleString('pt-BR'),
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
    items: []
  };
  
  // Coletar todos os blocos (perguntas e loaders) na ordem atual
  const allBlocks = Array.from(document.querySelectorAll(".question-block, .loader-block"));
  
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
          options: options
        });
      }
    } else if (block.classList.contains("loader-block")) {
      // É um loader
      const loaderText = block.querySelector(".loader-input").value.trim();
      if (loaderText) {
        quizData.items.push({
          type: "loader",
          text: loaderText
        });
      }
    }
  });
  
  // Carregar histórico existente
  let history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  
  // Adicionar novo quiz no início
  history.unshift(quizData);
  
  // Manter apenas os últimos 10 quizzes
  if (history.length > 10) {
    history = history.slice(0, 10);
  }
  
  // Salvar no localStorage
  localStorage.setItem('quizHistory', JSON.stringify(history));
  
  // Atualizar exibição do histórico
  loadQuizHistory();
}

function loadQuizHistory() {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const historyList = document.getElementById('historyList');
  const noHistory = document.getElementById('noHistory');
  
  if (history.length === 0) {
    historyList.style.display = 'none';
    noHistory.style.display = 'block';
    return;
  }
  
  historyList.style.display = 'flex';
  noHistory.style.display = 'none';
  historyList.innerHTML = '';
  
  history.forEach((quiz, index) => {
    const historyItem = document.createElement('div');
    historyItem.style.cssText = `
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      background: #f9f9f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const infoDiv = document.createElement('div');
    infoDiv.style.flex = '1';
    
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'font-weight: bold; font-size: 14px; color: #333; margin-bottom: 4px;';
    titleDiv.textContent = quiz.title || quiz.vertical || 'Quiz sem título';
    
    const detailsDiv = document.createElement('div');
    detailsDiv.style.cssText = 'font-size: 12px; color: #666;';
    detailsDiv.textContent = `${quiz.createdAt} • ${quiz.items.filter(i => i.type === 'question').length} perguntas • ${quiz.items.filter(i => i.type === 'loader').length} loaders`;
    
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(detailsDiv);
    
    const duplicateButton = document.createElement('button');
    duplicateButton.innerHTML = '<span class="material-symbols-rounded" style="font-size: 16px;">content_copy</span>';
    duplicateButton.title = 'Duplicar quiz';
    duplicateButton.style.cssText = `
      padding: 4px;
      background: transparent;
      color: #22C55D;
      border: 1px solid #22C55D;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 10px;
      width: fit-content;
      flex: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    duplicateButton.onclick = () => duplicateQuiz(quiz);
    
    historyItem.appendChild(infoDiv);
    historyItem.appendChild(duplicateButton);
    historyList.appendChild(historyItem);
  });
}

function duplicateQuiz(quizData) {
  // Limpar formulário atual
  clearForm();
  
  // Preencher campos básicos
  document.getElementById("vertical").value = quizData.vertical || '';
  document.getElementById("domain").value = quizData.domain || '';
  document.getElementById("withRetention").checked = quizData.withRetention || false;
  document.getElementById("title").value = quizData.title || '';
  document.getElementById("nameLabel").value = quizData.nameLabel || '';
  document.getElementById("emailLabel").value = quizData.emailLabel || '';
  document.getElementById("buttonText").value = quizData.buttonText || '';
  document.getElementById("footnote").value = quizData.footnote || '';
  document.getElementById("primaryColor").value = quizData.primaryColor || '#22C55D';
  document.getElementById("secondaryColor").value = quizData.secondaryColor || '#16A349';
  document.getElementById("hoverColor").value = quizData.hoverColor || '#16A349';
  
  // Atualizar campos de retenção
  toggleRetentionFields();
  
  // Recriar perguntas e loaders na ordem original
  const questionsContainer = document.getElementById("questionsContainer");
  questionsContainer.innerHTML = '';
  
  quizData.items.forEach((item) => {
    if (item.type === 'question') {
      // Adicionar pergunta
      addQuestion();
      const questionBlocks = document.querySelectorAll('.question-block');
      const lastQuestionBlock = questionBlocks[questionBlocks.length - 1];
      
      // Preencher texto da pergunta
      const questionInput = lastQuestionBlock.querySelector('.question-input');
      questionInput.value = item.question;
      
      // Preencher opções
      const optionInputs = lastQuestionBlock.querySelectorAll('.option-input');
      
      // Adicionar opções extras se necessário
      for (let i = optionInputs.length; i < item.options.length; i++) {
        const addButton = lastQuestionBlock.querySelector('button[onclick*="addOption"]');
        addOption(addButton);
      }
      
      // Preencher todas as opções
      const allOptionInputs = lastQuestionBlock.querySelectorAll('.option-input');
      item.options.forEach((option, index) => {
        if (allOptionInputs[index]) {
          allOptionInputs[index].value = option;
        }
      });
      
    } else if (item.type === 'loader') {
      // Adicionar loader
      addLoader();
      const loaderBlocks = document.querySelectorAll('.loader-block');
      const lastLoaderBlock = loaderBlocks[loaderBlocks.length - 1];
      
      // Preencher texto do loader
      const loaderInput = lastLoaderBlock.querySelector('.loader-input');
      loaderInput.value = item.text;
    }
  });
  
  // Atualizar preview
  resetPreview();
  updatePreview();
  
  // Scroll para o topo do formulário
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
  // Limpar campos básicos
  document.getElementById("vertical").value = '';
  document.getElementById("domain").value = '';
  document.getElementById("withRetention").checked = true;
  document.getElementById("title").value = '';
  document.getElementById("nameLabel").value = '';
  document.getElementById("emailLabel").value = '';
  document.getElementById("buttonText").value = '';
  document.getElementById("footnote").value = '';
  document.getElementById("primaryColor").value = '#22C55D';
  document.getElementById("secondaryColor").value = '#16A349';
  document.getElementById("hoverColor").value = '#16A349';
  
  // Limpar perguntas e loaders
  document.getElementById("questionsContainer").innerHTML = '';
  
  // Limpar respostas da API
  document.getElementById("apiResponse").innerHTML = '';
  document.getElementById("linkResponse").innerHTML = '';
  
  // Resetar preview
  resetPreview();
  updatePreview();
}
