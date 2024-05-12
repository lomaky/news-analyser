import { analysis } from "../models/analysis-result";
var propertiesReader = require("properties-reader");
var properties = propertiesReader(".properties");

import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandOutput,
  PutObjectAclCommand,
  PutObjectAclCommandOutput,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";

export class S3uploader {
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private region: string;

  constructor() {
    this.accessKeyId = properties.get("S3.accessKeyId");
    this.secretAccessKey = properties.get("S3.secretAccessKey");
    this.bucket = properties.get("S3.bucket");
    this.region = properties.get("S3.region");
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

  private async markObjectAsPublic(
    objectKey: string
  ): Promise<PutObjectAclCommandOutput> {
    const s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
    return await s3Client.send(
      new PutObjectAclCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ACL: ObjectCannedACL.public_read,
      })
    );
  }
}
