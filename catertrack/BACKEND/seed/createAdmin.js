const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const username = 'admin';
const password = 'admin1234';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  let user = await User.findOne({ username });

  if (user) {
    user.password = password;
    user.isActive = true;
    user.role = 'admin';
    await user.save();
    console.log('Admin account updated.');
  } else {
    await User.create({
      name: 'Administrator',
      username,
      email: 'admin@catertrack.local',
      password,
      role: 'admin',
      canRecordPayments: true
    });
    console.log('Admin account created.');
  }

  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});