'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useChat } from '../context/ChatContext';
import { z } from 'zod';

// --- Validation Schemas (Unchanged logic, just ensure consistency) ---
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'Max 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Letters only'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Max 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Letters only'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

// --- Components ---

// Reusable Input Component for consistency and cleanness
const InputField = ({
  label,
  error,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700 ml-1">
      {label}
    </label>
    <div className="relative group">
      <input
        id={id}
        {...props}
        className={`
          w-full px-5 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 
          transition-all duration-200 ease-in-out
          focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#139d78]/10 
          ${error
            ? 'border-red-300 focus:border-red-400 bg-red-50/50'
            : 'border-gray-200 hover:border-gray-300 focus:border-[#139d78]'}
        `}
      />
    </div>
    {error && (
      <p className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
        {error}
      </p>
    )}
  </div>
);

export const Auth: React.FC = () => {
  const { login, register, googleLogin } = useChat();

  // State
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Reset errors when switching modes
  useEffect(() => {
    setError('');
    setFieldErrors({});
    setShowPassword(false);
  }, [isLogin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific field error on type
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const { firstName, lastName, email, password } = formData;

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          mapZodErrors(result.error);
          return;
        }
        setIsLoading(true);
        await login(email, password);
      } else {
        const result = registerSchema.safeParse({ firstName, lastName, email, password });
        if (!result.success) {
          mapZodErrors(result.error);
          return;
        }
        setIsLoading(true);
        const name = `${firstName.trim()} ${lastName.trim()}`;
        await register(email, password, name);
      }
    } catch (err: unknown) {
      const errorObject = err as Error;
      setError(errorObject.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const mapZodErrors = (zodError: z.ZodError) => {
    const errors: FieldErrors = {};
    zodError.issues.forEach((err) => {
      const field = err.path[0] as keyof FieldErrors;
      errors[field] = err.message;
    });
    setFieldErrors(errors);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await googleLogin();
    } catch (err: unknown) {
      const errorObject = err as Error;
      setError(errorObject.message || 'Google authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex selection:bg-[#139d78] selection:text-white font-sans bg-[#F3F6F5] lg:bg-white">

      {/* --- Left Side: Brand Hero (Hidden on Mobile, Visible LG+) --- */}
      <div className="hidden lg:flex w-[45%] relative bg-[#0a4d3b] flex-col justify-center px-16 xl:px-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#139d78] blur-[140px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#1ed7a3] blur-[120px] opacity-10"></div>

        <div className="relative z-10 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12  rounded-xl flex items-center justify-center shadow-xl">
              <Image src="/Container.png" alt="logo" width={48} height={48} />
            </div>
            <span className="font-bold text-2xl tracking-tight">ChatFlow</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-bold leading-tight mb-6">
            Connect with <br /> <span className="text-[#1ed7a3]">Your Team</span>
          </h1>
          <p className="text-lg text-white/70 mb-12 max-w-md leading-relaxed">
            Experience seamless communication with our secure, fast, and intuitive chat platform designed for modern teams.
          </p>

          {/* Social Proof / Stats */}
          <div className="flex gap-8 pt-8 border-t border-white/10">
            <div>
              <p className="text-2xl font-bold">10k+</p>
              <p className="text-sm text-white/50">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold">99.9%</p>
              <p className="text-sm text-white/50">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Right Side: Form Section (Full Screen on Mobile) --- */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative">

        {/* Mobile Background Header (Visible only on small screens) */}
        <div className="absolute top-0 left-0 w-full h-[40vh] bg-[#0a4d3b] lg:hidden -z-10 rounded-b-[3rem]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
          <div className="flex flex-col items-center justify-center h-full pb-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
            </div>
            <h2 className="text-white text-2xl font-bold">ChatFlow</h2>
          </div>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-2xl shadow-black/1 p-6 sm:p-10 border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-gray-500 text-sm sm:text-base">
              {isLogin ? 'Enter your details to access your workspace.' : 'Start your 30-day free trial. No credit card required.'}
            </p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={isLoading}
              className="flex items-center justify-center gap-2.5 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 group bg-white"
            >
              <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="group-hover:scale-110 transition-transform" alt="Google" width={20} height={20} />
              <span className="text-sm font-semibold text-gray-700">Google</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              className="flex items-center justify-center gap-2.5 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 group bg-white"
            >
              <svg className="w-5 h-5 text-gray-900 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              <span className="text-sm font-semibold text-gray-700">Github</span>
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="bg-white px-3 text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm font-medium text-red-600 leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={handleAction} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  error={fieldErrors.firstName}
                />
                <InputField
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  error={fieldErrors.lastName}
                />
              </div>
            )}

            <InputField
              id="email"
              name="email"
              type="email"
              label="Email Address"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleInputChange}
              error={fieldErrors.email}
            />

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs font-bold text-[#139d78] hover:text-[#0a4d3b] hover:underline transition-all">
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "••••••••" : "Min. 6 characters"}
                  className={`
                    w-full px-5 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 pr-12
                    transition-all duration-200 ease-in-out
                    focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#139d78]/10
                    ${fieldErrors.password
                      ? 'border-red-300 focus:border-red-400 bg-red-50/50'
                      : 'border-gray-200 hover:border-gray-300 focus:border-[#139d78]'}
                  `}
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 font-medium ml-1">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0a4d3b] hover:bg-[#07382b] text-white py-4 rounded-xl font-bold text-[16px] transition-all transform active:scale-[0.99] shadow-sm shadow-[#0a4d3b]/20 hover:shadow-[#0a4d3b]/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm font-medium">
              {isLogin ? "Don't have an account?" : "Already have an account?"} {' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#139d78] font-bold hover:text-[#0a4d3b] hover:underline transition-all"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>

        </div>

        {/* Footer Links (Privacy/Terms) */}
        <div className="mt-8 flex gap-6 text-xs text-gray-400 font-medium lg:absolute lg:bottom-8 lg:left-8">
          <a href="#" className="hover:text-gray-600">Privacy Policy</a>
          <a href="#" className="hover:text-gray-600">Terms of Service</a>
        </div>

      </div>
    </div>
  );
};