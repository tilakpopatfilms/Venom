/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, AlertTriangle, ShieldAlert, Clock, Eye, AlertCircle, Ban } from 'lucide-react';
import { motion } from 'motion/react';
import { BlockStatus } from '../utils/blockChecker';

interface QuarantineNoticeModalProps {
  blockStatus: BlockStatus;
  userIp: string;
  onClose: () => void;
}

export default function QuarantineNoticeModal({ blockStatus, userIp, onClose }: QuarantineNoticeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-zinc-950 border border-rose-500/30 rounded-xl overflow-hidden shadow-2xl z-10 p-6 space-y-5 text-zinc-300 font-mono"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-rose-950/20 border border-rose-500/35 flex items-center justify-center text-rose-400 shrink-0">
              <Ban className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-zinc-100 uppercase leading-none">
                DEVICE QUARANTINE PROTOCOL
              </h2>
              <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-1.5 font-sans">
                Community safety restriction active
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-rose-950/10 border border-rose-500/20 p-3.5 rounded-lg space-y-1.5 text-xs">
          <span className="font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            WRITE CLEARANCE REVOKED
          </span>
          <p className="font-sans text-zinc-400 text-[11px] leading-relaxed">
            Your device IP address has been isolated due to content policy violations. To preserve board health, you are restricted to read-only clearance.
          </p>
        </div>

        {/* Threat metadata list */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-4 space-y-2.5 text-[10px] leading-relaxed">
          <div className="flex justify-between border-b border-zinc-900/60 pb-1.5">
            <span className="text-zinc-500 uppercase">Suspended IP Signature:</span>
            <span className="text-zinc-300 font-bold">{userIp || '127.0.0.1'}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-900/60 pb-1.5">
            <span className="text-zinc-500 uppercase">Ban Escalation Count:</span>
            <span className="text-rose-400 font-bold">Level {blockStatus.blockCount || 1} Offense</span>
          </div>
          <div className="flex justify-between border-b border-zinc-900/60 pb-1.5">
            <span className="text-zinc-500 uppercase">Trigger Threshold:</span>
            <span className="text-rose-400 font-bold">50+ Community Complaints</span>
          </div>
          <div className="flex justify-between border-b border-zinc-900/60 pb-1.5">
            <span className="text-zinc-500 uppercase">Quarantine Expiry:</span>
            <span className="text-amber-400 font-bold tracking-wider">{blockStatus.timeLeftLabel || 'Permanent Ban'}</span>
          </div>
          <div className="pt-1 flex flex-col gap-1 text-[9px]">
            <span className="text-zinc-500 uppercase font-bold block">TRIGGERING SECURITY INCIDENT:</span>
            <span className="text-zinc-400 italic font-sans">
              "{blockStatus.reason || 'Multiple user complaints flagged on posted content.'}"
            </span>
          </div>
        </div>

        {/* Permissions list */}
        <div className="space-y-2">
          <span className="text-[8px] uppercase text-zinc-500 block font-bold tracking-wider">
            FUNCTIONAL CLEARANCE PROTOCOLS
          </span>
          <div className="grid grid-cols-1 gap-1.5 text-[10px] font-sans">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-rose-950/5 border border-rose-900/20 rounded">
              <span className="text-zinc-400">Post new topics or ideas</span>
              <span className="text-rose-400 font-bold font-mono text-[9px] bg-rose-950/20 px-1 py-0.5 rounded border border-rose-900/30">RESTRICTED</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-rose-950/5 border border-rose-900/20 rounded">
              <span className="text-zinc-400">Like, Comment, or Vote</span>
              <span className="text-rose-400 font-bold font-mono text-[9px] bg-rose-950/20 px-1 py-0.5 rounded border border-rose-900/30">RESTRICTED</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-rose-950/5 border border-rose-900/20 rounded">
              <span className="text-zinc-400">File user complaint reports</span>
              <span className="text-rose-400 font-bold font-mono text-[9px] bg-rose-950/20 px-1 py-0.5 rounded border border-rose-900/30">RESTRICTED</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-950/5 border border-emerald-900/20 rounded">
              <span className="text-zinc-400">Browse & read public posts</span>
              <span className="text-emerald-400 font-bold font-mono text-[9px] bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-900/30">PERMITTED</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-zinc-300 font-black text-[10px] rounded transition-all uppercase tracking-widest cursor-pointer text-center"
        >
          ACKNOWLEDGE RESTRICTION
        </button>
      </motion.div>
    </div>
  );
}
