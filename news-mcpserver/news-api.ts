import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from "chromadb";
import { Credentials } from "./credentials/credentials";

export class NewsApi {
  chromadb = "http://192.168.86.100:8000";
  textEmbedding = "text-embedding-004";
  vectorDbName = "news-text-embedding-004-v20241012_en_001.vdb";
  constructor() {}

  async search(
    query: string,
    date?: string
  ): Promise<{
    content: {
      type: string;
      text: string;
    }[];
  }> {
    // Query
    let q = query;
    if (!date) {
      q = `${q}. [Date: ${new Date().toISOString()}]`;
    } else {
      q = `${q}. [Date: ${new Date(date).toISOString()}]`;
    }

    console.log({ query: q });
    // VectorDb
    const googleEmbeddings = new GoogleGenerativeAiEmbeddingFunction({
      googleApiKey: Credentials.Gemini,
      model: this.textEmbedding,
    });
    const client = new ChromaClient({
      path: this.chromadb,
    });

    const vectorDb = await client.getCollection({
      name: this.vectorDbName,
      embeddingFunction: googleEmbeddings,
    });

    const searchResults = await vectorDb.query({
      queryTexts: [q],
      nResults: 15,
    });

    let result = "";
    if (
      searchResults.documents &&
      searchResults.documents.length &&
      searchResults.documents[0].length
    ) {
      for (const document of searchResults.documents[0]) {
        result += `
${document}

---

`;
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
}
