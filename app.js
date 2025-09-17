import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Storage } from "@google-cloud/storage";
import multer from "multer";

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Configurar Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "quiz-ow",
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Para desenvolvimento local
});

// Usar bucket existente do GCS
const bucketName = process.env.STORAGE_BUCKET || "quiz-ow.appspot.com";
const bucket = storage.bucket(bucketName);

console.log(`📁 Using Google Cloud Storage bucket: ${bucketName}`);

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Endpoint para fornecer configurações (sem expor chaves sensíveis diretamente)
app.get("/api/config", (req, res) => {
  res.json({
    elegantQuizApiKey:
      process.env.ELEGANTQUIZ_API_KEY || "cmbr8lju0000009l85ri155xj",
  });
});

// Endpoint para upload de imagens
app.post("/upload/image", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = path.extname(req.file.originalname);
    const fileName = `quiz-images/${timestamp}${extension}`;

    // Upload para Google Cloud Storage
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
      public: true, // Tornar o arquivo público
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        console.error('Erro no upload:', err);
        reject({ error: 'Erro ao fazer upload da imagem' });
      });

      stream.on('finish', async () => {
        try {
          // Tornar o arquivo público
          await file.makePublic();

          // Gerar URL pública
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

          resolve({
            success: true,
            imageUrl: publicUrl,
            fileName: fileName
          });
        } catch (err) {
          console.error('Erro ao tornar arquivo público:', err);
          reject({ error: 'Erro ao processar imagem' });
        }
      });

      stream.end(req.file.buffer);
    }).then(result => {
      res.json(result);
    }).catch(error => {
      res.status(500).json(error);
    });

  } catch (error) {
    console.error('Erro no endpoint de upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para inserir imagens nas perguntas do HTML
function insertQuestionImages(htmlContent, questions) {
  try {
    // Extrair o array de questions do JavaScript no HTML
    const questionsMatch = htmlContent.match(/const questions = (\[.*?\]);/s);
    if (!questionsMatch) {
      console.log('Array de questions não encontrado no HTML');
      return htmlContent;
    }

    let questionsArray = JSON.parse(questionsMatch[1]);

    // Adicionar URLs de imagem correspondentes
    questionsArray = questionsArray.map((htmlQuestion, index) => {
      const originalQuestion = questions[index];
      if (originalQuestion && originalQuestion.imageUrl) {
        return {
          ...htmlQuestion,
          imageUrl: originalQuestion.imageUrl
        };
      }
      return htmlQuestion;
    });

    // Substituir o array de questions no HTML
    const updatedQuestionsString = JSON.stringify(questionsArray, null, 2);
    htmlContent = htmlContent.replace(
      /const questions = \[.*?\];/s,
      `const questions = ${updatedQuestionsString};`
    );

    // Adicionar CSS para imagens das perguntas
    const imageCSS = `
      .question-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        margin: 15px auto;
        display: block;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    `;

    htmlContent = htmlContent.replace(
      /<\/style><\/head>/,
      `${imageCSS}</style></head>`
    );

    // Modificar a função showQuestion para incluir imagens
    const showQuestionRegex = /function showQuestion\(index\) \{[^}]*?\}/s;
    const showQuestionMatch = htmlContent.match(showQuestionRegex);

    if (showQuestionMatch) {
      let newShowQuestionFunc = showQuestionMatch[0];

      // Adicionar lógica para mostrar imagem após definir o texto da pergunta
      newShowQuestionFunc = newShowQuestionFunc.replace(
        /questionContainer\.querySelector\('\.question'\)\.textContent = currentQuestion\.question;/,
        `questionContainer.querySelector('.question').textContent = currentQuestion.question;

        // Adicionar imagem se existir
        const existingImage = questionContainer.querySelector('.question-image');
        if (existingImage) {
          existingImage.remove();
        }

        if (currentQuestion.imageUrl) {
          const img = document.createElement('img');
          img.src = currentQuestion.imageUrl;
          img.className = 'question-image';
          img.alt = 'Imagem da pergunta';
          questionContainer.querySelector('.question').appendChild(img);
        }`
      );

      htmlContent = htmlContent.replace(showQuestionRegex, newShowQuestionFunc);
    }

    return htmlContent;
  } catch (error) {
    console.error('Erro ao inserir imagens nas perguntas:', error);
    return htmlContent;
  }
}

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

    // Parse and fix the response to handle retention
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.html_array && parsedData.html_array[0]) {
        let htmlContent = parsedData.html_array[0];

        // Inserir imagens nas perguntas
        if (requestBody.questions && requestBody.questions.some(q => q.imageUrl)) {
          htmlContent = insertQuestionImages(htmlContent, requestBody.questions);
        }

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

          // Fix form question: should use title instead of description for form header
          if (!isWithoutRetention && title) {
            // Replace any form question that shows "-" with the actual title
            htmlContent = htmlContent.replace(
              /<div class="question">-<\/div>/g,
              `<div class="question">${title}</div>`
            );
            
            // Also replace if description is being used instead of title
            if (description && description !== title) {
              htmlContent = htmlContent.replace(
                new RegExp(`<div class="question">${description}</div>`, "g"),
                `<div class="question">${title}</div>`
              );
            }
          }
        }

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
        }
        .question {
          margin-bottom: 30px !important;
        }
        .form-container {
          margin-top: 0px !important;
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
