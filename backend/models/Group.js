// Group.js - FLEXIBLE SCHEMA
import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema({
  // For registered users
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: false // Optional for non-users
  },
  // For both registered users and non-users
  name: { 
    type: String, 
    required: true 
  },
  // To distinguish between user types
  type: {
    type: String,
    enum: ['user', 'non-user'], // user=registered, non-user=guest
    default: 'non-user'
  },
  // When the member was added
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const GroupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    minlength: 1 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  members: {
    type: [MemberSchema],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true, 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

GroupSchema.index({ createdBy: 1 });
GroupSchema.index({ "members.userId": 1 });

export default mongoose.model("Group", GroupSchema);