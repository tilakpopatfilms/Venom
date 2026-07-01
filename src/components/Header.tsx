/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Shield, RefreshCw, Menu, HelpCircle, ShieldAlert, BookOpen, Download } from 'lucide-react';

interface HeaderProps {
  onNewPostClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onShowGuidelines: () => void;
  onShowPolicies: () => void;
  onNavigate: (path: string) => void;
}

export default function Header({
  onNewPostClick,
  onRefresh,
  isRefreshing,
  onShowGuidelines,
  onShowPolicies,
  onNavigate,
}: HeaderProps) {
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  return (
    <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <img 
            src="https://i.ibb.co/RpqhT7QZ/14893-removebg-preview.png" 
            alt="Venom Logo" 
            className="w-11 h-11 object-contain select-none drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-transform duration-500 hover:scale-110 active:scale-95 cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={() => onNavigate('/')}
          />
          <div className="cursor-pointer" onClick={() => onNavigate('/')}>
            <h1 className="text-lg font-black tracking-widest font-display text-emerald-400 select-none">
              VENOM
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase select-none">
              Official Hub
            </p>
          </div>
        </div>

        {/* Action Controls - Menu beside Refresh, beside Create Post */}
        <div className="flex items-center gap-2">
          
          {/* Menu Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="p-2 border border-zinc-850 hover:border-emerald-500/30 rounded bg-zinc-900/40 hover:bg-zinc-950 text-zinc-300 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Menu Options"
            >
              <Menu className="w-4 h-4" />
              <span className="text-[10px] font-bold font-mono uppercase hidden sm:inline">MENU</span>
            </button>
            {showMenuDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-900 rounded-md shadow-2xl z-50 py-1 text-xs font-mono text-zinc-400">
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onNavigate('/guidelines');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2 cursor-pointer transition-colors block font-mono"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Guidelines</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onNavigate('/policies');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2 cursor-pointer transition-colors block font-mono"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Policies</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onNavigate('/report');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2 cursor-pointer transition-colors block font-mono"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500/60" />
                  <span>Report Post</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    const pwaPrompt = (window as any).pwaInstallPrompt;
                    if (pwaPrompt) {
                      pwaPrompt.prompt();
                      pwaPrompt.userChoice.then((choiceResult: any) => {
                        if (choiceResult.outcome === 'accepted') {
                          console.log('User installed Main PWA from Header');
                        }
                      });
                    } else {
                      alert("To Download the Venom App:\n\n1. In your browser's menu (e.g. Chrome's three dots, or Safari's Share icon), click 'Add to Home Screen' or 'Install App'.\n\nThis PWA runs fully as a standalone app.");
                    }
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2 cursor-pointer transition-colors block font-mono border-t border-zinc-900/60"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Download App</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 border border-zinc-850 hover:border-emerald-500/30 rounded bg-zinc-900/40 hover:bg-zinc-950 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 transition-colors cursor-pointer"
            title="Reload Feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Create Post Button */}
          <button
            onClick={onNewPostClick}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-sans font-bold tracking-wide rounded transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            + Create Post
          </button>

        </div>
      </div>
    </header>
  );
}
