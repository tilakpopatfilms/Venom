/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Post } from '../../types';
import { Database, Search, Edit3, Trash2, ShieldAlert, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';

interface AdminPostsProps {
  posts: Post[];
  onStartEdit: (post: Post) => void;
  onBlockIpClick?: (ip: string, imei?: string) => void;
}

export const AdminPosts: React.FC<AdminPostsProps> = ({ posts, onStartEdit, onBlockIpClick }) => {
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [postIdToConfirmDelete, setPostIdToConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Filter posts based on search term (ID, Title, Category, Content, or IP)
  const filteredAdminPosts = posts.filter((post) => {
    const term = adminSearchTerm.trim().toLowerCase();
    if (!term) return true;
    
    return (
      post.id?.toLowerCase().includes(term) ||
      post.title?.toLowerCase().includes(term) ||
      post.content?.toLowerCase().includes(term) ||
      post.category?.toLowerCase().includes(term) ||
      post.postedFromIp?.toLowerCase().includes(term)
    );
  });

  // Handle post deletion
  const handleDeletePost = async (postId: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);
      setDeleteSuccess(`Post ID ${postId} successfully purged from live feeds.`);
      setTimeout(() => setDeleteSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to purge post from Firestore:', err);
      setDeleteError(`Firestore write exception. Failed to delete post ${postId}.`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 shadow-xl font-mono text-xs">
      
      {/* Title & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3 mb-4">
        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500/70" />
          <span>Venom Core Database Explorer</span>
        </h3>
        
        {/* Search bar inside admin console */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={adminSearchTerm}
            onChange={(e) => setAdminSearchTerm(e.target.value)}
            placeholder="Search IP, Post ID, keywords..."
            className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none placeholder-zinc-650 transition-colors"
          />
        </div>
      </div>

      {/* Notifications */}
      {deleteError && (
        <div className="bg-rose-950/25 border border-rose-500/30 text-rose-400 text-[10px] p-2.5 rounded mb-3 flex items-center gap-1.5 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>[EXCEPTION] {deleteError}</span>
        </div>
      )}

      {deleteSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] p-2.5 rounded mb-3 flex items-center gap-1.5 leading-relaxed">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>[CLEARANCE] {deleteSuccess}</span>
        </div>
      )}

      {/* List of postings */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
        {filteredAdminPosts.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded">
            No active matches found for "{adminSearchTerm}". Modify query parameters.
          </div>
        ) : (
          filteredAdminPosts.map((post) => (
            <div 
              key={post.id} 
              className="p-3 bg-zinc-900/15 hover:bg-zinc-900/35 border border-zinc-900 hover:border-zinc-850 rounded-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Category & ID Bar */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="text-emerald-400 font-bold uppercase bg-emerald-950/25 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] tracking-widest font-mono">
                    #{post.category}
                  </span>
                  <span>•</span>
                  <span className="font-bold text-zinc-400">ID: {post.id}</span>
                  <span>•</span>
                  <span className="text-emerald-500/80">TYPE: {post.type?.toUpperCase()}</span>
                  <span>•</span>
                  <span className="text-zinc-600 font-sans">HASH: {post.encryptedHash?.substring(0, 10)}</span>
                </div>

                {/* Title / Preview */}
                <div className="text-zinc-200 font-bold leading-relaxed text-xs truncate">
                  {post.title || post.content?.substring(0, 50) || 'Anonymous Post (No Content)'}
                </div>

                {/* Interactions counts stats bar */}
                <div className="text-[10px] text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono pt-0.5">
                  <span>LIKES: {post.likesCount || 0}</span>
                  <span>|</span>
                  <span>UPVOTES: {post.upvotesCount || 0}</span>
                  <span>|</span>
                  <span>DOWNVOTES: {post.downvotesCount || 0}</span>
                  <span>|</span>
                  <span>COMMENTS: {post.commentsCount || 0}</span>
                  <span>|</span>
                  <span className="text-emerald-400 font-semibold">REACTIONS:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {['love', 'fire', 'laugh', 'wow', 'like', 'angry'].map((key) => {
                      const emojiMap: { [key: string]: string } = {
                        love: '❤️',
                        fire: '🔥',
                        laugh: '😂',
                        wow: '😮',
                        like: '👍',
                        angry: '😡'
                      };
                      const count = post.reactions?.[key] || 0;
                      if (count === 0) return null;
                      return (
                        <span key={key} className="bg-zinc-950 border border-zinc-900 px-1 py-0.2 rounded flex items-center gap-1 text-[9px]">
                          <span>{emojiMap[key]}</span>
                          <span className="text-zinc-400 font-bold">{count}</span>
                        </span>
                      );
                    })}
                    {(Object.values(post.reactions || {}) as number[]).reduce((a, b) => a + b, 0) === 0 && (
                      <span className="text-zinc-600 italic text-[9px]">(none)</span>
                    )}
                  </div>
                </div>

                {/* Subtitle / IP / Device tracking */}
                <div className="text-[10px] text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-emerald-500/90 font-semibold bg-emerald-950/10 border border-emerald-500/10 px-1 rounded font-mono">
                    IP: {post.postedFromIp || '127.0.0.1'}
                  </span>
                  <span className="text-zinc-700">|</span>
                  <span className="text-rose-500 font-semibold bg-rose-950/15 border border-rose-500/20 px-1.5 py-0.2 rounded font-mono">
                    IMEI: {post.postedFromImei || (() => {
                      const ip = post.postedFromIp || '127.0.0.1';
                      let hash = 0;
                      for (let i = 0; i < ip.length; i++) {
                        hash = ip.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      let digits = '35';
                      for (let i = 0; i < 13; i++) {
                        digits += Math.abs((hash + i * 19) % 10).toString();
                      }
                      return digits;
                    })()}
                  </span>
                  <span className="text-zinc-700">|</span>
                  <span className="text-zinc-400 truncate max-w-[240px]">{post.postedFromDevice || 'Unknown Operating System'}</span>
                  {post.postedFromIp && onBlockIpClick && (
                    <>
                      <span className="text-zinc-800">|</span>
                      <button 
                        onClick={() => {
                          const resolvedImei = post.postedFromImei || (() => {
                            const ip = post.postedFromIp || '127.0.0.1';
                            let hash = 0;
                            for (let i = 0; i < ip.length; i++) {
                              hash = ip.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            let digits = '35';
                            for (let i = 0; i < 13; i++) {
                              digits += Math.abs((hash + i * 19) % 10).toString();
                            }
                            return digits;
                          })();
                          onBlockIpClick(post.postedFromIp!, resolvedImei);
                        }}
                        className="text-[9px] text-rose-500 hover:text-rose-400 hover:underline cursor-pointer flex items-center gap-0.5 uppercase tracking-wide font-bold"
                      >
                        [Suspend IP & Device]
                      </button>
                    </>
                  )}
                  
                  {/* Share Preview Action */}
                  <span className="text-zinc-800">|</span>
                  <button
                    onClick={() => {
                      window.history.pushState({}, '', `/?id=${post.encryptedHash}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="text-[9px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 font-bold uppercase cursor-pointer"
                  >
                    <ExternalLink className="w-2.5 h-2.5" /> Link
                  </button>
                </div>
              </div>

              {/* Quick Admin Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 font-mono">
                <button
                  onClick={() => onStartEdit(post)}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold"
                  title="Modify Post Payload"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setPostIdToConfirmDelete(post.id)}
                  className="p-1.5 bg-rose-950/10 border border-rose-950/40 hover:border-rose-500 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold"
                  title="Destructive Deletion"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CUSTOM SECURE CONFIRMATION MODAL (BYPASS IFRAME window.confirm BLOCKS) */}
      {postIdToConfirmDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-rose-500/35 rounded-lg max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 mb-3 font-mono">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold uppercase tracking-wider">CONFIRM DESTRUCTIVE PURGE</h4>
            </div>
            
            <p className="text-[11px] text-zinc-400 font-mono leading-relaxed mb-6">
              Are you sure you want to permanently purge post ID: <span className="text-zinc-200 font-bold break-all">{postIdToConfirmDelete}</span>? This action is irreversible and deletes the venom permanently from Firestore.
            </p>
            
            <div className="flex justify-end gap-3 font-mono">
              <button
                disabled={isDeleting}
                onClick={() => setPostIdToConfirmDelete(null)}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-[10px] uppercase font-bold rounded transition-colors cursor-pointer"
              >
                Abort
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  const id = postIdToConfirmDelete;
                  setPostIdToConfirmDelete(null);
                  await handleDeletePost(id);
                }}
                className="px-3.5 py-1.5 bg-rose-950/30 border border-rose-500/30 hover:border-rose-500 text-rose-400 text-[10px] uppercase font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                <span>{isDeleting ? 'Purging...' : 'Purge Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
