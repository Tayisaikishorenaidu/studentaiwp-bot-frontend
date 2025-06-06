import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Wifi, 
  WifiOff, 
  QrCode, 
  Loader, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ConnectionStatus = () => {
  const { 
    currentUser,
    connectionStatus, 
    connectWhatsApp, 
    disconnectWhatsApp, 
    getWhatsAppStatus 
  } = useAuth();
  
  const [connecting, setConnecting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrExpiration, setQrExpiration] = useState(300); // 5 minutes
  const [statusPolling, setStatusPolling] = useState(null);

  // Auto-show QR when available
  useEffect(() => {
    if (connectionStatus?.hasQR && connectionStatus?.state === 'waiting_qr') {
      setShowQR(true);
    }
  }, [connectionStatus?.hasQR, connectionStatus?.state]);

  // Start status polling when connecting
  useEffect(() => {
    if (connectionStatus?.state === 'connecting' || connectionStatus?.state === 'waiting_qr') {
      const interval = setInterval(() => {
        getWhatsAppStatus();
      }, 5000); // Poll every 5 seconds
      setStatusPolling(interval);
    } else {
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }
    }

    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [connectionStatus?.state]);

  // QR expiration countdown
  useEffect(() => {
    if (connectionStatus?.state === 'waiting_qr' && connectionStatus?.qrCodeTimestamp && showQR) {
      const interval = setInterval(() => {
        const now = Date.now();
        const qrAge = now - connectionStatus.qrCodeTimestamp;
        const remaining = Math.max(0, 300 - Math.floor(qrAge / 1000)); // 5 minutes
        
        setQrExpiration(remaining);
        
        if (remaining === 0) {
          toast.error('QR Code expired. Please refresh connection.');
          setShowQR(false);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus?.state, connectionStatus?.qrCodeTimestamp, showQR]);

  const handleConnect = async () => {
    if (connecting) return;
    
    setConnecting(true);
    try {
      const result = await connectWhatsApp();
      if (result?.success) {
        toast.success('WhatsApp connection initiated');
        // Start polling for status
        const interval = setInterval(() => {
          getWhatsAppStatus();
        }, 5000);
        setStatusPolling(interval);
      }
    } catch (error) {
      toast.error('Failed to connect to WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (connecting) return;
    
    setConnecting(true);
    try {
      await disconnectWhatsApp();
      toast.success('WhatsApp disconnected');
      setShowQR(false);
      // Stop polling
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      await getWhatsAppStatus();
      toast.success('Status refreshed');
    } catch (error) {
      toast.error('Failed to refresh status');
    }
  };

  const downloadQRCode = () => {
    if (!connectionStatus?.qrCode) {
      toast.error('No QR code available');
      return;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${connectionStatus.qrCode}`;
      link.download = `whatsapp-qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded!');
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  const getStatusConfig = () => {
    switch (connectionStatus?.state) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected to WhatsApp',
          color: 'text-green-500',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800'
        };
      case 'connecting':
        return {
          icon: Loader,
          text: 'Connecting to WhatsApp...',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800'
        };
      case 'waiting_qr':
        return {
          icon: QrCode,
          text: `Waiting for QR code scan (${Math.floor(qrExpiration / 60)}:${(qrExpiration % 60).toString().padStart(2, '0')})`,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected from WhatsApp',
          color: 'text-red-500',
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const isConnected = connectionStatus?.connected;
  const isQRValid = connectionStatus?.qrCode && connectionStatus.qrCode.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <StatusIcon className={`w-8 h-8 ${statusConfig.color} ${statusConfig.icon === Loader ? 'animate-spin' : ''}`} />
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                WhatsApp Connection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                User: {currentUser?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshStatus}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${statusPolling ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`${statusConfig.bgColor} border rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              <span className={`font-medium ${statusConfig.textColor}`}>
                {statusConfig.text}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {connectionStatus?.hasQR && isQRValid && (
                <>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    {showQR ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showQR ? 'Hide QR' : 'Show QR'}</span>
                  </button>
                  
                  {showQR && (
                    <button
                      onClick={downloadQRCode}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  )}
                </>
              )}
              
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  {connecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting || connectionStatus?.state === 'connecting'}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  {connecting || connectionStatus?.state === 'connecting' ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        {showQR && connectionStatus?.hasQR && isQRValid && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Scan QR Code with WhatsApp
              </h4>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">
                  Expires in: {Math.floor(qrExpiration / 60)}:{(qrExpiration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${connectionStatus.qrCode}`}
                alt="WhatsApp QR Code"
                className="w-64 h-64 object-contain"
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                1. Open WhatsApp on your phone<br />
                2. Tap Menu or Settings and select WhatsApp Web<br />
                3. Point your phone to this screen to scan the QR code
              </p>
            </div>
          </div>
        )}

        {/* Connection Info */}
        {connectionStatus?.connectionInfo && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connection Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">State</p>
                <p className="font-medium text-gray-900 dark:text-white">{connectionStatus.connectionInfo.connectionState}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {connectionStatus.connectionInfo.lastUpdated ? 
                    new Date(connectionStatus.connectionInfo.lastUpdated).toLocaleString() : 
                    'Never'}
                </p>
              </div>
              {connectionStatus.connectionInfo.qrCodeAge && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">QR Code Age</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {Math.floor(connectionStatus.connectionInfo.qrCodeAge / 1000)} seconds
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500 dark:text-gray-400">Retry Count</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {connectionStatus.connectionInfo.retryCount || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;