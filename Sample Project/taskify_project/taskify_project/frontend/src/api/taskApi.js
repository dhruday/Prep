import axios from 'axios';
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/tasks';

export const getTasks = (params) => axios.get(BASE, { params });
export const getTask = (id) => axios.get(`${BASE}/${id}`);
export const createTask = (data) => axios.post(BASE, data);
export const updateTask = (id, data) => axios.put(`${BASE}/${id}`, data);
export const deleteTask = (id) => axios.delete(`${BASE}/${id}`);
