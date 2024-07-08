const express = require("express");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// const { Server: WebSocketServer } = require("ws");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Function to verify JWT token
function verifyToken(token) {
  const secretKey = process.env.JWT_SECRET || "your-secret-key";
  try {
    const decoded = jwt.verify(token, secretKey);
    return decoded.userId;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// // Define WebSocket server
// const wss = new WebSocketServer({ port: 8080 });
// // WebSocket connection handling
// wss.on("connection", (ws) => {
//   console.log("WebSocket client connected");

//   // Example: Send a welcome message to the client
//   ws.send("Welcome to the WebSocket server!");
// });

async function run() {
  try {
    await client.connect();
    const database = client.db("Upokari");

    // Swagger Options
    const swaggerOptions = {
      swaggerDefinition: {
        info: {
          title: "Upokari API Documentation",
          version: "1.0.0",
          description: "Documentation for Upokari API",
        },
      },
      apis: ["./index.js"], // Specify the file containing your API routes
    };

    // Generate Swagger documentation
    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Serve Swagger UI
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // file upload option

    // Define the upload directory
    const uploadDirectory = path.join(__dirname, "uploads");

    // Create the uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory);
    }

    // Multer configuration
    const multer = require("multer");
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDirectory);
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
      },
    });
    const upload = multer({ storage: storage });

    // File upload endpoint
    // File upload endpoint
    app.post(
      "/upload",
      verifyAuthToken,
      upload.single("file"),
      async (req, res) => {
        try {
          if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
          }

          // Read the uploaded file
          const fileData = fs.readFileSync(req.file.path);

          // Encode the file data to base64
          const encodedFile = fileData.toString("base64");

          // Create a document to store in the database
          const imageDocument = {
            filename: req.file.filename,
            data: encodedFile,
            contentType: req.file.mimetype,
            historyName: req.body.historyName, // Additional information
            historyDate: req.body.historyDate, // Additional information
            historyDetails: req.body.historyDetails, // Additional information
          };

          // Store the document in the database
          const result = await database
            .collection("historyInfo")
            .insertOne(imageDocument);

          // Check if the insertion was successful
          if (!result) {
            console.error("Failed to insert image into the database");
            return res.status(500).json({ message: "Failed to store image" });
          }

          // Delete the uploaded file from the filesystem
          fs.unlinkSync(req.file.path);

          res.status(200).json({
            message: "File uploaded successfully",
            filename: req.file.filename,
          });
        } catch (error) {
          console.error("Error uploading file:", error);
          res.status(500).json({ message: "Server Error" });
        }
      }
    );

    /* insert  history  */
    app.post("/history-info", verifyAuthToken, async (req, res) => {
      try {
        const { projectName, name, subtitle, description, image } = req.body;

        // Insert the submitted information into the database
        const result = await database.collection("historyInfo").insertOne({
          projectName,
          name,
          subtitle,
          description,
          image,
          createdAt: new Date(),
        });

        console.log("Insertion result:", result);

        // Check if the insertion was successful
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
    });

    // Get all uploaded files
    app.get("/upload", verifyAuthToken, async (req, res) => {
      try {
        // Fetch all documents from the historyInfo collection
        const files = await database
          .collection("historyInfo")
          .find({})
          .toArray();

        res.status(200).json(files);
      } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    // Delete uploaded file by ID
    app.delete("/upload/:id", verifyAuthToken, async (req, res) => {
      try {
        const fileId = req.params.id;

        // Delete the uploaded file from the database by ID
        const result = await database
          .collection("historyInfo")
          .deleteOne({ _id: ObjectId(fileId) });

        if (result.deletedCount !== 1) {
          return res.status(404).json({ message: "File not found" });
        }

        res.status(200).json({ message: "File deleted successfully" });
      } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    app.get("/historyInfo", async (req, res) => {
      try {
        const historyInfo = await database
          .collection("historyInfo")
          .find()
          .toArray();
        res.status(200).json(historyInfo);
      } catch (error) {
        console.error("Error retrieving history information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    app.delete("/history-info/:id", verifyAuthToken, async (req, res) => {
      try {
        const { id } = req.params;

        // Attempt to delete the document with the specified id from the database
        const result = await database
          .collection("historyInfo")
          .deleteOne({ _id: new ObjectId(id) });

        console.log("Deletion result:", result);

        // Check if the deletion was successful
        if (result.deletedCount === 0) {
          console.error("Failed to delete information from the database");
          return res.status(404).json({ message: "Information not found" });
        }

        res.status(200).json({ message: "Information deleted successfully" });
      } catch (error) {
        console.error("Error deleting information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    // Suggestion Box

    app.post("/suggestion-info", verifyAuthToken, async (req, res) => {
      try {
        const { title, description } = req.body;

        // Insert the submitted information into the database
        const result = await database.collection("suggestions").insertOne({
          title,
          description,
          createdAt: new Date(),
        });

        console.log("Insertion result:", result);

        // Check if the insertion was successful
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
    });
    app.get("/suggestion-info", verifyAuthToken, async (req, res) => {
      try {
        const suggestionInfo = await database
          .collection("suggestions")
          .find()
          .toArray();
        res.status(200).json(suggestionInfo);
      } catch (error) {
        console.error("Error retrieving suggestions information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    app.delete("/suggestion-info/:id", verifyAuthToken, async (req, res) => {
      try {
        const { id } = req.params;

        // Attempt to delete the document with the specified id from the database
        const result = await database
          .collection("suggestions")
          .deleteOne({ _id: new ObjectId(id) });

        console.log("Deletion result:", result);

        // Check if the deletion was successful
        if (result.deletedCount === 0) {
          console.error("Failed to delete information from the database");
          return res.status(404).json({ message: "Information not found" });
        }

        res.status(200).json({ message: "Information deleted successfully" });
      } catch (error) {
        console.error("Error deleting information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Registration Endpoint
    app.post("/register", async (req, res) => {
      try {
        const { firstName, lastName, username, email, password } = req.body;

        // Check if user exists
        const existingUser = await database
          .collection("users")
          .findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "User already exists" });
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); // Use 10 rounds of salt

        // Insert new user into the database with hashed password and verification token
        await database.collection("users").insertOne({
          firstName,
          lastName,
          username,
          email,
          password: hashedPassword,
          verificationToken,
          createdAt: new Date(),
        });

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        res.status(201).json({ message: "User registered successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* forget password api */

    // Function to generate a password reset token
    function generateResetToken() {
      return crypto.randomBytes(20).toString("hex");
    }

    // Function to send password reset email
    async function sendResetEmail(email, resetToken) {
      // Setup your email transporter (e.g., using nodemailer)
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "your-email@gmail.com",
          pass: "your-email-password",
        },
      });

      const mailOptions = {
        from: "your-email@gmail.com",
        to: email,
        subject: "Password Reset Request",
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
    Please click on the following link, or paste this into your browser to complete the process:\n\n
    http://localhost:3000/reset/${resetToken}\n\n
    If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };

      await transporter.sendMail(mailOptions);
    }

    // Forgot password endpoint
    app.post("/forgot-password", async (req, res) => {
      try {
        const { email } = req.body;

        // Check if user exists
        const user = await database.collection("users").findOne({ email });
        if (!user) {
          return res.status(400).json({ message: "User not found" });
        }

        // Generate password reset token
        const resetToken = generateResetToken();

        // Store the reset token in the database with an expiration time (e.g., 1 hour)
        await database.collection("users").updateOne(
          { email },
          {
            $set: {
              resetToken,
              resetTokenExpires: new Date(Date.now() + 3600000), // 1 hour from now
            },
          }
        );

        // Send password reset email
        await sendResetEmail(email, resetToken);

        res.status(200).json({ message: "Password reset email sent" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* change password api */
    app.post("/change-password", verifyAuthToken, async (req, res) => {
      try {
        const { oldPassword, newPassword, email } = req.body;

        // Check if user exists
        const user = await database.collection("users").findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Validate old password
        const isPasswordValid = await bcrypt.compare(
          oldPassword,
          user.password
        );
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Old password is incorrect" });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10); // Use 10 rounds of salt

        // Update user's password in the database
        await database
          .collection("users")
          .updateOne({ email }, { $set: { password: hashedNewPassword } });

        res.status(200).json({ message: "Password changed successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Login Endpoint
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        // Find user by email
        const user = await database.collection("users").findOne({ email });
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.status(200).json({ token });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* user profile update */
    const generateUniqueId = async () => {
      let isUnique = false;
      let uniqueId;
      while (!isUnique) {
        const randomNum = Math.floor(1000 + Math.random() * 9000); // Generates a random 4-digit number
        uniqueId = `DMF-${randomNum}`;
        const existingUser = await database
          .collection("users")
          .findOne({ uniqueId });
        if (!existingUser) {
          isUnique = true;
        }
      }
      return uniqueId;
    };
    // Update the /update-user endpoint in your server code

    app.post("/update-user", verifyAuthToken, async (req, res) => {
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
        } = req.body;
        // Extract email from verified token

        console.log("email", email);

        // Check if user exists
        const user = await database
          .collection("users")
          .findOne({ email: email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Generate unique ID if it doesn't exist
        if (!user.uniqueId) {
          const uniqueId = await generateUniqueId();
          user.uniqueId = uniqueId;
          await database
            .collection("users")
            .updateOne({ email: email }, { $set: { uniqueId } });
        }

        // Update existing user details
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
    });

    // update user role by admin

    app.post("/update-user-role", verifyAuthToken, async (req, res) => {
      try {
        const { userRole, email } = req.body;

        // Check if user exists
        const user = await database
          .collection("users")
          .findOne({ email: email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update user role
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
    });

    // Function to generate JWT token
    function generateToken(userId) {
      // Replace with your secret key
      const secretKey = process.env.JWT_SECRET || "your-secret-key";

      // Generate token
      const token = jwt.sign({ userId }, secretKey, { expiresIn: "5h" });

      return token;
    }

    // Function to generate a random verification token
    function generateVerificationToken() {
      return Math.random().toString(36).substr(2, 10);
    }

    // Function to send verification email
    async function sendVerificationEmail(email, token) {
      try {
        // Create a test account with Ethereal
        const testAccount = await nodemailer.createTestAccount();

        // Create a nodemailer transporter using the test account
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        // Send email
        const info = await transporter.sendMail({
          from: "your@example.com",
          to: email,
          subject: "Email Verification",
          html: `<p>Click <a href="http://yourwebsite.com/verify?token=${token}">here</a> to verify your email.</p>`,
        });

        console.log(
          "Email verification sent:",
          nodemailer.getTestMessageUrl(info)
        );
      } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Rethrow the error so it can be caught and handled where the function is called
      }
    }

    // Endpoint to fetch user information
    app.get("/userinfo", async (req, res) => {
      try {
        // Extract token from Authorization header
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
          return res
            .status(401)
            .json({ message: "Unauthorized: Token missing" });
        }

        // Verify and decode the token
        const userId = verifyToken(token);
        if (!userId) {
          return res
            .status(401)
            .json({ message: "Unauthorized: Invalid token" });
        }

        // Fetch user information from the database
        const user = await database
          .collection("users")
          .findOne({ _id: ObjectId(userId) });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Send user information in the response
        res.status(200).json(user);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Endpoint to get all users
    app.get("/users", async (req, res) => {
      try {
        // Fetch all users from the database
        const users = await database.collection("users").find().toArray();
        // Send the list of users in the response
        res.status(200).json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* Amount Deposit Information */
    app.post("/deposit-info", verifyAuthToken, async (req, res) => {
      try {
        const {
          amount,
          userName,
          userID,
          phone,
          tnxID,
          paymentMethod,
          project,
          status,
        } = req.body;

        // Check if all required fields are provided
        if (!amount || !phone || !tnxID) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Insert the submitted information into the database
        const result = await database.collection("deposit").insertOne({
          userName,
          amount,
          phone,
          tnxID,
          paymentMethod,
          project,
          status,
          userID,
          depositDate: new Date(),
        });

        console.log("Insertion result:", result);

        // Check if the insertion was successful
        if (!result) {
          console.error("Failed to insert information into the database");
          return res
            .status(500)
            .json({ message: "Failed to submit information" });
        }

        res.status(201).json({ message: "Information submitted successfully" });
      } catch (error) {
        console.error("Error submitting information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    /* update deposit status */
    app.post("/update-deposit-status", verifyAuthToken, async (req, res) => {
      try {
        const { status, id } = req.body;

        // Check if user existsx
        const deposit = await database
          .collection("deposit")
          .findOne({ _id: ObjectId(id) });
        if (!deposit) {
          return res
            .status(404)
            .json({ message: "Deposit History not found!" });
        }

        // Update user role
        await database
          .collection("deposit")
          .updateOne({ _id: ObjectId(id) }, { $set: { status } });

        const updatedDeposit = await database
          .collection("deposit")
          .findOne({ _id: ObjectId(id) });

        res.status(200).json({
          message: "Status updated successfully",
          user: updatedDeposit,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    app.get("/deposit-info", verifyAuthToken, async (req, res) => {
      try {
        // Fetch all users from the database
        const users = await database.collection("deposit").find().toArray();
        // Send the list of users in the response
        res.status(200).json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /*  deposit get which is created */
    app.get("/deposit-info/:userID", verifyAuthToken, async (req, res) => {
      try {
        const { userID } = req.params;

        // Check if userID is provided
        if (!userID) {
          return res.status(400).json({ message: "userID is required" });
        }

        // Find all deposit records for the given userID
        const deposits = await database
          .collection("deposit")
          .find({ userID: userID })
          .toArray();

        // Check if deposits were found
        if (deposits.length === 0) {
          return res
            .status(404)
            .json({ message: "No deposits found for the given userID" });
        }

        res.status(200).json({ deposits });
      } catch (error) {
        console.error("Error fetching deposit information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Delete Information Endpoint
    app.delete("/deposit-info/:id", verifyAuthToken, async (req, res) => {
      try {
        const id = req.params.id;

        // Delete the information from the database
        const result = await database.collection("deposit").deleteOne({
          _id: ObjectId(id),
        });

        // Check if the deletion was successful
        if (result.deletedCount !== 1) {
          return res.status(404).json({ message: "Information not found" });
        }

        res.status(200).json({ message: "Information deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* project information */
    app.post("/add-project-info", verifyAuthToken, async (req, res) => {
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

        // Insert the submitted information into the database
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

        console.log("Insertion result:", result);

        // Check if the insertion was successful
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
    });
    /* update project */
    app.put("/update-project-info/:id", verifyAuthToken, async (req, res) => {
      try {
        const projectId = req.params.id;
        console.log("projectId", projectId);
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
        console.log("projectId", projectLeader);

        // Construct the update object
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
          updatedAt: new Date(), // Add updated date
        };

        // Filter out undefined values to avoid updating fields to undefined
        Object.keys(updateData).forEach(
          (key) => updateData[key] === undefined && delete updateData[key]
        );

        // Update the project information in the database
        const result = await database
          .collection("project")
          .updateOne({ _id: new ObjectId(projectId) }, { $set: updateData });

        console.log("Update result:", result);

        // Check if the update was successful
        if (result.matchedCount === 0) {
          console.error("No project found with the given ID");
          return res.status(404).json({ message: "Project not found" });
        }

        res.status(200).json({ message: "Information updated successfully" });
      } catch (error) {
        console.error("Error updating information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    app.get("/project-info", async (req, res) => {
      try {
        // Fetch all projects from the database excluding those with approvalStatus as "Delete"
        const projects = await database
          .collection("project")
          .find({ approvalStatus: { $ne: "Delete" } })
          .toArray();

        // Send the list of projects in the response
        res.status(200).json(projects);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* update approval status on project  */
    app.post("/update-project-status", verifyAuthToken, async (req, res) => {
      try {
        const { approvalStatus, projectID } = req.body;

        // Check if user exists
        const user = await database
          .collection("project")
          .findOne({ _id: ObjectId(projectID) });
        if (!user) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Update user role
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
    });
    /* delete project */
    app.delete("/project-info/:id", verifyAuthToken, async (req, res) => {
      try {
        const id = req.params.id;

        // Update the approvalStatus to "Delete" instead of deleting the document
        const result = await database
          .collection("project")
          .updateOne(
            { _id: ObjectId(id) },
            { $set: { approvalStatus: "Delete" } }
          );

        // Check if the update was successful
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
    });

    /* 
    Result Information
    */
    app.post("/add-result", verifyAuthToken, async (req, res) => {
      try {
        const { scholarshipRollNumber, resultDetails } = req.body;

        console.log("--", scholarshipRollNumber);

        /*  // Check if all required fields are provided
        if (!scholarshipRollNumber || !Array.isArray(resultDetails)) {
          return res.status(400).json({
            message: "scholarshipRollNumber and resultDetails are required",
          });
        } */

        // Get the user ID from the token
        const userId = req.userId;

        // Find the scholarship document and update the resultDetails array
        const result = await database.collection("scholarship").updateOne(
          { scholarshipRollNumber: scholarshipRollNumber },
          {
            $set: { userId: ObjectId(userId) },
            $push: { resultDetails: { $each: [resultDetails] } },
          }
        );

        console.log("Update result:", result);

        // Check if the update was successful
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Scholarship not found" });
        }

        if (result.modifiedCount === 0) {
          console.error("Failed to update result details in the database");
          return res
            .status(500)
            .json({ message: "Failed to add result details" });
        }

        res.status(200).json({ message: "Result details added successfully" });
      } catch (error) {
        console.error("Error adding result details:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* get result */
    app.get("/search-result/:scholarshipRollNumber", async (req, res) => {
      try {
        const { scholarshipRollNumber } = req.params;

        // Get the user ID from the token (if needed for additional checks)
        const userId = req.userId;

        // Find the scholarship document by scholarshipRollNumber
        const scholarship = await database
          .collection("scholarship")
          .findOne({ scholarshipRollNumber: scholarshipRollNumber });

        // Check if the scholarship document exists
        if (!scholarship) {
          return res.status(404).json({ message: "Scholarship not found" });
        }

        res.status(200).json(scholarship);
      } catch (error) {
        console.error("Error searching for result:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Submit Information Endpoint
    // Submit Information Endpoint
    app.post("/scholarship-info", async (req, res) => {
      try {
        const {
          name,
          parentName,
          instituteClass,
          institute,
          phone,
          gender,
          instituteRollNumber,
          presentAddress,
          bloodGroup,
          image,
          dateOfBirth,
        } = req.body;

        // Check if all required fields are provided
        if (
          !name ||
          !institute ||
          !phone ||
          !gender ||
          !presentAddress ||
          !bloodGroup ||
          !dateOfBirth
        ) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Generate a unique scholarship roll number with "dmf" prefix
        const scholarshipRollNumber = generateUniqueScholarshipRollNumber();

        // Get the user ID from the token
        const userId = req.userId;

        // Insert the submitted information into the database
        const result = await database.collection("scholarship").insertOne({
          userId: ObjectId(userId),
          name,
          parentName,
          instituteClass,
          instituteRollNumber,
          scholarshipRollNumber: scholarshipRollNumber, // Assign scholarship roll number directly
          institute,
          phone,
          gender,
          presentAddress,
          bloodGroup,
          dateOfBirth,
          image,
          submittedAt: new Date(),
        });

        console.log("Insertion result:", result);

        // Check if the insertion was successful
        if (!result) {
          console.error("Failed to insert information into the database");
          return res
            .status(500)
            .json({ message: "Failed to submit information" });
        }

        res.status(201).json({ message: "Information submitted successfully" });
      } catch (error) {
        console.error("Error submitting information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Function to generate unique scholarship roll number with "dmf" prefix
    function generateUniqueScholarshipRollNumber() {
      // Generate a random number between 100000 and 999999
      const randomNumber = Math.floor(100000 + Math.random() * 900000);

      // Concatenate "dmf" prefix with the random number
      const scholarshipRollNumber = "DMF" + randomNumber;

      return scholarshipRollNumber;
    }

    // Endpoint to retrieve all submitted information
    app.get("/scholarship-info", async (req, res) => {
      try {
        // Verify token and get user ID
        const userId = req.userId;

        // Fetch all submitted information for the user
        const submittedInfo = await database
          .collection("scholarship")
          .find({ userId: ObjectId(userId) })
          .toArray();

        res.status(200).json(submittedInfo);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    const { ObjectId } = require("mongodb");

    // Assuming `database` is your MongoDB database connection

    app.get("/scholarship-info/:id", async (req, res) => {
      try {
        const scholarshipId = req.params.id;

        // Check if the provided ID is a valid ObjectId
        if (!ObjectId.isValid(scholarshipId)) {
          return res.status(400).json({ message: "Invalid scholarship ID" });
        }

        // Query the database for the scholarship information
        const scholarship = await database.collection("scholarship").findOne({
          _id: ObjectId(scholarshipId),
          userId: ObjectId(req.userId), // Assuming you want to ensure the scholarship belongs to the current user
        });

        // Check if the scholarship exists
        if (!scholarship) {
          return res.status(404).json({ message: "Scholarship not found" });
        }

        res.status(200).json({ scholarship });
      } catch (error) {
        console.error("Error fetching scholarship information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Update Information Endpoint
    app.put("/scholarship-info/:id", async (req, res) => {
      try {
        const scholarshipId = req.params.id;
        const {
          name,
          parentName,
          instituteClass,
          instituteRollNumber,
          institute,
          phone,
          gender,
          presentAddress,
          bloodGroup,
        } = req.body;

        // Check if all required fields are provided
        if (!name || !institute || !phone || !gender || !location) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Update the information in the database
        const result = await database.collection("scholarship").updateOne(
          { _id: ObjectId(scholarshipId) },
          {
            $set: {
              name,
              parentName,
              instituteClass,
              instituteRollNumber,
              institute,
              phone,
              gender,
              presentAddress,
              bloodGroup,
              updatedAt: new Date(),
            },
          }
        );

        // Check if the update was successful
        if (result.modifiedCount !== 1) {
          return res.status(404).json({ message: "Information not found" });
        }

        res.status(200).json({ message: "Information updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Delete Information Endpoint
    app.delete("/scholarship-info/:id", async (req, res) => {
      try {
        const scholarshipId = req.params.id;

        // Delete the information from the database
        const result = await database.collection("scholarship").deleteOne({
          _id: ObjectId(scholarshipId),
        });

        // Check if the deletion was successful
        if (result.deletedCount !== 1) {
          return res.status(404).json({ message: "Information not found" });
        }

        res.status(200).json({ message: "Information deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* cost information */
    /* ========================================= */
    /* Amount Deposit Information */
    app.post("/cost-info", verifyAuthToken, async (req, res) => {
      try {
        const {
          amount,
          userName,
          userID,
          invoice,
          paymentMethod,
          project,
          description,
          status,
          reason,
        } = req.body;

        // Check if all required fields are provided
        if (!amount || !reason) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Insert the submitted information into the database
        const result = await database.collection("costInfo").insertOne({
          amount,
          userName,
          userID,
          invoice,
          paymentMethod,
          project,
          description,
          status,
          reason,
          requestDate: new Date(),
        });

        console.log("Insertion result:", result);

        // Check if the insertion was successful
        if (!result) {
          console.error("Failed to insert information into the database");
          return res
            .status(500)
            .json({ message: "Failed to submit information" });
        }

        res.status(201).json({ message: "Information submitted successfully" });
      } catch (error) {
        console.error("Error submitting information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    /* update deposit status */
    app.post("/update-cost-status", verifyAuthToken, async (req, res) => {
      try {
        const { status, project, id } = req.body;

        // Check if the deposit exists
        const cost = await database
          .collection("costInfo")
          .findOne({ _id: ObjectId(id) });
        if (!cost) {
          return res
            .status(404)
            .json({ message: "Deposit History not found!" });
        }

        // Update the document with the new fields
        const acceptedDate = new Date();
        await database.collection("costInfo").updateOne(
          { _id: ObjectId(id) },
          {
            $set: { status, acceptedDate, project, acceptedDate },
          }
        );

        const updatedCost = await database
          .collection("costInfo")
          .findOne({ _id: ObjectId(id) });

        res.status(200).json({
          message: "Status updated successfully",
          user: updatedCost,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    app.get("/cost-info", verifyAuthToken, async (req, res) => {
      try {
        // Fetch all users from the database
        const users = await database.collection("costInfo").find().toArray();
        // Send the list of users in the response
        res.status(200).json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /*  deposit get which is created */
    app.get("/cost-info/:userID", verifyAuthToken, async (req, res) => {
      try {
        const { userID } = req.params;

        // Check if userID is provided
        if (!userID) {
          return res.status(400).json({ message: "userID is required" });
        }

        // Find all deposit records for the given userID
        const deposits = await database
          .collection("costInfo")
          .find({ userID: userID })
          .toArray();

        // Check if deposits were found
        if (deposits.length === 0) {
          return res
            .status(404)
            .json({ message: "No deposits found for the given userID" });
        }

        res.status(200).json({ deposits });
      } catch (error) {
        console.error("Error fetching deposit information:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Delete Information Endpoint
    app.delete("/cost-info/:id", verifyAuthToken, async (req, res) => {
      try {
        const id = req.params.id;

        // Delete the information from the database
        const result = await database.collection("costInfo").deleteOne({
          _id: ObjectId(id),
        });

        // Check if the deletion was successful
        if (result.deletedCount !== 1) {
          return res.status(404).json({ message: "Information not found" });
        }

        res.status(200).json({ message: "Information deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    /* ----------------------   drop down */
    app.get("/usersDropdown", async (req, res) => {
      try {
        // Fetch users with unique IDs from the database and create the username by joining firstName and lastName
        const users = await database
          .collection("users")
          .find({ uniqueId: { $exists: true } })
          .toArray();

        if (!users || users.length === 0) {
          return res.status(404).json({ message: "No users found" });
        }

        const usernames = users.map((user) => ({
          _id: user._id,
          username: `${user.firstName} ${user.lastName}`,
          image: user.image,
        }));

        // Send the list of usernames in the response
        res.status(200).json(usernames);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Middleware function to verify JWT token
    function verifyAuthToken(req, res, next) {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = verifyToken(token);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Pass the user ID to the next middleware or route handler
      req.userId = userId;
      next();
    }
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

// // WebSocket broadcast for all APIs
// app.use((req, res, next) => {
//   req.ws = wss; // Add WebSocket server instance to the request object
//   next();
// });

app.get("/", (req, res) => {
  res.send("dmf server two is running");
});

app.listen(port, () => {
  console.log("Server running at port", port);
});
