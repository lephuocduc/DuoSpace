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
    if (isNaN(amount) || amount === null || amount === undefined) return '0 đ';
    return Number(amount).toLocaleString('vi-VN') + ' đ';
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
