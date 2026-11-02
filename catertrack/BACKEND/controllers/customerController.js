const Customer = require('../models/Customer');
const Reservation = require('../models/Reservation');

const getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: customers
    });
  } catch (err) {
    next(err);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const reservations = await Reservation.find({ customer: customer._id })
      .populate('package', 'name price pricingType')
      .sort({ eventDate: -1 });

    res.status(200).json({
      success: true,
      data: customer,
      reservations
    });
  } catch (err) {
    next(err);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const { fullName, contactNumber, email, address, notes } = req.body;

    const customer = await Customer.create({
      fullName,
      contactNumber,
      email,
      address,
      notes
    });

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { fullName, contactNumber, email, address, notes } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { fullName, contactNumber, email, address, notes },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has associated reservations
    const reservationsCount = await Reservation.countDocuments({ customer: customer._id });
    if (reservationsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer. They have ${reservationsCount} existing reservation(s).`
      });
    }

    await Customer.findByIdAndDelete(customer._id);

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
