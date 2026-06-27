/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Shield, Download, RefreshCw, Terminal, EyeOff, Check, AlertTriangle, Menu, HelpCircle, ShieldAlert, Key } from 'lucide-react';
import { getOperativeID } from '../utils/crypto';

interface HeaderProps {
  onNewPostClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeCategory: string;
  onCategorySelect: (category: string) => void;
  totalVenomsCount: number;
  onShowGuidelines: () => void;
  onShowPolicies: () => void;
  onShowTips: () => void;
}

export default function Header({
  onNewPostClick,
  onRefresh,
  isRefreshing,
  activeCategory,
  onCategorySelect,
  totalVenomsCount,
  onShowGuidelines,
  onShowPolicies,
  onShowTips,
}: HeaderProps) {
  const [opId, setOpId] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  useEffect(() => {
    setOpId(getOperativeID());

    // Listen for standard Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running in standalone mode (PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setPwaInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // Show elegant helpful PWA manual guide for iOS/others
      setShowPwaGuide(true);
    }
  };

  const categories = [
    { id: 'all', label: 'ALL CHANNELS' },
    { id: 'general', label: '#GENERAL' },
    { id: 'tech', label: '#TECH' },
    { id: 'design', label: '#DESIGN' },
    { id: 'gaming', label: '#GAMING' },
    { id: 'lifestyle', label: '#LIFESTYLE' },
  ];

  return (
    <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand Logo & Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 bg-emerald-950/20 border border-emerald-500/20 rounded-lg overflow-hidden">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-widest font-display text-emerald-400 bg-clip-text">
                  VENOM
                </h1>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans flex items-center gap-1 mt-0.5 font-medium">
                The Secure, Real-Time Social Hub.
              </p>
            </div>
          </div>

          {/* Mobile Action buttons */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 border border-zinc-800 rounded bg-zinc-900/50 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* System telemetry & Global Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end md:self-auto">
          {/* Operative local ID badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-500">ID:</span>
            <span className="text-emerald-400 font-bold">{opId || 'RESOLVING...'}</span>
          </div>

          {/* Counts badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900/40 border border-zinc-800/60 text-[11px] font-mono text-zinc-400">
            <span>POSTS:</span>
            <span className="text-emerald-500 font-semibold">{totalVenomsCount}</span>
          </div>

          {/* PWA download */}
          <button
            onClick={handleInstallClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded border text-[11px] font-mono transition-all ${
              pwaInstalled
                ? 'border-zinc-800/80 bg-zinc-900/40 text-zinc-500 cursor-default'
                : 'border-emerald-500/25 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20 hover:border-emerald-500/40'
            }`}
          >
            {pwaInstalled ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>INSTALLED</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>APP</span>
              </>
            )}
          </button>

          {/* New Post trigger */}
          <button
            onClick={onNewPostClick}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-sans font-bold tracking-wide rounded transition-all active:scale-95 cursor-pointer"
          >
            + Create Post
          </button>

          {/* Menu Dropdown Bars */}
          <div className="relative">
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="p-2 border border-zinc-800 hover:border-emerald-500/30 rounded bg-zinc-900/50 hover:bg-zinc-950 text-zinc-300 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Menu Options"
            >
              <Menu className="w-4 h-4" />
              <span className="text-[10px] font-bold font-mono uppercase hidden sm:inline">MENU</span>
            </button>
            {showMenuDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-900 rounded shadow-2xl z-50 py-1 text-xs font-mono text-zinc-400">
                <button
                  onClick={() => { onShowGuidelines(); setShowMenuDropdown(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Guidelines</span>
                </button>
                <button
                  onClick={() => { onShowPolicies(); setShowMenuDropdown(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Policies</span>
                </button>
                <button
                  onClick={() => { onShowTips(); setShowMenuDropdown(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Pro Tips</span>
                </button>
                <a
                  href="/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    setShowMenuDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-900 hover:text-emerald-400 flex items-center gap-2 border-t border-zinc-900/80"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>Admin Panel</span>
                </a>
              </div>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="hidden md:block p-2 border border-zinc-800 hover:border-emerald-500/30 rounded bg-zinc-900/50 hover:bg-zinc-900 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
            title="Reload feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="max-w-5xl mx-auto mt-4 pt-2 border-t border-zinc-900/60 overflow-x-auto scrollbar-none flex gap-1 sm:gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategorySelect(cat.id)}
            className={`px-3 py-1 rounded text-[10px] font-mono font-medium tracking-wider transition-all whitespace-nowrap border ${
              activeCategory === cat.id
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-emerald-400 hover:border-emerald-500/20'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* PWA manual installation dialog */}
      {showPwaGuide && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-lg p-6 max-w-sm w-full font-mono text-zinc-300 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-emerald-950 pb-3 mb-4">
              <Download className="w-5 h-5 animate-bounce" />
              <h3 className="text-sm font-bold tracking-widest uppercase">INSTALL VENOM CLIENT</h3>
            </div>
            
            <p className="text-xs leading-relaxed text-zinc-400 mb-4">
              Venom is a progressive web app (PWA) operating with total client-side sandbox isolation. To install on your device:
            </p>

            <div className="space-y-3.5 mb-5 text-xs text-zinc-300">
              <div className="flex gap-2 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                <span className="text-emerald-400 font-bold">iOS / Safari:</span>
                <span>Tap the Share icon <span className="text-emerald-400 font-semibold font-sans text-base leading-none">⎋</span> then select <strong className="text-zinc-100">Add to Home Screen</strong>.</span>
              </div>
              <div className="flex gap-2 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                <span className="text-emerald-400 font-bold">Android / Chrome:</span>
                <span>Tap the three dots icon <strong className="text-zinc-100">⋮</strong> then select <strong className="text-zinc-100">Install App</strong>.</span>
              </div>
              <div className="flex gap-2 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                <span className="text-emerald-400 font-bold">Desktop:</span>
                <span>Click the install icon in the browser address bar.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-900">
              <button
                onClick={() => setShowPwaGuide(false)}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 text-xs rounded transition-colors"
              >
                CLOSE CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
