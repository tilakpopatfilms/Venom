/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ShieldAlert, Unlock, RefreshCw } from 'lucide-react';
import { getClientIp } from '../../utils/ip';

export const AdminSecurity: React.FC = () => {
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [newIpToBlock, setNewIpToBlock] = useState('');
  const [isFirewallLoading, setIsFirewallLoading] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [adminIp, setAdminIp] = useState<string>('');

  // Resolve current administrator's IP address on load
  useEffect(() => {
    const resolveIp = async () => {
      const resolved = await getClientIp();
      setAdminIp(resolved);
    };
    resolveIp();
  }, []);

  // Clear feedback messages automatically
  useEffect(() => {
    if (errorFeedback) {
      const timer = setTimeout(() => setErrorFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorFeedback]);

  useEffect(() => {
    if (successFeedback) {
      const timer = setTimeout(() => setSuccessFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successFeedback]);

  // Fetch Blocked IPs list in real-time
  useEffect(() => {
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
        setErrorFeedback('Failed to synchronize firewall. Check Firestore access rules.');
      }
    );

    return () => unsubscribe();
  }, []);

  // Block a new IP address
  const handleBlockIpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = newIpToBlock.trim();
    if (!cleanIp) return;

    // Basic IP validation check (supports both IPv4 and simple IPv6 format)
    if (!/^[a-fA-F0-9.:]+$/.test(cleanIp)) {
      setErrorFeedback('Invalid IP format. Access denied.');
      return;
    }

    try {
      const blockRef = doc(db, 'blockedIps', cleanIp);
      await setDoc(blockRef, {
        blockedAt: new Date().toISOString(),
        reason: 'Community Guidelines Violation (Admin Enforced)'
      });
      setNewIpToBlock('');
      setSuccessFeedback(`IP Address ${cleanIp} blacklisted successfully.`);
    } catch (err) {
      console.error('Failed to block IP:', err);
      setErrorFeedback('Firewall error. Deploy Firestore rules or verify client permissions.');
    }
  };

  // Unblock an IP address
  const handleUnblockIp = async (ip: string) => {
    try {
      const blockRef = doc(db, 'blockedIps', ip);
      await deleteDoc(blockRef);
      setSuccessFeedback(`IP Address ${ip} removed from firewall blacklist.`);
    } catch (err) {
      console.error('Failed to unblock IP:', err);
      setErrorFeedback(`Failed to lift IP block on: ${ip}`);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 shadow-xl">
      <h3 className="text-xs font-bold text-emerald-400 border-b border-zinc-900 pb-2.5 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
        <ShieldAlert className="w-4 h-4 text-emerald-500/70" />
        <span>IP Firewall Rule Set</span>
      </h3>

      {/* Admin Current IP Address Diagnostic */}
      {adminIp && (
        <div className="mb-4 p-2.5 bg-zinc-900/30 border border-zinc-900 rounded flex items-center justify-between text-[10px] font-mono">
          <span className="text-zinc-500 uppercase tracking-wide">Your IP Signature:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-300 font-bold">{adminIp}</span>
            {blockedIps.includes(adminIp) ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/25 text-rose-400 font-bold uppercase text-[7px] tracking-widest animate-pulse">
                Blocked
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/25 text-emerald-400 font-bold uppercase text-[7px] tracking-widest">
                Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {errorFeedback && (
        <div className="bg-rose-950/25 border border-rose-500/30 text-rose-400 text-[10px] p-2.5 rounded font-mono mb-3 leading-relaxed">
          [ERROR] {errorFeedback}
        </div>
      )}

      {successFeedback && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] p-2.5 rounded font-mono mb-3 leading-relaxed">
          [SUCCESS] {successFeedback}
        </div>
      )}

      {/* Block IP Form */}
      <form onSubmit={handleBlockIpSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newIpToBlock}
          onChange={(e) => setNewIpToBlock(e.target.value)}
          placeholder="Suspend IP (e.g. 192.168.1.1)"
          required
          className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors font-mono"
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-950/40 text-rose-400 text-[10px] font-bold rounded transition-colors uppercase font-mono tracking-wider cursor-pointer"
        >
          Suspend
        </button>
      </form>

      {/* Firewall List */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
        <span className="text-[9px] uppercase text-zinc-500 block font-bold mb-2 tracking-wider font-mono">
          BLACKLISTED IP ADDRESSES ({blockedIps.length})
        </span>
        
        {isFirewallLoading ? (
          <div className="text-[10px] text-zinc-600 flex items-center gap-1.5 py-4 font-mono">
            <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
            <span>Querying firewall configuration...</span>
          </div>
        ) : blockedIps.length === 0 ? (
          <div className="text-[10px] text-zinc-600 italic bg-zinc-900/20 p-4 border border-zinc-900 rounded text-center font-mono">
            Firewall is clean. No device bans issued.
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
        <strong className="text-zinc-400 block font-mono mb-0.5 uppercase text-[8px] tracking-wide">
          Automatic Enforcement:
        </strong>
        Blocked devices will be blocked in the middleware layer. They will not be able to create new posts or interact with any active venom feeds.
      </div>
    </div>
  );
};
