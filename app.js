const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./server/routes/auth");
const offeringRoutes = require("./server/routes/offerings");            // offering route to app (Min)
const courseRoutes = require("./server/routes/courses");                // Courses route to app (Min)
const userRoutes = require("./server/routes/users");                    // Users API (Min)
const recordRoutes = require("./server/routes/records");                // Record API (Min)
const registrationRoutes = require("./server/routes/registrations");    // Registration API

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
app.use("/api/auth", authRoutes);                    // Connect to auth
app.use("/api/offerings", offeringRoutes);           // Connect to offering 
app.use("/api/courses", courseRoutes);               // Connect to courses
app.use("/api/users", userRoutes);                   // Connect to users
app.use("/api/records", recordRoutes);               // Connect to records
app.use("/api/registrations", registrationRoutes);   // Connect to registations


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