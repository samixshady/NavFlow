'use client';

import { useEffect, useState } from 'react';

const styles = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes check-bounce {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  .backend-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #9ca3af;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(72, 0, 255, 0.1);
    transition: all 0.3s ease;
  }

  .backend-status.loading {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.2);
    background: rgba(245, 158, 11, 0.05);
  }

  .backend-status.online {
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.05);
  }

  .status-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(245, 158, 11, 0.3);
    border-top: 2px solid #f59e0b;
    border-radius: 50%;
    animation: spin 1.5s linear infinite;
  }

  .status-check {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-check svg {
    width: 12px;
    height: 12px;
    stroke: #10b981;
    stroke-width: 2.5;
    fill: none;
    animation: check-bounce 0.4s ease-out;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f59e0b;
    animation: pulse 2s ease-in-out infinite;
  }

  .status-dot.online {
    background: #10b981;
    animation: none;
  }
`;

interface BackendStatusLoaderProps {
  isLoading: boolean;
}

export default function BackendStatusLoader({ isLoading }: BackendStatusLoaderProps) {
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    if (!isLoading) {
      setStatus('loading');
      return;
    }

    // Try to reach backend
    const checkBackend = async () => {
      try {
        const response = await fetch('https://navflow-api.onrender.com/api/health/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setStatus('success');
        }
      } catch (error) {
        // Retry
      }
    };

    // Initial check
    checkBackend();

    // Retry every 2 seconds
    const retryInterval = setInterval(checkBackend, 2000);

    return () => {
      clearInterval(retryInterval);
    };
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <>
      <style>{styles}</style>
      {status === 'loading' ? (
        <div className="backend-status loading">
          <div className="status-spinner"></div>
          <span>Backend server starting...</span>
        </div>
      ) : (
        <div className="backend-status online">
          <div className="status-check">
            <svg viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span>Backend server online</span>
        </div>
      )}
    </>
  );
}
