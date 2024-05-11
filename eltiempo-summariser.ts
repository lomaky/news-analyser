import { article } from "./models/eltiempo-article";
import { ElTiempoScraper } from "./lib/eltiempo-scraper";
import { ArticleDatabase } from "./lib/article-db";
import { NewsAnalyser } from "./lib/news-analyser";

const main = async () => {
  const eltiempoScraper = new ElTiempoScraper();
  const newsAnalyser = new NewsAnalyser();
  const articleDatabase = new ArticleDatabase();
  const articlesForAnalysis: article[] = [];

  try {
    // Get homepage articles
    const articles = await eltiempoScraper.getHomepageArticles();
    if (articles?.length) {
      console.log(`Found ${articles.length} articles.`);
      // Get articles data
      for (const article of articles) {
        try {
          // try to get article from DB
          const savedArticle = await articleDatabase.getArticle(
            article.id ?? ""
          );
          if (!savedArticle) {
            // visit article and get content
            const completeArticle =
              await eltiempoScraper.getArticleContent(article);
            // Analyse article
            if (completeArticle && completeArticle.content) {
              console.log(`Analysing new article [${completeArticle.title}]`);
              const analysedArticle =
                await newsAnalyser.analyseArticle(article);
              if (analysedArticle) {
                articleDatabase.saveArticle(analysedArticle);
                articlesForAnalysis.push(analysedArticle);
              }
            }
          } else {
            console.log(`Retrieving from database [${savedArticle.title}]`);
            articlesForAnalysis.push(savedArticle);
          }
        } catch (error) {
          console.error(error);
        }
      }
      // Analyse
      //const analysisResult = await newsAnalyser.generateAnalysis(articles);
    } else {
      console.error("No articles to process");
    }
  } catch (error) {
    console.error(error);
  }
};

main();
