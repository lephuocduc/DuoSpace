/**
 * DuoSpace Modules - Settings Tab Logic
 * v2.0: Thêm Alpha Vantage API key cho auto price fetch
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

    const fields = {
      setMunBreed:    s.munBreed   || '',
      setBongBreed:   s.bongBreed  || '',
      setNmaxPlate:   s.nmaxPlate  || '',
      setNmaxOdo:     s.nmaxOdo    || '',
      setGrandePlate: s.grandePlate || '',
      setGrandeOdo:   s.grandeOdo  || '',
    };

    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    // Alpha Vantage key (stored in localStorage, not in app data for security)
    const avKeyEl = document.getElementById('setAlphaVantageKey');
    if (avKeyEl) avKeyEl.value = localStorage.getItem('avApiKey') || '';
  }

  saveSettings() {
    this.app.data.settings = {
      munBreed:    (document.getElementById('setMunBreed')    || {}).value || '',
      bongBreed:   (document.getElementById('setBongBreed')   || {}).value || '',
      nmaxPlate:   (document.getElementById('setNmaxPlate')   || {}).value || '',
      nmaxOdo:     parseInt((document.getElementById('setNmaxOdo')   || {}).value) || 0,
      grandePlate: (document.getElementById('setGrandePlate') || {}).value || '',
      grandeOdo:   parseInt((document.getElementById('setGrandeOdo') || {}).value) || 0,
    };

    // Save API key to localStorage (separate from app data)
    const avKey = (document.getElementById('setAlphaVantageKey') || {}).value || '';
    if (avKey) {
      localStorage.setItem('avApiKey', avKey);
    } else {
      localStorage.removeItem('avApiKey');
    }

    this.app.save();
    this.app.render();
    alert('Đã cập nhật cài đặt thành công!');
  }
}

// Global aliases
function loadSettingsToForm() { window.app.settings.loadSettingsToForm(); }
function saveSettings() { window.app.settings.saveSettings(); }
