
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/StudentDashboard.css";

const API_URL = "http://localhost:3000/api";
const CURRENT_TERM = "2026-1";
const FORM_URL = "/AddDropRequestForm.pdf";

// Adjust these values if your university uses a different scale.
const gradePoints = {
  A: 4,
  "A-": 3.7,
  "B+": 3.5,
  B: 3,
  "B-": 2.7,
  "C+": 2.5,
  C: 2,
  "C-": 1.7,
  "D+": 1.5,
  D: 1,
  F: 0
};

function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const [selectedOffering, setSelectedOffering] = useState(null);
  const [advisorEmail, setAdvisorEmail] = useState("");

  // Fetch data from existing backend
  useEffect(() => {
    let active = true;

    async function getData(endpoint) {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Login token not found. Please log in again.");
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          `${data.error || "Request failed"} (${response.status})`
        );
      }

      return data;
    }

    async function loadStudentData() {
      setLoading(true);
      setErrors([]);

      try {
        // Step 1: Identify student using JWT
        const authData = await getData("/auth/me");

        if (!active) return;

        const currentUser = authData.user;

        if (!currentUser?._id) {
          throw new Error("Student MongoDB ID not found.");
        }

        if (currentUser.role !== "student") {
          throw new Error("This dashboard requires a student account.");
        }

        setUser(currentUser);

        // This is the MongoDB ObjectId, not STU69001
        const studentId = currentUser._id;

        // Step 2: Retrieve registrations and records
        const [registrationResult, recordResult] =
          await Promise.allSettled([
            getData(
              `/registrations/student/${studentId}?term=${encodeURIComponent(
                CURRENT_TERM
              )}`
            ),
            getData(`/records/student/${studentId}`)
          ]);

        if (!active) return;

        const nextErrors = [];

        if (registrationResult.status === "fulfilled") {
          const data = registrationResult.value;
          setRegistrations(Array.isArray(data) ? data : []);
        } else {
          setRegistrations([]);
          nextErrors.push(
            `Unable to load registrations: ${registrationResult.reason.message}`
          );
        }

        if (recordResult.status === "fulfilled") {
          const data = recordResult.value;
          setRecords(Array.isArray(data.records) ? data.records : []);
        } else {
          setRecords([]);
          nextErrors.push(
            `Unable to load academic records: ${recordResult.reason.message}`
          );
        }

        setErrors(nextErrors);
      } catch (error) {
        if (active) {
          setErrors([error.message]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudentData();

    return () => {
      active = false;
    };
  }, []);

  // Calculate GPA and earned credits
  let totalGradePoints = 0;
  let totalGradedCredits = 0;
  let earnedCredits = 0;

  records.forEach((record) => {
    const credits = Number(record.courseId?.credits || 0);
    const grade = record.grade;

    if (Object.prototype.hasOwnProperty.call(gradePoints, grade)) {
      totalGradePoints += gradePoints[grade] * credits;
      totalGradedCredits += credits;

      if (grade !== "F") {
        earnedCredits += credits;
      }
    }
  });

  const gpa = totalGradedCredits
    ? (totalGradePoints / totalGradedCredits).toFixed(2)
    : "N/A";

  // Group previous courses by term
  const groupedRecords = records.reduce((groups, record) => {
    const term = record.term || "Unknown";

    if (!groups[term]) {
      groups[term] = [];
    }

    groups[term].push(record);
    return groups;
  }, {});

  // Check Add/Drop status
  function isAddDropOpen(offering) {
    if (!offering?.addDropOpen) return false;

    if (!offering.addDropCloseDate) return true;

    const closingDate = new Date(offering.addDropCloseDate);

    return (
      !Number.isNaN(closingDate.getTime()) &&
      closingDate.getTime() >= Date.now()
    );
  }

  function formatDate(date) {
    if (!date) return "Not set";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Invalid date";
    }

    return parsed.toLocaleDateString("en-GB");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  // Email subject required by Add/Drop workflow
  const emailSubject = selectedOffering
    ? `Add/Drop Request - ${user?.studentId || "STUDENT_ID"} - ${
        selectedOffering.courseId?.code || "COURSE_CODE"
      }`
    : "";

  const mailtoLink = `mailto:${advisorEmail.trim()}?subject=${encodeURIComponent(
    emailSubject
  )}`;

  return (
    <div className="student-dashboard">
      <Navbar
        title="Student Dashboard"
        user={user || { role: "student" }}
        onLogout={logout}
      />

      <main className="container dashboard-content py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>My Academic Dashboard</h2>
            <p>Student ID: {user?.studentId || "N/A"}</p>
          </div>

          <span className="badge bg-primary fs-6">
            Term {CURRENT_TERM}
          </span>
        </div>

        {loading && (
          <div className="alert alert-info">
            Loading academic data...
          </div>
        )}

        {errors.map((error, index) => (
          <div
            key={index}
            className="alert alert-danger"
            role="alert"
          >
            {error}
          </div>
        ))}

        {/* Academic Overview */}
        <section className="card p-4 mb-4">
          <h3>Academic Overview</h3>

          <div className="row g-3 mt-1">
            <div className="col-md-4">
              <div className="border rounded p-3">
                <h5>GPA</h5>
                <h2>{gpa}</h2>
              </div>
            </div>

            <div className="col-md-4">
              <div className="border rounded p-3">
                <h5>Credits Earned</h5>
                <h2>{earnedCredits}</h2>
              </div>
            </div>

            <div className="col-md-4">
              <div className="border rounded p-3">
                <h5>Current Term</h5>
                <h2>{CURRENT_TERM}</h2>
              </div>
            </div>
          </div>
        </section>

        {/* Current Registered Courses */}
        <section className="card p-4 mb-4">
          <h3>Current Registered Courses</h3>

          {!loading && errors.length === 0 && registrations.length === 0 && (
            <p>No registered courses found for this term.</p>
          )}

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Section</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Room</th>
                  <th>Instructor</th>
                  <th>Add/Drop</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {registrations.map((registration) => {
                  const offering = registration.offeringId;
                  const course = offering?.courseId;
                  const open = isAddDropOpen(offering);

                  return (
                    <tr key={registration._id}>
                      <td>
                        <strong>{course?.code || "N/A"}</strong>
                        <div>{course?.title || "Unknown course"}</div>
                      </td>

                      <td>{offering?.section ?? "N/A"}</td>
                      <td>{offering?.day || "N/A"}</td>

                      <td>
                        {offering?.startTime || "N/A"} -{" "}
                        {offering?.endTime || "N/A"}
                      </td>

                      <td>{offering?.room || "N/A"}</td>
                      <td>{offering?.instructor || "N/A"}</td>

                      <td>
                        <span
                          className={`badge ${
                            open ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {open ? "Open" : "Closed"}
                        </span>

                        {open && (
                          <div className="small mt-1">
                            Closes: {formatDate(offering.addDropCloseDate)}
                          </div>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={!open}
                          onClick={() => setSelectedOffering(offering)}
                        >
                          Request Add/Drop
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Completed Courses */}
        <section className="card p-4 mb-4">
          <h3>Completed Courses</h3>

          {!loading && errors.length === 0 && records.length === 0 && (
            <p>No academic records available.</p>
          )}

          {Object.entries(groupedRecords)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([term, termRecords]) => (
              <div key={term} className="mt-3">
                <h4>Term {term}</h4>

                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th>Credits</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {termRecords.map((record) => (
                        <tr key={record._id}>
                          <td>{record.courseId?.code || "N/A"}</td>
                          <td>{record.courseId?.title || "N/A"}</td>
                          <td>{record.courseId?.credits ?? 0}</td>
                          <td>
                            <strong>{record.grade}</strong>
                          </td>

                          <td>
                            {record.grade === "F" ? (
                              <span className="badge bg-danger">
                                Retake required
                              </span>
                            ) : record.grade === "W" ? (
                              <span className="badge bg-secondary">
                                Withdrawn
                              </span>
                            ) : (
                              <span className="badge bg-success">
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </section>
      </main>

      {/* Add/Drop Request Modal */}
      {selectedOffering && (
        <div
          className="modal d-block"
          role="presentation"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedOffering(null);
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div
              className="modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adddrop-title"
            >
              <div className="modal-header">
                <h5 className="modal-title" id="adddrop-title">
                  Request Add/Drop
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setSelectedOffering(null)}
                />
              </div>

              <div className="modal-body">
                <h6>
                  {selectedOffering.courseId?.code} -{" "}
                  {selectedOffering.courseId?.title}
                </h6>

                <p>Section: {selectedOffering.section}</p>

                <p>
                  Closing Date:{" "}
                  {formatDate(selectedOffering.addDropCloseDate)}
                </p>

                <a
                  href={FORM_URL}
                  download
                  className="btn btn-outline-primary mb-3"
                >
                  Download Add/Drop Form
                </a>

                
            <h6>Instructions</h6>

                <ol>
                    <li>
                        Download and open the Add/Drop Request form.
                     </li>

                    <li>
                     Fill in your student ID, name, term, and the
                     course code and section you wish to add or drop.
                    </li>

                    <li>
                     State the reason for the request and sign the form.
                  </li>

                <li>
                    Email the completed form as an attachment to
                    your advisor at{" "}
                    <strong>{advisorEmail || "<advisor email>"}</strong>,
                    using the subject line:
                    <div className="fw-semibold mt-1">
                    {emailSubject}
                    </div>
                </li>

                <li>
                    Your advisor will confirm by email once
                    the change is made.
                </li>
                </ol>


                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="advisor-email"
                  >
                    Advisor Email
                  </label>

                  <input
                    id="advisor-email"
                    type="email"
                    className="form-control"
                    value={advisorEmail}
                    onChange={(e) => setAdvisorEmail(e.target.value)}
                    placeholder="Enter advisor email"
                  />
                </div>

                <p>
                  <strong>Email Subject:</strong>
                  <span className="d-block">{emailSubject}</span>
                </p>

                <p className="text-muted small">
                  Attach the completed and signed form to your email.
                  The advisor will update the registration manually.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedOffering(null)}
                >
                  Close
                </button>

                <a
                  href={advisorEmail.trim() ? mailtoLink : undefined}
                  className={`btn btn-primary ${
                    !advisorEmail.trim() ? "disabled" : ""
                  }`}
                  aria-disabled={!advisorEmail.trim()}
                >
                  Email Advisor
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
