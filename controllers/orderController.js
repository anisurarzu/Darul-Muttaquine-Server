const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create order
const createOrder = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      address,
      city,
      trxId,
      email,
      size,
      cartDetails,
      totalAmount,
    } = req.body;

    const database = getDatabase();
    const orderNo = `DMF-SHOP${Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")}`;

    const result = await database.collection("orderInfo").insertOne({
      fullName,
      phoneNumber,
      address,
      city,
      trxId,
      email,
      size,
      cartDetails,
      orderDate: new Date(),
      totalAmount,
      orderStatus: "Pending",
      orderNo,
    });

    if (!result.insertedId) {
      console.error("Failed to insert information into the database");
      return res
        .status(500)
        .json({ message: "Failed to submit information" });
    }

    res.status(200).json({
      message: "Information submitted successfully",
      orderNo,
    });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const database = getDatabase();
    const orders = await database.collection("orderInfo").find().toArray();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const database = getDatabase();
    const orderNo = id;

    const order = await database
      .collection("orderInfo")
      .findOne({ orderNo: orderNo });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete order
const deleteOrder = async (req, res) => {
  try {
    const orderID = req.params.id;
    const database = getDatabase();
    const result = await database
      .collection("orderInfo")
      .deleteOne({ _id: new ObjectId(orderID) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, orderID } = req.body;
    const database = getDatabase();

    await database
      .collection("orderInfo")
      .updateOne({ _id: new ObjectId(orderID) }, { $set: { orderStatus } });

    const updatedUser = await database
      .collection("orderInfo")
      .findOne({ _id: new ObjectId(orderID) });

    res.status(200).json({
      message: "Order status updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  deleteOrder,
  updateOrderStatus,
};
