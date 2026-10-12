import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/AdminDashboard.css";

//functions
function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "student",
    studentId: "",
    password: "",
  });
  const [formMessage, setFormMessage] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "student",
    studentId: "",
  });
  const [editMessage, setEditMessage] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const query = roleFilter === "all" ? "" : `?role=${roleFilter}`;
      const response = await fetch(`http://localhost:3000/api/users${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setFormMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setFormMessage("User created successfully!");
      setFormData({
        name: "",
        email: "",
        role: "student",
        studentId: "",
        password: "",
      });
      setShowCreateForm(false);
      await loadUsers();
    } catch (err) {
      setFormMessage(err.message || "Failed to create user");
    }
  }

  function startEditing(selectedUser) {
    setEditingUser(selectedUser._id);
    setEditMessage("");
    setEditFormData({
      name: selectedUser.name || "",
      email: selectedUser.email || "",
      role: selectedUser.role || "student",
      studentId: selectedUser.studentId || "",
    });
  }

  async function updateUser(e) {
    e.preventDefault();
    setEditMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/users/${editingUser}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editFormData),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setEditMessage("User updated successfully!");
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setEditMessage(err.message || "Failed to update user");
    }
  }

  async function deleteUser(userToDelete) {
    const confirmed = window.confirm(
      `Delete ${userToDelete.name}?\n\nIf this student has academic records or registrations, their account will be deactivated instead.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/users/${userToDelete._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      alert(data.message || (data.action === "deactivated"
        ? "User deactivated to preserve academic history."
        : "User permanently deleted."));
      await loadUsers();
    } catch (err) {
      alert(err.message || "Failed to delete user");
    }
  }

  async function changeUserStatus(selectedUser) {
    const nextStatus = selectedUser.active === false;
    const action = nextStatus ? "reactivate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${selectedUser.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/users/${selectedUser._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ active: nextStatus }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change account status");
      }

      alert(data.message || "Account status updated.");
      await loadUsers();
    } catch (err) {
      alert(err.message || "Failed to change account status");
    }
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  return (
    <div className="admin-dashboard">
      <Navbar
        title="Admin Dashboard"
        user={user || { role: "Admin" }}
        onLogout={logout}
      />

      <main className="container dashboard-content">
        <section className="card dashboard-section admin-overview">
          <h2>Administration</h2>
          <p className="text-body-secondary">
            Manage user accounts, roles, and account status.
          </p>
        </section>

        <section className="card dashboard-section">
          <div className="dashboard-section-header">
            <h2>Users</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm((shown) => !shown)}
            >
              {showCreateForm ? "Cancel" : "Create User"}
            </button>
          </div>

          <label htmlFor="role-filter">Filter by role</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="advisor">Advisors</option>
            <option value="admin">Admins</option>
          </select>

          {showCreateForm && (
            <form className="user-form" onSubmit={createUser}>
              <h3>Create User</h3>

              <label htmlFor="create-name">Name</label>
              <input
                id="create-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <label htmlFor="create-email">Email</label>
              <input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <label htmlFor="create-role">Role</label>
              <select
                id="create-role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value,
                    studentId: "",
                  })
                }
              >
                <option value="student">Student</option>
                <option value="advisor">Advisor</option>
                <option value="admin">Admin</option>
              </select>

              {formData.role === "student" && (
                <>
                  <label htmlFor="create-student-id">Student ID</label>
                  <input
                    id="create-student-id"
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    required
                  />
                </>
              )}

              <label htmlFor="create-password">Initial password</label>
              <input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
                required
              />

              <button type="submit">Create User</button>
              {formMessage && <p role="status">{formMessage}</p>}
            </form>
          )}

          {editingUser && (
            <form className="user-form" onSubmit={updateUser}>
              <h3>Edit User</h3>

              <label htmlFor="edit-name">Name</label>
              <input
                id="edit-name"
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />

              <label htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />

              <label htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    role: e.target.value,
                    studentId: "",
                  })
                }
              >
                <option value="student">Student</option>
                <option value="advisor">Advisor</option>
                <option value="admin">Admin</option>
              </select>

              {editFormData.role === "student" && (
                <>
                  <label htmlFor="edit-student-id">Student ID</label>
                  <input
                    id="edit-student-id"
                    type="text"
                    value={editFormData.studentId}
                    onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value })}
                    required
                  />
                </>
              )}

              <div className="user-form-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
              </div>
              {editMessage && <p role="status">{editMessage}</p>}
            </form>
          )}

          {loading && <p>Loading users...</p>}
          {error && <p role="alert">Error: {error}</p>}

          {!loading && !error && (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Account ID</th>
                    <th>Student / Advisor ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        {u.accountId ||
                          `${String(u.role || "user").toUpperCase()}-${String(u._id).slice(-6).toUpperCase()}`}
                      </td>
                      <td>
                        {u.role === "student"
                          ? u.studentId || "Not assigned"
                          : u.role === "advisor"
                            ? u.advisorId || "Not assigned"
                            : "—"}
                      </td>
                      <td className={u.active === false ? "status-inactive" : "status-active"}>
                        {u.active === false ? "Inactive" : "Active"}
                      </td>
                      <td>
                        <div className="user-actions">
                          <button type="button" onClick={() => startEditing(u)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => deleteUser(u)}
                          >
                            Delete
                          </button>
                          <button type="button" onClick={() => changeUserStatus(u)}>
                            {u.active === false ? "Reactivate" : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="7">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;

//Added admin dashboard 
