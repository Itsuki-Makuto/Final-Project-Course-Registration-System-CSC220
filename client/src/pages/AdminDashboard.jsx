function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
    }

    return (
        <div>
            <h1>Admin Dashboard</h1>

            <p>
                Welcome, {user?.name || "Admin"}
            </p>

            <p>
                Admin dashboard coming soon.
            </p>

            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}

export default AdminDashboard;