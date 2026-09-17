/**
 * DuoSpace UI - Sidebar Controller
 */
const SidebarManager = {
  isOpen: false,

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    if (!this.isOpen) {
      this.isOpen = true;
      if (typeof Utils !== 'undefined' && Utils.lockScroll) {
        Utils.lockScroll();
      }
    }
  },

  close() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('opacity-0', 'pointer-events-none');
    if (this.isOpen) {
      this.isOpen = false;
      if (typeof Utils !== 'undefined' && Utils.unlockScroll) {
        Utils.unlockScroll();
      }
    }
  }
};

function toggleSidebar() {
  SidebarManager.toggle();
}
