export type Mode = 'lesson_plan' | 'worksheet' | 'quiz' | 'translate_only' | 'adapt_for_inclusion';

export interface InputData {
  mode: Mode;
  subject: string;
  topic: string;
  grade_level: string;
  languages: string[];
  learning_objectives: string;
  time_available_minutes: number;
  constraints: string;
  adaptations?: string;
  sensitive_topics?: string;
}

export interface Section {
  heading: string;
  body: string;
}

export interface LanguageContent {
  title: string;
  sections: Section[];
}

export interface MirroredLanguageContent extends LanguageContent {
  language: string;
}

export interface InclusionStrategy {
  need: string;
  strategy: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  translation?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface AccessibilityFeature {
  feature: string;
  description: string;
}

export interface OutputData {
  title: string;
  mode: Mode;
  subject: string;
  topic: string;
  grade_level: string;
  languages: string[];
  content: {
    primary_language: LanguageContent;
    mirrored_languages: MirroredLanguageContent[];
  };
  inclusion_strategies: InclusionStrategy[];
  glossary: GlossaryTerm[];
  accessibility?: {
    alt_text_suggestions: { element: string; alt_text: string }[];
    tts_guidelines: string[];
    features: AccessibilityFeature[];
  };
  sources?: GroundingSource[];
  content_warnings?: string[];
  teacher_tips: string[];
  printable_markdown: string;
  self_check: {
    met_schema: boolean;
    met_inclusion: boolean;
    met_multilingual: boolean;
    notes: string;
  };
}
