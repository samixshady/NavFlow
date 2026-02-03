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
  const [showComponent, setShowComponent] = useState(true);

  useEffect(() => {
    if (!isLoading || !showComponent) {
      return;
    }

    // Check both API and Database connectivity
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
          // Determine backend URL based on environment
          const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
          const backendUrl = isLocalhost 
            ? 'http://localhost:8000' 
            : 'https://navflow-api.onrender.com';
          
          console.log('🌍 Environment:', isLocalhost ? 'localhost' : 'production', '| Backend URL:', backendUrl);

          // Check 1: Health endpoint (includes database check)
          console.log('🔍 Checking health endpoint...');
          const healthResponse = await fetch(`${backendUrl}/health/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            credentials: 'omit',
          });

          clearTimeout(timeout);
          console.log('📊 Health response status:', healthResponse.status);

          if (!healthResponse.ok) {
            console.log('❌ Health check failed with status:', healthResponse.status);
            return false;
          }

          const healthData = await healthResponse.json();
          console.log('📋 Health data:', healthData);

          // Verify database is connected
          const dbStatus = healthData.checks?.database;
          console.log('🗄️ Database status:', dbStatus);
          
          if (healthData.status !== 'healthy') {
            console.log('❌ Backend not healthy. Status:', healthData.status);
            return false;
          }

          if (dbStatus !== 'connected') {
            console.log('❌ Database not connected. Got:', dbStatus);
            return false;
          }

          // Check 2: API endpoint (verify API layer is working)
          console.log('🔍 Checking API endpoint...');
          try {
            const apiResponse = await fetch(`${backendUrl}/`, {
              method: 'GET',
              signal: controller.signal,
              credentials: 'omit',
            });

            clearTimeout(timeout);
            console.log('📊 API response status:', apiResponse.status);

            // API should respond (even with 404 is fine - means server is up)
            if (apiResponse.ok || apiResponse.status === 404 || apiResponse.status === 200) {
              console.log('✅ Backend API is responding and database is connected!');
              setStatus('success');
              // Auto-hide after 2 seconds
              setTimeout(() => {
                setShowComponent(false);
              }, 2000);
              return true;
            }
          } catch (apiError) {
            console.log('❌ API endpoint error:', apiError);
          }
        } catch (innerError) {
          clearTimeout(timeout);
          console.log('❌ Backend check error:', innerError);
        }
      } catch (error) {
        console.log('❌ Outer backend check error:', error);
      }
      return false;
    };

    // Initial check
    checkBackend();

    // Retry every 2 seconds
    const retryInterval = setInterval(checkBackend, 2000);

    return () => {
      clearInterval(retryInterval);
    };
  }, [isLoading, showComponent]);

  if (!isLoading || !showComponent) {
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
