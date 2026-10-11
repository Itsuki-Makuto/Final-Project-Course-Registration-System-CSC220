import { useEffect, useState } from "react";

import Login from "./pages/Login";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        verifyLogin();
    }, []);

    async function verifyLogin() {
        const token = localStorage.getItem("token");

        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:3000/api/auth/me",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Invalid login");
            }

            setUser(data.user);

            // Keep localStorage user information updated
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

        } catch (error) {
            console.error(error);

            // Token is invalid/expired
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            setUser(null);

        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <p className="container py-5 text-body-secondary" role="status">Checking login...</p>;
    }

    if (!user) {
        return <Login />;
    }

    if (user.role === "advisor") {
        return <AdvisorDashboard />;
    }

    if (user.role === "admin") {
        return <AdminDashboard />;
    }

    if (user.role === "student") {
        return <StudentDashboard />;
    }

    // Unknown role
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Login />;
}

export default App;