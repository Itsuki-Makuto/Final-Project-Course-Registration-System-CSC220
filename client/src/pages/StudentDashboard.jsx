import Navbar from "../components/Navbar";
import "../css/StudentDashboard.css";

function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
    }

    return (
        <div className="student-dashboard">
            <Navbar title="Student Dashboard" user={user || { role: "Student" }} onLogout={logout} />
            <main className="container dashboard-content">
                <section className="card dashboard-section student-overview">
                    <h2>Course Registration</h2>
                    <p className="text-body-secondary">Student dashboard coming soon.</p>
                </section>
            </main>
        </div>
    );
}

export default StudentDashboard;
