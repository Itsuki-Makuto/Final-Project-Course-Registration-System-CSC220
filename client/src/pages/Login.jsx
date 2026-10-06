import { useState } from "react";
import { login } from "../services/api";

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

            <div className="login-box">

                <h1>Course Registration</h1>

                <h2>Login</h2>

                <form onSubmit={handleLogin}>

                    <div>
                        <label>Email</label>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            required
                        />
                    </div>


                    <div>
                        <label>Password</label>

                        <input
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
                        <p className="error">
                            {error}
                        </p>
                    )}


                    <button
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