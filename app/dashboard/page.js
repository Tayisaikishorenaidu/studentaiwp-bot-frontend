"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ConnectionStatus from '@/components/ConnectionStatus';
import { 
  Users, 
  Download,
  TrendingUp,
  RefreshCw,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  UserPlus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const DashboardPage = () => {
  const { 
    currentUser, 
    getDashboardData, 
    downloadExcelData,
    connectionStatus 
  } = useAuth();
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [currentUser, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleDownloadContacts = () => {
    try {
      downloadExcelData('contacts');
      toast.success('Downloading contacts...');
    } catch (error) {
      toast.error('Failed to download contacts');
    }
  };

  // Filter and sort contacts
  const filteredContacts = dashboardData?.contacts ? 
    dashboardData.contacts
      .filter(contact => {
        // Search filter
        const matchesSearch = !searchTerm || 
          contact.net?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.net?.phone?.includes(searchTerm);
        
        // Status filter
        const matchesStatus = filterStatus === 'all' ||
          (filterStatus === 'active' && contact.net?.campaignActive) ||
          (filterStatus === 'completed' && contact.net?.flowCompleted) ||
          (filterStatus === 'new' && contact.net?.currentDay === 1);
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'recent':
            return new Date(b.net?.lastMessage || 0) - new Date(a.net?.lastMessage || 0);
          case 'oldest':
            return new Date(a.net?.firstContact || 0) - new Date(b.net?.firstContact || 0);
          case 'name':
            return (a.net?.name || '').localeCompare(b.net?.name || '');
          case 'messages':
            return (b.net?.messageCount || 0) - (a.net?.messageCount || 0);
          default:
            return 0;
        }
      }) : [];

  // Dashboard cards data
  const cards = [
    {
      id: 'total-contacts',
      title: 'Total Contacts',
      value: dashboardData?.stats?.totalContacts || 0,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Unique contacts',
      trend: `+${dashboardData?.stats?.newContactsToday || 0} today`
    },
    {
      id: 'active-campaigns',
      title: 'Active Campaigns',
      value: dashboardData?.stats?.activeConversations || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
      description: 'Ongoing journeys',
      trend: 'In progress'
    },
    {
      id: 'completed-flows',
      title: 'Completed Flows',
      value: dashboardData?.stats?.completedFlows || 0,
      icon: CheckCircle,
      color: 'bg-purple-500',
      description: 'Finished campaigns',
      trend: `${Math.round((dashboardData?.stats?.completedFlows || 0) / 
        Math.max(dashboardData?.stats?.totalContacts || 1, 1) * 100)}% completion rate`
    },
    {
      id: 'new-today',
      title: 'New Today',
      value: dashboardData?.stats?.newContactsToday || 0,
      icon: UserPlus,
      color: 'bg-orange-500',
      description: 'New contacts today',
      trend: 'Last 24 hours'
    }
  ];

  // Helper function to format phone number for display
  const formatPhoneForDisplay = (phone) => {
    if (!phone) return 'No phone';
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone; // Return original if format doesn't match
  };

  const getContactStatusBadge = (contact) => {
    if (contact.net?.flowCompleted) {
      return { 
        text: 'Completed', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
      };
    }
    if (contact.net?.campaignActive) {
      return { 
        text: `Day ${contact.net?.currentDay || 1}`, 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
      };
    }
    return { 
      text: 'Inactive', 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' 
    };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0]}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <ConnectionStatus />

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {card.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {card.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {card.description}
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {card.trend}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contacts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Contacts ({filteredContacts.length})
              </h3>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <button
                  onClick={handleDownloadContacts}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Campaign</option>
                  <option value="completed">Completed</option>
                  <option value="new">New (Day 1)</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">First Contact</option>
                <option value="name">Name A-Z</option>
                <option value="messages">Most Messages</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            {filteredContacts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Language
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Messages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredContacts.map((contact, index) => {
                      const statusBadge = getContactStatusBadge(contact);
                      return (
                        <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {(contact.net?.name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {contact.net?.name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {formatPhoneForDisplay(contact.net?.phone)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.color}`}>
                              {statusBadge.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {contact.language ? (
                                <span className="capitalize">{contact.language}</span>
                              ) : (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <MessageCircle className="w-4 h-4 mr-2 text-gray-400" />
                              {contact.net?.messageCount || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(contact.net?.lastMessage)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              First: {formatDate(contact.net?.firstContact)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
                              title="View contact details"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {searchTerm || filterStatus !== 'all' ? 'No contacts found' : 'No contacts yet'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Contacts will appear here once people start messaging your bot.'
                  }
                </p>
                {searchTerm || filterStatus !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Clear Filters
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
            Campaign Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {Math.round((dashboardData?.stats?.completedFlows || 0) / 
                  Math.max(dashboardData?.stats?.totalContacts || 1, 1) * 100)}%
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Completion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {dashboardData?.stats?.activeConversations || 0}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Active Campaigns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {dashboardData?.contacts?.filter(c => c.demoRequested).length || 0}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Demo Requests</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;