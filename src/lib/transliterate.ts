const ARABIC_TO_BUCKWALTER: Record<string, string> = {
  'ء': "'", 'آ': '|', 'أ': '>', 'ؤ': '&', 'إ': '<', 'ئ': '}',
  'ا': 'A', 'ب': 'b', 'ة': 'p', 'ت': 't', 'ث': 'v', 'ج': 'j',
  'ح': 'H', 'خ': 'x', 'د': 'd', 'ذ': '*', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': '$', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z',
  'ع': 'E', 'غ': 'g', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
  'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ى': 'Y', 'ي': 'y',
};

export function arabicToBuckwalter(text: string): string {
  let result = '';
  let lastChar = '';
  for (const char of text) {
    const buckwalter = ARABIC_TO_BUCKWALTER[char];
    if (buckwalter !== undefined && buckwalter !== lastChar) {
      result += buckwalter;
      lastChar = buckwalter;
    }
  }
  return result;
}

export function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
