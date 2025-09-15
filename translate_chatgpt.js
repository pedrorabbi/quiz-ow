


// ATENÇÃO: É altamente recomendável usar variáveis de ambiente para a chave da API.
// Exemplo: const apiKey = process.env.OPENAI_API_KEY;
// O uso da chave diretamente no código não é uma prática segura.

/**
 * Traduz um objeto de quiz usando a API da OpenAI (ChatGPT).
 *
 * @param {object} quizData O objeto do quiz a ser traduzido.
 * @param {string} targetLanguage O idioma de destino (ex: 'es', 'en', 'fr').
 * @param {string} apiKey A sua chave da API da OpenAI.
 * @param {string} sourceLanguage O idioma de origem (ex: 'pt').
 * @returns {Promise<object>} O objeto do quiz traduzido.
 */
async function translateQuizWithChatGPT(quizData, targetLanguage, apiKey, sourceLanguage = 'pt') {
  if (!apiKey) {
    throw new Error('A chave da API da OpenAI é necessária.');
  }

  console.log(`🌐 Iniciando tradução do quiz para ${targetLanguage} com o ChatGPT...`);

  const prompt = `
    Você é um assistente de tradução especializado.
    Sua tarefa é traduzir os valores de texto do seguinte objeto JSON do idioma de origem (${sourceLanguage}) para o idioma de destino (${targetLanguage}).

    REGRAS IMPORTANTES:
    1.  **NÃO traduza as chaves** do JSON (ex: "title", "question", "options").
    2.  **NÃO altere a estrutura** do objeto JSON.
    3.  Responda **APENAS com o objeto JSON traduzido**, sem nenhum texto ou explicação adicional.
    4.  Mantenha a formatação e o tipo de dados originais.

    Objeto JSON para traduzir:
    ${JSON.stringify(quizData, null, 2)}
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-nano', // Usando o modelo solicitado pelo usuário.
        messages: [{ role: 'user', content: prompt }],
        
        response_format: { type: "json_object" }, // Garantir que a resposta seja um JSON válido
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Erro na resposta da API da OpenAI:', errorBody);
      throw new Error(`Erro na API da OpenAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const translatedJsonString = data.choices[0].message.content;

    // Tenta analisar o JSON retornado
    const translatedQuiz = JSON.parse(translatedJsonString);

    console.log(`✅ Quiz traduzido com sucesso para ${targetLanguage}!`);
    return translatedQuiz;

  } catch (error) {
    console.error('❌ Erro ao traduzir quiz com ChatGPT:', error);
    // Em caso de erro, retorna o quiz original para não quebrar o fluxo
    return quizData;
  }
}

export { translateQuizWithChatGPT };
