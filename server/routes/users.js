const express = require("express");
const bcrypt = require("bcrypt");
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

// POST /api/users
// Admin creates a new user
router.post(
    "/",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { name, email, role, studentId, password } = req.body;

            // Validate required fields
            if (!name || !email || !role || !password) {
                return res.status(400).json({
                    error: "Name, email, role, and password are required"
                });
            }

            // Validate role
            if (!["admin", "advisor", "student"].includes(role)) {
                return res.status(400).json({
                    error: "Invalid user role"
                });
            }

            // Student ID is required for students
            if (role === "student" && !studentId?.trim()) {
                return res.status(400).json({
                    error: "Student ID is required for students"
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    error: "Password must be at least 8 characters"
                });
            }

            const normalizedEmail = email.trim().toLowerCase();

            // Check duplicate email
            const existingUser = await User.findOne({
                email: normalizedEmail
            });

            if (existingUser) {
                return res.status(409).json({
                    error: "Email is already in use"
                });
            }

            // Hash password before saving
            const passwordHash = await bcrypt.hash(password, 10);

            const newUser = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                role,
                studentId: role === "student" ? studentId.trim() : null,
                advisorId: role === "advisor" ? (req.body.advisorId || null) : null,
                active: true
            });

            newUser.accountId =
                `${role.toUpperCase()}-${newUser._id.toString().slice(-6).toUpperCase()}`;

            await newUser.save();

            // Never return the password hash
            res.status(201).json({
                message: "User created successfully",
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    studentId: newUser.studentId,
                    advisorId: newUser.advisorId,
                    active: newUser.active
                }
            });

        } catch (error) {
            console.error(error);

            if (error.code === 11000) {
                return res.status(409).json({
                    error: "Email is already in use"
                });
            }

            res.status(500).json({
                error: "Failed to create user"
            });
        }
    }
);


router.put("/:id", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, studentId } = req.body;

        // Validate the role
        if (!["admin", "advisor", "student"].includes(role)) {
            return res.status(400).json({ error: "Invalid user role" });
        }

        // Validate required fields
        if (!name?.trim() || !email?.trim()) {
            return res.status(400).json({
                error: "Name and email are required"
            });
        }

        if (role === "student" && !studentId?.trim()) {
            return res.status(400).json({
                error: "Student ID is required for students"
            });
        }

        // Find the user
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        
        const Record = require("../models/Record");
        const Registration = require("../models/Registration");

        if (user.role === "student") {
            const hasRecords = await Record.exists({
                studentId: user._id
            });

            const hasRegistrations = await Registration.exists({
                studentId: user._id
            });

        if (hasRecords || hasRegistrations) {
            // Students with history cannot change role or student ID
            if (role !== "student") {
                return res.status(400).json({
                    error: "Cannot change the role of a student with academic history"
                });
            }

            if (studentId?.trim() !== user.studentId) {
                return res.status(400).json({
                    error: "Cannot change the student ID of a student with academic history"
                });
            }
        }
    }


        // Check whether another user already uses this email
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: id }
        });

        if (existingUser) {
            return res.status(409).json({
                error: "Email is already in use"
            });
        }

        // Update allowed fields only
        user.name = name.trim();
        user.email = normalizedEmail;
        user.role = role;
        user.studentId = role === "student" ? studentId.trim() : null;

        if (role !== "advisor") {
            user.advisorId = null;
        }

        await user.save();

        res.json({
            message: "User updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                advisorId: user.advisorId,
                active: user.active
            }
        });
    } catch (error) {
        console.error(error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: "Email is already in use"
            });
        }

        res.status(500).json({ error: "Failed to update user" });
    }
});


router.delete("/:id", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting your own account
        if (id === req.user.id) {
            return res.status(400).json({
                error: "You cannot delete your own account"
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        // Prevent deleting the last active admin
        if (user.role === "admin" && user.active) {
            const activeAdminCount = await User.countDocuments({
                role: "admin",
                active: true
            });

            if (activeAdminCount <= 1) {
                return res.status(400).json({
                    error: "Cannot delete the last active admin"
                });
            }
        }

        // For users with academic history, deactivate instead
        const Record = require("../models/Record");
        const Registration = require("../models/Registration");

        const hasRecords = await Record.exists({ studentId: user._id });
        const hasRegistrations = await Registration.exists({
            studentId: user._id
        });

        if (hasRecords || hasRegistrations) {
            user.active = false;
            await user.save();

            return res.json({
                message: "User has academic history and was deactivated instead",
                action: "deactivated"
            });
        }

        // Permanently delete users without academic history
        await User.findByIdAndDelete(id);

        res.json({
            message: "User deleted successfully",
            action: "deleted"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to delete user"
        });
    }
});


router.patch(
    "/:id/status",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { active } = req.body;

            if (typeof active !== "boolean") {
                return res.status(400).json({
                    error: "Active must be true or false"
                });
            }

            if (!require("mongoose").isValidObjectId(id)) {
                return res.status(400).json({
                    error: "Invalid user ID"
                });
            }

            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            // Prevent deactivating the last active admin
            if (user.role === "admin" && user.active && !active) {
                const count = await User.countDocuments({
                    role: "admin",
                    active: true
                });

                if (count <= 1) {
                    return res.status(400).json({
                        error: "Cannot deactivate the last active admin"
                    });
                }
            }

            user.active = active;
            await user.save();

            res.json({
                message: active
                    ? "User reactivated successfully"
                    : "User deactivated successfully",
                user: {
                    _id: user._id,
                    name: user.name,
                    active: user.active
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to update account status"
            });
        }
    }
);


module.exports = router;