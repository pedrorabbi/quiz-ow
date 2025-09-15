// Módulo para funcionalidade de drag and drop

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
        setTimeout(async () => {
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

// Função para configurar o container de drag and drop
function setupDragDropContainer() {
  const questionsContainer = document.getElementById("questionsContainer");
  if (!questionsContainer) return;

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
        setTimeout(async () => {
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