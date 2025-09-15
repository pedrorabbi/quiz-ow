// Módulo para controle do modal de erro

// Funções para controlar o modal de erro
function showErrorModal(
  errorMessage = "Ocorreu um erro durante a criação do quiz. Tente novamente."
) {
  const modal = document.getElementById("error-modal");
  const messageElement = document.getElementById("error-message");

  if (modal && messageElement) {
    // Atualizar a mensagem de erro, convertendo quebras de linha para HTML
    messageElement.innerHTML = errorMessage.replace(/\n/g, "<br>");
    modal.style.display = "flex";
    setupErrorModalEvents();
  }
}

function hideErrorModal() {
  const modal = document.getElementById("error-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function setupErrorModalEvents() {
  // Botão fechar
  const closeBtn = document.getElementById("close-error-modal-btn");
  if (closeBtn) {
    closeBtn.onclick = hideErrorModal;
  }

  // Fechar modal clicando no overlay
  const modal = document.getElementById("error-modal");
  if (modal) {
    modal.onclick = function (e) {
      if (e.target === modal) {
        hideErrorModal();
      }
    };
  }

  // Fechar modal com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      hideErrorModal();
    }
  });
}
