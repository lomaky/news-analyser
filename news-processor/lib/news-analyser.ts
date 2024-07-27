import { analysis } from "../models/analysis-result";
import { article } from "../models/eltiempo-article";
import { chat } from "../models/ollama-prompt";

export class NewsAnalyser {
  llmChatEndpoint = "http://localhost:11434/api/chat";

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
      model: "llama3.1",
      messages: [
        {
          role: "system",
          content:
            "Eres un agente que resume noticias en español, resume la siguiente noticia.",
        },
        {
          role: "user",
          content: article.content ?? "",
        },
      ],
      stream: false,
    };
    const summaryResult = await fetch(`${this.llmChatEndpoint}`, {
      method: "POST",
      body: JSON.stringify(promptSummaryRequest),
    });
    const summaryResponse = (await summaryResult.json())?.message?.content as
      | string
      | undefined;

    const cleanSummary = this.cleanSummary(summaryResponse ?? "");

    article.summary = cleanSummary;

    // Analize sentiment
    const promptSentimentRequest: chat = {
      model: "llama3.1",
      messages: [
        {
          role: "system",
          content:
            "Eres un agente que clasifica una noticia como positiva o negativa y entrega el resultado en un objeto JSON. Clasifica la siguiente noticia y retorna la información en JSON con la siguiente propiedad - sentimiento <positiva|neutra|negativa> Sentimiento de la noticia.",
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
      body: JSON.stringify(promptSentimentRequest),
    });
    const sentimentResponse = (await sentimentResult.json())?.message
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

  cleanSummary(summary: string) {
    const bin = [
      "¡Claro! Aquí te dejo un resumen de la noticia en español:",
      "¡Claro! Aquí te dejo un resumen en español de la noticia:",
      "¡Claro! Aquí te presento una breve reseña de la noticia:",
      "¡Claro! Aquí tienes la noticia resumida en español:",
      "¡Claro! Aquí te presento un resumen de la noticia:",
      "¡Claro! Aquí te presento una resumen de la noticia:",
      "¡Claro! Aquí te presento la noticia en español:",
      "¡Claro! Aquí te dejo un resumen de la noticia:",
      "¡Claro! Aquí te dejo el resumen de la noticia:",
      "¡Claro! Aquí te dejo la resumen de la noticia:",
      "¡Claro! Aquí te presento la noticia resumida:",
      "¡Claro! Te resumo la noticia sobre",
      "¡Claro! Aquí te resumo la noticia:",
      "¡Claro! Te resumo la noticia:",

      "¡Excelente elección! Aquí te presento la resumen en español:",
      "¡Excelente elección! Aquí te presento una resumen de la noticia:",
      "¡Excelente elección! Aquí te presento un resumen de la noticia:",
      "¡Excelente elección de noticia!\n\nResumo:",
      "Excelente noticia!\n\nResumen:",
      "¡Excelente elección!",
      "¡Excelente noticia!",

      "¡Listo! Aquí te presento una resumen de la noticia:",
      "¡Listo! Aquí te presento un resumen de la noticia:",
      "¡Listo! Aquí te dejo una resumen de la noticia:",
      "¡Listo! Aquí tienes un resumen de la noticia:",
      "¡Listo! Aquí te presento la noticia resumida:",

      "¡Genial! Aquí te dejo una breve reseña en español de la noticia:",

      "Aquí te dejo una breve reseña en español de la noticia:",
      "Aquí te presento una resumen de la noticia en español:",
      "Aquí te dejo un resumen en español de la noticia:",
      "Aquí te dejo un resumen de la noticia en español:",
      "Aquí te dejo la resumen de la noticia en español:",
      "Aquí te presento una breve reseña de la noticia:",
      "Aquí tienes la noticia resumida en español:",
      "Aquí te presento una resumen de la noticia:",
      "Aquí te presento un resumen de la noticia:",
      "Aquí te dejo una resumen de la noticia:",
      "Aquí te presento la resumen en español:",
      "Aquí te presento la noticia en español:",
      "Aquí te dejo la resumen de la noticia:",
      "Aquí te dejo el resumen de la noticia:",
      "Aquí te dejo un resumen de la noticia:",
      "Aquí te presento la noticia resumida:",
      "Aquí tienes un resumen de la noticia:",
      "Aquí te resumo la noticia:",

      "¡Lo siento mucho! La noticia es muy trágica. Aquí te resumo lo más importante:",
      "¡Lo siento! Me parece que tienes una gran noticia para mí. Aquí te resumo:",
      "¡Lo siento mucho! La noticia es muy trágica.",
      "¡Lo siento mucho! La noticia es trágica.",

      "¡Hola! Eres un agente que resume noticias de eltiempo.com.",
      "Un agente que resume noticias de eltiempo.com",
      "¡Vaya cambio de tema!",
      "Resumen de la noticia:",
      "Noticias de El Tiempo:",
      "Te resumo la noticia:",
      "Resumo de la noticia:",
      "¡Lo siento mucho!",
      "¡Genial noticia!",
      "¡Vaya noticia!",
      "¡Genial!",
      "¡Claro!",
      "¡Listo!",
    ];

    let cleanSummary = summary;
    for (const rubish of bin) {
      if (cleanSummary.includes(rubish)) {
        console.log(`Limpiando: ${rubish}`);
        cleanSummary = cleanSummary.replace(rubish, "");
      }
    }
    return cleanSummary.trim();
  }
}
