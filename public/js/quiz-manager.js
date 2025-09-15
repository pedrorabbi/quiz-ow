// Módulo para gerenciamento de quiz - criação e chamadas de API

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
    // Esconder o loader apenas em caso de erro
    if (pageLoader) {
      pageLoader.style.display = "none";
    }
  }
}

// Função que cria o link do quiz a partir do template HTML gerado
async function createLink(htmlTemplate) {
  // Atualizar o texto do loader para a segunda etapa
  const loaderText = document.getElementById("loader-text");

  if (loaderText) {
    loaderText.textContent = "Criando link do quiz...";
  }

  const quizName = document.getElementById("vertical").value;

  // Buscar a chave da API do servidor
  let apiKey;
  try {
    const configResponse = await fetch("/api/config");
    const config = await configResponse.json();
    apiKey = config.elegantQuizApiKey;
  } catch (error) {
    console.error("Erro ao buscar configuração:", error);
    // Fallback para desenvolvimento
    apiKey = "cmbr8lju0000009l85ri155xj";
  }

  // Configuração dos headers para a requisição da criação do link
  const myHeaders = new Headers();
  myHeaders.append("X-ElegantQuiz-ApiKey", apiKey);
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
    .then(async (result) => {
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
    .catch((error) => {
      console.error(error);
      // Esconder o loader em caso de erro
      const pageLoader = document.getElementById("page-loader");
      if (pageLoader) {
        pageLoader.style.display = "none";
      }
    })
    .finally(() => {
      // Sempre esconder o loader de página inteira
      const pageLoader = document.getElementById("page-loader");
      if (pageLoader) {
        pageLoader.style.display = "none";
      }
    });
}

function getCurrentHtmlTemplate() {
  return currentHtmlTemplate;
}