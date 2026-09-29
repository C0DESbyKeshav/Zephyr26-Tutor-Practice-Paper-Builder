import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, RotateCcw } from 'lucide-react';
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
    if (window.confirm('Reset all 15 students, practice papers, and analytics to clean initial state?')) {
      localDb.resetToInitialSeed();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleManualSync}
        title="Local-first SQLite sync engine. Click to flush mutations to Supabase."
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          padding: '6px 12px',
          borderRadius: '8px',
          color: syncStatus.isOnline ? '#059669' : '#D97706',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease',
        }}
      >
        {syncStatus.isSyncing ? (
          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
        ) : syncStatus.isOnline ? (
          <Wifi size={13} />
        ) : (
          <WifiOff size={13} />
        )}

        <span>
          {syncStatus.isSyncing
            ? 'Syncing to Cloud...'
            : syncStatus.pendingCount > 0
            ? `${syncStatus.pendingCount} Queued Offline`
            : syncStatus.isOnline
            ? 'Local SQLite • Synced'
            : 'Offline (Local-First)'}
        </span>
      </button>

      <button
        onClick={handleResetData}
        title="Reset 15 Students, Papers & Analytics for fresh evaluation"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          padding: '6px 10px',
          borderRadius: '8px',
          color: '#64748B',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <RotateCcw size={12} />
        <span>Reset Seed</span>
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
