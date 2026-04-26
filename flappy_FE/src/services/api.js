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

// Request interceptor to add request ID, user data, and JWT token
api.interceptors.request.use((config) => {
  // Add request ID for tracking
  config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  // Attach JWT token if available
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
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

    // If token is expired or invalid, clear session and redirect to login
    if (error.response?.status === 401 && !originalRequest?.url?.includes('/auth/')) {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  verifyOtp: (otpData) => api.post('/auth/otp/verify', otpData),
  verifySignupOtp: (otpData) => api.post('/auth/otp/verify-signup', otpData),
  resendOtp: (data) => api.post('/auth/otp/resend', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users API
export const usersAPI = {
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => {
    return api.put(`/users/${id}`, data);
  },
  uploadPhoto: (id, formData) => {
    const user = getUserData();
    formData.append('userId', user?.userId);
    formData.append('email', user?.email);
    return api.post(`/users/${id}/upload-photo`, formData);
  },
  searchUsers: (username) => api.get(`/users/search?username=${username}`),
  // Follow
  toggleFollow: (targetUserId) => {
    const user = getUserData();
    return api.post(`/users/${targetUserId}/follow`, { userId: user?.userId });
  },
  getProfileStats: (userId) => {
    const user = getUserData();
    return api.get(`/users/${userId}/stats${user?.userId ? `?currentUserId=${user.userId}` : ''}`);
  },
  getFollowers: (userId) => {
    const user = getUserData();
    return api.get(`/users/${userId}/followers${user?.userId ? `?currentUserId=${user.userId}` : ''}`);
  },
  getFollowing: (userId) => {
    const user = getUserData();
    return api.get(`/users/${userId}/following${user?.userId ? `?currentUserId=${user.userId}` : ''}`);
  },
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
  getFollowingFeed: (page = 1) => {
    const user = getUserData();
    return api.get(`/feed/following?page=${page}${user?.userId ? `&userId=${user.userId}` : ''}`);
  },
  getTrendingFeed: (page = 1) => {
    const user = getUserData();
    return api.get(`/feed/trending?page=${page}${user?.userId ? `&userId=${user.userId}` : ''}`);
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

// Subscriptions API
export const subscriptionsAPI = {
  toggleSubscription: () => api.post('/subscriptions/toggle'),
  getSubscriptionStatus: (userId) => api.get(`/subscriptions/status/${userId}`),
};

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (page = 1, limit = 10) => api.get(`/wallet/transactions?page=${page}&limit=${limit}`),
  requestConversion: (amount) => api.post('/wallet/convert', { amount }),
  getThresholds: () => api.get('/wallet/thresholds'),
};

// Feature Flags API
export const featureFlagsAPI = {
  getFeatureFlags: () => api.get('/feature-flags'),
  getEnabledPostTypes: () => api.get('/feature-flags/post-types'),
};

// Reports API
export const reportsAPI = {
  createReport: (data) => {
    const user = getUserData();
    return api.post('/reports', { ...data, userId: user?.userId, email: user?.email });
  },
};

export default api;