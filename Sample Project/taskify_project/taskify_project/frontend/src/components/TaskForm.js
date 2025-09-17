import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createTask, getTask, updateTask } from '../api/taskApi';

export default function TaskForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'Low', status: 'Pending' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTask(id).then(res => {
      const d = res.data.data;
      setForm({
        title: d.title || '',
        description: d.description || '',
        dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0,16) : '',
        priority: d.priority || 'Low',
        status: d.status || 'Pending'
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form };
    try {
      if (id) await updateTask(id, payload);
      else await createTask(payload);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Error saving task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      <div>
        <label>Title</label><br />
        <input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
      </div>
      <div>
        <label>Description</label><br />
        <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
      </div>
      <div>
        <label>Due Date</label><br />
        <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
      </div>
      <div>
        <label>Priority</label><br />
        <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>
      <div>
        <label>Status</label><br />
        <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
          <option>Pending</option>
          <option>Completed</option>
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}
