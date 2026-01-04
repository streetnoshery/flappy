import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  verifyOtp: (otpData) => api.post('/auth/otp/verify', otpData),
  refreshToken: (refreshToken) => api.post('/auth/token/refresh', { refreshToken }),
};

// Users API
export const usersAPI = {
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  uploadPhoto: (id, formData) => api.post(`/users/${id}/upload-photo`, formData),
  searchUsers: (username) => api.get(`/users/search?username=${username}`),
};

// Posts API
export const postsAPI = {
  createPost: (data) => api.post('/posts', data),
  getPost: (id) => api.get(`/posts/${id}`),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  getTrendingTags: () => api.get('/posts/trending-tags'),
};

// Feed API
export const feedAPI = {
  getHomeFeed: (page = 1) => api.get(`/feed/home?page=${page}`),
  getReelsFeed: (page = 1) => api.get(`/feed/reels?page=${page}`),
  getExploreFeed: (page = 1) => api.get(`/feed/explore?page=${page}`),
};

// Interactions API
export const interactionsAPI = {
  likePost: (postId) => api.post(`/posts/${postId}/like`),
  commentOnPost: (postId, data) => api.post(`/posts/${postId}/comment`, data),
  replyToComment: (postId, commentId, data) => api.post(`/posts/${postId}/comment/${commentId}/reply`, data),
  pinPost: (postId) => api.post(`/posts/${postId}/pin`),
  savePost: (postId) => api.post(`/posts/${postId}/save`),
  getComments: (postId) => api.get(`/posts/${postId}/comments`),
};

// Reactions API
export const reactionsAPI = {
  reactToPost: (postId, data) => api.post(`/posts/${postId}/react`, data),
  getReactions: (postId) => api.get(`/posts/${postId}/reactions`),
};

// Search API
export const searchAPI = {
  searchUsers: (query) => api.get(`/search/users?q=${query}`),
  searchPosts: (query) => api.get(`/search/posts?q=${query}`),
  getTrendingTags: () => api.get('/search/trending-tags'),
};

// Feature Flags API
export const featureFlagsAPI = {
  getFeatureFlags: () => api.get('/feature-flags'),
  getEnabledPostTypes: () => api.get('/feature-flags/post-types'),
};

export default api;