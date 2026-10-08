const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    kind: { type: String, enum: ['morning', 'afternoon'], default: 'morning' },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    title: { type: String, default: 'Home to SLIIT College' },
    startedAt: { type: Date, required: true },
    // active trip: expected arrival at the pickup stop. completed trip: arrival at school.
    etaAt: { type: Date, required: true },
    arrivedAt: Date,
    durationMin: Number,
    delayMin: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);
