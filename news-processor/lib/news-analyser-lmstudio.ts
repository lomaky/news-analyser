import { analysis } from "../models/analysis-result";
import { article } from "../models/eltiempo-article";
import { chat } from "../models/ollama-prompt";

export class NewsAnalyserLMStudio {
  llmChatEndpoint = "http://localhost:1234/v1/chat/completions";

  constructor() {}

  async generateAnalysis(articles: article[]): Promise<analysis | null> {
    if (articles?.length) {
      const analysis: analysis = {
        articles: [],
        total: 0,
        positives: 0,
        negatives: 0,
        neutrals: 0,
        positiveIndex: 0,
        updated: new Date(),
      };

      let weightIndex = 10000000;
      for (let index = 0; index < articles.length; index++) {
        articles[index].weight = Math.round(weightIndex);
        articles[index].content = undefined;
        const mod = index % 5;
        if (mod == 0) {
          weightIndex = weightIndex / 2;
        }
        analysis.articles.push(articles[index]);
        analysis.neutrals +=
          articles[index].positive === undefined ||
          articles[index].positive === null
            ? 1
            : 0;
        analysis.positives += articles[index].positive ? 1 : 0;
        analysis.negatives += articles[index].positive === false ? 1 : 0;
      }
      analysis.total = analysis.articles.length;
      analysis.positiveIndex = Math.round(
        100 - (analysis.negatives / analysis.total) * 100
      );
      return analysis;
    }
    return null;
  }

  async analyseArticle(article: article): Promise<article | null> {
    if (!article || !article.content) {
      return null;
    }
    if (article.content && article.content.length < 50) {
      return null;
    }
    if (
      article.category &&
      article.category.trim().toLowerCase() === "lecturas dominicales"
    ) {
      return null;
    }

    // Summarize article
    const promptSummaryRequest: chat = {
      model: "mlx-community/Llama-3.2-3B-Instruct-4bit",
      messages: [
        {
          role: "system",
          content:
            "Eres un agente que resume noticias en español, resume la siguiente noticia. Usa un lenguaje impersonal y directo. Evita poner encabezados antes del resumen.",
        },
        {
          role: "user",
          content: article.content ?? "",
        },
      ],
      stream: false,
    };
    const llmHeaders = new Headers();
    llmHeaders.append("Content-Type", "application/json");
    const summaryResult = await fetch(`${this.llmChatEndpoint}`, {
      method: "POST",
      headers: llmHeaders,
      body: JSON.stringify(promptSummaryRequest),
      redirect: "follow",
    });
    const summaryResponse = (await summaryResult.json())?.choices[0].message?.content as
      | string
      | undefined;    

    article.summary = summaryResponse?.trim();

    // Analize sentiment
    const promptSentimentRequest: chat = {
      model: "mlx-community/Llama-3.2-3B-Instruct-4bit",
      messages: [
        {
          role: "system",
          content:
            "Eres un agente que clasifica una noticia como positiva, negativa o neutra. Responde con una sola palabra <positiva|neutra|negativa>. Evita agregar otras palabras. Analiza el sentimiento de la noticia del usuario.",
        },
        {
          role: "user",
          content: article.content ?? "",
        },
      ],
      stream: false,
    };

    const sentimentResult = await fetch(`${this.llmChatEndpoint}`, {
      method: "POST",
      headers: llmHeaders,
      body: JSON.stringify(promptSentimentRequest),
      redirect: "follow",
    });
    const sentimentResponse = (await sentimentResult.json())?.choices[0].message
      ?.content as string | undefined;
    article.sentiment = sentimentResponse;
    if (sentimentResponse?.toLowerCase().includes("positiv")) {
      article.sentiment = "positiva";
      article.positive = true;
    } else if (sentimentResponse?.toLowerCase().includes("negativ")) {
      article.sentiment = "negativa";
      article.positive = false;
    } else {
      article.sentiment = "neutra";
      article.positive = false;
    }

    return article;
  }

  async validArticle(article: article): Promise<boolean> {
    if (article) {
      // Validate is not commercial
      if (
        article.category &&
        article.category.toLowerCase().trim() === "contenido comercial"
      ) {
        console.log("Removed: Commercial content");
        return false;
      }
      // Passed all validations
      return true;
    }
    return false;
  }

}
