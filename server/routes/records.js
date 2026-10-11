const express = require("express");
const router = express.Router();

const Record = require("../models/Record");
const User = require("../models/User");

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");


// GET /api/records/student/:studentId

 // Advisor views a student's academic record
 // Student can also view their own academic record


router.get(
    "/student/:studentId",
    authenticateToken,
    (req, res, next) => {
        const isAdvisor = req.user.role === "advisor";
        console.log("JWT USER ID:", req.user.id);
        console.log("JWT ROLE:", req.user.role);
        console.log("REQUESTED ID:", req.params.studentId);
        const isStudentOwner =
            req.user.role === "student" &&
            String(req.user.id) === String(req.params.studentId);

        if (isAdvisor || isStudentOwner) {
            return next();
        }

        return res.status(403).json({
            error: "Access denied"
        });
    },
    async (req, res) => {
        try {
            const student = await User.findOne({
                _id: req.params.studentId,
                role: "student"
            }).select("name email studentId");

            if (!student) {
                return res.status(404).json({
                    error: "Student not found"
                });
            }

            const records = await Record.find({
                studentId: student._id
            })
                .populate("courseId", "code title credits")
                .sort({ term: 1 });

            res.json({
                student,
                records
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to fetch student record"
            });
        }
    }
);


module.exports = router;
