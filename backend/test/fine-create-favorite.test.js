const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const firebase = require('../firebase-admin-init');

test('creating fines applies the favorite choice to every selected player', async (t) => {
  const saved = [];
  let nextId = 0;
  const db = {
    collection: () => ({
      doc: () => ({
        collection: name => ({
          doc: id => {
            if (name === 'players') return { get: async () => ({ exists: true, data: () => ({ firstName: id }) }) };
            if (name === 'rules') return { get: async () => ({ exists: true, data: () => ({ label: 'Rule' }) }) };
            return { id: String(++nextId) };
          }
        })
      })
    }),
    batch: () => ({
      set: (ref, payload) => saved.push({ ref, payload }),
      commit: async () => {}
    })
  };
  mock.method(firebase, 'getDb', () => db);
  t.after(() => mock.restoreAll());
  const { createFine } = require('../services/fines');

  await createFine('season', { ruleId: 'rule', favorite: true }, ['one', 'two']);
  assert.deepEqual(saved.map(item => item.payload.favorite), [true, true]);
  saved.length = 0;
  await createFine('season', { ruleId: 'rule' }, ['one']);
  assert.equal(saved[0].payload.favorite, false);
});
