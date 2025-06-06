// context/AuthContext.js - Updated with Enhanced Campaign Methods
'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage if available
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        // Set the token in axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      return storedToken || null;
    }
    return null;
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Initialize axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Setup Firestore real-time listener
  const setupFirestoreListener = (userId) => {
    try {
      const userDocRef = doc(db, 'WhatsAppAutomation', userId);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          setConnectionStatus({
            connected: data.isConnected || false,
            state: data.connectionState || 'disconnected',
            qrCode: data.qrCode || '',
            qrCodeTimestamp: data.qrCodeTimestamp?.toMillis() || null,
            hasQR: !!(data.qrCode && data.qrCode.length > 0),
            connectionInfo: {
              lastUpdated: data.lastUpdated?.toMillis() || null,
              connectionState: data.connectionState || 'disconnected',
              qrCodeTimestamp: data.qrCodeTimestamp?.toMillis() || null,
              qrCodeAge: data.qrCodeTimestamp ? Date.now() - data.qrCodeTimestamp.toMillis() : null,
              retryCount: data.retryCount || 0
            }
          });
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Firestore listener error:', error);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force token refresh on auth state change
          const idToken = await user.getIdToken(true);
          setToken(idToken);
          localStorage.setItem('authToken', idToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
          setCurrentUser(user);

          // Set up token refresh interval (every 45 minutes)
          const refreshInterval = setInterval(async () => {
            try {
              const newToken = await user.getIdToken(true);
              setToken(newToken);
              localStorage.setItem('authToken', newToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            } catch (error) {
              console.error('Token refresh error:', error);
              clearInterval(refreshInterval);
              await logout();
            }
          }, 45 * 60 * 1000); // 45 minutes

          const firestoreUnsubscribe = setupFirestoreListener(user.uid);
          
          // Load dashboard data after a short delay to ensure token is set
          setTimeout(async () => {
            try {
              await getDashboardData();
            } catch (error) {
              console.error('Failed to load dashboard:', error);
              if (error.message === 'No authentication token') {
                // Try to refresh token and retry
                const refreshedToken = await user.getIdToken(true);
                setToken(refreshedToken);
                localStorage.setItem('authToken', refreshedToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${refreshedToken}`;
                await getDashboardData();
              }
            }
          }, 1000);

          return () => {
            if (firestoreUnsubscribe) firestoreUnsubscribe();
            clearInterval(refreshInterval);
          };
        } catch (error) {
          console.error('Auth error:', error);
          setCurrentUser(null);
          setToken(null);
          localStorage.removeItem('authToken');
          delete axios.defaults.headers.common['Authorization'];
        }
      } else {
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
        setConnectionStatus(null);
        setDashboardData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // API call helper with enhanced error handling
  const apiCall = async (method, url, data = null) => {
    try {
      if (!token) {
        // Try to get a new token if we have a current user
        if (currentUser) {
          const newToken = await currentUser.getIdToken(true);
          setToken(newToken);
          localStorage.setItem('authToken', newToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        } else {
          throw new Error('No authentication token');
        }
      }

      const config = {
        method,
        url,
        baseURL: API_BASE_URL,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000
      };

      if (data) {
        config.data = data;
      }

      try {
        const response = await axios(config);
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 && currentUser) {
          try {
            // Force token refresh
            const newToken = await currentUser.getIdToken(true);
            setToken(newToken);
            localStorage.setItem('authToken', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            
            // Retry the request with new token
            config.headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await axios(config);
            return retryResponse.data;
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await logout();
            throw new Error('Session expired. Please sign in again.');
          }
        }
        throw error;
      }
    } catch (error) {
      if (error.message === 'Session expired. Please sign in again.') {
        toast.error(error.message);
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please sign in again.');
        await logout();
      } else {
        toast.error(error.message || 'An error occurred');
      }
      throw error;
    }
  };

  // Auth functions
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await axios.post('/api/auth/register', {}, {
        headers: { Authorization: `Bearer ${idToken}` },
        baseURL: API_BASE_URL
      });
      
      if (response.data.success) {
        toast.success('Successfully signed in!');
        return true;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in');
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setToken(null);
      localStorage.removeItem('authToken');
      setConnectionStatus(null);
      setDashboardData(null);
      delete axios.defaults.headers.common['Authorization'];
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // WhatsApp functions
  const connectWhatsApp = async () => {
    try {
      const result = await apiCall('POST', '/api/whatsapp/connect');
      if (result?.success) {
        toast.success('WhatsApp connection initiated');
      }
      return result;
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to connect WhatsApp');
      throw error;
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      const result = await apiCall('POST', '/api/whatsapp/disconnect');
      if (result?.success) {
        toast.success('WhatsApp disconnected');
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          state: 'disconnected',
          qrCode: '',
          hasQR: false
        }));
      }
      return result;
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect WhatsApp');
      throw error;
    }
  };

  const getWhatsAppStatus = async () => {
    try {
      const status = await apiCall('GET', '/api/whatsapp/status');
      setConnectionStatus(prev => ({
        ...prev,
        ...status,
        connectionInfo: status.connectionInfo || {
          lastUpdated: Date.now(),
          connectionState: status.state,
          qrCodeTimestamp: status.qrCodeTimestamp,
          qrCodeAge: status.qrCodeTimestamp ? Date.now() - status.qrCodeTimestamp : null,
          retryCount: status.retryCount || 0
        }
      }));
      return status;
    } catch (error) {
      console.error('Status error:', error);
      return { connected: false, state: 'error' };
    }
  };

  const getDashboardData = async () => {
    try {
      const data = await apiCall('GET', '/api/dashboard');
      setDashboardData(data);
      return data;
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error;
    }
  };

  const updateSettings = async (settings) => {
    try {
      return await apiCall('POST', '/api/settings', settings);
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  };

  // =============================================================================
  // ENHANCED TEMPLATE MANAGEMENT
  // =============================================================================

  const getCampaignTemplates = async () => {
    try {
      return await apiCall('GET', '/api/enhanced-campaign/templates');
    } catch (error) {
      console.error('Get templates error:', error);
      throw error;
    }
  };

  const createCampaignTemplate = async (templateData) => {
    try {
      return await apiCall('POST', '/api/enhanced-campaign/templates', templateData);
    } catch (error) {
      console.error('Create template error:', error);
      throw error;
    }
  };

  const updateCampaignTemplate = async (templateId, templateData) => {
    try {
      return await apiCall('PUT', `/api/enhanced-campaign/templates/${templateId}`, templateData);
    } catch (error) {
      console.error('Update template error:', error);
      throw error;
    }
  };

  const deleteCampaignTemplate = async (templateId) => {
    try {
      return await apiCall('DELETE', `/api/enhanced-campaign/templates/${templateId}`);
    } catch (error) {
      console.error('Delete template error:', error);
      throw error;
    }
  };

  const uploadTemplateMedia = async (templateId, files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/enhanced-campaign/templates/${templateId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Upload template media error:', error);
      throw error;
    }
  };

  const removeTemplateMedia = async (templateId, mediaId) => {
    try {
      return await apiCall('DELETE', `/api/enhanced-campaign/templates/${templateId}/media/${mediaId}`);
    } catch (error) {
      console.error('Remove template media error:', error);
      throw error;
    }
  };

  const previewTemplate = async (templateId) => {
    try {
      return await apiCall('POST', `/api/enhanced-campaign/templates/${templateId}/preview`);
    } catch (error) {
      console.error('Preview template error:', error);
      throw error;
    }
  };

  const testSendTemplate = async (templateId, testPhoneNumber) => {
    try {
      return await apiCall('POST', `/api/enhanced-campaign/templates/${templateId}/test-send`, {
        testPhoneNumber
      });
    } catch (error) {
      console.error('Test send error:', error);
      throw error;
    }
  };

  // =============================================================================
  // ENHANCED CAMPAIGN MANAGEMENT
  // =============================================================================

  const getCampaigns = async () => {
    try {
      return await apiCall('GET', '/api/enhanced-campaign/campaigns');
    } catch (error) {
      console.error('Get campaigns error:', error);
      throw error;
    }
  };

  const createCampaign = async (campaignData) => {
    try {
      return await apiCall('POST', '/api/enhanced-campaign/campaigns', campaignData);
    } catch (error) {
      console.error('Create campaign error:', error);
      throw error;
    }
  };

  const updateCampaign = async (campaignId, campaignData) => {
    try {
      return await apiCall('PUT', `/api/enhanced-campaign/campaigns/${campaignId}`, campaignData);
    } catch (error) {
      console.error('Update campaign error:', error);
      throw error;
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      return await apiCall('DELETE', `/api/enhanced-campaign/campaigns/${campaignId}`);
    } catch (error) {
      console.error('Delete campaign error:', error);
      throw error;
    }
  };

  const assignTemplateToDay = async (campaignId, day, templateId) => {
    try {
      return await apiCall('POST', `/api/enhanced-campaign/campaigns/${campaignId}/assign-template`, {
        day,
        templateId
      });
    } catch (error) {
      console.error('Assign template error:', error);
      throw error;
    }
  };

  const removeTemplateFromDay = async (campaignId, day) => {
    try {
      return await apiCall('DELETE', `/api/enhanced-campaign/campaigns/${campaignId}/remove-template/${day}`);
    } catch (error) {
      console.error('Remove template error:', error);
      throw error;
    }
  };

  const getCampaignAnalytics = async (campaignId) => {
    try {
      return await apiCall('GET', `/api/enhanced-campaign/campaigns/${campaignId}/analytics`);
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      throw error;
    }
  };

  // =============================================================================
  // USER JOURNEY MANAGEMENT
  // =============================================================================

  const startUserJourney = async (campaignId, contactId, contactName, phone) => {
    try {
      return await apiCall('POST', `/api/enhanced-campaign/campaigns/${campaignId}/start-journey`, {
        contactId,
        contactName,
        phone
      });
    } catch (error) {
      console.error('Start journey error:', error);
      throw error;
    }
  };

  const getCampaignJourneys = async (campaignId) => {
    try {
      return await apiCall('GET', `/api/enhanced-campaign/campaigns/${campaignId}/journeys`);
    } catch (error) {
      console.error('Get journeys error:', error);
      throw error;
    }
  };

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  const bulkTemplateOperation = async (action, templateIds, data = {}) => {
    try {
      return await apiCall('POST', '/api/enhanced-campaign/templates/bulk', {
        action,
        templateIds,
        data
      });
    } catch (error) {
      console.error('Bulk template operation error:', error);
      throw error;
    }
  };

  const bulkCampaignOperation = async (action, campaignIds, data = {}) => {
    try {
      return await apiCall('POST', '/api/enhanced-campaign/campaigns/bulk', {
        action,
        campaignIds,
        data
      });
    } catch (error) {
      console.error('Bulk campaign operation error:', error);
      throw error;
    }
  };

  // =============================================================================
  // ANALYTICS & REPORTING
  // =============================================================================

  const getDetailedAnalytics = async () => {
    try {
      return await apiCall('GET', '/api/dashboard/campaigns/performance');
    } catch (error) {
      console.error('Get detailed analytics error:', error);
      throw error;
    }
  };

  const getTemplateAnalytics = async () => {
    try {
      return await apiCall('GET', '/api/dashboard/templates/analytics');
    } catch (error) {
      console.error('Get template analytics error:', error);
      throw error;
    }
  };

  const getContactAnalytics = async () => {
    try {
      return await apiCall('GET', '/api/dashboard/contacts/analytics');
    } catch (error) {
      console.error('Get contact analytics error:', error);
      throw error;
    }
  };

  // =============================================================================
  // DATA EXPORT
  // =============================================================================

  const downloadExcelData = async (type = 'contacts') => {
    try {
      if (!token) {
        toast.error('Please sign in first');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/dashboard/export/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });

      // Check if the response is actually an Excel file
      if (response.data.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        throw new Error('Invalid file format received');
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      }));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data downloaded successfully!`);
    } catch (error) {
      console.error('Download error:', error);
      if (error.response?.status === 401) {
        toast.error('Please sign in again to download data');
      } else if (error.message === 'Invalid file format received') {
        toast.error('Received invalid file format from server');
      } else {
        toast.error('Failed to download data. Please try again.');
      }
    }
  };

  const exportToExcel = (data, filename) => {
    try {
      if (!data || data.length === 0) {
        toast.error('No data to export');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, filename);
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // =============================================================================
  // SYSTEM HEALTH
  // =============================================================================

  const getSystemHealth = async () => {
    try {
      return await apiCall('GET', '/api/dashboard/health');
    } catch (error) {
      console.error('System health error:', error);
      throw error;
    }
  };

  const getRealTimeStats = async () => {
    try {
      return await apiCall('GET', '/api/dashboard/realtime');
    } catch (error) {
      console.error('Real-time stats error:', error);
      throw error;
    }
  };

  const value = {
    // State
    currentUser,
    token,
    loading,
    connectionStatus,
    dashboardData,
    
    // Auth functions
    signInWithGoogle,
    logout,
    
    // WhatsApp functions
    connectWhatsApp,
    disconnectWhatsApp,
    getWhatsAppStatus,
    getDashboardData,
    updateSettings,
    
    // Enhanced Template functions
    getCampaignTemplates,
    createCampaignTemplate,
    updateCampaignTemplate,
    deleteCampaignTemplate,
    uploadTemplateMedia,
    removeTemplateMedia,
    previewTemplate,
    testSendTemplate,
    
    // Enhanced Campaign functions
    getCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    assignTemplateToDay,
    removeTemplateFromDay,
    getCampaignAnalytics,
    
    // User Journey functions
    startUserJourney,
    getCampaignJourneys,
    
    // Bulk operations
    bulkTemplateOperation,
    bulkCampaignOperation,
    
    // Analytics functions
    getDetailedAnalytics,
    getTemplateAnalytics,
    getContactAnalytics,
    
    // System functions
    getSystemHealth,
    getRealTimeStats,
    
    // Utility functions
    apiCall,
    downloadExcelData,
    exportToExcel
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}