const mongoose = require('mongoose');

const childSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, default: 'Grade 6' },
    school: { type: String, default: 'SLIIT College' },
    vanNo: { type: String, default: 'WP ND-4521' },
    driverName: { type: String, default: 'Kasun Perera' },
    driverPhone: { type: String, default: '0771234500' },
    pickupStop: { type: String, default: 'Pagoda Road', trim: true, maxlength: 80 },
    emergencyContact: { type: String, default: '', trim: true, maxlength: 20 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Child', childSchema);
