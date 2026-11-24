const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

function createMockElement(id, initial = {}) {
  const classes = new Set(initial.classes || []);
  return {
    id,
    value: initial.value ?? '',
    checked: initial.checked ?? false,
    innerText: initial.innerText ?? '',
    textContent: initial.textContent ?? '',
    innerHTML: initial.innerHTML ?? '',
    className: initial.className ?? '',
    options: initial.options ?? [],
    selectionEnd: initial.selectionEnd ?? 0,
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    scrollIntoView() { },
    querySelector() {
      return { classList: { add() { }, remove() { } } };
    },
    classList: {
      add(...cls) { cls.forEach(c => classes.add(c)); },
      remove(...cls) { cls.forEach(c => classes.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c);
          else classes.add(c);
        } else if (force) {
          classes.add(c);
        } else {
          classes.delete(c);
        }
      },
      contains(c) { return classes.has(c); }
    }
  };
}

function createSandbox(overrides = {}) {
  const elements = overrides.elements || {};
  const alerts = [];
  const storageMap = new Map();

  const document = {
    visibilityState: 'visible',
    addEventListener() { },
    body: { classList: { add() { }, remove() { } } },
    getElementById(id) {
      return Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null;
    },
    createElement() {
      return createMockElement('created');
    }
  };

  const localStorage = {
    getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
    setItem(k, v) { storageMap.set(k, String(v)); },
    removeItem(k) { storageMap.delete(k); },
    clear() { storageMap.clear(); }
  };

  const sandbox = {
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    RegExp,
    Error,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    document,
    localStorage,
    addEventListener() { },
    alert(msg) { alerts.push(msg); },
    confirm: overrides.confirm || (() => true),
    fetch: overrides.fetch || (async () => { throw new Error('Mock fetch not configured'); }),
    ...overrides.globals
  };

  sandbox.window = sandbox;
  sandbox._alerts = alerts;
  sandbox._elements = elements;

  const context = vm.createContext(sandbox);
  return context;
}

function loadScripts(context, relPaths) {
  for (const relPath of relPaths) {
    const absPath = path.join(ROOT, relPath);
    const code = fs.readFileSync(absPath, 'utf8');
    // Expose top-level const/class declarations on globalThis inside the sandbox
    const wrapped = `${code}\n;if (typeof Utils !== 'undefined') globalThis.Utils = Utils;\nif (typeof CONFIG !== 'undefined') globalThis.CONFIG = CONFIG;\nif (typeof PRICE_CONFIG !== 'undefined') globalThis.PRICE_CONFIG = PRICE_CONFIG;\nif (typeof PriceUpdater !== 'undefined') globalThis.PriceUpdater = PriceUpdater;\nif (typeof priceUpdater !== 'undefined') globalThis.priceUpdater = priceUpdater;\nif (typeof InvestmentModule !== 'undefined') globalThis.InvestmentModule = InvestmentModule;\nif (typeof MotorbikeModule !== 'undefined') globalThis.MotorbikeModule = MotorbikeModule;\nif (typeof CloudSync !== 'undefined') globalThis.CloudSync = CloudSync;\nif (typeof NotesModule !== 'undefined') globalThis.NotesModule = NotesModule;\nif (typeof Storage !== 'undefined') globalThis.Storage = Storage;\n`;
    vm.runInContext(wrapped, context, { filename: relPath });
  }
  return context;
}

module.exports = { createMockElement, createSandbox, loadScripts };
