const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const firebase = require('../firebase-admin-init');
const auth = require('../middleware/auth');

test('only active-season admins can update a shared fine favorite', async (t) => {
  const fine = { amount: 10, playerId: 'player', ruleId: 'rule' };
  const db = {
    collection(name) {
      assert.equal(name, 'seasons');
      return {
        doc(seasonId) {
          return {
            get: async () => ({ exists: true, id: seasonId, data: () => ({ active: seasonId === 'active' }) }),
            collection(collection) {
              return {
                doc(id) {
                  if (collection === 'players') {
                    return { get: async () => ({ exists: true, id, data: () => ({ roles: id === 'admin' ? ['ADMIN'] : [] }) }) };
                  }
                  if (collection === 'participationResponses') {
                    return { get: async () => ({ data: () => ({ participating: true }) }) };
                  }
                  assert.equal(collection, 'fines');
                  return {
                    update: async (data) => {
                      if (id !== 'fine') throw Object.assign(new Error('not found'), { code: 5 });
                      Object.assign(fine, data);
                    }
                  };
                },
                get: async () => ({
                  docs: collection === 'fines'
                    ? [{ id: 'fine', data: () => ({ ...fine }) }]
                    : []
                })
              };
            }
          };
        }
      };
    }
  };
  mock.method(firebase, 'getDb', () => db);
  mock.method(auth, 'verifyToken', (req, res, next) => {
    if (!req.headers.authorization) return res.sendStatus(401);
    req.user = { uid: req.headers.authorization };
    next();
  });

  const app = express();
  app.use(express.json());
  app.use('/api/seasons', require('../routes/seasons'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    mock.restoreAll();
  });
  const url = `http://127.0.0.1:${server.address().port}/api/seasons`;
  const put = (season, id, user, favorite) => fetch(`${url}/${season}/fines/${id}/favorite`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: user } : {}) },
    body: JSON.stringify({ favorite })
  });

  assert.equal((await put('active', 'fine', '', true)).status, 401);
  assert.equal((await put('active', 'fine', 'player', true)).status, 403);
  assert.equal((await put('inactive', 'fine', 'admin', true)).status, 403);
  assert.equal((await put('active', 'fine', 'admin', 'true')).status, 400);
  assert.equal((await put('active', 'missing', 'admin', true)).status, 404);
  assert.equal(fine.favorite, undefined);

  let response = await put('active', 'fine', 'admin', true);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { favorite: true });
  response = await fetch(`${url}/active/fines`, { headers: { Authorization: 'player' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].favorite, true);

  response = await put('active', 'fine', 'admin', false);
  assert.equal(response.status, 200);
  assert.equal(fine.favorite, false);
  assert.equal(fine.amount, 10);
});
