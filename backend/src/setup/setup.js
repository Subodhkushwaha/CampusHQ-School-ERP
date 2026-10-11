require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { globSync } = require('glob');
const fs = require('fs');
const { generate: uniqueId } = require('shortid');
const path = require('path');

const mongoose = require('mongoose');
const connectDB = require('../connectDB');

async function setupApp() {
  try {
    await connectDB();

    const isProduction = process.env.NODE_ENV === 'production';
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@admin.com';
    const adminPasswordPlain = process.env.INITIAL_ADMIN_PASSWORD || (isProduction ? null : 'CampusHQ@2026!');

    if (isProduction && !adminPasswordPlain) {
      console.error(
        'SECURITY ERROR: Cannot run initial setup in production without an explicit INITIAL_ADMIN_PASSWORD environment variable.\n' +
        'Please set INITIAL_ADMIN_PASSWORD in your production environment.'
      );
      process.exit(1);
    }

    const Admin = require('../models/coreModels/Admin');
    const AdminPassword = require('../models/coreModels/AdminPassword');

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin user with email '${adminEmail}' already exists. Setup skipped to prevent overwriting existing data.`);
      process.exit(0);
    }

    const newAdminPassword = new AdminPassword();
    const salt = uniqueId();
    const passwordHash = newAdminPassword.generateHash(salt, adminPasswordPlain);

    const demoAdmin = {
      email: adminEmail,
      name: 'CampusHQ',
      surname: 'Administrator',
      enabled: true,
      role: 'owner',
    };
    const result = await new Admin(demoAdmin).save();

    const AdminPasswordData = {
      password: passwordHash,
      emailVerified: true,
      salt: salt,
      user: result._id,
    };
    await new AdminPassword(AdminPasswordData).save();

    console.log(`Initial Owner Admin created successfully (${adminEmail})`);

    const Setting = require('../models/coreModels/Setting');
    const existingSettings = await Setting.countDocuments();
    if (existingSettings === 0) {
      const settingFiles = [];
      const defaultSettingsDir = path.resolve(__dirname, './defaultSettings');
      const settingsFiles = globSync(path.join(defaultSettingsDir, '**/*.json').replace(/\\/g, '/'));

      for (const filePath of settingsFiles) {
        const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        settingFiles.push(...file);
      }

      if (settingFiles.length > 0) {
        await Setting.insertMany(settingFiles);
        console.log('Default system settings initialized.');
      }
    }

    const PaymentMode = require('../models/appModels/PaymentMode');
    const Taxes = require('../models/appModels/Taxes');

    const taxCount = await Taxes.countDocuments();
    if (taxCount === 0) {
      await Taxes.insertMany([{ taxName: 'Tax 0%', taxValue: '0', isDefault: true }]);
      console.log('Default taxes configured.');
    }

    const modeCount = await PaymentMode.countDocuments();
    if (modeCount === 0) {
      await PaymentMode.insertMany([
        {
          name: 'Default Payment',
          description: 'Default Payment Mode (Cash, Bank Transfer, Online)',
          isDefault: true,
        },
      ]);
      console.log('Default payment mode configured.');
    }

    console.log('CampusHQ ERP initial setup completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Setup failed with error:');
    console.error(e.message);
    process.exit(1);
  }
}

setupApp();
