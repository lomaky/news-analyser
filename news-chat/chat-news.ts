import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
const { GoogleGenerativeAI } = require("@google/generative-ai");

const main = async () => {

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

  const query = "Como participó Euclides Torres en las elecciones de Gustavo Petro?";

  // Query
  const results = await vectorDb.query({
    queryTexts: [query],
    nResults: 20,    
  });

  const genAI = new GoogleGenerativeAI(googleKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
  console.log(result.response.text());
};

main();
