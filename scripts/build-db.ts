/**
 * Build SQLite database from words.json and letters.json
 *
 * Usage: npx tsx scripts/build-db.ts
 *
 * Reads the JSON data files and creates an optimized SQLite database
 * at data/qurandb.sqlite with proper indexes for fast querying.
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const DB_PATH = resolve(DATA_DIR, 'qurandb.sqlite');
const WORDS_PATH = resolve(DATA_DIR, 'words.json');
const LETTERS_PATH = resolve(DATA_DIR, 'letters.json');

// ── Surah Names ──────────────────────────────────────────────────────────

const SURAH_NAMES_AR: Record<number, string> = {
  1:'الفاتحة',2:'البقرة',3:'آل عمران',4:'النساء',5:'المائدة',6:'الأنعام',7:'الأعراف',8:'الأنفال',9:'التوبة',10:'يونس',11:'هود',12:'يوسف',13:'الرعد',14:'إبراهيم',15:'الحجر',16:'النحل',17:'الإسراء',18:'الكهف',19:'مريم',20:'طه',21:'الأنبياء',22:'الحج',23:'المؤمنون',24:'النور',25:'الفرقان',26:'الشعراء',27:'النمل',28:'القصص',29:'العنكبوت',30:'الروم',31:'لقمان',32:'السجدة',33:'الأحزاب',34:'سبأ',35:'فاطر',36:'يس',37:'الصافات',38:'ص',39:'الزمر',40:'غافر',41:'فصلت',42:'الشورى',43:'الزخرف',44:'الدخان',45:'الجاثية',46:'الأحقاف',47:'محمد',48:'الفتح',49:'الحجرات',50:'ق',51:'الذاريات',52:'الطور',53:'النجم',54:'القمر',55:'الرحمن',56:'الواقعة',57:'الحديد',58:'المجادلة',59:'الحشر',60:'الممتحنة',61:'الصف',62:'الجمعة',63:'المنافقون',64:'التغابن',65:'الطلاق',66:'التحريم',67:'الملك',68:'القلم',69:'الحاقة',70:'المعارج',71:'نوح',72:'الجن',73:'المزمل',74:'المدثر',75:'القيامة',76:'الإنسان',77:'المرسلات',78:'النبأ',79:'النازعات',80:'عبس',81:'التكوير',82:'الانفطار',83:'المطففين',84:'الانشقاق',85:'البروج',86:'الطارق',87:'الأعلى',88:'الغاشية',89:'الفجر',90:'البلد',91:'الشمس',92:'الليل',93:'الضحى',94:'الشرح',95:'التين',96:'العلق',97:'القدر',98:'البينة',99:'الزلزلة',100:'العاديات',101:'القارعة',102:'التكاثر',103:'العصر',104:'الهمزة',105:'الفيل',106:'قريش',107:'الماعون',108:'الكوثر',109:'الكافرون',110:'النصر',111:'المسد',112:'الإخلاص',113:'الفلق',114:'الناس',
};

const SURAH_NAMES_TR: Record<number, string> = {
  1:'Fatiha',2:'Bakara',3:'Al-i İmran',4:'Nisa',5:'Maide',6:'Enam',7:'Araf',8:'Enfal',9:'Tevbe',10:'Yunus',11:'Hud',12:'Yusuf',13:'Rad',14:'İbrahim',15:'Hicr',16:'Nahl',17:'İsra',18:'Kehf',19:'Meryem',20:'Taha',21:'Enbiya',22:'Hac',23:'Müminun',24:'Nur',25:'Furkan',26:'Şuara',27:'Neml',28:'Kasas',29:'Ankebut',30:'Rum',31:'Lokman',32:'Secde',33:'Ahzab',34:'Sebe',35:'Fatır',36:'Yasin',37:'Saffat',38:'Sad',39:'Zümer',40:'Mümin',41:'Fussilet',42:'Şura',43:'Zuhruf',44:'Duhan',45:'Casiye',46:'Ahkaf',47:'Muhammed',48:'Fetih',49:'Hucurat',50:'Kaf',51:'Zariyat',52:'Tur',53:'Necm',54:'Kamer',55:'Rahman',56:'Vakia',57:'Hadid',58:'Mücadele',59:'Haşr',60:'Mümtehine',61:'Saf',62:'Cuma',63:'Münafikun',64:'Tegabun',65:'Talak',66:'Tahrim',67:'Mülk',68:'Kalem',69:'Hakka',70:'Mearic',71:'Nuh',72:'Cin',73:'Müzzemmil',74:'Müddessir',75:'Kıyamet',76:'İnsan',77:'Mürselat',78:'Nebe',79:'Naziat',80:'Abese',81:'Tekvir',82:'İnfitar',83:'Mutaffifin',84:'İnşikak',85:'Buruc',86:'Tarık',87:'Ala',88:'Gaşiye',89:'Fecr',90:'Beled',91:'Şems',92:'Leyl',93:'Duha',94:'İnşirah',95:'Tin',96:'Alak',97:'Kadir',98:'Beyyine',99:'Zilzal',100:'Adiyat',101:'Karia',102:'Tekasür',103:'Asr',104:'Hümeze',105:'Fil',106:'Kureyş',107:'Maun',108:'Kevser',109:'Kafirun',110:'Nasr',111:'Tebbet',112:'İhlas',113:'Felak',114:'Nas',
};

const SURAH_NAMES_EN: Record<number, string> = {
  1:'Al-Fatiha',2:'Al-Baqarah',3:'Ali Imran',4:'An-Nisa',5:'Al-Maidah',6:'Al-Anam',7:'Al-Araf',8:'Al-Anfal',9:'At-Tawbah',10:'Yunus',11:'Hud',12:'Yusuf',13:'Ar-Rad',14:'Ibrahim',15:'Al-Hijr',16:'An-Nahl',17:'Al-Isra',18:'Al-Kahf',19:'Maryam',20:'Ta-Ha',21:'Al-Anbiya',22:'Al-Hajj',23:'Al-Muminun',24:'An-Nur',25:'Al-Furqan',26:'Ash-Shuara',27:'An-Naml',28:'Al-Qasas',29:'Al-Ankabut',30:'Ar-Rum',31:'Luqman',32:'As-Sajdah',33:'Al-Ahzab',34:'Saba',35:'Fatir',36:'Ya-Sin',37:'As-Saffat',38:'Sad',39:'Az-Zumar',40:'Ghafir',41:'Fussilat',42:'Ash-Shura',43:'Az-Zukhruf',44:'Ad-Dukhan',45:'Al-Jathiyah',46:'Al-Ahqaf',47:'Muhammad',48:'Al-Fath',49:'Al-Hujurat',50:'Qaf',51:'Adh-Dhariyat',52:'At-Tur',53:'An-Najm',54:'Al-Qamar',55:'Ar-Rahman',56:'Al-Waqiah',57:'Al-Hadid',58:'Al-Mujadilah',59:'Al-Hashr',60:'Al-Mumtahanah',61:'As-Saf',62:'Al-Jumuah',63:'Al-Munafiqun',64:'At-Taghabun',65:'At-Talaq',66:'At-Tahrim',67:'Al-Mulk',68:'Al-Qalam',69:'Al-Haqqah',70:'Al-Maarij',71:'Nuh',72:'Al-Jinn',73:'Al-Muzzammil',74:'Al-Muddaththir',75:'Al-Qiyamah',76:'Al-Insan',77:'Al-Mursalat',78:'An-Naba',79:'An-Naziat',80:'Abasa',81:'At-Takwir',82:'Al-Infitar',83:'Al-Mutaffifin',84:'Al-Inshiqaq',85:'Al-Buruj',86:'At-Tariq',87:'Al-Ala',88:'Al-Ghashiyah',89:'Al-Fajr',90:'Al-Balad',91:'Ash-Shams',92:'Al-Layl',93:'Ad-Duha',94:'Ash-Sharh',95:'At-Tin',96:'Al-Alaq',97:'Al-Qadr',98:'Al-Bayyinah',99:'Az-Zalzalah',100:'Al-Adiyat',101:'Al-Qariah',102:'At-Takathur',103:'Al-Asr',104:'Al-Humazah',105:'Al-Fil',106:'Quraysh',107:'Al-Maun',108:'Al-Kawthar',109:'Al-Kafirun',110:'An-Nasr',111:'Al-Masad',112:'Al-Ikhlas',113:'Al-Falaq',114:'An-Nas',
};

// ── Types for JSON data ──────────────────────────────────────────────────

interface WordRow {
  word_id: string;
  surah_no: number;
  ayah_no: number;
  word_text: string;
  total_abjad: number;
  order_in_ayah: number;
  order_in_surah: number;
  global_order_asc: number;
  global_order_desc: number;
  root: string | null;
  lemma: string | null;
  pos_tag: string | null;
}

interface LetterRow {
  letter_char: string;
  abjad_value: number;
  word_id: string;
  surah_no: number;
  ayah_no: number;
  position_in_word: number;
  global_order_asc: number;
}

// ── Main Build ───────────────────────────────────────────────────────────

function main(): void {
  console.error('Building QuranDB SQLite database...');
  console.error(`  Words:   ${WORDS_PATH}`);
  console.error(`  Letters: ${LETTERS_PATH}`);
  console.error(`  Output:  ${DB_PATH}`);

  // Validate input files exist
  if (!existsSync(WORDS_PATH)) {
    console.error(`ERROR: words.json not found at ${WORDS_PATH}`);
    process.exit(1);
  }
  if (!existsSync(LETTERS_PATH)) {
    console.error(`ERROR: letters.json not found at ${LETTERS_PATH}`);
    process.exit(1);
  }

  // Remove existing database
  if (existsSync(DB_PATH)) {
    console.error('  Removing existing database...');
    unlinkSync(DB_PATH);
  }

  // Read JSON data
  console.error('  Reading words.json...');
  const words: WordRow[] = JSON.parse(readFileSync(WORDS_PATH, 'utf-8')) as WordRow[];
  console.error(`  Read ${words.length} words`);

  console.error('  Reading letters.json...');
  const letters: LetterRow[] = JSON.parse(readFileSync(LETTERS_PATH, 'utf-8')) as LetterRow[];
  console.error(`  Read ${letters.length} letters`);

  // Create database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');

  // Create tables
  console.error('  Creating tables...');

  db.exec(`
    CREATE TABLE words (
      word_id TEXT PRIMARY KEY,
      surah_no INTEGER NOT NULL,
      ayah_no INTEGER NOT NULL,
      order_in_ayah INTEGER NOT NULL,
      order_in_surah INTEGER NOT NULL,
      word_text TEXT NOT NULL,
      total_abjad INTEGER NOT NULL,
      pos_tag TEXT,
      root TEXT,
      lemma TEXT,
      global_order_asc INTEGER NOT NULL,
      global_order_desc INTEGER NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE letters (
      letter_char TEXT NOT NULL,
      abjad_value INTEGER NOT NULL,
      word_id TEXT NOT NULL,
      surah_no INTEGER NOT NULL,
      ayah_no INTEGER NOT NULL,
      position_in_word INTEGER NOT NULL,
      global_order_asc INTEGER NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE surahs (
      surah_no INTEGER PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_tr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      ayah_count INTEGER NOT NULL,
      word_count INTEGER NOT NULL,
      letter_count INTEGER NOT NULL
    );
  `);

  // Insert words
  console.error('  Inserting words...');
  const insertWord = db.prepare(`
    INSERT INTO words (word_id, surah_no, ayah_no, order_in_ayah, order_in_surah, word_text, total_abjad, pos_tag, root, lemma, global_order_asc, global_order_desc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertWordsTransaction = db.transaction((rows: WordRow[]) => {
    for (const w of rows) {
      insertWord.run(
        w.word_id, w.surah_no, w.ayah_no, w.order_in_ayah, w.order_in_surah,
        w.word_text, w.total_abjad, w.pos_tag, w.root, w.lemma,
        w.global_order_asc, w.global_order_desc
      );
    }
  });
  insertWordsTransaction(words);
  console.error(`  Inserted ${words.length} words`);

  // Insert letters
  console.error('  Inserting letters...');
  const insertLetter = db.prepare(`
    INSERT INTO letters (letter_char, abjad_value, word_id, surah_no, ayah_no, position_in_word, global_order_asc)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLettersTransaction = db.transaction((rows: LetterRow[]) => {
    for (const l of rows) {
      insertLetter.run(
        l.letter_char, l.abjad_value, l.word_id, l.surah_no, l.ayah_no,
        l.position_in_word, l.global_order_asc
      );
    }
  });
  insertLettersTransaction(letters);
  console.error(`  Inserted ${letters.length} letters`);

  // Aggregate surahs from words + letters (only ayah_no > 0)
  console.error('  Aggregating surah data...');

  const surahWordStats = new Map<number, { maxAyah: number; wordCount: number }>();
  for (const w of words) {
    if (w.ayah_no > 0) {
      const existing = surahWordStats.get(w.surah_no);
      if (existing !== undefined) {
        existing.maxAyah = Math.max(existing.maxAyah, w.ayah_no);
        existing.wordCount += 1;
      } else {
        surahWordStats.set(w.surah_no, { maxAyah: w.ayah_no, wordCount: 1 });
      }
    }
  }

  const surahLetterCounts = new Map<number, number>();
  for (const l of letters) {
    if (l.ayah_no > 0) {
      const existing = surahLetterCounts.get(l.surah_no);
      surahLetterCounts.set(l.surah_no, (existing ?? 0) + 1);
    }
  }

  const insertSurah = db.prepare(`
    INSERT INTO surahs (surah_no, name_ar, name_tr, name_en, ayah_count, word_count, letter_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSurahsTransaction = db.transaction(() => {
    for (let i = 1; i <= 114; i++) {
      const wordStats = surahWordStats.get(i);
      const letterCount = surahLetterCounts.get(i) ?? 0;
      const nameAr = SURAH_NAMES_AR[i] ?? '';
      const nameTr = SURAH_NAMES_TR[i] ?? '';
      const nameEn = SURAH_NAMES_EN[i] ?? '';

      insertSurah.run(
        i,
        nameAr,
        nameTr,
        nameEn,
        wordStats?.maxAyah ?? 0,
        wordStats?.wordCount ?? 0,
        letterCount
      );
    }
  });
  insertSurahsTransaction();
  console.error('  Inserted 114 surahs');

  // Create indexes
  console.error('  Creating indexes...');
  db.exec('CREATE INDEX idx_words_surah ON words(surah_no, ayah_no)');
  db.exec('CREATE INDEX idx_words_text ON words(word_text)');
  db.exec('CREATE INDEX idx_words_root ON words(root)');
  db.exec('CREATE INDEX idx_words_lemma ON words(lemma)');
  db.exec('CREATE INDEX idx_words_abjad ON words(total_abjad)');
  db.exec('CREATE INDEX idx_words_global ON words(global_order_asc)');
  db.exec('CREATE INDEX idx_letters_surah ON letters(surah_no, ayah_no)');
  db.exec('CREATE INDEX idx_letters_char ON letters(letter_char)');
  db.exec('CREATE INDEX idx_letters_word ON letters(word_id)');
  console.error('  Created 9 indexes');

  // Switch to DELETE journal mode and vacuum for distribution
  console.error('  Optimizing database...');
  db.pragma('journal_mode = DELETE');
  db.exec('VACUUM');

  // Verify counts
  const wordCount = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
  const letterCount = (db.prepare('SELECT COUNT(*) as count FROM letters').get() as { count: number }).count;
  const surahCount = (db.prepare('SELECT COUNT(*) as count FROM surahs').get() as { count: number }).count;

  console.error('');
  console.error('  Verification:');
  console.error(`    Words:   ${wordCount} ${wordCount === 77851 ? 'OK' : 'FAIL - EXPECTED 77851'}`);
  console.error(`    Letters: ${letterCount} ${letterCount === 324646 ? 'OK' : 'FAIL - EXPECTED 324646'}`);
  console.error(`    Surahs:  ${surahCount} ${surahCount === 114 ? 'OK' : 'FAIL - EXPECTED 114'}`);

  db.close();

  if (wordCount !== 77851 || letterCount !== 324646 || surahCount !== 114) {
    console.error('\nERROR: Count verification failed!');
    process.exit(1);
  }

  console.error('\nDatabase built successfully!');
}

main();
