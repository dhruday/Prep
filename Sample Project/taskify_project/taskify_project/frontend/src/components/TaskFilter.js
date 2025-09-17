import React from 'react';

export default function TaskFilter({ filters, setFilters, onApply }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input placeholder='search title' value={filters.search} onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))} />
    <select value={filters.status} onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}>
        <option value=''>All Status</option>
        <option value='Pending'>Pending</option>
        <option value='Completed'>Completed</option>
      </select>
    <select value={filters.priority} onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value}))}>
        <option value=''>All Priority</option>
        <option value='Low'>Low</option>
        <option value='Medium'>Medium</option>
        <option value='High'>High</option>
      </select>
      <button onClick={onApply}>Apply</button>
    </div>
  );
}
