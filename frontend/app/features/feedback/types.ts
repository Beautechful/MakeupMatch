export interface FeedbackPayload {
  rating: number;
  improvements?: ImprovementOption[];
  opinions?: string;
}

export enum ImprovementOption {
  ColorMatch = 'colorMatch',
  Suggestions = 'suggestions',
  Speed = 'speed',
  Scanning = 'scanning',
  Hygenic = 'hygenic',
}

export type Rating = 1 | 2 | 3 | 4 | 5;
