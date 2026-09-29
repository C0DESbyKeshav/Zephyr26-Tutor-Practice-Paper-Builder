import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, RotateCcw } from 'lucide-react';
import { localDb } from '../database/localDb';
import type { SyncStatus } from '../types';

export const OfflinePill: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(localDb.getSyncStatus());

  useEffect(() => {
    const unsubscribe = localDb.subscribe(() => {
      setSyncStatus(localDb.getSyncStatus());
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    await localDb.flushSyncQueue();
  };

  const handleResetData = () => {
    if (window.confirm('Reset all students and practice papers to initial demo state?')) {
      localDb.resetToInitialSeed();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleManualSync}
        title="Everything is automatically saved on this device even without internet."
        className="btn-duo btn-duo-white"
        style={{
          padding: '8px 14px',
          fontSize: '13px',
          borderRadius: '14px',
          color: syncStatus.isOnline ? '#059669' : '#D97706',
        }}
      >
        {syncStatus.isSyncing ? (
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
        ) : syncStatus.isOnline ? (
          <Cloud size={15} />
        ) : (
          <CloudOff size={15} />
        )}

        <span>
          {syncStatus.isSyncing
            ? 'Saving...'
            : syncStatus.pendingCount > 0
            ? `${syncStatus.pendingCount} Saved Offline`
            : 'Saved & Ready'}
        </span>
      </button>

      <button
        onClick={handleResetData}
        title="Reset demo data"
        className="btn-duo btn-duo-white"
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '14px',
          color: '#6B7280',
        }}
      >
        <RotateCcw size={14} />
        <span>Reset</span>
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
