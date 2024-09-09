const fs = require("fs");
const path = require("path");
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
import { Article } from "./models/article";

const main = async () => {
  // Article news
  const articlesRelativePath = "../news-processor/articles/";
  const articlesPath = path.join(__dirname, articlesRelativePath);
  console.log(articlesPath);

  // embeddings
  const googleKey = "GOOGLE_KEY_HERE";
  const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: googleKey,
    model: "text-embedding-004",
  });

  // VectorDb
  const client = new ChromaClient({
    path: "http://192.168.86.100:8000",
  });

  const vectorDbName = `news-text-embedding-004.vdb`;
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
        // Vectorize article

        await vectorDb.upsert({
          ids: [article.id!.toString()],
          documents: [article.content!],
          metadatas: [
            {
              title: article.title!,
              date: new Date(article.date!).toISOString(),
              url: article.url ?? "",
            },
          ],
        });

        console.log(`Vectorized: ${article.title!}`);
      } else {
        console.log(`Already vectorized: ${article.title!}`);
      }
    }
  }
};

main();
