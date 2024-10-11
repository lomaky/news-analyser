const fs = require("fs");
const path = require("path");
import { DateTime } from "luxon";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import { Article } from "./models/article";
import { Credentials } from "./credentials/credentials";

const vectorDbName = `news-text-embedding-004-v20240914_001.vdb`;
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
    console.log({ llm: "ollama" });
  }

  async generateQuestions(content: string): Promise<string> {
    const userQuery = `
Crea 6 preguntas relacionadas al siguiente articulo. retorna solo las preguntas sin ninguna respuesta o texto adicional:

${content}`;
    const promptSummaryRequest: chat = {
      model: "llama3.1",
      messages: [
        {
          role: "system",
          content: "Eres un asistente que genera preguntas para mejorar RAG",
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
    console.log({ llm: "gemini" });
  }

  async generateQuestions(content: string): Promise<string> {
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
      systemInstruction:
        "Eres un asistente que genera preguntas para mejorar RAG",
      safetySettings: safetySettings,
    });

    const geminiPrompt = `
Crea 6 preguntas relacionadas al siguiente articulo. retorna solo las preguntas sin ninguna respuesta o texto adicional:

${content}`;

    console.log({ prompt: geminiPrompt });

    const result = await model.generateContent(geminiPrompt);
    const response = result.response.text();
    console.log({ tokens: result.response.usageMetadata.totalTokenCount });
    return response;
  }
}

const main = async () => {
  // Article news
  const articlesRelativePath = "../news-processor/articles/";
  const articlesPath = path.join(__dirname, articlesRelativePath);
  console.log(articlesPath);

  // embeddings

  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: Credentials.Gemini,
    model: textEmbedding,
  });

  // VectorDb
  const client = new ChromaClient({
    path: chromadb,
  });
  console.log(`VectorDb=${vectorDbName}`);

  // Get or create new VectorDB collection
  const vectorDb = await client.getOrCreateCollection({
    name: vectorDbName,
    embeddingFunction: googleEmbeddings,
  });

  const files = fs
    .readdirSync(articlesPath)
    .filter((file) => path.extname(file) === ".json");

  for (const path of files) {
    try {
      const file = `${articlesRelativePath}${path}`;
      console.log(file);

      const data = fs.readFileSync(file);
      const article = JSON.parse(data) as Article;

      if (
        article &&
        article.id &&
        article.content &&
        article.title &&
        article.date
      ) {
        const articleExists = await vectorDb.get({
          ids: [article.id!.toString()],
        });
        const articleDate = DateTime.fromISO(article.date!)
          .setZone("America/Bogota")
          .setLocale("es")
          .toLocaleString(DateTime.DATE_HUGE);
        if (!articleExists || articleExists.ids.length < 1) {
          let questions = "";
          // Generate questions
          // Try gemini first
          try {
            questions = await new Gemini().generateQuestions(article.content);
          } catch (error) {
            console.error(error);
            // Fallback to ollama
            try {
              questions = await new Ollama().generateQuestions(article.content);
            } catch (error) {
              console.log(error);
            }
          }
          // Organise content
          const content = `# ${article.title} 
*${articleDate}*

${article.content!}

## Posibles preguntas resueltas en este articulo:
${questions}
        `;
          // Vectorize article
          await vectorDb.upsert({
            ids: [article.id!.toString()],
            documents: [content],
            metadatas: [
              {
                title: article.title!,
                date: new Date(article.date!).toISOString(),
                url: article.url ?? "",
              },
            ],
          });

          console.log(`[${articleDate}] ${article.title!}`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          console.log(`Already vectorized: [${articleDate}] ${article.title!}`);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
};

main();
