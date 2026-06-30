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
  Hash,
  Copy,
  Link,
  MessageCircle,
  Twitter,
  Facebook,
  ExternalLink,
  Send,
  Smile,
  Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isPostLiked, 
  togglePostLikeStore, 
  getPostVote, 
  setPostVoteStore, 
  getPollVotedOption, 
  setPollVotedOptionStore,
  getPostReaction,
  setPostReactionStore
} from '../utils/storage';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { getClientIp } from '../utils/ip';
import { copyToClipboard } from '../utils/clipboard';
import { formatTimeAgo } from '../utils/time';
import CommentsPane from './CommentsPane';

interface VenomCardProps {
  key?: string | number;
  post: Post;
  highlighted?: boolean;
  onPostUpdate?: (updatedPost: Partial<Post>) => void;
  isBlocked?: boolean;
  onBlockedActionTriggered?: () => void;
  compact?: boolean;
}

const REACTIONS = [
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'laugh', emoji: '😂', label: 'Laugh' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'angry', emoji: '😡', label: 'Angry' },
];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  delay: number;
}

export default function VenomCard({ 
  post, 
  highlighted = false, 
  onPostUpdate,
  isBlocked = false,
  onBlockedActionTriggered,
  compact = false
}: VenomCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isExpandingImage, setIsExpandingImage] = useState(false);
  const [isCopingHash, setIsCopingHash] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showMobileReactions, setShowMobileReactions] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  React.useEffect(() => {
    setCommentsCount(post.commentsCount);
  }, [post.commentsCount]);

  React.useEffect(() => {
    setActiveReaction(getPostReaction(post.id));
  }, [post.id]);

  // Read interaction states from LocalStorage via storage helpers
  const liked = isPostLiked(post.id);
  const userVote = getPostVote(post.id); // 'up', 'down', or null
  const votedPollOption = getPollVotedOption(post.id); // number index or null

  // Calculate dynamic properties
  const isVotedPoll = votedPollOption !== null;
  const pollVotes = post.pollVotes || {};
  const totalPollVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);
  const totalReactions = (Object.values(post.reactions || {}) as number[]).reduce((a, b) => a + b, 0);

  const handleLikeToggle = async () => {
    if (isBlocked) {
      if (onBlockedActionTriggered) onBlockedActionTriggered();
      return;
    }
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
    if (isBlocked) {
      if (onBlockedActionTriggered) onBlockedActionTriggered();
      return;
    }
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
    if (isBlocked) {
      if (onBlockedActionTriggered) onBlockedActionTriggered();
      return;
    }
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

  const shareUrl = `${window.location.origin}/?id=${post.encryptedHash}`;
  const shareTitle = post.title;

  const imageUrl = post.imageUrl 
    ? `${window.location.origin}/api/post-image/${post.encryptedHash}`
    : 'https://i.ibb.co/jkzWK6V6/14895-removebg-preview.png';

  // Format a simple, humble and elegant dispatch message matching the user request
  const cleanExcerpt = post.content 
    ? post.content.length > 200 
      ? `"${post.content.substring(0, 200)}..."`
      : `"${post.content}"`
    : '';

  const dispatchText = `Venom

Review —
"${post.title}"
${cleanExcerpt ? `${cleanExcerpt}\n` : ''}Link: ${shareUrl}

Use it now: https://myvenom.vercel.app`;

  const twitterDispatchText = `Venom\n\nReview —\n"${post.title}"\nLink: ${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Venom — ${shareTitle}`,
          text: dispatchText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const sharePlatforms = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:text-green-400 hover:border-green-500/30 text-emerald-500/70 hover:bg-green-950/15',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(dispatchText)}`
    },
    {
      name: 'X / Twitter',
      icon: Twitter,
      color: 'hover:text-sky-400 hover:border-sky-500/30 text-emerald-500/70 hover:bg-sky-950/15',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterDispatchText)}&url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'hover:text-blue-400 hover:border-blue-500/30 text-emerald-500/70 hover:bg-blue-950/15',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(dispatchText)}`
    },
    {
      name: 'Reddit',
      icon: ExternalLink,
      color: 'hover:text-orange-400 hover:border-orange-500/30 text-emerald-500/70 hover:bg-orange-950/15',
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`[VENOM SECURE INTEL] ${shareTitle}`)}`
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:text-indigo-400 hover:border-indigo-500/30 text-emerald-500/70 hover:bg-indigo-950/15',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    }
  ];

  const handleShare = () => {
    setShowShareModal(true);
  };

  const spawnFloatingEmojis = (emoji: string) => {
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji,
      x: (Math.random() - 0.5) * 140, // Nice horizontal dispersal
      delay: Math.random() * 0.3, // Beautiful staggered release
    }));
    setFloatingEmojis((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 2500);
  };

  const handleReact = async (reactionKey: string) => {
    if (isBlocked) {
      if (onBlockedActionTriggered) onBlockedActionTriggered();
      return;
    }
    const oldReaction = activeReaction;
    const isRemove = oldReaction === reactionKey;
    const nextReaction = isRemove ? null : reactionKey;

    // Calculate optimistic reactions
    const currentReactions = { ...(post.reactions || {}) };
    
    // Decrement old
    if (oldReaction) {
      currentReactions[oldReaction] = Math.max(0, (currentReactions[oldReaction] || 0) - 1);
    }
    // Increment new
    if (nextReaction) {
      currentReactions[nextReaction] = (currentReactions[nextReaction] || 0) + 1;
      const emoji = REACTIONS.find(r => r.key === nextReaction)?.emoji || '❤️';
      spawnFloatingEmojis(emoji);
    }

    setActiveReaction(nextReaction);
    setPostReactionStore(post.id, nextReaction);
    if (onPostUpdate) {
      onPostUpdate({ reactions: currentReactions });
    }

    setShowMobileReactions(false);

    try {
      const userIp = await getClientIp();
      const interactionRef = doc(db, 'interactions', `${post.id}_${userIp}_reaction`);
      const postRef = doc(db, 'posts', post.id);

      if (isRemove) {
        await deleteDoc(interactionRef);
        await updateDoc(postRef, {
          [`reactions.${reactionKey}`]: increment(-1),
        });
      } else {
        await setDoc(interactionRef, {
          ip: userIp,
          postId: post.id,
          type: 'reaction',
          reactionKey,
          createdAt: new Date().toISOString()
        });

        const updateData: { [key: string]: any } = {};
        if (oldReaction) {
          updateData[`reactions.${oldReaction}`] = increment(-1);
        }
        updateData[`reactions.${reactionKey}`] = increment(1);

        await updateDoc(postRef, updateData);
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
      setActiveReaction(oldReaction);
      setPostReactionStore(post.id, oldReaction);
      if (onPostUpdate) {
        onPostUpdate({ reactions: post.reactions });
      }
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
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
      className={`relative border rounded-lg overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 font-sans text-zinc-300 ${
        highlighted 
          ? 'border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30' 
          : 'border-zinc-900 bg-zinc-950/70 hover:border-emerald-500/10'
      }`}
    >
      
      {/* Top Meta Info Header */}
      <div className={`px-4 pt-4 pb-2.5 flex items-center justify-between border-b border-zinc-900/40 text-[10px] text-zinc-500 font-mono gap-2 flex-wrap ${compact ? 'px-2.5 pt-2.5 pb-1.5 text-[9px]' : ''}`}>
        {/* Left Side: Category and Type */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Category Pill */}
          <span className={`text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded uppercase text-[9px] tracking-wider ${compact ? 'px-1.5 py-0 text-[8px]' : ''}`}>
            {getCategoryLabel(post.category)}
          </span>
          <span className="text-zinc-800">|</span>
          {/* Post Type Badge */}
          <span className={`bg-zinc-900/80 text-zinc-400 px-1.5 py-0.5 border border-zinc-800/80 rounded uppercase text-[8px] tracking-wide flex items-center gap-1 ${compact ? 'px-1 py-0 text-[7.5px]' : ''}`}>
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

        {/* Middle: Report Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(post.id || post.encryptedHash).then(() => {
              window.history.pushState({}, '', `/report?id=${post.id || post.encryptedHash}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            });
          }}
          className={`flex items-center gap-1 text-rose-500 hover:text-rose-400 font-bold bg-rose-950/10 hover:bg-rose-950/25 border border-rose-500/20 hover:border-rose-500/40 px-2.5 py-0.5 rounded uppercase text-[8px] tracking-wider transition-all cursor-pointer shrink-0 ${compact ? 'px-1.5 py-0.5 text-[7.5px]' : ''}`}
          title="Copy ID & Report this Venom"
        >
          <Flag className="w-2.5 h-2.5 text-rose-500" />
          <span>Report</span>
        </button>

        {/* Right Side: Post Verification Display */}
        <button 
          onClick={handleCopyHash}
          className="hover:text-emerald-400 cursor-pointer text-zinc-600 transition-colors flex items-center gap-1 group font-mono text-[9px] shrink-0"
          title="Click to copy post verification tag"
        >
          <Shield className="w-3 h-3 text-emerald-500/15 group-hover:text-emerald-400/50" />
          <span>{isCopingHash ? 'COPIED' : 'ID: ' + post.encryptedHash.substring(0, 8).toUpperCase()}</span>
        </button>
      </div>

      {/* Main content pane */}
      <div className={`p-4 flex-1 flex flex-col ${compact ? 'p-3' : ''}`}>
        {/* Title */}
        <h2 className={`text-sm sm:text-base font-semibold text-zinc-100 tracking-tight leading-snug mb-2 font-sans hover:text-emerald-300 transition-colors ${compact ? 'text-xs mb-1' : ''}`}>
          {post.title}
        </h2>

        {/* Core content text */}
        {post.content && (
          <p className={`text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4 whitespace-pre-wrap pl-0.5 break-words font-sans ${compact ? 'text-[11px] mb-2' : ''}`}>
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

      {/* Mobile Reaction expanded panel: under the Post section center, above footer actions */}
      <AnimatePresence>
        {showMobileReactions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex justify-center w-full md:hidden bg-zinc-950/20 border-t border-zinc-900/40"
          >
            <div className="py-2.5 px-4 flex justify-center w-full">
              <div className="bg-zinc-900 border border-zinc-800 rounded-full p-1 px-1.5 flex items-center justify-center gap-1.5 shadow-xl">
                {REACTIONS.map((r) => {
                  const count = post.reactions?.[r.key] || 0;
                  const isUserReacted = activeReaction === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => handleReact(r.key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-200 text-xs cursor-pointer active:scale-90 ${
                        isUserReacted
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold'
                          : 'bg-zinc-950/30 border border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-sm shrink-0">{r.emoji}</span>
                      <span className="font-mono text-[9px] font-medium opacity-80">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

          {/* Mobile Reaction Toggle Button (Smiley) */}
          <button
            onClick={() => setShowMobileReactions(!showMobileReactions)}
            className={`flex items-center gap-1.5 px-2.5 py-1 hover:bg-zinc-900/60 rounded text-xs transition-colors cursor-pointer md:hidden ${
              activeReaction ? 'text-emerald-400 font-semibold' : 'hover:text-emerald-400'
            }`}
            title="React to post"
          >
            {activeReaction ? (
              <span className="text-sm shrink-0">
                {REACTIONS.find((r) => r.key === activeReaction)?.emoji}
              </span>
            ) : (
              <Smile className="w-3.5 h-3.5 text-zinc-500 hover:text-emerald-400" />
            )}
            {totalReactions > 0 && (
              <span className="text-[10px] text-zinc-400 ml-0.5">{totalReactions}</span>
            )}
          </button>
        </div>

        {/* Tablet / PC: Rounded reaction bar with all 6 emojis in a row */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-900/40 border border-zinc-850/60 rounded-full p-0.5 px-1.5 shadow-inner">
          {REACTIONS.map((r) => {
            const count = post.reactions?.[r.key] || 0;
            const isUserReacted = activeReaction === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleReact(r.key)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all duration-200 text-[11px] cursor-pointer group hover:scale-105 active:scale-95 ${
                  isUserReacted
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold'
                    : 'bg-transparent border border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
                title={r.label}
              >
                <span className={`text-sm transition-transform duration-200 ${isUserReacted ? 'scale-110' : 'group-hover:scale-120'}`}>
                  {r.emoji}
                </span>
                {count > 0 && <span className="font-mono text-[9px] font-medium">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Right Side: Share & Timestamp */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-bold bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded tracking-wide uppercase font-mono">
            {formatTimeAgo(post.createdAt)}
          </span>
          <button
            onClick={handleShare}
            className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-emerald-400 rounded transition-all cursor-pointer relative"
            title="Share Venom"
          >
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
              isBlocked={isBlocked}
              onBlockedActionTriggered={onBlockedActionTriggered}
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

      {/* Premium Social Sharing Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-zinc-950 border border-zinc-850 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-bold text-xs tracking-wider uppercase text-zinc-200">
                    Share Venom
                  </span>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-md text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-4 space-y-4">
                {/* Title Preview */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-3 text-left">
                  <div className="text-[10px] text-zinc-600 font-mono font-bold tracking-wider uppercase mb-1">
                    Venom Post Preview
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-300 font-sans line-clamp-1">
                    {post.title}
                  </h4>
                  {post.content && (
                    <p className="text-[11px] text-zinc-500 font-sans line-clamp-2 mt-1">
                      {post.content}
                    </p>
                  )}
                </div>

                {/* Primary Button: Device Native Share (Web Share API) */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={() => {
                      handleNativeShare();
                      setShowShareModal(false);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-2.5 px-4 rounded-lg font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    SHARE VIA DEVICE APPS
                  </button>
                )}

                {/* Grid of Social Platform Shortcuts */}
                <div className="space-y-2">
                  <div className="text-[9px] text-zinc-600 font-mono font-bold tracking-wider uppercase text-left">
                    Social Quick Links
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sharePlatforms.map((platform) => {
                      const PlatformIcon = platform.icon;
                      return (
                        <a
                          key={platform.name}
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setTimeout(() => setShowShareModal(false), 500);
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border border-zinc-900 bg-zinc-900/10 text-zinc-400 text-xs transition-all duration-200 ${platform.color} cursor-pointer hover:bg-zinc-900/40 font-sans`}
                        >
                          <PlatformIcon className="w-4 h-4 shrink-0" />
                          <span>{platform.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Copy Link input box */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[9px] text-zinc-600 font-mono font-bold tracking-wider uppercase text-left">
                    Direct Secure Link
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-1.5 text-[11px] text-zinc-400 select-all font-mono flex-1 focus:outline-none focus:border-zinc-700"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative shrink-0"
                    >
                      {isCopiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          <span className="text-emerald-400 text-[10px]">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[10px]">COPY LINK</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="px-4 py-3 bg-zinc-900/40 border-t border-zinc-900 text-center text-[9px] text-zinc-500 font-mono">
                DECENTRALIZED ANONYMOUS LINK SECURED
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Emoji Particles Container (Instagram-like animations) */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden h-96 z-50 flex items-end justify-center">
        <AnimatePresence>
          {floatingEmojis.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 0, y: 20, x: 0, scale: 0.3 }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                y: -180 - Math.random() * 80, 
                x: particle.x,
                scale: [0.3, 1.4, 1.1, 0.7],
                rotate: (Math.random() - 0.5) * 60 
              }}
              transition={{ duration: 1.8, ease: 'easeOut', delay: particle.delay }}
              className="absolute pointer-events-none text-3xl select-none"
              style={{ bottom: '24px' }}
            >
              {particle.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </article>
  );
}
