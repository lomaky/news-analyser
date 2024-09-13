const fs = require("fs");
const path = require("path");
import { DateTime } from "luxon";
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
import { Article } from "./models/article";

const googleKey = "GOOGLE_KEY_HERE";
const vectorDbName = `news-text-embedding-004-v20240914.vdb`;
const chromadb = "http://192.168.86.100:8000";
const textEmbedding = "text-embedding-004";

const main = async () => {
  // Article news
  const articlesRelativePath = "../news-processor/articles/";
  const articlesPath = path.join(__dirname, articlesRelativePath);
  console.log(articlesPath);

  // embeddings
  
  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: googleKey,
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
        if (!articleExists || articleExists.ids.length < 1) {
          // Organise content
          const content = `# ${article.title} 
*${new DateTime(new Date(article.date!)).setZone("America/Bogota").setLocale("es").toLocaleString(DateTime.DATE_HUGE)}*

${article.content!}
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

          console.log(`Vectorized: ${article.title!}`);
          await new Promise((resolve) => setTimeout(resolve, 200));
        } else {
          console.log(`Already vectorized: ${article.title!}`);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
};

main();
