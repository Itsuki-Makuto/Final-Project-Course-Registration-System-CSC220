const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Record = require("../models/Record");

const User = require("../models/User");
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// All user-management routes require an authenticated admin.
const adminOnly = [authenticateToken, requireRole("admin")];

const allowedRoles = ["admin", "advisor", "student"];

// GET /api/users/students
// Advisors get the list of active students.
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
            console.error("Fetch students error:", error);
            res.status(500).json({
                error: "Failed to fetch students"
            });
        }
    }
);

// GET /api/users?role=student
// Admin gets all users, optionally filtered by role.
router.get("/", ...adminOnly, async (req, res) => {
    try {
        const filter = {};

        if (req.query.role) {
            if (!allowedRoles.includes(req.query.role)) {
                return res.status(400).json({
                    error: "Invalid role"
                });
            }

            filter.role = req.query.role;
        }

        const users = await User.find(filter)
            .select("-passwordHash")
            .sort({ name: 1 });

        res.json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({
            error: "Failed to fetch users"
        });
    }
});

// POST /api/users
// Admin creates a user.
router.post("/", ...adminOnly, async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            studentId
        } = req.body;

        if (
            !name?.trim() ||
            !email?.trim() ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                error: "Name, email, password, and role are required"
            });
        }

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                error: "Invalid role"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters"
            });
        }

        if (role === "student" && !studentId?.trim()) {
            return res.status(400).json({
                error: "Student ID is required for students"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                error: "An account with this email already exists"
            });
        }

        if (
            role === "student" &&
            await User.exists({ studentId: studentId.trim() })
        ) {
            return res.status(409).json({
                error: "This student ID is already assigned"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role,
            studentId: role === "student" ? studentId.trim() : null,
            advisorId: null,
            active: true
        });

        const result = user.toObject();
        delete result.passwordHash;

        res.status(201).json({
            message: "User created successfully",
            user: result
        });
    } catch (error) {
        console.error("Create user error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: "Email or ID already exists"
            });
        }

        res.status(500).json({
            error: "Failed to create user"
        });
    }
});

// PUT /api/users/:id
// Admin updates a user's profile and role.
router.put("/:id", ...adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, studentId } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                error: "Invalid user ID"
            });
        }

        if (!name?.trim() || !email?.trim() || !role) {
            return res.status(400).json({
                error: "Name, email, and role are required"
            });
        }

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                error: "Invalid role"
            });
        }

        if (role === "student" && !studentId?.trim()) {
            return res.status(400).json({
                error: "Student ID is required for students"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findById(id);

        if (!existingUser) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        const duplicateEmail = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: id }
        });

        if (duplicateEmail) {
            return res.status(409).json({
                error: "Email is already in use"
            });
        }

        if (role === "student") {
            const duplicateStudentId = await User.findOne({
                studentId: studentId.trim(),
                _id: { $ne: id }
            });

            if (duplicateStudentId) {
                return res.status(409).json({
                    error: "Student ID is already assigned"
                });
            }
        }

        existingUser.name = name.trim();
        existingUser.email = normalizedEmail;
        existingUser.role = role;

        existingUser.studentId =
            role === "student" ? studentId.trim() : null;

        // Do not accidentally assign a student ID to an advisor/admin.
        // Advisor IDs are preserved only for advisor accounts.
        if (role !== "advisor") {
            existingUser.advisorId = null;
        }

        await existingUser.save();

        const result = existingUser.toObject();
        delete result.passwordHash;

        res.json({
            message: "User updated successfully",
            user: result
        });
    } catch (error) {
        console.error("Update user error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: "Email or ID already exists"
            });
        }

        res.status(500).json({
            error: "Failed to update user"
        });
    }
});

// PATCH /api/users/:id/status
// Admin deactivates or reactivates an account.
router.patch(
    "/:id/status",
    ...adminOnly,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { active } = req.body;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    error: "Invalid user ID"
                });
            }

            if (typeof active !== "boolean") {
                return res.status(400).json({
                    error: "Active must be true or false"
                });
            }

            if (id === req.user.id && active === false) {
                return res.status(400).json({
                    error: "You cannot deactivate your own account"
                });
            }

            const user = await User.findByIdAndUpdate(
                id,
                { $set: { active } },
                { new: true, runValidators: true }
            ).select("-passwordHash");

            if (!user) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            res.json({
                message: active
                    ? "Account reactivated successfully"
                    : "Account deactivated successfully",
                user
            });
        } catch (error) {
            console.error("Change user status error:", error);
            res.status(500).json({
                error: "Failed to change account status"
            });
        }
    }
);

// DELETE /api/users/:id
// Safely deactivate instead of permanently deleting the user.
// This preserves references to academic records and registrations.

router.delete("/:id", ...adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                error: "Invalid user ID"
            });
        }

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

        // Check whether this account has academic history.
        const hasRegistrations = await Registration.exists({
            studentId: user._id
        });

        const hasRecords = await Record.exists({
            studentId: user._id
        });

        if (hasRegistrations || hasRecords) {
            // Preserve the account because it has academic history.
            user.active = false;
            await user.save();

            return res.json({
                message: "Account deactivated because academic history exists.",
                action: "deactivated"
            });
        }

        // No academic history: permanently delete the account.
        await User.findByIdAndDelete(user._id);

        return res.json({
            message: "Account permanently deleted because no academic history exists.",
            action: "deleted"
        });

    } catch (error) {
        console.error("Delete user error:", error);

        res.status(500).json({
            error: "Failed to delete user"
        });
    }
});



module.exports = router;
