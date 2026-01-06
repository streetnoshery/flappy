# Authentication Pages

## Overview
The Authentication pages handle user registration and login functionality with comprehensive form validation, error handling, and responsive design.

## Components
- **Login.js** - User login form and authentication
- **Signup.js** - User registration form with validation

## Features
- Form validation with react-hook-form
- Password strength indicator
- Email format validation
- Phone number validation (10 digits)
- Responsive design for all devices
- Real-time validation feedback
- Error handling and user feedback

## Login Component

### Features
- Email and password authentication
- Form validation with error messages
- Loading states during authentication
- Redirect to home after successful login
- Link to signup page for new users

### Form Fields
```javascript
{
  email: {
    type: 'email',
    required: true,
    validation: 'Valid email format'
  },
  password: {
    type: 'password',
    required: true,
    minLength: 8
  }
}
```

### Validation Rules
- **Email**: Must be valid email format
- **Password**: Required field, minimum 8 characters
- **Real-time validation**: Errors shown on blur/change

### API Integration
```javascript
// Login API call
const loginUser = async (credentials) => {
  const response = await authAPI.login(credentials);
  // Store user data in localStorage and context
  localStorage.setItem('user', JSON.stringify(response.data.user));
  setUser(response.data.user);
};
```

### Error Handling
- Network errors with user-friendly messages
- Validation errors displayed inline
- Authentication failures with clear feedback
- Loading states to prevent multiple submissions

## Signup Component

### Features
- Complete user registration form
- Password strength indicator with real-time feedback
- Email format validation
- Phone number validation (exactly 10 digits)
- Strong password requirements
- Responsive form layout

### Form Fields
```javascript
{
  username: {
    type: 'text',
    required: true,
    minLength: 3,
    maxLength: 20
  },
  email: {
    type: 'email',
    required: true,
    validation: 'Valid email format'
  },
  password: {
    type: 'password',
    required: true,
    validation: 'Strong password requirements'
  },
  phoneNumber: {
    type: 'tel',
    required: true,
    validation: 'Exactly 10 digits'
  }
}
```

### Password Strength Indicator
Visual indicator showing password strength with requirements:
- ✅ At least 8 characters
- ✅ One uppercase letter
- ✅ One lowercase letter  
- ✅ One number
- ✅ One special character

### Validation Rules
- **Username**: 3-20 characters, alphanumeric and underscore
- **Email**: Valid email format, unique validation
- **Password**: Strong password with all requirements
- **Phone**: Exactly 10 numeric digits

### Real-time Validation
```javascript
const validatePassword = (password) => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const strength = Object.values(requirements).filter(Boolean).length;
  return { requirements, strength };
};
```

## Responsive Design

### Mobile (< 640px)
- Single column layout
- Full-width form elements
- Touch-friendly button sizes
- Optimized spacing and typography

### Tablet (640px - 1024px)
- Centered form with max-width
- Improved spacing and padding
- Better visual hierarchy

### Desktop (> 1024px)
- Centered card layout
- Optimal form width for readability
- Enhanced visual design

## State Management

### Authentication Context Integration
```javascript
const { login, loading, error } = useAuth();

const handleLogin = async (data) => {
  try {
    await login(data);
    navigate('/');
  } catch (error) {
    // Error handled by context
  }
};
```

### Form State Management
```javascript
const { 
  register, 
  handleSubmit, 
  formState: { errors }, 
  watch 
} = useForm();

// Watch password for strength indicator
const password = watch('password', '');
```

## Error Handling

### Validation Errors
- Inline error messages below form fields
- Real-time validation on blur/change
- Clear, user-friendly error text
- Visual indicators (red borders, icons)

### API Errors
- Network error handling with retry options
- Server validation errors displayed appropriately
- Authentication failures with clear messaging
- Loading states to prevent multiple submissions

### User Feedback
```javascript
// Success feedback
toast.success('Account created successfully!');

// Error feedback
toast.error('Invalid email or password');

// Validation feedback
{errors.email && (
  <p className="text-red-600 text-sm">{errors.email.message}</p>
)}
```

## Accessibility Features
- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- High contrast error states
- Focus management and indicators

## Security Features
- Client-side validation (complemented by server-side)
- Password strength enforcement
- Input sanitization
- Secure form submission
- No sensitive data in localStorage (except user ID)

## Dependencies
- `react-hook-form` - Form validation and management
- `react-router-dom` - Navigation and routing
- `react-hot-toast` - User notifications
- `lucide-react` - Icons and visual elements

## Usage Examples

### Login Flow
```javascript
// User enters credentials
const credentials = {
  email: 'user@example.com',
  password: 'SecurePass123!'
};

// Form submission
const onSubmit = async (data) => {
  await login(data);
  navigate('/');
};
```

### Signup Flow
```javascript
// User fills registration form
const userData = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  phoneNumber: '1234567890'
};

// Form submission with validation
const onSubmit = async (data) => {
  await signup(data);
  navigate('/login');
};
```

## Performance Optimizations
- Debounced validation for better UX
- Optimized re-renders with useCallback
- Lazy loading of validation rules
- Efficient form state management

## Future Enhancements
- Social media login integration
- Two-factor authentication
- Password reset functionality
- Email verification
- Remember me functionality
- Account recovery options

## Notes
- No JWT tokens used in current implementation
- User data stored in localStorage and context
- All validation rules match backend requirements
- Responsive design works on all device sizes
- Password strength indicator provides real-time feedback