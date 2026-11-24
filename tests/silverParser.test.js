const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadWorker() {
  const workerUrl = pathToFileURL(path.resolve(__dirname, '..', 'cloudflare-d1', 'worker.js')).href;
  return import(workerUrl);
}

test('parseDojiSilverTable extracts BẠC DOJI 99.9 - 1 LƯỢNG in VND/lượng', async () => {
  const { parseDojiSilverTable } = await loadWorker();
  const sampleRows = [
    { type: 'G', materialCode: '1', materialName: 'AVPL/SJC', priceDojiBuyIn: 130000, priceDojiSellOut: 135000 },
    { type: 'S', materialCode: '14', materialName: 'BẠC DOJI 99.9 - 1 LƯỢNG', priceDojiBuyIn: 1541, priceDojiSellOut: 1606, updateDate: '2026-11-24T09:08:00Z' },
    { type: 'S', materialCode: '15', materialName: 'BẠC DOJI 99.9 - 5 LƯỢNG', priceDojiBuyIn: 7705, priceDojiSellOut: 8030 }
  ];

  const result = parseDojiSilverTable(sampleRows);
  assert.deepEqual(result, {
    product: 'BẠC DOJI 99.9 - 1 LƯỢNG',
    unit: 'lượng',
    buy: 1541000,
    sell: 1606000,
    updatedAt: '2026-11-24T09:08:00Z'
  });
});

test('parseVnSilverHtml parses Phu Quy 1 lượng row and ignores 1kg row', async () => {
  const { parseVnSilverHtml } = await loadWorker();
  const sampleHtml = `
    <table>
      <tr>
        <td>B&#x1EA0;C TH&#x1ECE;I PH&#xDA; QU&#xDD; 999 1KILO</td>
        <td>VN&#x110;/KG</td>
        <td>35,706,577</td>
        <td>36,799,908</td>
      </tr>
      <tr>
        <td>B&#x1EA0;C MI&#x1EBE;NG PH&#xDA; QU&#xDD; 999 1 L&#x1AF;&#x1EE2;NG</td>
        <td>VN&#x110;/ L&#x1AF;&#x1EE2;NG</td>
        <td>1,339,000</td>
        <td>1,380,000</td>
      </tr>
    </table>
  `;

  const result = parseVnSilverHtml(sampleHtml);
  assert.deepEqual(result, {
    product: 'BẠC MIẾNG PHÚ QUÝ 999 1 LƯỢNG',
    unit: 'lượng',
    buy: 1339000,
    sell: 1380000
  });
});

test('parseVnSilverHtml returns null when HTML has no valid tael silver row', async () => {
  const { parseVnSilverHtml } = await loadWorker();
  assert.equal(parseVnSilverHtml('<html><body>No table</body></html>'), null);
  assert.equal(parseVnSilverHtml(''), null);
});
