"use client"
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Play, 
  Pause, 
  Settings, 
  Clock, 
  Smartphone, 
  Save,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SettingsPage = () => {
  const { 
    currentUser, 
    connectionStatus, 
    connectWhatsApp, 
    disconnectWhatsApp, 
    logoutWhatsApp,
    updateSettings,
    getSettings
  } = useAuth();

  const [settings, setSettings] = useState({
    botEnabled: true,
    messageDelay: 2000,
    languageTimeout: 30000,
    demoTimeout: 30000,
    autoReply: true,
    workingHours: {
      enabled: false,
      start: '09:00',
      end: '18:00'
    }
  });

  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await getSettings();
      
      if (response.success && response.settings) {
        setSettings(prev => ({
          ...prev,
          ...response.settings,
          botEnabled: connectionStatus?.connected || false
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleWorkingHoursChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await updateSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const result = await connectWhatsApp();
      if (result?.success) {
        toast.success('WhatsApp connection initiated');
        setSettings(prev => ({ ...prev, botEnabled: true }));
      }
    } catch (error) {
      toast.error('Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setConnecting(true);
      await disconnectWhatsApp();
      toast.success('WhatsApp disconnected');
      setSettings(prev => ({ ...prev, botEnabled: false }));
    } catch (error) {
      toast.error('Failed to disconnect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure? This will clear your WhatsApp session and you\'ll need to scan QR again.')) {
      return;
    }
    
    try {
      setConnecting(true);
      await logoutWhatsApp();
      toast.success('WhatsApp session cleared');
      setSettings(prev => ({ ...prev, botEnabled: false }));
    } catch (error) {
      toast.error('Failed to logout WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const toggleBot = async () => {
    if (settings.botEnabled) {
      await handleDisconnect();
    } else {
      await handleConnect();
    }
  };

  const getConnectionStatus = () => {
    if (!connectionStatus) return { icon: WifiOff, text: 'Disconnected', color: 'text-gray-500' };
    
    switch (connectionStatus.state) {
      case 'connected':
        return { icon: Wifi, text: 'Connected', color: 'text-green-500' };
      case 'connecting':
        return { icon: RefreshCw, text: 'Connecting...', color: 'text-yellow-500' };
      case 'waiting_qr':
        return { icon: Smartphone, text: 'Scan QR Code', color: 'text-blue-500' };
      default:
        return { icon: WifiOff, text: 'Disconnected', color: 'text-red-500' };
    }
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <DashboardLayout>
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Bot Settings</h1>
          <p className="text-gray-600">Configure your WhatsApp auto-reply bot</p>
        </div>
      </div>

      {/* WhatsApp Connection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Smartphone className="w-5 h-5" />
          <span>WhatsApp Connection</span>
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className={`w-6 h-6 ${status.color} ${status.icon === RefreshCw ? 'animate-spin' : ''}`} />
            <div>
              <p className="font-medium">{status.text}</p>
              <p className="text-sm text-gray-500">
                User: {currentUser?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleBot}
              disabled={connecting}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                settings.botEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {connecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : settings.botEnabled ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{connecting ? 'Processing...' : settings.botEnabled ? 'Pause Bot' : 'Start Bot'}</span>
            </button>

            {connectionStatus?.connected && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Clear Session</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bot Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Message Timing</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Delay (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.messageDelay / 1000}
              onChange={(e) => handleSettingChange('messageDelay', parseInt(e.target.value) * 1000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Delay between bot messages</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language Timeout (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.languageTimeout / 1000}
              onChange={(e) => handleSettingChange('languageTimeout', parseInt(e.target.value) * 1000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Time to wait for language selection</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Demo Timeout (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.demoTimeout / 1000}
              onChange={(e) => handleSettingChange('demoTimeout', parseInt(e.target.value) * 1000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Time to wait for demo response</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoReply"
              checked={settings.autoReply}
              onChange={(e) => handleSettingChange('autoReply', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoReply" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Auto Reply
            </label>
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Working Hours (Optional)</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="workingHours"
              checked={settings.workingHours.enabled}
              onChange={(e) => handleWorkingHoursChange('enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="workingHours" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Working Hours
            </label>
          </div>

          {settings.workingHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.workingHours.start}
                  onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.workingHours.end}
                  onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{loading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default SettingsPage;