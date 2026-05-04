import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        Team Task Manager
      </Link>

      <nav className="nav-links">
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/projects">Projects</NavLink>
      </nav>

      <div className="nav-user">
        <span>
          {user?.name || user?.email || "User"}
          {user?.role && <strong>{user.role}</strong>}
        </span>
        <button className="button secondary" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
