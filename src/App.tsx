/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Post } from './types';
import Header from './components/Header';
import VenomCard from './components/VenomCard';
import NewVenomModal from './components/NewVenomModal';
import AdminPanel from './components/AdminPanel';
import InfoModals from './components/InfoModals';
import { 
  Terminal, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Lock, 
  Info, 
  Layers, 
  Filter, 
  Search,
  CheckCircle,
  TrendingUp,
  Flame,
  ArrowUp,
  ArrowDown,
  Heart,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getOperativeID } from './utils/crypto';

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'upvotes' | 'downvotes' | 'likes'>('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [opId, setOpId] = useState('');
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [activeInfoModal, setActiveInfoModal] = useState<'guidelines' | 'policies' | 'tips' | null>(null);

  // Load operative local metadata & listen to location routes
  useEffect(() => {
    setOpId(getOperativeID());

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch posts in real-time from Firestore
  useEffect(() => {
    setIsRefreshing(true);
    if (!db) {
      setDbConnected(false);
      setIsRefreshing(false);
      return;
    }

    // Query latest 100 posts to enable rich client-side search & ranking without index error constraints
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Post[];
        
        setPosts(fetchedPosts);
        setDbConnected(true);
        setIsRefreshing(false);
      },
      (error) => {
        setDbConnected(false);
        setIsRefreshing(false);
        handleFirestoreError(error, OperationType.GET, 'posts');
      }
    );

    return () => unsubscribe();
  }, []);

  const handlePostUpdate = (postId: string, updatedFields: Partial<Post>) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, ...updatedFields } : post
      )
    );
  };

  // Perform client-side category filtering, search queries, and ranking
  const filteredPosts = posts
    .filter((post) => {
      // 1. Category Filter
      if (activeCategory !== 'all' && post.category !== activeCategory) {
        return false;
      }
      // 2. Search Term Filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const titleMatch = post.title?.toLowerCase().includes(term);
        const contentMatch = post.content?.toLowerCase().includes(term);
        const categoryMatch = post.category?.toLowerCase().includes(term);
        const idMatch = post.id?.toLowerCase().includes(term);
        const hashMatch = post.encryptedHash?.toLowerCase().includes(term);
        return titleMatch || contentMatch || categoryMatch || idMatch || hashMatch;
      }
      return true;
    })
    .sort((a, b) => {
      // 3. Sorting Filters
      if (sortBy === 'upvotes') {
        const voteScoreA = (a.upvotesCount || 0) - (a.downvotesCount || 0);
        const voteScoreB = (b.upvotesCount || 0) - (b.downvotesCount || 0);
        if (voteScoreA !== voteScoreB) return voteScoreB - voteScoreA;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      }
      
      if (sortBy === 'downvotes') {
        const downVotesA = a.downvotesCount || 0;
        const downVotesB = b.downvotesCount || 0;
        if (downVotesA !== downVotesB) return downVotesB - downVotesA;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      }

      if (sortBy === 'likes') {
        const likesA = a.likesCount || 0;
        const likesB = b.likesCount || 0;
        if (likesA !== likesB) return likesB - likesA;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      }

      // Default: 'latest' -> Newest first
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (currentPath === '/admin') {
    return (
      <AdminPanel 
        posts={posts} 
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-300 antialiased flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Background aesthetic grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.01] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* Main Header Component */}
      <Header
        onNewPostClick={() => setShowNewPostModal(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
        totalVenomsCount={posts.length}
        onShowGuidelines={() => setActiveInfoModal('guidelines')}
        onShowPolicies={() => setActiveInfoModal('policies')}
        onShowTips={() => setActiveInfoModal('tips')}
      />

      {/* Subtle, beautiful notification notice */}
      <div className="bg-zinc-900/40 border-b border-zinc-900/60 py-2 px-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2 relative z-10">
        <Lock className="w-3.5 h-3.5 text-emerald-500/50 shrink-0" />
        <span>Venom secure hub active. Code-names and local tags are securely sealed. No trackers used.</span>
      </div>

      {/* Feed Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Side: Sorting and Feed Items (8 Columns on desktop) */}
        <div className="col-span-1 lg:col-span-8 space-y-4">
          
          {/* Feed Filter Panel & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-lg backdrop-blur-sm">
            
            {/* Sort controls */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'latest', label: 'LATEST', icon: Flame },
                { id: 'upvotes', label: 'TOP', icon: ArrowUp },
                { id: 'downvotes', label: 'VETOED', icon: ArrowDown },
                { id: 'likes', label: 'LIKED', icon: Heart },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSortBy(item.id as any)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                      sortBy === item.id
                        ? 'bg-zinc-800 text-emerald-400 border-zinc-700 font-semibold'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search posts or keywords..."
                className="w-full bg-zinc-900/40 border border-zinc-900 focus:border-emerald-500/30 rounded pl-8 pr-8 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 hover:text-rose-400 text-zinc-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active filter summary (if active) */}
          {(searchTerm || activeCategory !== 'all') && (
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 px-1">
              <span>ACTIVE FILTER:</span>
              <span className="text-zinc-400 font-bold uppercase bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                {activeCategory === 'all' ? 'ALL CHANNELS' : `#${activeCategory}`}
              </span>
              {searchTerm && (
                <>
                  <span className="text-zinc-700">/</span>
                  <span className="text-zinc-400 font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    "{searchTerm}"
                  </span>
                </>
              )}
              <span className="text-zinc-700">|</span>
              <span className="text-emerald-500 font-bold">{filteredPosts.length} posts found</span>
            </div>
          )}

          {/* Posts Feed container */}
          <div className="space-y-4">
            {isRefreshing ? (
              /* Loading screen skeleton */
              <div className="border border-zinc-900 bg-zinc-950/40 rounded-lg p-12 flex flex-col items-center justify-center gap-3">
                <Cpu className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
                  RESTORING FEED FLOW...
                </span>
              </div>
            ) : filteredPosts.length === 0 ? (
              /* Empty slate placeholder */
              <div className="border border-zinc-900 bg-zinc-950/40 rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4">
                <ShieldAlert className="w-8 h-8 text-zinc-700" />
                <div className="max-w-sm space-y-1">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    NO POSTS DETECTED
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    This channel is empty. Be the first to share your thoughts, beautiful polls, Q&As or images!
                  </p>
                </div>
                <button
                  onClick={() => setShowNewPostModal(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded transition-all cursor-pointer"
                >
                  + Create the First Post
                </button>
              </div>
            ) : (
              /* Real post elements rendered */
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <VenomCard
                    key={post.id}
                    post={post}
                    onPostUpdate={(fields) => handlePostUpdate(post.id, fields)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Security Manifesto & System Status Panels (4 Columns on desktop) */}
        <div className="col-span-1 lg:col-span-4 space-y-5">
          
          {/* Elegant Profile Card */}
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 font-bold text-sm uppercase">
                {opId ? opId.substring(0, 2) : 'VN'}
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-mono block">ANONYMOUS ACCOUNT</span>
                <span className="text-xs font-bold text-zinc-100 font-mono">User#{opId || 'PENDING'}</span>
              </div>
            </div>

            <div className="space-y-2 text-[11px] font-mono text-zinc-500">
              <div className="flex justify-between items-center">
                <span>DATABASE STATE:</span>
                {dbConnected === true ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> ONLINE
                  </span>
                ) : dbConnected === false ? (
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> ERROR
                  </span>
                ) : (
                  <span className="text-yellow-500 font-bold">CONNECTING...</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>CLIENT STATUS:</span>
                <span className="text-zinc-300">SECURED MODULAR</span>
              </div>
              <div className="flex justify-between items-center">
                <span>DATA STORAGE:</span>
                <span className="text-zinc-300">FIRESTORE E2E</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Inject New Post Modal */}
      <AnimatePresence>
        {showNewPostModal && (
          <NewVenomModal
            onClose={() => setShowNewPostModal(false)}
            onPostCreated={() => {
              // Automatically trigger visual refresh on creation
              handleRefresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* Info Modals for Guidelines, Policies and Tips */}
      <AnimatePresence>
        {activeInfoModal && (
          <InfoModals
            type={activeInfoModal}
            onClose={() => setActiveInfoModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Deep Footer signature */}
      <footer className="mt-auto border-t border-zinc-900/40 py-6 px-4 bg-zinc-950 text-center text-[10px] text-zinc-600 font-mono">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>VENOM NETWORK © 2026. ALL RIGHTS RESERVED.</span>
          <span className="text-emerald-500/40 hover:text-emerald-400 transition-colors flex items-center gap-1 uppercase text-[9px]">
            <Layers className="w-3 h-3" /> SECURITY STATUS: ACTIVE
          </span>
        </div>
      </footer>

    </div>
  );
}
