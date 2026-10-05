const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./server/routes/auth");

const app = express();


// Middleware
app.use(cors());
app.use(express.json());


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });


// Routes
app.use("/api/auth", authRoutes);


// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Course Registration API is running"
    });
});


// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});