function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [coursesregistered, setCoursesRegistered] = useState([]);
    const [completedcourses, setCompletedCourses] = useState([]);
    const [terms, setTerms] = useState([]);
    const [gpa, setGPA] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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


            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}

export default StudentDashboard;