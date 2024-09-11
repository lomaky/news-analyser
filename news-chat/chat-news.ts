const express = require("express");
var cors = require("cors");
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
const { GoogleGenerativeAI } = require("@google/generative-ai");

const queryRag = async (query: string) => {
  const googleKey = "GOOGLE_KEY_HERE";
  // embeddings
  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: googleKey,
    model: "text-embedding-004",
  });

  // VectorDb
  const client = new ChromaClient({
    path: "http://192.168.86.100:8000",
  });

  const vectorDbName = `news-text-embedding-004.vdb`;
  console.log(`VectorDb=${vectorDbName}`);

  // Get or create new VectorDB collection
  const vectorDb = await client.getCollection({
    name: vectorDbName,
    embeddingFunction: googleEmbeddings,
  });

  // Query
  const results = await vectorDb.query({
    queryTexts: [query],
    nResults: 20,
  });

  // Compose response
  const genAI = new GoogleGenerativeAI(googleKey);
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: safetySettings,
  });

  const todaysDate = new Date().toJSON();

  const prompt = `
  <INSTRUCCIONES DEL PROMPT>
  Eres un agente que busca noticias y responde a los usuarios.   
  Responde la siguente pregunta de un usuario usando el resultado de la busqueda a continuacion.
  Usa un lenguaje amigable e impersonal.
  
  Al responder sigue las siguentes reglas.
  - Omite links a paginas web.
  - Limitate a solo responder y no hacer preguntas adicionales.
  - Responde usando la información mas reciente.
  - La fecha de hoy es ${todaysDate}.
  - Limitate responder unicamente usando la información del resultado de la busqueda.

  </INSTRUCCIONES DEL PROMPT>

  <PREGUNTA DEL USUARIO>
  ${query}
  </PREGUNTA DEL USUARIO>

  <RESULTADOS BUSQUEDA NOTICIAS>
  ${JSON.stringify(results)}  
  </RESULTADOS BUSQUEDA NOTICIAS>
  `;


  const result = await model.generateContent(prompt);
  console.log(prompt);
  const response = result.response.text();
  console.log(response);
  return response;
};

const app = express();
app.use(express.json());
const PORT = 9700;
app.listen(PORT, () => {
  console.log("Server Listening on port:", PORT);
});

app.get("/search", cors(), async (request, response) => {
  const dbResponse = await queryRag(request.query.query);
  const ragResponse = {
    Query: request.query.query,
    Response: dbResponse,
  };

  response.send(ragResponse);
});
