// Debug script to check environment variables
console.log('=== Environment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('All REACT_APP_ variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_'))
  .forEach(key => {
    console.log(`${key}:`, process.env[key]);
  });
console.log('========================');

// Test API URL construction
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
console.log('Final API_BASE_URL:', API_BASE_URL);
console.log('Test endpoint URL:', `${API_BASE_URL}/feature-flags`);