const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadScripts } = require('./helpers/loadScript');

function setupUtils() {
  const ctx = createSandbox();
  loadScripts(ctx, ['js/utils.js']);
  return ctx;
}

test('Utils.parseDecimalInput handles Vietnamese thousand separators and comma decimals', () => {
  const { Utils } = setupUtils();
  assert.equal(Utils.parseDecimalInput('13.000.000'), 13000000);
  assert.equal(Utils.parseDecimalInput('130.000.000'), 130000000);
  assert.equal(Utils.parseDecimalInput('3.651,95'), 3651.95);
  assert.equal(Utils.parseDecimalInput('0,5'), 0.5);
  assert.equal(Utils.parseDecimalInput('0.25'), 0.25);
  assert.equal(Utils.parseDecimalInput(42.5), 42.5);
  assert.ok(Number.isNaN(Utils.parseDecimalInput('')));
});

test('Utils.formatPriceValue formats numbers with vi-VN thousand dots', () => {
  const { Utils } = setupUtils();
  assert.equal(Utils.formatPriceValue(13000000), '13.000.000');
  assert.equal(Utils.formatPriceValue(1339000), '1.339.000');
  assert.equal(Utils.formatPriceValue(''), '');
  assert.equal(Utils.formatPriceValue(null), '');
});

test('Utils.formatDecimalInput formats input value in-place and preserves decimal comma', () => {
  const { Utils } = setupUtils();
  const input = {
    value: '13000000',
    selectionEnd: 8,
    setSelectionRange(s, e) { this.selectionStart = s; this.selectionEnd = e; }
  };
  Utils.formatDecimalInput(input);
  assert.equal(input.value, '13.000.000');

  const decInput = {
    value: '3651,95',
    selectionEnd: 7,
    setSelectionRange(s, e) { this.selectionStart = s; this.selectionEnd = e; }
  };
  Utils.formatDecimalInput(decInput);
  assert.equal(decInput.value, '3.651,95');
});

test('Utils.formatCurrency formats VND and respects hideAmounts flag', () => {
  const ctx = setupUtils();
  assert.equal(ctx.Utils.formatCurrency(1500000), '1.500.000 đ');
  assert.equal(ctx.Utils.formatCurrency(null), '0 đ');

  ctx.app = { data: { hideAmounts: true } };
  assert.equal(ctx.Utils.formatCurrency(1500000), '***** đ');
});

test('Utils.escapeHtml and sanitizeText neutralize HTML characters', () => {
  const { Utils } = setupUtils();
  assert.equal(Utils.escapeHtml('<script>"test"</script>'), '&lt;script&gt;&quot;test&quot;&lt;/script&gt;');
  assert.equal(Utils.sanitizeText('  <b>Vàng</b>  '), 'bVàng/b');
});
