/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Post } from '../../types';
import { AdminTelemetry } from './AdminTelemetry';
import { AdminSecurity } from './AdminSecurity';
import { AdminPosts } from './AdminPosts';
import { AdminEditModal } from './AdminEditModal';
import { 
  ShieldAlert, 
  Lock, 
  Key, 
  X, 
  Eye, 
  ExternalLink,
  Users,
  Activity,
  Cpu,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  posts: Post[];
  onNavigateHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ posts, onNavigateHome }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [selectedPostToEdit, setSelectedPostToEdit] = useState<Post | null>(null);

  // Check existing session authorization on load
  useEffect(() => {
    const authSession = sessionStorage.getItem('venom_admin_auth');
    if (authSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle administrator credentials authentication
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Hardcoded credentials match
    if (username === 'theakshatpopat' && password === 'Aprt9311') {
      setIsAuthenticated(true);
      sessionStorage.setItem('venom_admin_auth', 'true');
      setUsername('');
      setPassword('');
    } else {
      setLoginError('Invalid Administrator credentials. Security breach log generated.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('venom_admin_auth');
  };

  const handleSavedEdit = () => {
    setSelectedPostToEdit(null);
  };

  const handleBlockIp = async (ip: string) => {
    try {
      const blockRef = doc(db, 'blockedIps', ip);
      await setDoc(blockRef, {
        blockedAt: new Date().toISOString(),
        reason: 'Community Guidelines Violation (Admin Enforced)'
      });
      alert(`IP Address ${ip} has been successfully blacklisted and suspended.`);
    } catch (err: any) {
      console.error('Failed to block IP:', err);
      alert(`Failed to block IP: ${err.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-300 font-mono flex flex-col selection:bg-emerald-500/30 selection:text-emerald-100">
      
      {/* GLOWING HEADER BACKGROUND */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent z-10" />

      {/* ADMIN TITLE / CONSOLE STATUS BAR */}
      <header className="border-b border-zinc-900 bg-black/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-100 tracking-widest flex items-center gap-1.5 leading-none">
                <span>Venom Comm-Center</span>
                <span className="text-zinc-600">/</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.5 rounded text-[8px]">
                  {isAuthenticated ? 'LEVEL 4 DECRYPTION CLEARANCE' : 'SECURE GATEWAY'}
                </span>
              </span>
              <p className="text-[8px] text-zinc-600 uppercase tracking-tight mt-0.5 font-sans">
                {isAuthenticated ? 'System status: operational & stabilized' : 'Awaiting authorized node credentials'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer"
            >
              Feed Home
            </button>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer"
              >
                Terminate Clearance
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT SWITCHER */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* LOGIN PANEL GATEWAY */
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex items-center justify-center p-4 min-h-[70vh]"
          >
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-2xl relative overflow-hidden">
              
              {/* Glowing decorative circles */}
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col items-center justify-center text-center mb-6">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-xs font-black tracking-widest text-zinc-100 uppercase">ACCESS DECRYPTION SHELL</h2>
                <p className="text-[9px] text-zinc-500 mt-1 uppercase">Enter cryptographic clearance credentials to connect</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 text-[9px] p-2.5 rounded leading-relaxed border-l-2 border-l-rose-500">
                    [BREACH WARNING]: {loginError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-zinc-500 block font-bold tracking-wider">SYSTEM IDENTITY (ADMIN)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter security ID..."
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-zinc-500 block font-bold tracking-wider">CRYPTOGRAPHIC KEY (PASSWORD)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter passphrase..."
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[10px] rounded transition-all uppercase mt-6 cursor-pointer tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>INITIALIZE CLEARANCE</span>
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* AUTHENTICATED ADMINISTRATOR WORKSPACE */
          <motion.main 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6 relative z-10"
          >
            {/* STATS & SVG GRAPHS SECTION */}
            <AdminTelemetry posts={posts} />

            {/* THREAT RAPID-RESPONSE ACCESS BAR */}
            <div className="bg-zinc-950 border border-emerald-500/10 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-950/20 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest block leading-none">
                    Security Incident Triage Center
                  </span>
                  <span className="text-[9px] text-zinc-500 uppercase font-sans mt-1.5 block">
                    Monitor user-submitted reports, content policy violations, and device-level quarantine bans.
                  </span>
                </div>
              </div>
              
              <a
                href="/admin/report"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 text-rose-400 text-[10px] font-bold rounded uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shrink-0"
              >
                <span>Launch Threat Reports Terminal</span>
                <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              </a>
            </div>

            {/* FIREWALL SECURITY & DATABASE EXPENDITURE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT SECURITY COLUMN (4/12 columns) */}
              <div className="lg:col-span-4 space-y-6">
                <AdminSecurity />
              </div>

              {/* RIGHT DATABASE COLUMN (8/12 columns) */}
              <div className="lg:col-span-8">
                <AdminPosts 
                  posts={posts} 
                  onStartEdit={setSelectedPostToEdit}
                  onBlockIpClick={handleBlockIp}
                />
              </div>

            </div>

            {/* METADATA EDITOR POPUP MODAL */}
            <AnimatePresence>
              {selectedPostToEdit && (
                <AdminEditModal 
                  post={selectedPostToEdit}
                  onClose={() => setSelectedPostToEdit(null)}
                  onSaved={handleSavedEdit}
                />
              )}
            </AnimatePresence>

          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AdminDashboard;
