import axios from "axios";
import { createHash } from "crypto";
const cheerio = require("cheerio");
import scrapeIt = require("scrape-it");
import { article } from "../models/eltiempo-article";

export class ElTiempoScraperV2 {
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

    const requestConfig = {
      method: "GET",
      url: article.url,
      headers: {
        accept: "text/html",
      },
    };
    const response = await axios.request(requestConfig);

    const $ = cheerio.load(response.data);
    // note that I'm not using .html(), although it works for me either way
    const jsonRaw = $("script[type='application/ld+json']")[0].children[0].data;
    // do not use JSON.stringify on the jsonRaw content, as it's already a string
    const result = JSON.parse(jsonRaw);
    console.log(result.articleBody);

    article.content = result.articleBody;
    if (result.image && result.image.length > 0) {
      article.thumbnail = result.image[0]?.url ?? undefined;
    }

    if (article.content) {
      article.content = article.content
        .replace(/"/g, "'")
        .replace(/“/g, "'")
        .replace(/“/g, "'")
        .replace(/”/g, "'")
        .replace(/[\u00a0]/g, " ");
    }
    return article;
  }

  async getHomepageArticlesJson(): Promise<article[] | null> {
    const articles: article[] = [];
    const response = await fetch(this.eltiempoURL);
    const html = await response.text();
    const regex =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const jsonString = match[1].trim();
      try {
        const jsonArticles = JSON.parse(jsonString);
        for (const article of jsonArticles) {
          if (article?.["@type"] === "ReportageNewsArticle") {
            try {
              articles.push({
                title: article.headline,
                date: article.datePublished,
                dateModified: article.dateModified,
                id: this.md5(article.mainEntityOfPage?.["@id"]),
                category: "Colombia",
                url: article.mainEntityOfPage?.["@id"],
              });
            } catch (error) {
              console.error("Invalid JSON article", error);
            }
          }
        }
      } catch (error) {
        console.warn(
          "Invalid JSON found in <script type='application/ld+json'>:",
          error
        );
      }
    }
    return articles;
  }

  async getHomepageArticlesHTML(): Promise<article[] | null> {
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

  private md5(stringToMd5: string): string {
    return createHash("md5")
      .update(stringToMd5)
      .digest("hex")
      .trim()
      .toUpperCase();
  }
}
