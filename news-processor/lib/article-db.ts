const fs = require("fs");
import { article } from "../models/eltiempo-article";

export class ArticleDatabase {
  constructor() {}

  async saveArticle(article: article): Promise<string> {
    try {
      if (article?.id) {
        const articleFileName = "./articles/" + article.id + ".json";
        var articleJson = JSON.stringify(article, null, 2);
        fs.writeFileSync(articleFileName, articleJson);
        return articleFileName;
      }
    } catch (error) {
      console.error(error);
    }
    return "";
  }

  async getArticle(articleId: string): Promise<article | null> {
    try {
      const articleFileName = "./articles/" + articleId + ".json";
      const data = fs.readFileSync(articleFileName);
      return JSON.parse(data) as article;
    } catch {}
    return null;
  }
}
