import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Search from './pages/Search';
import Explore from './pages/Explore';
import Bookmarks from './pages/Bookmarks';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" />;
}

function App() {
  return (
    <AuthProvider>
      <FeatureFlagsProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Home />} />
              <Route path="profile/:userId" element={<Profile />} />
              <Route path="create" element={<CreatePost />} />
              <Route path="post/:postId" element={<PostDetail />} />
              <Route path="search" element={<Search />} />
              <Route path="explore" element={<Explore />} />
              <Route path="bookmarks" element={<Bookmarks />} />
            </Route>
          </Routes>
        </div>
      </FeatureFlagsProvider>
    </AuthProvider>
  );
}

export default App;