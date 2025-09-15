// Módulo para controle do modal de sucesso

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
  const currentHtmlTemplate = getCurrentHtmlTemplate();

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