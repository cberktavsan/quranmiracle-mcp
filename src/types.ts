export interface Word {
  readonly ayah_no: number;
  readonly global_order_asc: number;
  readonly global_order_desc: number;
  readonly lemma: null | string;
  readonly order_in_ayah: number;
  readonly order_in_surah: number;
  readonly pos_tag: null | string;
  readonly root: null | string;
  readonly surah_no: number;
  readonly total_abjad: number;
  readonly word_id: string;
  readonly word_text: string;
}

export interface Letter {
  readonly abjad_value: number;
  readonly ayah_no: number;
  readonly global_order_asc: number;
  readonly letter_char: string;
  readonly position_in_word: number;
  readonly surah_no: number;
  readonly word_id: string;
}

export interface Surah {
  readonly ayah_count: number;
  readonly letter_count: number;
  readonly name_ar: string;
  readonly name_en: string;
  readonly name_tr: string;
  readonly surah_no: number;
  readonly word_count: number;
}

export interface Verse {
  readonly ayah_no: number;
  readonly surah_no: number;
  readonly text: string;
  readonly total_abjad: number;
  readonly word_count: number;
  readonly words: readonly Word[];
}

export interface ToolDefinition {
  description: string;
  inputSchema: {
    properties: Record<string, unknown>;
    required?: string[];
    type: 'object';
  };
  name: string;
}

export interface ToolResult {
  content: { text: string; type: 'text'; }[];
  isError?: boolean;
}

export interface PromptArgument {
  description: string;
  name: string;
  required: boolean;
}

export interface PromptDefinition {
  arguments: PromptArgument[];
  description: string;
  name: string;
}

export interface PromptMessage {
  content: { text: string; type: 'text'; };
  role: 'user';
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
  readonly abjad_value: number;
  readonly count: number;
  readonly divisible_by_19: boolean;
  readonly letter: string;
  readonly percentage: number;
}
