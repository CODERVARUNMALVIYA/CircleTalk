
import React, { useState } from 'react';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SignUpPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  // Generate 12 random avatar options
  const avatarOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  // Popular languages
  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
    'Bengali', 'Urdu', 'Turkish', 'Dutch', 'Swedish', 'Other'
  ];

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validation
    if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
      setLoading(false);
      return;
    }

    try {
      const profilePic = `https://avatar.iran.liara.run/public/${selectedAvatar}`;
      const res = await axiosInstance.post('/auth/signup', { 
        fullName, 
        email, 
        password,
        profilePic,
        nativeLanguage,
        location: location || 'Earth'
      });
      console.log('Signup response:', res.data);
      toast.success('Signup successful! Please login.');
      window.location.href = '/login';
    } catch (err) {
      console.error('Signup error:', err.response || err);  // Add this for debugging
      console.error('Error details:', err.response?.data);  // Show exact error from backend
      const errorMessage = err?.response?.data?.message;
      toast.error(errorMessage || 'Signup failed');
      
      // Handle specific error cases
      if (errorMessage?.includes('Email already in use')) {
        setErrors(prev => ({ ...prev, email: 'Email already in use' }));
      } else if (errorMessage?.includes('Invalid email format')) {
        setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      } else if (errorMessage?.includes('Password must be')) {
        setErrors(prev => ({ ...prev, password: errorMessage }));
      } else {
        // Show the actual error message from the server
        toast.error(`Error: ${errorMessage || err.message || 'Unknown error occurred'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-800 p-4">
      {/* Image Illustration */}
      <div className="hidden md:block mr-16 animate-float">
        <img src="/Video call-amico.png" alt="User signup" className="w-96 h-96 object-contain drop-shadow-2xl" />
      </div>

      {/* Signup Form */}
      <div className="w-full max-w-md">
        <form onSubmit={handleSignup} className="bg-white bg-opacity-10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white border-opacity-20">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Join CircleTalk!</h2>
            <p className="text-gray-300">Create your account to get started</p>
          </div>

          {/* Full Name Input */}
          <div className="mb-5">
            <label className="block text-white text-sm font-semibold mb-2">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Avatar Selection */}
          <div className="mb-5">
            <label className="block text-white text-sm font-semibold mb-2">Choose Your Avatar</label>
            <div className="grid grid-cols-6 gap-3 mb-3">
              {avatarOptions.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedAvatar(num)}
                  className={`relative rounded-full border-4 transition-all transform hover:scale-110 ${
                    selectedAvatar === num
                      ? 'border-green-400 shadow-lg scale-110'
                      : 'border-white border-opacity-30 hover:border-green-300'
                  }`}
                >
                  <img
                    src={`https://avatar.iran.liara.run/public/${num}`}
                    alt={`Avatar ${num}`}
                    className="w-full h-full rounded-full"
                  />
                  {selectedAvatar === num && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-xs">Click on any avatar to select it</p>
          </div>

          {/* Email Input */}
          <div className="mb-5">
            <label className="block text-white text-sm font-semibold mb-2">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full p-3 rounded-lg bg-white bg-opacity-20 border ${errors.email ? 'border-red-400' : 'border-white border-opacity-30'} text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all`}
              required
            />
            {errors.email && <p className="text-red-300 text-sm mt-2">{errors.email}</p>}
          </div>

          {/* Password Input */}
          <div className="mb-5">
            <label className="block text-white text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full p-3 rounded-lg bg-white bg-opacity-20 border ${errors.password ? 'border-red-400' : 'border-white border-opacity-30'} text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all`}
              required
            />
            {errors.password && <p className="text-red-300 text-sm mt-2">{errors.password}</p>}
            <p className="text-gray-400 text-xs mt-2">Must be at least 6 characters</p>
          </div>

          {/* Native Language Selection */}
          <div className="mb-5">
            <label className="block text-white text-sm font-semibold mb-2">Native Language</label>
            <select
              value={nativeLanguage}
              onChange={e => setNativeLanguage(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: 'none' }}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang} className="bg-gray-800 text-white">
                  {lang}
                </option>
              ))}
            </select>
            <p className="text-gray-400 text-xs mt-2">Select your primary language</p>
          </div>

          {/* Location Input */}
          <div className="mb-6">
            <label className="block text-white text-sm font-semibold mb-2">Location (Optional)</label>
            <input
              type="text"
              placeholder="e.g., New York, USA"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            />
            <p className="text-gray-400 text-xs mt-2">Where are you from?</p>
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>

          {/* Divider */}
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{' '}
              <a href="/login" className="text-green-300 hover:text-green-200 font-semibold underline">
                Login
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;