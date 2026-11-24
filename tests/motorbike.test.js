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

test('saveBikeMaintenance allows empty cost (defaults to 0)', () => {
  const { ctx, app, moto, elements } = setupMotorbike();
  elements.maintBikeName.value = 'Grande';
  elements.maintTitleSelect.value = 'Lọc bụi nồi';
  elements.maintOdo.value = '9000';
  elements.maintCost.value = '';
  elements.maintDate.value = '2026-11-24';

  moto.saveBikeMaintenance();
  assert.equal(ctx._alerts.length, 0);
  assert.equal(app.data.bikeMaintenances.length, 1);
  assert.equal(app.data.bikeMaintenances[0].cost, 0);
});

test('saveBikeMaintenance parses dot-formatted ODO and cost values', () => {
  const { ctx, app, moto, elements } = setupMotorbike();
  elements.maintBikeName.value = 'NMAX';
  elements.maintTitleSelect.value = 'Thay nhớt máy';
  elements.maintOdo.value = '16.500';
  elements.maintCost.value = '350.000';
  elements.maintDate.value = '2026-11-24';

  moto.saveBikeMaintenance();
  assert.equal(ctx._alerts.length, 0);
  assert.equal(app.data.bikeMaintenances[0].odo, 16500);
  assert.equal(app.data.bikeMaintenances[0].cost, 350000);
  assert.equal(app.data.settings.nmaxOdo, 16500);
});

test('renderMaintenanceList sorts newest date first and filters by NMAX / Grande', () => {
  const { app, moto, elements } = setupMotorbike();
  app.data.bikeMaintenances = [
    { id: '1', bike: 'NMAX', title: 'Cũ nhất', odo: 10000, cost: 200000, date: '2026-01-10T12:00:00.000Z' },
    { id: '2', bike: 'Grande', title: 'Mới nhất', odo: 8500, cost: 0, date: '2026-11-24T12:00:00.000Z' },
    { id: '3', bike: 'NMAX', title: 'Giữa', odo: 12000, cost: 150000, date: '2026-06-15T12:00:00.000Z' }
  ];

  moto.renderMaintenanceList();
  const htmlAll = elements.bikeMaintenanceList.innerHTML;
  assert.ok(htmlAll.indexOf('Mới nhất') < htmlAll.indexOf('Giữa'));
  assert.ok(htmlAll.indexOf('Giữa') < htmlAll.indexOf('Cũ nhất'));

  moto.filterMaintenanceBike('NMAX');
  const htmlNmax = elements.bikeMaintenanceList.innerHTML;
  assert.ok(htmlNmax.includes('Giữa'));
  assert.ok(htmlNmax.includes('Cũ nhất'));
  assert.equal(htmlNmax.includes('Mới nhất'), false);

  moto.filterMaintenanceBike('Grande');
  const htmlGrande = elements.bikeMaintenanceList.innerHTML;
  assert.ok(htmlGrande.includes('Mới nhất'));
  assert.equal(htmlGrande.includes('Giữa'), false);
});
