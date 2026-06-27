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
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Post } from './types';
import Header from './components/Header';
import VenomCard from './components/VenomCard';
import NewVenomModal from './components/NewVenomModal';
import AdminPanel from './components/AdminPanel';
import InfoModals from './components/InfoModals';
import { 
  Cpu, 
  Search,
  CheckCircle,
  Flame,
  ArrowUp,
  ArrowDown,
  Heart,
  X,
  SlidersHorizontal,
  Check,
  ArrowLeft,
  ShieldAlert
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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // States for shared single post
  const [sharedPost, setSharedPost] = useState<Post | null>(null);
  const [sharedPostLoading, setSharedPostLoading] = useState(false);

  // Parse path for single post sharing
  const postMatch = currentPath.match(/^\/post\/([a-zA-Z0-9_-]+)/) || currentPath.match(/^\/venom\/([a-zA-Z0-9_-]+)/);
  const sharedPostId = postMatch ? postMatch[1] : null;

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

  // Fetch shared post if active
  useEffect(() => {
    if (!sharedPostId) {
      setSharedPost(null);
      return;
    }

    // Try finding in existing posts
    const existing = posts.find(p => p.id === sharedPostId);
    if (existing) {
      setSharedPost(existing);
      return;
    }

    const fetchSharedPost = async () => {
      setSharedPostLoading(true);
      try {
        const postRef = doc(db, 'posts', sharedPostId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          setSharedPost({
            id: postSnap.id,
            ...postSnap.data()
          } as Post);
        } else {
          setSharedPost(null);
        }
      } catch (err) {
        console.error("Error fetching shared post:", err);
      } finally {
        setSharedPostLoading(false);
      }
    };

    fetchSharedPost();
  }, [sharedPostId, posts]);

  const handlePostUpdate = (postId: string, updatedFields: Partial<Post>) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, ...updatedFields } : post
      )
    );
    if (sharedPost && sharedPost.id === postId) {
      setSharedPost(prev => prev ? { ...prev, ...updatedFields } : null);
    }
  };

  const handleBackToHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Perform client-side category filtering, search queries, and ranking
  const filteredPosts = posts
    .filter((post) => {
      if (activeCategory !== 'all' && post.category !== activeCategory) {
        return false;
      }
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
      if (sortBy === 'upvotes') {
        const voteScoreA = (a.upvotesCount || 0) - (a.downvotesCount || 0);
        const voteScoreB = (b.upvotesCount || 0) - (b.downvotesCount || 0);
        if (voteScoreA !== voteScoreB) return voteScoreB - voteScoreA;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
      
      if (sortBy === 'downvotes') {
        const downVotesA = a.downvotesCount || 0;
        const downVotesB = b.downvotesCount || 0;
        if (downVotesA !== downVotesB) return downVotesB - downVotesA;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }

      if (sortBy === 'likes') {
        const likesA = a.likesCount || 0;
        const likesB = b.likesCount || 0;
        if (likesA !== likesB) return likesB - likesA;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }

      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

  // Admin route check
  if (currentPath === '/admin') {
    return (
      <AdminPanel 
        posts={posts} 
        onNavigateHome={handleBackToHome} 
      />
    );
  }

  // Render shared single post page
  if (sharedPostId) {
    return (
      <div className="min-h-screen bg-zinc-950 font-sans text-zinc-300 antialiased flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
        <Header
          onNewPostClick={() => {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
            setTimeout(() => setShowNewPostModal(true), 100);
          }}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onShowGuidelines={() => setActiveInfoModal('guidelines')}
          onShowPolicies={() => setActiveInfoModal('policies')}
          onShowTips={() => setActiveInfoModal('tips')}
        />

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6 relative z-10">
          
          <button 
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-900 bg-zinc-900/20 px-3.5 py-1.5 rounded-md hover:bg-zinc-950 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Homepage</span>
          </button>

          {sharedPostLoading ? (
            <div className="border border-zinc-900 bg-zinc-950/40 rounded-lg p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                Loading Shared Venom...
              </span>
            </div>
          ) : !sharedPost ? (
            <div className="border border-zinc-900 bg-zinc-950/40 rounded-lg p-16 text-center flex flex-col items-center justify-center gap-4">
              <ShieldAlert className="w-8 h-8 text-zinc-700" />
              <div className="max-w-sm space-y-2">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  VENOM NOT FOUND
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  This post does not exist or has been removed.
                </p>
              </div>
              <button
                onClick={handleBackToHome}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded transition-all cursor-pointer"
              >
                Back to Feed
              </button>
            </div>
          ) : (
            <VenomCard
              post={sharedPost}
              onPostUpdate={(fields) => handlePostUpdate(sharedPost.id, fields)}
            />
          )}

        </main>

        <footer className="mt-auto border-t border-zinc-900/40 py-6 px-4 bg-zinc-950 text-center text-[10px] text-zinc-600 font-mono">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center">
              <button onClick={() => setActiveInfoModal('guidelines')} className="hover:text-zinc-400 transition-colors">Guidelines</button>
              <button onClick={() => setActiveInfoModal('policies')} className="hover:text-zinc-400 transition-colors">Policies</button>
              <button onClick={() => setActiveInfoModal('tips')} className="hover:text-zinc-400 transition-colors">Pro Tips</button>
            </div>
            <span>VENOM FROM META</span>
          </div>
        </footer>

        <AnimatePresence>
          {showNewPostModal && (
            <NewVenomModal
              onClose={() => setShowNewPostModal(false)}
              onPostCreated={() => handleRefresh()}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeInfoModal && (
            <InfoModals
              type={activeInfoModal}
              onClose={() => setActiveInfoModal(null)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render normal feed view
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-300 antialiased flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Background aesthetic grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.01] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* Main Header Component */}
      <Header
        onNewPostClick={() => setShowNewPostModal(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onShowGuidelines={() => setActiveInfoModal('guidelines')}
        onShowPolicies={() => setActiveInfoModal('policies')}
        onShowTips={() => setActiveInfoModal('tips')}
      />

      {/* Centered Instagram-style Feed Layout */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-5 relative z-10">
        
        {/* Feed Filter Panel & Search */}
        <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-3.5 backdrop-blur-md">
          
          {/* Sorting Row */}
          <div className="flex items-center justify-between border-b border-zinc-900/50 pb-2">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Sort By</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'latest', label: 'Latest' },
                { id: 'upvotes', label: 'Top' },
                { id: 'downvotes', label: 'Vetoed' },
                { id: 'likes', label: 'Liked' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSortBy(item.id as any)}
                  className={`px-3 py-1 rounded text-[10px] font-bold font-mono uppercase transition-colors cursor-pointer ${
                    sortBy === item.id
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search and Channel Filter Row */}
          <div className="flex gap-2 items-center">
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500/30 rounded-md pl-9 pr-8 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 hover:text-rose-400 text-zinc-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown Button */}
            <div className="relative">
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-3 py-2 border border-zinc-900 bg-zinc-900/60 hover:bg-zinc-950 text-zinc-300 rounded-md text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeCategory === 'all' ? 'All Channels' : `#${activeCategory}`}</span>
              </button>
              
              {showFilterDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowFilterDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-900 rounded-md shadow-2xl z-40 py-1 text-xs font-mono">
                    {[
                      { id: 'all', label: 'All Channels' },
                      { id: 'general', label: '#general' },
                      { id: 'tech', label: '#tech' },
                      { id: 'design', label: '#design' },
                      { id: 'gaming', label: '#gaming' },
                      { id: 'lifestyle', label: '#lifestyle' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-zinc-900 transition-colors flex items-center justify-between cursor-pointer ${
                          activeCategory === cat.id ? 'text-emerald-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <span>{cat.label}</span>
                        {activeCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Active filter summary (if active) */}
        {(searchTerm || activeCategory !== 'all') && (
          <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 px-1 justify-center">
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
            <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl p-16 flex flex-col items-center justify-center gap-3">
              <Cpu className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
                Updating feed...
              </span>
            </div>
          ) : filteredPosts.length === 0 ? (
            /* Empty slate placeholder */
            <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl p-16 text-center flex flex-col items-center justify-center gap-4">
              <ShieldAlert className="w-8 h-8 text-zinc-700" />
              <div className="max-w-sm space-y-1">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  No Posts Detected
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  This channel is currently empty.
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
            <div className="space-y-5">
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
      </main>

      {/* Inject New Post Modal */}
      <AnimatePresence>
        {showNewPostModal && (
          <NewVenomModal
            onClose={() => setShowNewPostModal(false)}
            onPostCreated={() => {
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

      {/* Sleek, professional official footer */}
      <footer className="mt-auto border-t border-zinc-900/40 py-6 px-4 bg-zinc-950 text-center text-[10px] text-zinc-600 font-mono">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center">
            <button onClick={() => setActiveInfoModal('guidelines')} className="hover:text-zinc-400 transition-colors cursor-pointer">Guidelines</button>
            <button onClick={() => setActiveInfoModal('policies')} className="hover:text-zinc-400 transition-colors cursor-pointer">Policies</button>
            <button onClick={() => setActiveInfoModal('tips')} className="hover:text-zinc-400 transition-colors cursor-pointer">Pro Tips</button>
          </div>
          <span>VENOM FROM META</span>
        </div>
      </footer>

    </div>
  );
}
