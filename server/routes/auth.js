const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();


// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check that both fields were provided
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        // Check if account is active
        if (!user.active) {
            return res.status(403).json({
                error: "Account is inactive"
            });
        }

        // Compare entered password with passwordHash in MongoDB
        const passwordCorrect = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // Send information back to React
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                advisorId: user.advisorId
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            error: "Server error"
        });
    }
});

// GET /api/auth/me
router.get(
    "/me",
    authenticateToken,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.id)
                .select("name email role studentId advisorId active");

            if (!user) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            if (!user.active) {
                return res.status(403).json({
                    error: "Account is inactive"
                });
            }

            res.json({
                user
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to verify user"
            });
        }
    }
);

module.exports = router;