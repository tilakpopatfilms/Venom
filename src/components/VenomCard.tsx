/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Post } from '../types';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  Heart, 
  MessageSquare, 
  Share2, 
  Shield, 
  Eye, 
  Check, 
  X, 
  BarChart2, 
  HelpCircle, 
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isPostLiked, 
  togglePostLikeStore, 
  getPostVote, 
  setPostVoteStore, 
  getPollVotedOption, 
  setPollVotedOptionStore 
} from '../utils/storage';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { getClientIp } from '../utils/ip';
import { formatTimeAgo } from '../utils/time';
import CommentsPane from './CommentsPane';

interface VenomCardProps {
  key?: string | number;
  post: Post;
  highlighted?: boolean;
  onPostUpdate?: (updatedPost: Partial<Post>) => void;
}

export default function VenomCard({ post, highlighted = false, onPostUpdate }: VenomCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isExpandingImage, setIsExpandingImage] = useState(false);
  const [isCopingHash, setIsCopingHash] = useState(false);
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  React.useEffect(() => {
    setCommentsCount(post.commentsCount);
  }, [post.commentsCount]);

  // Read interaction states from LocalStorage via storage helpers
  const liked = isPostLiked(post.id);
  const userVote = getPostVote(post.id); // 'up', 'down', or null
  const votedPollOption = getPollVotedOption(post.id); // number index or null

  // Calculate dynamic properties
  const isVotedPoll = votedPollOption !== null;
  const pollVotes = post.pollVotes || {};
  const totalPollVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  const handleLikeToggle = async () => {
    const isLikedNow = togglePostLikeStore(post.id);
    const incAmount = isLikedNow ? 1 : -1;

    // Instantly notify parent for visual response
    if (onPostUpdate) {
      onPostUpdate({ likesCount: post.likesCount + incAmount });
    }

    try {
      const userIp = await getClientIp();
      const interactionRef = doc(db, 'interactions', `${post.id}_${userIp}_like`);
      const postRef = doc(db, 'posts', post.id);

      if (isLikedNow) {
        await setDoc(interactionRef, {
          ip: userIp,
          postId: post.id,
          type: 'like',
          createdAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(interactionRef);
      }

      await updateDoc(postRef, {
        likesCount: increment(incAmount),
      });
    } catch (error) {
      // Revert state on error
      togglePostLikeStore(post.id);
      if (onPostUpdate) {
        onPostUpdate({ likesCount: post.likesCount });
      }
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleVote = async (direction: 'up' | 'down') => {
    let upvoteInc = 0;
    let downvoteInc = 0;

    if (userVote === direction) {
      // Cancel current vote
      if (direction === 'up') upvoteInc = -1;
      else downvoteInc = -1;
      setPostVoteStore(post.id, null);
    } else {
      // Set new vote or switch vote
      if (direction === 'up') {
        upvoteInc = 1;
        if (userVote === 'down') downvoteInc = -1;
      } else {
        downvoteInc = 1;
        if (userVote === 'up') upvoteInc = -1;
      }
      setPostVoteStore(post.id, direction);
    }

    // Instantly notify parent for optimistic update
    if (onPostUpdate) {
      onPostUpdate({
        upvotesCount: post.upvotesCount + upvoteInc,
        downvotesCount: post.downvotesCount + downvoteInc,
      });
    }

    try {
      const userIp = await getClientIp();
      const interactionRef = doc(db, 'interactions', `${post.id}_${userIp}_vote`);
      const postRef = doc(db, 'posts', post.id);

      if (userVote === direction) {
        // Vote was cancelled
        await deleteDoc(interactionRef);
      } else {
        // Set new/switched vote
        await setDoc(interactionRef, {
          ip: userIp,
          postId: post.id,
          type: 'vote',
          direction,
          createdAt: new Date().toISOString()
        });
      }

      const updateData: { [key: string]: any } = {};
      if (upvoteInc !== 0) updateData.upvotesCount = increment(upvoteInc);
      if (downvoteInc !== 0) updateData.downvotesCount = increment(downvoteInc);

      await updateDoc(postRef, updateData);
    } catch (error) {
      // Revert store state & visual on error
      setPostVoteStore(post.id, userVote);
      if (onPostUpdate) {
        onPostUpdate({
          upvotesCount: post.upvotesCount,
          downvotesCount: post.downvotesCount,
        });
      }
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (isVotedPoll) return; // Prevent double voting

    setPollVotedOptionStore(post.id, optionIndex);

    // Optimistically update parent
    const updatedPollVotes = { ...pollVotes };
    updatedPollVotes[optionIndex] = (updatedPollVotes[optionIndex] || 0) + 1;
    if (onPostUpdate) {
      onPostUpdate({ pollVotes: updatedPollVotes });
    }

    try {
      const userIp = await getClientIp();
      const interactionRef = doc(db, 'interactions', `${post.id}_${userIp}_poll`);
      const postRef = doc(db, 'posts', post.id);

      await setDoc(interactionRef, {
        ip: userIp,
        postId: post.id,
        type: 'poll',
        optionIndex,
        createdAt: new Date().toISOString()
      });

      const voteKey = `pollVotes.${optionIndex}`;
      await updateDoc(postRef, {
        [voteKey]: increment(1),
      });
    } catch (error) {
      // Revert on error
      localStorage.removeItem(`venom_poll_vote_${post.id}`); // Clear specific poll vote storage manually
      const revertedState = { ...pollVotes };
      if (onPostUpdate) {
        onPostUpdate({ pollVotes: revertedState });
      }
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(post.encryptedHash);
    setIsCopingHash(true);
    setTimeout(() => setIsCopingHash(false), 2000);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?id=${post.encryptedHash}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2000);
  };

  const handleCommentsCountChange = (newCount: number) => {
    setCommentsCount(newCount);
    if (onPostUpdate) {
      onPostUpdate({ commentsCount: newCount });
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryLabel = (cat: string) => {
    const map: { [key: string]: string } = {
      general: 'Discussion',
      tech: 'Tech & Dev',
      design: 'Design & Creative',
      gaming: 'Gaming',
      lifestyle: 'Lifestyle',
    };
    return map[cat] || cat;
  };

  return (
    <article 
      id={`post-${post.id}`} 
      className={`border rounded-lg overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 font-sans text-zinc-300 ${
        highlighted 
          ? 'border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30' 
          : 'border-zinc-900 bg-zinc-950/70 hover:border-emerald-500/10'
      }`}
    >
      
      {/* Top Meta Info Header */}
      <div className="px-4 pt-4 pb-2.5 flex items-center justify-between border-b border-zinc-900/40 text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center gap-2">
          {/* Category Pill */}
          <span className="text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded uppercase text-[9px] tracking-wider">
            {getCategoryLabel(post.category)}
          </span>
          <span className="text-zinc-800">|</span>
          {/* Post Type Badge */}
          <span className="bg-zinc-900/80 text-zinc-400 px-1.5 py-0.5 border border-zinc-800/80 rounded uppercase text-[8px] tracking-wide flex items-center gap-1">
            {post.type === 'text' && <Hash className="w-2.5 h-2.5 text-zinc-500" />}
            {post.type === 'image' && <Eye className="w-2.5 h-2.5 text-zinc-500" />}
            {post.type === 'poll' && <BarChart2 className="w-2.5 h-2.5 text-zinc-500" />}
            {post.type === 'qa' && <HelpCircle className="w-2.5 h-2.5 text-zinc-500" />}
            {post.type.toUpperCase()}
          </span>
          {highlighted && (
            <>
              <span className="text-zinc-800">|</span>
              <span className="bg-emerald-500 text-zinc-950 px-1.5 py-0.5 rounded uppercase text-[8px] font-black tracking-wider animate-pulse flex items-center gap-1">
                Target Match
              </span>
            </>
          )}
        </div>

        {/* Post Verification Display */}
        <button 
          onClick={handleCopyHash}
          className="hover:text-emerald-400 cursor-pointer text-zinc-600 transition-colors flex items-center gap-1 group font-mono text-[9px]"
          title="Click to copy post verification tag"
        >
          <Shield className="w-3 h-3 text-emerald-500/15 group-hover:text-emerald-400/50" />
          <span>{isCopingHash ? 'COPIED' : 'ID: ' + post.encryptedHash.substring(0, 8)}</span>
        </button>
      </div>

      {/* Main content pane */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title */}
        <h2 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight leading-snug mb-2 font-sans hover:text-emerald-300 transition-colors">
          {post.title}
        </h2>

        {/* Core content text */}
        {post.content && (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4 whitespace-pre-wrap pl-0.5 break-words font-sans">
            {post.content}
          </p>
        )}

        {/* --- Image Attachment (Optional for all post types) --- */}
        {post.imageUrl && (
          <div className="relative rounded overflow-hidden bg-zinc-900/30 border border-zinc-900 mb-4 max-h-80 flex items-center justify-center">
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              referrerPolicy="no-referrer"
              className="max-h-80 object-contain w-full cursor-zoom-in hover:brightness-105 transition-all"
              onClick={() => setIsExpandingImage(true)}
            />
          </div>
        )}

        {/* --- Poll Post Renderer --- */}
        {post.type === 'poll' && post.pollOptions && (
          <div className="space-y-2 mb-4 pl-0.5">
            {post.pollOptions.map((option, idx) => {
              const optionVotes = pollVotes[idx] || 0;
              const percent = totalPollVotes > 0 ? Math.round((optionVotes / totalPollVotes) * 100) : 0;
              const isSelected = votedPollOption === idx;

              return (
                <div key={idx} className="relative">
                  {isVotedPoll ? (
                    /* Post-vote styled result */
                    <div className="border border-zinc-900 bg-zinc-950/20 p-2.5 rounded text-xs overflow-hidden flex items-center justify-between">
                      {/* Animated Progress slide-in fill */}
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-y-0 left-0 bg-emerald-500/5 border-r border-emerald-500/10 pointer-events-none"
                      />
                      
                      <div className="relative z-10 flex items-center gap-2 text-zinc-300 max-w-[75%] font-sans">
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className={isSelected ? 'text-emerald-300 font-semibold' : ''}>{option}</span>
                      </div>
                      <div className="relative z-10 text-right text-[10px] font-mono text-zinc-400">
                        <span className="font-bold text-zinc-300">{percent}%</span>
                        <span className="text-zinc-600 ml-1.5">({optionVotes})</span>
                      </div>
                    </div>
                  ) : (
                    /* Interactive pre-vote choice button */
                    <button
                      onClick={() => handlePollVote(idx)}
                      className="w-full text-left bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/20 p-2.5 rounded text-xs text-zinc-300 hover:text-emerald-400 cursor-pointer transition-all duration-200 font-sans"
                    >
                      {option}
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* Poll summary stats metadata */}
            {isVotedPoll && (
              <div className="text-[9px] text-zinc-600 font-mono pt-1 text-right">
                TOTAL VOTES: {totalPollVotes}
              </div>
            )}
          </div>
        )}

        {/* --- Q&A Post Renderer --- */}
        {post.type === 'qa' && post.pollOptions && (
          <div className="space-y-2 mb-4 pl-0.5">
            {post.pollOptions.map((option, idx) => {
              const optionVotes = pollVotes[idx] || 0;
              const percent = totalPollVotes > 0 ? Math.round((optionVotes / totalPollVotes) * 100) : 0;
              const isSelected = votedPollOption === idx;
              const isCorrect = post.correctOptionIndex === idx;

              return (
                <div key={idx} className="relative">
                  {isVotedPoll ? (
                    /* Q&A Decrypted Stat result styling */
                    <div className={`border p-2.5 rounded text-xs flex items-center justify-between transition-all ${
                      isCorrect 
                        ? 'border-emerald-500/20 bg-emerald-950/5' 
                        : isSelected 
                          ? 'border-rose-500/20 bg-rose-950/5' 
                          : 'border-zinc-900 bg-zinc-950/20'
                    }`}>
                      {/* Animated Progress slide-in fill */}
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6 }}
                        className={`absolute inset-y-0 left-0 border-r pointer-events-none ${
                          isCorrect 
                            ? 'bg-emerald-500/5 border-emerald-500/10' 
                            : isSelected 
                              ? 'bg-rose-500/5 border-rose-500/10' 
                              : 'bg-zinc-500/5 border-zinc-500/10'
                        }`}
                      />

                      <div className="relative z-10 flex items-center gap-2 max-w-[75%] font-sans">
                        {isCorrect && (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono font-bold shrink-0">
                            CORRECT
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-[8px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.2 rounded font-mono font-bold shrink-0">
                            YOUR CHOICE
                          </span>
                        )}
                        <span className={`text-zinc-300 ${isCorrect ? 'text-emerald-400 font-semibold' : isSelected ? 'text-rose-400 font-semibold' : ''}`}>
                          {option}
                        </span>
                      </div>
                      <div className="relative z-10 text-right text-[10px] font-mono text-zinc-400">
                        <span className={`font-bold ${isCorrect ? 'text-emerald-400' : isSelected ? 'text-rose-400' : 'text-zinc-300'}`}>{percent}%</span>
                        <span className="text-zinc-600 ml-1.5">({optionVotes})</span>
                      </div>
                    </div>
                  ) : (
                    /* Interactive pre-choice selection button */
                    <button
                      onClick={() => handlePollVote(idx)}
                      className="w-full text-left bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/20 p-2.5 rounded text-xs text-zinc-300 hover:text-emerald-400 cursor-pointer transition-all duration-200 font-sans"
                    >
                      {option}
                    </button>
                  )}
                </div>
              );
            })}

            {isVotedPoll && (
              <div className="flex justify-between items-center text-[9px] text-zinc-600 font-mono pt-1">
                <div>
                  {post.correctOptionIndex !== undefined && votedPollOption === post.correctOptionIndex ? (
                    <span className="text-emerald-400 font-bold">✔ CORRECT CHOICE SELECTED</span>
                  ) : post.correctOptionIndex !== undefined ? (
                    <span className="text-rose-400 font-bold">✘ INCORRECT CHOICE SELECTED</span>
                  ) : (
                    <span>POLL SUBMISSION REGISTERED</span>
                  )}
                </div>
                <div>VOTES: {totalPollVotes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Interactive Actions */}
      <div className="px-3 py-2 border-t border-zinc-900/60 bg-zinc-950 flex items-center justify-between text-zinc-500 font-mono">
        
        {/* Left Side: Vote & Comments Count */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Reddit Style Vote Section */}
          <div className="flex items-center gap-0.5 bg-zinc-900/60 border border-zinc-850 rounded px-1.5 py-0.5">
            <button
              onClick={() => handleVote('up')}
              className={`p-1 hover:text-emerald-400 transition-colors rounded cursor-pointer ${
                userVote === 'up' ? 'text-emerald-400 font-bold bg-emerald-950/25' : ''
              }`}
              title="Vote Up"
            >
              <ArrowBigUp className={`w-4 h-4 ${userVote === 'up' ? 'fill-emerald-400' : ''}`} />
            </button>
            <span className={`text-[10px] font-bold px-1.5 ${
              userVote === 'up' 
                ? 'text-emerald-400' 
                : userVote === 'down' 
                  ? 'text-rose-400' 
                  : 'text-zinc-400'
            }`}>
              {post.upvotesCount - post.downvotesCount}
            </span>
            <button
              onClick={() => handleVote('down')}
              className={`p-1 hover:text-rose-400 transition-colors rounded cursor-pointer ${
                userVote === 'down' ? 'text-rose-400 font-bold bg-rose-950/25' : ''
              }`}
              title="Vote Down"
            >
              <ArrowBigDown className={`w-4 h-4 ${userVote === 'down' ? 'fill-rose-400' : ''}`} />
            </button>
          </div>

          {/* Likes Button */}
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1 hover:bg-zinc-900/60 rounded text-xs transition-colors cursor-pointer ${
              liked ? 'text-rose-500 font-semibold' : 'hover:text-rose-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="text-[10px]">{post.likesCount}</span>
          </button>

          {/* Comments Expand Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 px-2.5 py-1 hover:bg-emerald-950/10 rounded text-xs transition-colors cursor-pointer ${
              showComments ? 'text-emerald-400 font-semibold' : 'hover:text-emerald-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[10px]">{commentsCount}</span>
          </button>
        </div>

        {/* Right Side: Share & Timestamp */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-bold bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded tracking-wide uppercase font-mono">
            {formatTimeAgo(post.createdAt)}
          </span>
          <button
            onClick={handleShare}
            className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-emerald-400 rounded transition-all cursor-pointer relative"
            title="Copy link"
          >
            <AnimatePresence>
              {isCopiedShare && (
                <motion.span 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: -22 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-0 text-[8px] bg-emerald-500 text-zinc-950 px-1 rounded font-bold whitespace-nowrap"
                >
                  COPIED
                </motion.span>
              )}
            </AnimatePresence>
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden bg-zinc-950/30"
          >
            <CommentsPane 
              postId={post.id} 
              onCommentsCountChange={handleCommentsCountChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image expanded modal */}
      {isExpandingImage && post.imageUrl && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsExpandingImage(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 rounded"
            onClick={() => setIsExpandingImage(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img 
            src={post.imageUrl} 
            alt={post.title} 
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain rounded border border-zinc-800 shadow-2xl animate-fade-in"
          />
        </div>
      )}

    </article>
  );
}
