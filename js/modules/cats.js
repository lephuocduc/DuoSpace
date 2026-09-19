/**
 * DuoSpace Modules - Cats Tab Logic (Mun & Bông)
 */
class CatsModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.renderTodoList();
    if (this.app.charts && !this.app.skipCharts) {
      setTimeout(() => this.app.charts.renderCatChart(), 100);
    }
  }

  toggleWeightForm() {
    const form = document.getElementById('weightForm');
    if (form) form.classList.toggle('hidden');
  }

  addCatWeight() {
    const cat = document.getElementById('weightCatName').value;
    const val = parseFloat(document.getElementById('weightVal').value);
    const date = document.getElementById('weightDate').value;

    if (!val || !date) return alert('Vui lòng nhập đủ cân nặng và ngày cân!');

    if (!this.app.data.catWeights) this.app.data.catWeights = [];

    let existing = this.app.data.catWeights.find(w => w.date === date);
    if (existing) {
      if (cat === 'Mun') existing.mun = val;
      else existing.bong = val;
    } else {
      const last = this.app.data.catWeights[this.app.data.catWeights.length - 1] || { mun: 4.0, bong: 3.5 };
      this.app.data.catWeights.push({
        date: date,
        mun: cat === 'Mun' ? val : last.mun,
        bong: cat === 'Bông' ? val : last.bong
      });
    }

    this.app.log?.system(existing ? 'Cập nhật cân nặng mèo' : 'Thêm cân nặng mèo', `${cat}: ${val} kg · ${date}`);
    this.app.save();
    if (this.app.charts) this.app.charts.renderCatChart();
    this.renderCatWeightHistory();
    this.app.home.updateDynamicInfo();
    document.getElementById('weightVal').value = '';
    this.toggleWeightForm();
  }

  updateWeightItem(idx, cat, val) {
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) return;
    if (this.app.data.catWeights && this.app.data.catWeights[idx]) {
      const before = this.app.data.catWeights[idx][cat];
      this.app.data.catWeights[idx][cat] = numVal;
      this.app.log?.system('Cập nhật cân nặng mèo', `${cat === 'mun' ? 'Mun' : 'Bông'}: ${before} kg → ${numVal} kg`);
      this.app.save();
      if (this.app.charts) this.app.charts.renderCatChart();
      this.app.home.updateDynamicInfo();
    }
  }

  deleteWeightItem(idx) {
    if (this.app.data.catWeights && this.app.data.catWeights[idx]) {
      const item = this.app.data.catWeights[idx];
      if (!confirm(`Xóa dữ liệu cân nặng ngày ${item.date}?`)) return;
      this.app.data.catWeights.splice(idx, 1);
      this.app.log?.system('Xóa cân nặng mèo', `${item.date} · Mun ${item.mun} kg · Bông ${item.bong} kg`);
      this.app.save();
      if (this.app.charts) this.app.charts.renderCatChart();
      this.renderCatWeightHistory();
      this.app.home.updateDynamicInfo();
    }
  }

  renderCatWeightHistory() {
    const container = document.getElementById('catWeightHistoryList');
    if (!container) return;

    const sorted = [...(this.app.data.catWeights || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Chưa có dữ liệu cân nặng nào</p>';
      return;
    }

    container.innerHTML = sorted.map(item => {
      const realIdx = this.app.data.catWeights.indexOf(item);
      const formattedDate = Utils.formatDate(item.date);

      return `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700/60 text-xs">
          <div class="font-semibold text-gray-700 dark:text-slate-300">📅 ${formattedDate}</div>
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-1">
              <span class="text-amber-500 font-bold">Mun:</span>
              <input type="number" step="0.1" value="${item.mun}" onchange="window.app.cats.updateWeightItem(${realIdx}, 'mun', this.value)"
                class="w-14 px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 text-center rounded font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500">
              <span>kg</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-rose-500 font-bold">Bông:</span>
              <input type="number" step="0.1" value="${item.bong}" onchange="window.app.cats.updateWeightItem(${realIdx}, 'bong', this.value)"
                class="w-14 px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 text-center rounded font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500">
              <span>kg</span>
            </div>
            <button onclick="window.app.cats.deleteWeightItem(${realIdx})" class="text-gray-300 hover:text-red-500 ml-1">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTodoList() {
    this.app.renderCategoryList('Mun & Bông', 'catsTodoList');
  }
}

// Global aliases for compatibility
function toggleWeightForm() { window.app.cats.toggleWeightForm(); }
function addCatWeight() { window.app.cats.addCatWeight(); }
function updateCatWeightItem(idx, cat, val) { window.app.cats.updateWeightItem(idx, cat, val); }
function deleteCatWeightItem(idx) { window.app.cats.deleteWeightItem(idx); }
function renderCatChart() { if (window.app.charts) window.app.charts.renderCatChart(); }
function renderCatWeightHistory() { window.app.cats.renderCatWeightHistory(); }
