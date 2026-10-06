const express = require("express");
const router = express.Router();

const Course = require("../models/Course");

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");


// GET /api/courses
// Advisor gets the list of courses they can open
router.get(
    "/",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {

        try {
            const courses = await Course.find()
                .sort({ code: 1 });

            res.json(courses);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Failed to fetch courses"
            });
        }
    }
);


module.exports = router;