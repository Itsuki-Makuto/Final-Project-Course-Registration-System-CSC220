
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/StudentDashboard.css";

const API_URL = "http://localhost:3000/api";
const CURRENT_TERM = "2026-1";
const FORM_URL = "/AddDropRequestForm.pdf";

const gradePoints = {
  A: 4, "A-": 3.7, "B+": 3.5, B: 3,
  "B-": 2.7, "C+": 2.5, C: 2,
  "C-": 1.7, "D+": 1.5, D: 1, F: 0
};

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleDateString("en-GB");
}

function isAddDropOpen(offering) {
  if (!offering?.addDropOpen) return false;
  if (!offering.addDropCloseDate) return true;

  const closingDate = new Date(offering.addDropCloseDate);
  return (
    !Number.isNaN(closingDate.getTime()) &&
    closingDate.getTime() >= Date.now()
  );
}

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const [selectedOffering, setSelectedOffering] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [requestType, setRequestType] = useState("Drop");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let active = true;

    async function getData(endpoint) {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    }

    async function loadDashboard() {
      setLoading(true);
      setErrors([]);

      try {
        const auth = await getData("/auth/me");
        if (!active) return;

        const student = auth.user;
        if (!student?._id || student.role !== "student") {
          throw new Error("Student account required.");
        }

        setUser(student);

        const results = await Promise.allSettled([
          getData(
            `/registrations/student/${student._id}?term=${CURRENT_TERM}`
          ),
          getData(`/records/student/${student._id}`)
        ]);

        if (!active) return;

        const nextErrors = [];

        if (results[0].status === "fulfilled") {
          setRegistrations(
            Array.isArray(results[0].value)
              ? results[0].value
              : []
          );
        } else {
          nextErrors.push(
            `Registrations: ${results[0].reason.message}`
          );
        }

        if (results[1].status === "fulfilled") {
          setRecords(
            Array.isArray(results[1].value.records)
              ? results[1].value.records
              : []
          );
        } else {
          nextErrors.push(
            `Academic records: ${results[1].reason.message}`
          );
        }

        setErrors(nextErrors);
      } catch (error) {
        if (active) setErrors([error.message]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => { active = false; };
  }, []);

  const { gpa, earnedCredits } = useMemo(() => {
    let points = 0;
    let gradedCredits = 0;
    let earned = 0;

    records.forEach((record) => {
      const credits = Number(record.courseId?.credits) || 0;
      const grade = record.grade;

      if (Object.prototype.hasOwnProperty.call(gradePoints, grade)) {
        points += gradePoints[grade] * credits;
        gradedCredits += credits;
        if (grade !== "F") earned += credits;
      }
    });

    return {
      gpa: gradedCredits
        ? (points / gradedCredits).toFixed(2)
        : "N/A",
      earnedCredits: earned
    };
  }, [records]);

  const groupedRecords = useMemo(() => {
    return records.reduce((groups, record) => {
      const term = record.term || "Unknown";
      if (!groups[term]) groups[term] = [];
      groups[term].push(record);
      return groups;
    }, {});
  }, [records]);

  function openAddDrop(offering) {
    setSelectedOffering(offering);
    setRecipientEmail("");
    setRequestType("Drop");
    setReason("");
    setAttachment(null);
    setSubmitMessage("");
    setSubmitError("");
  }

  function closeAddDrop() {
    if (submitting) return;
    setSelectedOffering(null);
    setSubmitMessage("");
    setSubmitError("");
  }

  async function handleSubmitRequest(event) {
    event.preventDefault();

    if (submitting || submitMessage) return;

    if (!recipientEmail.trim() || !reason.trim() || !attachment) {
      setSubmitError(
        "Please enter a recipient email, reason, and attachment."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");

      const formData = new FormData();
      formData.append("offeringId", selectedOffering._id);
      formData.append("recipientEmail", recipientEmail.trim());
      formData.append("requestType", requestType);
      formData.append("reason", reason.trim());
      formData.append("attachment", attachment);

      const response = await fetch(`${API_URL}/add-drop/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || `Request failed (${response.status})`
        );
      }

      setSubmitMessage(
        "Request submitted successfully! Your email was accepted for sending."
      );
      setAttachment(null);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  const selectedCourse = selectedOffering?.courseId;

  const emailSubject = selectedOffering
    ? `Add/Drop Request - ${user?.studentId || ""} - ${
        selectedCourse?.code || ""
      }`
    : "";

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
            Loading academic information...
          </div>
        )}

        {errors.map((error, index) => (
          <div key={index} className="alert alert-danger">
            {error}
          </div>
        ))}

        {/* Overview */}
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

        {/* Current registrations */}
        <section className="card p-4 mb-4">
          <h3>Current Registered Courses</h3>

          {!loading && registrations.length === 0 && (
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
                        <div>{course?.title || "Unknown"}</div>
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
                            Closing Date:{" "}
                            {formatDate(offering.addDropCloseDate)}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={!open}
                          onClick={() => openAddDrop(offering)}
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

        {/* Academic history */}
        <section className="card p-4 mb-4">
          <h3>Completed Courses</h3>

          {!loading && records.length === 0 && (
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
                          <td><strong>{record.grade}</strong></td>
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

      {/* Add/Drop modal */}
      {selectedOffering && (
        <div
          className="modal d-block"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1055,
            backgroundColor: "rgba(0,0,0,0.6)",
            overflowY: "auto"
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: 600, margin: "1.5rem auto" }}
          >
            <div
              className="modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adddrop-title"
              style={{
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div className="modal-header flex-shrink-0">
                <h5 className="modal-title" id="adddrop-title">
                  Request Add/Drop
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  disabled={submitting}
                  onClick={closeAddDrop}
                />
              </div>

              <form
                onSubmit={handleSubmitRequest}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  flex: 1
                }}
              >
                <div
                  className="modal-body"
                  style={{
                    overflowY: "auto",
                    minHeight: 0,
                    flex: "1 1 auto"
                  }}
                >
                  <h6>
                    {selectedCourse?.code} - {selectedCourse?.title}
                  </h6>
                  <p>
                    <strong>Section:</strong>{" "}
                    {selectedOffering.section}
                  </p>
                  <p>
                    <strong>Closing Date:</strong>{" "}
                    {formatDate(selectedOffering.addDropCloseDate)}
                  </p>

                  <a
                    href={FORM_URL}
                    download="AddDropRequestForm.pdf"
                    className="btn btn-outline-primary mb-3"
                  >
                    Download Add/Drop Request Form
                  </a>

                  <h6>Instructions</h6>
                  <ol>
                    <li>Download the Add/Drop Request form.</li>
                    <li>
                      Fill in your name, student ID, term,
                      course code and section.
                    </li>
                    <li>
                      State your reason and sign the form.
                    </li>
                    <li>
                      Enter the approved recipient email
                      and attach the completed form.
                    </li>
                    <li>
                      Submit your request and wait for
                      confirmation before assuming your
                      registration has changed.
                    </li>
                  </ol>

                  <hr />

                  <div className="mb-3">
                    <label
                      htmlFor="request-type"
                      className="form-label fw-bold"
                    >
                      Request Type
                    </label>
                    <select
                      id="request-type"
                      className="form-select"
                      value={requestType}
                      disabled={submitting || !!submitMessage}
                      onChange={(e) =>
                        setRequestType(e.target.value)
                      }
                    >
                      <option value="Drop">Drop Course</option>
                      <option value="Add">Add Course</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="recipient-email"
                      className="form-label fw-bold"
                    >
                      Recipient Email
                    </label>
                    <input
                      id="recipient-email"
                      type="email"
                      className="form-control"
                      placeholder="Enter approved advisor email"
                      value={recipientEmail}
                      disabled={submitting || !!submitMessage}
                      onChange={(e) =>
                        setRecipientEmail(e.target.value)
                      }
                      required
                    />
                    <small className="text-muted">
                      Use an advisor or university email
                      authorized to receive requests.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="request-subject"
                      className="form-label fw-bold"
                    >
                      Email Subject
                    </label>
                    <input
                      id="request-subject"
                      type="text"
                      className="form-control"
                      value={emailSubject}
                      readOnly
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="request-reason"
                      className="form-label fw-bold"
                    >
                      Reason for Add/Drop Request
                    </label>
                    <textarea
                      id="request-reason"
                      className="form-control"
                      rows={3}
                      placeholder="Enter your reason..."
                      value={reason}
                      disabled={submitting || !!submitMessage}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="request-attachment"
                      className="form-label fw-bold"
                    >
                      Attach Completed Form
                    </label>
                    <input
                      id="request-attachment"
                      type="file"
                      className="form-control"
                      accept=".pdf,.doc,.docx"
                      disabled={submitting || !!submitMessage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSubmitError("");

                        if (!file) {
                          setAttachment(null);
                          return;
                        }

                        const extension = file.name
                          .split(".")
                          .pop()
                          ?.toLowerCase();

                        if (
                          !["pdf", "doc", "docx"].includes(extension)
                        ) {
                          setAttachment(null);
                          e.target.value = "";
                          setSubmitError(
                            "Only PDF and Word files are allowed."
                          );
                          return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          setAttachment(null);
                          e.target.value = "";
                          setSubmitError(
                            "File must be 5 MB or smaller."
                          );
                          return;
                        }

                        setAttachment(file);
                      }}
                      required={!submitMessage}
                    />
                    <small className="text-muted">
                      PDF, DOC, DOCX. Maximum 5 MB.
                    </small>
                    {attachment && (
                      <p className="text-success mt-2">
                        Selected: {attachment.name}
                      </p>
                    )}
                  </div>

                  {submitMessage && (
                    <div className="alert alert-success" role="status">
                      {submitMessage}
                    </div>
                  )}

                  {submitError && (
                    <div className="alert alert-danger" role="alert">
                      {submitError}
                    </div>
                  )}

                  <p className="text-muted small">
                    Submitting a request does not automatically
                    add or drop the course. An advisor must
                    review and process it.
                  </p>
                </div>

                {/* Always-visible footer */}
                <div
                  className="modal-footer flex-shrink-0"
                  style={{
                    backgroundColor: "#fff",
                    borderTop: "1px solid #dee2e6"
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAddDrop}
                    disabled={submitting}
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      submitting ||
                      !recipientEmail.trim() ||
                      !reason.trim() ||
                      !attachment ||
                      !!submitMessage
                    }
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
