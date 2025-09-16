import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { translateQuizWithChatGPT } from "./translate_chatgpt.js";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

// Usar variáveis de ambiente para as chaves da API
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(
    "❌ ERRO: OPENAI_API_KEY não encontrada nas variáveis de ambiente"
  );
  console.log("📝 Crie um arquivo .env na raiz do projeto com:");
  console.log("OPENAI_API_KEY=sua_chave_aqui");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Endpoint para fornecer configurações (sem expor chaves sensíveis diretamente)
app.get("/api/config", (req, res) => {
  res.json({
    elegantQuizApiKey:
      process.env.ELEGANTQUIZ_API_KEY || "cmbr8lju0000009l85ri155xj",
  });
});

// Endpoint para tradução com ChatGPT
app.post("/translate-quiz", async (req, res) => {
  const { quizData, targetLanguage } = req.body;

  if (!quizData || !targetLanguage) {
    return res
      .status(400)
      .json({ error: "quizData e targetLanguage são obrigatórios." });
  }

  try {
    const translatedQuiz = await translateQuizWithChatGPT(
      quizData,
      targetLanguage,
      OPENAI_API_KEY
    );
    res.json(translatedQuiz);
  } catch (error) {
    console.error("Erro na tradução (endpoint):", error);
    res.status(500).json({ error: "Falha ao traduzir o quiz." });
  }
});

app.post("/proxy/template", async (req, res) => {
  try {
    // Transform loaders to be included in questions array
    let requestBody = { ...req.body };

    if (requestBody.loaders && requestBody.loaders.length > 0) {
      // Convert loaders to question format with isLoading: true
      const loaderQuestions = requestBody.loaders.map((loader) => ({
        options: [],
        question: loader.text,
        isLoading: true,
      }));

      // Add loader questions to the questions array
      if (!requestBody.questions) {
        requestBody.questions = [];
      }
      requestBody.questions = [...requestBody.questions, ...loaderQuestions];

      // Remove the separate loaders array
      delete requestBody.loaders;
    }

    // Ensure all regular questions have isLoading: false
    if (requestBody.questions) {
      requestBody.questions = requestBody.questions.map((question) => ({
        ...question,
        isLoading:
          question.isLoading !== undefined ? question.isLoading : false,
      }));
    }

    // Log what is being sent
    console.log("=== ENVIANDO PARA API ===");
    console.log(JSON.stringify(requestBody, null, 2));
    console.log("========================");

    const response = await fetch(
      "https://elegant-quiz-builder-477908646230.us-east1.run.app/template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.text();

    // Log what was received
    console.log("=== RESPOSTA DA API ===");
    console.log(data);
    console.log("======================");

    // Parse and fix the response to include isLoading properties and handle retention
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.html_array && parsedData.html_array[0]) {
        let htmlContent = parsedData.html_array[0];

        // Fix isLoading properties
        const questionsMatch = htmlContent.match(
          /const questions = (\[.*?\]);/s
        );
        if (questionsMatch) {
          const originalQuestions = JSON.parse(questionsMatch[1]);

          // Re-add isLoading properties based on original request
          const updatedQuestions = originalQuestions.map((q, index) => {
            const originalQuestion = requestBody.questions[index];
            if (originalQuestion && originalQuestion.isLoading) {
              return { ...q, isLoading: true };
            }
            return q;
          });

          // Replace the questions array in the HTML
          const updatedQuestionsString = JSON.stringify(updatedQuestions);
          htmlContent = htmlContent.replace(
            /const questions = \[.*?\];/s,
            `const questions = ${updatedQuestionsString};`
          );
        }

        // Fix retention: Check if name and email are "-" (no retention)
        const isWithoutRetention =
          requestBody.messages &&
          requestBody.messages.name === "-" &&
          requestBody.messages.email === "-";

        if (isWithoutRetention) {
          // Replace the final quiz logic to not show form and instead add footnote + show title
          const formLogicRegex =
            /if \(index === questions\.length - 1\) \{[^}]*formContainer\.style\.display = 'block'[^}]*\}/s;
          const newFormLogic = `if (index === questions.length - 1) {
            // Show the title in the question container area (between progress and button)
            const h1Element = document.querySelector('h1');
            h1Element.style.display = 'block';
            h1Element.style.position = 'relative';
            h1Element.style.margin = '20px 0';
            questionContainer.querySelector('.question').appendChild(h1Element);
            const footnote = document.createElement('div');
            footnote.classList.add('footnote');
            footnote.textContent = adLabel;
            optionsContainer.appendChild(footnote);
          }`;

          htmlContent = htmlContent.replace(formLogicRegex, newFormLogic);

          // Remove form validation and submission logic since there's no form
          htmlContent = htmlContent.replace(
            /document\.addEventListener\('DOMContentLoaded'[^}]*?\}\)\)/s,
            ""
          );
          htmlContent = htmlContent.replace(
            /document\.getElementById\('submitButton'\)\.addEventListener[^}]*?\}\)\)/s,
            ""
          );
        } else {
          // For quizzes WITH retention, also show title in question area on final step
          const formLogicRegex =
            /if \(index === questions\.length - 1\) \{[^}]*formContainer\.style\.display = 'block'[^}]*\}/s;
          const newFormLogic = `if (index === questions.length - 1) {
            // Show the title in the question container area (between progress and form)
            const h1Element = document.querySelector('h1');
            h1Element.style.display = 'block';
            h1Element.style.position = 'relative';
            h1Element.style.margin = '20px 0';
            questionContainer.querySelector('.question').appendChild(h1Element);
            formContainer.style.display = 'block'
            questionContainer.style.display = 'none'
            optionsContainer.style.display = 'none'
          }`;

          htmlContent = htmlContent.replace(formLogicRegex, newFormLogic);
        }

        // Fix field mapping: The API is swapping title and description
        if (requestBody.messages) {
          const { title, description } = requestBody.messages;

          // Fix h1 tag: should use title, not description
          if (title && title !== description) {
            htmlContent = htmlContent.replace(
              new RegExp(`<h1[^>]*>${description}</h1>`, "g"),
              `<h1>${title}</h1>`
            );
          }

          // Fix form question: should use description, not title (if different and form exists)
          if (description && description !== title && !isWithoutRetention) {
            htmlContent = htmlContent.replace(
              new RegExp(`<div class="question">${title}</div>`, "g"),
              `<div class="question">${description}</div>`
            );
          }
        }

        // Keep H1 hidden by default - will be shown only on final step
        // No changes needed to CSS - H1 stays display:none initially

        // Add vertical centering CSS for better layout
        const centeringCSS = `
        .quiz-container {
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          align-items: stretch !important;
          min-height: 100vh !important;
          height: auto !important;
        }
        .progress-bar-container {
          position: relative !important;
          flex-shrink: 0 !important;
        }
        .quiz-content-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          padding: 20px 0;
        }`;

        // Insert the centering CSS into the HTML
        htmlContent = htmlContent.replace(
          /<\/style><\/head>/,
          `${centeringCSS}</style></head>`
        );

        // Wrap only the main content (not progress bar) in centering container
        htmlContent = htmlContent.replace(
          /<div class="question-container">/,
          '<div class="quiz-content-wrapper"><div class="question-container">'
        );
        
        htmlContent = htmlContent.replace(
          /<a data-av-rewarded="true" id="hidden-link"/,
          '</div><a data-av-rewarded="true" id="hidden-link"'
        );

        // Fix empty final question: If last question is empty, ensure it has the button text
        if (requestBody.messages && requestBody.messages.button) {
          const buttonText = requestBody.messages.button;

          // Find and fix empty final questions
          htmlContent = htmlContent.replace(
            /\{"question":"","options":\[""?\]\}/g,
            `{"question":"","options":["${buttonText}"]}`
          );
        }

        parsedData.html_array[0] = htmlContent;
      }
      res.json(parsedData);
    } catch (error) {
      console.error("Error fixing response:", error);
      res.send(data);
    }
  } catch (err) {
    console.error("Erro no proxy:", err);
    res.status(500).send("Erro no proxy");
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
