import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface BlockStatus {
  isBlocked: boolean;
  timeLeftLabel?: string;
  blockType?: '15days' | '30days' | 'permanent';
  reason?: string;
  expiresAt?: string;
  blockCount?: number;
  totalReports?: number;
}

/**
 * Checks if a client's IP is active or blocked.
 * If a temporary block has expired, it automatically updates the database to lift the ban.
 */
export async function checkIpBlockStatus(ip: string): Promise<BlockStatus> {
  if (!ip) return { isBlocked: false };
  try {
    const blockRef = doc(db, 'blockedIps', ip);
    const blockSnap = await getDoc(blockRef);
    if (!blockSnap.exists()) {
      return { isBlocked: false };
    }
    
    const data = blockSnap.data();
    if (!data.isBlocked) {
      return { isBlocked: false };
    }
    
    // Check if the block has expired
    if (data.expiresAt) {
      const expires = new Date(data.expiresAt);
      const now = new Date();
      if (now >= expires) {
        // Expired! Update database to unblock IP while preserving blockCount (offense tier)
        await updateDoc(blockRef, {
          isBlocked: false,
          expiresAt: null,
          blockedAt: null,
          totalReports: 0
        });
        return { isBlocked: false };
      } else {
        // Formulate remaining duration details
        const diffMs = expires.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        let label = '';
        if (diffDays > 0) label += `${diffDays}d `;
        if (diffHours > 0 || diffDays > 0) label += `${diffHours}h `;
        label += `${diffMins}m remaining`;
        
        return {
          isBlocked: true,
          timeLeftLabel: label,
          blockType: data.blockType,
          reason: data.reason,
          expiresAt: data.expiresAt,
          blockCount: data.blockCount,
          totalReports: data.totalReports
        };
      }
    } else {
      // Permanent block
      return {
        isBlocked: true,
        timeLeftLabel: 'Permanent Ban',
        blockType: 'permanent',
        reason: data.reason,
        blockCount: data.blockCount,
        totalReports: data.totalReports
      };
    }
  } catch (error) {
    console.error('Error checking block status:', error);
    return { isBlocked: false };
  }
}
