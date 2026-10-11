import { useEffect, useState } from "react";

function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [name, setName] = useState("");
  
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("all");    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setError("")

    try {
      const token = localStorage.getItem("token");
      const query = roleFilter === "all" ? "" : `?role=${roleFilter}`;
      const response = await fetch(`/api/users${query}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
     
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

            {loading && <p>Loading users...</p>}
            {error && <p>Error: {error}</p>}
            {!loading && !error && (
                <ul>
                    {users.map((u) => (
                        <li key={u._id}>
                            {u.name} - {u.email} - {u.role} 
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