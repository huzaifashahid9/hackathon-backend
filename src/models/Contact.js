import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "responded", "closed"],
      default: "pending",
    },
    response: {
      type: String,
      default: null,
    },
    respondedBy: {
      type: String,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ status: 1 });

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
