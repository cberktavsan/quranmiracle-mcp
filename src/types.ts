export interface Word {
  readonly word_id: string;
  readonly surah_no: number;
  readonly ayah_no: number;
  readonly order_in_ayah: number;
  readonly order_in_surah: number;
  readonly word_text: string;
  readonly total_abjad: number;
  readonly pos_tag: string | null;
  readonly root: string | null;
  readonly lemma: string | null;
  readonly global_order_asc: number;
  readonly global_order_desc: number;
}

export interface Letter {
  readonly letter_char: string;
  readonly abjad_value: number;
  readonly word_id: string;
  readonly surah_no: number;
  readonly ayah_no: number;
  readonly position_in_word: number;
  readonly global_order_asc: number;
}

export interface Surah {
  readonly surah_no: number;
  readonly name_ar: string;
  readonly name_tr: string;
  readonly name_en: string;
  readonly ayah_count: number;
  readonly word_count: number;
  readonly letter_count: number;
}

export interface Verse {
  readonly surah_no: number;
  readonly ayah_no: number;
  readonly text: string;
  readonly total_abjad: number;
  readonly word_count: number;
  readonly words: readonly Word[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

export interface PromptMessage {
  role: 'user';
  content: { type: 'text'; text: string };
}

export type GrammarCategory =
  | 'conjunction'
  | 'definite'
  | 'exact'
  | 'future'
  | 'oath'
  | 'preposition'
  | 'question';

export interface GrammarGroupedResult {
  readonly category: GrammarCategory;
  readonly count: number;
  readonly prefix: string;
  readonly words: readonly Word[];
}

export interface LetterStat {
  readonly letter: string;
  readonly count: number;
  readonly abjad_value: number;
  readonly percentage: number;
  readonly divisible_by_19: boolean;
}
