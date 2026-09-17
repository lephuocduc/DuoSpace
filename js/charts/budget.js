/**
 * DuoSpace Charts - Budget Comparison Chart (Home Tab)
 * Tự động tính toán và hiển thị so sánh Thu - Chi của 3 tháng gần nhất từ dữ liệu thực tế
 */
class BudgetChart {
  constructor() {
    this.chart = null;
  }

  render(data, isDark) {
    const ctx = document.getElementById('budgetComparisonChart');
    if (!ctx) return;

    // Xác định 3 tháng gần nhất (VD: T7/2026, T8/2026, T9/2026)
    const now = new Date();
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0 - 11
      const label = `T${month + 1}/${year}`;
      months.push({ year, month, label });
    }

    const labels = months.map(m => m.label);

    // Tính tổng Thu theo từng tháng từ mảng incomes
    const incomes = months.map(m => {
      return (data.incomes || [])
        .filter(item => {
          if (!item.date) return false;
          const d = new Date(item.date);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    });

    // Tính tổng Chi theo từng tháng từ mảng expenses
    const expenses = months.map(m => {
      return (data.expenses || [])
        .filter(item => {
          if (!item.date) return false;
          const d = new Date(item.date);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    });

    // Nếu người dùng có cấu hình mẫu trong monthlyBudgets mà incomes/expenses chưa có dữ liệu quá khứ,
    // hỗ trợ fallback để biểu đồ luôn trực quan
    if (Array.isArray(data.monthlyBudgets) && data.monthlyBudgets.length > 0) {
      months.forEach((m, idx) => {
        if (idx < months.length - 1 && incomes[idx] === 0 && expenses[idx] === 0) {
          const mb = data.monthlyBudgets.find(b => b.month === m.label);
          if (mb) {
            incomes[idx] = Number(mb.budget) || 0;
            expenses[idx] = Number(mb.spent) || 0;
          }
        }
      });
    }

    // Xác định giá trị lớn nhất trong toàn bộ 3 tháng để scale trục Y tự động
    const rawMax = Math.max(...incomes, ...expenses, 0);

    // Tính mốc trần đẹp mắt (nice round ceiling) cao hơn giá trị lớn nhất khoảng 15-20% để cột không bị chạm nóc
    const getNiceCeiling = (val) => {
      if (val <= 0) return 1000000; // Khi chưa có số liệu, giữ mốc 1M tối thiểu để trục không co về số 0 mũ khoa học
      const target = val * 1.15;
      const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
      const ratio = target / magnitude;
      let multiplier = 10;
      if (ratio <= 1.2) multiplier = 1.2;
      else if (ratio <= 1.5) multiplier = 1.5;
      else if (ratio <= 2) multiplier = 2;
      else if (ratio <= 2.5) multiplier = 2.5;
      else if (ratio <= 5) multiplier = 5;
      else if (ratio <= 8) multiplier = 8;
      return Math.round(multiplier * magnitude);
    };

    const calculatedMax = getNiceCeiling(rawMax);

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
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                return `${context.dataset.label}: ${val.toLocaleString('vi-VN')} VNĐ`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: calculatedMax,
            grid: { color: isDark ? '#334155' : '#f1f5f9' },
            ticks: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 9 },
              callback: (v) => {
                if (v === 0) return '0đ';
                if (v >= 1000000) {
                  return `${(v / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
                }
                if (v >= 1000) {
                  return `${Math.round(v / 1000)}k`;
                }
                return v;
              }
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
