import { useEffect, useState } from "react";
import api from "../api/axios";
import StatCard from "../components/StatCard";

const unwrap = (data) => data?.data || data;
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const { data } = await api.get("/tasks/dashboard");
        if (active) {
          setDashboard(unwrap(data));
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Unable to load dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stats = dashboard?.stats || {};
  const recentTasks = asArray(dashboard?.recentTasks);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="panel">Loading dashboard...</div>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard label="Total Tasks" value={stats.totalTasks} />
            <StatCard label="Todo" value={stats.todoTasks} />
            <StatCard label="In Progress" value={stats.inProgressTasks} />
            <StatCard label="Done" value={stats.doneTasks} />
            <StatCard label="Overdue" value={stats.overdueTasks} />
          </section>

          <section className="panel">
            <div className="section-title">
              <h2>Recent Tasks</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map((task) => (
                    <tr key={task._id || task.id}>
                      <td>{task.title}</td>
                      <td>{task.project?.name || task.projectName || "No project"}</td>
                      <td>
                        <span className={`status ${task.status || "todo"}`}>{task.status || "todo"}</span>
                      </td>
                      <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}</td>
                    </tr>
                  ))}
                  {!recentTasks.length && (
                    <tr>
                      <td colSpan="4" className="empty">
                        No recent tasks yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}


