import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Convert data to CSV format
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const csvHeader = headers.map(header => `"${header}"`).join(',');
  
  // Create CSV data rows
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Handle null/undefined values
      if (value === null || value === undefined) return '""';
      // Handle values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return `"${value}"`;
    }).join(',')
  );
  
  // Combine header and rows
  return [csvHeader, ...csvRows].join('\n');
};

// Convert data to Excel format
const convertToExcel = (data) => {
  if (!data || data.length === 0) return null;
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const columnWidths = [];
  Object.keys(data[0]).forEach(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => {
        const value = row[key];
        return value ? value.toString().length : 0;
      })
    );
    columnWidths.push({ wch: Math.min(maxLength + 2, 50) });
  });
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  
  return workbook;
};

// Export data as CSV file
export const exportToCSV = (data, filename = 'export') => {
  try {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback for older browsers
      saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    }
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV file');
  }
};

// Export data as Excel file
export const exportToExcel = (data, filename = 'export') => {
  try {
    const workbook = convertToExcel(data);
    if (!workbook) {
      throw new Error('No data to export');
    }
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export Excel file');
  }
};

// Export data as JSON file
export const exportToJSON = (data, filename = 'export') => {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw new Error('Failed to export JSON file');
  }
};

// Format data for export (clean and structure)
export const formatDataForExport = (data, options = {}) => {
  const {
    includeNotes = true,
    includeTags = true,
    includeQualityScores = true,
    includeRawData = false
  } = options;
  
  return data.map(item => {
    const exportItem = {
      'Company Name': item.company_name || '',
      'Email': item.email || '',
      'Website': item.website || '',
      'Phone': item.phone || '',
      'Address': item.address || '',
      'City': item.city || '',
      'State': item.state || '',
      'Zip Code': item.zip_code || '',
      'Country': item.country || '',
      'Industry': item.industry || '',
      'Source': item.source || '',
      'Status': item.status || 'new',
      'Scraped At': item.scraped_at ? new Date(item.scraped_at).toLocaleString() : '',
    };
    
    // Add quality scores if available
    if (includeQualityScores && item.quality_score !== undefined) {
      exportItem['Quality Score'] = item.quality_score;
      exportItem['Overall Score'] = item.overall_score || '';
      exportItem['Domain Authority'] = item.domain_authority_score || '';
      exportItem['LinkedIn Presence'] = item.linkedin_presence_score || '';
      exportItem['Email Quality'] = item.email_quality_score || '';
      exportItem['Spam Score'] = item.spam_score || '';
    }
    
    // Add enrichment data if available
    if (item.industry_category) {
      exportItem['Industry Category'] = item.industry_category;
      exportItem['Subcategory'] = item.subcategory || '';
      exportItem['Company Size'] = item.company_size || '';
      exportItem['Estimated Size'] = item.estimated_company_size || '';
      exportItem['Founded Year'] = item.founded_year || '';
      exportItem['Headquarters'] = item.headquarters || '';
      exportItem['Company Description'] = item.company_description || '';
    }
    
    // Add tags if available
    if (includeTags && item.tags && Array.isArray(item.tags)) {
      exportItem['Tags'] = item.tags.join(', ');
    }
    
    // Add notes if available
    if (includeNotes && item.notes && Array.isArray(item.notes)) {
      exportItem['Notes'] = item.notes.map(note => note.content).join(' | ');
    }
    
    // Add raw data if requested
    if (includeRawData && item.raw_data) {
      try {
        const rawData = typeof item.raw_data === 'string' ? JSON.parse(item.raw_data) : item.raw_data;
        exportItem['Raw Data'] = JSON.stringify(rawData);
      } catch (e) {
        exportItem['Raw Data'] = item.raw_data;
      }
    }
    
    return exportItem;
  });
};

// Export leads with specific filters and formatting
export const exportLeads = (leads, format = 'csv', options = {}) => {
  try {
    const formattedData = formatDataForExport(leads, options);
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportToCSV(formattedData, 'leads');
        break;
      case 'excel':
      case 'xlsx':
        exportToExcel(formattedData, 'leads');
        break;
      case 'json':
        exportToJSON(formattedData, 'leads');
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting leads:', error);
    throw error;
  }
};

// Export specific lead data
export const exportLeadDetails = (lead, format = 'csv') => {
  try {
    const formattedData = formatDataForExport([lead], {
      includeNotes: true,
      includeTags: true,
      includeQualityScores: true,
      includeRawData: true
    });
    
    const filename = `lead_${lead.id}_${lead.company_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}`;
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportToCSV(formattedData, filename);
        break;
      case 'excel':
      case 'xlsx':
        exportToExcel(formattedData, filename);
        break;
      case 'json':
        exportToJSON(formattedData, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting lead details:', error);
    throw error;
  }
};

// Export analytics data
export const exportAnalytics = (analyticsData, format = 'csv') => {
  try {
    const formattedData = Object.entries(analyticsData).map(([key, value]) => ({
      'Metric': key,
      'Value': typeof value === 'object' ? JSON.stringify(value) : value,
      'Export Date': new Date().toISOString()
    }));
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportToCSV(formattedData, 'analytics');
        break;
      case 'excel':
      case 'xlsx':
        exportToExcel(formattedData, 'analytics');
        break;
      case 'json':
        exportToJSON(formattedData, 'analytics');
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting analytics:', error);
    throw error;
  }
};

// Utility function to check if browser supports download
export const supportsDownload = () => {
  return 'download' in document.createElement('a');
};

// Utility function to get file size in human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const exportUtils = {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportLeads,
  exportLeadDetails,
  exportAnalytics,
  formatDataForExport,
  supportsDownload,
  formatFileSize
};

export default exportUtils;
