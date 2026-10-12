
const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// GET /api/students/:id
// Retrieve one student by MongoDB ID.
router.get(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    error: "Invalid student ID"
                });
            }

            const student = await User.findOne({
                _id: id,
                role: "student"
            }).select("-passwordHash");

            if (!student) {
                return res.status(404).json({
                    error: "Student not found"
                });
            }

            res.status(200).json(student);
        } catch (error) {
            console.error("Get student error:", error);

            res.status(500).json({
                error: "Failed to retrieve student"
            });
        }
    }
);

module.exports = router;
