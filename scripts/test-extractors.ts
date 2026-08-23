import { extractArticleFromUrl } from '../src/services/extractor';

interface TestCase {
  category: string;
  name: string;
  url: string;
}

const TEST_URLS: TestCase[] = [
  // --- Fiction & Web Serials ---
  {
    category: 'Fiction',
    name: 'Mother of Learning (Ch. 1)',
    url: 'https://www.royalroad.com/fiction/21220/mother-of-learning/chapter/301778/1-good-morning-brother'
  },
  {
    category: 'Fiction',
    name: 'The Hundred Reigns',
    url: 'https://www.royalroad.com/fiction/139212/the-hundred-reigns-timeloop-litrpg/chapter/3843984/chapter-208-the-world-of-ruins-2'
  },
  {
    category: 'Fiction',
    name: 'William Oh (Macronomicon)',
    url: 'https://www.royalroad.com/fiction/92144/the-legend-of-william-oh/chapter/3843436/chapter-313-how-did-we-get-here'
  },

  // --- Tech & Engineering Blogs ---
  {
    category: 'Deep Dive',
    name: 'Ciechanowski (GPS)',
    url: 'https://ciechanow.ski/gps/'
  },
  {
    category: 'Tech Blog',
    name: 'Julia Evans (SQLite)',
    url: 'https://jvns.ca/blog/2026/07/17/learning-about-running-sqlite/'
  },
  {
    category: 'Tech Blog',
    name: 'Dan Luu (Latency)',
    url: 'https://danluu.com/keyboard-latency/'
  },
  {
    category: 'Tech Blog',
    name: 'Simon Willison Log',
    url: 'https://simonwillison.net/2023/Aug/6/annotated-presentations/'
  },

  // --- Essays & Long-Form ---
  {
    category: 'Essay / Blog',
    name: 'Paul Graham Essay',
    url: 'https://paulgraham.com/lesson.html'
  },

  // --- International News ---
  {
    category: 'News',
    name: 'The Guardian',
    url: 'https://www.theguardian.com/us-news/2026/aug/20/liberia-deportation-agreement'
  },
  {
    category: 'News',
    name: 'NPR News',
    url: 'https://www.npr.org/2026/08/23/nx-s1-5942292/thousands-in-northwest-indiana-still-without-power-nearly-two-weeks-after-storm'
  },
  {
    category: 'Tech News',
    name: 'Ars Technica',
    url: 'https://arstechnica.com/space/2026/08/due-to-need-for-absolute-success-china-delays-critical-moon-launch-to-2027/'
  },

  // --- Hebrew / RTL News ---
  {
    category: 'Hebrew News',
    name: 'Ynet (News)',
    url: 'https://www.ynet.co.il/news/article/rksbeuddze'
  },
  {
    category: 'Hebrew News',
    name: 'Calcalist (Economics)',
    url: 'https://www.calcalist.co.il/article/rjr9np3rmg'
  },

  // --- Reference & Encyclopedias ---
  {
    category: 'Encyclopedia',
    name: 'Wikipedia (Ebook)',
    url: 'https://en.wikipedia.org/wiki/Ebook'
  },
  {
    category: 'Encyclopedia',
    name: 'Wikipedia (E-reader)',
    url: 'https://en.wikipedia.org/wiki/E-reader'
  },
  {
    category: 'RTL (Hebrew)',
    name: 'Hebrew Wiki (ספר אלקטרוני)',
    url: 'https://he.wikipedia.org/wiki/%D7%A1%D7%A4%D7%A8_%D7%90%D7%9C%D7%A7%D7%98%D7%A8%D7%95%D7%A0%D7%99'
  }
];

async function runTests() {
  console.log('\n🚀 Starting Wallaflare Automated Extraction Benchmark...\n');
  console.log('='.repeat(116));
  console.log(
    '| %s | %s | %s | %s | %s | %s |',
    'Category'.padEnd(14),
    'Source Name'.padEnd(30),
    'Author'.padEnd(26),
    'Words'.padStart(7),
    'Lang'.padStart(4),
    'Time (ms)'.padStart(9)
  );
  console.log('='.repeat(116));

  let passed = 0;
  let failed = 0;

  for (const test of TEST_URLS) {
    const start = Date.now();
    try {
      const article = await extractArticleFromUrl(test.url);
      const duration = Date.now() - start;

      const words = article.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      const author = (article.byline || 'Unknown').substring(0, 26);
      const lang = article.language || 'en';

      const isValid = article.title.length > 0 && words > 50;

      if (isValid) {
        passed++;
        console.log(
          '| \x1b[36m%s\x1b[0m | \x1b[32m%s\x1b[0m | %s | \x1b[33m%s\x1b[0m | %s | %s ms |',
          test.category.padEnd(14),
          test.name.padEnd(30),
          author.padEnd(26),
          String(words).padStart(7),
          lang.padStart(4),
          String(duration).padStart(5)
        );
      } else {
        failed++;
        console.log(
          '| %s | \x1b[31m%s (INVALID CONTENT)\x1b[0m | %s | %s | %s | %s ms |',
          test.category.padEnd(14),
          test.name.padEnd(30),
          author.padEnd(26),
          String(words).padStart(7),
          lang.padStart(4),
          String(duration).padStart(5)
        );
      }
    } catch (err: any) {
      failed++;
      const duration = Date.now() - start;
      console.log(
        '| %s | \x1b[31m%s (ERROR: %s)\x1b[0m | %s | %s | %s | %s ms |',
        test.category.padEnd(14),
        test.name.padEnd(30),
        (err.message || 'unknown').substring(0, 26),
        '-'.padStart(7),
        '-'.padStart(4),
        String(duration).padStart(5)
      );
    }
  }

  console.log('='.repeat(116));
  console.log(`\n📊 Benchmark Results: ${passed} passed, ${failed} failed out of ${TEST_URLS.length} tests.\n`);
}

runTests().catch(console.error);
