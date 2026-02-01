import axios from 'axios';

const api = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
	withCredentials: true,
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
	(config) => {
		// Get token from localStorage
		const token = typeof window !== 'undefined' 
			? localStorage.getItem('access_token')
			: null;
		
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor to handle token refresh on 401
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		
		// If 401 and not already retrying
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;
			
			try {
				const refreshToken = typeof window !== 'undefined'
					? localStorage.getItem('refresh_token')
					: null;
				
				if (refreshToken) {
					const response = await axios.post(
						`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'}/accounts/token/refresh/`,
						{ refresh: refreshToken }
					);
					
					const { access } = response.data;
					
					if (typeof window !== 'undefined') {
						localStorage.setItem('access_token', access);
					}
					
					// Retry original request with new token
					originalRequest.headers.Authorization = `Bearer ${access}`;
					return api(originalRequest);
				}
			} catch (refreshError) {
				// Refresh failed, redirect to login
				if (typeof window !== 'undefined') {
					localStorage.removeItem('access_token');
					localStorage.removeItem('refresh_token');
					window.location.href = '/';
				}
				return Promise.reject(refreshError);
			}
		}
		
		return Promise.reject(error);
	}
);

export default api;
