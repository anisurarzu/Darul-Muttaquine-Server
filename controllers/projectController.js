const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create project
const createProject = async (req, res) => {
  try {
    const {
      projectName,
      startDate,
      endDate,
      projectLeader,
      projectCoordinators,
      projectFund,
      image,
      details,
      approvalStatus,
      yesVote,
      noVote,
    } = req.body;

    const database = getDatabase();
    const result = await database.collection("project").insertOne({
      projectName,
      startDate,
      endDate,
      projectLeader,
      projectCoordinators,
      projectFund,
      image,
      details,
      approvalStatus,
      yesVote,
      noVote,
      createdAt: new Date(),
    });

    if (!result) {
      console.error("Failed to insert information into the database");
      return res
        .status(500)
        .json({ message: "Failed to submit information" });
    }

    res.status(200).json({ message: "Information submitted successfully" });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const {
      projectName,
      startDate,
      endDate,
      projectLeader,
      projectLeaderImage,
      projectCoordinators,
      projectCoordinatorImages,
      projectFund,
      image,
      details,
      approvalStatus,
      yesVote,
      noVote,
    } = req.body;

    const database = getDatabase();
    const updateData = {
      projectName,
      startDate,
      endDate,
      projectLeader,
      projectLeaderImage,
      projectCoordinators,
      projectCoordinatorImages,
      projectFund,
      image,
      details,
      approvalStatus,
      yesVote,
      noVote,
      updatedAt: new Date(),
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const result = await database
      .collection("project")
      .updateOne({ _id: new ObjectId(projectId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      console.error("No project found with the given ID");
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Information updated successfully" });
  } catch (error) {
    console.error("Error updating information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    const database = getDatabase();
    const projects = await database
      .collection("project")
      .find({ approvalStatus: { $ne: "Delete" } })
      .toArray();

    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update project status
const updateProjectStatus = async (req, res) => {
  try {
    const { approvalStatus, projectID } = req.body;
    const database = getDatabase();

    const user = await database
      .collection("project")
      .findOne({ _id: ObjectId(projectID) });
    if (!user) {
      return res.status(404).json({ message: "Project not found" });
    }

    await database
      .collection("project")
      .updateOne(
        { _id: ObjectId(projectID) },
        { $set: { approvalStatus } }
      );

    const updatedUser = await database
      .collection("project")
      .findOne({ _id: ObjectId(projectID) });

    res.status(200).json({
      message: "Project Status updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete project (soft delete)
const deleteProject = async (req, res) => {
  try {
    const id = req.params.id;
    const database = getDatabase();

    const result = await database
      .collection("project")
      .updateOne(
        { _id: ObjectId(id) },
        { $set: { approvalStatus: "Delete" } }
      );

    if (result.modifiedCount !== 1) {
      return res.status(404).json({ message: "Information not found" });
    }

    res
      .status(200)
      .json({ message: "Information status updated to 'Delete'" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createProject,
  updateProject,
  getAllProjects,
  updateProjectStatus,
  deleteProject,
};
