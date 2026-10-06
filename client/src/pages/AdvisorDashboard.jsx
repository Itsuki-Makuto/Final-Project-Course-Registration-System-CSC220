import { useEffect, useState } from "react";

function AdvisorDashboard() {

    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);   
    const [selectedStudent, setSelectedStudent] = useState("");
    const [studentRecord, setStudentRecord] = useState(null);
    const [currentTerm, setCurrentTerm] = useState("2026-1");
    const [eligibleOfferings, setEligibleOfferings] = useState([]);
    const [excludedOfferings, setExcludedOfferings] = useState([]);
    const [registrations, setRegistrations] = useState([]);

    const [form, setForm] = useState({
        courseId: "",
        term: "2026-1",
        section: "",
        day: "Monday",
        startTime: "",
        endTime: "",
        room: "",
        instructor: "",
        seats: ""
    });

    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const user = JSON.parse(localStorage.getItem("user"));

async function fetchStudents() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            "http://localhost:3000/api/users/students",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to load students");
        }

        setStudents(data);

    } catch (error) {
        setError(error.message);
    }
}

const fetchStudentRecord = async (studentId) => {
    if (!studentId) {
        setStudentRecord(null);
        return;
    }

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/records/student/${studentId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch student record");
        }

        setStudentRecord(data);
        return data;
    } catch (error) {
        console.error(error);
        setStudentRecord(null);
        return null;
    }
};

const fetchRegistrations = async (studentId) => {
    if (!studentId) {
        setRegistrations([]);
        return;
    }

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/registrations/student/${studentId}?term=${currentTerm}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to fetch registrations"
            );
        }

        setRegistrations(data);

    } catch (error) {
        console.error(error);
        setRegistrations([]);
    }
};

const calculateEligibility = (recordData) => {
    if (!recordData) {
        setEligibleOfferings([]);
        setExcludedOfferings([]);
        return;
    }

    const eligible = [];
    const excluded = [];

    const passedGrades = [
        "A", "A-", "B+", "B", "B-",
        "C+", "C", "C-", "D+", "D"
    ];

    offerings.forEach((offering) => {
        const courseCode = offering.courseId?.code;

        const record = recordData.records.find(
            (record) => record.courseId?.code === courseCode
        );

        // Already passed
        if (record && passedGrades.includes(record.grade)) {
            excluded.push({
                offering,
                reason: `Already passed with grade ${record.grade}`
            });
            return;
        }

        // Check if section is full
        if (offering.seatsTaken >= offering.seats) {
            excluded.push({
                offering,
                reason: "Section is full"
            });
            return;
        }

        // Check time clashes with current registrations
        const clash = registrations.find((registration) => {
            const existingOffering = registration.offeringId;

            if (!existingOffering) {
                return false;
            }

            // Different day = no clash
            if (existingOffering.day !== offering.day) {
                return false;
            }

            const existingStart = existingOffering.startTime;
            const existingEnd = existingOffering.endTime;

            const newStart = offering.startTime;
            const newEnd = offering.endTime;

            return (
                newStart < existingEnd &&
                newEnd > existingStart
            );
        });

        if (clash) {
            excluded.push({
                offering,
                reason: `Time clash with ${clash.offeringId?.courseId?.code}`
            });
            return;
        }

        // No previous record = eligible
        if (!record) {
            eligible.push(offering);
            return;
        }

        // F = must retake
        if (record.grade === "F") {
            eligible.push(offering);
            return;
        }

        // Other grades = eligible for now
        eligible.push(offering);
    });

    setEligibleOfferings(eligible);
    setExcludedOfferings(excluded);
};

useEffect(() => {
    if (studentRecord && offerings.length > 0) {
        calculateEligibility(studentRecord);
    }
}, [studentRecord, offerings, registrations]);

async function fetchCourses() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            "http://localhost:3000/api/courses",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to load courses"
            );
        }

        setCourses(data);

    } catch (error) {
        setFormError(error.message);
    }
}

useEffect(() => {
    fetchOfferings();
    fetchCourses();
    fetchStudents();
}, []);

function startEditing(offering) {
    setEditingId(offering._id);

    setForm({
        courseId: offering.courseId._id,
        term: offering.term,
        section: offering.section,
        day: offering.day,
        startTime: offering.startTime,
        endTime: offering.endTime,
        room: offering.room,
        instructor: offering.instructor,
        seats: offering.seats
    });

    setShowForm(true);
}

    async function fetchOfferings() {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:3000/api/offerings?term=${currentTerm}`,  // For changing term
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to load offerings"
                );
            }

            setOfferings(data);

        } catch (error) {
            setError(error.message);

        } finally {
            setLoading(false);
        }
    }

    function handleFormChange(event) {
    const { name, value } = event.target;

    setForm({
        ...form,
        [name]: value
    });
}

async function toggleAddDrop(offering) {   // Making Add/Drop open or close
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/offerings/${offering._id}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                    addDropOpen: !offering.addDropOpen,
                    addDropCloseDate: !offering.addDropOpen
                        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                        : null
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to update add/drop");
        }

        await fetchOfferings();

    } catch (error) {
        setError(error.message);
    }
}

async function createOffering(event) {
    event.preventDefault();

    setCreating(true);
    setFormError("");

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            "http://localhost:3000/api/offerings",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    section: Number(form.section),
                    seats: Number(form.seats)
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to create offering"
            );
        }

        // Refresh the offerings table
        await fetchOfferings();

        // Reset form
        setForm({
            courseId: "",
            term: "2026-1",
            section: "",
            day: "Monday",
            startTime: "",
            endTime: "",
            room: "",
            instructor: "",
            seats: ""
        });

        setShowForm(false);

    } catch (error) {
        setFormError(error.message);

    } finally {
        setCreating(false);
    }
}

async function deleteOffering(id) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this offering?"
    );

    if (!confirmed) return;

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/offerings/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to delete offering");
        }

        await fetchOfferings();

    } catch (error) {
        setError(error.message);
    }
}

const registerStudent = async (offeringId) => {
    if (!selectedStudent) {
        alert("Please select a student first.");
        return;
    }

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            "http://localhost:3000/api/registrations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent,
                    offeringId: offeringId,
                    term: currentTerm
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Registration failed");
        }

        alert("Student registered successfully!");

        // Refresh offerings so seats update
        await fetchOfferings();
        await fetchRegistrations(selectedStudent);

    } catch (error) {
        alert(error.message);
    }
};

const removeRegistration = async (registrationId) => {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/registrations/${registrationId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to remove registration"
            );
        }

        alert("Registration removed successfully!");

        await fetchRegistrations(selectedStudent);
        await fetchOfferings();

    } catch (error) {
        alert(error.message);
    }
};

async function updateOffering(event) {
    event.preventDefault();
    setCreating(true);
    setFormError("");

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/offerings/${editingId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    section: Number(form.section),
                    seats: Number(form.seats)
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to update offering");
        }

        await fetchOfferings();

        setEditingId(null);
        setShowForm(false);

    } catch (error) {
        setFormError(error.message);
    } finally {
        setCreating(false);
    }
}

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/";
    }


    return (
        <div>

            <header>
                <h1>Advisor Dashboard</h1>

                <p>
                    Welcome, {user?.name || "Advisor"}
                </p>

                <button onClick={logout}>
                    Logout
                </button>
            </header>


            <main>

                <h2>Student Registration</h2>

                    <select
                        value={selectedStudent}
                        onChange={async (event) => {
                            const studentId = event.target.value;

                            setSelectedStudent(studentId);

                            if (!studentId) {
                                setStudentRecord(null);
                                setEligibleOfferings([]);
                                return;
                            }

                            const recordData = await fetchStudentRecord(studentId);

                            await fetchRegistrations(studentId);

                            if (recordData) {
                                calculateEligibility(recordData);
                            }
                        }}
                    >
                    
                        <option value="">
                            Select a student
                        </option>

                        {students.map((student) => (
                            <option key={student._id} value={student._id}>
                                {student.studentId} - {student.name}
                            </option>
                        ))}
                    </select>

                    {studentRecord && (
    <div>
        <h3>
            Academic Record: {studentRecord.student.name}
        </h3>

        <table>
            <thead>
                <tr>
                    <th>Term</th>
                    <th>Course</th>
                    <th>Title</th>
                    <th>Credits</th>
                    <th>Grade</th>
                </tr>
            </thead>

            <tbody>
                {studentRecord.records.map((record) => (
                    <tr key={record._id}>
                        <td>{record.term}</td>
                        <td>{record.courseId?.code}</td>
                        <td>{record.courseId?.title}</td>
                        <td>{record.courseId?.credits}</td>
                        <td>{record.grade}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)}

{studentRecord && (
    <div>
        <h3>Current Registrations</h3>

        {registrations.length === 0 ? (
            <p>No courses currently registered.</p>
        ) : (
            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Section</th>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Room</th>
                        <th>Instructor</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {registrations.map((registration) => {
                        const offering = registration.offeringId;
                        const course = offering?.courseId;

                        return (
                            <tr key={registration._id}>
                                <td>
                                    {course?.code}
                                    <br />
                                    {course?.title}
                                </td>

                                <td>{offering?.section}</td>

                                <td>{offering?.day}</td>

                                <td>
                                    {offering?.startTime} -{" "}
                                    {offering?.endTime}
                                </td>

                                <td>{offering?.room}</td>

                                <td>{offering?.instructor}</td>

                                <td>
                                    <button
                                        onClick={() =>
                                            removeRegistration(
                                                registration._id
                                            )
                                        }
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
    </div>
)}

{studentRecord && (
    <div>
        <h3>Eligible Courses</h3>

        {eligibleOfferings.length === 0 ? (
            <p>No eligible courses available.</p>
        ) : (
            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Section</th>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Room</th>
                        <th>Instructor</th>
                        <th>Seats</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {eligibleOfferings.map((offering) => (
                        <tr key={offering._id}>
                            <td>
                                {offering.courseId?.code}
                                <br />
                                {offering.courseId?.title}

                                {studentRecord.records.some(
                                    (record) =>
                                        record.courseId?.code === offering.courseId?.code &&
                                        record.grade === "F"
                                ) && (
                                    <div>
                                        <strong>Retake Required</strong>
                                    </div>
                                )}
                            </td>

                            <td>{offering.section}</td>

                            <td>{offering.day}</td>

                            <td>
                                {offering.startTime} - {offering.endTime}
                            </td>

                            <td>{offering.room}</td>

                            <td>{offering.instructor}</td>

                            <td>
                                {offering.seatsTaken} / {offering.seats}
                            </td>

                            <td>
                                <button
                                    onClick={() => registerStudent(offering._id)}
                                >
                                Register
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
)}

{studentRecord && (
    <div>
        <h3>Excluded Courses</h3>

        {excludedOfferings.length === 0 ? (
            <p>No excluded courses.</p>
        ) : (
            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Section</th>
                        <th>Reason</th>
                    </tr>
                </thead>

                <tbody>
                    {excludedOfferings.map(({ offering, reason }) => (
                        <tr key={offering._id}>
                            <td>
                                {offering.courseId?.code}
                                <br />
                                {offering.courseId?.title}
                            </td>

                            <td>{offering.section}</td>

                            <td>{reason}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
)}

                <h2>Course Offerings</h2>
                <button onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Cancel" : "+ Create Offering"}
                </button>

                {showForm && (
    <form onSubmit={editingId ? updateOffering : createOffering}>

        <h3>Create Course Offering</h3>

        {formError && (
            <p>{formError}</p>
        )}

        <div>
            <label>Course: </label>

            <select
                name="courseId"
                value={form.courseId}
                onChange={handleFormChange}
                required
            >
                <option value="">
                    Select a course
                </option>

                {courses.map((course) => (
                    <option
                        key={course._id}
                        value={course._id}
                    >
                        {course.code} - {course.title}
                    </option>
                ))}
            </select>
        </div>

        <div>
            <label>Term: </label>

            <input
                type="text"
                name="term"
                value={form.term}
                onChange={handleFormChange}
                required
            />
        </div>

        <div>
            <label>Section: </label>

            <input
                type="number"
                name="section"
                value={form.section}
                onChange={handleFormChange}
                min="1"
                required
            />
        </div>

        <div>
            <label>Day: </label>

            <select
                name="day"
                value={form.day}
                onChange={handleFormChange}
            >
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
                <option>Saturday</option>
                <option>Sunday</option>
            </select>
        </div>

        <div>
            <label>Start Time: </label>

            <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleFormChange}
                required
            />
        </div>

        <div>
            <label>End Time: </label>

            <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleFormChange}
                required
            />
        </div>

        <div>
            <label>Room: </label>

            <input
                type="text"
                name="room"
                value={form.room}
                onChange={handleFormChange}
                required
            />
        </div>

        <div>
            <label>Instructor: </label>

            <input
                type="text"
                name="instructor"
                value={form.instructor}
                onChange={handleFormChange}
                required
            />
        </div>

        <div>
            <label>Seats: </label>

            <input
                type="number"
                name="seats"
                value={form.seats}
                onChange={handleFormChange}
                min="1"
                required
            />
        </div>

        <button type="submit">
            {creating
                ? (editingId ? "Updating..." : "Creating...")
                : (editingId ? "Update Offering" : "Create Offering")}
        </button>

        </form>
)}

                <p>
                    Current Term: <strong>2026-1</strong>
                </p>


                {loading && (
                    <p>Loading offerings...</p>
                )}


                {error && (
                    <p>
                        Error: {error}
                    </p>
                )}


                {!loading && !error && offerings.length === 0 && (
                    <p>
                        No course offerings found for this term.
                    </p>
                )}


                {!loading && !error && offerings.length > 0 && (

                    <table>

                        <thead>
                            <tr>
                                <th>Actions</th>
                                <th>Course</th>
                                <th>Section</th>
                                <th>Day</th>
                                <th>Time</th>
                                <th>Room</th>
                                <th>Instructor</th>
                                <th>Seats</th>
                                <th>Add/Drop</th>
                            </tr>
                        </thead>


                        <tbody>

                            {offerings.map((offering) => (

                                <tr key={offering._id}>
                                   
                                        <td>                                   
                                            <button onClick={() => startEditing(offering)}>
                                                Edit
                                            </button>

                                            <button onClick={() => deleteOffering(offering._id)}>
                                                Delete
                                            </button>
                                        </td>
                        
                                    <td>
                                        {offering.courseId?.code}
                                        <br />
                                        {offering.courseId?.title}
                                    </td>

                                    <td>
                                        {offering.section}
                                    </td>

                                    <td>
                                        {offering.day}
                                    </td>

                                    <td>
                                        {offering.startTime}
                                        {" - "}
                                        {offering.endTime}
                                    </td>

                                    <td>
                                        {offering.room}
                                    </td>

                                    <td>
                                        {offering.instructor}
                                    </td>

                                    <td>
                                        {offering.seatsTaken}
                                        {" / "}
                                        {offering.seats}
                                    </td>

                                    <td>
                                        <button onClick={() => toggleAddDrop(offering)}>
                                            {offering.addDropOpen ? "Close" : "Open"}
                                        </button>

                                        <div>
                                            {offering.addDropOpen ? "Open" : "Closed"}
                                        </div>

                                            {offering.addDropOpen && offering.addDropCloseDate && (
                                        <div>
                                            Closes:{" "}
                                            {new Date(offering.addDropCloseDate).toLocaleDateString()}
                                        </div>                        
                                        )}
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </main>

        </div>
    );
}

export default AdvisorDashboard;