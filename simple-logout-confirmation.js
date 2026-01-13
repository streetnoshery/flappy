// Simple logout confirmation using browser's native confirm dialog
// Replace the handleLogout function in Navbar.js with this if you prefer the simple approach:

const handleLogout = () => {
  const confirmed = window.confirm('Are you sure you want to logout?');
  if (confirmed) {
    logout();
    navigate('/login');
  }
};

// And update the logout button onClick to use handleLogout instead of handleLogoutClick:
// onClick={handleLogout}