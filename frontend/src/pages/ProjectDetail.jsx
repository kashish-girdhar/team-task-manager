import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const unwrap = (data) => data?.project || data?.data?.project || data?.data || data;
const unwrapTasks = (data) => data?.tasks || data?.data?.tasks || data?.data || data || [];
const getId = (item) => item?._id || item?.id;

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    assignedTo: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const members = useMemo(() => project?.members || [], [project]);

  const loadProject = useCallback(async () => {
    setError("");

    try {
      const [projectResponse, tasksResponse] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks/project/${id}`),
      ]);
      setProject(unwrap(projectResponse.data));
      setTasks(unwrapTasks(tasksResponse.data));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load project.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleTaskChange = (event) => {
    setTaskForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail });
      setMemberEmail("");
      await loadProject();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add member.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      project: id,
      title: taskForm.title,
      description: taskForm.description,
      dueDate: taskForm.dueDate || undefined,
      assignedTo: taskForm.assignedTo || undefined,
    };

    try {
      await api.post("/tasks", payload);
      setTaskForm({ title: "", description: "", dueDate: "", assignedTo: "" });
      await loadProject();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create task.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setError("");

    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      setTasks((current) => current.map((task) => (getId(task) === taskId ? { ...task, status } : task)));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update task status.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    setError("");

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((current) => current.filter((task) => getId(task) !== taskId));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete task.");
    }
  };

  if (loading) {
    return <main className="page panel">Loading project...</main>;
  }

  return (
    <main className="page">
      <Link className="back-link" to="/projects">
        Back to projects
      </Link>

      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <div className="page-header compact">
          <div>
            <p className="eyebrow">Project</p>
            <h1>{project?.name || "Project"}</h1>
            <p className="muted">{project?.description || "No description provided."}</p>
          </div>
          <span className="pill">{members.length} members</span>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-title">
            <h2>Members</h2>
          </div>
          <ul className="member-list">
            {members.map((member) => (
              <li key={getId(member) || member.email}>
                <strong>{member.name || member.email}</strong>
                <span>{member.email}</span>
              </li>
            ))}
            {!members.length && <li className="empty">No members yet.</li>}
          </ul>

          {isAdmin && (
            <form className="form inline-form" onSubmit={handleAddMember}>
              <label>
                Add member by email
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  required
                />
              </label>
              <button className="button primary" type="submit" disabled={saving}>
                Add
              </button>
            </form>
          )}
        </div>

        {isAdmin && (
          <div className="panel">
            <div className="section-title">
              <h2>Create Task</h2>
            </div>
            <form className="form" onSubmit={handleCreateTask}>
              <label>
                Title
                <input name="title" value={taskForm.title} onChange={handleTaskChange} required />
              </label>
              <label>
                Description
                <textarea name="description" value={taskForm.description} onChange={handleTaskChange} rows="3" />
              </label>
              <label>
                Assignee
                <select name="assignedTo" value={taskForm.assignedTo} onChange={handleTaskChange} required>
                  <option value="" disabled>Select assignee</option>
                  {members.map((member) => (
                    <option value={getId(member)} key={getId(member) || member.email}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input name="dueDate" type="date" value={taskForm.dueDate} onChange={handleTaskChange} required />
              </label>
              <button className="button primary" type="submit" disabled={saving}>
                Create Task
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Tasks</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const taskId = getId(task);

                return (
                  <tr key={taskId}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && <span className="table-note">{task.description}</span>}
                    </td>
                    <td>{task.assignedTo?.name || task.assignee?.name || task.assignedTo?.email || "Unassigned"}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}</td>
                    <td>
                      <select
                        className="status-select"
                        value={task.status || "todo"}
                        onChange={(event) => handleStatusChange(taskId, event.target.value)}
                      >
                        <option value="todo">todo</option>
                        <option value="in-progress">in-progress</option>
                        <option value="done">done</option>
                      </select>
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="button danger" type="button" onClick={() => handleDeleteTask(taskId)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!tasks.length && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="empty">
                    No tasks in this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

