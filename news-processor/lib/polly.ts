import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
var propertiesReader = require("properties-reader");
var properties = propertiesReader(".properties");
const fs = require("fs");

export class PollySynthetiser {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private pollyClient;

  constructor() {
    this.accessKeyId = properties.get("AWS.accessKeyId");
    this.secretAccessKey = properties.get("AWS.secretAccessKey");
    this.region = properties.get("AWS.region");
    // Initialize polly
    this.pollyClient = new PollyClient({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  async synthetise(
    partnumber: number,
    text: string,
    isFemaleVoice: boolean
  ): Promise<string> {
    const command = new SynthesizeSpeechCommand({
      OutputFormat: "mp3",
      SampleRate: "24000",
      Text: text,
      Engine: "generative",
      TextType: "text",
      VoiceId: isFemaleVoice ? "Danielle" : "Stephen",
    });
    const response = await this.pollyClient.send(command);
    const file = `media/temp/${partnumber}_${new Date().toISOString()}.mp3`;
    fs.writeFileSync(
      file,
      await response.AudioStream?.transformToByteArray(),
      {}
    );
    return file;
  }

  async stitchPodcastAudio(audioPartFiles: string[]): Promise<string> {
    const podcastFile = `media/temp/podcast_${new Date().toISOString()}.mp3`;
    let podcastAudio = fs.createWriteStream(podcastFile);
    for (const part of audioPartFiles.sort()) {
      console.log(`Appending ${part}...`);
      let stream = fs.createReadStream(part);
      stream.pipe(podcastAudio, { end: false });
      await this.sleep(1000);
    }
    // delete parts
    try {
      for (const part of audioPartFiles.sort()) {
        fs.unlinkSync(part);
      }
    } catch (error) {
      console.error(error);
    }
    return podcastFile;
  }

  async sleep(ms: number): Promise<void> {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
