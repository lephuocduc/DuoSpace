/**
 * DuoSpace Charts - Cat Weight Trend Chart (Cats Tab)
 */
class WeightChart {
  constructor() {
    this.chart = null;
  }

  render(catWeights, isDark) {
    const ctx = document.getElementById('weightChart');
    if (!ctx) return;

    const sorted = [...(catWeights || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sorted.map(w => {
      const d = new Date(w.date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    const munData = sorted.map(w => w.mun);
    const bongData = sorted.map(w => w.bong);

    this.destroy();

    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Mun (kg)',
            data: munData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 4
          },
          {
            label: 'Bông (kg)',
            data: bongData,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 2,
            max: 7,
            grid: { color: isDark ? '#334155' : '#f1f5f9' },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10 } }
          }
        }
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
