import Navbar from "../components/Navbar";
import "../css/AdminDashboard.css";

function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
    }

    return (
        <div className="admin-dashboard">
            <Navbar title="Admin Dashboard" user={user || { role: "Admin" }} onLogout={logout} />
            <main className="container dashboard-content">
                <section className="card dashboard-section admin-overview">
                    <h2>Administration</h2>
                    <p className="text-body-secondary">Admin dashboard coming soon.</p>
                </section>
            </main>
        </div>
    );
}

export default AdminDashboard;
