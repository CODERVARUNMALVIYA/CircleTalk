
import React, { useState } from 'react';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('🔐 Login attempt:', { email }); // Debug log
    
    try {
      const res = await axiosInstance.post('/auth/login', { email, password });
      
      console.log('✅ Login response:', res.data); // Debug log
      
      toast.success('Login successful!');
      
      // Wait a bit before redirecting to ensure cookie is set
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      
    } catch (err) {
      console.error('❌ Login error:', err); // Debug log
      console.error('❌ Error details:', err.response?.data); // Debug log
      
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4">
      {/* Storyset Illustration */}
      <div className="hidden md:block mr-16 animate-float">
        <svg width="400" height="400" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
          {/* Background Circle */}
          <circle cx="250" cy="250" r="200" fill="#6366F1" opacity="0.1"/>
          
          {/* Main Character Body */}
          <ellipse cx="250" cy="380" rx="80" ry="30" fill="#4F46E5" opacity="0.3"/>
          
          {/* Laptop */}
          <rect x="180" y="280" width="140" height="100" rx="8" fill="#1F2937"/>
          <rect x="185" y="285" width="130" height="80" rx="4" fill="#3B82F6"/>
          <rect x="190" y="290" width="120" height="70" fill="#60A5FA"/>
          <path d="M 170 380 L 330 380 L 320 390 L 180 390 Z" fill="#374151"/>
          
          {/* Lock Icon on Screen */}
          <rect x="235" y="315" width="30" height="35" rx="4" fill="#FCD34D"/>
          <circle cx="250" cy="325" r="8" stroke="#1F2937" strokeWidth="3" fill="none"/>
          <rect x="247" y="328" width="6" height="10" fill="#1F2937"/>
          
          {/* Person Head */}
          <circle cx="250" cy="200" r="45" fill="#FBBF24"/>
          
          {/* Hair */}
          <path d="M 210 190 Q 250 160 290 190" fill="#1F2937"/>
          <circle cx="225" cy="185" r="15" fill="#1F2937"/>
          <circle cx="275" cy="185" r="15" fill="#1F2937"/>
          
          {/* Face Details */}
          <circle cx="235" cy="200" r="4" fill="#1F2937"/>
          <circle cx="265" cy="200" r="4" fill="#1F2937"/>
          <path d="M 235 215 Q 250 222 265 215" stroke="#1F2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
          
          {/* Body */}
          <ellipse cx="250" cy="280" rx="50" ry="45" fill="#3B82F6"/>
          <rect x="200" y="255" width="100" height="60" fill="#3B82F6"/>
          
          {/* Arms */}
          <ellipse cx="190" cy="280" rx="15" ry="40" fill="#60A5FA" transform="rotate(-20 190 280)"/>
          <ellipse cx="310" cy="280" rx="15" ry="40" fill="#60A5FA" transform="rotate(20 310 280)"/>
          
          {/* Hands on keyboard */}
          <circle cx="175" cy="300" r="12" fill="#FBBF24"/>
          <circle cx="325" cy="300" r="12" fill="#FBBF24"/>
          
          {/* Floating Security Icons */}
          <g opacity="0.7">
            <circle cx="120" cy="150" r="20" fill="#8B5CF6"/>
            <text x="112" y="160" fill="white" fontSize="24">🔒</text>
          </g>
          
          <g opacity="0.7">
            <circle cx="380" cy="200" r="20" fill="#EC4899"/>
            <text x="372" y="210" fill="white" fontSize="24">🔑</text>
          </g>
          
          <g opacity="0.7">
            <circle cx="100" cy="300" r="18" fill="#10B981"/>
            <text x="93" y="309" fill="white" fontSize="20">✓</text>
          </g>
        </svg>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-white bg-opacity-10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white border-opacity-20">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Welcome Back!</h2>
            <p className="text-gray-300">Login to continue to CircleTalk</p>
          </div>

          {/* Email Input */}
          <div className="mb-5">
            <label className="block text-white text-sm font-semibold mb-2">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-white text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : 'Login'}
          </button>

          {/* Divider */}
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Don't have an account?{' '}
              <a href="/signup" className="text-blue-300 hover:text-blue-200 font-semibold underline">
                Sign Up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;