const express = require('express');
const { supabase } = require('../config/supabase-config');
const router = express.Router();

// Get all leads with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      industry = '', 
      status = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('business_contacts')
      .select('*');

    // Apply search filter
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    // Apply industry filter
    if (industry) {
      query = query.eq('industry', industry);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: leads, error, count } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('business_contacts')
      .select('*', { count: 'exact', head: true });

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error in leads route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single lead by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: lead, error } = await supabase
      .from('business_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      console.error('Error fetching lead:', error);
      return res.status(500).json({ error: 'Failed to fetch lead' });
    }

    res.json(lead);

  } catch (error) {
    console.error('Error in lead route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new lead
router.post('/', async (req, res) => {
  try {
    const leadData = req.body;
    
    const { data: lead, error } = await supabase
      .from('business_contacts')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    res.status(201).json(lead);

  } catch (error) {
    console.error('Error in create lead route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data: lead, error } = await supabase
      .from('business_contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      console.error('Error updating lead:', error);
      return res.status(500).json({ error: 'Failed to update lead' });
    }

    res.json(lead);

  } catch (error) {
    console.error('Error in update lead route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('business_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return res.status(500).json({ error: 'Failed to delete lead' });
    }

    res.json({ message: 'Lead deleted successfully' });

  } catch (error) {
    console.error('Error in delete lead route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lead statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from('business_contacts')
      .select('industry, status, city');

    if (error) {
      console.error('Error fetching lead stats:', error);
      return res.status(500).json({ error: 'Failed to fetch lead statistics' });
    }

    // Calculate statistics
    const totalLeads = leads.length;
    const industries = {};
    const statuses = {};
    const cities = {};

    leads.forEach(lead => {
      if (lead.industry) {
        industries[lead.industry] = (industries[lead.industry] || 0) + 1;
      }
      if (lead.status) {
        statuses[lead.status] = (statuses[lead.status] || 0) + 1;
      }
      if (lead.city) {
        cities[lead.city] = (cities[lead.city] || 0) + 1;
      }
    });

    res.json({
      totalLeads,
      industries: Object.entries(industries).map(([name, count]) => ({ name, count })),
      statuses: Object.entries(statuses).map(([name, count]) => ({ name, count })),
      cities: Object.entries(cities).map(([name, count]) => ({ name, count }))
    });

  } catch (error) {
    console.error('Error in lead stats route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
