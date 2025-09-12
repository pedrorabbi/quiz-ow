import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/proxy/template", async (req, res) => {
  try {
    // Transform loaders to be included in questions array
    let requestBody = { ...req.body };
    
    if (requestBody.loaders && requestBody.loaders.length > 0) {
      // Convert loaders to question format with isLoading: true
      const loaderQuestions = requestBody.loaders.map(loader => ({
        options: [],
        question: loader.text,
        isLoading: true
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
      requestBody.questions = requestBody.questions.map(question => ({
        ...question,
        isLoading: question.isLoading !== undefined ? question.isLoading : false
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
    
    res.send(data);
  } catch (err) {
    console.error("Erro no proxy:", err);
    res.status(500).send("Erro no proxy");
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
