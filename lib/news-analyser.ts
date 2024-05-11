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
      };

      let weightIndex = 10000000;
      for (let index = 0; index < articles.length; index++) {
        articles[index].weight = Math.round(weightIndex);
        articles[index].content = undefined;
        const mod = index % 5;
        if (mod == 0){ weightIndex = weightIndex / 2; }        
        analysis.articles.push(articles[index]);
        analysis.neutrals += (articles[index].positive === undefined || articles[index].positive === null) ? 1 : 0;
        analysis.positives += articles[index].positive ? 1 : 0;
        analysis.negatives += articles[index].positive === false ? 1 : 0;
      }
      analysis.total = analysis.articles.length;
      analysis.positiveIndex = Math.round(100 - ((analysis.negatives / analysis.total) * 100));
      return analysis;
    }
    return null;
  }

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
