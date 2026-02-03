'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Github, Code2, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, User, AtSign, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Landing from '@/app/landing/Landing';
import BackendStatusLoader from '@/components/BackendStatusLoader';

export default function Home() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [backendLoading, setBackendLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Demo credentials carousel
  const demoAccounts = [
    { role: 'Owner', email: 'owner@demo.com', password: 'NavFlow123!', color: 'from-purple-500 to-purple-500' },
    { role: 'Admin', email: 'admin@demo.com', password: 'NavFlow123!', color: 'from-blue-500 to-blue-500' },
    { role: 'Moderator', email: 'moderator@demo.com', password: 'NavFlow123!', color: 'from-green-500 to-green-500' },
    { role: 'User', email: 'user@demo.com', password: 'NavFlow123!', color: 'from-orange-500 to-orange-500' },
  ];
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const handleDemoNavigation = (direction: 'prev' | 'next') => {
    setSlideDirection(direction === 'next' ? 'right' : 'left');
    if (direction === 'next') {
      setCurrentDemoIndex((prev) => (prev + 1) % demoAccounts.length);
    } else {
      setCurrentDemoIndex((prev) => (prev - 1 + demoAccounts.length) % demoAccounts.length);
    }
  };

  const handleUseDemoAccount = () => {
    const account = demoAccounts[currentDemoIndex];
    setEmail(account.email);
    setPassword(account.password);
  };

  // Wake up backend on page load
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        const response = await fetch('https://navflow-api.onrender.com/api/health/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Initial backend ping response:', response.status);
        
        if (response.ok || response.status === 200) {
          console.log('Backend is immediately online!');
          setBackendLoading(false);
        }
      } catch (error) {
        console.log('Initial backend ping error:', error);
        // Keep loading true so BackendStatusLoader will keep trying
      }
    };

    wakeUpBackend();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/accounts/login/', {
        email,
        password,
      });

      const { access, refresh } = response.data;
      
      if (access) {
        localStorage.setItem('access_token', access);
        if (refresh) {
          localStorage.setItem('refresh_token', refresh);
        }
        
        login(access, null);
        
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Login failed. Please try again.';
      
      if (err.response?.status === 401) {
        message = 'Invalid email or password';
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.response?.data?.email) {
        message = Array.isArray(err.response.data.email) ? err.response.data.email[0] : err.response.data.email;
      } else if (err.response?.data?.password) {
        message = Array.isArray(err.response.data.password) ? err.response.data.password[0] : err.response.data.password;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.email || !formData.username || !formData.first_name || !formData.last_name || !formData.password || !formData.password_confirm) {
      setError('All fields are required');
      return;
    }

    // Username validation
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/accounts/register/', formData);
      
      const { tokens, user } = response.data;
      
      if (tokens?.access) {
        localStorage.setItem('access_token', tokens.access);
        if (tokens.refresh) {
          localStorage.setItem('refresh_token', tokens.refresh);
        }
        
        login(tokens.access, user);
        
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      console.error('Registration error response:', err.response?.data);
      let message = 'Registration failed. Please try again.';
      
      if (err.response?.status === 400) {
        const data = err.response.data;
        // Try to extract the first error message
        if (data.email) {
          message = Array.isArray(data.email) ? data.email[0] : data.email;
        } else if (data.username) {
          message = Array.isArray(data.username) ? data.username[0] : data.username;
        } else if (data.password) {
          message = Array.isArray(data.password) ? data.password[0] : data.password;
        } else if (data.password_confirm) {
          message = Array.isArray(data.password_confirm) ? data.password_confirm[0] : data.password_confirm;
        } else if (data.first_name) {
          message = Array.isArray(data.first_name) ? data.first_name[0] : data.first_name;
        } else if (data.last_name) {
          message = Array.isArray(data.last_name) ? data.last_name[0] : data.last_name;
        } else if (data.non_field_errors) {
          message = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else if (data.detail) {
          message = data.detail;
        } else if (data.message) {
          message = data.message;
        } else if (typeof data === 'object') {
          // Try to get any error message from the response
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            message = Array.isArray(val) ? val[0] : String(val);
          }
        }
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const switchForm = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setFormData({
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
    });
  };

  return (
    <div className="min-h-screen relative bg-black font-['Inter'] text-white flex items-center justify-center overflow-x-hidden">
      {/* Landing Background Component */}
      <Landing />

      {/* Content Container */}
      <div className="relative z-10 w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        
        {/* Top Section - Made by Sami & Buttons */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 lg:mb-8">
          <p className="text-lg sm:text-xl lg:text-lg font-medium text-gray-300 whitespace-nowrap">
            Made by{' '}
            <span className="font-semibold" style={{ color: '#9662f7' }}>
              Sami
            </span>
          </p>
          <div className="flex flex-row gap-2 lg:gap-3">
            <a
              href="https://github.com/samixshady"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-white text-base font-medium hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-300 backdrop-blur-sm"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="https://github.com/samixshady/NavFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-white text-base font-medium hover:from-blue-600/30 hover:to-cyan-600/30 transition-all duration-300 backdrop-blur-sm"
            >
              <Code2 className="w-4 h-4" />
              Source Code
            </a>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 w-full">

            {/* Middle Left - Big NavFlow Title */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-4 lg:mb-6">
              <span className="text-white drop-shadow-lg">Nav</span>
              <span style={{ color: '#9662f7' }}>Flow</span>
            </h1>
            
            {/* Project Description */}
            <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                Project Management
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h2>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-2xl">
                Collaborate seamlessly with your team, manage projects efficiently, and deliver on time. NavFlow provides all the tools you need for modern project management in one intuitive platform.
              </p>
              
              {/* Read More Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 lg:px-8 lg:py-4 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                style={{ backgroundColor: '#9662f7', boxShadow: '0 0 20px rgba(183, 166, 214, 0.3)' }}
              >
                Read More
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Right - Login Form */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2">
          <div className="w-full max-w-md">
            {/* Backend Status */}
            <div className="mb-4">
              <BackendStatusLoader isLoading={backendLoading} />
            </div>
            
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[calc(100vh-180px)] overflow-y-auto">
              {/* Toggle Buttons */}
              <div className="flex mb-4 bg-white/5 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                    setSuccess('');
                    setFormData({
                      email: '',
                      username: '',
                      first_name: '',
                      last_name: '',
                      password: '',
                      password_confirm: '',
                    });
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    isLogin 
                      ? 'text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  style={isLogin ? { backgroundColor: '#9662f7' } : {}}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                    setSuccess('');
                    setEmail('');
                    setPassword('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    !isLogin 
                      ? 'text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  style={!isLogin ? { backgroundColor: '#9662f7'} : {}}
                >
                  Sign Up
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-4 text-center">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}

            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com or username"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      className="w-full pl-9 pr-9 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Demo Credentials Carousel */}
                <div className="mt-4">
                  <div className="relative">
                    {/* Carousel Container */}
                    <div className="relative overflow-hidden rounded-lg">
                      <div 
                        key={currentDemoIndex}
                        className={`p-3 sm:p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg cursor-pointer transform transition-all duration-300 hover:bg-white/10 hover:border-purple-400/40 active:scale-[0.98]
                        ${slideDirection === 'right' ? 'animate-slideInRight' : 'animate-slideInLeft'}`}
                        onClick={handleUseDemoAccount}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm sm:text-base font-bold bg-gradient-to-r ${demoAccounts[currentDemoIndex].color} bg-clip-text text-transparent`}>
                              {demoAccounts[currentDemoIndex].role}
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                            {currentDemoIndex + 1}/{demoAccounts.length}
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-300">
                            <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                            <span className="font-mono truncate">{demoAccounts[currentDemoIndex].email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-300">
                            <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                            <span className="font-mono">{demoAccounts[currentDemoIndex].password}</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-[10px] sm:text-xs text-center text-purple-300/60">
                          Tap to auto-fill ✨
                        </div>
                      </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleDemoNavigation('prev')}
                        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/40 transition-all duration-200 active:scale-95"
                        aria-label="Previous account"
                      >
                        <ChevronLeft className="w-4 h-4 text-purple-300" />
                      </button>
                      
                      {/* Dots Indicator */}
                      <div className="flex gap-1.5">
                        {demoAccounts.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setSlideDirection(index > currentDemoIndex ? 'right' : 'left');
                              setCurrentDemoIndex(index);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              index === currentDemoIndex 
                                ? 'w-6 bg-gradient-to-r ' + demoAccounts[index].color
                                : 'w-1.5 bg-white/20 hover:bg-white/30'
                            }`}
                            aria-label={`Go to ${demoAccounts[index].role} account`}
                          />
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDemoNavigation('next')}
                        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/40 transition-all duration-200 active:scale-95"
                        aria-label="Next account"
                      >
                        <ChevronRight className="w-4 h-4 text-purple-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              /* Registration Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-200 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="John"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-200 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-200 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-gray-200 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition lowercase"
                      disabled={loading}
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="[a-zA-Z0-9_]+"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Letters, numbers, underscores only</p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-200 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      className="w-full pl-9 pr-9 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-200 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      className="w-full pl-9 pr-9 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 text-sm text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-95 mt-4"
                  style={{
                    backgroundColor: loading ? '#9662f7' : '#9662f7',
                  }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}
            </div>
          </div>
        </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl max-h-[80vh] overflow-y-auto border border-white/10 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              ✕
            </button>

            <h2 className="text-3xl font-bold text-white mb-6">NavFlow - Project Management Made Simple</h2>

            <div className="space-y-6 text-gray-300">
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">Overview</h3>
                <p>
                  NavFlow is a modern, multi-tenant SaaS platform designed to streamline project and task management for teams of all sizes. Built with cutting-edge technology, NavFlow provides an intuitive interface for organizing work, tracking progress, and collaborating efficiently.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-white mb-3">Key Features</h3>
                <ul className="space-y-2 ml-4">
                  {[
                    'Multi-tenant architecture with organization management',
                    'Real-time project tracking and progress monitoring',
                    'Task management with priority levels and status tracking',
                    'Team collaboration with member management',
                    'Role-based access control (Owner, Admin, Member)',
                    'JWT-based authentication and secure API endpoints',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-white mb-3">Technology Stack</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="font-semibold text-white mb-2">Backend</p>
                    <p className="text-sm">Django, Django REST Framework, PostgreSQL</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="font-semibold text-white mb-2">Frontend</p>
                    <p className="text-sm">Next.js, React, TypeScript, Tailwind CSS</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
    </div>
  );
}
