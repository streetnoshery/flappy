import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Helper function to get user data from localStorage
const getUserData = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

// Request interceptor to add request ID and user data
api.interceptors.request.use((config) => {
  // Add request ID for tracking
  config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url}`, {
    requestId: config.headers['X-Request-ID'],
    timestamp: new Date().toISOString()
  });
  
  return config;
});

// Response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      requestId: response.config.headers['X-Request-ID'],
      status: response.status,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log(`❌ [API] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
      requestId: originalRequest?.headers['X-Request-ID'],
      status: error.response?.status,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  verifyOtp: (otpData) => api.post('/auth/otp/verify', otpData),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users API
export const usersAPI = {
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => {
    const user = getUserData();
    return api.put(`/users/${id}`, { ...data, userId: user?.userId, email: user?.email });
  },
  uploadPhoto: (id, formData) => {
    const user = getUserData();
    formData.append('userId', user?.userId);
    formData.append('email', user?.email);
    return api.post(`/users/${id}/upload-photo`, formData);
  },
  searchUsers: (username) => api.get(`/users/search?username=${username}`),
};

// Posts API
export const postsAPI = {
  createPost: (data) => {
    const user = getUserData();
    return api.post('/posts', { ...data, userId: user?.userId, email: user?.email });
  },
  getPost: (id) => api.get(`/posts/${id}`),
  getPostsByUserId: (userId) => {
    const user = getUserData();
    return api.get(`/posts/user/${userId}${user?.userId ? `?currentUserId=${user.userId}` : ''}`);
  },
  updatePost: (id, data) => {
    const user = getUserData();
    return api.put(`/posts/${id}`, { ...data, userId: user?.userId, email: user?.email });
  },
  deletePost: (id) => {
    const user = getUserData();
    return api.delete(`/posts/${id}`, { data: { userId: user?.userId, email: user?.email } });
  },
  getTrendingTags: () => api.get('/posts/trending-tags'),
  testAuth: () => api.get('/posts/test-auth'),
};

// Feed API
export const feedAPI = {
  getHomeFeed: (page = 1) => {
    const user = getUserData();
    return api.get(`/feed/home?page=${page}${user?.userId ? `&userId=${user.userId}` : ''}`);
  },
  getReelsFeed: (page = 1) => {
    const user = getUserData();
    return api.get(`/feed/reels?page=${page}${user?.userId ? `&userId=${user.userId}` : ''}`);
  },
  getExploreFeed: (page = 1) => {
    const user = getUserData();
    return api.get(`/feed/explore?page=${page}${user?.userId ? `&userId=${user.userId}` : ''}`);
  },
};

// Interactions API
export const interactionsAPI = {
  likePost: (postId) => {
    const user = getUserData();
    // Use reactions API with "love" type for heart button
    return api.post(`/posts/${postId}/react`, { 
      type: 'love',
      userId: user?.userId, 
      email: user?.email 
    });
  },
  getPostLikes: (postId) => {
    const user = getUserData();
    return api.get(`/posts/${postId}/likes${user?.userId ? `?userId=${user.userId}` : ''}`);
  },
  commentOnPost: (postId, data) => {
    const user = getUserData();
    return api.post(`/posts/${postId}/comment`, { ...data, userId: user?.userId, email: user?.email });
  },
  replyToComment: (postId, commentId, data) => {
    const user = getUserData();
    return api.post(`/posts/${postId}/comment/${commentId}/reply`, { ...data, userId: user?.userId, email: user?.email });
  },
  pinPost: (postId) => {
    const user = getUserData();
    return api.post(`/posts/${postId}/pin`, { userId: user?.userId, email: user?.email });
  },
  savePost: (postId) => {
    const user = getUserData();
    return api.post(`/posts/${postId}/save`, { userId: user?.userId, email: user?.email });
  },
  getComments: (postId) => api.get(`/posts/${postId}/comments`),
  getUserBookmarks: (userId) => api.get(`/posts/user/${userId}/bookmarks`),
  getBookmarkStatus: (postId) => {
    const user = getUserData();
    return api.get(`/posts/${postId}/bookmark-status?userId=${user?.userId}`);
  },
};

// Reactions API
export const reactionsAPI = {
  reactToPost: (postId, data) => {
    const user = getUserData();
    return api.post(`/posts/${postId}/react`, { ...data, userId: user?.userId, email: user?.email });
  },
  getUserReaction: (postId) => {
    const user = getUserData();
    return api.get(`/posts/${postId}/user-reaction?userId=${user?.userId}`);
  },
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