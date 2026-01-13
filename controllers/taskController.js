const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Get all tasks
const getAllTasks = async (req, res) => {
  try {
    const database = getDatabase();
    const tasks = await database.collection("tasks").find().toArray();
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const database = getDatabase();
    const task = await database
      .collection("tasks")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const {
      title,
      assignedTo,
      assignedToName,
      assignedToImage,
      notes,
      dueDate,
      files,
      mark,
      status,
    } = req.body;

    const database = getDatabase();
    const updateData = {
      title,
      assignedTo,
      assignedToName,
      assignedToImage,
      notes,
      dueDate,
      files: files || [],
      mark: mark || 0,
      status: status || "pending",
      updatedAt: new Date(),
    };

    const result = await database
      .collection("tasks")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const database = getDatabase();
    const result = await database
      .collection("tasks")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Create task
const createTask = async (req, res) => {
  try {
    const {
      title,
      assignedTo,
      assignedToName,
      assignedToImage,
      notes,
      dueDate,
      files,
      mark,
      status,
    } = req.body;

    const database = getDatabase();
    const result = await database.collection("tasks").insertOne({
      title,
      assignedTo,
      assignedToName,
      assignedToImage,
      notes,
      dueDate,
      files: files || [],
      mark: mark || 0,
      status: status || "pending",
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Task created successfully" });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Submit task
const submitTask = async (req, res) => {
  try {
    const { taskId, files, notes } = req.body;
    const database = getDatabase();

    const result = await database
      .collection("tasks")
      .updateOne(
        { _id: new ObjectId(taskId) },
        {
          $set: {
            files: files || [],
            notes: notes || "",
            status: "submitted",
            submittedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task submitted successfully" });
  } catch (error) {
    console.error("Error submitting task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Mark task
const markTask = async (req, res) => {
  try {
    const { mark } = req.body;
    const database = getDatabase();

    const result = await database
      .collection("tasks")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { mark, markedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task marked successfully" });
  } catch (error) {
    console.error("Error marking task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Complete task
const completeTask = async (req, res) => {
  try {
    const database = getDatabase();
    const result = await database
      .collection("tasks")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: "completed", completedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task completed successfully" });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get tasks by user ID
const getTasksByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const database = getDatabase();
    const tasks = await database
      .collection("tasks")
      .find({ assignedTo: userId })
      .toArray();
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  createTask,
  submitTask,
  markTask,
  completeTask,
  getTasksByUserId,
};
