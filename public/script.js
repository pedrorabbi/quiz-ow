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
  const nameLabel = document.getElementById("nameLabel").value;
  const emailLabel = document.getElementById("emailLabel").value;
  const buttonText = document.getElementById("buttonText").value;
  const footnote = document.getElementById("footnote").value;
  const greeting = document.getElementById("greeting").value;

  // Coleta as perguntas e opções adicionadas dinamicamente no formulário
  const questions = [];
  const questionBlocks = document.querySelectorAll(".question-block");

  questionBlocks.forEach((block) => {
    const questionText = block.querySelector(".question-input").value;
    const optionInputs = block.querySelectorAll(".option-input");
    const options = Array.from(optionInputs)
      .map((input) => input.value)
      .filter(Boolean); // Remove opções vazias
    if (questionText && options.length) {
      questions.push({ question: questionText, options });
    }
  });

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

// Função auxiliar para adicionar uma nova pergunta ao formulário
function addQuestion() {
  const container = document.getElementById("questionsContainer");
  const index = container.children.length;

  // Cria um novo bloco de pergunta com dois campos de opção iniciais
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("question-block");
  questionDiv.innerHTML = `
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
  const label = document.createElement("label");
  label.textContent = `Opção ${optionCount}`;
  wrapper.appendChild(input);
  wrapper.appendChild(label);
  optionsContainer.appendChild(wrapper);
}
