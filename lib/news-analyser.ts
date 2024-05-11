import { article } from "../models/eltiempo-article";
import { chat } from "../models/ollama-prompt";

export class NewsAnalyser {
  llmChatEndpoint = "http://localhost:11434/api/chat";

  constructor() {}

  async analyseArticle(article: article): Promise<article | null> {
    // Summarize article
    const promptSummaryRequest: chat = {
      model: "eltiempo-summarizer-v1",
      messages: [
        {
          role: "user",
          content: "Puedes resumir la siguiente noticia?",
        },
        {
          role: "assistant",
          content:
            "Sí! Estoy listo para suminizar la noticia para ti.\n\n¿Cuál es la noticia que deseas que yo resuma?",
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
    article.summary = summaryResponse;
    

    // Analize sentiment
    const promptSentimentRequest: chat = {
      model: "eltiempo-sentiment-v1",
      messages: [
        {
          role: "user",
          content: article.content ?? "",
        },
        {
          role: "user",
          content:
            "En una sola palabra, la noticia anterior es positiva o negativa?",
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
      article.positive = true;
    }
    if (sentimentResponse?.toLowerCase().includes("negativ")) {
      article.positive = false;
    }

    return article;
  }
}
