const express = require("express");
var cors = require("cors");
import { DateTime } from "luxon";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
import { Credentials } from "./credentials/credentials";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Parameters
const vectorDbName = `news-text-embedding-004-v20240914_001.vdb`;
const vectorDbNameEnglish = `news-text-embedding-004-v20241012_en_001.vdb`;
const llmChatEndpoint = "http://localhost:1234/v1/chat/completions";
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
  constructor() {
    // console.log({ llm: "ollama" });
  }

  async answerQuestion(
    system: string,
    question: string,
    searchResults: string
  ): Promise<string> {
    const userQuery = `
${question}

<RESULTADOS BUSQUEDA NOTICIAS>
${searchResults}  
</RESULTADOS BUSQUEDA NOTICIAS>
    `;
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
    const llmHeaders = new Headers();
    llmHeaders.append("Content-Type", "application/json");
    const summaryResult = await fetch(`${llmChatEndpoint}`, {
      method: "POST",
      headers: llmHeaders,
      body: JSON.stringify(promptSummaryRequest),
      redirect: "follow",
    });
    const summaryResponse = (await summaryResult.json())?.choices[0].message
      ?.content as string | undefined;

    return summaryResponse ?? "";
  }

  async answerQuestionEnglish(
    system: string,
    question: string,
    searchResults: string
  ): Promise<string> {
    const userQuery = `
${question}

<RAG SEARCH RESULTS>
${searchResults}  
</RAG SEARCH RESULTS>
    `;
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
    const llmHeaders = new Headers();
    llmHeaders.append("Content-Type", "application/json");
    const summaryResult = await fetch(`${llmChatEndpoint}`, {
      method: "POST",
      headers: llmHeaders,
      body: JSON.stringify(promptSummaryRequest),
      redirect: "follow",
    });
    const summaryResponse = (await summaryResult.json())?.choices[0].message
      ?.content as string | undefined;

    return summaryResponse ?? "";
  }
}

export class Gemini {
  constructor() {
    // console.log({ llm: "gemini" });
  }

  async answerQuestion(
    system: string,
    question: string,
    searchResults: string
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(Credentials.Gemini);
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

    const geminiPrompt = `<INSTRUCCIONES DEL PROMPT>
${system}
</INSTRUCCIONES DEL PROMPT>

<PREGUNTA DEL USUARIO>
${question}
</PREGUNTA DEL USUARIO>

<RESULTADOS BUSQUEDA NOTICIAS>
${searchResults}  
</RESULTADOS BUSQUEDA NOTICIAS>
`;

    // console.log({ prompt: geminiPrompt });

    const result = await model.generateContent(geminiPrompt);
    const response = result.response.text();
    // console.log({ tokens: result.response.usageMetadata.totalTokenCount });
    return response;
  }

  async answerQuestionEnglish(
    system: string,
    question: string,
    searchResults: string
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(Credentials.Gemini);
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

    const geminiPrompt = `<PROMPT INSTRUCTIONS>
${system}
</PROMPT INSTRUCTIONS>

<USER QUESTION>
${question}
</USER QUESTION>

<RAG SEARCH RESULTS>
${searchResults}  
</RAG SEARCH RESULTS>
`;

    // console.log({ prompt: geminiPrompt });

    const result = await model.generateContent(geminiPrompt);
    const response = result.response.text();
    // console.log({ tokens: result.response.usageMetadata.totalTokenCount });
    return response;
  }
}

const queryRag = async (question: string) => {
  // embeddings
  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: Credentials.Gemini,
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

  let vectorDbResult = "";

  if (
    searchResults.documents &&
    searchResults.documents.length &&
    searchResults.documents[0].length
  ) {
    // console.log({ vectorResults: searchResults.documents[0].length });
    for (const document of searchResults.documents[0]) {
      vectorDbResult += `
${document}

---

`;
    }
  }

  const todaysDate = new DateTime(new Date())
    .setZone("America/Bogota")
    .setLocale("es")
    .toLocaleString(DateTime.DATE_HUGE);

  const system = `
Eres un agente que busca noticias y responde a los usuarios.   
Usa los resultados de la busqueda a continuación para inferir la respuesta.
Responde la siguente pregunta de un usuario usando el resultado de la busqueda a continuacion.
Usa un lenguaje amigable e impersonal.

Al responder sigue las siguentes reglas.
- Omite links a paginas web.
- Limitate a solo responder y no hacer preguntas adicionales.
- Responde usando la información mas reciente.
- La fecha de hoy es ${todaysDate}.
- Responde siempre en Español
  `;

  // Try gemini first
  try {
    const geminiAnswer = await new Gemini().answerQuestion(
      system,
      question,
      vectorDbResult
    );
    return geminiAnswer;
  } catch (error) {
    console.error(error);
  }

  // Fallback to ollama
  try {
    const ollamaAnswer = await new Ollama().answerQuestion(
      system,
      question,
      vectorDbResult
    );
    return ollamaAnswer;
  } catch (error) {
    // console.log(error);
  }

  return "Lo siento, en este momento no puedo responder esta pregunta, intenta mas tarde o intenta una pregunta distinta.";
};

const queryRagEnglish = async (question: string) => {
  // embeddings
  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: Credentials.Gemini,
    model: textEmbedding,
  });

  // VectorDb
  const client = new ChromaClient({
    path: chromadb,
  });

  // Get or create new VectorDB collection
  const vectorDb = await client.getCollection({
    name: vectorDbNameEnglish,
    embeddingFunction: googleEmbeddings,
  });

  // Query
  const searchResults = await vectorDb.query({
    queryTexts: [question],
    nResults: 15,
  });

  let vectorDbResult = "";

  if (
    searchResults.documents &&
    searchResults.documents.length &&
    searchResults.documents[0].length
  ) {
    // console.log({ vectorResults: searchResults.documents[0].length });
    for (const document of searchResults.documents[0]) {
      vectorDbResult += `
${document}

---

`;
    }
  }

  const todaysDate = new DateTime(new Date())
    .setZone("America/Bogota")
    .setLocale("en")
    .toLocaleString(DateTime.DATE_HUGE);

  const system = `
You are an agent that answer questions to users.  
Use the following RAG search results to compose an answer to the question.
Answer to the user question using only the RAG search results.
Use an friendly and casual language.

Follow the following rules when composing the answer.
- Avoid including URL links.
- Only answer the question and do not ask any additional question.
- Answer using the most recent information.
- Today's date is ${todaysDate}.
- Always answer in English.
  `;

  // Try gemini first
  try {
    const geminiAnswer = await new Gemini().answerQuestionEnglish(
      system,
      question,
      vectorDbResult
    );
    return geminiAnswer;
  } catch (error) {
    console.error(error);
  }

  // Fallback to ollama
  try {
    const ollamaAnswer = await new Ollama().answerQuestionEnglish(
      system,
      question,
      vectorDbResult
    );
    return ollamaAnswer;
  } catch (error) {
    // console.log(error);
  }

  return "Lo siento, en este momento no puedo responder esta pregunta, intenta mas tarde o intenta una pregunta distinta.";
};

const app = express();
app.use(express.json());
const PORT = 9700;
app.listen(PORT, () => {
  // console.log("Server Listening on port:", PORT);
});

app.get("/search", cors(), async (request, response) => {
  let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
  try {
    // console.log({ question: request.query.query });
    const dbResponse = await queryRag(request.query.query);
    const ragResponse = {
      Query: request.query.query,
      Response: dbResponse,
      Ip: ip,
    };
    console.log({ response: ragResponse });
    response.send(ragResponse);
  } catch (error) {
    try {
      console.error(error);
      response.send({
        Query: request?.query?.query ?? "",
        Response:
          "Lo siento, en este momento no puedo responder esta pregunta, intenta mas tarde o intenta una pregunta distinta.",
        Ip: ip,
      });
    } catch (err) {
      console.error(err);
    }
  }
});

app.get("/search-en", cors(), async (request, response) => {
  let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
  try {
    // console.log({ question: request.query.query });
    const dbResponse = await queryRagEnglish(request.query.query);
    const ragResponse = {
      Query: request.query.query,
      Response: dbResponse,
      Ip: ip,
    };
    console.log({ response: ragResponse });
    response.send(ragResponse);
  } catch (error) {
    try {
      console.error(error);
      response.send({
        Query: request?.query?.query ?? "",
        Response:
          "I'm sorry, I can't answer this question now, try later or try a different question.",
        Ip: ip,
      });
    } catch (err) {
      console.error(err);
    }
  }
});