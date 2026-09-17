/**
 * DuoSpace Modules - Health Tab Logic
 * Quản lý chỉ số sức khỏe (Cân nặng, chiều cao, BMI, nước uống, bước chân) của Đức & Sương
 */
class HealthModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.renderSummary();
    this.renderHistoryList();
    this.renderTodoList();
  }

  toggleHealthForm(show = null) {
    const form = document.getElementById('healthForm');
    if (!form) return;

    const isHidden = form.classList.contains('hidden');
    const shouldShow = show !== null ? show : isHidden;

    if (shouldShow) {
      form.classList.remove('hidden');
      const dateInput = document.getElementById('healthDateInput');
      if (dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
      }
    } else {
      form.classList.add('hidden');
    }
  }

  calculateBmi(weight, heightCm) {
    if (!weight || !heightCm || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
  }

  getBmiStatus(bmi) {
    if (!bmi) return { label: '', color: '' };
    if (bmi < 18.5) return { label: 'Gầy', color: 'text-amber-500' };
    if (bmi < 23) return { label: 'Bình thường', color: 'text-emerald-500' };
    if (bmi < 25) return { label: 'Thừa cân nhẹ', color: 'text-amber-500' };
    return { label: 'Cần giảm cân', color: 'text-rose-500' };
  }

  renderSummary() {
    const logs = this.app.data.healthLogs || [];

    // Tìm bản ghi mới nhất của Đức (Đ) và Sương (S)
    const latestDuc = logs.filter(l => l.user === 'Đ').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const latestSuong = logs.filter(l => l.user === 'S').sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const ducEl = document.getElementById('healthSummaryDuc');
    const suongEl = document.getElementById('healthSummarySuong');

    const formatPersonSummary = (record) => {
      if (!record || (!record.weight && !record.height)) {
        return '<span class="text-white/70 font-normal">Chưa có chỉ số</span>';
      }
      const parts = [];
      if (record.weight) parts.push(`${record.weight}kg`);
      if (record.height) parts.push(`${record.height}cm`);
      const bmi = this.calculateBmi(record.weight, record.height);
      if (bmi) {
        const status = this.getBmiStatus(bmi);
        parts.push(`BMI: ${bmi} (${status.label})`);
      }
      return parts.join(' • ');
    };

    if (ducEl) ducEl.innerHTML = formatPersonSummary(latestDuc);
    if (suongEl) suongEl.innerHTML = formatPersonSummary(latestSuong);
  }

  renderHistoryList() {
    const container = document.getElementById('healthHistoryList');
    const countEl = document.getElementById('healthLogCount');
    if (!container) return;

    const logs = [...(this.app.data.healthLogs || [])].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
    });

    if (countEl) countEl.innerText = `${logs.length} bản ghi`;

    if (logs.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-500 text-center py-4">Chưa có dữ liệu đo sức khỏe. Nhấn "+ Ghi chỉ số" để bắt đầu theo dõi!</p>';
      return;
    }

    container.innerHTML = logs.map((item) => {
      const realIndex = (this.app.data.healthLogs || []).indexOf(item);
      const isDuc = item.user === 'Đ';
      const userBadge = isDuc
        ? '<span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">Đức</span>'
        : '<span class="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">Sương</span>';

      const metrics = [];
      if (item.weight) metrics.push(`⚖️ <strong>${item.weight} kg</strong>`);
      if (item.height) metrics.push(`📏 <strong>${item.height} cm</strong>`);
      const bmi = this.calculateBmi(item.weight, item.height);
      if (bmi) {
        const st = this.getBmiStatus(bmi);
        metrics.push(`BMI: <strong>${bmi}</strong> (<span class="${st.color}">${st.label}</span>)`);
      }
      if (item.waterMl) metrics.push(`💧 ${item.waterMl} ml`);
      if (item.steps) metrics.push(`👟 ${item.steps.toLocaleString('vi-VN')} bước`);

      const dateStr = item.date ? Utils.formatDate(item.date) : '';

      return `
        <div class="py-2 px-2.5 rounded-xl border border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors space-y-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              ${userBadge}
              <span class="text-xs font-semibold text-gray-700 dark:text-slate-300">${dateStr}</span>
            </div>
            <button onclick="window.app.health?.deleteHealthLog(${realIndex})" class="text-gray-300 hover:text-red-500 text-xs p-1" title="Xóa bản ghi">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="text-xs text-gray-600 dark:text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
            ${metrics.join(' • ')}
          </div>
          ${item.notes ? `<p class="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/60 p-1.5 rounded mt-1 border border-gray-100 dark:border-slate-800">📝 ${Utils.escapeHtml(item.notes)}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  saveHealthLog() {
    const user = document.getElementById('healthUserSelect')?.value || 'Đ';
    const date = document.getElementById('healthDateInput')?.value;
    const weightVal = parseFloat(document.getElementById('healthWeightInput')?.value);
    const heightVal = parseFloat(document.getElementById('healthHeightInput')?.value);
    const waterVal = parseInt(document.getElementById('healthWaterInput')?.value);
    const stepsVal = parseInt(document.getElementById('healthStepsInput')?.value);
    const notes = Utils.sanitizeText(document.getElementById('healthNotesInput')?.value || '');

    if (!date) {
      alert('Vui lòng chọn ngày ghi nhận!');
      return;
    }

    if (isNaN(weightVal) && isNaN(heightVal) && isNaN(waterVal) && isNaN(stepsVal)) {
      alert('Vui lòng nhập ít nhất một chỉ số (Cân nặng, Chiều cao, Nước hoặc Bước chân)!');
      return;
    }

    if (!Array.isArray(this.app.data.healthLogs)) {
      this.app.data.healthLogs = [];
    }

    const newRecord = {
      id: `health-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user,
      date,
      weight: !isNaN(weightVal) ? weightVal : null,
      height: !isNaN(heightVal) ? heightVal : null,
      waterMl: !isNaN(waterVal) ? waterVal : 0,
      steps: !isNaN(stepsVal) ? stepsVal : 0,
      notes,
      createdAt: new Date().toISOString()
    };

    this.app.data.healthLogs.push(newRecord);

    const userName = user === 'Đ' ? 'Phước Đức' : 'Thu Sương';
    this.app.log?.system('Ghi chỉ số sức khỏe', `${userName} · ${newRecord.weight ? newRecord.weight + 'kg' : ''} ngày ${Utils.formatDate(date)}`);

    this.app.save();
    this.render();
    this.toggleHealthForm(false);

    // Reset inputs
    const weightInput = document.getElementById('healthWeightInput');
    const heightInput = document.getElementById('healthHeightInput');
    const waterInput = document.getElementById('healthWaterInput');
    const stepsInput = document.getElementById('healthStepsInput');
    const notesInput = document.getElementById('healthNotesInput');
    if (weightInput) weightInput.value = '';
    if (heightInput) heightInput.value = '';
    if (waterInput) waterInput.value = '';
    if (stepsInput) stepsInput.value = '';
    if (notesInput) notesInput.value = '';

    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify('Đã lưu chỉ số sức khỏe thành công!', 'success');
    }
  }

  deleteHealthLog(index) {
    const logs = this.app.data.healthLogs;
    if (!logs || !logs[index]) return;
    const item = logs[index];
    const userName = item.user === 'Đ' ? 'Phước Đức' : 'Thu Sương';
    if (!confirm(`Xóa bản ghi sức khỏe của ${userName} ngày ${Utils.formatDate(item.date)}?`)) return;

    logs.splice(index, 1);
    this.app.log?.system('Xóa chỉ số sức khỏe', `Bản ghi của ${userName} ngày ${Utils.formatDate(item.date)}`);
    this.app.save();
    this.render();

    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify('Đã xóa bản ghi sức khỏe', 'info');
    }
  }

  renderTodoList() {
    this.app.renderCategoryList('Sức Khỏe', 'healthTodoList');
  }
}
