import axios from 'axios';

// Create configured Axios client pointing to the FastAPI server
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 60000, // 60 seconds
});

export default api;
