/**
 * DuoSpace Charts - Investment Asset Allocation Donut Chart & Net Worth Line Chart
 */
class InvestmentChart {
  constructor() {
    this.allocationChart = null;
    this.netWorthChart = null;
  }

  render(investments, usdRate, isDark, cashSurplus = 0) {
    this.renderAssetAllocation(investments, usdRate, isDark, cashSurplus);
  }

  renderAssetAllocation(investments, usdRate, isDark, cashSurplus = 0) {
    const ctx = document.getElementById('assetAllocationChart');
    if (!ctx) return;

    const list = investments || [];
    if (list.length === 0 && cashSurplus <= 0) {
      this.destroyAllocation();
      return;
    }

    const categoryTotals = {};
    list.forEach(item => {
      const cat = item.name || item.type || '💼 Khác';
      const cPrice = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
      const value = item.isUsd ? (item.quantity * cPrice * usdRate) : (item.quantity * cPrice);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + value;
    });

    Object.keys(categoryTotals).forEach(key => {
      if (categoryTotals[key] <= 0) delete categoryTotals[key];
    });

    // Thêm tiền dư thu chi vào biểu đồ phân bổ nếu > 0
    if (cashSurplus > 0) {
      categoryTotals['💵 Tiền dư VNĐ'] = cashSurplus;
    }

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    // Màu cuối cùng luôn dành cho Tiền dư VNĐ
    const backgroundColors = [
      '#6366f1', '#3b82f6', '#f59e0b', '#10b981',
      '#ec4899', '#8b5cf6', '#06b6d4', '#64748b',
      '#22c55e'  // xanh lá cho tiền dư VNĐ nếu là phần tử cuối
    ];

    this.destroyAllocation();

    this.allocationChart = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: backgroundColors.slice(0, labels.length),
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
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                const formatted = val >= 1000000
                  ? (val / 1000000).toFixed(1) + ' Tr đ'
                  : val.toLocaleString('vi-VN') + ' đ';
                return ` ${context.label}: ${formatted} (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  renderNetWorth(history, isDark) {
    const ctx = document.getElementById('netWorthLineChart');
    if (!ctx) return;

    const list = (history || []).slice(-14); // 14 mốc gần nhất
    if (list.length === 0) {
      this.destroyNetWorth();
      return;
    }

    const labels = list.map(item => {
      const parts = item.date.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
    });
    const dataValues = list.map(item => Math.round(item.value / 1000000 * 100) / 100); // Đơn vị: triệu VNĐ

    this.destroyNetWorth();

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(1, isDark ? 'rgba(99, 102, 241, 0.0)' : 'rgba(99, 102, 241, 0.0)');

    this.netWorthChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tổng tài sản (Triệu VNĐ)',
          data: dataValues,
          borderColor: '#6366f1',
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.parsed.y.toLocaleString('vi-VN')} Tr VNĐ (${(context.parsed.y * 1000000).toLocaleString('vi-VN')} đ)`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? '#94a3b8' : '#94a3b8',
              font: { size: 9 }
            }
          },
          y: {
            grid: {
              color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.8)'
            },
            ticks: {
              color: isDark ? '#94a3b8' : '#94a3b8',
              font: { size: 9 },
              callback: (v) => `${v}Tr`
            }
          }
        }
      }
    });
  }

  destroyAllocation() {
    if (this.allocationChart) {
      this.allocationChart.destroy();
      this.allocationChart = null;
    }
  }

  destroyNetWorth() {
    if (this.netWorthChart) {
      this.netWorthChart.destroy();
      this.netWorthChart = null;
    }
  }

  destroy() {
    this.destroyAllocation();
    this.destroyNetWorth();
  }
}
