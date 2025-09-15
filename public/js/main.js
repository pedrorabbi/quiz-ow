// Script principal - inicialização e coordenação dos módulos

// Função principal de inicialização
function initializeApp() {
  // Configurar drag and drop para blocos já existentes
  const existingBlocks = document.querySelectorAll(
    ".question-block, .loader-block"
  );
  existingBlocks.forEach(setupDragAndDrop);

  // Configurar o container para aceitar drops
  setupDragDropContainer();

  // Configurar eventos do preview
  setupPreviewEvents();

  // Configurar eventos do formulário
  setupFormEvents();

  // Configurar eventos de tradução
  setupTranslationEvents();

  // Carregar histórico ao iniciar
  loadQuizHistory();

  // Configurar a UI de tradução
  enableSimpleTranslationUI();

  // Atualizar preview inicial
  updatePreview();
}

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", initializeApp);