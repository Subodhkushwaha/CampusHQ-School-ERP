const { describe, it } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { permit } = require('../src/middlewares/rbacMiddleware');
const errorHandlers = require('../src/handlers/errorHandlers');

describe('Security: Authentication & Token Verification', () => {
  const secret = 'test_secret_for_campushq_2026';

  it('correctly signs and verifies valid JWT tokens', () => {
    const payload = { id: '6acbb58c290caa175efe3b12', role: 'owner' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const verified = jwt.verify(token, secret);
    assert.strictEqual(verified.id, payload.id);
    assert.strictEqual(verified.role, payload.role);
  });

  it('rejects tampered or forged JWT tokens', () => {
    const payload = { id: '6acbb58c290caa175efe3b12', role: 'owner' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const wrongSecret = 'wrong_secret_key_attacker';
    assert.throws(() => {
      jwt.verify(token, wrongSecret);
    });
  });

  it('rejects expired JWT tokens', () => {
    const payload = { id: '6acbb58c290caa175efe3b12' };
    const expiredToken = jwt.sign(payload, secret, { expiresIn: '-1s' });
    assert.throws(() => {
      jwt.verify(expiredToken, secret);
    }, (err) => err.name === 'TokenExpiredError');
  });

  it('securely hashes and compares passwords with unique salts', async () => {
    const salt = 'uniqueSalt123';
    const plainPassword = 'CorrectPassword@2026';
    const hash = await bcrypt.hash(salt + plainPassword, 10);

    const isMatch = await bcrypt.compare(salt + plainPassword, hash);
    assert.strictEqual(isMatch, true);

    const wrongMatch = await bcrypt.compare(salt + 'WrongPassword', hash);
    assert.strictEqual(wrongMatch, false);
  });
});

describe('Security: Role-Based Access Control (RBAC)', () => {
  it('allows owner role to bypass all checks', (done) => {
    const req = { admin: { role: 'owner', _id: '123' } };
    let nextCalled = false;
    const res = {};

    const middleware = permit('principal', 'teacher');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('allows user with permitted role to proceed', () => {
    const req = { admin: { role: 'teacher', _id: '123' } };
    let nextCalled = false;
    const res = {};

    const middleware = permit('admin', 'teacher');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('returns 403 Forbidden when user role is not permitted', () => {
    const req = { admin: { role: 'student', _id: '456' } };
    let statusSet = null;
    let jsonResult = null;
    const res = {
      status(code) {
        statusSet = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    const middleware = permit('admin', 'accountant');
    middleware(req, res, () => {
      assert.fail('next() should not be called for unauthorized role');
    });

    assert.strictEqual(statusSet, 403);
    assert.strictEqual(jsonResult.success, false);
    assert.match(jsonResult.message, /Access denied/);
  });

  it('returns 401 Unauthorized when request has no authenticated user', () => {
    const req = {};
    let statusSet = null;
    let jsonResult = null;
    const res = {
      status(code) {
        statusSet = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    const middleware = permit('admin');
    middleware(req, res, () => {
      assert.fail('next() should not be called when unauthenticated');
    });

    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonResult.success, false);
  });
});

describe('Error Handling: Status Code & Cast Mapping', () => {
  it('maps CastError to 400 Bad Request with field name', async () => {
    const badHandler = async () => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      err.path = 'student';
      throw err;
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(c) {
        statusCode = c;
        return this;
      },
      json(b) {
        responseBody = b;
        return this;
      },
    };

    const wrapped = errorHandlers.catchErrors(badHandler);
    await wrapped({}, res, () => {});

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseBody.success, false);
    assert.match(responseBody.message, /Invalid ID format/);
  });

  it('maps duplicate key (11000) to 409 Conflict', async () => {
    const dupHandler = async () => {
      const err = new Error('E11000 duplicate key error');
      err.code = 11000;
      throw err;
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(c) {
        statusCode = c;
        return this;
      },
      json(b) {
        responseBody = b;
        return this;
      },
    };

    const wrapped = errorHandlers.catchErrors(dupHandler);
    await wrapped({}, res, () => {});

    assert.strictEqual(statusCode, 409);
    assert.strictEqual(responseBody.success, false);
  });
});
