const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database.collection("users").find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get users dropdown
const getUsersDropdown = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database
      .collection("users")
      .find({}, { projection: { _id: 1, firstName: 1, lastName: 1, email: 1 } })
      .toArray();

    const formattedUsers = users.map((user) => ({
      value: user._id.toString(),
      label: `${user.firstName} ${user.lastName} (${user.email})`,
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      image,
      phone,
      bloodGroup,
      gender,
      email,
      currentAddress,
      permanentAddress,
      birthDate,
      profession,
      nidInfo,
      photoInfo,
      isVerification,
    } = req.body;

    const database = getDatabase();
    const user = await database
      .collection("users")
      .findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(username && { username }),
      ...(image && { image }),
      ...(phone && { phone }),
      ...(bloodGroup && { bloodGroup }),
      ...(gender && { gender }),
      ...(email && { email }),
      ...(currentAddress && { currentAddress }),
      ...(permanentAddress && { permanentAddress }),
      ...(birthDate && { birthDate }),
      ...(profession && { profession }),
      ...(typeof isVerification !== "undefined" && { isVerification }),
      ...(nidInfo && { nidInfo }),
      ...(photoInfo && { photoInfo }),
    };

    await database
      .collection("users")
      .updateOne({ email: email }, { $set: updatedData });

    const updatedUser = await database
      .collection("users")
      .findOne({ email: email });

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userRole, email } = req.body;
    const database = getDatabase();

    const user = await database
      .collection("users")
      .findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await database
      .collection("users")
      .updateOne({ email: email }, { $set: { userRole } });

    const updatedUser = await database
      .collection("users")
      .findOne({ email: email });

    res.status(200).json({
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update user progress
const updateUserProgress = async (req, res) => {
  try {
    const { memberId, voteType } = req.body;
    const database = getDatabase();

    const user = await database
      .collection("users")
      .findOne({ _id: new ObjectId(memberId) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(user.progress)) {
      user.progress = [];
      await database
        .collection("users")
        .updateOne(
          { _id: new ObjectId(memberId) },
          { $set: { progress: [] } }
        );
    }

    const progressEntry = {
      type: voteType,
      timestamp: new Date(),
    };

    const updatedUser = await database.collection("users").findOneAndUpdate(
      { _id: new ObjectId(memberId) },
      {
        $push: { progress: progressEntry },
        $inc: {
          positiveProgress: voteType === "positive" ? 1 : 0,
          negativeProgress: voteType === "negative" ? 1 : 0,
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedUser.value) {
      return res
        .status(400)
        .json({ message: "Failed to update user progress" });
    }

    res.status(200).json({
      message: "User progress updated successfully",
      user: updatedUser.value,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const database = getDatabase();

    const result = await database.collection("users").deleteOne({
      _id: ObjectId(id),
    });

    if (result.deletedCount !== 1) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get active users (based on lastActive timestamp)
const getActiveUsers = async (req, res) => {
  try {
    // Default: users active in the last 15 seconds
    // Can also use ?minutes=X for minutes, or ?seconds=X for seconds
    const activeSeconds = req.query.seconds 
      ? parseInt(req.query.seconds) 
      : req.query.minutes 
        ? parseInt(req.query.minutes) * 60 
        : 15; // Default 15 seconds
    
    // Calculate the timestamp threshold
    const threshold = new Date(Date.now() - activeSeconds * 1000);
    
    const database = getDatabase();
    
    // First, let's check ALL users with lastActive to see what we have
    const allUsersWithLastActive = await database
      .collection("users")
      .find({
        lastActive: { $exists: true, $ne: null }
      })
      .project({ email: 1, lastActive: 1, isVerification: 1 })
      .sort({ lastActive: -1 })
      .toArray();
    
    console.log(`\n=== All Users with lastActive ===`);
    console.log(`Total users with lastActive field: ${allUsersWithLastActive.length}`);
    allUsersWithLastActive.forEach((user, index) => {
      const minutesAgo = Math.round((Date.now() - new Date(user.lastActive).getTime()) / 60000);
      console.log(`  ${index + 1}. ${user.email} - lastActive: ${minutesAgo} minutes ago, verified: ${user.isVerification}`);
    });
    console.log(`==================================\n`);
    
    // Find active users with MongoDB
    // Query: users who have lastActive within the threshold (and optionally are verified)
    const activeUsers = await database
      .collection("users")
      .find({
        lastActive: {
          $exists: true, // Field exists
          $ne: null,     // Not null
          $gte: threshold // Within the time threshold
        }
      })
      .project({
        _id: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        image: 1,
        profession: 1,
        lastActive: 1,
        createdAt: 1,
        isVerification: 1
        // Note: password, verificationToken, resetToken, resetTokenExpires are excluded by default
        // since we're using inclusion projection
      })
      .sort({ lastActive: -1 }) // Sort by most recently active first
      .toArray();
    
    // Debug logging - show all users found
    console.log(`\n=== Active Users Debug ===`);
    console.log(`Threshold: ${threshold.toISOString()} (${activeSeconds} seconds ago)`);
    console.log(`Found ${activeUsers.length} users with lastActive field:`);
    activeUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - lastActive: ${user.lastActive?.toISOString() || 'null'}, verified: ${user.isVerification}`);
    });
    
    // Filter to only verified users (optional - remove if you want all active users)
    const verifiedActiveUsers = activeUsers.filter(user => user.isVerification === true);
    
    console.log(`After verification filter: ${verifiedActiveUsers.length} verified users`);
    console.log(`==========================\n`);

    // Format users with full image URLs
    const users = verifiedActiveUsers.map(user => {
      // Use lastActive if available, otherwise use createdAt as fallback
      const lastActiveTime = user.lastActive || user.createdAt;
      
      const formattedUser = {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        image: user.image || null,
        profession: user.profession || null,
        last_active: lastActiveTime,
        created_at: user.createdAt
      };
      
      // Image is already a full URL, return as-is
      return formattedUser;
    });

    res.json({
      success: true,
      message: `Found ${users.length} active user(s)`,
      data: {
        users: users,
        count: users.length,
        activeWithinSeconds: activeSeconds
      }
    });
  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllUsers,
  getUsersDropdown,
  updateUser,
  updateUserRole,
  updateUserProgress,
  deleteUser,
  getActiveUsers,
};
