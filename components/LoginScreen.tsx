import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/mockBackend';
import { ShieldCheck, Bus, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !firstName || !lastName) {
      setError('All fields are required.');
      return;
    }

    if (isRegistering) {
      if (!privacyAccepted) {
        setError('You must accept the privacy policy to continue.');
        return;
      }
      const newUser = registerUser(firstName, lastName, phone);
      onLogin(newUser);
    } else {
      const user = loginUser(firstName, lastName, phone);
      if (user) {
        onLogin(user);
      } else {
        setError('User not found. Please register first.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full">
            <Bus className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Shuttle Portal</h1>
        <p className="text-center text-slate-500 mb-8">
          {isRegistering ? 'Create your account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
              placeholder="555-0123"
            />
          </div>

          {isRegistering && (
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="privacy"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="privacy" className="text-xs text-slate-600">
                I acknowledge that my name and phone number are collected for identification and security purposes. 
                This data is visible to platform administrators. I accept the data privacy policy.
              </label>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition shadow-md flex items-center justify-center space-x-2"
          >
            {isRegistering ? (
               <><span>Request Access</span> <ShieldCheck size={18} /></>
            ) : (
               <><span>Sign In</span> <KeyRound size={18} /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setPrivacyAccepted(false);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'New user? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};