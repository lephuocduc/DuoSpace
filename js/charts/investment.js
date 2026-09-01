/**
 * DuoSpace Charts - Investment Asset Allocation Donut Chart
 */
class InvestmentChart {
  constructor() {
    this.chart = null;
  }

  render(investments, usdRate, isDark) {
    const ctx = document.getElementById('assetAllocationChart');
    if (!ctx) return;

    const list = investments || [];
    if (list.length === 0) {
      this.destroy();
      return;
    }

    const categoryTotals = {};
    list.forEach(item => {
      const cat = item.type || '💼 Khác';
      const cPrice = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
      const value = item.isUsd ? (item.quantity * cPrice * usdRate) : (item.quantity * cPrice);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + value;
    });

    Object.keys(categoryTotals).forEach(key => {
      if (categoryTotals[key] <= 0) delete categoryTotals[key];
    });

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    this.destroy();

    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#64748b'],
          borderWidth: 2,
          borderColor: isDark ? '#0f172a' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 10 },
              boxWidth: 12
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
