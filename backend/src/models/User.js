import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      enum: ["web", "mobile"],
      required: true,
    },
    deviceName: {
      type: String,
      default: "Unknown Device",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    sessionToken: {
      type: String,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: "",
  },
  devices: [DeviceSchema],
  encryptionKey: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", UserSchema);
