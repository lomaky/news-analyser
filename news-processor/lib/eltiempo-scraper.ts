import scrapeIt = require("scrape-it");
import { article } from "../models/eltiempo-article";

export class ElTiempoScraper {
  eltiempoURL = "https://eltiempo.com";

  constructor() {}

  async getArticleContent(article: article): Promise<article | null> {
    if (!article.url) {
      console.error("no url");
      return null;
    }
    if (!article.url.toLowerCase().includes("eltiempo.com")) {
      console.error(`unknown link (${article.url})`);
      return null;
    }
    const { data } = (await scrapeIt(article.url, {
      // Fetch article content
      paragraph1: ".c-detail-content > .c-detail__body > p",
      paragraph2: ".c-detail-content > .c-detail__body > .paragraph",
      thumbnail: {
        selector: ".c-detail-header > figure > div > img",
        attr: "src",
      },
    })) as any;
    article.content =
      data.paragraph1.toString() + ". " + data.paragraph2.toString();
    article.thumbnail = data.thumbnail ?? undefined;

    article.content = article.content
      .replace(/"/g, "'")
      .replace(/“/g, "'")
      .replace(/“/g, "'")
      .replace(/”/g, "'")
      .replace(/[\u00a0]/g, " ");
    return article;
  }

  async getHomepageArticles(): Promise<article[] | null> {
    const { data } = (await scrapeIt(this.eltiempoURL, {
      // Fetch articles
      articles: {
        listItem: ".c-article",
        data: {
          // article title
          title: {
            attr: "data-name",
          },
          // article date
          date: {
            attr: "data-publicacion",
            convert: (x) => new Date(x),
          },
          // article id
          id: {
            attr: "data-id",
          },
          // article category
          category: {
            attr: "data-category",
          },
          // article url
          url: {
            selector: "h3 > a",
            attr: "href",
          },
        },
      },
    })) as any;
    return data.articles;
  }
}
