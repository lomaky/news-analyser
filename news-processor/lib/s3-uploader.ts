import { analysis } from "../models/analysis-result";
var propertiesReader = require("properties-reader");
var properties = propertiesReader(".properties");
const fs = require("fs");

import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandOutput,
} from "@aws-sdk/client-s3";

export class S3uploader {
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private region: string;

  constructor() {
    this.accessKeyId = properties.get("AWS.accessKeyId");
    this.secretAccessKey = properties.get("AWS.secretAccessKey");
    this.bucket = properties.get("AWS.bucket");
    this.region = properties.get("AWS.region");
  }

  async uploadPodcast(podcastFile: string): Promise<string> {
    try {
        // upload latest
        await this.uploadFileToS3(
          fs.readFileSync(podcastFile),
          "latest_podcast.mp3"
        );
        // upload this version
        await this.uploadFileToS3(
          fs.readFileSync(podcastFile),
          podcastFile + ".mp3"
        );
      
    } catch (error) {
      console.error(error);
    }
    return "";
  }

  async uploadAnalysis(analysis: analysis): Promise<string> {
    try {
      if (analysis) {
        // upload latest
        await this.uploadFileToS3(
          Buffer.from(JSON.stringify(analysis)),
          "latest.json"
        );
        // upload this version
        await this.uploadFileToS3(
          Buffer.from(JSON.stringify(analysis)),
          analysis.updated!.toISOString() + ".json"
        );
      }
    } catch (error) {
      console.error(error);
    }
    return "";
  }

  private async uploadFileToS3(
    fileBuffer: Buffer,
    key: string
  ): Promise<PutObjectCommandOutput> {
    const s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });

    return await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
      })
    );
  }
}
