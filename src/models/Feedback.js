const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    rating: { type: Number, required: [true, 'Rating is required'], min: [1, 'Rating must be 1 to 5'], max: [5, 'Rating must be 1 to 5'] },
    comment: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: true }
);
feedbackSchema.index({ parent: 1, trip: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
