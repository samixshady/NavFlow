'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">NavFlow</h1>
          <div className="flex gap-4">
            <Link 
              href="/login"
              className="px-4 py-2 text-white hover:text-purple-300 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center py-20">
          <div className="mb-8">
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Project Management
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-8">
              Collaborate with your team, manage projects efficiently, and deliver on time with NavFlow.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link 
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 backdrop-blur text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-4xl">
            <div className="p-6 bg-white/5 backdrop-blur border border-white/10 rounded-xl hover:bg-white/10 transition">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">Track Progress</h3>
              <p className="text-gray-400">Monitor project progress in real-time with visual dashboards</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur border border-white/10 rounded-xl hover:bg-white/10 transition">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-white mb-2">Team Collaboration</h3>
              <p className="text-gray-400">Work together seamlessly with your team members</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur border border-white/10 rounded-xl hover:bg-white/10 transition">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-white mb-2">Task Management</h3>
              <p className="text-gray-400">Organize and prioritize tasks efficiently</p>
            </div>
          </div>

          {/* Test Account Info */}
          <div className="mt-20 p-6 bg-white/5 backdrop-blur border border-white/10 rounded-xl max-w-md">
            <p className="text-sm text-gray-400 mb-3">📝 Demo Account:</p>
            <p className="text-sm font-mono text-purple-300 mb-1">
              Email: <span className="text-white">projectowner@example.com</span>
            </p>
            <p className="text-sm font-mono text-purple-300">
              Password: <span className="text-white">TestPass123!</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
          <p>© 2026 NavFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
