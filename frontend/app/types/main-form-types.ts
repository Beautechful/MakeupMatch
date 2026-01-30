import type { QuestinnaireTypes } from './questionnaires-enum';

export interface MainFormData {
  answers?: Array<{ value: any; type: QuestinnaireTypes }>;
}
