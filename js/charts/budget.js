/**
 * DuoSpace Charts - Budget Comparison Chart (Home Tab)
 */
class BudgetChart {
  constructor() {
    this.chart = null;
  }

  render(data, isDark) {
    const ctx = document.getElementById('budgetComparisonChart');
    if (!ctx) return;

    const labels = (data.monthlyBudgets || []).map(b => b.month);
    const incomes = (data.monthlyBudgets || []).map(b => b.budget);
    const expenses = (data.monthlyBudgets || []).map(b => b.spent);

    if (incomes.length > 0 && expenses.length > 0) {
      incomes[incomes.length - 1] = (data.incomes || []).reduce((sum, i) => sum + i.amount, 0);
      expenses[expenses.length - 1] = (data.expenses || []).reduce((sum, e) => sum + e.amount, 0);
    }

    this.destroy();

    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Tổng Thu',
            data: incomes,
            backgroundColor: isDark ? '#10b981' : '#059669',
            borderRadius: 6
          },
          {
            label: 'Tổng Chi',
            data: expenses,
            backgroundColor: isDark ? '#f43f5e' : '#e11d48',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 10 }
            }
          }
        },
        scales: {
          y: {
            grid: { color: isDark ? '#334155' : '#f1f5f9' },
            ticks: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 9 },
              callback: (v) => (v / 1000000) + 'M'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 10 }
            }
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
