import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, createWelcomeProjects } from '../lib/supabase';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: registrationError } = await register(email, password);

    if (registrationError) {
      setError(registrationError);
      setLoading(false);
      return;
    }

    // Create welcome project for new user
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await createWelcomeProjects(user.id);
      }
    } catch (error) {
      console.error('Error creating welcome project:', error);
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/50 border border-red-400 text-red-400 px-4 py-3 rounded relative">
              <p className="text-sm">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-[#404040] placeholder-[#999999] text-white bg-[#2c2c2c] rounded-t-md focus:outline-none focus:ring-[#0d99ff] focus:border-[#0d99ff] focus:z-10 sm:text-sm"
                placeholder="Email address"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-[#404040] placeholder-[#999999] text-white bg-[#2c2c2c] rounded-b-md focus:outline-none focus:ring-[#0d99ff] focus:border-[#0d99ff] focus:z-10 sm:text-sm"
                placeholder="Password (min. 6 characters)"
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0d99ff] hover:bg-[#0b87e3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d99ff] disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link
              to="/login"
              className="font-medium text-[#0d99ff] hover:text-[#0b87e3]"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}