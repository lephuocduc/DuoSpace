/**
 * DuoSpace - Shared Notes Module
 */
class NotesModule {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('notesContainer');
    this.revealedNotes = new Set();
    this.searchQuery = '';
  }

  search(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.render();
  }

  toggleReveal(id) {
    if (this.revealedNotes.has(id)) {
      this.revealedNotes.delete(id);
    } else {
      this.revealedNotes.add(id);
    }
    this.render();
  }

  render() {
    this.container = document.getElementById('notesContainer');
    if (!this.container) return;
    
    const notes = this.app.data.notes || [];
    
    if (notes.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-10 text-gray-400 dark:text-slate-500">
          <i class="fa-regular fa-note-sticky text-5xl mb-3 opacity-30"></i>
          <p class="text-sm">Chưa có ghi chú nào.</p>
        </div>
      `;
      return;
    }
    
    // Sort by updated at & filter by search query
    let sorted = [...notes].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    if (this.searchQuery) {
      sorted = sorted.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(this.searchQuery);
        const contentMatch = !n.sensitive && (n.content || '').toLowerCase().includes(this.searchQuery);
        return titleMatch || contentMatch;
      });
    }
    if (sorted.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-8 text-gray-400 dark:text-slate-500">
          <i class="fa-solid fa-magnifying-glass text-2xl mb-2 opacity-40"></i>
          <p class="text-xs">Không tìm thấy ghi chú phù hợp.</p>
        </div>
      `;
      return;
    }
    
    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">';
    sorted.forEach(note => {
      const isSensitive = Boolean(note.sensitive);
      const isRevealed = this.revealedNotes.has(note.id);
      const safeTitle = Utils.escapeHtml(note.title || '');
      const rawContent = note.content || '';
      const contentSnippet = rawContent.length > 160 ? rawContent.substring(0, 160) + '...' : rawContent;
      const safeContent = Utils.escapeHtml(contentSnippet);
      const contentHtml = (isSensitive && !isRevealed)
        ? `<p class="text-xs text-amber-600/80 dark:text-amber-400/80 tracking-widest select-none flex-1 flex items-center gap-1.5 py-1"><i class="fa-solid fa-lock text-[10px]"></i>••••••••••••</p>`
        : `<p class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap flex-1 line-clamp-3 leading-relaxed">${safeContent}</p>`;
      const eyeBtnHtml = isSensitive
        ? `<button onclick="event.stopPropagation(); window.app.notes.toggleReveal('${note.id}')" title="${isRevealed ? 'Ẩn nội dung' : 'Hiện nội dung'}" class="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium px-1.5 py-0.5 rounded hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-colors">
             <i class="fa-regular ${isRevealed ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isRevealed ? 'Ẩn' : 'Hiện'}
           </button>`
        : '';

      html += `
        <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-3 rounded-xl cursor-pointer hover:shadow-md transition-shadow flex flex-col h-full relative group" onclick="window.app.notes.openModal('${note.id}')">
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="event.stopPropagation(); window.app.notes.openModal('${note.id}')" class="w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-sm text-amber-600 flex items-center justify-center hover:bg-amber-100">
              <i class="fa-solid fa-pen text-[10px]"></i>
            </button>
          </div>
          <h4 class="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 truncate pr-7">${safeTitle}</h4>
          ${contentHtml}
          <div class="mt-2.5 pt-2 border-t border-amber-200/50 dark:border-amber-800/50 flex justify-between items-center text-[11px] text-gray-400 dark:text-slate-500 gap-1">
            <span class="truncate"><i class="fa-regular fa-clock mr-1"></i>${Utils.formatDate(note.updatedAt || note.createdAt)}</span>
            <div class="flex items-center gap-1 shrink-0">
              ${eyeBtnHtml}
              <button onclick="event.stopPropagation(); window.app.notes.copyNote('${note.id}')" class="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                <i class="fa-regular fa-copy"></i> Copy
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    this.container.innerHTML = html;
  }
  
  openModal(id = null) {
    let note = null;
    if (id) {
      note = (this.app.data.notes || []).find(n => n.id === id);
    }
    
    document.getElementById('noteId').value = id || '';
    document.getElementById('noteTitle').value = note ? note.title : '';
    document.getElementById('noteContent').value = note ? note.content : '';
    const sensitiveEl = document.getElementById('noteSensitive');
    if (sensitiveEl) sensitiveEl.checked = Boolean(note && note.sensitive);
    
    const delBtn = document.getElementById('deleteNoteBtn');
    if (delBtn) {
      if (id) {
        delBtn.classList.remove('hidden');
        delBtn.onclick = () => this.deleteNote(id);
      } else {
        delBtn.classList.add('hidden');
      }
    }
    
    const modal = document.getElementById('noteModal');
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.querySelector('div').classList.add('scale-100', 'opacity-100');
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
        if (!id) document.getElementById('noteTitle').focus();
      }, 10);
    }
  }
  
  closeModal() {
    const modal = document.getElementById('noteModal');
    if (modal) {
      modal.querySelector('div').classList.remove('scale-100', 'opacity-100');
      modal.querySelector('div').classList.add('scale-95', 'opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    }
  }
  
  saveNote() {
    const id = document.getElementById('noteId').value;
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const sensitive = Boolean(document.getElementById('noteSensitive')?.checked);
    
    if (!title) {
      Utils.notify('Vui lòng nhập tiêu đề ghi chú', 'error');
      return;
    }
    
    if (!this.app.data.notes) this.app.data.notes = [];
    
    if (id) {
      const idx = this.app.data.notes.findIndex(n => n.id === id);
      if (idx !== -1) {
        this.app.data.notes[idx] = {
          ...this.app.data.notes[idx],
          title, content, sensitive, updatedAt: new Date().toISOString()
        };
      }
    } else {
      this.app.data.notes.push({
        id: 'note-' + Date.now(),
        title, content, sensitive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    this.app.save();
    this.render();
    this.closeModal();
    Utils.notify('Đã lưu ghi chú!');
  }
  
  deleteNote(id) {
    if (!confirm('Xóa ghi chú này?')) return;
    this.app.data.notes = (this.app.data.notes || []).filter(n => n.id !== id);
    this.app.save();
    this.render();
    this.closeModal();
    Utils.notify('Đã xóa ghi chú!');
  }
  
  async copyNote(id) {
    const note = (this.app.data.notes || []).find(n => n.id === id);
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note.content);
      Utils.notify('Đã copy nội dung!');
    } catch (e) {
      Utils.notify('Không thể copy', 'error');
    }
  }
}
