import { useState } from "react";
import { login } from "../services/api";
import "../css/Login.css";

function Login() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(event) {

        event.preventDefault();

        setError("");
        setLoading(true);

        try {

            const data = await login(email, password);

            console.log("Login successful:", data);

            // Save token
            localStorage.setItem("token", data.token);

            // Save user information
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            alert(`Welcome ${data.user.name}`);
            window.location.href = "/";

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);

        }
    }


    return (
        <div className="login-page">

            <div className="login-box card">

                <h1>Course Registration</h1>

                <h2>Login</h2>

                <form onSubmit={handleLogin}>

                    <div className="mb-3">
                        <label className="form-label" htmlFor="email">Email</label>

                        <input
                            className="form-control"
                            id="email"
                            autoComplete="username"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            required
                        />
                    </div>


                    <div className="mb-4">
                        <label className="form-label" htmlFor="password">Password</label>

                        <input
                            className="form-control"
                            id="password"
                            autoComplete="current-password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Enter your password"
                            required
                        />
                    </div>


                    {error && (
                        <p className="alert alert-danger" role="alert">
                            {error}
                        </p>
                    )}


                    <button
                        className="btn btn-primary w-100"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

            </div>

        </div>
    );
}

export default Login;