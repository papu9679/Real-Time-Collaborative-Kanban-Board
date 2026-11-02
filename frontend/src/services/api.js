import axios from 'axios';

// Resolve backend URL from environment variables
const envBackend =
	import.meta.env.VITE_API_URL ||
	import.meta.env.VITE_BACKEND_URL ||
	import.meta.env.VITE_BACKEND_URI;

const baseURL = envBackend
	? envBackend.endsWith('/api')
		? envBackend
		: `${envBackend}/api`
	: '/api';

const api = axios.create({
	baseURL,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Interceptor to attach Authorization header if token exists in localStorage
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('flowspace_token');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Interceptor to handle unauthenticated 401
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response && error.response.status === 401) {
			// If unauthorized on protected routes, remove stale token
			if (
				window.location.pathname !== '/login' &&
				window.location.pathname !== '/register'
			) {
				localStorage.removeItem('flowspace_token');
				localStorage.removeItem('flowspace_user');
			}
		}
		return Promise.reject(error);
	},
);

export default api;
