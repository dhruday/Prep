import React from 'react';
import { Link } from 'react-router-dom';
import { deleteTask, updateTask } from '../api/taskApi';

export default function TaskList({ tasks, refresh, loading }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete task?')) return;
    await deleteTask(id);
    refresh();
  };

  const toggleStatus = async (task) => {
    await updateTask(task._id, { status: task.status === 'Pending' ? 'Completed' : 'Pending' });
    refresh();
  };

  if (loading) return <div>Loading...</div>;
  if (!tasks.length) return <div>No tasks found.</div>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {tasks.map(t => (
        <div key={t._id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>{t.title}</h3>
              <div>{t.description}</div>
              <div>Due: {t.dueDate ? new Date(t.dueDate).toLocaleString() : '—'}</div>
              <div>Priority: {t.priority} — Status: {t.status}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggleStatus(t)}>{t.status === 'Pending' ? 'Mark Done' : 'Mark Pending'}</button>
              <Link to={`/tasks/${t._id}`}><button>Edit</button></Link>
              <button onClick={() => handleDelete(t._id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
