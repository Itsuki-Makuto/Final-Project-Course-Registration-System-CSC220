const express = require("express");
const router = express.Router();

const User = require("../models/User");
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");


// GET /api/users/students
// Advisor gets the list of students
router.get(
    "/students",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {

        try {
            const students = await User.find({
                role: "student",
                active: true
            })
            .select("name email studentId")
            .sort({ name: 1 });

            res.json(students);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Failed to fetch students"
            });
        }
    }
);

// GET /api/users?role=student
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        const filter = req.query.role ? { role: req.query.role } : {};
        const users = await User.find(filter).select("-passwordHash").sort({ name: 1 });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

module.exports = router;