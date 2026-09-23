const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


// Connection to MongoDB
mongoose.connect(process.env.MONGO_URI)   
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });


// User model
const User = mongoose.model("User", {
    email: String,
    password: String
});


// Login
app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    try {

        // Find user by email
        const user = await User.findOne({ email: email });

        // User doesn't exist
        if (!user) {
            return res.status(401).send("Invalid email or password");
        }

        // Compare entered password with database hash
        const passwordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        // Password is wrong
        if (!passwordCorrect) {
            return res.status(401).send("Invalid email or password");
        }

        // Everything is correct
        res.send("Login successful!");

    } catch (error) {

        console.error(error);
        res.status(500).send("Server error");

    }
});


app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});