const express = require("express");
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
  const vectorDb = await client.getOrCreateCollection({
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

  const prompt = `
  Eres un agente que busca noticias y responde a los usuarios. 
  
  Responde la siguente pregunta de un usuario 
  con el resultado de la busqueda en la base de datos de vectores
  -----------
  Pregunta usuario: ${query}

  -----------
  Resultados de la busqueda:

  ${JSON.stringify(results)}`;

  const result = await model.generateContent(prompt);
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

app.get("/search", async (request, response) => {
  const dbResponse = await queryRag(request.query.query);
  const ragResponse = {
    Query: request.query.query,
    Response: dbResponse,
  };

  response.send(ragResponse);
});
