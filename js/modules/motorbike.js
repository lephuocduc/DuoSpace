/**
 * DuoSpace Modules - Motorbike Maintenance Tab Logic
 */
class MotorbikeModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.renderMaintenanceList();
    this.renderTodoList();
  }

  toggleForm() {
    const form = document.getElementById('bikeMaintenanceForm');
    if (form) form.classList.toggle('hidden');
  }

  saveBikeMaintenance() {
    const bike = document.getElementById('maintBikeName').value;
    const title = document.getElementById('maintTitle').value.trim();
    const odo = parseInt(document.getElementById('maintOdo').value);
    const cost = parseInt(document.getElementById('maintCost').value);
    const date = document.getElementById('maintDate').value;

    if (!title || !odo || !cost || !date) return alert('Vui lòng nhập đầy đủ thông tin bảo dưỡng!');

    if (!this.app.data.bikeMaintenances) this.app.data.bikeMaintenances = [];
    this.app.data.bikeMaintenances.push({ bike, title, odo, cost, date });

    if (!this.app.data.settings) this.app.data.settings = {};
    if (bike === 'NMAX') this.app.data.settings.nmaxOdo = Math.max(this.app.data.settings.nmaxOdo || 0, odo);
    if (bike === 'Grande') this.app.data.settings.grandeOdo = Math.max(this.app.data.settings.grandeOdo || 0, odo);

    if (!this.app.data.expenses) this.app.data.expenses = [];
    this.app.data.expenses.push({
      amount: cost,
      desc: `Bảo dưỡng ${bike}: ${title}`,
      category: "🛵 Xe",
      user: "Đ",
      notes: `Mốc Odo: ${odo.toLocaleString('vi-VN')} km`,
      date: new Date(date).toISOString()
    });

    this.app.save();
    this.app.render();

    document.getElementById('maintTitle').value = '';
    document.getElementById('maintOdo').value = '';
    document.getElementById('maintCost').value = '';
    this.toggleForm();
  }

  deleteBikeMaintenance(idx) {
    if (this.app.data.bikeMaintenances && this.app.data.bikeMaintenances[idx]) {
      this.app.data.bikeMaintenances.splice(idx, 1);
      this.app.save();
      this.app.render();
    }
  }

  renderMaintenanceList() {
    const container = document.getElementById('bikeMaintenanceList');
    if (!container) return;

    const list = (this.app.data.bikeMaintenances || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Chưa có lịch sử bảo dưỡng nào</p>';
      return;
    }

    container.innerHTML = list.map((item, idx) => {
      const formattedDate = Utils.formatDate(item.date);
      return `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-800 text-xs">
          <div>
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-sky-600 dark:text-sky-400">[${item.bike}]</span>
              <span class="font-semibold text-gray-800 dark:text-slate-200">${item.title}</span>
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5">📅 ${formattedDate} • 📍 ${Number(item.odo).toLocaleString('vi-VN')} km</p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="font-bold text-rose-500">${Utils.formatCurrency(item.cost)}</span>
            <button onclick="window.app.motorbike.deleteBikeMaintenance(${idx})" class="text-gray-300 hover:text-red-500">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTodoList() {
    this.app.renderCategoryList('Xe Máy', 'motorbikeTodoList');
  }
}

// Global aliases for compatibility
function toggleBikeMaintenanceForm() { window.app.motorbike.toggleForm(); }
function saveBikeMaintenance() { window.app.motorbike.saveBikeMaintenance(); }
function deleteBikeMaintenance(idx) { window.app.motorbike.deleteBikeMaintenance(idx); }
