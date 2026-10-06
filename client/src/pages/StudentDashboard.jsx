function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
    }

    return (
        <div>
            <h1>Student Dashboard</h1>

            <p>
                Welcome, {user?.name || "Student"}
            </p>

            <p>
                Student dashboard coming soon.
            </p>

            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}

export default StudentDashboard;