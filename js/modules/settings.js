/**
 * DuoSpace Modules - Settings Tab Logic
 */
class SettingsModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.loadSettingsToForm();
  }

  loadSettingsToForm() {
    const s = this.app.data.settings || {};
    const munBreed = document.getElementById('setMunBreed');
    if (munBreed) munBreed.value = s.munBreed || '';

    const bongBreed = document.getElementById('setBongBreed');
    if (bongBreed) bongBreed.value = s.bongBreed || '';

    const nmaxPlate = document.getElementById('setNmaxPlate');
    if (nmaxPlate) nmaxPlate.value = s.nmaxPlate || '';

    const nmaxOdo = document.getElementById('setNmaxOdo');
    if (nmaxOdo) nmaxOdo.value = s.nmaxOdo || '';

    const grandePlate = document.getElementById('setGrandePlate');
    if (grandePlate) grandePlate.value = s.grandePlate || '';

    const grandeOdo = document.getElementById('setGrandeOdo');
    if (grandeOdo) grandeOdo.value = s.grandeOdo || '';
  }

  saveSettings() {
    this.app.data.settings = {
      munBreed: (document.getElementById('setMunBreed') || {}).value || '',
      bongBreed: (document.getElementById('setBongBreed') || {}).value || '',
      nmaxPlate: (document.getElementById('setNmaxPlate') || {}).value || '',
      nmaxOdo: parseInt((document.getElementById('setNmaxOdo') || {}).value) || 0,
      grandePlate: (document.getElementById('setGrandePlate') || {}).value || '',
      grandeOdo: parseInt((document.getElementById('setGrandeOdo') || {}).value) || 0
    };

    this.app.save();
    this.app.render();
    alert('Đã cập nhật cài đặt thành công!');
  }
}

// Global aliases for compatibility
function loadSettingsToForm() { window.app.settings.loadSettingsToForm(); }
function saveSettings() { window.app.settings.saveSettings(); }
