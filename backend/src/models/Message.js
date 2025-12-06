import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // Encrypted message content (server cannot read)
  encryptedContent: {
    type: String,
    required: true,
  },
  // Device that sent the message
  senderDeviceId: {
    type: String,
    required: true,
  },
  senderDeviceType: {
    type: String,
    enum: ["web", "mobile"],
    required: true,
  },
  // Timestamp for ordering
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // Message ID for deduplication
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
});

// Index for efficient querying by user and timestamp
MessageSchema.index({ userId: 1, timestamp: 1 });

export default mongoose.model("Message", MessageSchema);

