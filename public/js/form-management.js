// Módulo para gerenciamento de formulário - adicionar/remover perguntas e loaders

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
  setTimeout(async () => {
    const loaderInput = loaderDiv.querySelector("input");
    loaderInput.removeEventListener("input", updatePreview);
    loaderInput.addEventListener("input", () => {
      resetPreview();
      updatePreview();
    });
  }, 10);

  // Atualizar preview
  setTimeout(() => {
    resetPreview();
    updatePreview();
  }, 20);
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
  setTimeout(async () => {
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

  // Atualizar preview
  setTimeout(() => {
    resetPreview();
    updatePreview();
  }, 20);
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
  input.addEventListener("input", () => {
    updatePreview();
  });
  const label = document.createElement("label");
  label.textContent = `Opção ${optionCount}`;
  wrapper.appendChild(input);
  wrapper.appendChild(label);
  optionsContainer.appendChild(wrapper);

  // Atualizar preview
  setTimeout(() => {
    updatePreview();
  }, 10);
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

// Função para configurar event listeners dos inputs do formulário
function setupFormEvents() {
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
}

// Tornar as funções globais para uso nos botões HTML
window.addQuestion = addQuestion;
window.addLoader = addLoader;
window.addOption = addOption;
window.removeQuestion = removeQuestion;
window.removeLoader = removeLoader;