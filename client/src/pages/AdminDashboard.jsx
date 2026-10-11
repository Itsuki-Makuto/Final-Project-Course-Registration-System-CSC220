import { useEffect, useState } from "react";


function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
  
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("all");    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "student",
        studentId: "",
        password: ""
    });
    const [formMessage, setFormMessage] = useState("");
    
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        email: "",
        role: "student",
        studentId: ""
    });
    const [editMessage, setEditMessage] = useState("");


  async function loadUsers() {
    setLoading(true);
    setError("")

    try {
      const token = localStorage.getItem("token");
      const query = roleFilter === "all" ? "" : `?role=${roleFilter}`;
      const response = await fetch(
          `http://localhost:3000/api/users${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
     
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }
      setUsers(data);
    } catch (err) {
      setError(err.message);
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
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(formData)
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
            password: ""
        });

        setShowCreateForm(false);
        await loadUsers();
    } catch (err) {
        setFormMessage(err.message);
    }
}

  
function startEditing(user) {
    setEditingUser(user._id);
    setEditMessage("");

    setEditFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "student",
        studentId: user.studentId || ""
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
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
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
        setEditMessage(err.message);
    }
}


async function deleteUser(userToDelete) {
    const confirmed = window.confirm(
      `Delete ${userToDelete.name}?\n\n` +
      "If this student has academic records or registrations, " +
      "their account will be deactivated instead."
    );

    if (!confirmed) return;

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/users/${userToDelete._id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to delete user");
        }

        if (data.action === "deactivated") {
          alert("User deactivated to preserve academic history.");
        } else {
          alert("User permanently deleted.");
        }
        await loadUsers();
    } catch (err) {
        alert(err.message);
    }
}


async function changeUserStatus(u) {
    const nextStatus = u.active === false;

    const action = nextStatus ? "reactivate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${u.name}?`)) {
        return;
    }

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/api/users/${u._id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ active: nextStatus })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to change status");
        }

        alert(data.message);
        await loadUsers();
    } catch (err) {
        alert(err.message);
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
        <div>
            <h1>Admin Dashboard</h1>

            <p>
                Welcome, {user?.name || "Admin"}
            </p>
      <h2>Users</h2>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
            <option value="all">All</option>
            <option value="student">Students</option>
            <option value="advisor">Advisors</option>
        </select>

        <button onClick={() => setShowCreateForm(!showCreateForm)}>
    {showCreateForm ? "Cancel" : "Create User"}
</button>

{showCreateForm && (
    <form onSubmit={createUser}>
        <div>
            <label>Name</label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                }
                required
            />
        </div>

        <div>
            <label>Email</label>
            <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                }
                required
            />
        </div>

        <div>
            <label>Role</label>
            <select
                value={formData.role}
                onChange={(e) =>
                    setFormData({
                        ...formData,
                        role: e.target.value,
                        studentId: ""
                    })
                }
            >
                <option value="student">Student</option>
                <option value="advisor">Advisor</option>
                <option value="admin">Admin</option>
            </select>
        </div>

        {formData.role === "student" && (
            <div>
                <label>Account ID</label>
                <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            studentId: e.target.value
                        })
                    }
                    required
                />
            </div>
        )}

        <div>
            <label>Initial Password</label>
            <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                    setFormData({
                        ...formData,
                        password: e.target.value
                    })
                }
                minLength={8}
                required
            />
        </div>

        <button type="submit">Create User</button>
    </form>
)}


{editingUser && (
    <form onSubmit={updateUser}>
        <h3>Edit User</h3>

        <label>Name</label>
        <input
            type="text"
            value={editFormData.name}
            onChange={(e) =>
                setEditFormData({
                    ...editFormData,
                    name: e.target.value
                })
            }
            required
        />

        <label>Email</label>
        <input
            type="email"
            value={editFormData.email}
            onChange={(e) =>
                setEditFormData({
                    ...editFormData,
                    email: e.target.value
                })
            }
            required
        />

        <label>Role</label>
        <select
            value={editFormData.role}
            onChange={(e) =>
                setEditFormData({
                    ...editFormData,
                    role: e.target.value,
                    studentId: ""
                })
            }
        >
            <option value="student">Student</option>
            <option value="advisor">Advisor</option>
            <option value="admin">Admin</option>
        </select>

        {editFormData.role === "student" && (
            <>
                <label>Student ID</label>
                <input
                    type="text"
                    value={editFormData.studentId}
                    onChange={(e) =>
                        setEditFormData({
                            ...editFormData,
                            studentId: e.target.value
                        })
                    }
                    required
                />
            </>
        )}

        <button type="submit">Save Changes</button>

        <button
            type="button"
            onClick={() => setEditingUser(null)}
        >
            Cancel
        </button>
    </form>
)}

{editMessage && <p>{editMessage}</p>}


{formMessage && <p>{formMessage}</p>}

            {loading && <p>Loading users...</p>}
            {error && <p>Error: {error}</p>}
            {!loading && !error && (
                <ul>
                    
                  {users.map((u) => (
                    <li key={u._id}>
                      <strong>{u.name}</strong>
                      {" — "}{u.email}
                      {" — Role: "}{u.role}
                      {" — Account ID: "}{u._id}

                      {u.role === "student" && (
                        <>{" — Student ID: "}{u.studentId || "Not assigned"}</>
                      )}

                      {u.role === "advisor" && (
                        <>{" — Advisor ID: "}{u.advisorId || "Not assigned"}</>
                      )}

                      {u.active === false && " (Inactive)"}

                      <button onClick={() => startEditing(u)}>
                        Edit
                      </button>

                      <button onClick={() => deleteUser(u)}>
                        Delete
                      </button>

                      <button onClick={() => changeUserStatus(u)}>
                        {u.active === false ? "Reactivate" : "Deactivate"}
                      </button>
                    </li>
                  ))}

                </ul>
            )}


            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}

export default AdminDashboard;