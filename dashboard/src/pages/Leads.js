import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  Plus, 
  Edit, 
  Eye, 
  Tag,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building
} from 'lucide-react';
import { useTable, useFilters, useSortBy, usePagination } from 'react-table';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';
import { getLeads, updateLead, addTag, addNote } from '../services/api';
import { toast } from 'react-toastify';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    industry: '',
    companySize: '',
    location: '',
    status: '',
    qualityScore: ''
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await getLeads();
      
      // The backend returns { leads: [...], pagination: {...} }
      // The API interceptor extracts response.data, so we get the full response object
      let leadsData = [];
      if (response && response.leads && Array.isArray(response.leads)) {
        leadsData = response.leads;
      } else if (Array.isArray(response)) {
        // Fallback: if response is directly an array
        leadsData = response;
      } else {
        console.warn('Unexpected leads response format:', response);
        leadsData = [];
      }
      
      setLeads(leadsData);
    } catch (error) {
      toast.error('Failed to fetch leads');
      console.error('Error fetching leads:', error);
      setLeads([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        Header: 'Company',
        accessor: 'company_name',
        Cell: ({ value, row }) => (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <Building className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{row.original.industry || 'N/A'}</div>
            </div>
          </div>
        ),
      },
      {
        Header: 'Contact Info',
        accessor: 'email',
        Cell: ({ value, row }) => (
          <div className="space-y-1">
            {value && (
              <div className="flex items-center text-sm">
                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                <span className="text-gray-900">{value}</span>
              </div>
            )}
            {row.original.phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                <span className="text-gray-600">{row.original.phone}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        Header: 'Website',
        accessor: 'website',
        Cell: ({ value }) => (
          value ? (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-800 flex items-center"
            >
              <Globe className="h-3 w-3 mr-1" />
              {new URL(value).hostname}
            </a>
          ) : (
            <span className="text-gray-400">N/A</span>
          )
        ),
      },
      {
        Header: 'Location',
        accessor: 'address',
        Cell: ({ value, row }) => (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-3 w-3 mr-1" />
            {value || row.original.city || 'N/A'}
          </div>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: ({ value }) => {
          const statusConfig = {
            new: { label: 'New', className: 'status-new' },
            contacted: { label: 'Contacted', className: 'status-contacted' },
            interested: { label: 'Interested', className: 'status-interested' },
            closed: { label: 'Closed', className: 'status-closed' }
          };
          const config = statusConfig[value] || statusConfig.new;
          return <span className={config.className}>{config.label}</span>;
        },
      },
      {
        Header: 'Quality Score',
        accessor: 'quality_score',
        Cell: ({ value }) => (
          <div className="flex items-center">
            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className={`h-2 rounded-full ${
                  value >= 0.8 ? 'bg-success-500' : 
                  value >= 0.6 ? 'bg-warning-500' : 'bg-danger-500'
                }`}
                style={{ width: `${(value || 0) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {((value || 0) * 100).toFixed(0)}%
            </span>
          </div>
        ),
      },
      {
        Header: 'Actions',
        accessor: 'id',
        Cell: ({ value, row }) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleViewLead(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEditLead(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit Lead"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleAddTag(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Add Tag"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (filters.industry && !lead.industry?.toLowerCase().includes(filters.industry.toLowerCase())) return false;
      if (filters.companySize && !lead.company_size?.toLowerCase().includes(filters.companySize.toLowerCase())) return false;
      if (filters.location && !lead.address?.toLowerCase().includes(filters.location.toLowerCase()) && !lead.city?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.qualityScore) {
        const score = parseFloat(filters.qualityScore);
        if (filters.qualityScore.includes('>') && (lead.quality_score || 0) <= score) return false;
        if (filters.qualityScore.includes('<') && (lead.quality_score || 0) >= score) return false;
      }
      return true;
    });
  }, [leads, filters]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    // rows,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data: filteredLeads,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useFilters,
    useSortBy,
    usePagination
  );

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
  };

  const handleEditLead = (lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
  };

  const handleAddTag = (lead) => {
    setSelectedLead(lead);
    setShowTagModal(true);
  };

  const handleAddNote = (lead) => {
    setSelectedLead(lead);
    setShowNoteModal(true);
  };

  const handleExport = (format) => {
    if (format === 'csv') {
      exportToCSV(filteredLeads, 'leads');
    } else if (format === 'excel') {
      exportToExcel(filteredLeads, 'leads');
    }
    toast.success(`Exported ${filteredLeads.length} leads as ${format.toUpperCase()}`);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateLead(leadId, { status: newStatus });
      toast.success('Lead status updated successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead status');
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600 mt-2">Manage and track your business leads</p>
          </div>
          <div className="flex space-x-3">
            <button className="btn-secondary">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
              className="input"
            >
              <option value="">All Industries</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Education">Education</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Consulting">Consulting</option>
              <option value="Marketing">Marketing</option>
              <option value="Legal">Legal</option>
              <option value="Construction">Construction</option>
              <option value="Transportation">Transportation</option>
              <option value="Energy">Energy</option>
              <option value="Media">Media</option>
              <option value="Non-profit">Non-profit</option>
              <option value="Government">Government</option>
              <option value="Agriculture">Agriculture</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Sports">Sports</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
            <select
              value={filters.companySize}
              onChange={(e) => setFilters({ ...filters, companySize: e.target.value })}
              className="input"
            >
              <option value="">All Sizes</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="input"
            >
              <option value="">All Locations</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Sweden">Sweden</option>
              <option value="Switzerland">Switzerland</option>
              <option value="Singapore">Singapore</option>
              <option value="Japan">Japan</option>
              <option value="South Korea">South Korea</option>
              <option value="India">India</option>
              <option value="Brazil">Brazil</option>
              <option value="Mexico">Mexico</option>
              <option value="New York">New York</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="Chicago">Chicago</option>
              <option value="Houston">Houston</option>
              <option value="Phoenix">Phoenix</option>
              <option value="Philadelphia">Philadelphia</option>
              <option value="San Antonio">San Antonio</option>
              <option value="San Diego">San Diego</option>
              <option value="Dallas">Dallas</option>
              <option value="San Jose">San Jose</option>
              <option value="London">London</option>
              <option value="Manchester">Manchester</option>
              <option value="Birmingham">Birmingham</option>
              <option value="Leeds">Leeds</option>
              <option value="Liverpool">Liverpool</option>
              <option value="Toronto">Toronto</option>
              <option value="Vancouver">Vancouver</option>
              <option value="Montreal">Montreal</option>
              <option value="Calgary">Calgary</option>
              <option value="Ottawa">Ottawa</option>
              <option value="Sydney">Sydney</option>
              <option value="Melbourne">Melbourne</option>
              <option value="Brisbane">Brisbane</option>
              <option value="Perth">Perth</option>
              <option value="Adelaide">Adelaide</option>
              <option value="Berlin">Berlin</option>
              <option value="Munich">Munich</option>
              <option value="Hamburg">Hamburg</option>
              <option value="Cologne">Cologne</option>
              <option value="Frankfurt">Frankfurt</option>
              <option value="Paris">Paris</option>
              <option value="Lyon">Lyon</option>
              <option value="Marseille">Marseille</option>
              <option value="Toulouse">Toulouse</option>
              <option value="Nice">Nice</option>
              <option value="Amsterdam">Amsterdam</option>
              <option value="Rotterdam">Rotterdam</option>
              <option value="The Hague">The Hague</option>
              <option value="Utrecht">Utrecht</option>
              <option value="Eindhoven">Eindhoven</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality Score</label>
            <select
              value={filters.qualityScore}
              onChange={(e) => setFilters({ ...filters, qualityScore: e.target.value })}
              className="input"
            >
              <option value="">All Scores</option>
              <option value=">0.8">High (&gt;80%)</option>
              <option value=">0.6">Medium (&gt;60%)</option>
              <option value="<0.6">Low (&lt;60%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export and Stats */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('csv')}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table {...getTableProps()} className="table">
          <thead className="table-header">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className="table-header-cell">
                    {column.render('Header')}
                    <span className="ml-2">
                      {column.isSorted ? (column.isSortedDesc ? '↓' : '↑') : ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="table-body">
            {page.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} className="table-row">
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} className="table-cell">
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => gotoPage(0)}
            disabled={!canPreviousPage}
            className="btn-secondary disabled:opacity-50"
          >
            {'<<'}
          </button>
          <button
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            className="btn-secondary disabled:opacity-50"
          >
            {'<'}
          </button>
          <button
            onClick={() => nextPage()}
            disabled={!canNextPage}
            className="btn-secondary disabled:opacity-50"
          >
            {'>'}
          </button>
          <button
            onClick={() => gotoPage(pageCount - 1)}
            disabled={!canNextPage}
            className="btn-secondary disabled:opacity-50"
          >
            {'>>'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Page {pageIndex + 1} of {pageOptions.length}
          </span>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="input w-20"
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setShowLeadModal(false)}
          onUpdate={handleStatusChange}
          onAddNote={handleAddNote}
        />
      )}

      {/* Tag Modal */}
      {showTagModal && selectedLead && (
        <TagModal
          lead={selectedLead}
          onClose={() => setShowTagModal(false)}
          onAddTag={addTag}
        />
      )}

      {/* Note Modal */}
      {showNoteModal && selectedLead && (
        <NoteModal
          lead={selectedLead}
          onClose={() => setShowNoteModal(false)}
          onAddNote={addNote}
        />
      )}
    </div>
  );
};

// Lead Detail Modal Component
const LeadDetailModal = ({ lead, onClose, onUpdate, onAddNote }) => {
  const [status, setStatus] = useState(lead.status || 'new');

  const handleStatusUpdate = () => {
    onUpdate(lead.id, status);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Lead Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <p className="text-sm text-gray-900">{lead.company_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Industry</label>
              <p className="text-sm text-gray-900">{lead.industry || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-sm text-gray-900">{lead.email || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <p className="text-sm text-gray-900">{lead.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <p className="text-sm text-gray-900">
                {lead.website ? (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">
                    {lead.website}
                  </a>
                ) : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <p className="text-sm text-gray-900">{lead.address || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input w-full"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleStatusUpdate} className="btn-primary">
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tag Modal Component
const TagModal = ({ lead, onClose, onAddTag }) => {
  const [tag, setTag] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tag.trim()) {
      onAddTag(lead.id, tag.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Tag</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Enter tag name"
              className="input"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Note Modal Component
const NoteModal = ({ lead, onClose, onAddNote }) => {
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (note.trim()) {
      onAddNote(lead.id, note.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Note</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note"
              rows={4}
              className="input"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Leads;
