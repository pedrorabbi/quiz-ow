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
  console.error("❌ ERRO: OPENAI_API_KEY não encontrada nas variáveis de ambiente");
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
    elegantQuizApiKey: process.env.ELEGANTQUIZ_API_KEY || "cmbr8lju0000009l85ri155xj"
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

    // Parse and fix the response to include isLoading properties
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.html_array && parsedData.html_array[0]) {
        let htmlContent = parsedData.html_array[0];
        
        // Find the questions array in the JavaScript
        const questionsMatch = htmlContent.match(/const questions = (\[.*?\]);/s);
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
          
          parsedData.html_array[0] = htmlContent;
        }
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
