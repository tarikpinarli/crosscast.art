import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Boxes, Menu, X, User as UserIcon, LogOut, Coins } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

const navItems = [
  { name: 'Showcase', path: '/showcase' },
  { name: 'Solutions', path: '/solutions' },
  { name: 'Technology', path: '/technology' },
  { name: 'Pricing', path: '/pricing' },
];

// 👇 CHANGED: Removed 'default' keyword
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Boxes className="w-8 h-8 text-white transition-transform group-hover:scale-110 duration-500" />
                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="text-xl font-bold tracking-tighter text-white">
                CrossCast
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    location.pathname === item.path ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Auth Section (Right Side) */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated && user ? (
                // LOGGED IN STATE
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
                    <Coins size={14} className="text-yellow-500" />
                    <span className="text-sm font-medium text-white">{user.credits}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
                    <span className="text-sm text-zinc-400">{user.email}</span>
                    <button 
                      onClick={logout}
                      className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-red-400"
                      title="Log Out"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                // LOGGED OUT STATE
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors"
                >
                  <UserIcon size={16} />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-zinc-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Render the Modal outside the header layout */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}