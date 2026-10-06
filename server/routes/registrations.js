const express = require("express");
const router = express.Router();


const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const Record = require("../models/Record");

const { authenticateToken, requireRole } = require("../middleware/auth");

// GET /api/registrations/student/:studentId
router.get(
    "/student/:studentId",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { term } = req.query;

            const query = {
                studentId,
                status: "registered"
            };

            if (term) {
                query.term = term;
            }

            const registrations = await Registration.find(query)
                .populate({
                    path: "offeringId",
                    populate: {
                        path: "courseId",
                        select: "code title credits"
                    }
                })
                .sort({ createdAt: 1 });

            res.json(registrations);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to fetch student registrations"
            });
        }
    }
);

// POST /api/registrations
// Advisor registers a student into an offering
router.post(
    "/",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {
        try {
            const { studentId, offeringId, term } = req.body;

            if (!studentId || !offeringId || !term) {
                return res.status(400).json({
                    error: "studentId, offeringId and term are required"
                });
            }

            // Find the offering
            const offering = await Offering.findById(offeringId).populate(
                "courseId",
                "code title credits"
            );

            if (!offering) {
                return res.status(404).json({
                    error: "Offering not found"
                });
            }

            // Course closed
            if (!offering.addDropOpen) {
                return res.status(400).json({
                    error: "Add/Drop is closed for this course"
                });
            }

            // Check if the course if not offered this term
            if (offering.term !== term) {
                return res.status(400).json({
                    error: "This course is not offered in the selected term"
                });
            }

            // Check if the section is full
            if (offering.seatsTaken >= offering.seats) {
                return res.status(400).json({
                    error: "This section is full"
                });
            }

            // checking pass course
            const previousRecord = await Record.findOne({
                studentId,
                courseId: offering.courseId._id
            });

            if (previousRecord) {
                const passedGrades = [
                    "A",
                    "A-",
                    "B+",
                    "B",
                    "B-",
                    "C+",
                    "C",
                    "C-",
                    "D+",
                    "D"
                ];

            if (passedGrades.includes(previousRecord.grade)) {
                return res.status(400).json({
                error: `Student already passed ${offering.courseId.code} with grade ${previousRecord.grade}`
                });
            }
            }

            // Check if student is already registered
            const existingRegistration = await Registration.findOne({
                studentId,
                offeringId,
                status: "registered"
            });

            if (existingRegistration) {
                return res.status(400).json({
                    error: "Student is already registered in this course"
                });
            }

            // Check for time clashes
            const currentRegistrations = await Registration.find({
                studentId,
                term,
                status: "registered"
            }).populate({

                path: "offeringId",
                populate: {
                    path: "courseId",
                    select: "code title"
                }
            });

            for (const registration of currentRegistrations) {
                const existingOffering = registration.offeringId;

            // Only compare offerings on the same day
            if (existingOffering.day !== offering.day) {
                continue;
            }

            const existingStart = existingOffering.startTime;
            const existingEnd = existingOffering.endTime;

            const newStart = offering.startTime;
            const newEnd = offering.endTime;

            // Check whether the two time ranges overlap
            if (newStart < existingEnd && newEnd > existingStart) {
                return res.status(400).json({
                    error: `Time clash with ${existingOffering.courseId.code}`
                });
            }
        }

            // Create registration
            const registration = await Registration.create({
                studentId,
                offeringId,
                term,
                status: "registered"
            });

            // Increase seats taken
            offering.seatsTaken += 1;
            await offering.save();

            res.status(201).json(registration);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to register student"
            });
        }
    }
);

// DELETE /api/registrations/:id
// Advisor removes a student's registration
router.delete(
    "/:id",
    authenticateToken,
    requireRole("advisor"),
    async (req, res) => {
        try {
            const registration = await Registration.findById(req.params.id);

            if (!registration) {
                return res.status(404).json({
                    error: "Registration not found"
                });
            }

            if (registration.status === "dropped") {
                return res.status(400).json({
                    error: "Registration is already dropped"
                });
            }

            const offering = await Offering.findById(registration.offeringId);

            if (!offering) {
                return res.status(404).json({
                    error: "Offering not found"
                });
            }

            // Mark registration as dropped
            registration.status = "dropped";
            await registration.save();

            // Decrease seats taken
            if (offering.seatsTaken > 0) {
                offering.seatsTaken -= 1;
                await offering.save();
            }

            res.json({
                message: "Registration removed successfully"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to remove registration"
            });
        }
    }
);

module.exports = router;