import { article } from "./models/eltiempo-article";
import { ElTiempoScraperV2 } from "./lib/eltiempo-scraper-v2";
import { ArticleDatabase } from "./lib/article-db";
import { S3uploader } from "./lib/s3-uploader";
import { NewsAnalyserLMStudio } from "./lib/news-analyser-lmstudio";
import { NewsPodcast } from "./lib/news-podcast";

const main = async () => {
  const eltiempoScraper = new ElTiempoScraperV2();
  const newsAnalyser = new NewsAnalyserLMStudio();
  const articleDatabase = new ArticleDatabase();
  const s3Uploader = new S3uploader();
  const articlesForAnalysis: article[] = [];

  try {
    // Get homepage articles
    const articles = await eltiempoScraper.getHomepageArticlesJson();
    if (articles?.length) {
      console.log(`Found ${articles.length} articles.`);
      // Get articles data
      for (const article of articles) {
        try {
          const isArticleInList =
            articlesForAnalysis.filter((a) => a.id === article.id).length > 0;
          if (!isArticleInList) {
            console.log(`Finding article ${article.id}`);
            // try to get article from DB
            const savedArticle = await articleDatabase.getArticle(
              article.id ?? ""
            );
            if (
              !savedArticle ||
              (savedArticle &&
                savedArticle.dateModified !== article.dateModified)
            ) {
              // visit article and get content
              const completeArticle =
                await eltiempoScraper.getArticleContent(article);
              // Analyse article
              if (completeArticle) {
                if (await newsAnalyser.validArticle(completeArticle)) {
                  console.log(
                    `Analysing new/updated article [${completeArticle.title}]`
                  );
                  const analysedArticle =
                    await newsAnalyser.analyseArticle(article);
                  if (analysedArticle) {
                    articleDatabase.saveArticle(analysedArticle);
                    articlesForAnalysis.push(analysedArticle);
                  }
                }
              }
            } else {
              console.log(`Retrieving from database [${savedArticle.title}`);
              savedArticle.summary = savedArticle.summary ?? "";
              articlesForAnalysis.push(savedArticle);
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
      console.log(`${articlesForAnalysis.length} articles were analysed.`);
      // Analyse sentiment
      const analysisResult =
        await newsAnalyser.generateAnalysis(articlesForAnalysis);
      console.log(analysisResult);
      // generate podcast
      const podcastGenerator = new NewsPodcast();
      try {
        console.log(`Generating podcast`);
        const podcast = await podcastGenerator.generatePodcastObject(
          analysisResult!
        );
        analysisResult!.podcast = JSON.parse(podcast);
        // Create podcast audio
        console.log(`Creating podcast audio`);
        const podcastAudioFile =
          await podcastGenerator.generatePodcastAudioFile(analysisResult!);
        analysisResult!.podcastAudioFile = podcastAudioFile;
      } catch (error) {
        console.error(error);
      }
      // Upload to S3
      console.log(`Uploading analysis to s3`);
      await s3Uploader.uploadAnalysis(analysisResult!);
      if (analysisResult?.podcastAudioFile?.length) {
        console.log(`Uploading podcast to s3`);
        await s3Uploader.uploadPodcast(analysisResult.podcastAudioFile);
      }

      // Upload to S3
      console.log(`Done.`);
    } else {
      console.error("No articles to process");
    }
  } catch (error) {
    console.error(error);
  }
};

main();
