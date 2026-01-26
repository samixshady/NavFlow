'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Github, Code2, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, User } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
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
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.password || !formData.password_confirm) {
      setError('All fields are required');
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
      let message = 'Registration failed. Please try again.';
      
      if (err.response?.status === 400) {
        const data = err.response.data;
        if (data.email) {
          message = Array.isArray(data.email) ? data.email[0] : data.email;
        } else if (data.password) {
          message = Array.isArray(data.password) ? data.password[0] : data.password;
        } else if (data.password_confirm) {
          message = Array.isArray(data.password_confirm) ? data.password_confirm[0] : data.password_confirm;
        } else if (data.first_name) {
          message = Array.isArray(data.first_name) ? data.first_name[0] : data.first_name;
        } else if (data.last_name) {
          message = Array.isArray(data.last_name) ? data.last_name[0] : data.last_name;
        } else if (data.detail) {
          message = data.detail;
        } else if (data.message) {
          message = data.message;
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
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
    });
  };

  return (
    <div className="min-h-screen relative bg-black font-['Inter'] text-white flex items-center justify-center overflow-x-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Spheres with animations */}
        <div 
          className="absolute w-[40vw] h-[40vw] rounded-full opacity-80 animate-sphere-1"
          style={{
            background: 'linear-gradient(40deg, rgba(255, 0, 128, 0.8), rgba(255, 102, 0, 0.4))',
            filter: 'blur(60px)',
            top: '-10%',
            left: '-10%'
          }}
        ></div>
        
        <div 
          className="absolute w-[45vw] h-[45vw] rounded-full opacity-80 animate-sphere-2"
          style={{
            background: 'linear-gradient(240deg, rgba(72, 0, 255, 0.8), rgba(0, 183, 255, 0.4))',
            filter: 'blur(60px)',
            bottom: '-20%',
            right: '-10%'
          }}
        ></div>
        
        <div 
          className="absolute w-[30vw] h-[30vw] rounded-full opacity-50 animate-sphere-3"
          style={{
            background: 'linear-gradient(120deg, rgba(133, 89, 255, 0.5), rgba(98, 216, 249, 0.3))',
            filter: 'blur(60px)',
            top: '60%',
            left: '20%'
          }}
        ></div>

        {/* Central Glow */}
        <div 
          className="absolute w-[40vw] h-[40vh] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-2 animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, rgba(72, 0, 255, 0.15), transparent 70%)',
            filter: 'blur(30px)'
          }}
        ></div>

        {/* Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 
              'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)'
          }}
        ></div>

        {/* Noise Overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
          }}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-0 flex flex-col lg:justify-center">
        
        {/* Top Section - Made by Sami & Buttons */}
        <div className="pb-6 lg:pb-0 lg:absolute lg:top-12 lg:left-8 lg:right-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 lg:gap-3 z-20">
          <p className="text-lg sm:text-xl lg:text-lg font-medium text-gray-300 whitespace-nowrap">
            Made by{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
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
        <div className="flex-1 lg:flex lg:items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-start lg:items-center gap-8 lg:gap-12 w-full">

        {/* Middle Left - Big NavFlow Title */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-4 lg:mb-6">
              <span className="text-white drop-shadow-lg">Nav</span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Flow</span>
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
                className="inline-flex items-center gap-2 px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-purple-500/25"
              >
                Read More
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Right - Login Form */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2">
          <div className="w-full max-w-md bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Toggle Buttons */}
            <div className="flex mb-6 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccess('');
                  setFormData({
                    email: '',
                    first_name: '',
                    last_name: '',
                    password: '',
                    password_confirm: '',
                  });
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  isLogin 
                    ? 'bg-white/10 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
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
                    ? 'bg-white/10 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Sign Up
              </button>
            </div>

            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h3>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}

            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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

                {/* Demo Credentials */}
                <div 
                  className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg mt-6 cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
                  onClick={() => {
                    setEmail('projectowner@example.com');
                    setPassword('TestPass123!');
                  }}
                >
                  <p className="text-s font-semibold text-purple-300 mb-2">Demo Credentials (click to use):</p>
                  <p className="text-s text-gray-400 mb-1">
                    📧 projectowner@example.com
                  </p>
                  <p className="text-s text-gray-400">
                    🔑 TestPass123!
                  </p>
                </div>
              </form>
            ) : (
              /* Registration Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="John"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-95 mt-6"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}
          </div>
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
  );
}