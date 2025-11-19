import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Mail, Target } from 'lucide-react';
import { getAnalytics } from '../services/api';

const Analytics = () => {
  const [, setAnalytics] = useState({
    leadSources: [],
    industryDistribution: [],
    statusDistribution: [],
    qualityDistribution: [],
    monthlyTrends: [],
    topIndustries: [],
    conversionRates: {}
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getAnalytics(timeRange);
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">Insights and performance metrics for your leads</p>
          </div>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input w-32"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-semibold text-gray-900">1,234</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">23.4%</p>
              <p className="text-sm text-green-600">+5% from last month</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-500">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-semibold text-gray-900">2.3h</p>
              <p className="text-sm text-red-600">+0.5h from last month</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Quality Score</p>
              <p className="text-2xl font-semibold text-gray-900">8.2/10</p>
              <p className="text-sm text-green-600">+0.3 from last month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lead Sources */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Sources</h3>
          <div className="space-y-4">
            {[
              { source: 'Google Search', count: 456, percentage: 37, color: 'bg-blue-500' },
              { source: 'LinkedIn', count: 234, percentage: 19, color: 'bg-indigo-500' },
              { source: 'Yellow Pages', count: 189, percentage: 15, color: 'bg-yellow-500' },
              { source: 'Direct Website', count: 156, percentage: 13, color: 'bg-green-500' },
              { source: 'Referrals', count: 123, percentage: 10, color: 'bg-purple-500' },
              { source: 'Other', count: 66, percentage: 6, color: 'bg-gray-500' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                  <span className="text-sm text-gray-700">{item.source}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Distribution</h3>
          <div className="space-y-4">
            {[
              { industry: 'Technology', count: 234, percentage: 19, color: 'bg-blue-500' },
              { industry: 'Healthcare', count: 189, percentage: 15, color: 'bg-green-500' },
              { industry: 'Finance', count: 156, percentage: 13, color: 'bg-yellow-500' },
              { industry: 'Manufacturing', count: 123, percentage: 10, color: 'bg-purple-500' },
              { industry: 'Retail', count: 98, percentage: 8, color: 'bg-red-500' },
              { industry: 'Other', count: 434, percentage: 35, color: 'bg-gray-500' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                  <span className="text-sm text-gray-700">{item.industry}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status and Quality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lead Status Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Status Distribution</h3>
          <div className="space-y-4">
            {[
              { status: 'New', count: 456, percentage: 37, color: 'status-new' },
              { status: 'Contacted', count: 234, percentage: 19, color: 'status-contacted' },
              { status: 'Interested', count: 189, percentage: 15, color: 'status-interested' },
              { status: 'Closed', count: 123, percentage: 10, color: 'status-closed' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.color} mr-3`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-primary-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Score Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Score Distribution</h3>
          <div className="space-y-4">
            {[
              { range: '9.0-10.0', count: 234, percentage: 19, color: 'bg-green-500' },
              { range: '8.0-8.9', count: 345, percentage: 28, color: 'bg-green-400' },
              { range: '7.0-7.9', count: 234, percentage: 19, color: 'bg-yellow-500' },
              { range: '6.0-6.9', count: 189, percentage: 15, color: 'bg-yellow-400' },
              { range: '5.0-5.9', count: 123, percentage: 10, color: 'bg-red-500' },
              { range: '<5.0', count: 89, percentage: 9, color: 'bg-red-600' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                  <span className="text-sm text-gray-700">{item.range}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Lead Generation Trends</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[
              { month: 'Jan', leads: 89, quality: 7.8 },
              { month: 'Feb', leads: 123, quality: 8.1 },
              { month: 'Mar', leads: 156, quality: 8.3 },
              { month: 'Apr', leads: 134, quality: 8.0 },
              { month: 'May', leads: 178, quality: 8.5 },
              { month: 'Jun', leads: 234, quality: 8.8 }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div className="text-xs text-gray-500">{item.month}</div>
                <div className="w-8 bg-primary-500 rounded-t" style={{ height: `${(item.leads / 250) * 200}px` }}></div>
                <div className="text-xs text-gray-600">{item.leads}</div>
                <div className="text-xs text-green-600">{item.quality}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-full bg-blue-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">1,234</div>
                <div className="text-sm text-blue-700">Total Leads Generated</div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-4/5 mx-auto bg-green-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-900">987</div>
                <div className="text-sm text-green-700">Qualified Leads (80%)</div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-3/5 mx-auto bg-yellow-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-900">456</div>
                <div className="text-sm text-yellow-700">Contacted (37%)</div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-2/5 mx-auto bg-purple-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">234</div>
                <div className="text-sm text-purple-700">Interested (19%)</div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-1/5 mx-auto bg-red-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-900">123</div>
                <div className="text-sm text-red-700">Converted (10%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
