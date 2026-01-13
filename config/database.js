const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Error: MONGODB_URI is not defined in .env file");
  console.error("Please create a .env file with your MongoDB connection string:");
  console.error("MONGODB_URI=your_mongodb_connection_string");
  process.exit(1);
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let database = null;

async function connectDB() {
  try {
    if (!database) {
      await client.connect();
      database = client.db("Upokari");
      console.log("Connected to MongoDB");
    }
    return database;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

function getDatabase() {
  if (!database) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return database;
}

module.exports = {
  connectDB,
  getDatabase,
  client,
};
