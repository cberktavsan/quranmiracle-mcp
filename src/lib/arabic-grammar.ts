/**
 * Arapça Gramer Kütüphanesi
 * Prefix (ön ek) ve suffix (son ek) tespit ve varyant üretimi
 *
 * Desteklenen ön ekler:
 * - Belirlilik takısı (ال): الرحمن
 * - Harf-i Atf (و، ف): والرحمن، فالرحمن
 * - Harf-i Cer (ب، ل، ك): بالرحمن، للرحمن، كالرحمن
 * - Harf-i Kasem (ت): تالله
 * - Hemze-i İstifham (أ): أفلا
 * - İstikbal Harfi (س): سيعلمون
 *
 * Desteklenen son ekler (tenvin - sadece belirsiz kelimeler):
 * - Tenvin-i Nasb (ا): رحيما، عليما
 */

import type { GrammarCategory } from '../types.js';

/** Prefix tanımları */
export interface PrefixDefinition {
  readonly letters: readonly string[];
  readonly nameEn: string;
  readonly nameTr: string;
}

/** Prefix kategorileri (exact ve definite hariç - özel işlem görürler) */
export const ARABIC_PREFIXES: Readonly<Record<Exclude<GrammarCategory, 'definite' | 'exact'>, PrefixDefinition>> = {
  conjunction: {
    letters: ['و', 'ف'],
    nameEn: 'Conjunction',
    nameTr: 'Harf-i Atf',
  },
  future: {
    letters: ['س'],
    nameEn: 'Future Particle',
    nameTr: 'İstikbal Harfi',
  },
  oath: {
    letters: ['ت'],
    nameEn: 'Oath Particle',
    nameTr: 'Harf-i Kasem',
  },
  preposition: {
    letters: ['ب', 'ل', 'ك'],
    nameEn: 'Preposition',
    nameTr: 'Harf-i Cer',
  },
  question: {
    letters: ['أ'],
    nameEn: 'Question Particle',
    nameTr: 'Hemze-i İstifham',
  },
} as const;

/** Belirlilik takısı tanımı (ayrı işlenir çünkü iki karakterli) */
export const DEFINITE_ARTICLE: Readonly<PrefixDefinition> = {
  letters: ['ال'],
  nameEn: 'Definite Article',
  nameTr: 'Belirlilik Takısı',
};

/** Tüm tekli prefix harfleri */
const SINGLE_PREFIXES: readonly string[] = [
  ...ARABIC_PREFIXES.conjunction.letters,
  ...ARABIC_PREFIXES.preposition.letters,
  ...ARABIC_PREFIXES.oath.letters,
  ...ARABIC_PREFIXES.question.letters,
  ...ARABIC_PREFIXES.future.letters,
];

/**
 * Parçalanmaması gereken özel kelimeler
 * Bu kelimeler "ال" ile başlasa bile parçalanmaz
 * Örnek: الله = Allah (ال + له DEĞİL!)
 */
const SPECIAL_WORDS: ReadonlySet<string> = new Set([
  // === Allah lafzı ===
  'الله',    // Allah - parçalanmamalı
  'اللهم',   // Allahümme - parçalanmamalı

  // === Huruf-u Mukattaa (Kesik Harfler) ===
  'الم',     // Elif-Lam-Mim (2:1, 3:1, 29:1, 30:1, 31:1, 32:1)
  'الر',     // Elif-Lam-Ra (10:1, 11:1, 12:1, 14:1, 15:1)
  'المص',    // Elif-Lam-Mim-Sad (7:1)
  'المر',    // Elif-Lam-Mim-Ra (13:1)

  // === Peygamber İsimleri ===
  'الياس',   // İlyas peygamber (37:123)
  'اليسع',   // Elyesa peygamber (6:86, 38:48)

  // === Özel İsimler (Yer/Put) ===
  'اللت',    // Lat putu (53:19)
  'الايكه',  // Eyke - yer adı (26:176, 38:13)
]);

/** İkili prefix kombinasyonları (ال hariç) */
const DOUBLE_PREFIX_COMBINATIONS: readonly (readonly [string, string])[] = [
  // Conjunction + Preposition
  ['و', 'ب'],
  ['و', 'ل'],
  ['و', 'ك'],
  ['ف', 'ب'],
  ['ف', 'ل'],
  ['ف', 'ك'],
  // Conjunction + Oath
  ['و', 'ت'],
  // Question + Preposition
  ['أ', 'ب'],
  ['أ', 'ل'],
  // Conjunction + Future
  ['و', 'س'],
  ['ف', 'س'],
] as const;

/**
 * ال ile başlayan kelimeler için prefix varyantları
 * Not: ل + ال = لل (lam birleşir)
 */
const DEFINITE_PREFIXES: readonly string[] = [
  'ال',   // sadece ال
  'وال',  // و + ال
  'فال',  // ف + ال
  'بال',  // ب + ال
  'لل',   // ل + ال (lam birleşir!)
  'كال',  // ك + ال
  'تال',  // ت + ال (yemin: تالله)
  'أال',  // أ + ال
  'سال',  // س + ال
  'وبال', // و + ب + ال
  'ولل',  // و + ل + ال
  'فبال', // ف + ب + ال
  'فلل',  // ف + ل + ال
  'أفال', // أ + ف + ال
];

/**
 * Tenvin son ekleri (sadece belirsiz kelimeler için)
 * Tenvin-i Nasb: ًـا yazılır, ا olarak okunur
 * Not: Belirli kelimeler (ال ile başlayanlar) tenvin almaz!
 */
const TENVIN_SUFFIX = 'ا';  // Tenvin-i Nasb (mansub hali)

/**
 * Zamir ekleri - bunlarla biten kelimeler tenvin DEĞİLDİR
 * Tenvin eklendiğinde bu sonuçlar oluşursa, tenvin eklenmemeli
 */
const PRONOUN_SUFFIX_ENDINGS: readonly string[] = [
  'نا',   // biz/bize (رحمنا = رحم + نا, NOT رحمن + ا)
  'ها',   // o (dişi) / onu
  'هم',   // onlar (erkek)
  'هن',   // onlar (dişi)
  'كم',   // siz (erkek)
  'كن',   // siz (dişi)
];

/** Tespit edilen prefix bilgisi */
export interface DetectedPrefix {
  readonly category: GrammarCategory;
  readonly prefix: string;
}

/** Type guard for GrammarCategory */
function isValidGrammarCategory(category: string): category is GrammarCategory {
  return category === 'conjunction' || category === 'preposition' ||
         category === 'oath' || category === 'question' || category === 'future';
}

/**
 * Bir harfin hangi kategoriye ait olduğunu belirler
 */
export function categorizePrefix(prefix: string): GrammarCategory | null {
  // Belirlilik takısı kontrolü
  if (prefix === 'ال') {
    return 'definite';
  }
  for (const [category, definition] of Object.entries(ARABIC_PREFIXES)) {
    if (definition.letters.includes(prefix) && isValidGrammarCategory(category)) {
      return category;
    }
  }
  return null;
}

/**
 * Kelimede ال (belirlilik takısı) var mı kontrol eder
 * ve varsa pozisyonunu döndürür
 */
function findDefiniteArticle(word: string): { found: boolean; position: number } {
  // Direkt ال ile başlıyor mu?
  if (word.startsWith('ال')) {
    return { found: true, position: 0 };
  }

  // لل ile başlıyor mu? (ل + ال birleşimi)
  if (word.startsWith('لل') && word.length > 2) {
    return { found: true, position: 1 };
  }

  // Prefix + ال kombinasyonları kontrol et
  const prefixPatterns = ['وال', 'فال', 'بال', 'كال', 'تال', 'أال', 'سال'];
  for (const pattern of prefixPatterns) {
    if (word.startsWith(pattern)) {
      return { found: true, position: pattern.length - 2 };
    }
  }

  // Çift prefix + ال kombinasyonları
  const doublePrefixPatterns = ['وبال', 'ولل', 'فبال', 'فلل', 'أفال'];
  for (const pattern of doublePrefixPatterns) {
    if (word.startsWith(pattern)) {
      return { found: true, position: pattern.length - 2 };
    }
  }

  return { found: false, position: -1 };
}

/**
 * ال içeren kelimeler için prefix tespiti (helper)
 */
function detectPrefixesWithDefiniteArticle(
  word: string,
  definitePosition: number
): readonly DetectedPrefix[] {
  const detected: DetectedPrefix[] = [];

  // لل durumunda ilk ل bir preposition
  if (word.startsWith('لل')) {
    detected.push({ category: 'preposition', prefix: 'ل' });
    detected.push({ category: 'definite', prefix: 'ال' });
    return detected;
  }

  // ال'dan önceki prefix'leri tespit et
  const beforeAl = word.slice(0, definitePosition);
  for (const char of beforeAl) {
    const category = categorizePrefix(char);
    if (category !== null) {
      detected.push({ category, prefix: char });
    }
  }

  // ال'ı ekle
  detected.push({ category: 'definite', prefix: 'ال' });
  return detected;
}

/**
 * ال içermeyen kelimeler için normal prefix tespiti (helper)
 */
function detectSimplePrefixes(word: string): readonly DetectedPrefix[] {
  const detected: DetectedPrefix[] = [];
  const [firstChar, secondChar] = word;

  if (firstChar === undefined) {
    return detected;
  }

  const firstCategory = categorizePrefix(firstChar);
  if (firstCategory !== null) {
    detected.push({ category: firstCategory, prefix: firstChar });

    // İkinci harfi kontrol et (eğer ilk harf bir prefix ise)
    if (word.length > 1 && secondChar !== undefined) {
      const secondCategory = categorizePrefix(secondChar);
      if (secondCategory !== null) {
        detected.push({ category: secondCategory, prefix: secondChar });
      }
    }
  }

  return detected;
}

/**
 * Kelimeden prefix'leri tespit eder
 */
export function detectPrefixes(word: string): readonly DetectedPrefix[] {
  if (word.length === 0) {
    return [];
  }

  // Önce belirlilik takısını kontrol et
  const definiteInfo = findDefiniteArticle(word);

  if (definiteInfo.found) {
    return detectPrefixesWithDefiniteArticle(word, definiteInfo.position);
  }

  // ال yoksa normal prefix tespiti
  return detectSimplePrefixes(word);
}

/**
 * Kelimede özel bir kelime var mı kontrol eder
 * Eğer varsa, o özel kelimeyi ve prefix kısmını döndürür
 */
function findSpecialWord(word: string): { found: boolean; prefix: string; specialWord: string } {
  for (const specialWord of SPECIAL_WORDS) {
    // Kelime tam olarak özel kelime mi?
    if (word === specialWord) {
      return { found: true, prefix: '', specialWord };
    }
    // Kelime özel kelime ile bitiyor mu? (prefix + özel kelime)
    if (word.endsWith(specialWord) && word.length > specialWord.length) {
      const prefix = word.slice(0, word.length - specialWord.length);
      // Prefix'in geçerli olup olmadığını kontrol et
      const [firstChar] = prefix;
      if (firstChar !== undefined && SINGLE_PREFIXES.includes(firstChar)) {
        return { found: true, prefix, specialWord };
      }
    }
  }
  return { found: false, prefix: '', specialWord: '' };
}

/**
 * Kelimeden tenvin ekini kaldırır (varsa)
 * Tenvin-i Nasb: kelime sonundaki ا
 * DİKKAT: Zamir ekleriyle biten kelimelerden tenvin kaldırılmaz
 */
function stripTenvinSuffix(word: string): { hasTenvin: boolean; word: string } {
  // Kelime ا ile bitiyorsa ve en az 3 karakter ise tenvin olabilir
  if (word.length >= 3 && word.endsWith(TENVIN_SUFFIX)) {
    // Zamir eki kontrolü - نا، ها، هم gibi sonlar tenvin DEĞİL
    const isPronounSuffix = PRONOUN_SUFFIX_ENDINGS.some((ending) => word.endsWith(ending));
    if (isPronounSuffix) {
      return { hasTenvin: false, word };
    }
    // Bazı kelimeler doğal olarak ا ile biter (kök harfi olarak)
    // Bu durumları ayırt etmek zor, bu yüzden basit bir yaklaşım kullanıyoruz
    return { hasTenvin: true, word: word.slice(0, -1) };
  }
  return { hasTenvin: false, word };
}

/**
 * Kelimeden olası taban kelimeyi çıkarır (prefix'leri ve tenvin'i kaldırarak)
 */
export function extractBaseWord(word: string): string {
  // Önce özel kelimeleri kontrol et (الله, اللهم gibi)
  const specialInfo = findSpecialWord(word);
  if (specialInfo.found) {
    return specialInfo.specialWord; // Özel kelimeyi parçalama, olduğu gibi döndür
  }

  // Tenvin kontrolü (belirsiz kelimeler için)
  // Not: ال ile başlayan kelimeler tenvin almaz
  let workingWord = word;
  if (!word.includes('ال')) {
    const tenvinResult = stripTenvinSuffix(word);
    workingWord = tenvinResult.word;
  }

  const definiteInfo = findDefiniteArticle(workingWord);

  if (definiteInfo.found) {
    // ال varsa, ال'dan sonrasını döndür
    if (workingWord.startsWith('لل')) {
      return workingWord.slice(2); // لل'dan sonrası
    }
    const alPosition = workingWord.indexOf('ال');
    if (alPosition !== -1) {
      return workingWord.slice(alPosition + 2); // ال'dan sonrası
    }
  }

  // Normal prefix kaldırma
  const prefixes = detectPrefixes(workingWord);

  // Her prefix'in uzunluğunu hesapla
  let totalLength = 0;
  for (const p of prefixes) {
    totalLength += p.prefix.length;
  }

  return workingWord.slice(totalLength);
}

/**
 * Huruf-u Mukattaa mı kontrol eder
 */
function isHurufMukattaa(word: string): boolean {
  return word === 'الم' || word === 'الر' || word === 'المص' || word === 'المر';
}

/**
 * Özel kelimeler için varyant üretir (الله gibi)
 * Bu kelimeler zaten ال içerdiğinden, ال'lı varyantlar üretilmez
 * Ayrıca ل + الله = لله şeklinde birleşme olur
 */
function generateSpecialWordVariants(specialWord: string): readonly string[] {
  const variants = new Set<string>();

  // Tam eşleşme
  variants.add(specialWord);

  // الله için özel durumlar
  if (specialWord === 'الله') {
    // Tek harfli prefix'ler (و، ف، ب، ت)
    variants.add('والله');   // و + الله
    variants.add('فالله');   // ف + الله
    variants.add('بالله');   // ب + الله
    variants.add('تالله');   // ت + الله (yemin)

    // ل + الله = لله (lam birleşir!)
    variants.add('لله');     // ل + الله

    // İkili kombinasyonlar
    variants.add('ولله');    // و + ل + الله
    variants.add('فلله');    // ف + ل + الله
    variants.add('وتالله');  // و + ت + الله
    variants.add('ابالله');  // أ + ب + الله (9:65 - "Allah ile mi?")

    // Hemze ile soru
    variants.add('ءالله');   // أ/ء + الله (2:140 ve 10:59)
  } else if (isHurufMukattaa(specialWord)) {
    // Huruf-u Mukattaa - genellikle tek başına kullanılır, varyant yok
    // Sadece kendisi döner
  } else if (specialWord === 'الياس' || specialWord === 'اليسع') {
    // Peygamber isimleri - و ile kullanılabilir
    variants.add(`و${specialWord}`);  // والياس, واليسع
  } else {
    // Diğer özel kelimeler (اللت, الايكه, اللهم) için sadece basit prefix'ler
    for (const prefix of ['و', 'ف']) {
      variants.add(prefix + specialWord);
    }
  }

  return [...variants];
}

/**
 * Taban kelimeden tüm olası varyantları üretir
 * Hem ال'sız hem ال'lı varyantları üretir
 * Ayrıca tenvin formlarını da üretir (sadece belirsiz kelimeler için)
 */
export function generateVariants(baseWord: string): readonly string[] {
  // Özel kelime kontrolü
  if (SPECIAL_WORDS.has(baseWord)) {
    return generateSpecialWordVariants(baseWord);
  }

  const variants = new Set<string>();

  // === ال'sız varyantlar ===
  // Tam eşleşme
  variants.add(baseWord);

  // Tenvin formu (sadece taban kelime için)
  // DİKKAT: Tenvin eklendiğinde zamir eki gibi görünen sonuçlar oluşmamalı
  // Örnek: رحمن + ا = رحمنا - YANLIŞ! (رحمنا = رحم + نا, fiil + zamir)
  const tenvinForm = baseWord + TENVIN_SUFFIX;
  const wouldCreatePronounSuffix = PRONOUN_SUFFIX_ENDINGS.some((ending) => tenvinForm.endsWith(ending));
  if (!wouldCreatePronounSuffix) {
    variants.add(tenvinForm);
  }

  // Tekli prefix'ler
  for (const prefix of SINGLE_PREFIXES) {
    variants.add(prefix + baseWord);
    // Tenvin ile prefix kombinasyonu (nadir ama mümkün)
    // Örnek: ورحيما - genellikle kullanılmaz, bu yüzden eklemiyor
  }

  // İkili prefix kombinasyonları
  for (const [first, second] of DOUBLE_PREFIX_COMBINATIONS) {
    variants.add(first + second + baseWord);
  }

  // === ال'lı varyantlar ===
  // Not: Belirli kelimeler tenvin almaz, bu yüzden sadece prefix ekliyoruz
  for (const prefix of DEFINITE_PREFIXES) {
    variants.add(prefix + baseWord);
  }

  return [...variants];
}

/** Minimum base word length for prefix stripping */
const MIN_BASE_WORD_LENGTH = 3;

/**
 * Bir kelimenin taban formunu ve olası varyantlarını döndürür
 */
export function analyzeWord(word: string): {
  baseWord: string;
  detectedPrefixes: readonly DetectedPrefix[];
  variants: readonly string[];
} {
  const trimmedWord = word.trim();
  if (trimmedWord.length === 0) {
    return { baseWord: '', detectedPrefixes: [], variants: [] };
  }

  const detectedPrefixes = detectPrefixes(trimmedWord);
  const baseWord = extractBaseWord(trimmedWord);

  // Eğer prefix kaldırma sonucu taban kelime çok kısa kalıyorsa,
  // orijinal kelimeyi kullan (prefix kaldırmayı atla)
  // Bu, "بسم" gibi kelimelerin yanlış ayrıştırılmasını önler
  let targetBase: string = trimmedWord;
  if (detectedPrefixes.length > 0 && baseWord.length >= MIN_BASE_WORD_LENGTH) {
    targetBase = baseWord;
  }

  const variants = generateVariants(targetBase);

  return {
    baseWord: targetBase,
    detectedPrefixes: targetBase === trimmedWord ? [] : detectedPrefixes,
    variants,
  };
}

/**
 * Varyant bilgisini döndürür (hangi kategoriye ait olduğu)
 */
export function getVariantInfo(word: string, baseWord: string): {
  category: GrammarCategory;
  prefix: string;
} {
  if (word === baseWord) {
    return { category: 'exact', prefix: '' };
  }

  // Tenvin kontrolü - kelime taban kelime + ا ise
  if (word === baseWord + TENVIN_SUFFIX) {
    return { category: 'exact', prefix: '' }; // Tenvin aynı kelime, sadece i'rab farkı
  }

  // Kelime baseWord ile bitmiyor olabilir (tenvin durumu)
  // Önce kelimeden tenvin'i kaldırıp kontrol edelim
  let effectiveWord = word;
  if (word.endsWith(TENVIN_SUFFIX) && !word.includes('ال')) {
    const withoutTenvin = word.slice(0, -1);
    if (withoutTenvin.endsWith(baseWord)) {
      effectiveWord = withoutTenvin;
    }
  }

  // Kelime baseWord ile bitmiyor olabilir
  if (!effectiveWord.endsWith(baseWord)) {
    return { category: 'exact', prefix: '' };
  }

  const prefixPart = effectiveWord.slice(0, effectiveWord.length - baseWord.length);

  // Önce ال kontrolü
  if (prefixPart.includes('ال') || prefixPart === 'لل' || prefixPart.endsWith('ل') && effectiveWord.includes('ال')) {
    return { category: 'definite', prefix: prefixPart };
  }

  // لل özel durumu (ل + ال)
  if (prefixPart === 'لل') {
    return { category: 'definite', prefix: prefixPart };
  }

  // ال ile biten prefix'ler
  if (prefixPart.endsWith('ال')) {
    return { category: 'definite', prefix: prefixPart };
  }

  const detectedPrefixes = detectPrefixes(`${prefixPart}x`); // x dummy char

  if (detectedPrefixes.length === 0) {
    return { category: 'exact', prefix: '' };
  }

  // İlk prefix'in kategorisini döndür
  const [firstPrefix] = detectedPrefixes;
  if (firstPrefix === undefined) {
    return { category: 'exact', prefix: '' };
  }

  return { category: firstPrefix.category, prefix: prefixPart };
}

/** Kategori isimlerini döndür */
export function getCategoryNames(category: GrammarCategory, locale: 'en' | 'tr'): string {
  if (category === 'exact') {
    return locale === 'tr' ? 'Tam Eşleşme' : 'Exact Match';
  }
  if (category === 'definite') {
    return locale === 'tr' ? DEFINITE_ARTICLE.nameTr : DEFINITE_ARTICLE.nameEn;
  }
  const definition = ARABIC_PREFIXES[category];
  return locale === 'tr' ? definition.nameTr : definition.nameEn;
}

/** Kategori için örnek harfleri döndür */
export function getCategoryLetters(category: GrammarCategory): readonly string[] {
  if (category === 'exact') {
    return [];
  }
  if (category === 'definite') {
    return DEFINITE_ARTICLE.letters;
  }
  return ARABIC_PREFIXES[category].letters;
}
