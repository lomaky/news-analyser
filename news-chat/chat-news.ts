const express = require("express");
var cors = require("cors");
import { DateTime } from "luxon";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Parameters
const googleKey = "GOOGLE_KEY_HERE";
const vectorDbName = `news-text-embedding-004-v20240914_001.vdb`;
const llmChatEndpoint = "http://localhost:11434/api/chat";
const chromadb = "http://192.168.86.100:8000";
const textEmbedding = "text-embedding-004";

export interface prompt {
  model: string;
  prompt: string;
  stream: boolean;
  format: string;
}

export interface chat {
  model: string;
  messages: message[];
  stream: boolean;
}

export interface message {
  role: string;
  content: string;
}

export class Ollama {
  constructor() {}

  async answerQuestion(
    system: string,
    question: string,
    searchResults: string
  ): Promise<string> {
    const userQuery = `
    ${question}

    <RESULTADOS BUSQUEDA NOTICIAS>
    ${JSON.stringify(searchResults)}  
    </RESULTADOS BUSQUEDA NOTICIAS>
    `;
    console.log(system);

    const promptSummaryRequest: chat = {
      model: "llama3.1",
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: userQuery ?? "",
        },
      ],
      stream: false,
    };
    const summaryResult = await fetch(`${llmChatEndpoint}`, {
      method: "POST",
      body: JSON.stringify(promptSummaryRequest),
    });
    const summaryResponse = (await summaryResult.json())?.message?.content as
      | string
      | undefined;

    return summaryResponse ?? "";
  }
}

export class Gemini {
  constructor() {}

  async answerQuestion(
    system: string,
    question: string,
    searchResults: string
  ): Promise<string> {
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
      systemInstruction: system,
      safetySettings: safetySettings,
    });

    const geminiPrompt = `
    <INSTRUCCIONES DEL PROMPT>
    ${system}
    </INSTRUCCIONES DEL PROMPT>

    <PREGUNTA DEL USUARIO>
    ${question}
    </PREGUNTA DEL USUARIO>

    <RESULTADOS BUSQUEDA NOTICIAS>
    ${JSON.stringify(searchResults)}  
    </RESULTADOS BUSQUEDA NOTICIAS>
    `;
    console.log(geminiPrompt);

    const result = await model.generateContent(geminiPrompt);
    const response = result.response.text();
    return response;
  }
}

const queryRag = async (question: string) => {
  // embeddings
  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: googleKey,
    model: textEmbedding,
  });

  // VectorDb
  const client = new ChromaClient({
    path: chromadb,
  });

  // Get or create new VectorDB collection
  const vectorDb = await client.getCollection({
    name: vectorDbName,
    embeddingFunction: googleEmbeddings,
  });

  // Query
  const searchResults = await vectorDb.query({
    queryTexts: [question],
    nResults: 15,
  });

  const todaysDate = new DateTime(new Date()).setZone("America/Bogota").setLocale("es").toLocaleString(DateTime.DATE_HUGE);

  const system = `
  Eres un agente que busca noticias y responde a los usuarios.   
  Responde la siguente pregunta de un usuario usando el resultado de la busqueda a continuacion.
  Usa un lenguaje amigable e impersonal.
  
  Al responder sigue las siguentes reglas.
  - Omite links a paginas web.
  - Limitate a solo responder y no hacer preguntas adicionales.
  - Responde usando la información mas reciente.
  - La fecha de hoy es ${todaysDate}.
  - Limitate responder unicamente usando la información del resultado de la busqueda.
  - Si no encuentras información en el resultado de la busqueda, responde con 'Lo siento, solo te puedo responder preguntas relacionadas a las noticias'
  - Responde siempre en Español
  `;

  // Try gemini first
  try {
    const geminiAnswer = await new Gemini().answerQuestion(
      system,
      question,
      JSON.stringify(searchResults)
    );
    return geminiAnswer;
  } catch (error) {
    console.log(error);
  }

  // Fallback to ollama
  try {
    const ollamaAnswer = await new Ollama().answerQuestion(
      system,
      question,
      JSON.stringify(searchResults)
    );
    return ollamaAnswer;
  } catch (error) {
    console.log(error);
  }

  return "Lo siento, en este momento no puedo responder esta pregunta, intenta mas tarde o intenta una pregunta distinta.";
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
