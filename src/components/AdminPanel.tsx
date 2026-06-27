/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { Post } from '../types';
import { 
  ShieldAlert, 
  Lock, 
  Trash2, 
  Edit3, 
  Eye, 
  X, 
  Plus, 
  Activity, 
  Database, 
  Users, 
  Cpu, 
  Key,
  Unlock,
  CornerDownRight,
  RefreshCw,
  Search,
  CheckCircle,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  posts: Post[];
  onNavigateHome: () => void;
}

export default function AdminPanel({ posts, onNavigateHome }: AdminPanelProps) {
  // Authentication states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('venom_admin_auth') === 'true';
  });
  const [loginError, setLoginError] = useState('');

  // Firewall blocked IPs states
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [newIpToBlock, setNewIpToBlock] = useState('');
  const [isFirewallLoading, setIsFirewallLoading] = useState(false);

  // Post Manager edit state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLikes, setEditLikes] = useState<string | number>(0);
  const [editUpvotes, setEditUpvotes] = useState<string | number>(0);
  const [editDownvotes, setEditDownvotes] = useState<string | number>(0);
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Search/Filter state for admin console
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  // Real observer count based on actual unique IP addresses that have ever posted + current observer
  const uniqueIps = Array.from(new Set(posts.map(p => p.postedFromIp).filter(Boolean)));
  const liveObservers = Math.max(1, uniqueIps.length);

  // Analytics Dashboard States
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ label: string; category: string; description: string } | null>(null);
  const [graphTime, setGraphTime] = useState(0);

  // Obsidian Force-Graph Animation loop
  useEffect(() => {
    if (!isAuthenticated) return;
    let animId: number;
    const run = () => {
      setGraphTime(t => t + 0.005);
      animId = requestAnimationFrame(run);
    };
    animId = requestAnimationFrame(run);
    return () => cancelAnimationFrame(animId);
  }, [isAuthenticated]);

  // Fetch Blocked IPs list in real-time
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsFirewallLoading(true);
    const blockedRef = collection(db, 'blockedIps');
    
    const unsubscribe = onSnapshot(
      blockedRef,
      (snapshot) => {
        const ips = snapshot.docs.map(d => d.id);
        setBlockedIps(ips);
        setIsFirewallLoading(false);
      },
      (error) => {
        setIsFirewallLoading(false);
        console.error('Failed to fetch blocked IPs:', error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'theakshatpopat' && password === 'Aprt9311') {
      setIsAuthenticated(true);
      sessionStorage.setItem('venom_admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid Administrator credentials. Security breach log generated.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('venom_admin_auth');
  };

  // Block a new IP address
  const handleBlockIpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = newIpToBlock.trim();
    if (!cleanIp) return;

    // Basic IP validation check (supports both IPv4 and simple IPv6 format)
    if (!/^[a-fA-F0-9.:]+$/.test(cleanIp)) {
      alert('Invalid IP Address format.');
      return;
    }

    try {
      const blockRef = doc(db, 'blockedIps', cleanIp);
      await setDoc(blockRef, {
        blockedAt: new Date().toISOString(),
        reason: 'Community Guidelines Violation'
      });
      setNewIpToBlock('');
    } catch (err) {
      console.error('Failed to block IP:', err);
      alert('Firewall configuration error. Ensure Firestore rules are deployed.');
    }
  };

  // Unblock an IP address
  const handleUnblockIp = async (ip: string) => {
    try {
      const blockRef = doc(db, 'blockedIps', ip);
      await deleteDoc(blockRef);
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    }
  };

  // Delete a post
  const handleDeletePost = async (postId: string) => {
    if (!confirm(`Are you sure you want to permanently purge post ID: ${postId}? This action is irreversible.`)) {
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);
    } catch (err) {
      console.error('Failed to purge post:', err);
      alert('Failed to delete post.');
    }
  };

  // Start Editing a post
  const handleStartEdit = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setEditCategory(post.category || 'general');
    setEditLikes(post.likesCount || 0);
    setEditUpvotes(post.upvotesCount || 0);
    setEditDownvotes(post.downvotesCount || 0);
  };

  // Save changes to editing post
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    setIsSavingPost(true);
    try {
      const postRef = doc(db, 'posts', editingPost.id);
      await updateDoc(postRef, {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        likesCount: Number(editLikes),
        upvotesCount: Number(editUpvotes),
        downvotesCount: Number(editDownvotes)
      });
      setEditingPost(null);
    } catch (err) {
      console.error('Failed to save post details:', err);
      alert('Failed to save post metadata.');
    } finally {
      setIsSavingPost(false);
    }
  };

  // Statistics Computations
  const totalVenomsCount = posts.length;
  
  const totalImagesCount = posts.filter(p => p.type === 'image' || p.imageUrl).length;
  
  // Real average interactions computation
  const totalLikes = posts.reduce((acc, p) => acc + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((acc, p) => acc + (p.commentsCount || 0), 0);
  const totalUpvotes = posts.reduce((acc, p) => acc + (p.upvotesCount || 0), 0);
  const totalInteractions = totalLikes + totalComments + totalUpvotes;
  const averageEngagement = posts.length > 0 
    ? (totalInteractions / posts.length).toFixed(1)
    : '0.0';

  // Calculate simulated storage footprint based on base64 and string payloads
  const calculatedStorageInKB = posts.reduce((acc, p) => {
    let payloadSize = (p.title?.length || 0) + (p.content?.length || 0);
    if (p.imageUrl) {
      // Base64 approximation: 1 character = 1 byte (roughly)
      payloadSize += p.imageUrl.length;
    }
    return acc + (payloadSize / 1024);
  }, 0);
  const displayStorage = calculatedStorageInKB > 1024 
    ? `${(calculatedStorageInKB / 1024).toFixed(2)} MB`
    : `${calculatedStorageInKB.toFixed(1)} KB`;

  // Search filtered posts
  const filteredAdminPosts = posts.filter((post) => {
    if (!adminSearchTerm.trim()) return true;
    const term = adminSearchTerm.toLowerCase();
    return (
      post.id?.toLowerCase().includes(term) ||
      post.title?.toLowerCase().includes(term) ||
      post.content?.toLowerCase().includes(term) ||
      post.postedFromIp?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 font-mono text-zinc-300 antialiased flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Visual cyber mesh grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] z-0" />

      {/* Cyberpunk style admin header banner */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 bg-emerald-950/30 border border-emerald-500/40 rounded overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Lock className="w-5 h-5 text-emerald-400" />
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-widest text-emerald-400">
                  VENOM CONTROL CONSOLE
                </h1>
                <span className="text-[9px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-1 rounded uppercase tracking-widest animate-pulse">
                  SECURE MODE
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                System configuration / moderator clearance authority.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-xs transition-all uppercase rounded font-bold cursor-pointer"
            >
              Exit Console
            </button>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 text-xs transition-all uppercase rounded font-bold cursor-pointer"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* LOGIN ROUTE */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex items-center justify-center p-4 relative z-10"
          >
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6 max-w-sm w-full shadow-[0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
              
              <div className="flex flex-col items-center gap-2 text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center mb-1 text-emerald-500">
                  <Key className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-100">MODERATOR GATEWAY</h2>
                <p className="text-[10px] text-zinc-500">Sign in with system administrator keys to unlock firewall controls.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 text-[10px] p-2.5 rounded leading-relaxed">
                    {loginError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-zinc-500 block font-bold">SYSTEM IDENTITY (ADMIN)</label>
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
                  <label className="text-[9px] uppercase text-zinc-500 block font-bold">CRYPTOGRAPHIC KEY (PASSWORD)</label>
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
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded transition-all uppercase mt-6 cursor-pointer tracking-wider"
                >
                  INITIALIZE CLEARANCE
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* AUTHENTICATED DASHBOARD ROUTE */
          <motion.main 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6 relative z-10"
          >
            {/* STATS BENTO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 text-emerald-500/10">
                  <Activity className="w-12 h-12" />
                </div>
                <span className="text-[9px] uppercase text-zinc-500 block font-bold">TOTAL FIRESTORE VENOMS</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block tracking-tight">
                  {totalVenomsCount}
                </span>
                <span className="text-[9px] text-zinc-500 mt-1.5 block">Active database documents</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 text-emerald-500/10">
                  <Users className="w-12 h-12 text-emerald-500/10" />
                </div>
                <span className="text-[9px] uppercase text-zinc-500 block font-bold">LIVE SITE OBSERVERS</span>
                <span className="text-2xl font-black text-zinc-100 mt-1 block tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
                  {liveObservers}
                </span>
                <span className="text-[9px] text-zinc-500 mt-1.5 block">Unique poster IPs connected</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 text-emerald-500/10">
                  <Cpu className="w-12 h-12 text-emerald-500/10" />
                </div>
                <span className="text-[9px] uppercase text-zinc-500 block font-bold">AVG ENGAGEMENT RATIO</span>
                <span className="text-2xl font-black text-zinc-200 mt-1 block tracking-tight">
                  {averageEngagement}
                </span>
                <span className="text-[9px] text-zinc-500 mt-1.5 block">Interactions per Venom</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 text-emerald-500/10">
                  <Database className="w-12 h-12" />
                </div>
                <span className="text-[9px] uppercase text-zinc-500 block font-bold">TOTAL STORAGE FOOTPRINT</span>
                <span className="text-2xl font-black text-zinc-200 mt-1 block tracking-tight">
                  {displayStorage}
                </span>
                <span className="text-[9px] text-zinc-500 mt-1.5 block">Payload size approximation</span>
              </div>

            </div>

            {/* OBSIDIAN GRAPH & INTERACTIVE PRODUCTIVITY WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-900/15 border border-zinc-900 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              
              {/* LEFT COMPONENT: OBSIDIAN NETWORK GRAPH VIEW (5 Columns) */}
              <div className="lg:col-span-5 bg-zinc-950/80 border border-zinc-900 rounded-lg p-4 relative flex flex-col justify-between min-h-[360px] overflow-hidden">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Obsidian Network Graph</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Planetary orbital clusters showing active threads grouped around category hubs. Hover nodes to read headers.
                  </p>
                </div>

                {/* SVG Live Render */}
                <div className="relative flex items-center justify-center my-2 h-[220px]">
                  <svg viewBox="0 0 400 320" className="w-full h-full max-w-sm">
                    <defs>
                      <filter id="glow-hub" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Central Core Connection Line Grid */}
                    <circle cx={200} cy={160} r={105} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="2,5" />
                    <circle cx={200} cy={160} r={40} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="3,3" />

                    {(() => {
                      // Define categories & clustering geometry
                      const categoriesList = [
                        { id: 'general', label: '#general', color: '#10b981', angle: 0 },
                        { id: 'tech', label: '#tech', color: '#3b82f6', angle: 72 },
                        { id: 'design', label: '#design', color: '#ec4899', angle: 144 },
                        { id: 'gaming', label: '#gaming', color: '#f59e0b', angle: 216 },
                        { id: 'lifestyle', label: '#lifestyle', color: '#a855f7', angle: 288 },
                      ];

                      // Group the latest posts by category for cluster links
                      const postsByCat: { [key: string]: Post[] } = {};
                      categoriesList.forEach(c => { postsByCat[c.id] = []; });
                      posts.slice(0, 18).forEach(p => {
                        if (postsByCat[p.category]) postsByCat[p.category].push(p);
                        else postsByCat['general'].push(p);
                      });

                      const renderedLinks: React.ReactNode[] = [];
                      const renderedNodes: React.ReactNode[] = [];

                      categoriesList.forEach(cat => {
                        // Calculate orbital path for channel hubs
                        const hubAngle = (cat.angle * Math.PI) / 180 + graphTime * 0.3;
                        const hubX = 200 + Math.cos(hubAngle) * 65;
                        const hubY = 160 + Math.sin(hubAngle) * 65;

                        // Central core links
                        renderedLinks.push(
                          <line 
                            key={`core-link-${cat.id}`}
                            x1={200} y1={160} x2={hubX} y2={hubY}
                            stroke="#27272a" strokeWidth={0.8} strokeDasharray="3,3"
                          />
                        );

                        // Category posts cluster
                        const clusterPosts = postsByCat[cat.id];
                        const postCount = clusterPosts.length;

                        clusterPosts.forEach((postItem, idx) => {
                          const pAngle = (idx * (360 / Math.max(1, postCount)) * Math.PI) / 180 + graphTime * 0.6;
                          const pX = hubX + Math.cos(pAngle) * 25;
                          const pY = hubY + Math.sin(pAngle) * 25;

                          // Linking post node to category hub node
                          renderedLinks.push(
                            <line
                              key={`post-link-${postItem.id}`}
                              x1={hubX} y1={hubY} x2={pX} y2={pY}
                              stroke={cat.color} strokeWidth={0.5} opacity={0.3}
                            />
                          );

                          // Post nodes
                          renderedNodes.push(
                            <g key={`post-g-${postItem.id}`}>
                              <circle
                                cx={pX} cy={pY} r={3}
                                fill="#52525b"
                                className="hover:fill-emerald-400 cursor-pointer transition-colors duration-150"
                                onMouseEnter={() => setHoveredNode({
                                  label: postItem.title || 'Anonymous Venom',
                                  category: cat.label,
                                  description: postItem.content?.substring(0, 80) + '...'
                                })}
                                onMouseLeave={() => setHoveredNode(null)}
                              />
                            </g>
                          );
                        });

                        // Drawing category hub nodes on top
                        renderedNodes.push(
                          <g key={`hub-g-${cat.id}`}>
                            <circle
                              cx={hubX} cy={hubY} r={5.5}
                              fill={cat.color}
                              className="cursor-pointer"
                              style={{ filter: 'url(#glow-hub)' }}
                              onMouseEnter={() => setHoveredNode({
                                label: cat.label,
                                category: 'Active Channel Hub',
                                description: `${postCount} active database threads deployed under this node.`
                              })}
                              onMouseLeave={() => setHoveredNode(null)}
                            />
                          </g>
                        );
                      });

                      return (
                        <>
                          {renderedLinks}
                          {renderedNodes}
                        </>
                      );
                    })()}

                    {/* Central Core Sphere */}
                    <circle cx={200} cy={160} r={4} fill="#ffffff" stroke="#10b981" strokeWidth={1} />
                  </svg>

                  {/* Tooltip Popup overlay */}
                  <AnimatePresence>
                    {hoveredNode && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-2 left-2 right-2 bg-zinc-950 border border-zinc-900 rounded p-2.5 text-[10px] font-mono leading-relaxed shadow-2xl pointer-events-none z-30"
                      >
                        <div className="flex items-center justify-between text-zinc-500 mb-0.5 uppercase text-[8px] font-bold">
                          <span>{hoveredNode.category}</span>
                          <span className="text-emerald-400">GRAPH DEPLOYMENT</span>
                        </div>
                        <div className="text-zinc-200 font-bold mb-1 truncate">{hoveredNode.label}</div>
                        <div className="text-zinc-500 leading-normal">{hoveredNode.description}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-600 border-t border-zinc-900/60 pt-2 mt-1">
                  <span>SYSTEM FEEDBACK: STABLE</span>
                  <span>100% DECENTRALIZED COHESION</span>
                </div>
              </div>

              {/* RIGHT COMPONENT: DYNAMIC PRODUCTIVITY LINE CHART (7 Columns) */}
              <div className="lg:col-span-7 bg-zinc-950/80 border border-zinc-900 rounded-lg p-4 relative flex flex-col justify-between min-h-[360px]">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Productivity & Activity Index</span>
                    </h3>
                    <span className="text-[9px] bg-zinc-900 border border-zinc-850 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">
                      24-Hour Cycle
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                    Decentralized system postings throughput mapped dynamically to actual user database transactions.
                  </p>
                </div>

                {/* SVG Graph Generation */}
                <div className="relative flex-1 flex items-center justify-center my-3 min-h-[200px]">
                  {(() => {
                    // Compute chart parameters dynamically based on actual Firestore posts count
                    const hours = ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00'];
                    const linePoints = hours.map((hourStr) => {
                      const hourNum = parseInt(hourStr.split(':')[0]);
                      const matchedPosts = posts.filter(p => {
                        if (!p.createdAt) return false;
                        let date: Date;
                        if (p.createdAt.toDate) {
                          date = p.createdAt.toDate();
                        } else if (p.createdAt instanceof Date) {
                          date = p.createdAt;
                        } else {
                          date = new Date(p.createdAt);
                        }
                        const postHour = date.getHours();
                        return postHour >= hourNum - 2 && postHour < hourNum + 2;
                      });

                      const value = matchedPosts.length;
                      const engagement = matchedPosts.reduce((acc, p) => acc + (p.likesCount || 0) + (p.commentsCount || 0) + (p.upvotesCount || 0), 0);
                      const active = Array.from(new Set(matchedPosts.map(p => p.postedFromIp).filter(Boolean))).length;

                      return {
                        hour: hourStr,
                        value,
                        engagement,
                        active: Math.max(1, active)
                      };
                    });

                    const width = 450;
                    const height = 180;
                    const paddingLeft = 40;
                    const paddingRight = 20;
                    const paddingTop = 20;
                    const paddingBottom = 30;

                    const plotWidth = width - paddingLeft - paddingRight;
                    const plotHeight = height - paddingTop - paddingBottom;

                    const maxVal = Math.max(...linePoints.map(p => p.value));
                    const maxAxisVal = maxVal > 0 ? maxVal * 1.2 : 50;

                    const getPlotX = (index: number) => paddingLeft + index * (plotWidth / (linePoints.length - 1));
                    const getPlotY = (val: number) => paddingLeft + plotHeight - (val / maxAxisVal) * plotHeight - paddingBottom;

                    // Compute smooth curve path
                    const pathCoordinates = linePoints.map((p, idx) => ({
                      x: getPlotX(idx),
                      y: getPlotY(p.value)
                    }));

                    let pathD = '';
                    if (pathCoordinates.length > 0) {
                      pathD = `M ${pathCoordinates[0].x} ${pathCoordinates[0].y}`;
                      for (let i = 1; i < pathCoordinates.length; i++) {
                        const prev = pathCoordinates[i - 1];
                        const curr = pathCoordinates[i];
                        // Bezier smoothing coordinates
                        const cpX1 = prev.x + (curr.x - prev.x) / 2;
                        const cpY1 = prev.y;
                        const cpX2 = prev.x + (curr.x - prev.x) / 2;
                        const cpY2 = curr.y;
                        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
                      }
                    }

                    const areaD = pathCoordinates.length > 0
                      ? `${pathD} L ${pathCoordinates[pathCoordinates.length - 1].x} ${height - paddingBottom} L ${pathCoordinates[0].x} ${height - paddingBottom} Z`
                      : '';

                    return (
                      <div className="w-full h-full flex flex-col justify-between">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="glow-line" x="-10%" y="-10%" width="120%" height="120%">
                              <feGaussianBlur stdDeviation="2" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          {/* Grid Background Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                            const y = paddingTop + plotHeight * r;
                            const gridVal = Math.round(maxAxisVal * (1 - r));
                            return (
                              <g key={`grid-line-${i}`}>
                                <line 
                                  x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} 
                                  stroke="#18181b" strokeWidth={1} 
                                />
                                <text 
                                  x={paddingLeft - 8} y={y + 3} 
                                  fill="#52525b" fontSize="8" fontFamily="monospace" textAnchor="end"
                                >
                                  {gridVal}
                                </text>
                              </g>
                            );
                          })}

                          {/* SVG Area Under Path */}
                          {areaD && <path d={areaD} fill="url(#areaGrad)" />}

                          {/* Path Line */}
                          {pathD && (
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="#10b981" 
                              strokeWidth={2} 
                              style={{ filter: 'url(#glow-line)' }}
                            />
                          )}

                          {/* Hover Guide Line */}
                          {hoveredDataIndex !== null && (
                            <line
                              x1={getPlotX(hoveredDataIndex)}
                              y1={paddingTop}
                              x2={getPlotX(hoveredDataIndex)}
                              y2={height - paddingBottom}
                              stroke="#27272a"
                              strokeWidth={1}
                              strokeDasharray="2,2"
                            />
                          )}

                          {/* Plot Data Dots */}
                          {linePoints.map((point, idx) => {
                            const cx = getPlotX(idx);
                            const cy = getPlotY(point.value);
                            const isHovered = hoveredDataIndex === idx;

                            return (
                              <g key={`point-circle-${idx}`}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isHovered ? 6 : 3.5}
                                  fill={isHovered ? '#10b981' : '#18181b'}
                                  stroke="#10b981"
                                  strokeWidth={1.5}
                                  className="cursor-pointer transition-all duration-150"
                                  onMouseEnter={() => setHoveredDataIndex(idx)}
                                  onMouseLeave={() => setHoveredDataIndex(null)}
                                />
                                <text
                                  x={cx}
                                  y={height - paddingBottom + 12}
                                  fill={isHovered ? '#10b981' : '#52525b'}
                                  fontSize="8"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  {point.hour}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive Tooltip Overlay */}
                        <div className="h-[44px] bg-zinc-900/40 border border-zinc-900/60 p-2 rounded flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
                          {hoveredDataIndex !== null ? (
                            <>
                              <div>
                                <span className="text-zinc-600 uppercase text-[8px] block font-bold">INTERVAL</span>
                                <span className="text-zinc-200 font-bold">{linePoints[hoveredDataIndex].hour} EST</span>
                              </div>
                              <div className="text-center">
                                <span className="text-zinc-600 uppercase text-[8px] block font-bold">POSTS INGESTED</span>
                                <span className="text-emerald-400 font-bold">{linePoints[hoveredDataIndex].value} items</span>
                              </div>
                              <div className="text-center">
                                <span className="text-zinc-600 uppercase text-[8px] block font-bold">TOTAL ENGAGEMENTS</span>
                                <span className="text-zinc-200 font-bold">{linePoints[hoveredDataIndex].engagement} hits</span>
                              </div>
                              <div className="text-right">
                                <span className="text-zinc-600 uppercase text-[8px] block font-bold">ACTIVE ROUTING NODES</span>
                                <span className="text-emerald-400 font-bold">{linePoints[hoveredDataIndex].active}</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center w-full text-zinc-500 italic">
                              Hover any data node on the grid chart to capture active interval metrics.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-600 border-t border-zinc-900/60 pt-2">
                  <span>ANALYSIS SCOPE: CONTINUOUS</span>
                  <span>UTC TIME STAMP ENFORCED</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: LIVE IP FIREWALL SECURITY (4 Columns) */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 shadow-xl">
                  <h3 className="text-xs font-bold text-emerald-400 border-b border-zinc-900 pb-2.5 mb-4 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-500/70" />
                    <span>IP Firewall Rule Set</span>
                  </h3>

                  {/* Block IP Form */}
                  <form onSubmit={handleBlockIpSubmit} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newIpToBlock}
                      onChange={(e) => setNewIpToBlock(e.target.value)}
                      placeholder="IP (e.g. 192.168.1.1)"
                      required
                      className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-950/40 text-rose-400 text-xs font-bold rounded transition-colors uppercase"
                    >
                      Suspend
                    </button>
                  </form>

                  {/* Firewall List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                    <span className="text-[9px] uppercase text-zinc-500 block font-bold mb-2">BLACKLISTED IP ADDRESSES ({blockedIps.length})</span>
                    
                    {isFirewallLoading ? (
                      <div className="text-[10px] text-zinc-600 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                        <span>Querying firewall configuration...</span>
                      </div>
                    ) : blockedIps.length === 0 ? (
                      <div className="text-[10px] text-zinc-600 italic bg-zinc-900/20 p-3 border border-zinc-900 rounded text-center">
                        Firewall is empty. No device bans issued.
                      </div>
                    ) : (
                      blockedIps.map((ip) => (
                        <div 
                          key={ip} 
                          className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-900 rounded font-mono text-[11px]"
                        >
                          <div className="flex flex-col">
                            <span className="text-zinc-200 font-bold">{ip}</span>
                            <span className="text-[8px] text-rose-500/80 mt-0.5 flex items-center gap-1">
                              <ShieldAlert className="w-2.5 h-2.5" /> BLOCKED DEPLOYMENT
                            </span>
                          </div>
                          <button
                            onClick={() => handleUnblockIp(ip)}
                            className="p-1 hover:bg-zinc-850 border border-zinc-850 hover:border-emerald-500/30 text-zinc-500 hover:text-emerald-400 rounded transition-colors cursor-pointer"
                            title="Unban IP Address"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-zinc-900/10 border border-zinc-900 rounded text-[9px] text-zinc-500 leading-relaxed font-sans">
                    <strong className="text-zinc-400 block font-mono mb-0.5 uppercase text-[8px] tracking-wide">Automatic Enforcement:</strong>
                    Any post attempted from blocked IPs will trigger immediate Firestore security rule rejections.
                  </div>

                </div>

              </div>

              {/* RIGHT COLUMN: MAIN POST MANAGEMENT & DETAILS CONSOLE (8 Columns) */}
              <div className="lg:col-span-8 space-y-4">
                
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 shadow-xl">
                  
                  {/* Title & Search bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3 mb-4">
                    <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500/70" />
                      <span>Venom Core Database Explorer</span>
                    </h3>
                    
                    {/* Search bar inside admin console */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        value={adminSearchTerm}
                        onChange={(e) => setAdminSearchTerm(e.target.value)}
                        placeholder="Search IP, Post ID, keywords..."
                        className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded pl-7 pr-3 py-1 text-xs text-zinc-300 focus:outline-none placeholder-zinc-750 transition-colors"
                      />
                    </div>
                  </div>

                  {/* List of postings */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
                    {filteredAdminPosts.length === 0 ? (
                      <div className="text-center py-10 text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded">
                        No matches found for "{adminSearchTerm}". Expand your queries.
                      </div>
                    ) : (
                      filteredAdminPosts.map((post) => (
                        <div 
                          key={post.id} 
                          className="p-3 bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-900 hover:border-zinc-850 rounded-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                        >
                          <div className="space-y-1 flex-1">
                            {/* Category & ID Bar */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                              <span className="text-emerald-400 font-bold uppercase bg-emerald-950/20 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] tracking-widest">
                                #{post.category}
                              </span>
                              <span>•</span>
                              <span className="font-bold text-zinc-400">ID: {post.id}</span>
                              <span>•</span>
                              <span className="text-emerald-500/80">HASH: {post.encryptedHash?.substring(0, 12)}</span>
                            </div>

                            {/* Title / Preview */}
                            <div className="text-zinc-200 font-bold leading-relaxed text-xs">
                              {post.title || post.content?.substring(0, 50)}
                            </div>

                            {/* Subtitle / IP / Device tracking */}
                            <div className="text-[10px] text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-emerald-500 font-semibold bg-zinc-900 px-1 rounded">IP: {post.postedFromIp || 'Unknown'}</span>
                              <span className="text-zinc-600">|</span>
                              <span className="text-zinc-400">{post.postedFromDevice || 'Unknown Device'}</span>
                              {post.postedFromIp && (
                                <button 
                                  onClick={() => {
                                    setNewIpToBlock(post.postedFromIp!);
                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                  }}
                                  className="text-[9px] text-rose-500 hover:text-rose-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                >
                                  (Block IP)
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Admin Actions */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                              onClick={() => handleStartEdit(post)}
                              className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                              title="Edit post parameters"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 bg-rose-950/10 border border-rose-950/40 hover:border-rose-500 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                              title="Delete venom post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Purge</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>

            </div>

            {/* EDIT DIALOG POPUP */}
            <AnimatePresence>
              {editingPost && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-950 border border-zinc-900 rounded-lg max-w-lg w-full text-zinc-300 shadow-2xl p-6 relative font-mono text-xs"
                  >
                    <button
                      onClick={() => setEditingPost(null)}
                      className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-250 rounded transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2.5 text-emerald-400 border-b border-zinc-900 pb-3 mb-4">
                      <Edit3 className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">EDIT VENOM DOCUMENT</h3>
                    </div>

                    <form onSubmit={handleSavePost} className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-zinc-900/30 p-2.5 rounded border border-zinc-900/80 mb-2">
                        <div>
                          <span className="text-zinc-500">POST ID:</span> <span className="text-zinc-300">{editingPost.id}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">CREATOR IP:</span> <span className="text-emerald-500 font-semibold">{editingPost.postedFromIp || 'None'}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-zinc-500 block font-bold">TITLE</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none placeholder-zinc-700 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-zinc-500 block font-bold">CONTENT BODY</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none placeholder-zinc-700 transition-colors font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold">CATEGORY CHANNEL</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none transition-colors"
                          >
                            <option value="general">general</option>
                            <option value="tech">tech</option>
                            <option value="design">design</option>
                            <option value="gaming">gaming</option>
                            <option value="lifestyle">lifestyle</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold">LIKES COUNT</label>
                          <input
                            type="number"
                            value={editLikes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditLikes(val === '' ? '' : Number(val));
                            }}
                            className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold">UPVOTES</label>
                          <input
                            type="number"
                            value={editUpvotes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditUpvotes(val === '' ? '' : Number(val));
                            }}
                            className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold">DOWNVOTES</label>
                          <input
                            type="number"
                            value={editDownvotes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditDownvotes(val === '' ? '' : Number(val));
                            }}
                            className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 mt-4 border-t border-zinc-900">
                        <button
                          type="button"
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs rounded transition-colors uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingPost}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded transition-all uppercase flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingPost ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Commit Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
