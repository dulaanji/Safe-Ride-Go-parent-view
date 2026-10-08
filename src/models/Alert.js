const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    type: { type: String, enum: ['van', 'school', 'delay', 'info'], default: 'info' },
    title: { type: String, required: [true, 'Alert title is required'], trim: true, maxlength: 120 },
    body: { type: String, default: '', trim: true, maxlength: 300 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
