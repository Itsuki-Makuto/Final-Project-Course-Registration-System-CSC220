function Navbar({ title, user, onLogout }) {
    return (
        <header className="dashboard-header">
            <div className="container d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                    <h1>{title}</h1>
                    <p>Welcome, {user?.name || user?.role}</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}

export default Navbar;
