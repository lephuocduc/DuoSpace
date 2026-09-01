/**
 * DuoSpace UI - Theme / Dark Mode Controller
 */
const ThemeManager = {
  init(app) {
    this.app = app;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.app.data.isDarkMode = mediaQuery.matches;
    this.applyDarkMode(this.app.data.isDarkMode);

    mediaQuery.addEventListener('change', (e) => {
      this.app.data.isDarkMode = e.matches;
      this.applyDarkMode(this.app.data.isDarkMode);
      if (this.app.charts) {
        this.app.charts.renderCatChart();
        this.app.charts.renderBudgetChart();
        this.app.charts.renderAssetAllocationChart();
      }
    });
  },

  applyDarkMode(isDark) {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
  }
};
