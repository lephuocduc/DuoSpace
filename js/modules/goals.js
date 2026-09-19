/**
 * DuoSpace - Savings Goals Module
 */
class GoalsModule {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('goalsContainer');
  }

  render() {
    if (!this.container) {
      // Create container if it doesn't exist inside tab-investment
      const investTab = document.getElementById('tab-investment');
      if (investTab) {
        // Insert right after the top summary cards
        const grid = investTab.querySelector('.grid');
        if (grid) {
          const goalsHtml = `
            <div class="mt-6 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                  <i class="fa-solid fa-bullseye text-indigo-500 mr-2"></i> Mục tiêu tài chính
                </h3>
                <button onclick="window.app.goals.openModal()" class="w-8 h-8 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
              <div id="goalsContainer" class="space-y-4"></div>
            </div>
          `;
          grid.insertAdjacentHTML('afterend', goalsHtml);
          this.container = document.getElementById('goalsContainer');
        }
      }
    }
    
    if (!this.container) return;
    
    const goals = this.app.data.savingsGoals || [];
    
    if (goals.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-6 text-gray-400 dark:text-slate-500">
          <i class="fa-regular fa-flag text-4xl mb-2 opacity-50"></i>
          <p class="text-sm">Chưa có mục tiêu tài chính nào.</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    goals.forEach(g => {
      const target = Number(g.targetAmount) || 0;
      const current = Number(g.currentAmount) || 0;
      let percent = 0;
      if (target > 0) percent = Math.min(100, Math.round((current / target) * 100));
      
      const icon = g.icon || 'fa-solid fa-star';
      
      html += `
        <div class="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onclick="window.app.goals.openModal('${g.id}')">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-indigo-500">
                <i class="${icon} text-lg"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200 text-sm">${g.title}</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400">${Utils.formatCurrency(current)} / ${Utils.formatCurrency(target)}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400">${percent}%</span>
            </div>
          </div>
          <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div class="bg-indigo-500 h-2 rounded-full" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    });
    
    this.container.innerHTML = html;
  }
  
  openModal(id = null) {
    let goal = null;
    if (id) {
      goal = (this.app.data.savingsGoals || []).find(g => g.id === id);
    }
    
    document.getElementById('goalId').value = id || '';
    document.getElementById('goalTitle').value = goal ? goal.title : '';
    document.getElementById('goalTarget').value = goal ? goal.targetAmount : '';
    document.getElementById('goalCurrent').value = goal ? goal.currentAmount : 0;
    document.getElementById('goalIcon').value = goal ? (goal.icon || 'fa-solid fa-star') : 'fa-solid fa-star';
    
    // Format on load
    Utils.formatNumberInput(document.getElementById('goalTarget'));
    Utils.formatNumberInput(document.getElementById('goalCurrent'));
    
    const delBtn = document.getElementById('deleteGoalBtn');
    if (delBtn) {
      if (id) {
        delBtn.classList.remove('hidden');
        delBtn.onclick = () => this.deleteGoal(id);
      } else {
        delBtn.classList.add('hidden');
      }
    }
    
    const modal = document.getElementById('goalModal');
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.querySelector('div').classList.add('scale-100', 'opacity-100');
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
      }, 10);
    }
  }
  
  closeModal() {
    const modal = document.getElementById('goalModal');
    if (modal) {
      modal.querySelector('div').classList.remove('scale-100', 'opacity-100');
      modal.querySelector('div').classList.add('scale-95', 'opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    }
  }
  
  saveGoal() {
    const id = document.getElementById('goalId').value;
    const title = document.getElementById('goalTitle').value.trim();
    const targetRaw = document.getElementById('goalTarget').value;
    const target = Number(targetRaw.replace(/\D/g, '')) || 0;
    const currentRaw = document.getElementById('goalCurrent').value;
    const current = Number(currentRaw.replace(/\D/g, '')) || 0;
    const icon = document.getElementById('goalIcon').value.trim();
    
    if (!title || target <= 0) {
      Utils.notify('Vui lòng nhập tên mục tiêu và số tiền hợp lệ', 'error');
      return;
    }
    
    if (!this.app.data.savingsGoals) this.app.data.savingsGoals = [];
    
    if (id) {
      const idx = this.app.data.savingsGoals.findIndex(g => g.id === id);
      if (idx !== -1) {
        this.app.data.savingsGoals[idx] = {
          ...this.app.data.savingsGoals[idx],
          title, targetAmount: target, currentAmount: current, icon, updatedAt: new Date().toISOString()
        };
      }
    } else {
      this.app.data.savingsGoals.push({
        id: 'goal-' + Date.now(),
        title,
        targetAmount: target,
        currentAmount: current,
        icon: icon || 'fa-solid fa-star',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    this.app.save();
    this.render();
    this.closeModal();
    Utils.notify('Đã lưu mục tiêu!');
  }
  
  deleteGoal(id) {
    if (!confirm('Bạn có chắc muốn xóa mục tiêu này?')) return;
    
    this.app.data.savingsGoals = (this.app.data.savingsGoals || []).filter(g => g.id !== id);
    this.app.save();
    this.render();
    this.closeModal();
    Utils.notify('Đã xóa mục tiêu!');
  }
}
