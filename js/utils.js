/**
 * DuoSpace Utilities & Helper functions
 */
const Utils = {
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
  }
};

// Global formatCurrency alias for compatibility
function formatCurrency(amount) {
  return Utils.formatCurrency(amount);
}
