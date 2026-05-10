import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Pill, UserCircle, LogOut, History, Activity, Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { signInWithGoogle, logOut } from '../firebase';

export default function Layout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const closeMobileMenu = () => setShowMobileMenu(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-medical-100 selection:text-medical-900 flex flex-col transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.05 }}
                className="w-10 h-10 bg-medical-600 rounded-xl flex items-center justify-center shadow-lg shadow-medical-600/20"
              >
                <Activity className="text-white w-6 h-6" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-medical-600 dark:group-hover:text-medical-500 transition-colors">dawa sathi.ai</h1>
                <p className="hidden sm:block text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400">Intelligent Health Assistant</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors"
                >
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-slate-200"
                  />
                  <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800">
                        <Link 
                          to="/history" 
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-medical-600 dark:hover:text-medical-400 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-xl transition-colors"
                        >
                          <History className="w-4 h-4" />
                          My History
                        </Link>
                        <button 
                          onClick={() => {
                            logOut();
                            setShowProfileMenu(false);
                            navigate('/');
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors mt-1"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 bg-slate-900 dark:bg-medical-600 hover:bg-slate-800 dark:hover:bg-medical-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                <UserCircle className="w-4 h-4 hidden sm:block" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-lg text-slate-900 dark:text-white">Menu</span>
                <button onClick={closeMobileMenu} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <Link 
                  to="/prescription" 
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/prescription' ? 'bg-medical-50 text-medical-700 dark:bg-medical-900/30 dark:text-medical-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <Pill className="w-5 h-5" /> Medicine
                </Link>
                <Link 
                  to="/lab-report" 
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/lab-report' ? 'bg-medical-50 text-medical-700 dark:bg-medical-900/30 dark:text-medical-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <Activity className="w-5 h-5" /> Lab Reports
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1">
        <Outlet />
      </div>
      
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-8 border-t border-slate-800 text-center text-sm transition-colors duration-300 mt-auto">
        <p>© 2026 dawa sathi.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
