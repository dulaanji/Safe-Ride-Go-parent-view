const mongoose = require('mongoose');

const pickupNoteSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    text: { type: String, required: [true, 'Note cannot be empty'], trim: true, minlength: [1, 'Note cannot be empty'], maxlength: [200, 'Note is too long (max 200)'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PickupNote', pickupNoteSchema);
