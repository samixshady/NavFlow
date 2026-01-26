'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Github, Code2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/accounts/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      if (data.access) {
        localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <p className="text-sm font-medium text-gray-300">
            Made by{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
              Sami
            </span>
          </p>
          <div className="flex gap-3">
            <a
              href="https://github.com/samixshady"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="https://github.com/samixshady/NavFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all"
            >
              <Code2 className="w-4 h-4" />
              Source Code
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative pt-24 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Hero Title */}
        <div className="text-center mb-16">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white drop-shadow-lg">
            Nav<span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Flow</span>
          </h1>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Side - Description */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Project Management
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Collaborate seamlessly with your team, manage projects efficiently, and deliver on time. NavFlow provides all the tools you need for modern project management in one intuitive platform.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: '📊', title: 'Real-time Tracking', desc: 'Monitor progress visually' },
                { icon: '👥', title: 'Team Collaboration', desc: 'Work together seamlessly' },
                { icon: '✅', title: 'Task Management', desc: 'Organize and prioritize' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition">
                  <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{feature.title}</p>
                    <p className="text-sm text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Project Description Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Read More
            </button>
          </div>

          {/* Right Side - Login Card */}
          <div className="w-full max-w-md bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Welcome Back</h3>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-300">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Demo Account */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-gray-400 text-center mb-3">Try with demo account:</p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  <span className="text-gray-500">Email:</span> projectowner@example.com
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-500">Password:</span> TestPass123!
                </p>
              </div>
            </div>

            {/* Sign Up Link */}
            <p className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>

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
