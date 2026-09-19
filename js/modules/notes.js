/**
 * DuoSpace - Shared Notes Module
 */
class NotesModule {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('notesContainer');
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
    
    // Sort by updated at
    const sorted = [...notes].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    sorted.forEach(note => {
      const contentSnippet = note.content ? (note.content.length > 250 ? note.content.substring(0, 250) + '...' : note.content) : '';
      
      html += `
        <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-4 rounded-2xl cursor-pointer hover:shadow-md transition-shadow flex flex-col h-full relative group" onclick="window.app.notes.openModal('${note.id}')">
          <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="event.stopPropagation(); window.app.notes.openModal('${note.id}')" class="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm text-amber-600 flex items-center justify-center hover:bg-amber-100">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
          </div>
          <h4 class="font-bold text-gray-800 dark:text-gray-200 mb-2 truncate pr-10">${note.title}</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap flex-1 line-clamp-4">${contentSnippet}</p>
          <div class="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/50 flex justify-between items-center text-xs text-gray-400 dark:text-slate-500">
            <span><i class="fa-regular fa-clock mr-1"></i> ${Utils.formatDate(note.updatedAt || note.createdAt)}</span>
            <button onclick="event.stopPropagation(); window.app.notes.copyNote('${note.id}')" class="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
              <i class="fa-regular fa-copy"></i> Copy
            </button>
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
          title, content, updatedAt: new Date().toISOString()
        };
      }
    } else {
      this.app.data.notes.push({
        id: 'note-' + Date.now(),
        title, content,
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
