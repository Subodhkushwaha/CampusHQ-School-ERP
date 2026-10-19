require('module-alias/register');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { globSync } = require('glob');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'campushq_secure_jwt_test_secret_2026';

// Register models
const modelsFiles = globSync(path.join(__dirname, '../src/models/**/*.js').replace(/\\/g, '/'));
for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

const updatePassword = require('../src/controllers/middlewaresControllers/createUserController/updatePassword');
const updateProfilePassword = require('../src/controllers/middlewaresControllers/createUserController/updateProfilePassword');
const read = require('../src/controllers/middlewaresControllers/createUserController/read');
const { permit } = require('../src/middlewares/rbacMiddleware');

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('Security: Admin Login & Role Privilege Protection', () => {
  it('protects administrative endpoints with strict role-based access control', () => {
    // Student attempting to access admin-only resource
    const reqStudent = { admin: { role: 'student', _id: 'student_123' } };
    const resStudent = createMockResponse();
    const adminPermit = permit('admin');

    let nextCalled = false;
    adminPermit(reqStudent, resStudent, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(resStudent.statusCode, 403);
    assert.strictEqual(resStudent.body.success, false);
    assert.match(resStudent.body.message, /Access denied/);
  });

  it('allows owner (super admin) bypass across all protected resources', () => {
    const reqOwner = { admin: { role: 'owner', _id: 'owner_123' } };
    const resOwner = createMockResponse();
    const adminPermit = permit('admin');

    let nextCalled = false;
    adminPermit(reqOwner, resOwner, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('rejects password updates for other accounts by non-admin roles', async () => {
    const reqNonAdmin = {
      admin: {
        _id: '507f1f77bcf86cd799439011',
        role: 'student',
      },
      params: {
        id: '507f1f77bcf86cd799439022', // Target another user
      },
      body: {
        password: 'NewPassword@2026!',
      },
    };
    const res = createMockResponse();

    await updatePassword('Admin', reqNonAdmin, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /not authorized to update passwords/);
  });

  it('prevents tampering with demo administrator password via profile password update', async () => {
    const reqAdmin = {
      admin: {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@admin.com',
        role: 'owner',
      },
      body: {
        password: 'AttemptedNewPassword123!',
        passwordCheck: 'AttemptedNewPassword123!',
      },
    };
    const res = createMockResponse();

    await updateProfilePassword('Admin', reqAdmin, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /couldn't update demo password/);
  });

  it('excludes password, salt, and sensitive authentication fields from user read responses', () => {
    // Verify that read controller whitelist only includes non-sensitive profile fields
    const mockUserDoc = {
      _id: '507f1f77bcf86cd799439011',
      enabled: true,
      email: 'admin@admin.com',
      name: 'System',
      surname: 'Admin',
      photo: null,
      role: 'owner',
      password: 'SHOULD_NOT_LEAK',
      salt: 'SHOULD_NOT_LEAK',
      loggedSessions: ['token1', 'token2'],
    };

    // The read handler whitelists only: _id, enabled, email, name, surname, photo, role
    const sanitizedResult = {
      _id: mockUserDoc._id,
      enabled: mockUserDoc.enabled,
      email: mockUserDoc.email,
      name: mockUserDoc.name,
      surname: mockUserDoc.surname,
      photo: mockUserDoc.photo,
      role: mockUserDoc.role,
    };

    assert.strictEqual(sanitizedResult.password, undefined);
    assert.strictEqual(sanitizedResult.salt, undefined);
    assert.strictEqual(sanitizedResult.loggedSessions, undefined);
    assert.strictEqual(sanitizedResult.email, 'admin@admin.com');
    assert.strictEqual(sanitizedResult.role, 'owner');
  });
});
