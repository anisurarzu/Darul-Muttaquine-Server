const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { connectDB } = require("./config/database");

// Import routes
const historyRoutes = require("./routes/historyRoutes");
const suggestionRoutes = require("./routes/suggestionRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const depositRoutes = require("./routes/depositRoutes");
const quizMoneyRoutes = require("./routes/quizMoneyRoutes");
const projectRoutes = require("./routes/projectRoutes");
const resultRoutes = require("./routes/resultRoutes");
const scholarshipRoutes = require("./routes/scholarshipRoutes");
const costRoutes = require("./routes/costRoutes");
const quizRoutes = require("./routes/quizRoutes");
const orderRoutes = require("./routes/orderRoutes");
const admissionRoutes = require("./routes/admissionRoutes");
const contactRoutes = require("./routes/contactRoutes");
const courseRoutes = require("./routes/courseRoutes");
const taskRoutes = require("./routes/taskRoutes");
const investmentRoutes = require("./routes/investmentRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

    // Swagger Options
    const swaggerOptions = {
      swaggerDefinition: {
        info: {
          title: "Upokari API Documentation",
          version: "1.0.0",
          description: "Documentation for Upokari API",
        },
      },
  apis: ["./routes/*.js"], // Specify the files containing your API routes
    };

    // Generate Swagger documentation
    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Serve Swagger UI
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/", historyRoutes);
app.use("/", suggestionRoutes);
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", depositRoutes);
app.use("/", quizMoneyRoutes);
app.use("/", projectRoutes);
app.use("/", resultRoutes);
app.use("/", scholarshipRoutes);
app.use("/", costRoutes);
app.use("/", quizRoutes);
app.use("/", orderRoutes);
app.use("/", admissionRoutes);
app.use("/", contactRoutes);
app.use("/", courseRoutes);
app.use("/", taskRoutes);
app.use("/", investmentRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("dmf server two is running");
});

// Initialize database and start server
async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log("Server running at port", port);
          });
        } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
