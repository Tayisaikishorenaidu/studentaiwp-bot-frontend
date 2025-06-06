import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  MessageCircle,
  FileText,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Zap,
  Download
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { currentUser, logout, connectionStatus, downloadExcelData } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Campaign Manager', href: '/campaign', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings }
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      router.push('/login');
    }
  };

  const handleNavigation = (href) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const handleDownloadContacts = () => {
    downloadExcelData('contacts');
  };

  const getConnectionStatusDisplay = () => {
    if (!connectionStatus) {
      return {
        icon: WifiOff,
        text: 'Disconnected',
        color: 'text-gray-500'
      };
    }

    switch (connectionStatus.state) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          color: 'text-green-500'
        };
      case 'connecting':
        return {
          icon: Wifi,
          text: 'Connecting',
          color: 'text-yellow-500'
        };
      case 'waiting_qr':
        return {
          icon: MessageCircle,
          text: 'Scan QR',
          color: 'text-blue-500'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-red-500'
        };
    }
  };

  const connectionDisplay = getConnectionStatusDisplay();
  const ConnectionIcon = connectionDisplay.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setSidebarOpen(false)} 
        />

        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            {/* Mobile Logo */}
            <div className="flex-shrink-0 flex items-center px-4 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                Student AI Bot
              </span>
            </div>

            {/* Mobile Connection Status */}
            <div className="px-4 mb-4">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                <ConnectionIcon className={`w-4 h-4 ${connectionDisplay.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {connectionDisplay.text}
                </span>
                {connectionStatus?.connected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isCurrentPage = typeof window !== 'undefined' && window.location.pathname === item.href;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md w-full transition-colors ${
                      isCurrentPage
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            
          </div>

          {/* Mobile User info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center w-full">
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email)}&background=3B82F6&color=fff`}
                alt={currentUser?.displayName || currentUser?.email}
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {currentUser?.displayName || 'User'}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                  {currentUser?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ${
        sidebarCollapsed ? 'md:w-16' : 'md:w-64'
      }`}>
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Desktop Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                  Student AI Bot
                </span>
              )}
            </div>

            {/* Sidebar Toggle Button */}
            <div className="flex justify-end px-4 mb-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Desktop Connection Status */}
            {!sidebarCollapsed && (
              <div className="px-4 mb-6">
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <ConnectionIcon className={`w-4 h-4 ${connectionDisplay.color}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {connectionDisplay.text}
                  </span>
                  {connectionStatus?.connected && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            )}

            {/* Collapsed Connection Status */}
            {sidebarCollapsed && (
              <div className="px-4 mb-6 flex justify-center">
                <div className="relative">
                  <ConnectionIcon className={`w-6 h-6 ${connectionDisplay.color}`} />
                  {connectionStatus?.connected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Navigation */}
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isCurrentPage = typeof window !== 'undefined' && window.location.pathname === item.href;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full transition-colors ${
                      isCurrentPage
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-6 w-6 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && item.name}
                  </button>
                );
              })}
            </nav>

            {/* Desktop Quick Action */}
            

            {/* Collapsed Quick Action */}
            {sidebarCollapsed && (
              <div className="px-4 mb-4 flex justify-center">
                <button
                  onClick={handleDownloadContacts}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Download Contacts"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Bot Status Summary */}
            {!sidebarCollapsed && (
              <div className="px-4 mb-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Auto-Reply Status
                    </span>
                  </div>
                  <div className="text-center">
                    <div className={`font-semibold ${connectionStatus?.connected ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {connectionStatus?.connected ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {connectionStatus?.connected ? 'Ready for campaigns' : 'Connect WhatsApp to start'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop User info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center w-full">
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email)}&background=3B82F6&color=fff`}
                alt={currentUser?.displayName || currentUser?.email}
              />
              {!sidebarCollapsed && (
                <>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {currentUser?.displayName || 'User'}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-3 p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              )}
              {sidebarCollapsed && (
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors mx-auto"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'} flex flex-col flex-1`}>
        {/* Mobile top bar */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50 dark:bg-gray-900">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:text-gray-400 dark:hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;