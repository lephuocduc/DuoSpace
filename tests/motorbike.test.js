const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockElement, createSandbox, loadScripts } = require('./helpers/loadScript');

function setupMotorbike() {
  const elements = {
    bikeMaintenanceForm: createMockElement('bikeMaintenanceForm'),
    maintBikeName: createMockElement('maintBikeName', { value: 'NMAX' }),
    maintTitleSelect: createMockElement('maintTitleSelect', { value: 'Lọc bụi nồi' }),
    maintCustomTitleRow: createMockElement('maintCustomTitleRow', { classes: ['hidden'] }),
    maintCustomTitle: createMockElement('maintCustomTitle'),
    maintOdo: createMockElement('maintOdo', { value: '15000' }),
    maintCost: createMockElement('maintCost', { value: '120000' }),
    maintDate: createMockElement('maintDate', { value: '2026-11-24' }),
    bikeMaintenanceList: createMockElement('bikeMaintenanceList'),
    partsModalTitle: createMockElement('partsModalTitle'),
    partsModalOdo: createMockElement('partsModalOdo'),
    partsModalList: createMockElement('partsModalList')
  };

  const ctx = createSandbox({ elements });
  loadScripts(ctx, ['js/config.js', 'js/utils.js', 'js/modules/motorbike.js']);

  const app = {
    data: {
      settings: { nmaxOdo: 14850, grandeOdo: 8200 },
      bikeMaintenances: [],
      expenses: []
    },
    save() {},
    render() {},
    renderCategoryList() {},
    log: { system() {} }
  };
  ctx.app = app;
  const moto = new ctx.MotorbikeModule(app);
  app.motorbike = moto;
  return { ctx, app, moto, elements };
}

test('getPartsCatalog includes Lọc bụi nồi and does not collide with belt_roller keywords', () => {
  const { moto } = setupMotorbike();
  const catalog = moto.getPartsCatalog();
  const dustFilter = catalog.find(p => p.id === 'cvt_dust_filter');
  const beltRoller = catalog.find(p => p.id === 'belt_roller');

  assert.ok(dustFilter, 'cvt_dust_filter should exist in catalog');
  assert.equal(dustFilter.name, 'Lọc bụi nồi (CVT Dust Filter)');
  assert.ok(dustFilter.keywords.some(k => 'lọc bụi nồi'.includes(k)));
  assert.equal(beltRoller.keywords.some(k => 'lọc bụi nồi'.includes(k)), false);
});

test('saveBikeMaintenance saves Lọc bụi nồi and updates bike ODO', () => {
  const { app, moto, elements } = setupMotorbike();
  elements.maintBikeName.value = 'NMAX';
  elements.maintTitleSelect.value = 'Lọc bụi nồi';
  elements.maintOdo.value = '15500';
  elements.maintCost.value = '120000';
  elements.maintDate.value = '2026-11-24';

  moto.saveBikeMaintenance();
  assert.equal(app.data.bikeMaintenances.length, 1);
  assert.equal(app.data.bikeMaintenances[0].title, 'Lọc bụi nồi');
  assert.equal(app.data.settings.nmaxOdo, 15500);
});
