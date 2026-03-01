import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Header = ({ title }) => {
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate("/login");
  };

  return (
    <header
      style={{
        padding: "1rem",
        backgroundColor: "#111",
        color: "#fff",
        textAlign: "center",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #222",
      }}
    >
      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link
          style={{
            color: "#fff",
            textDecoration: "none",
            fontWeight: "bold",
          }}
          to="/"
        >
          Dashboard
        </Link>
        <Link
          style={{
            color: "#fff",
            textDecoration: "none",
            fontWeight: "bold",
          }}
          to="/dashboard/water"
        >
          Water Tracker
        </Link>
        {isAuthenticated && (
          <button
            style={{
              background: "#222",
              color: "#fff",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: 4,
              cursor: "pointer",
            }}
            onClick={handleLogout}
          >
            Logout
          </button>
        )}
      </nav>
      <h1 style={{ color: "#fff", margin: 0 }}>Ecotrack</h1>
    </header>
  );
};

export default Header;
