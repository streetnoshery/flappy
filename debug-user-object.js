// Debug script to check user object in localStorage
// Run this in browser console after password reset

console.log('=== User Object Debug ===');

// Check localStorage
const userDataString = localStorage.getItem('user');
console.log('Raw localStorage data:', userDataString);

if (userDataString) {
  try {
    const userData = JSON.parse(userDataString);
    console.log('Parsed user object:', userData);
    console.log('User fields:');
    Object.keys(userData).forEach(key => {
      console.log(`  ${key}:`, userData[key]);
    });
    
    // Check specific fields
    console.log('\nField checks:');
    console.log('  userId:', userData.userId);
    console.log('  id:', userData.id);
    console.log('  _id:', userData._id);
    console.log('  email:', userData.email);
    console.log('  username:', userData.username);
    console.log('  role:', userData.role);
    
    // Profile URL construction
    console.log('\nProfile URL construction:');
    console.log('  Using userId:', `/profile/${userData.userId}`);
    console.log('  Using id:', `/profile/${userData.id}`);
    console.log('  Using _id:', `/profile/${userData._id}`);
    
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
} else {
  console.log('No user data found in localStorage');
}

console.log('========================');

// Instructions
console.log('\nTo fix profile navigation issues:');
console.log('1. Ensure user object has userId field');
console.log('2. Check that components use user?.userId not user?.id');
console.log('3. Verify backend returns userId in auth responses');