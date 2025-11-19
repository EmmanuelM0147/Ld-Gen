import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { startLeadProspecting, subscribeToProspectingProgress } from '../services/api';

const LeadProspecting = () => {
  const [searchParams, setSearchParams] = useState({
    title: '',
    companyNameOrUrl: '',
    location: '',
    country: '',
    city: '',
    state: '',
    industry: '',
    teamSize: '',
    revenueRange: '',
    totalFunding: ''
  });

  const [generatedLeads, setGeneratedLeads] = useState([]);
  const [prospectingProgress, setProspectingProgress] = useState(0);
  const [prospectingStatus, setProspectingStatus] = useState('');
  const [activeProspecting, setActiveProspecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved leads from localStorage on component mount
  useEffect(() => {
    const savedLeads = localStorage.getItem('generatedLeads');
    if (savedLeads) {
      try {
        setGeneratedLeads(JSON.parse(savedLeads));
      } catch (error) {
        console.error('Error loading saved leads:', error);
      }
    }
  }, []);

  // Persist leads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('generatedLeads', JSON.stringify(generatedLeads));
  }, [generatedLeads]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setSearchParams({
      title: '',
      companyNameOrUrl: '',
      location: '',
      country: '',
      city: '',
      state: '',
      industry: '',
      teamSize: '',
      revenueRange: '',
      totalFunding: ''
    });
    setProspectingProgress(0);
    setProspectingStatus('');
    setActiveProspecting(false);
  };

  const addNewLead = (lead) => {
    setGeneratedLeads(prev => [lead, ...prev]);
    toast.success(`New lead added: ${lead.company || lead.companyName}`);
  };

  const clearGeneratedLeads = () => {
    setGeneratedLeads([]);
    localStorage.removeItem('generatedLeads');
    toast.success('Generated leads cleared successfully!');
  };

  const validateSearchParams = () => {
    // At least one search parameter must be provided
    const hasSearchCriteria = Object.values(searchParams).some(value => 
      value && value.trim() !== ''
    );
    
    if (!hasSearchCriteria) {
      toast.error('Please enter at least one search criteria');
      return false;
    }
    
    return true;
  };

  const startRealTimeProspecting = async () => {
    if (!validateSearchParams()) return;

    setIsLoading(true);
    setActiveProspecting(true);
    setProspectingProgress(0);
    setProspectingStatus('Initializing prospecting...');

    try {
      // Prepare search criteria for the backend
      const searchCriteria = {
        query: searchParams.companyNameOrUrl || searchParams.title,
        title: searchParams.title,
        companyName: searchParams.companyNameOrUrl,
        location: searchParams.location,
        country: searchParams.country,
        city: searchParams.city,
        state: searchParams.state,
        industry: searchParams.industry,
        teamSize: searchParams.teamSize,
        revenueRange: searchParams.revenueRange,
        totalFunding: searchParams.totalFunding,
        maxResults: 100,
        includeEmails: true,
        enrichData: true,
        verifyContacts: true
      };

      const response = await startLeadProspecting(searchCriteria);
      
      if (response.success) {
        const jobId = response.job_id;
        toast.success(`Prospecting started! Job ID: ${jobId}`);
        
        // Subscribe to real-time updates
        const unsubscribe = subscribeToProspectingProgress(
          jobId,
          (progressData) => {
            setProspectingProgress(progressData.progress || 0);
            setProspectingStatus(progressData.message || 'Processing...');
            
            if (progressData.newLeads && progressData.newLeads.length > 0) {
              progressData.newLeads.forEach(lead => addNewLead(lead));
            }
          },
          (completionData) => {
            setProspectingProgress(100);
            setProspectingStatus('Prospecting completed!');
            setActiveProspecting(false);
            setIsLoading(false);
            
            if (completionData.totalLeads > 0) {
              toast.success(`Prospecting completed! Found ${completionData.totalLeads} leads.`);
            }
          },
          (errorData) => {
            setProspectingStatus(`Error: ${errorData.message}`);
            setActiveProspecting(false);
            setIsLoading(false);
            toast.error(`Prospecting failed: ${errorData.message}`);
          }
        );

        // Cleanup subscription when component unmounts
        return unsubscribe;
      }
    } catch (error) {
      console.error('Error starting prospecting:', error);
      setProspectingStatus(`Error: ${error.message}`);
      setActiveProspecting(false);
      setIsLoading(false);
      toast.error(`Failed to start prospecting: ${error.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Prospecting</h1>
        <p className="text-gray-600">Find and generate high-quality leads based on your criteria</p>
      </div>

      {/* Enhanced Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Search Criteria</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={searchParams.title}
              onChange={handleInputChange}
              placeholder="e.g., CEO, Marketing Manager"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Company Name or URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name or URL
            </label>
            <input
              type="text"
              name="companyNameOrUrl"
              value={searchParams.companyNameOrUrl}
              onChange={handleInputChange}
              placeholder="e.g., Google, microsoft.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={searchParams.location}
              onChange={handleInputChange}
              placeholder="e.g., San Francisco, CA"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={searchParams.country}
              onChange={handleInputChange}
              placeholder="e.g., United States"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={searchParams.city}
              onChange={handleInputChange}
              placeholder="e.g., New York"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              name="state"
              value={searchParams.state}
              onChange={handleInputChange}
              placeholder="e.g., California"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <select
              name="industry"
              value={searchParams.industry}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Industry</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Education">Education</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Consulting">Consulting</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Team Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Size
            </label>
            <select
              name="teamSize"
              value={searchParams.teamSize}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Team Size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="501-1000">501-1000 employees</option>
              <option value="1000+">1000+ employees</option>
            </select>
          </div>

          {/* Revenue Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Revenue Range
            </label>
            <select
              name="revenueRange"
              value={searchParams.revenueRange}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Revenue Range</option>
              <option value="0-1M">$0 - $1M</option>
              <option value="1M-10M">$1M - $10M</option>
              <option value="10M-50M">$10M - $50M</option>
              <option value="50M-100M">$50M - $100M</option>
              <option value="100M-500M">$100M - $500M</option>
              <option value="500M-1B">$500M - $1B</option>
              <option value="1B+">$1B+</option>
            </select>
          </div>

          {/* Total Funding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Funding
            </label>
            <select
              name="totalFunding"
              value={searchParams.totalFunding}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Funding</option>
              <option value="0-100K">$0 - $100K</option>
              <option value="100K-500K">$100K - $500K</option>
              <option value="500K-1M">$500K - $1M</option>
              <option value="1M-5M">$1M - $5M</option>
              <option value="5M-10M">$5M - $10M</option>
              <option value="10M-50M">$10M - $50M</option>
              <option value="50M+">$50M+</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-6">
          <button
            onClick={startRealTimeProspecting}
            disabled={isLoading || activeProspecting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Starting...
              </>
            ) : activeProspecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Prospecting...
              </>
            ) : (
              <>
                🔍 Search
              </>
            )}
          </button>

          <button
            onClick={resetForm}
            disabled={isLoading || activeProspecting}
            className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>

          <button
            onClick={clearGeneratedLeads}
            disabled={generatedLeads.length === 0}
            className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Generated Leads
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {activeProspecting && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Prospecting Progress</h3>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{prospectingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${prospectingProgress}%` }}
              ></div>
            </div>
          </div>
          
          <p className="text-gray-700">{prospectingStatus}</p>
        </div>
      )}

      {/* Real-time Leads Feed */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Real-time Leads Feed</h3>
          <span className="text-sm text-gray-500">
            {generatedLeads.length} leads generated
          </span>
        </div>

        {generatedLeads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No leads generated yet. Start prospecting to see results here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedLeads.map((lead, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {lead.title || lead.position || 'N/A'}
                    </h4>
                    <p className="text-gray-700 font-medium">
                      {lead.company || lead.companyName || 'Company N/A'}
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      {lead.location && <span className="mr-4">📍 {lead.location}</span>}
                      {lead.industry && <span className="mr-4">🏭 {lead.industry}</span>}
                      {lead.teamSize && <span className="mr-4">👥 {lead.teamSize}</span>}
                      {lead.revenueRange && <span className="mr-4">💰 {lead.revenueRange}</span>}
                      {lead.totalFunding && <span className="mr-4">💵 {lead.totalFunding}</span>}
                    </div>
                    {lead.email && (
                      <p className="text-blue-600 text-sm mt-1">📧 {lead.email}</p>
                    )}
                    {lead.phone && (
                      <p className="text-green-600 text-sm mt-1">📞 {lead.phone}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {lead.timestamp ? new Date(lead.timestamp).toLocaleTimeString() : 'Just now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadProspecting;
