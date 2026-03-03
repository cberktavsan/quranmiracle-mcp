export const ARABIC_LETTERS: readonly { letter: string; abjad: number }[] = [
  { letter: 'ا', abjad: 1 }, { letter: 'ب', abjad: 2 }, { letter: 'ج', abjad: 3 },
  { letter: 'د', abjad: 4 }, { letter: 'ه', abjad: 5 }, { letter: 'و', abjad: 6 },
  { letter: 'ز', abjad: 7 }, { letter: 'ح', abjad: 8 }, { letter: 'ط', abjad: 9 },
  { letter: 'ي', abjad: 10 }, { letter: 'ك', abjad: 20 }, { letter: 'ل', abjad: 30 },
  { letter: 'م', abjad: 40 }, { letter: 'ن', abjad: 50 }, { letter: 'س', abjad: 60 },
  { letter: 'ع', abjad: 70 }, { letter: 'ف', abjad: 80 }, { letter: 'ص', abjad: 90 },
  { letter: 'ق', abjad: 100 }, { letter: 'ر', abjad: 200 }, { letter: 'ش', abjad: 300 },
  { letter: 'ت', abjad: 400 }, { letter: 'ث', abjad: 500 }, { letter: 'خ', abjad: 600 },
  { letter: 'ذ', abjad: 700 }, { letter: 'ض', abjad: 800 }, { letter: 'ظ', abjad: 900 },
  { letter: 'غ', abjad: 1000 },
];

export const LETTER_TO_ABJAD: Readonly<Record<string, number>> = Object.fromEntries(
  ARABIC_LETTERS.map((l) => [l.letter, l.abjad])
);
