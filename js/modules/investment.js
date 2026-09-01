/**
 * DuoSpace Modules - Investment Portfolio Management Logic
 */
class InvestmentModule {
  constructor(app) {
    this.app = app;
    this.editingIndex = -1;
    this.currentFilter = 'all';
    this.searchQuery = '';
  }

  render() {
    this.renderInvestmentList();
  }

  toggleForm() {
    const form = document.getElementById('investmentForm');
    if (form) form.classList.toggle('hidden');
  }

  openForm(idx = -1) {
    this.editingIndex = idx;
    const form = document.getElementById('investmentForm');
    if (!form) return;
    form.classList.remove('hidden');

    if (idx >= 0 && this.app.data.investments && this.app.data.investments[idx]) {
      const item = this.app.data.investments[idx];
      document.getElementById('investFormTitle').innerText = "Cập nhật Tài Sản";
      document.getElementById('investName').value = item.name || '';
      document.getElementById('investType').value = item.type || '🪙 Crypto';
      document.getElementById('investQuantity').value = item.quantity || '';
      document.getElementById('investBuyPrice').value = item.buyPrice !== undefined ? item.buyPrice : (item.price || '');
      document.getElementById('investCurrentPrice').value = item.currentPrice !== undefined ? item.currentPrice : (item.price || '');
      document.getElementById('investTarget').value = item.targetWeight || '';
      document.getElementById('investIsUsd').checked = item.isUsd || false;
      document.getElementById('investNotes').value = item.notes || '';
      document.getElementById('saveInvestBtn').innerText = "Cập nhật tài sản";
    } else {
      document.getElementById('investFormTitle').innerText = "Thêm Tài Sản Mới";
      document.getElementById('investName').value = '';
      document.getElementById('investType').value = '🪙 Crypto';
      document.getElementById('investQuantity').value = '';
      document.getElementById('investBuyPrice').value = '';
      document.getElementById('investCurrentPrice').value = '';
      document.getElementById('investTarget').value = '';
      document.getElementById('investIsUsd').checked = false;
      document.getElementById('investNotes').value = '';
      document.getElementById('saveInvestBtn').innerText = "Lưu tài sản";
    }

    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  saveInvestment() {
    const name = document.getElementById('investName').value.trim();
    const type = document.getElementById('investType').value;
    const quantity = parseFloat(document.getElementById('investQuantity').value);
    const buyPrice = parseFloat(document.getElementById('investBuyPrice').value);
    const currentPrice = parseFloat(document.getElementById('investCurrentPrice').value);
    const targetWeight = parseFloat(document.getElementById('investTarget').value) || null;
    const isUsd = document.getElementById('investIsUsd').checked;
    const notes = document.getElementById('investNotes').value.trim();

    if (!name || isNaN(quantity) || isNaN(buyPrice) || isNaN(currentPrice)) {
      return alert('Vui lòng nhập đủ: Tên, Số lượng, Giá mua và Giá hiện tại!');
    }

    const newItem = { name, type, quantity, buyPrice, currentPrice, targetWeight, isUsd, notes };

    if (!this.app.data.investments) this.app.data.investments = [];

    if (this.editingIndex >= 0 && this.editingIndex < this.app.data.investments.length) {
      this.app.data.investments[this.editingIndex] = newItem;
    } else {
      this.app.data.investments.push(newItem);
    }

    this.app.save();
    this.toggleForm();
    this.renderInvestmentList();
  }

  deleteItem(idx) {
    if (confirm('Bạn có chắc chắn muốn xóa tài sản này?')) {
      if (this.app.data.investments && this.app.data.investments[idx]) {
        this.app.data.investments.splice(idx, 1);
        this.app.save();
        this.renderInvestmentList();
      }
    }
  }

  search(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderInvestmentList();
  }

  filter(type) {
    this.currentFilter = type;
    const types = ['all', 'crypto', 'stock', 'usd', 'gold', 'save'];
    const typeValues = ['all', '🪙 Crypto', '📈 Cổ phiếu', '💵 USD', '🥇 Vàng', '🏦 Tiết kiệm'];

    types.forEach((id, index) => {
      const btn = document.getElementById(`invFilter-${id}`);
      if (btn) {
        if (typeValues[index] === type) {
          btn.className = "shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors";
        } else {
          btn.className = "shrink-0 px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 transition-colors";
        }
      }
    });
    this.renderInvestmentList();
  }

  renderInvestmentList() {
    const container = document.getElementById('investmentList');
    if (!container) return;

    const list = this.app.data.investments || [];
    const usdRate = this.app.data.usdRate || 25400;
    let totalCostVnd = 0;
    let totalValueVnd = 0;

    list.forEach(item => {
      const bPrice = item.buyPrice !== undefined ? item.buyPrice : (item.price || 0);
      const cPrice = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
      const cost = item.isUsd ? (item.quantity * bPrice * usdRate) : (item.quantity * bPrice);
      const value = item.isUsd ? (item.quantity * cPrice * usdRate) : (item.quantity * cPrice);
      totalCostVnd += cost;
      totalValueVnd += value;
    });

    const totalPnL = totalValueVnd - totalCostVnd;
    const totalRoi = totalCostVnd > 0 ? (totalPnL / totalCostVnd) * 100 : 0;

    const totalValEl = document.getElementById('investTotalValue');
    if (totalValEl) totalValEl.innerText = Utils.formatCurrency(totalValueVnd);

    const totalCostEl = document.getElementById('investTotalCost');
    if (totalCostEl) totalCostEl.innerText = Utils.formatCurrency(totalCostVnd);

    const pnlEl = document.getElementById('investTotalPnL');
    if (pnlEl) {
      if (totalPnL >= 0) {
        pnlEl.innerText = `+${Utils.formatCurrency(totalPnL)} (+${totalRoi.toFixed(2)}%)`;
        pnlEl.className = "text-sm font-bold text-emerald-400 drop-shadow-sm";
      } else {
        pnlEl.innerText = `${Utils.formatCurrency(totalPnL)} (${totalRoi.toFixed(2)}%)`;
        pnlEl.className = "text-sm font-bold text-rose-400 drop-shadow-sm";
      }
    }

    let displayList = list.map((item, idx) => ({ ...item, rawIdx: idx }));

    if (this.currentFilter !== 'all') {
      displayList = displayList.filter(i => i.type === this.currentFilter);
    }

    if (this.searchQuery) {
      displayList = displayList.filter(i =>
        (i.name && i.name.toLowerCase().includes(this.searchQuery)) ||
        (i.notes && i.notes.toLowerCase().includes(this.searchQuery))
      );
    }

    displayList.sort((a, b) => {
      const cPriceA = a.currentPrice !== undefined ? a.currentPrice : (a.price || 0);
      const cPriceB = b.currentPrice !== undefined ? b.currentPrice : (b.price || 0);
      const valA = a.isUsd ? (a.quantity * cPriceA * usdRate) : (a.quantity * cPriceA);
      const valB = b.isUsd ? (b.quantity * cPriceB * usdRate) : (b.quantity * cPriceB);
      return valB - valA;
    });

    if (displayList.length === 0) {
      container.innerHTML = '<div class="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700"><p class="text-sm text-gray-500">Không tìm thấy tài sản phù hợp</p></div>';
    } else {
      container.innerHTML = displayList.map(item => {
        const bPrice = item.buyPrice !== undefined ? item.buyPrice : (item.price || 0);
        const cPrice = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
        const costVnd = item.isUsd ? (item.quantity * bPrice * usdRate) : (item.quantity * bPrice);
        const valueVnd = item.isUsd ? (item.quantity * cPrice * usdRate) : (item.quantity * cPrice);
        const pnl = valueVnd - costVnd;
        const roi = costVnd > 0 ? (pnl / costVnd) * 100 : 0;
        const weight = totalValueVnd > 0 ? (valueVnd / totalValueVnd) * 100 : 0;

        const pnlColorClass = pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const pnlSign = pnl >= 0 ? '+' : '';
        const symbol = item.isUsd ? '$' : '';
        const priceFormat = item.isUsd ? 'en-US' : 'vi-VN';

        let targetHtml = '';
        if (item.targetWeight) {
          const isOverTarget = weight > item.targetWeight;
          targetHtml = `
            <div class="mt-2.5">
              <div class="flex justify-between text-[9px] text-gray-400 mb-1">
                <span>Tiến độ phân bổ</span>
                <span>Mục tiêu: ${item.targetWeight}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full flex overflow-hidden">
                <div class="bg-indigo-500 h-full" style="width: ${Math.min(weight, item.targetWeight)}%"></div>
                ${isOverTarget ? `<div class="bg-rose-400 h-full" style="width: ${weight - item.targetWeight}%" title="Vượt mục tiêu"></div>` : ''}
              </div>
            </div>
          `;
        } else {
          targetHtml = `
            <div class="mt-2.5">
              <div class="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div class="bg-indigo-500 h-full" style="width: ${weight}%"></div>
              </div>
            </div>
          `;
        }

        return `
          <div class="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="text-sm font-bold text-gray-900 dark:text-white">${item.name}</h4>
                <p class="text-[10px] text-gray-500 font-medium">${item.type} • Tỷ trọng: <span class="font-bold text-indigo-600 dark:text-indigo-400">${weight.toFixed(1)}%</span></p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-gray-900 dark:text-white">${Utils.formatCurrency(valueVnd)}</p>
                <p class="text-[11px] font-bold ${pnlColorClass}">${pnlSign}${Utils.formatCurrency(pnl)} (${pnlSign}${roi.toFixed(2)}%)</p>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-slate-900/60 rounded-xl p-2.5 text-[11px] text-gray-600 dark:text-slate-400 flex justify-between items-center border border-gray-100 dark:border-slate-700/50">
              <div class="space-y-1">
                <p>Vốn: <span class="font-semibold text-gray-800 dark:text-slate-200">${symbol}${bPrice.toLocaleString(priceFormat)}</span></p>
                <p>Giá TT: <span class="font-semibold text-gray-800 dark:text-slate-200">${symbol}${cPrice.toLocaleString(priceFormat)}</span></p>
              </div>
              <div class="text-right space-y-1 flex flex-col justify-between h-full">
                <p>SL: <span class="font-semibold text-gray-800 dark:text-slate-200">${item.quantity.toLocaleString(priceFormat)}</span></p>
                <div class="flex space-x-3 justify-end mt-1">
                  <button onclick="window.app.investment.openForm(${item.rawIdx})" class="text-blue-500 hover:text-blue-700"><i class="fa-solid fa-pen-to-square"></i></button>
                  <button onclick="window.app.investment.deleteItem(${item.rawIdx})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              </div>
            </div>
            
            ${item.notes ? `<p class="text-[10px] text-gray-400 mt-2 italic flex items-center"><i class="fa-solid fa-circle-info mr-1.5 text-[8px]"></i>${item.notes}</p>` : ''}
            ${targetHtml}
          </div>
        `;
      }).join('');
    }

    if (this.app.charts) {
      setTimeout(() => this.app.charts.renderAssetAllocationChart(), 100);
    }
  }

  async fetchRealtimeUsdRate() {
    try {
      const res = await fetch(CONFIG.USD_RATE_API);
      const data = await res.json();
      if (data && data.rates && data.rates.VND) {
        const rate = Math.round(data.rates.VND);
        this.app.data.usdRate = rate;
        const rateInput = document.getElementById('usdRateInput');
        if (rateInput) rateInput.value = rate;
        this.app.save();
        this.renderInvestmentList();
      }
    } catch (err) {
      console.log('Không thể lấy tỷ giá tự động:', err);
    }
  }

  updateUsdRate(val) {
    const rate = parseFloat(val);
    if (rate && rate > 0) {
      this.app.data.usdRate = rate;
      this.app.save();
      this.renderInvestmentList();
    }
  }
}

// Global aliases for compatibility
function toggleInvestmentForm() { window.app.investment.toggleForm(); }
function openInvestmentForm(idx) { window.app.investment.openForm(idx); }
function saveInvestment() { window.app.investment.saveInvestment(); }
function deleteInvestmentItem(idx) { window.app.investment.deleteItem(idx); }
function searchInvestment(query) { window.app.investment.search(query); }
function filterInvestment(type) { window.app.investment.filter(type); }
function updateUsdRate(val) { window.app.investment.updateUsdRate(val); }
function fetchRealtimeUsdRate() { window.app.investment.fetchRealtimeUsdRate(); }
