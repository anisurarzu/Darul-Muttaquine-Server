const express = require("express");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

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
        });

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        res.status(201).json({ message: "User registered successfully" });
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

    // Function to generate JWT token
    function generateToken(userId) {
      // Replace with your secret key
      const secretKey = process.env.JWT_SECRET || "your-secret-key";

      // Generate token
      const token = jwt.sign({ userId }, secretKey, { expiresIn: "1h" });

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

    // Submit Information Endpoint
    app.post("/scholarship-info", verifyAuthToken, async (req, res) => {
      try {
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

        // Get the user ID from the token
        const userId = req.userId;

        // Insert the submitted information into the database
        const result = await database.collection("scholarship").insertOne({
          userId: ObjectId(userId),
          name,
          parentName,
          instituteClass,
          instituteRollNumber,
          institute,
          phone,
          gender,
          presentAddress,
          bloodGroup,
          submittedAt: new Date(),
        });

        // Check if the insertion was successful
        if (result.insertedCount !== 1) {
          throw new Error("Failed to submit information");
        }

        res.status(201).json({ message: "Information submitted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Endpoint to retrieve all submitted information
    app.get("/scholarship-info", verifyAuthToken, async (req, res) => {
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
    // Update Information Endpoint
    app.put("/scholarship-info/:id", verifyAuthToken, async (req, res) => {
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
    app.delete("/scholarship-info/:id", verifyAuthToken, async (req, res) => {
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

app.get("/", (req, res) => {
  res.send("dmf server two is running");
});

app.listen(port, () => {
  console.log("Server running at port", port);
});
