export interface article {
  title?: string;
  date?: Date;
  dateModified?: Date;
  id?: string;
  category?: string;
  url?: string;
  content?: string;
  summary?: string;
  englishTitle?: string;
  englishSummary?: string;
  positive?: boolean;
  sentiment?: string;
  weight?: number;
  thumbnail?: string;
}