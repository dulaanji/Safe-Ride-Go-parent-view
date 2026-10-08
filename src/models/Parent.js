const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 120 },
    displayName: { type: String, trim: true, maxlength: 120 },
    mobile: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    otpCode: String,
    otpExpires: Date,
    alertChannels: {
      app: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

parentSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    displayName: this.displayName || this.fullName,
    mobile: this.mobile,
    verified: this.verified,
    alertChannels: this.alertChannels,
  };
};

module.exports = mongoose.model('Parent', parentSchema);
