/**
 * DuoSpace Modules - Motorbike Maintenance Tab Logic
 * v3.0: Thêm tính năng Parts Status (Trạng thái phụ tùng) cho NMAX & Grande
 */
class MotorbikeModule {
  constructor(app) {
    this.app = app;
    this.currentPartsBike = 'NMAX';
  }

  render() {
    this.loadBikeInfoToForm();
    this.renderMaintenanceList();
    this.renderTodoList();
  }

  loadBikeInfoToForm() {
    const s = this.app.data.settings || {};
    const fields = {
      bikeNmaxOdo: s.nmaxOdo || '',
      bikeGrandeOdo: s.grandeOdo || '',
    };
    Object.entries(fields).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) input.value = value;
    });
  }

  saveBikeInfo() {
    const s = this.app.data.settings || (this.app.data.settings = {});
    s.nmaxOdo = parseInt(document.getElementById('bikeNmaxOdo')?.value, 10) || 0;
    s.grandeOdo = parseInt(document.getElementById('bikeGrandeOdo')?.value, 10) || 0;
    this.app.save();
    this.app.render();
    alert('Đã cập nhật thông tin xe.');
  }

  toggleForm() {
    const form = document.getElementById('bikeMaintenanceForm');
    if (form) form.classList.toggle('hidden');
  }

  onMaintTitleChange() {
    const sel = document.getElementById('maintTitleSelect');
    const customRow = document.getElementById('maintCustomTitleRow');
    if (sel && customRow) {
      if (sel.value === 'Khác') {
        customRow.classList.remove('hidden');
      } else {
        customRow.classList.add('hidden');
      }
    }
  }

  saveBikeMaintenance() {
    const bike = document.getElementById('maintBikeName').value;
    const titleSelect = document.getElementById('maintTitleSelect');
    const customTitleInput = document.getElementById('maintCustomTitle');
    
    let title = titleSelect ? titleSelect.value : '';
    if (title === 'Khác') {
      title = customTitleInput ? customTitleInput.value.trim() : '';
    }
    
    const odo = parseInt(document.getElementById('maintOdo').value);
    const cost = parseInt(document.getElementById('maintCost').value);
    const date = document.getElementById('maintDate').value;

    if (!title || isNaN(odo) || isNaN(cost) || !date) return alert('Vui lòng nhập đầy đủ thông tin bảo dưỡng!');

    if (!this.app.data.bikeMaintenances) this.app.data.bikeMaintenances = [];
    if (!this.app.data.expenses) this.app.data.expenses = [];
    const expenseId = Utils.createId('expense');
    const maintenanceId = Utils.createId('maintenance');
    const isoDate = new Date(`${date}T12:00:00`).toISOString();
    this.app.data.bikeMaintenances.push({ id: maintenanceId, expenseId, bike, title, odo, cost, date: isoDate });
    this.app.data.expenses.push({ id: expenseId, linkedMaintenanceId: maintenanceId, amount: cost, desc: `Bảo dưỡng ${bike}: ${title}`, category: '🛵 Xe', user: 'Đ', notes: `Mốc ODO: ${odo.toLocaleString('vi-VN')} km`, bike, odo, vehicleItem: title, date: isoDate });

    if (!this.app.data.settings) this.app.data.settings = {};
    if (bike === 'NMAX') this.app.data.settings.nmaxOdo = Math.max(this.app.data.settings.nmaxOdo || 0, odo);
    if (bike === 'Grande') this.app.data.settings.grandeOdo = Math.max(this.app.data.settings.grandeOdo || 0, odo);

    this.app.log?.system('Thêm lịch sử bảo dưỡng', `${bike} · ${title} · ODO ${odo.toLocaleString('vi-VN')} km`);

    this.app.save();
    this.app.render();

    if (customTitleInput) customTitleInput.value = '';
    document.getElementById('maintOdo').value = '';
    document.getElementById('maintCost').value = '';
    this.toggleForm();
  }

  deleteBikeMaintenance(idx) {
    if (this.app.data.bikeMaintenances && this.app.data.bikeMaintenances[idx]) {
      const item = this.app.data.bikeMaintenances[idx];
      this.app.data.bikeMaintenances.splice(idx, 1);
      if (item.expenseId) this.app.data.expenses = (this.app.data.expenses || []).filter(expense => expense.id !== item.expenseId);
      this.app.log?.system('Xóa lịch sử bảo dưỡng', `${item.bike} · ${item.title}`);
      this.app.save();
      this.app.render();
    }
  }

  renderMaintenanceList() {
    const container = document.getElementById('bikeMaintenanceList');
    if (!container) return;

    const list = (this.app.data.bikeMaintenances || []).slice().reverse();

    if (list.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Chưa có lịch sử bảo dưỡng nào</p>';
      return;
    }

    container.innerHTML = list.map((item, idx) => {
      const realIdx = (this.app.data.bikeMaintenances.length - 1) - idx;
      const formattedDate = Utils.formatDate(item.date);
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-800 text-xs">
          <div>
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-sky-600 dark:text-sky-400">[${item.bike}]</span>
              <span class="font-semibold text-gray-800 dark:text-slate-200">${item.title}</span>
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5">📅 ${formattedDate} • 📍 ${Number(item.odo).toLocaleString('vi-VN')} km</p>
          </div>
          <div class="flex items-center space-x-2.5">
            <span class="font-bold text-rose-500">${Utils.formatCurrency(item.cost)}</span>
            <button onclick="window.app.motorbike.deleteBikeMaintenance(${realIdx})" class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors active:scale-95" title="Xóa lịch sử bảo dưỡng">
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

  // ──────────────────────────────────────────────
  // PARTS STATUS MODAL & CALCULATOR
  // ──────────────────────────────────────────────

  getPartsCatalog() {
    return [
      {
        id: 'engine_oil',
        name: 'Nhớt máy (Engine Oil)',
        icon: 'fa-oil-can',
        color: 'text-amber-500',
        intervalKm: 2500,
        intervalMonths: 3,
        recommendation: 'Khuyến nghị thay sau 2.000 - 3.000 km hoặc 3 tháng',
        keywords: ['nhớt máy', 'thay nhớt', 'nhot may', 'thay nhot']
      },
      {
        id: 'gear_oil',
        name: 'Nhớt lap / Hộp số (Gear Oil)',
        icon: 'fa-droplet',
        color: 'text-sky-500',
        intervalKm: 6000,
        intervalMonths: 6,
        recommendation: 'Khuyến nghị thay sau mỗi 2-3 lần thay nhớt máy (~6.000 km)',
        keywords: ['nhớt lap', 'nhớt hộp số', 'nhot lap', 'hop so']
      },
      {
        id: 'air_filter',
        name: 'Lọc gió (Air Filter)',
        icon: 'fa-wind',
        color: 'text-emerald-500',
        intervalKm: 10000,
        intervalMonths: 12,
        recommendation: 'Khuyến nghị thay sau 1 năm hoặc 10.000 km',
        keywords: ['lọc gió', 'loc gio', 'air filter']
      },
      {
        id: 'spark_plug',
        name: 'Bugi (Spark Plug)',
        icon: 'fa-bolt',
        color: 'text-yellow-500',
        intervalKm: 10000,
        intervalMonths: 12,
        recommendation: 'Khuyến nghị thay sau 1 năm hoặc 10.000 km',
        keywords: ['bugi', 'spark plug']
      },
      {
        id: 'coolant',
        name: 'Nước làm mát (Coolant)',
        icon: 'fa-temperature-half',
        color: 'text-teal-500',
        intervalKm: 15000,
        intervalMonths: 18,
        recommendation: 'Khuyến nghị thay sau 1.5 năm hoặc 15.000 km',
        keywords: ['nước mát', 'nước làm mát', 'coolant', 'nuoc mat']
      },
      {
        id: 'belt_roller',
        name: 'Dây Curoa & Bi nồi (V-Belt & Rollers)',
        icon: 'fa-arrows-rotate',
        color: 'text-indigo-500',
        intervalKm: 20000,
        intervalMonths: 24,
        recommendation: 'Khuyến nghị kiểm tra sau 10.000 km, thay sau 20.000 km hoặc 2 năm',
        keywords: ['curoa', 'dây curoa', 'bi nồi', 'nồi', 'noi']
      },
      {
        id: 'brake_pads',
        name: 'Má phanh / Bố thắng (Brake Pads)',
        icon: 'fa-compact-disc',
        color: 'text-rose-500',
        intervalKm: 12000,
        intervalMonths: 12,
        recommendation: 'Khuyến nghị kiểm tra định kỳ, thay sau 1 năm hoặc 10.000 - 15.000 km',
        keywords: ['má phanh', 'bố thắng', 'phanh', 'thắng', 'ma phanh']
      },
      {
        id: 'tires',
        name: 'Lốp xe trước & sau (Tires)',
        icon: 'fa-circle-notch',
        color: 'text-slate-600',
        intervalKm: 20000,
        intervalMonths: 24,
        recommendation: 'Khuyến nghị thay sau 2 năm hoặc 15.000 - 20.000 km',
        keywords: ['lốp', 'vỏ xe', 'lop xe', 'vo xe', 'tire']
      }
    ];
  }

  openPartsStatusModal(bikeName) {
    this.currentPartsBike = bikeName || 'NMAX';
    const modal = document.getElementById('bikePartsModal');
    if (!modal) return;

    this.renderPartsStatusContent();

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.remove('translate-y-full');
  }

  closePartsStatusModal() {
    const modal = document.getElementById('bikePartsModal');
    if (!modal) return;
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.add('translate-y-full');
  }

  renderPartsStatusContent() {
    const bike = this.currentPartsBike;
    const titleEl = document.getElementById('partsModalTitle');
    const bikeOdoEl = document.getElementById('partsModalOdo');
    const container = document.getElementById('partsModalList');

    const s = this.app.data.settings || {};
    const currentOdo = bike === 'NMAX' ? (s.nmaxOdo || 14850) : (s.grandeOdo || 8200);
    const bikeInfo = CONFIG.VEHICLES[bike];

    if (titleEl) titleEl.innerText = `Trạng Thái Phụ Tùng: ${bike}`;
    if (bikeOdoEl) bikeOdoEl.innerText = `ODO Hiện tại: ${currentOdo.toLocaleString('vi-VN')} km • BS: ${bikeInfo.plate} • Số khung: ${bikeInfo.chassis}`;

    if (!container) return;

    const catalog = this.getPartsCatalog();
    const maintenances = (this.app.data.bikeMaintenances || [])
      .filter(m => m.bike === bike)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = catalog.map(part => {
      // Tìm lần bảo dưỡng gần nhất liên quan tới part này
      const lastMaint = maintenances.find(m => {
        const titleLower = (m.title || '').toLowerCase();
        return part.keywords.some(k => titleLower.includes(k));
      });

      let lastDateStr = 'Chưa ghi nhận';
      let lastOdo = 0;
      let nextOdo = currentOdo + part.intervalKm;
      let nextDateStr = 'Theo mốc ODO';
      let kmUsed = 0;
      let progressPct = 0;

      if (lastMaint) {
        lastDateStr = Utils.formatDate(lastMaint.date);
        lastOdo = lastMaint.odo || 0;
        kmUsed = Math.max(0, currentOdo - lastOdo);
        nextOdo = lastOdo + part.intervalKm;

        const nextDate = new Date(lastMaint.date);
        nextDate.setMonth(nextDate.getMonth() + part.intervalMonths);
        nextDateStr = Utils.formatDate(nextDate.toISOString());

        progressPct = Math.min(100, Math.round((kmUsed / part.intervalKm) * 100));
      } else {
        // Chưa có lịch sử thay -> tính từ ODO hiện tại
        kmUsed = currentOdo % part.intervalKm;
        progressPct = Math.min(100, Math.round((kmUsed / part.intervalKm) * 100));
        nextOdo = currentOdo + (part.intervalKm - kmUsed);
      }

      const isWarning = progressPct >= 85 || currentOdo >= nextOdo;
      const progressColor = isWarning ? 'bg-rose-500' : progressPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
      const statusBadge = isWarning 
        ? '<span class="text-[9px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">⚠️ Cần thay sớm</span>'
        : '<span class="text-[9px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold">Tốt</span>';

      return `
        <div class="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/60 space-y-2">
          <div class="flex justify-between items-start">
            <div class="flex items-center space-x-2.5">
              <div class="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center ${part.color}">
                <i class="fa-solid ${part.icon} text-xs"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-900 dark:text-white">${part.name}</h4>
                <p class="text-[10px] text-gray-400 italic">${part.recommendation}</p>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="grid grid-cols-2 gap-2 bg-white dark:bg-slate-900/50 p-2 rounded-xl text-[11px] border border-gray-100 dark:border-slate-800">
            <div>
              <p class="text-[10px] text-gray-400 font-medium">Lần thay cuối:</p>
              <p class="font-bold text-gray-800 dark:text-slate-200">${lastDateStr}</p>
              <p class="text-[10px] text-gray-500">${lastOdo > 0 ? `Lúc ODO: ${lastOdo.toLocaleString('vi-VN')} km` : 'Chưa lưu mốc ODO'}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-400 font-medium">Lần thay tiếp theo:</p>
              <p class="font-bold ${isWarning ? 'text-rose-500' : 'text-sky-600 dark:text-sky-400'}">Mốc ODO: ${nextOdo.toLocaleString('vi-VN')} km</p>
              <p class="text-[10px] text-gray-500">📅 ${nextDateStr}</p>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-[9px] text-gray-400 mb-1">
              <span>Mức hao mòn (${kmUsed.toLocaleString('vi-VN')} / ${part.intervalKm.toLocaleString('vi-VN')} km)</span>
              <span class="font-bold">${progressPct}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div class="${progressColor} h-full transition-all duration-300" style="width: ${progressPct}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Global aliases for compatibility
function toggleBikeMaintenanceForm() { window.app.motorbike.toggleForm(); }
function onMaintTitleChange() { window.app.motorbike.onMaintTitleChange(); }
function saveBikeMaintenance() { window.app.motorbike.saveBikeMaintenance(); }
function deleteBikeMaintenance(idx) { window.app.motorbike.deleteBikeMaintenance(idx); }
function openPartsStatusModal(bike) { window.app.motorbike.openPartsStatusModal(bike); }
function closePartsStatusModal() { window.app.motorbike.closePartsStatusModal(); }
function saveBikeInfo() { window.app.motorbike.saveBikeInfo(); }
