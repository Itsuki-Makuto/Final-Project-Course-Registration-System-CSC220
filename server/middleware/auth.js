// JWT to varify token => identify user => check role => allow request

const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Access token required"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Access token required"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(403).json({
            error: "Invalid or expired token"
        });
    }
}


function requireRole(role) {
    return (req, res, next) => {

        if (req.user.role !== role) {
            return res.status(403).json({
                error: "Access denied"
            });
        }

        next();
    };
}


module.exports = {
    authenticateToken,
    requireRole
};