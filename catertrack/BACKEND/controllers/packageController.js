const Package = require('../models/Package');
const Reservation = require('../models/Reservation');

const getPackages = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }

    const packages = await Package.find(filter).sort({ price: 1 });
    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (err) {
    next(err);
  }
};

const getPackageById = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pkg
    });
  } catch (err) {
    next(err);
  }
};

const createPackage = async (req, res, next) => {
  try {
    const { name, description, inclusions, pricingType, price, isActive } = req.body;

    const formattedInclusions = Array.isArray(inclusions)
      ? inclusions
      : typeof inclusions === 'string'
      ? inclusions.split('\n').map((item) => item.trim()).filter(Boolean)
      : [];

    const pkg = await Package.create({
      name,
      description,
      inclusions: formattedInclusions,
      pricingType,
      price,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: pkg
    });
  } catch (err) {
    next(err);
  }
};

const updatePackage = async (req, res, next) => {
  try {
    const { name, description, inclusions, pricingType, price, isActive } = req.body;

    const formattedInclusions = Array.isArray(inclusions)
      ? inclusions
      : typeof inclusions === 'string'
      ? inclusions.split('\n').map((item) => item.trim()).filter(Boolean)
      : undefined;

    const updateData = { name, description, pricingType, price, isActive };
    if (formattedInclusions !== undefined) {
      updateData.inclusions = formattedInclusions;
    }

    const pkg = await Package.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pkg
    });
  } catch (err) {
    next(err);
  }
};

const deletePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Check if package is used in reservations
    const reservationsCount = await Reservation.countDocuments({ package: pkg._id });
    if (reservationsCount > 0) {
      // Soft deactivate instead of hard deleting to preserve historical records
      pkg.isActive = false;
      await pkg.save();
      return res.status(200).json({
        success: true,
        message: `Package has ${reservationsCount} historical reservation(s); deactivated instead of deleted.`,
        data: pkg
      });
    }

    await Package.findByIdAndDelete(pkg._id);

    res.status(200).json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage
};
