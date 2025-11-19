const axios = require('axios');
const dns = require('dns').promises;
const { promisify } = require('util');
const net = require('net');

class EmailEnrichment {
  constructor() {
    this.emailPatterns = [
      'first.last@domain.com',
      'first@domain.com',
      'first_last@domain.com',
      'firstl@domain.com',
      'f.last@domain.com',
      'first.l@domain.com',
      'firstname@domain.com',
      'fname@domain.com',
      'firstname.lastname@domain.com',
      'first.lastname@domain.com',
      'firstname.l@domain.com',
      'f.lastname@domain.com'
    ];
    
    this.commonNames = [
      'john', 'jane', 'mike', 'sarah', 'david', 'emma', 'james', 'lisa',
      'robert', 'anna', 'michael', 'jennifer', 'william', 'linda', 'richard',
      'susan', 'thomas', 'jessica', 'christopher', 'ashley', 'charles', 'amanda',
      'daniel', 'brittany', 'matthew', 'nicole', 'anthony', 'elizabeth',
      'mark', 'stephanie', 'donald', 'rebecca', 'steven', 'laura', 'paul',
      'michelle', 'andrew', 'kimberly', 'joshua', 'deborah', 'kenneth',
      'dorothy', 'kevin', 'helen', 'brian', 'diane', 'george', 'ruth',
      'edward', 'julie', 'ronald', 'joyce', 'timothy', 'virginia', 'jason',
      'victoria', 'jeffrey', 'kelly', 'ryan', 'lauren', 'jacob', 'christine',
      'gary', 'amy', 'nicholas', 'shirley', 'eric', 'anna', 'jonathan', 'brenda'
    ];
  }

  // Generate email addresses for a company
  async generateEmails(companyName, domain, maxEmails = 10) {
    try {
      if (!domain) {
        domain = this.extractDomain(companyName);
      }
      
      if (!domain) {
        throw new Error('No domain available for email generation');
      }

      const emails = [];
      const usedNames = new Set();

      // Generate emails using common names
      for (const name of this.commonNames) {
        if (emails.length >= maxEmails) break;
        
        const email = `${name}@${domain}`;
        if (!usedNames.has(name)) {
          emails.push({
            email: email,
            pattern: 'first@domain.com',
            confidence: 0.7,
            generated_at: new Date().toISOString()
          });
          usedNames.add(name);
        }
      }

      // Generate emails using company name patterns
      const companyWords = companyName.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      
      for (const word of companyWords) {
        if (emails.length >= maxEmails) break;
        
        const email = `${word}@${domain}`;
        emails.push({
          email: email,
          pattern: 'company@domain.com',
          confidence: 0.8,
          generated_at: new Date().toISOString()
        });
      }

      // Generate generic emails
      const genericEmails = [
        `info@${domain}`,
        `contact@${domain}`,
        `hello@${domain}`,
        `sales@${domain}`,
        `support@${domain}`,
        `admin@${domain}`,
        `team@${domain}`,
        `office@${domain}`
      ];

      for (const email of genericEmails) {
        if (emails.length >= maxEmails) break;
        
        emails.push({
          email: email,
          pattern: 'generic@domain.com',
          confidence: 0.9,
          generated_at: new Date().toISOString()
        });
      }

      return emails.slice(0, maxEmails);
      
    } catch (error) {
      console.error('❌ Email generation failed:', error);
      return [];
    }
  }

  // Extract domain from company name or website
  extractDomain(companyName) {
    try {
      // If it's already a domain
      if (companyName.includes('.com') || companyName.includes('.org') || companyName.includes('.net')) {
        const url = new URL(companyName.startsWith('http') ? companyName : `https://${companyName}`);
        return url.hostname;
      }
      
      // Generate domain from company name
      const cleanName = companyName.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .substring(0, 20);
      
      return `${cleanName}.com`;
      
    } catch (error) {
      console.error('❌ Domain extraction failed:', error);
      return null;
    }
  }

  // Verify email domain validity
  async verifyDomain(domain) {
    try {
      // Check if domain has valid DNS records
      const mxRecords = await dns.resolveMx(domain);
      const hasValidMX = mxRecords && mxRecords.length > 0;
      
      // Check if domain responds to basic connection
      const isReachable = await this.checkDomainReachability(domain);
      
      return {
        domain: domain,
        has_mx_records: hasValidMX,
        is_reachable: isReachable,
        mx_records: mxRecords || [],
        verified_at: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        domain: domain,
        has_mx_records: false,
        is_reachable: false,
        error: error.message,
        verified_at: new Date().toISOString()
      };
    }
  }

  // Check if domain is reachable
  async checkDomainReachability(domain) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(80, domain);
    });
  }

  // Verify individual email addresses (basic validation)
  async verifyEmails(emails) {
    const verifiedEmails = [];
    
    for (const emailData of emails) {
      try {
        const email = emailData.email;
        
        // Basic email format validation
        const isValidFormat = this.validateEmailFormat(email);
        
        // Domain validation
        const domain = email.split('@')[1];
        const domainInfo = await this.verifyDomain(domain);
        
        const verificationResult = {
          ...emailData,
          is_valid_format: isValidFormat,
          domain_info: domainInfo,
          overall_score: this.calculateEmailScore(isValidFormat, domainInfo),
          verified_at: new Date().toISOString()
        };
        
        verifiedEmails.push(verificationResult);
        
      } catch (error) {
        console.error('❌ Email verification failed:', error);
        verifiedEmails.push({
          ...emailData,
          is_valid_format: false,
          domain_info: null,
          overall_score: 0,
          error: error.message,
          verified_at: new Date().toISOString()
        });
      }
    }
    
    return verifiedEmails;
  }

  // Validate email format
  validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Calculate email confidence score
  calculateEmailScore(isValidFormat, domainInfo) {
    let score = 0;
    
    if (isValidFormat) score += 30;
    if (domainInfo.has_mx_records) score += 40;
    if (domainInfo.is_reachable) score += 30;
    
    return Math.min(score, 100);
  }

  // Enrich leads with email data
  async enrichLeadsWithEmails(leads) {
    const enrichedLeads = [];
    
    for (const lead of leads) {
      try {
        const enrichedLead = { ...lead };
        
        // Generate emails if we have company name
        if (lead.company_name) {
          const domain = lead.domain || this.extractDomain(lead.company_name);
          
          if (domain) {
            const emails = await this.generateEmails(lead.company_name, domain, 5);
            const verifiedEmails = await this.verifyEmails(emails);
            
            enrichedLead.emails = verifiedEmails;
            enrichedLead.best_email = this.getBestEmail(verifiedEmails);
            enrichedLead.email_count = verifiedEmails.length;
          }
        }
        
        enrichedLeads.push(enrichedLead);
        
      } catch (error) {
        console.error('❌ Lead email enrichment failed:', error);
        enrichedLeads.push(lead);
      }
    }
    
    return enrichedLeads;
  }

  // Get the best email from verified emails
  getBestEmail(verifiedEmails) {
    if (!verifiedEmails || verifiedEmails.length === 0) return null;
    
    // Sort by overall score and confidence
    const sortedEmails = verifiedEmails.sort((a, b) => {
      const scoreDiff = (b.overall_score || 0) - (a.overall_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      
      return (b.confidence || 0) - (a.confidence || 0);
    });
    
    return sortedEmails[0];
  }

  // Bulk email generation for multiple companies
  async bulkGenerateEmails(companies, maxEmailsPerCompany = 5) {
    const results = [];
    
    for (const company of companies) {
      try {
        const emails = await this.generateEmails(
          company.company_name, 
          company.domain, 
          maxEmailsPerCompany
        );
        
        const verifiedEmails = await this.verifyEmails(emails);
        
        results.push({
          company_id: company.id || company.company_name,
          company_name: company.company_name,
          emails: verifiedEmails,
          total_emails: verifiedEmails.length,
          best_email: this.getBestEmail(verifiedEmails),
          generated_at: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Failed to generate emails for ${company.company_name}:`, error);
        results.push({
          company_id: company.id || company.company_name,
          company_name: company.company_name,
          emails: [],
          total_emails: 0,
          best_email: null,
          error: error.message,
          generated_at: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  // Get email statistics
  getEmailStats(enrichedLeads) {
    const stats = {
      total_leads: enrichedLeads.length,
      leads_with_emails: 0,
      total_emails: 0,
      valid_emails: 0,
      high_confidence_emails: 0,
      average_email_score: 0,
      domain_verification_rate: 0,
      top_domains: []
    };
    
    const domainCounts = {};
    let totalScore = 0;
    let verifiedDomains = 0;
    
    enrichedLeads.forEach(lead => {
      if (lead.emails && lead.emails.length > 0) {
        stats.leads_with_emails++;
        stats.total_emails += lead.emails.length;
        
        lead.emails.forEach(email => {
          if (email.is_valid_format) stats.valid_emails++;
          if (email.overall_score >= 80) stats.high_confidence_emails++;
          
          totalScore += email.overall_score || 0;
          
          if (email.domain_info) {
            const domain = email.domain_info.domain;
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            
            if (email.domain_info.has_mx_records) verifiedDomains++;
          }
        });
      }
    });
    
    if (stats.total_emails > 0) {
      stats.average_email_score = Math.round(totalScore / stats.total_emails);
    }
    
    if (stats.total_emails > 0) {
      stats.domain_verification_rate = Math.round((verifiedDomains / stats.total_emails) * 100);
    }
    
    // Get top domains
    stats.top_domains = Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
    
    return stats;
  }
}

module.exports = EmailEnrichment;
