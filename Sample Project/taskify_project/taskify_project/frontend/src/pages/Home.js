import React, { useEffect, useState } from 'react';
import TaskList from '../components/TaskList';
import TaskFilter from '../components/TaskFilter';
import { getTasks } from '../api/taskApi';

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [loading, setLoading] = useState(false);

  const fetch = async (customFilters = filters) => {
    setLoading(true);
    try {
      const res = await getTasks(customFilters);
      setTasks(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <TaskFilter filters={filters}
        setFilters={setFilters} onApply={() => fetch()} />
      <hr />
      <TaskList tasks={tasks} refresh={() => fetch()} loading={loading} />
    </div>
  );
}
