/**
 * DuoSpace Modules - Settings Tab Logic
 * Settings are intentionally minimal; vehicle and pet data are managed in
 * their own sections of the app.
 */
class SettingsModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.loadSettingsToForm();
  }

  loadSettingsToForm() {
    // Kept for backwards compatibility with the app initializer.
  }

  saveSettings() {
    // Kept as a harmless global alias for old inline handlers.
  }
}

// Global aliases
function loadSettingsToForm() { window.app.settings.loadSettingsToForm(); }
function saveSettings() { window.app.settings.saveSettings(); }
