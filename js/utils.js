/**
 * DuoSpace Utilities & Helper functions
 */
const Utils = {
  createId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  },
  sanitizeText(value, maxLength = 500) {
    return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength);
  },
  lockCount: 0,
  lockScroll() {
    this.lockCount++;
    if (this.lockCount === 1) {
      document.body.classList.add('scroll-locked');
      const mainContainer = document.getElementById('mainScrollContainer');
      if (mainContainer) mainContainer.classList.add('scroll-locked');
    }
  },
  unlockScroll() {
    this.lockCount = Math.max(0, this.lockCount - 1);
    if (this.lockCount === 0) {
      document.body.classList.remove('scroll-locked');
      const mainContainer = document.getElementById('mainScrollContainer');
      if (mainContainer) mainContainer.classList.remove('scroll-locked');
    }
  },
  forceUnlockScroll() {
    this.lockCount = 0;
    document.body.classList.remove('scroll-locked');
    const mainContainer = document.getElementById('mainScrollContainer');
    if (mainContainer) mainContainer.classList.remove('scroll-locked');
  },
  notify(message, type = 'error') {
    const toast = document.getElementById('appToast');
    if (!toast) return alert(message);
    toast.textContent = message;
    toast.className = `fixed left-1/2 -translate-x-1/2 bottom-20 z-[60] max-w-[90%] rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add('hidden'), 4500);
  },
  /**
   * Format number as Vietnamese Currency (đ)
   * @param {number} amount
   * @returns {string}
   */
  formatCurrency(amount) {
    if (window.app?.data?.hideAmounts) return '***** đ';
    if (isNaN(amount) || amount === null || amount === undefined) return '0 đ';
    return Math.round(Number(amount)).toLocaleString('vi-VN') + ' đ';
  },

  /**
   * Format date to vi-VN locale string (dd/mm/yyyy)
   * @param {string|Date} date
   * @returns {string}
   */
  formatDate(date) {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  },

  /**
   * Format number based on locale
   * @param {number} number
   * @param {string} locale
   * @returns {string}
   */
  formatNumber(number, locale = 'vi-VN') {
    if (window.app?.data?.hideAmounts) return '*****';
    if (isNaN(number) || number === null) return '0';
    return Number(number).toLocaleString(locale);
  },

  /**
   * Format numeric input in real-time with thousand dot separators (.)
   * @param {HTMLInputElement} input
   */
  formatNumberInput(input) {
    if (!input) return;
    const originalValue = input.value;
    const rawValue = originalValue.replace(/\D/g, '');
    if (!rawValue) {
      input.value = '';
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('vi-VN');
    
    // Maintain cursor position relative to end of string
    const cursorOffsetFromEnd = originalValue.length - (input.selectionEnd || 0);
    input.value = formatted;
    const newCursor = Math.max(0, formatted.length - cursorOffsetFromEnd);
    input.setSelectionRange(newCursor, newCursor);
  },

  /**
   * Format a numeric price with Vietnamese thousand dot separators (.) and optional decimal comma (,)
   * @param {number|string} value
   * @returns {string}
   */
  formatPriceValue(value) {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'number' ? value : this.parseDecimalInput(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN', { maximumFractionDigits: 8 });
  },

  /**
   * Format numeric input with thousand dot separators (.) while allowing comma (,) decimals
   * @param {HTMLInputElement} input
   */
  formatDecimalInput(input) {
    if (!input) return;
    const originalValue = input.value;
    const cursorOffsetFromEnd = originalValue.length - (input.selectionEnd || 0);

    // Strip everything except digits and comma (dots are auto-inserted thousand separators)
    let cleaned = originalValue.replace(/[^\d,]/g, '');
    if (!cleaned) {
      input.value = '';
      return;
    }

    const commaIndex = cleaned.indexOf(',');
    let intPart = commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned;
    const decPart = commaIndex >= 0 ? cleaned.slice(commaIndex + 1).replace(/,/g, '') : null;

    // Remove redundant leading zeros (keep single '0' if decimal like 0,5)
    intPart = intPart.replace(/^0+(?=\d)/, '');
    if (!intPart && decPart !== null) intPart = '0';

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formatted = decPart !== null ? `${formattedInt},${decPart}` : formattedInt;

    input.value = formatted;
    const newCursor = Math.max(0, formatted.length - cursorOffsetFromEnd);
    try {
      input.setSelectionRange(newCursor, newCursor);
    } catch (_) {}
  },

  /**
   * Parse formatted Vietnamese price string (e.g. "130.000.000" or "3.651,95") to number
   * @param {string|number} value
   * @returns {number}
   */
  parseDecimalInput(value) {
    if (typeof value === 'number') return value;
    const str = String(value || '').trim().replace(/\s+/g, '');
    if (!str) return NaN;
    if (str.includes(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    const dotParts = str.split('.');
    if (dotParts.length === 2 && (dotParts[0] === '0' || dotParts[1].length !== 3)) {
      return parseFloat(str);
    }
    return parseFloat(str.replace(/\./g, ''));
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Download content as a file
   * @param {string} content
   * @param {string} filename
   * @param {string} type
   */
  downloadFile(content, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Global formatCurrency alias for compatibility
function formatCurrency(amount) {
  return Utils.formatCurrency(amount);
}
