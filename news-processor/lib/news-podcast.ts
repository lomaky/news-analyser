import { analysis } from "../models/analysis-result";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} from "@google/generative-ai";
import { PollySynthetiser } from "./polly";
var propertiesReader = require("properties-reader");
var properties = propertiesReader(".properties");

export class NewsPodcast {
  constructor() {}

  async generatePodcastAudioFile(analysis: analysis): Promise<string> {
    const fileParts: string[] = [];
    if (analysis?.podcast?.length) {
      const polly = new PollySynthetiser();
      let partNumber = 10000;
      for (const dialog of analysis.podcast) {
        const fileDialog = await polly.synthetise(
          partNumber++,
          dialog.Text,
          dialog.Speaker.toLowerCase().trim() === "jane"
        );
        fileParts.push(fileDialog);
      }
      const podcastFile = await polly.stitchPodcastAudio(fileParts);      
      console.log(podcastFile);
      return podcastFile;
    }    
    return '';
  }

  async generatePodcastObject(analysis: analysis): Promise<string> {
    try {
      const podcastNewsQty = 10;
      if (analysis?.articles?.length > podcastNewsQty) {
        let newsMd = "";
        for (let index = 0; index < podcastNewsQty; index++) {
          const article = analysis.articles[index];
          newsMd += `**${article.title}**\n\n`;
          newsMd += `${article.summary}\n\n`;
          newsMd += "---\n\n";
        }
        const genAI = new GoogleGenerativeAI(
          properties.get("GOOGLE.geminiKey")
        );
        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ];
        const schema = {
          description: "Script dialog",
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              Speaker: {
                type: SchemaType.STRING,
                description: "Name of the speaker, Oscar or Jane",
                nullable: false,
              },
              Text: {
                type: SchemaType.STRING,
                description: "Text by the speaker",
                nullable: false,
              },
            },
            required: ["Speaker", "Text"],
          },
        };
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction:
            'You are an assistant that creates the script in ENGLISH for a daily podcast between 2 people discussing the news from Colombia. first speaker is "Oscar", second speaker is "Jane"',
          safetySettings: safetySettings,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
          },
        });

        let geminiPrompt = `Create the script for a daily podcast in ENGLISH between 2 people discussing the following news from Colombia. Start the conversation with Jane saying 'Welcome to the Colombia times daily podcast' first speaker is 'Oscar', second speaker is 'Jane'. Return the script in JSON.\n\n`;
        geminiPrompt += "News:\n\n";
        geminiPrompt += newsMd;
        const result = await model.generateContent(geminiPrompt);
        const response = result.response.text();
        return response;
      }
    } catch (error) {
      console.error(error);
    }
    return "";
  }
}
