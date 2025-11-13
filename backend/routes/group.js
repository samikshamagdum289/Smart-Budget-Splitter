import express from "express";
import mongoose from "mongoose"; // ✅ Use mongoose instead of direct import
import auth from "../middleware/auth.js";
import Group from "../models/Group.js";

const router = express.Router();

// ✅ Create group
// ✅ Create group - FIXED 
router.post("/create", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Get User model to find creator's name
    const User = mongoose.model("User");
    const creator = await User.findById(req.user.id);
    
    if (!creator) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = new Group({
      name: name.trim(),
      createdBy: req.user.id,
      members: [{ 
        userId: req.user.id, 
        name: creator.name // Use actual name from database
      }]
    });

    await group.save();

    res.status(201).json({
      message: "Group created successfully",
      group
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all groups of a user - FIXED VERSION
router.get("/", auth, async (req, res) => {
  try {
    const groups = await Group.find({ "members.userId": req.user.id })
      .populate("createdBy", "name email")
      .populate("members.userId", "name email") // ✅ ADD THIS LINE to populate member names
      .lean();

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/// ✅ UPDATED: Add member to a group - PROPERLY HANDLES NON-USERS
router.post("/:groupId/add-member", auth, async (req, res) => {
  try {
    console.log("=== ADD MEMBER REQUEST ===");
    console.log("Group ID:", req.params.groupId);
    console.log("Request Body:", req.body);
    console.log("User making request:", req.user.id);

    const { userId, memberName } = req.body;

    // ✅ Check if either userId OR memberName is provided
    if (!userId && !memberName) {
      console.log("❌ Neither userId nor memberName provided");
      return res.status(400).json({ message: "Either User ID or Member Name is required" });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      console.log("❌ Group not found:", req.params.groupId);
      return res.status(404).json({ message: "Group not found" });
    }
    console.log("✅ Group found:", group.name);

    // ✅ Handle adding by USER ID (existing users)
    if (userId) {
      console.log("🔍 Adding by User ID:", userId);
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid User ID format" });
      }

      const User = mongoose.model("User");
      const userToAdd = await User.findById(userId);
      if (!userToAdd) {
        console.log("❌ User to add not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }
      console.log("✅ User found:", userToAdd.name);

      // Check if user is already a member
      const alreadyMember = group.members.some(
        (m) => m.userId && m.userId.toString() === userId
      );
      if (alreadyMember) {
        console.log("❌ User already a member");
        return res.status(400).json({ message: "User is already a member" });
      }

      console.log("➕ Adding user to group members");
      group.members.push({ 
        userId: userToAdd._id, 
        name: userToAdd.name,
        type: 'user'
      });

    } 
    // ✅ Handle adding by MEMBER NAME (non-users)
    else if (memberName) {
      console.log("🔍 Adding by Member Name:", memberName);
      
      // Check if member with same name already exists in group
      const alreadyMember = group.members.some(
        (m) => m.name && m.name.toLowerCase() === memberName.toLowerCase().trim()
      );
      if (alreadyMember) {
        console.log("❌ Member with this name already exists");
        return res.status(400).json({ message: "Member with this name already exists in the group" });
      }

      console.log("➕ Adding non-user member to group:", memberName);
      
      // ✅ Add member with just name (no userId for non-users)
      group.members.push({ 
        name: memberName.trim(),
        type: 'non-user'
        // No userId field for non-user members
      });
    }
    
    await group.save();
    console.log("✅ Member added successfully");

    res.json({ 
      message: "Member added successfully", 
      group: group 
    });

  } catch (err) {
    console.log("❌ SERVER ERROR:", err.message);
    console.log("Full error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATED: Remove member from group - IMPROVED VERSION
router.delete("/:groupId/members/:memberId", auth, async (req, res) => {
  try {
    console.log("=== REMOVE MEMBER REQUEST ===");
    console.log("Group ID:", req.params.groupId);
    console.log("Member ID to remove:", req.params.memberId);
    console.log("User making request:", req.user.id);

    const { groupId, memberId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid Member ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      console.log("❌ Group not found");
      return res.status(404).json({ message: "Group not found" });
    }
    console.log("✅ Group found:", group.name);

    // Check if user owns the group or is removing themselves
    const isOwner = group.createdBy.toString() === req.user.id;
    const isRemovingSelf = memberId === req.user.id;

    if (!isOwner && !isRemovingSelf) {
      console.log("❌ Not authorized to remove members");
      return res.status(403).json({ message: "Not authorized to remove members from this group" });
    }

    // ✅ FIX: Find the member by their _id (MongoDB document ID)
    console.log("🔍 Looking for member in group...");
    console.log("Current members:", group.members);
    
    const memberIndex = group.members.findIndex(
      member => member._id.toString() === memberId
    );

    console.log("Member found at index:", memberIndex);

    if (memberIndex === -1) {
      console.log("❌ Member not found in group");
      return res.status(404).json({ message: "Member not found in this group" });
    }

    // ✅ Prevent removing the group owner (creator)
    const memberToRemove = group.members[memberIndex];
    if (memberToRemove.userId && memberToRemove.userId.toString() === group.createdBy.toString()) {
      console.log("❌ Cannot remove group owner");
      return res.status(400).json({ message: "Cannot remove the group owner" });
    }

    console.log("🗑️ Removing member:", memberToRemove.name);
    
    // Remove the member
    group.members.splice(memberIndex, 1);
    
    await group.save();
    console.log("✅ Member removed successfully");

    res.json({ 
      message: "Member removed successfully",
      removedMember: memberToRemove.name 
    });

  } catch (err) {
    console.log("❌ SERVER ERROR in remove-member:", err);
    console.log("Error details:", err.message);
    res.status(500).json({ 
      message: "Internal server error",
      error: err.message 
    });
  }
});

// ✅ Delete group
router.delete("/:groupId", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this group" });
    }

    await Group.findByIdAndDelete(req.params.groupId);
    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all users (for finding valid user IDs)
router.get("/debug/users", auth, async (req, res) => {
  try {
    const User = mongoose.model("User");
    const users = await User.find({}, "name email _id"); // Only get these fields
    
    console.log("📋 All users in database:");
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user._id}`);
    });
    
    res.json({
      message: "All users in database",
      users: users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;