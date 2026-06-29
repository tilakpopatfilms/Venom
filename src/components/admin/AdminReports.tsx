import React, { useState, useEffect } from 'react';
import { collection, doc, deleteDoc, updateDoc, setDoc, getDoc, onSnapshot, query, orderBy, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShieldAlert, Lock, Key, ChevronLeft, RefreshCw, Trash2, Check, Unlock, Clock, Plus, Minus, Server, HelpCircle, ExternalLink, Search, Eye, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { submitPostReport } from '../../utils/reports';

export default function AdminReports() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active view tab state: 'reports' | 'firewall' | 'submit-report'
  const [activeTab, setActiveTab] = useState<'reports' | 'firewall' | 'submit-report'>('reports');

  // Real-time Firestore data
  const [reports, setReports] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isLoadingIps, setIsLoadingIps] = useState(true);

  // Actions loading indicator
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Submit Threat Report State
  const [postIdToReport, setPostIdToReport] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [opinion, setOpinion] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPost, setVerifiedPost] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<any | null>(null);

  // Check login session on load
  useEffect(() => {
    const authSession = sessionStorage.getItem('venom_admin_auth');
    if (authSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Real-time Reports listener
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoadingReports(true);

    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(reportsRef, (snap) => {
      const fetched = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];
      // Sort client-side in case createdAt field index is building
      fetched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setReports(fetched);
      setIsLoadingReports(false);
    }, (err) => {
      console.error("Failed to read reports:", err);
      setIsLoadingReports(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Real-time Blocked IPs listener
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoadingIps(true);

    const ipsRef = collection(db, 'blockedIps');
    const unsubscribe = onSnapshot(ipsRef, (snap) => {
      const fetched = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setBlockedIps(fetched);
      setIsLoadingIps(false);
    }, (err) => {
      console.error("Failed to read blocked IPs:", err);
      setIsLoadingIps(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Handle administrator credentials authentication
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (username === 'theakshatpopat' && password === 'Aprt9311') {
      setIsAuthenticated(true);
      sessionStorage.setItem('venom_admin_auth', 'true');
      setUsername('');
      setPassword('');
    } else {
      setLoginError('Invalid administrator credentials. Authentication denied.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('venom_admin_auth');
  };

  // DISMISS / DELETE A SINGLE REPORT (Keep the post)
  const handleDismissReport = async (reportId: string, postId: string) => {
    setActioningId(reportId);
    try {
      // 1. Delete the report document
      await deleteDoc(doc(db, 'reports', reportId));

      // 2. Safely decrement report count in the post document
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const pd = postSnap.data();
        const currentCount = pd.reportsCount || 0;
        await updateDoc(postRef, {
          reportsCount: Math.max(0, currentCount - 1)
        });
      }
    } catch (err) {
      console.error("Dismiss failed:", err);
      alert("Failed to dismiss report.");
    } finally {
      setActioningId(null);
    }
  };

  // PURGE / DELETE A POST FROM REPORT (Auto-marks related reports as processed/deleted)
  const handlePurgePost = async (reportId: string, postId: string) => {
    if (!confirm(`Confirm absolute purging of post ${postId}? This deletes it from the public feed.`)) {
      return;
    }
    setActioningId(reportId);
    try {
      // Flag the post as deleted in posts collection
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        isDeleted: true,
        reportsCount: 10 // ensure it stays deleted
      });

      // Clear the triggering report
      await deleteDoc(doc(db, 'reports', reportId));
      alert("Post purged. Content is now deleted from the user feed.");
    } catch (err) {
      console.error("Purge failed:", err);
      alert("Failed to purge post.");
    } finally {
      setActioningId(null);
    }
  };

  // MANUAL IP BLACKLIST BLOCK
  const handleManualBlockIp = async (ip: string, customDays = 15) => {
    if (!ip) return;
    try {
      const blockRef = doc(db, 'blockedIps', ip);
      const exp = new Date();
      exp.setDate(exp.getDate() + customDays);

      await setDoc(blockRef, {
        ip,
        isBlocked: true,
        blockCount: 1,
        totalReports: 0,
        blockedAt: new Date().toISOString(),
        expiresAt: exp.toISOString(),
        blockType: customDays === 15 ? '15days' : '30days',
        reason: `Manual administrative ban initiated from report console (${customDays} Days).`
      }, { merge: true });

      alert(`IP ${ip} blocked successfully for ${customDays} days.`);
    } catch (err) {
      console.error("IP block failed:", err);
      alert("Failed to block IP.");
    }
  };

  // LIFT IP BLOCK (UNBLOCK)
  const handleUnblockIp = async (ip: string) => {
    try {
      const blockRef = doc(db, 'blockedIps', ip);
      await updateDoc(blockRef, {
        isBlocked: false,
        expiresAt: null,
        blockedAt: null,
        totalReports: 0
      });
      alert(`IP Address ${ip} has been successfully unblocked.`);
    } catch (err) {
      console.error("Failed to lift ban:", err);
      alert("Failed to unblock IP.");
    }
  };

  // ADJUST EXPRIY TIME (+/- Days)
  const handleAdjustExpiry = async (ip: string, daysOffset: number) => {
    try {
      const blockRef = doc(db, 'blockedIps', ip);
      const snap = await getDoc(blockRef);
      if (!snap.exists()) return;

      const data = snap.data();
      if (!data.isBlocked || !data.expiresAt) {
        alert("Cannot adjust duration for permanent or unblocked IP addresses.");
        return;
      }

      const currentExpiry = new Date(data.expiresAt);
      currentExpiry.setDate(currentExpiry.getDate() + daysOffset);

      // If the adjusted time is in the past, unblock the IP automatically
      if (currentExpiry <= new Date()) {
        await updateDoc(blockRef, {
          isBlocked: false,
          expiresAt: null,
          blockedAt: null,
          totalReports: 0
        });
        alert(`Suspension adjusted below zero. IP ${ip} has been unblocked.`);
      } else {
        await updateDoc(blockRef, {
          expiresAt: currentExpiry.toISOString()
        });
        alert(`IP suspension duration ${daysOffset > 0 ? 'increased' : 'decreased'} by ${Math.abs(daysOffset)} day(s).`);
      }
    } catch (err) {
      console.error("Failed to adjust expiry:", err);
      alert("Failed to update suspension expiry.");
    }
  };

  // VERIFY POST (ADMIN REPORT WORKFLOW)
  const handleVerifyPostAdmin = async () => {
    const targetId = postIdToReport.trim();
    if (!targetId) return;

    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedPost(null);

    try {
      // 1. Try matching directly by Document ID
      const postRef = doc(db, 'posts', targetId);
      const snap = await getDoc(postRef);

      let matchedDoc: any = null;
      if (snap.exists()) {
        matchedDoc = { id: snap.id, ...snap.data() };
      } else {
        // 2. Try querying by encryptedHash field
        const q = query(collection(db, 'posts'), where('encryptedHash', '==', targetId), limit(1));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const docSnap = querySnap.docs[0];
          matchedDoc = { id: docSnap.id, ...docSnap.data() };
        }
      }

      if (matchedDoc) {
        if (matchedDoc.isDeleted) {
          setVerificationError('This post is already deleted or suspended by system moderation.');
        } else {
          setVerifiedPost(matchedDoc);
        }
      } else {
        setVerificationError('Post ID not found. Verify character spelling and try again.');
      }
    } catch (err: any) {
      console.error('Admin post verification failed:', err);
      setVerificationError(`Verification failed: ${err.message || err}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // SUBMIT REPORT (ADMIN REPORT WORKFLOW)
  const handleSubmitReportAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPost) {
      setSubmitError('You must verify a valid Post ID before submitting a security report.');
      return;
    }
    if (!selectedReason) {
      setSubmitError('Selectable reason of report is compulsory.');
      return;
    }

    setIsSubmittingReport(true);
    setSubmitError(null);

    try {
      // Use system/admin reporter tag or fallback to a dedicated identifier
      const reporterIp = 'ADMIN_CONSOLE';
      const result = await submitPostReport(verifiedPost.id, selectedReason, opinion, reporterIp);
      setSubmitResult(result);
    } catch (err: any) {
      console.error('Admin report submission failed:', err);
      setSubmitError(err.message || 'Failed to submit security report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const resetReportFormAdmin = () => {
    setPostIdToReport('');
    setSelectedReason('');
    setOpinion('');
    setVerifiedPost(null);
    setVerificationError(null);
    setSubmitError(null);
    setSubmitResult(null);
  };

  // FORMAT TIME REMAINING
  const formatTimeLeft = (expiresAtStr?: string) => {
    if (!expiresAtStr) return 'Permanent';
    const expires = new Date(expiresAtStr);
    const now = new Date();
    if (now >= expires) return 'Expired (Awaiting reload)';

    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let label = '';
    if (diffDays > 0) label += `${diffDays}d `;
    if (diffHours > 0 || diffDays > 0) label += `${diffHours}h `;
    label += `${diffMins}m left`;
    return label;
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-300 font-mono flex flex-col selection:bg-emerald-500/30 selection:text-emerald-100 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent z-10" />

      {/* ADMIN TITLE / CONSOLE STATUS BAR */}
      <header className="border-b border-zinc-900 bg-black/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-zinc-100 tracking-widest flex items-center gap-1.5 leading-none">
                <span>Venom Moderator Console</span>
                <span className="text-zinc-600">/</span>
                <span className="text-rose-400 font-bold bg-rose-950/20 px-1 py-0.5 rounded text-[8px]">
                  {isAuthenticated ? 'THREAT REPORT TERMINAL' : 'SECURE PATHWAY'}
                </span>
              </span>
              <p className="text-[8px] text-zinc-600 uppercase tracking-tight mt-0.5 font-sans">
                {isAuthenticated ? 'Live sync: reports & device quarantine assets' : 'Authorized credentials matching node required'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Redirect back to homepage */}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer"
            >
              Feed Home
            </button>
            
            {/* Redirect back to admin console in a new tab */}
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold rounded transition-colors uppercase tracking-wider flex items-center gap-1"
            >
              <span>Admin Console</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ROUTING SHELL */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* LOGIN PROMPT */
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex-1 flex items-center justify-center p-4 min-h-[75vh]"
          >
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col items-center justify-center text-center mb-6">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                </div>
                <h2 className="text-xs font-black tracking-widest text-zinc-100 uppercase">REPORT MODERATION SECURE LOG</h2>
                <p className="text-[9px] text-zinc-500 mt-1 uppercase">Enter Level 4 Clearance passphrases</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 text-[9px] p-2.5 rounded leading-relaxed border-l-2 border-l-rose-500">
                    [BREACH WARNING]: {loginError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-zinc-500 block font-bold tracking-wider">SYSTEM IDENTITY (ADMIN)</label>
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
                  <label className="text-[8px] uppercase text-zinc-500 block font-bold tracking-wider">CRYPTOGRAPHIC KEY (PASSWORD)</label>
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
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[10px] rounded transition-all uppercase mt-6 cursor-pointer tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>INITIALIZE THREAT LOG</span>
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* LEVEL 4 MODERATION CONSOLE */
          <motion.main 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6"
          >
            {/* TABS SELECTOR */}
            <div className="flex border-b border-zinc-900 font-mono text-[11px] gap-2">
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 border-t-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                  activeTab === 'reports' 
                    ? 'border-emerald-500 bg-zinc-950 text-emerald-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Active Post Reports ({reports.length})
              </button>
              <button
                onClick={() => setActiveTab('firewall')}
                className={`px-4 py-2 border-t-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                  activeTab === 'firewall' 
                    ? 'border-emerald-500 bg-zinc-950 text-emerald-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Quarantined & Blocked IPs ({blockedIps.filter(b => b.isBlocked).length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('submit-report');
                  resetReportFormAdmin();
                }}
                className={`px-4 py-2 border-t-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                  activeTab === 'submit-report' 
                    ? 'border-emerald-500 bg-zinc-950 text-emerald-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Submit Threat Report
              </button>
            </div>

            {/* TAB CONTENT: ACTIVE REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-widest">
                    VENOM THREAT REPORT FEEDBACK ({reports.length} SYSTEM ENTRIES)
                  </span>
                </div>

                {isLoadingReports ? (
                  <div className="text-center py-12 text-xs text-zinc-600 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Synchronizing active database complaints...</span>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="border border-zinc-900 bg-zinc-950/20 text-center py-16 rounded-lg text-xs text-zinc-500 italic">
                    All clear. No unresolved user complaints detected in the active buffer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {reports.map((rep) => (
                      <div 
                        key={rep.id}
                        className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 space-y-3 shadow-lg hover:border-zinc-850 transition-all"
                      >
                        {/* Top info row */}
                        <div className="flex flex-wrap items-center justify-between border-b border-zinc-900/60 pb-2 gap-2 text-[10px] text-zinc-500">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-rose-400 font-black bg-rose-950/20 px-1.5 py-0.5 border border-rose-900/30 rounded text-[9px] tracking-widest uppercase">
                              REASON: {rep.reason?.toUpperCase()}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-zinc-400">Post ID: {rep.postId}</span>
                          </div>
                          <span className="text-zinc-600 font-mono text-[9px]">
                            REPORTED: {new Date(rep.createdAt || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Core database explorer information view */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[10.5px]">
                          
                          {/* Left column: Post data */}
                          <div className="space-y-1.5 bg-zinc-900/20 p-3 rounded border border-zinc-900/60">
                            <span className="text-[8px] text-zinc-500 font-bold tracking-wider uppercase block">
                              POST CONTENT IN DATABASE (EXPLORER DATA)
                            </span>
                            {rep.postTitle && (
                              <div className="text-zinc-200 font-bold uppercase tracking-tight text-[11px]">
                                {rep.postTitle}
                              </div>
                            )}
                            <div className="text-zinc-400 font-sans leading-relaxed text-xs">
                              "{rep.postContent || '(No content payload)'}"
                            </div>
                            <div className="pt-2 text-[9px] text-zinc-500 flex flex-wrap gap-2 border-t border-zinc-900/40 mt-2">
                              <span>AUTHOR IP: <strong className="text-zinc-300">{rep.postedFromIp || '127.0.0.1'}</strong></span>
                              <span>•</span>
                              <a 
                                href={`/?id=${rep.postId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>Preview</span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            </div>
                          </div>

                          {/* Right column: Reporter comments */}
                          <div className="space-y-1.5 bg-rose-950/5 p-3 rounded border border-rose-500/10 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[8px] text-rose-400/80 font-bold tracking-wider uppercase block">
                                USER OPINION / EXPLANATORY COMPLAINT
                              </span>
                              <p className="text-zinc-300 font-sans text-xs italic leading-relaxed">
                                "{rep.opinion || '(No opinion comment left. Reason submitted only.)'}"
                              </p>
                            </div>
                            <div className="pt-2 text-[9px] text-zinc-500 border-t border-zinc-900/40">
                              REPORTER SIGNATURE IP: <strong className="text-zinc-300">{rep.reporterIp}</strong>
                            </div>
                          </div>

                        </div>

                        {/* Action controllers */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900/40 font-mono text-[10px]">
                          {/* Dismiss single report */}
                          <button
                            onClick={() => handleDismissReport(rep.id, rep.postId)}
                            disabled={actioningId === rep.id}
                            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center gap-1 uppercase font-bold"
                            title="Dismiss complaints and keep post active"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Dismiss Report</span>
                          </button>

                          {/* Destructive post purging */}
                          <button
                            onClick={() => handlePurgePost(rep.id, rep.postId)}
                            disabled={actioningId === rep.id}
                            className="px-3 py-1.5 bg-rose-950/10 border border-rose-950/40 hover:border-rose-500 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer flex items-center gap-1 uppercase font-bold"
                            title="Destructive complete post purging"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Purge Post</span>
                          </button>

                          {/* Instantly block author IP */}
                          {rep.postedFromIp && (
                            <button
                              onClick={() => handleManualBlockIp(rep.postedFromIp, 15)}
                              className="px-3 py-1.5 bg-zinc-950 border border-zinc-900 hover:border-rose-500/40 text-rose-500 hover:text-rose-400 rounded transition-all cursor-pointer flex items-center gap-1 uppercase font-bold"
                              title="Ban Author IP for 15 Days"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                              <span>Ban Author IP (15d)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: QUARANTINE FIREWALL */}
            {activeTab === 'firewall' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-widest">
                    QUARANTINE DEVICES & IP BLACKLIST MATRIX ({blockedIps.filter(b => b.isBlocked).length} SIGNATURES ACTIVE)
                  </span>
                </div>

                {isLoadingIps ? (
                  <div className="text-center py-12 text-xs text-zinc-600 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Querying firewall configuration blocks...</span>
                  </div>
                ) : blockedIps.length === 0 ? (
                  <div className="border border-zinc-900 bg-zinc-950/20 text-center py-16 rounded-lg text-xs text-zinc-500 italic font-mono">
                    Firewall is clean. No device bans in database.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 font-mono text-[11px]">
                    {blockedIps.map((block) => (
                      <div 
                        key={block.ip}
                        className={`p-4 border rounded-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          block.isBlocked 
                            ? 'bg-zinc-950 border-rose-500/20 hover:border-rose-500/35' 
                            : 'bg-zinc-900/10 border-zinc-900 text-zinc-500'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* IP and status */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`font-bold ${block.isBlocked ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
                              IP: {block.ip}
                            </span>
                            {block.isBlocked ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950/30 border border-rose-500/20 text-rose-400 font-bold uppercase text-[7.5px] tracking-widest flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>SUSPENDED</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold uppercase text-[7.5px] tracking-widest">
                                LIFTED / CLEAN
                              </span>
                            )}
                            <span className="text-zinc-600 font-bold">•</span>
                            <span className="text-[9px] text-zinc-500 uppercase">OFFENSE LEVEL: {block.blockCount || 0}</span>
                          </div>

                          {/* Reason */}
                          <div className="text-[10px] leading-relaxed text-zinc-400">
                            <strong>REASON:</strong> {block.reason || 'Manual suspension issued.'}
                          </div>

                          {/* Time detail */}
                          {block.isBlocked && (
                            <div className="text-[10px] text-emerald-400 flex items-center gap-2 pt-0.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-500" />
                              <span>
                                <strong>TIME REMAINING:</strong>{' '}
                                <span className="font-bold underline text-white">
                                  {formatTimeLeft(block.expiresAt)}
                                </span>
                              </span>
                              <span className="text-zinc-600">|</span>
                              <span className="text-[9px] text-zinc-500">
                                Blocked: {block.blockedAt ? new Date(block.blockedAt).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Adjust and action controls */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto">
                          {block.isBlocked && block.expiresAt && (
                            <div className="flex items-center border border-zinc-800 bg-zinc-900/40 rounded overflow-hidden text-[9px] font-bold">
                              <button
                                onClick={() => handleAdjustExpiry(block.ip, -1)}
                                className="px-2.5 py-1.5 hover:bg-zinc-800 text-rose-400 flex items-center gap-0.5 uppercase tracking-wide cursor-pointer border-r border-zinc-850"
                                title="Decrease suspension by 1 Day"
                              >
                                <Minus className="w-3 h-3" />
                                <span>-1 Day</span>
                              </button>
                              <span className="px-2 text-zinc-400 select-none">ADJUST</span>
                              <button
                                onClick={() => handleAdjustExpiry(block.ip, 1)}
                                className="px-2.5 py-1.5 hover:bg-zinc-800 text-emerald-400 flex items-center gap-0.5 uppercase tracking-wide cursor-pointer border-l border-zinc-850"
                                title="Increase suspension by 1 Day"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+1 Day</span>
                              </button>
                            </div>
                          )}

                          {block.isBlocked ? (
                            <button
                              onClick={() => handleUnblockIp(block.ip)}
                              className="px-3 py-1.5 bg-emerald-950/20 border border-emerald-500/25 hover:border-emerald-500 hover:bg-emerald-950/40 text-emerald-400 text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-1"
                              title="Unban IP Address"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Lift Ban</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleManualBlockIp(block.ip, 15)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer"
                              title="Restore default 15 days ban"
                            >
                              Restore Block
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SUBMIT REPORT */}
            {activeTab === 'submit-report' && (
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="space-y-1.5 border-b border-zinc-900 pb-4">
                  <h2 className="text-sm font-black text-white tracking-widest uppercase font-mono">
                    ADMIN-INITIATED COMPLAINT REGISTRATION
                  </h2>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                    Register a community policy violation against a specific Venom post
                  </p>
                </div>

                {submitResult ? (
                  /* Success Notice */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border border-emerald-500/30 bg-emerald-950/10 p-6 rounded-xl text-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-xs mx-auto">
                      <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest">
                        REPORT FILED SUCCESSFULLY
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                        The complaint has been successfully indexed. System security policies have been evaluated.
                      </p>
                    </div>

                    {submitResult.blockTriggered && (
                      <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-md text-[10px] text-rose-400 text-left max-w-md mx-auto space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          AUTOMATED FIREWALL TRIGGERED
                        </span>
                        <p className="font-sans text-zinc-400">
                          The author IP (<strong className="text-white">{submitResult.authorIp}</strong>) has accumulated 50+ total security reports. Writing access has been suspended.
                        </p>
                        <div className="pt-1.5 font-mono text-[9px] text-zinc-500">
                          <span>EXPIRY: {submitResult.expiresAt ? new Date(submitResult.expiresAt).toLocaleString() : 'Permanent'}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={resetReportFormAdmin}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 text-[10px] font-bold rounded uppercase tracking-widest cursor-pointer font-mono"
                      >
                        File Another Report
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmitReportAdmin} className="space-y-5 text-xs font-mono">
                    
                    {submitError && (
                      <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3 rounded leading-relaxed border-l-2 border-l-rose-500 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>SUBMISSION DENIED:</strong> {submitError}
                        </div>
                      </div>
                    )}

                    {/* Stage 1: Post ID Search Input */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase text-zinc-500 block font-bold tracking-wider">
                        STEP 1: VERIFY TARGET POST ID / ENCRYPTED HASH
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={postIdToReport}
                            onChange={(e) => {
                              setPostIdToReport(e.target.value);
                              if (verifiedPost) setVerifiedPost(null);
                            }}
                            placeholder="e.g. SEC-585631-951B0D-..."
                            className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500/30 rounded pl-9 pr-3 py-2 text-xs text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors uppercase"
                            disabled={isVerifying || isSubmittingReport}
                          />
                          <Search className="w-3.5 h-3.5 text-zinc-700 absolute left-3 top-2.5" />
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyPostAdmin}
                          disabled={!postIdToReport.trim() || isVerifying || isSubmittingReport}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 font-bold rounded transition-colors cursor-pointer uppercase text-[10px] flex items-center gap-1.5 select-none"
                        >
                          {isVerifying ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>Verify</span>
                        </button>
                      </div>
                      
                      {verificationError && (
                        <p className="text-rose-400 text-[10px] font-bold mt-1 uppercase flex items-center gap-1 leading-normal">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{verificationError}</span>
                        </p>
                      )}
                    </div>

                    {/* Verified Post Summary Panel */}
                    <AnimatePresence>
                      {verifiedPost && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="bg-emerald-950/5 border border-emerald-500/20 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>POST SECURELY VERIFIED</span>
                          </div>
                          
                          <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
                            {verifiedPost.title && (
                              <div className="text-zinc-200 font-bold uppercase tracking-wide">
                                {verifiedPost.title}
                              </div>
                            )}
                            <p className="text-zinc-400 font-sans text-xs italic bg-zinc-950/40 p-2.5 rounded border border-zinc-900/60 leading-relaxed">
                              "{verifiedPost.content || '(Image payload or Empty description)'}"
                            </p>
                            <div className="flex flex-wrap gap-2 text-[9px] text-zinc-500 pt-1 border-t border-zinc-900/40">
                              <span>CATEGORY: <strong className="text-zinc-300 uppercase">{verifiedPost.category || 'general'}</strong></span>
                              <span>•</span>
                              <span>AUTHOR IP: <strong className="text-zinc-300">{verifiedPost.postedFromIp || '127.0.0.1'}</strong></span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Stage 2: compulsory reason dropdown selection */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase text-zinc-500 block font-bold tracking-wider">
                        STEP 2: SELECT POLICY INFRACTION CATEGORY (COMPULSORY)
                      </label>
                      <select
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        required
                        disabled={!verifiedPost || isSubmittingReport}
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500/30 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none transition-colors disabled:opacity-40"
                      >
                        <option value="">-- Choose Infraction Category --</option>
                        <option value="Terrorism">Terrorism (Incitement, violence or threats)</option>
                        <option value="Drugs">Drugs (Illegal narcotics trafficking / promotion)</option>
                        <option value="Doxxing">Doxxing (Leaking private personal identity datasets)</option>
                        <option value="Harassment">Harassment (Targeted bullying / abusive slurs)</option>
                        <option value="Sexual content">Sexual content (Adult materials / non-consensual imagery)</option>
                        <option value="Scams">Scams (Fraudulent schemes / phishing URLs)</option>
                        <option value="Spam">Spam (Repeated bots / promotional duplication)</option>
                        <option value="Other">Other (General guidelines & safety violations)</option>
                      </select>
                    </div>

                    {/* Stage 3: explanatory comment (optional option) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] uppercase text-zinc-500 block font-bold tracking-wider">
                          STEP 3: EXPLANATORY COMPLAINT DETAIL (OPTIONAL)
                        </label>
                        <span className="text-[8px] text-zinc-600 font-bold font-mono uppercase bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                          OPTIONAL
                        </span>
                      </div>
                      <textarea
                        value={opinion}
                        onChange={(e) => setOpinion(e.target.value)}
                        placeholder="Explain why this node violates community guidelines (max 400 chars)..."
                        disabled={!verifiedPost || isSubmittingReport}
                        maxLength={400}
                        rows={4}
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500/30 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none placeholder-zinc-700 transition-colors disabled:opacity-40 font-sans"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!verifiedPost || !selectedReason || isSubmittingReport}
                      className="w-full py-2.5 bg-rose-950/20 hover:bg-rose-950/40 disabled:opacity-30 disabled:hover:bg-rose-950/20 border border-rose-500/30 text-rose-400 font-black text-[10px] rounded transition-all uppercase tracking-widest cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/10"
                    >
                      {isSubmittingReport ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>REGISTRATION ACTIVE...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>REGISTER CONSOLE COMPLAINT</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
