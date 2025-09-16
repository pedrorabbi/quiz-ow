// Módulo para gerenciamento de quiz - criação e chamadas de API

// Variável global para armazenar o template HTML criado
let currentHtmlTemplate = null;

function toEscapedVersion(html) {
  return html
    // Escapar aspas duplas em atributos e strings
    .replace(/"/g, '\\"')

    // Transformar regex de \w em \\w
    .replace(/\\w/g, '\\\\w')

    // Transformar aspas normais em entidades &#34 (sem ;)
    .replace(/\\"/g, '&#34');
}

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
      : "-";
    const emailLabel = withRetention
      ? document.getElementById("emailLabel").value
      : "-";

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
    const requestBody = {
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
    };

    console.log("🚀 Enviando requisição para geração do template - URL:", "/proxy/template");
    console.log("🚀 Enviando requisição para geração do template - METHOD:", "POST");
    console.log("🚀 Enviando requisição para geração do template - BODY:", requestBody);

    const htmlTemplate = await fetch("/proxy/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(async (res) => {
        // Tratamento da resposta da API
        const json = await res.json();
        console.log("✅ Resposta recebida da geração do template:", json);

        if (json.error) {
          // Exibir erro no modal em vez da interface
          showErrorModal(`Erro na geração do template:\n${json.error}`);
          // Esconder o loader
          if (pageLoader) {
            pageLoader.style.display = "none";
          }
        } else if (json.html_array) {
          // Salvar o template HTML globalmente para uso no modal
          currentHtmlTemplate = json.html_array;

          // Salvar quiz no histórico antes de criar o link
          saveQuizToHistory();

          createLink(json.html_array);
        } else {
          // Caso resposta inesperada
          showErrorModal("Resposta inesperada da API. Tente novamente.");
          // Esconder o loader
          if (pageLoader) {
            pageLoader.style.display = "none";
          }
        }
      })
      .catch((err) => {
        // Exibir erro no modal em vez da interface
        showErrorModal(`Erro de comunicação: ${err.message}`);
        // Esconder o loader
        if (pageLoader) {
          pageLoader.style.display = "none";
        }
      });
  } catch (error) {
    // Erro geral na função
    console.error("Erro na criação do quiz:", error);
    showErrorModal(`Erro na criação do quiz: ${error.message}`);
    // Esconder o loader em caso de erro
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
    // Exibir erro no modal
    showErrorModal(`Erro ao buscar configuração da API: ${error.message}`);
    // Esconder o loader
    const pageLoader = document.getElementById("page-loader");
    if (pageLoader) {
      pageLoader.style.display = "none";
    }
    return; // Parar a execução se não conseguir buscar a configuração
  }

  // Configuração dos headers para a requisição da criação do link
  const myHeaders = new Headers();
  myHeaders.append("X-ElegantQuiz-ApiKey", apiKey);
  myHeaders.append("Content-Type", "application/json");

  // Corpo da requisição com nome do quiz e dados do template HTML
  // Verificar se htmlTemplate é array e converter para string se necessário
  const htmlString = Array.isArray(htmlTemplate) ? htmlTemplate.join('') : htmlTemplate;

  const linkRequestBody = {
    name: quizName,
    data: {
      html: toEscapedVersion(htmlString), // Usa o template HTML escapado
    },
  };

  console.log("🚀 Enviando requisição para criação do link - URL:", "https://custom-embed.humberto-56a.workers.dev/s/");
  console.log("🚀 Enviando requisição para criação do link - METHOD:", "POST");
  console.log("🚀 Enviando requisição para criação do link - HEADERS:", Object.fromEntries(myHeaders.entries()));
  console.log("🚀 Enviando requisição para criação do link - BODY:", linkRequestBody);

  const raw = JSON.stringify(linkRequestBody);

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
      console.log("✅ Resposta recebida da criação do link:", result);

      if (result.success) {
        // Mostrar modal de sucesso em vez da mensagem antiga
        showSuccessModal();
      } else {
        // Exibir erro no modal
        showErrorModal(
          `Erro ao criar o link do quiz: ${JSON.stringify(result)}`
        );
      }
    })
    .catch((error) => {
      console.error(error);
      // Exibir erro no modal
      showErrorModal(`Erro ao criar o link do quiz: ${error.message}`);
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
