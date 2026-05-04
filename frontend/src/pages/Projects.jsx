import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const unwrapList = (data) => data?.projects || data?.data?.projects || data?.data || data || [];

export default function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/projects");
      setProjects(unwrapList(data));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      await api.post("/projects", form);
      setForm({ name: "", description: "" });
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create project.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Projects</h1>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {isAdmin && (
        <section className="panel">
          <div className="section-title">
            <h2>Create Project</h2>
          </div>
          <form className="form grid-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Description
              <input name="description" value={form.description} onChange={handleChange} />
            </label>
            <button className="button primary" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-title">
          <h2>All Projects</h2>
        </div>

        {loading ? (
          <p>Loading projects...</p>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <Link className="project-card" to={`/projects/${project._id || project.id}`} key={project._id || project.id}>
                <h3>{project.name}</h3>
                <p>{project.description || "No description provided."}</p>
                <span>{project.members?.length || 0} members</span>
              </Link>
            ))}
            {!projects.length && <div className="empty">No projects found.</div>}
          </div>
        )}
      </section>
    </main>
  );
}
