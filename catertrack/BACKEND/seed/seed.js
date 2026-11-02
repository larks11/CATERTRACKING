const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Customer = require('../models/Customer');
const Package = require('../models/Package');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const Task = require('../models/Task');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/catertrack_db';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing data...');
    await Task.deleteMany({});
    await Payment.deleteMany({});
    await Reservation.deleteMany({});
    await Package.deleteMany({});
    await Customer.deleteMany({});
    await User.deleteMany({});

    console.log('Seeding users...');
    const adminUser = await User.create({
      name: 'Admin General Manager',
      username: 'admin',
      email: 'admin@granddelights.ph',
      password: 'AdminPassword123!',
      role: 'admin',
      canRecordPayments: true,
      isActive: true
    });

    const staffMaria = await User.create({
      name: 'Maria Santos',
      username: 'staff_maria',
      email: 'maria.santos@granddelights.ph',
      password: 'StaffPassword123!',
      role: 'staff',
      canRecordPayments: true,
      isActive: true
    });

    const staffJuan = await User.create({
      name: 'Juan Dela Cruz',
      username: 'staff_juan',
      email: 'juan.delacruz@granddelights.ph',
      password: 'StaffPassword123!',
      role: 'staff',
      canRecordPayments: false,
      isActive: true
    });

    console.log('Seeding customers...');
    const customer1 = await Customer.create({
      fullName: 'Clarisse Mendoza',
      contactNumber: '0922-334-7711',
      email: 'clarisse.mendoza@gmail.com',
      address: '12-A Salinas Drive, Lahug, Cebu City',
      notes: 'Bride for upcoming wedding reception. Requires elegant presentation and champagne glasses.'
    });

    const customer2 = await Customer.create({
      fullName: 'Atty. Roberto Tan',
      contactNumber: '0917-555-8899',
      email: 'roberto.tan@cebulaw.ph',
      address: 'Gov. Cuenco Ave, Banilad, Cebu City',
      notes: 'Prefers VIP table setup and wine service for 60th birthday celebration.'
    });

    const customer3 = await Customer.create({
      fullName: 'Engr. Mateo Alcantara',
      contactNumber: '0918-123-4567',
      email: 'mateo.alcantara@apexcorp.com.ph',
      address: 'Tower 2, Cebu Business Park, Cebu City',
      notes: 'Corporate client. Invoices must include official business registration TIN.'
    });

    console.log('Seeding catering packages...');
    const pkgBuffet = await Package.create({
      name: 'Classic Cebu Fiesta Buffet',
      description: 'Authentic celebration favorites including Boneless Lechon Belly, Chicken Inasal, Seafood Kare-Kare, Pancit Canton, and Mango Float.',
      inclusions: [
        'Complete buffet table setup with themed linen skirting and floral centerpiece',
        'Stainless roll-top chafing dishes with warmers',
        'Complete porcelain dinnerware, silverware and goblet glassware',
        'Uniformed waitstaff and banquet captain',
        'Purified drinking water and bottomless chilled iced tea bar'
      ],
      pricingType: 'per_head',
      price: 450,
      isActive: true
    });

    const pkgWedding = await Package.create({
      name: 'Grand Wedding Elegance Banquet',
      description: 'Exquisite multi-course banquet featuring Roast Beef Tenderloin, Garlic Butter Tiger Prawns, Parmesan Baked White Fish, and Dessert Grazing Table.',
      inclusions: [
        'Luxury presidential and bridal couple floral arch styling',
        'Gold Tiffany chairs with plush white leather cushions',
        'Welcome fruit mocktails and sparkling wine for toast',
        'Dedicated bridal concierge assistant and captain waitstaff',
        'Tiered cake table and ceremonial champagne fountain setup'
      ],
      pricingType: 'per_head',
      price: 750,
      isActive: true
    });

    const pkgCorporate = await Package.create({
      name: 'Executive Corporate Seminar Package',
      description: 'All-inclusive executive conference package with morning and afternoon refreshments plus hot plated lunch buffet up to 50 participants.',
      inclusions: [
        'Continuous morning and afternoon brewed Benguet coffee and native teas',
        'Morning artisan pastries and afternoon savory finger sandwiches',
        'Hot lunch buffet with 3 main entrees, crisp salad bar and steamed rice',
        'Dedicated conference refreshment attendant'
      ],
      pricingType: 'fixed',
      price: 28000,
      isActive: true
    });

    const pkgKiddie = await Package.create({
      name: 'Kiddie Party Special Delight',
      description: 'Fun-filled birthday celebration featuring Sweet Cheesy Spaghetti, Golden Drumstick Chicken, Mini Corn Dogs, and Marshmallow Skewers.',
      inclusions: [
        'Vibrant colorful kiddie table setup and festive balloons',
        'Chocolate dipping fountain station with treats',
        'Special kiddie party meal boxes and cups'
      ],
      pricingType: 'per_head',
      price: 320,
      isActive: true
    });

    console.log('Seeding reservations...');
    const today = new Date();
    const date1 = new Date(today);
    date1.setDate(today.getDate() + 7);
    const date2 = new Date(today);
    date2.setDate(today.getDate() + 14);
    const date3 = new Date(today);
    date3.setDate(today.getDate() + 21);

    const res1Total = pkgWedding.price * 150;
    const res1 = await Reservation.create({
      customer: customer1._id,
      eventType: 'wedding',
      eventDate: date1,
      startTime: '17:00',
      venue: 'Chateau de Busay Garden Terrace, Cebu City',
      guestCount: 150,
      package: pkgWedding._id,
      totalAmount: res1Total,
      status: 'Confirmed',
      notes: 'Wedding reception for Clarisse & Kevin. Color motif: Sage Green and Champagne Gold.',
      createdBy: adminUser._id
    });

    const res2Total = pkgBuffet.price * 80;
    const res2 = await Reservation.create({
      customer: customer2._id,
      eventType: 'birthday',
      eventDate: date2,
      startTime: '12:00',
      venue: 'Pacific Grand Ballroom, Waterfront Cebu City Hotel',
      guestCount: 80,
      package: pkgBuffet._id,
      totalAmount: res2Total,
      status: 'Confirmed',
      notes: '60th Milestone Birthday. VIP round tables requested.',
      createdBy: staffMaria._id
    });

    const res3Total = pkgCorporate.price;
    const res3 = await Reservation.create({
      customer: customer3._id,
      eventType: 'meeting',
      eventDate: date3,
      startTime: '09:00',
      venue: 'Cebu City Marriott Convention Hall, Cebu Business Park',
      guestCount: 40,
      package: pkgCorporate._id,
      totalAmount: res3Total,
      status: 'Pending',
      notes: 'Pending final sign-off from corporate procurement committee.',
      createdBy: adminUser._id
    });

    console.log('Seeding payments...');
    await Payment.create({
      reservation: res1._id,
      amount: 50000,
      paymentDate: new Date(),
      method: 'bank_transfer',
      referenceNo: 'BDO-TRX-9923841',
      recordedBy: staffMaria._id
    });

    await Payment.create({
      reservation: res2._id,
      amount: 18000,
      paymentDate: new Date(),
      method: 'GCash',
      referenceNo: 'GCASH-9021884102',
      recordedBy: adminUser._id
    });

    console.log('Seeding tasks...');
    const taskDate1 = new Date(date1);
    taskDate1.setDate(date1.getDate() - 3);

    const taskDate2 = new Date(date1);
    taskDate2.setDate(date1.getDate() - 1);

    const taskDate3 = new Date(date1);

    await Task.create({
      reservation: res1._id,
      title: 'Conduct food tasting and finalize couple menu selection',
      assignedTo: staffMaria._id,
      dueDate: taskDate1,
      status: 'Completed'
    });

    await Task.create({
      reservation: res1._id,
      title: 'Ingress permit coordination with Chateau de Busay management',
      assignedTo: staffJuan._id,
      dueDate: taskDate2,
      status: 'In Progress'
    });

    await Task.create({
      reservation: res1._id,
      title: 'Final dinnerware, Tiffany chairs and floral centerpiece staging',
      assignedTo: staffMaria._id,
      dueDate: taskDate3,
      status: 'Pending'
    });

    const taskDate4 = new Date(date2);
    taskDate4.setDate(date2.getDate() - 2);

    await Task.create({
      reservation: res2._id,
      title: 'Lechon belly roasting schedule and audio-visual confirmation',
      assignedTo: staffJuan._id,
      dueDate: taskDate4,
      status: 'Pending'
    });

    console.log('Seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database seed:', error);
    process.exit(1);
  }
};

seedData();
