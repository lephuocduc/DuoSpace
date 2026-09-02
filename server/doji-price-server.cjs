const http = require('node:http');
const puppeteer = require('puppeteer');

const PORT = Number(process.env.DOJI_PORT) || 3001;
const DOJI_URL = 'https://banggia.doji.vn/gold-price';
const CACHE_MS = 5 * 60 * 1000;
let cachedResult = null;
let cachedAt = 0;
let pendingRequest = null;

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function getDojiGoldPrice() {
  if (cachedResult && Date.now() - cachedAt < CACHE_MS) return cachedResult;
  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(DOJI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('.td-product', { timeout: 15000 });

      const rows = await page.evaluate(() => Array.from(document.querySelectorAll('tr'))
        .map((tr) => ({
          stt: tr.querySelector('.td-stt')?.innerText.trim(),
          product: tr.querySelector('.td-product')?.innerText.trim(),
          buy: tr.querySelector('.td-buy')?.innerText.trim(),
          sell: tr.querySelector('.td-sell')?.innerText.trim(),
        }))
        .filter((row) => row.product && row.buy));

      const gold = rows.find((row) => {
        const product = normalize(row.product);
        return product.includes('nhan tron 9999') && product.includes('hung thinh vuong');
      }) || rows.find((row) => normalize(row.product).includes('nhan tron 9999')) || rows[0];

      if (!gold) throw new Error('Không tìm thấy dữ liệu vàng DOJI');
      cachedResult = gold;
      cachedAt = Date.now();
      return gold;
    } finally {
      await browser.close();
    }
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET' || req.url !== '/api/gold/doji') {
    res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const gold = await getDojiGoldPrice();
    res.writeHead(200).end(JSON.stringify({ results: [gold], source: 'banggia.doji.vn' }));
  } catch (error) {
    console.error('[DOJI scraper]', error);
    res.writeHead(502).end(JSON.stringify({ error: 'Không thể lấy bảng giá DOJI' }));
  }
}).listen(PORT, () => {
  console.log(`DOJI scraper running at http://127.0.0.1:${PORT}/api/gold/doji`);
});
