import { article } from "./eltiempo-article";

export interface Dialog {
  Speaker: string;
  Text: string;
}

export interface analysis {
  articles: article[];
  chatsamples: string[];
  total: number;
  positives: number;
  negatives: number;
  neutrals: number;
  positiveIndex: number;
  updated: Date;
  podcast: Dialog[] | undefined;
  podcastAudioFile: string;
}

