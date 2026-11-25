const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockElement, createSandbox, loadScripts } = require('./helpers/loadScript');

function setupCloudSync(mockFetch) {
  const elements = {
    cloudSyncStatus: createMockElement('cloudSyncStatus')
  };
  const ctx = createSandbox({ elements, fetch: mockFetch });
  loadScripts(ctx, ['js/config.js', 'js/utils.js', 'js/storage.js', 'js/modules/cloudSync.js']);

  ctx.authManager = {
    matchedProfile: { code: 'Đ' },
    async getIdToken() { return 'mock-id-token'; }
  };

  const storage = new ctx.Storage();
  const sync = new ctx.CloudSync(storage);
  ctx.app = { data: storage.getData(), render() {} };
  return { ctx, storage, sync };
}

test('pullFromCloud pushes pending local notes instead of overwriting them on refresh', async () => {
  const calls = [];
  const { storage, sync } = setupCloudSync(async (url, opts) => {
    calls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });
    return {
      ok: true,
      status: 200,
      headers: { get() { return null; } },
      async json() { return { success: true, version: 2 }; }
    };
  });

  // Simulate user saving a note and refreshing before debounce fires
  const data = storage.getData();
  data.notes = [{ id: 'note-1', title: 'Wifi nhà', content: '12345678' }];
  storage.save(data);
  sync._setPendingPush(true);

  const result = await sync.pullFromCloud(false);
  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.notes.length, 1);
  assert.equal(calls[0].body.notes[0].title, 'Wifi nhà');
  assert.equal(sync.hasPendingPush, false);
});

test('pullFromCloud preserves local notes if cloud response omits notes field', async () => {
  const { storage, sync } = setupCloudSync(async () => ({
    ok: true,
    status: 200,
    headers: { get() { return null; } },
    async json() {
      return {
        success: true,
        version: 5,
        data: { usdRate: 25400, todos: [] } // older worker without notes field
      };
    }
  }));

  const data = storage.getData();
  data.notes = [{ id: 'note-2', title: 'Ghi chú quan trọng', content: 'Nội dung' }];
  storage.save(data);

  await sync.pullFromCloud(true);
  assert.equal(storage.getData().notes.length, 1);
  assert.equal(storage.getData().notes[0].title, 'Ghi chú quan trọng');
});

test('pullFromCloud discards stale pending push (> 5 min) and pulls fresh Cloud data instead', async () => {
  const calls = [];
  const { storage, sync } = setupCloudSync(async (url, opts) => {
    calls.push({ url, method: opts.method });
    return {
      ok: true,
      status: 200,
      headers: { get() { return null; } },
      async json() {
        return {
          success: true,
          version: 10,
          data: { usdRate: 25400, todos: [{ id: 't1', title: 'Cloud todo' }], investments: [] }
        };
      }
    };
  });

  // Simulate an old session from 1 hour ago with pending flag stuck in localStorage
  sync._setPendingPush(true);
  sync.pendingPushAt = Date.now() - (60 * 60 * 1000);

  const result = await sync.pullFromCloud(false);
  assert.equal(result, true);
  assert.equal(calls.some(c => c.method === 'POST'), false, 'Stale session must NOT POST over Cloud');
  assert.equal(sync.hasPendingPush, false);
  assert.equal(storage.getData().todos[0].title, 'Cloud todo');
});

test('pullFromCloud discards pending push if Cloud already has a newer version from another device', async () => {
  const calls = [];
  const { storage, sync } = setupCloudSync(async (url, opts) => {
    calls.push({ url, method: opts.method });
    if (url.includes('/api/sync/check')) {
      return {
        ok: true,
        status: 200,
        headers: { get() { return null; } },
        async json() { return { success: true, changed: true, version: 20 }; }
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get() { return null; } },
      async json() {
        return {
          success: true,
          version: 20,
          data: { usdRate: 25400, todos: [{ id: 't2', title: 'Newer device todo' }], investments: [] }
        };
      }
    };
  });

  sync.localVersion = 15;
  sync._setPendingPush(true);

  const result = await sync.pullFromCloud(false);
  assert.equal(result, true);
  assert.equal(calls.some(c => c.method === 'POST'), false, 'Older localVersion must NOT overwrite newer Cloud version');
  assert.equal(sync.hasPendingPush, false);
  assert.equal(storage.getData().todos[0].title, 'Newer device todo');
});
