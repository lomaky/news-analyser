import { article } from "./eltiempo-article";

export interface analysis {
  articles: article[];
  total: number;
  positives: number;
  negatives: number;
  neutrals: number;
  positiveIndex: number;
  updated: Date;
}

