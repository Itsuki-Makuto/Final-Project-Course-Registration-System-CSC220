const express = require("express");
const router = express.Router();

const Offering = require("../models/Offering");
const Course = require("../models/Course");

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");


// GET /api/offerings?term=2026-1
// Advisor can view offerings
router.get(
    "/",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {

        try {
            const { term } = req.query;

            const filter = term ? { term } : {};

            const offerings = await Offering.find(filter)
                .populate("courseId", "code title credits")
                .sort({ term: 1, "courseId.code": 1, section: 1 });

            res.json(offerings);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Failed to fetch offerings"
            });
        }
    }
);


// POST /api/offerings
// Advisor creates a new course section
router.post(
    "/",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {

        try {

            const {
                courseId,
                term,
                section,
                day,
                startTime,
                endTime,
                room,
                instructor,
                seats,
                addDropCloseDate  // added course open and close window (Min)
            } = req.body;


            // Basic validation
            if (
                !courseId ||
                !term ||
                section === undefined ||
                !day ||
                !startTime ||
                !endTime ||
                !room ||
                !instructor ||
                seats === undefined
            ) {
                return res.status(400).json({
                    error: "All offering fields are required"
                });
            }


            // Check that course exists
            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    error: "Course not found"
                });
            }


            // Prevent duplicate section
            const existingOffering = await Offering.findOne({
                courseId,
                term,
                section
            });

            if (existingOffering) {
                return res.status(409).json({
                    error: "This section already exists for this term"
                });
            }


            const offering = await Offering.create({
                courseId,
                term,
                section,
                day,
                startTime,
                endTime,
                room,
                instructor,
                seats,
                seatsTaken: 0,
                addDropOpen: false
            });


            const populatedOffering = await offering.populate(
                "courseId",
                "code title credits"
            );


            res.status(201).json(populatedOffering);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Failed to create offering"
            });
        }
    }
);


// PATCH /api/offerings/:id
// Advisor edits offering / opens or closes add-drop
router.patch(
    "/:id",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {

        try {

            const offering = await Offering.findById(
                req.params.id
            );

            if (!offering) {
                return res.status(404).json({
                    error: "Offering not found"
                });
            }


            const allowedFields = [
                "term",
                "section",
                "day",
                "startTime",
                "endTime",
                "room",
                "instructor",
                "seats",
                "addDropOpen",
                "addDropCloseDate"  // Same as before added time window for PATCH (Min)
            ];


            allowedFields.forEach((field) => {

                if (req.body[field] !== undefined) {
                    offering[field] = req.body[field];
                }

            });


            // Do not allow seats to become smaller than
            // the number of students already registered.
            if (offering.seats < offering.seatsTaken) {

                return res.status(400).json({
                    error:
                        `Seats cannot be less than seats already taken (${offering.seatsTaken})`
                });

            }


            await offering.save();


            const populatedOffering = await offering.populate(
                "courseId",
                "code title credits"
            );


            res.json(populatedOffering);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Failed to update offering"
            });
        }
    }
);


// DELETE /api/offerings/:id
// Advisor removes an offering
router.delete(
    "/:id",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {

        try {

            const offering = await Offering.findById(
                req.params.id
            );

            if (!offering) {
                return res.status(404).json({
                    error: "Offering not found"
                });
            }


            // Don't delete an offering that still has students.
            if (offering.seatsTaken > 0) {

                return res.status(400).json({
                    error:
                        "Cannot delete an offering with registered students"
                });
            }


            await offering.deleteOne();


            res.json({
                message: "Offering deleted successfully"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Failed to delete offering"
            });
        }
    }
);


module.exports = router;