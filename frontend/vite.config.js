import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	const env = loadEnv(mode, process.cwd(), '');

	// Supports VITE_BACKEND_URL, BACKEND_URI, or defaults to http://localhost:5000
	const target =
		env.VITE_BACKEND_URL ||
		env.BACKEND_URI ||
		env.VITE_API_URL?.replace(/\/api$/, '') ||
		'http://localhost:5000';

	return {
		plugins: [react()],
		server: {
			port: 5173,
			proxy: {
				'/api': {
					target,
					changeOrigin: true,
				},
				'/socket.io': {
					target,
					ws: true,
				},
			},
		},
	};
});
