const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createOrder,
  getAllOrders,
  getOrderById,
  deleteOrder,
  updateOrderStatus,
} = require("../controllers/orderController");

router.post("/order-info", createOrder);
router.get("/order-info", getAllOrders);
router.get("/order-info/:id", getOrderById);
router.delete("/order-info/:id", verifyAuthToken, deleteOrder);
router.post("/update-order-status", verifyAuthToken, updateOrderStatus);

module.exports = router;
