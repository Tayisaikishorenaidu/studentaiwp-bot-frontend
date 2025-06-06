"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Plus, Edit, Trash2, Eye, Image, Video, FileText, Calendar,
  Save, X, RefreshCw, Settings, Copy, Clock, Users, Target,
  ChevronDown, ChevronUp, MoreVertical, Play, Pause, AlertCircle,
  Upload, MessageSquare, Send, ChevronLeft, ChevronRight,
  Zap, Download, Filter, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';

const EnhancedCampaignSystem = () => {
  const { 
    getCampaignTemplates,
    createCampaignTemplate,
    updateCampaignTemplate,
    deleteCampaignTemplate,
    uploadTemplateMedia,
    removeTemplateMedia,
    getCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    assignTemplateToDay
  } = useAuth();
  
  // State management
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'campaigns', 'analytics'
  
  // Template states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    day: 1,
    message: '',
    delayHours: 12,
    isActive: true,
    media: []
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  
  // Campaign states
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    status: 'active',
    startDate: '',
    endDate: '',
    dayTemplates: {} // day -> templateId mapping
  });
  
  // Calendar states
  const [calendarDays, setCalendarDays] = useState(30);
  const [currentWeek, setCurrentWeek] = useState(0);
  const daysPerWeek = 5;
  const [assignmentLoading, setAssignmentLoading] = useState({}); // { campaignId_day: true/false }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesRes, campaignsRes] = await Promise.all([
        getCampaignTemplates(),
        getCampaigns()
      ]);
      
      if (templatesRes?.success) {
        setTemplates(templatesRes.templates || []);
      }
      
      if (campaignsRes?.success) {
        setCampaigns(campaignsRes.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [getCampaignTemplates, getCampaigns]);

  // Template Management
  const handleMediaUpload = async (files) => {
    try {
      const validFiles = Array.from(files).filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isPDF = file.type === 'application/pdf';
        return isImage || isVideo || isPDF;
      });

      if (validFiles.length !== files.length) {
        toast.error('Only images, videos, and PDFs are allowed');
        return;
      }

      // Limit to 2 files
      const filesToUpload = validFiles.slice(0, 2);
      setMediaFiles(filesToUpload);
    } catch (error) {
      console.error('Error handling media upload:', error);
      toast.error('Failed to process media files');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!templateForm.name || !templateForm.message) {
        toast.error('Name and message are required');
        return;
      }

      const templateData = {
        ...templateForm,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: {
          message: templateForm.message,
          media: []
        }
      };

      // First create the template
      const response = await createCampaignTemplate(templateData);
      
      if (response?.success) {
        // Store the template ID from the response
        const createdTemplateId = response.template.id;
        
        // Then upload media files if any
        if (mediaFiles.length > 0) {
          try {
            // Use the template ID from the response
            const uploadResult = await uploadTemplateMedia(createdTemplateId, mediaFiles);
            if (uploadResult?.success) {
              // Update template with media information
              await updateCampaignTemplate(createdTemplateId, {
                content: {
                  ...templateData.content,
                  media: uploadResult.media
                }
              });
            }
          } catch (error) {
            console.error('Failed to upload media:', error);
            toast.error('Template created but media upload failed');
          }
        }

        toast.success('Template created successfully!');
        setShowTemplateModal(false);
        resetTemplateForm();
        await loadData();
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      if (!selectedTemplate) return;

      const templateData = {
        ...templateForm,
        content: {
          message: templateForm.message,
          media: selectedTemplate.content?.media || []
        }
      };

      // First update the template
      const response = await updateCampaignTemplate(selectedTemplate.id, templateData);
      
      if (response?.success) {
        // Then handle media files if any
        if (mediaFiles.length > 0) {
          try {
            const uploadResult = await uploadTemplateMedia(selectedTemplate.id, mediaFiles);
            if (uploadResult?.success) {
              // Update template with new media information
              await updateCampaignTemplate(selectedTemplate.id, {
                content: {
                  ...templateData.content,
                  media: [...(templateData.content.media || []), ...uploadResult.media]
                }
              });
            }
          } catch (error) {
            console.error('Failed to upload media:', error);
            toast.error('Template updated but media upload failed');
          }
        }

        toast.success('Template updated successfully!');
        setShowTemplateModal(false);
        setSelectedTemplate(null);
        resetTemplateForm();
        await loadData();
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await deleteCampaignTemplate(templateId);
      if (response?.success) {
        toast.success('Template deleted successfully!');
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Campaign Management
  const handleCreateCampaign = async () => {
    try {
      if (!campaignForm.name) {
        toast.error('Campaign name is required');
        return;
      }

      const campaignData = {
        ...campaignForm,
        id: `campaign_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const response = await createCampaign(campaignData);
      if (response?.success) {
        toast.success('Campaign created successfully!');
        setShowCampaignModal(false);
        resetCampaignForm();
        await loadData();
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async () => {
    try {
      if (!selectedCampaign) return;

      const response = await updateCampaign(selectedCampaign.id, campaignForm);
      if (response?.success) {
        toast.success('Campaign updated successfully!');
        setShowCampaignModal(false);
        setSelectedCampaign(null);
        resetCampaignForm();
        await loadData();
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await deleteCampaign(campaignId);
      if (response?.success) {
        toast.success('Campaign deleted successfully!');
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  // Utility functions
  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      day: 1,
      message: '',
      delayHours: 12,
      isActive: true,
      media: []
    });
    setMediaFiles([]);
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      description: '',
      status: 'active',
      startDate: '',
      endDate: '',
      dayTemplates: {}
    });
  };

  const openEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name || '',
      day: template.day || 1,
      message: template.content?.message || '',
      delayHours: template.delayHours || 12,
      isActive: template.isActive !== false,
      media: template.content?.media || []
    });
    setShowTemplateModal(true);
  };

  const openEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setCampaignForm({
      name: campaign.name || '',
      description: campaign.description || '',
      status: campaign.status || 'active',
      startDate: campaign.startDate || '',
      endDate: campaign.endDate || '',
      dayTemplates: campaign.dayTemplates || {}
    });
    setShowCampaignModal(true);
  };

  const removeMediaFile = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateAssignment = async (campaignId, day, templateId) => {
    try {
      setAssignmentLoading(prev => ({ ...prev, [`${campaignId}_${day}`]: true }));
      const response = await assignTemplateToDay(campaignId, day, templateId);
      
      if (response?.success) {
        // Update local state only after successful API call
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? {
                ...campaign,
                dayTemplates: {
                  ...campaign.dayTemplates,
                  [day]: templateId
                }
              }
            : campaign
        ));

        // Update the selected campaign state
        setSelectedCampaign(prev => ({
          ...prev,
          dayTemplates: {
            ...prev.dayTemplates,
            [day]: templateId
          }
        }));

        toast.success('Template assigned successfully');
      }
    } catch (error) {
      console.error('Failed to assign template:', error);
      toast.error(error.message || 'Failed to assign template');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [`${campaignId}_${day}`]: false }));
    }
  };

  const getTemplateForDay = (campaign, day) => {
    const templateId = campaign.dayTemplates?.[day];
    return templates.find(t => t.id === templateId);
  };

  const getCurrentWeekDays = () => {
    const startDay = currentWeek * daysPerWeek + 1;
    const endDay = Math.min(startDay + daysPerWeek - 1, calendarDays);
    return Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
  };

  const handleRemoveMedia = async (templateId, mediaId) => {
    try {
      const response = await removeTemplateMedia(templateId, mediaId);
      if (response?.success) {
        toast.success('Media removed successfully');
        await loadData();
      }
    } catch (error) {
      console.error('Failed to remove media:', error);
      toast.error('Failed to remove media');
    }
  };

  const handleRemoveTemplateAssignment = async (campaignId, day) => {
    try {
      setAssignmentLoading(prev => ({ ...prev, [`${campaignId}_${day}`]: true }));
      const response = await fetch(`/api/enhanced-campaign/campaigns/${campaignId}/remove-template/${day}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove template');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? {
                ...campaign,
                dayTemplates: {
                  ...campaign.dayTemplates,
                  [day]: undefined
                }
              }
            : campaign
        ));

        // Update selected campaign state
        setSelectedCampaign(prev => ({
          ...prev,
          dayTemplates: {
            ...prev.dayTemplates,
            [day]: undefined
          }
        }));

        toast.success('Template removed successfully');
      }
    } catch (error) {
      console.error('Failed to remove template:', error);
      toast.error(error.message || 'Failed to remove template');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [`${campaignId}_${day}`]: false }));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Create templates and build automated campaigns</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'templates' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'campaigns' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'analytics' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Message Templates ({templates.length})
              </h2>
              <button
                onClick={() => {
                  resetTemplateForm();
                  setSelectedTemplate(null);
                  setShowTemplateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.slice(1).map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                      <p className="text-sm text-gray-500">Day {template.day} • {template.delayHours}h delay</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        template.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => openEditTemplate(template)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {template.content?.message || 'No message content'}
                    </p>
                  </div>

                  {template.content?.media && template.content.media.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2">
                        {template.content.media.map((media, index) => (
                          <div key={index} className={`px-2 py-1 text-xs rounded ${
                            media.type === 'image' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {media.type === 'image' ? '📷' : '🎥'} {media.type}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Campaigns ({campaigns.length})
              </h2>
              <button
                onClick={() => {
                  resetCampaignForm();
                  setSelectedCampaign(null);
                  setShowCampaignModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Campaign</span>
              </button>
            </div>

            {/* Campaign Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">{campaign.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        campaign.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : campaign.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                      <button
                        onClick={() => openEditCampaign(campaign)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Object.keys(campaign.dayTemplates || {}).length} days configured
                  </div>
                </div>
              ))}
            </div>

            {/* Campaign Calendar View */}
            {campaigns.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Calendar</h3>
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {calendarDays} Days Campaign
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <select
                        value={selectedCampaign?.id || ''}
                        onChange={(e) => {
                          const campaign = campaigns.find(c => c.id === e.target.value);
                          setSelectedCampaign(campaign);
                        }}
                        className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Campaign</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                      <button
                        onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
                        disabled={currentWeek === 0}
                        className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Week {currentWeek + 1}
                      </span>
                      <button
                        onClick={() => setCurrentWeek(currentWeek + 1)}
                        disabled={(currentWeek + 1) * daysPerWeek >= calendarDays}
                        className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {selectedCampaign && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {getCurrentWeekDays().map(day => {
                      const assignedTemplate = getTemplateForDay(selectedCampaign, day);
                      const isLoading = assignmentLoading[`${selectedCampaign.id}_${day}`];
                      
                      return (
                        <div 
                          key={day} 
                          className={`relative border border-gray-200 dark:border-gray-600 rounded-lg p-4 min-h-[160px] transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 dark:hover:border-blue-400'}`}
                        >
                          {isLoading && (
                            <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                          <div className="text-center mb-3">
                            <div className="font-medium text-gray-900 dark:text-white text-lg">Day {day}</div>
                            <div className="text-xs text-gray-500 flex items-center justify-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>+{(day - 1) * 12}h</span>
                            </div>
                          </div>

                          <div className="relative">
                            <select
                              value={assignedTemplate?.id || ''}
                              onChange={(e) => {
                                const templateId = e.target.value;
                                handleTemplateAssignment(selectedCampaign.id, day, templateId);
                              }}
                              className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isLoading}
                            >
                              <option value="">Select Template</option>
                              {templates.filter(t => t.isActive).map(template => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>

                          {assignedTemplate && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                              <div className="flex items-start space-x-2">
                                <div className="flex-shrink-0">
                                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium text-blue-900 dark:text-blue-300 text-sm">
                                      {assignedTemplate.name}
                                    </div>
                                    <button
                                      onClick={() => handleRemoveTemplateAssignment(selectedCampaign.id, day)}
                                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                      title="Remove template"
                                      disabled={isLoading}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="text-blue-700 dark:text-blue-400 text-xs mt-1 line-clamp-2">
                                    {assignedTemplate.content?.message || 'No message content'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!selectedCampaign && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Campaign</h3>
                    <p className="text-gray-500 dark:text-gray-400">Choose a campaign from the dropdown above to view and manage its calendar</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Campaign Analytics</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Day 1 Welcome Message"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={templateForm.day}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, day: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Delay (Hours) *
                  </label>
                  <select
                    value={templateForm.delayHours}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, delayHours: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={12}>12 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message Content *
                </label>
                <textarea
                  value={templateForm.message}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message content here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {templateForm.message.length}/4096 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Media Files (Images & Videos Only, Max 3)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleMediaUpload(e.target.files)}
                    className="hidden"
                    id="media-upload"
                  />
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Images & Videos only • Max 3 files • 50MB each
                    </p>
                  </label>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {file.type.startsWith('image/') ? (
                            <Image className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Video className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMediaFile(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={templateForm.isActive}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active Template</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  disabled={!templateForm.name || !templateForm.message}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{selectedTemplate ? 'Update' : 'Create'} Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </h2>
              <button 
                onClick={() => setShowCampaignModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Product Launch"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Campaign description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={campaignForm.status}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedCampaign ? handleUpdateCampaign : handleCreateCampaign}
                  disabled={!campaignForm.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{selectedCampaign ? 'Update' : 'Create'} Campaign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EnhancedCampaignSystem;