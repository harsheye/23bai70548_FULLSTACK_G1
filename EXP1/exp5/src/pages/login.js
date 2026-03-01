import { useAuth } from "../context/AuthContext";
import {useNavigate} from "react-router-dom";

const Login = () => {
    const {setIsAuthenticated} = useAuth();
    const navigate = useNavigate();

    const handleLogin = () => {
        setIsAuthenticated(true);
        navigate("/");
    }

    return (
        <div className="card">
        <h3>Login</h3>
        <button onClick={handleLogin}>Login</button>
        </div>
    )
}
export default Login;