import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Settings, 
  FileText, 
  Send, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getSMTPCredentials,
  createSMTPCredentials,
  updateSMTPCredentials,
  deleteSMTPCredentials,
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getEmailCampaigns,
  createEmailCampaign,
  sendEmailCampaign,
  // resetDailyLimits
} from '../services/api';

const EmailMarketing = () => {
  const [activeTab, setActiveTab] = useState('smtp');
  const [smtpCredentials, setSmtpCredentials] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailCampaigns, setEmailCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSMTPModal, setShowSMTPModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const tabs = [
    { id: 'smtp', name: 'SMTP Credentials', icon: Settings },
    { id: 'templates', name: 'Email Templates', icon: FileText },
    { id: 'campaigns', name: 'Campaigns', icon: Send },
    { id: 'tracking', name: 'Tracking', icon: BarChart3 }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [smtpData, templatesData, campaignsData] = await Promise.all([
        getSMTPCredentials(),
        getEmailTemplates(),
        getEmailCampaigns()
      ]);
      
      setSmtpCredentials(smtpData);
      setEmailTemplates(templatesData);
      setEmailCampaigns(campaignsData);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSMTPSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateSMTPCredentials(editingItem.id, formData);
        toast.success('SMTP credentials updated successfully');
      } else {
        await createSMTPCredentials(formData);
        toast.success('SMTP credentials added successfully');
      }
      setShowSMTPModal(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (error) {
      toast.error('Failed to save SMTP credentials');
    }
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateEmailTemplate(editingItem.id, formData);
        toast.success('Email template updated successfully');
      } else {
        await createEmailTemplate(formData);
        toast.success('Email template created successfully');
      }
      setShowTemplateModal(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (error) {
      toast.error('Failed to save email template');
    }
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update campaign logic here
        toast.success('Campaign updated successfully');
      } else {
        await createEmailCampaign(formData);
        toast.success('Campaign created successfully');
      }
      setShowCampaignModal(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (error) {
      toast.error('Failed to save campaign');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    try {
      // Get first available SMTP credentials
      const smtpCredential = smtpCredentials.find(c => c.is_active);
      if (!smtpCredential) {
        toast.error('No active SMTP credentials found');
        return;
      }

      await sendEmailCampaign(campaignId, smtpCredential.id);
      toast.success('Campaign started successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to start campaign');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      switch (type) {
        case 'smtp':
          await deleteSMTPCredentials(id);
          toast.success('SMTP credentials deleted successfully');
          break;
        case 'template':
          await deleteEmailTemplate(id);
          toast.success('Email template deleted successfully');
          break;
        default:
          break;
      }
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const openEditModal = (type, item) => {
    setEditingItem(item);
    setFormData(item);
    switch (type) {
      case 'smtp':
        setShowSMTPModal(true);
        break;
      case 'template':
        setShowTemplateModal(true);
        break;
      case 'campaign':
        setShowCampaignModal(true);
        break;
      default:
        break;
    }
  };

  const openCreateModal = (type) => {
    setEditingItem(null);
    setFormData({});
    switch (type) {
      case 'smtp':
        setShowSMTPModal(true);
        break;
      case 'template':
        setShowTemplateModal(true);
        break;
      case 'campaign':
        setShowCampaignModal(true);
        break;
      default:
        break;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      sending: { color: 'bg-blue-100 text-blue-800', icon: Play },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      paused: { color: 'bg-yellow-100 text-yellow-800', icon: Pause },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Email Marketing</h1>
        <p className="mt-2 text-gray-600">Manage your email campaigns, templates, and SMTP settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* SMTP Credentials Tab */}
      {activeTab === 'smtp' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">SMTP Credentials</h2>
            <button
              onClick={() => openCreateModal('smtp')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add SMTP
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {smtpCredentials.map((credential) => (
              <div key={credential.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{credential.name}</h3>
                    <p className="text-sm text-gray-500">{credential.provider}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal('smtp', credential)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('smtp', credential.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Host:</span> {credential.host}:{credential.port}</p>
                  <p><span className="font-medium">Username:</span> {credential.username}</p>
                  <p><span className="font-medium">Encryption:</span> {credential.encryption}</p>
                  <p><span className="font-medium">Daily Limit:</span> {credential.daily_sent}/{credential.daily_limit}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      credential.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {credential.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Email Templates</h2>
            <button
              onClick={() => openCreateModal('template')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {emailTemplates.map((template) => (
              <div key={template.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.subject}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal('template', template)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('template', template.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 line-clamp-3">{template.body}</p>
                  <p><span className="font-medium">Variables:</span> {template.variables?.length || 0}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Email Campaigns</h2>
            <button
              onClick={() => openCreateModal('campaign')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </button>
          </div>

          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emailCampaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.subject}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.template_name || 'Custom'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.total_recipients || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>Sent: {campaign.sent_count || 0}</div>
                        <div>Opened: {campaign.opened_count || 0}</div>
                        <div>Clicked: {campaign.clicked_count || 0}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal('campaign', campaign)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleSendCampaign(campaign.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {/* View campaign details */}}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tracking Tab */}
      {activeTab === 'tracking' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Email Tracking & Analytics</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Emails Sent</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {emailCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Opens</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {emailCampaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Open Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(() => {
                      const totalSent = emailCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
                      const totalOpened = emailCampaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0);
                      return totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
                    })()}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Send className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {emailCampaigns.filter(c => c.status === 'sending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Campaign Performance</h3>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {emailCampaigns.slice(0, 5).map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.sent_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.opened_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.clicked_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const sent = campaign.sent_count || 0;
                          const opened = campaign.opened_count || 0;
                          return sent > 0 ? Math.round((opened / sent) * 100) : 0;
                        })()}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const sent = campaign.sent_count || 0;
                          const clicked = campaign.clicked_count || 0;
                          return sent > 0 ? Math.round((clicked / sent) * 100) : 0;
                        })()}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Modal */}
      {showSMTPModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit SMTP Credentials' : 'Add SMTP Credentials'}
              </h3>
              <form onSubmit={handleSMTPSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input w-full"
                    placeholder="My Gmail Account"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select
                    required
                    value={formData.provider || ''}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    className="input w-full"
                  >
                    <option value="">Select Provider</option>
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="custom">Custom SMTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Host</label>
                  <input
                    type="text"
                    required
                    value={formData.host || ''}
                    onChange={(e) => setFormData({...formData, host: e.target.value})}
                    className="input w-full"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="number"
                    required
                    value={formData.port || ''}
                    onChange={(e) => setFormData({...formData, port: e.target.value})}
                    className="input w-full"
                    placeholder="587"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="email"
                    required
                    value={formData.username || ''}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="input w-full"
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="input w-full"
                    placeholder="App password or regular password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Encryption</label>
                  <select
                    value={formData.encryption || 'tls'}
                    onChange={(e) => setFormData({...formData, encryption: e.target.value})}
                    className="input w-full"
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Daily Limit</label>
                  <input
                    type="number"
                    value={formData.daily_limit || 200}
                    onChange={(e) => setFormData({...formData, daily_limit: e.target.value})}
                    className="input w-full"
                    placeholder="200"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSMTPModal(false);
                      setEditingItem(null);
                      setFormData({});
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Email Template' : 'Create Email Template'}
              </h3>
              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Template Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input w-full"
                    placeholder="Welcome Email Template"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="input w-full"
                    placeholder="Welcome to {{company}}!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Body</label>
                  <textarea
                    required
                    rows={15}
                    value={formData.body || ''}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    className="input w-full"
                    placeholder={`Hi {{first_name}},

Welcome to {{company}}! We're excited to have you on board.

Best regards,
The {{company}} Team`}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Available variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{industry}}'}, {'{{website}}'}, {'{{location}}'}
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingItem(null);
                      setFormData({});
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Email Campaign' : 'Create Email Campaign'}
              </h3>
              <form onSubmit={handleCampaignSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input w-full"
                    placeholder="Q1 Product Launch Campaign"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Template</label>
                  <select
                    value={formData.template_id || ''}
                    onChange={(e) => setFormData({...formData, template_id: e.target.value})}
                    className="input w-full"
                  >
                    <option value="">Select Template</option>
                    {emailTemplates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="input w-full"
                    placeholder="Subject line for your campaign"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Body</label>
                  <textarea
                    required
                    rows={15}
                    value={formData.body || ''}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    className="input w-full"
                    placeholder="Email body content (HTML supported)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Industry</label>
                    <input
                      type="text"
                      value={formData.target_filters?.industry || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        target_filters: {...formData.target_filters, industry: e.target.value}
                      })}
                      className="input w-full"
                      placeholder="Technology"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Location</label>
                    <input
                      type="text"
                      value={formData.target_filters?.location || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        target_filters: {...formData.target_filters, location: e.target.value}
                      })}
                      className="input w-full"
                      placeholder="New York"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCampaignModal(false);
                      setEditingItem(null);
                      setFormData({});
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailMarketing;
