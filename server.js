
const express = require('express');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));

// Configuration
const PCM_API_BASE_URL = process.env.PCM_API_BASE_URL || 'https://api.pcmintegrations.com';
const PCM_API_KEY = process.env.PCM_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // Optional simple auth

// Simple auth middleware (optional)
function validateWebhook(req, res, next) {
  if (WEBHOOK_SECRET) {
    const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
    if (providedSecret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
}

// Transform Zapier payload to PCM format
function transformZapierToPCM(zapierData) {
  return {
    lead_source: 'thumbtack_zapier',
    external_lead_id: zapierData.leadId || zapierData.id,
    customer: {
      first_name: zapierData.customerFirstName,
      last_name: zapierData.customerLastName,
      email: zapierData.customerEmail,
      phone: zapierData.customerPhone,
      address: {
        street: zapierData.customerAddress,
        city: zapierData.customerCity,
        state: zapierData.customerState,
        zip_code: zapierData.customerZip
      }
    },
    service_request: {
      category: zapierData.serviceCategory,
      title: zapierData.requestTitle,
      description: zapierData.requestDescription,
      budget_min: zapierData.budgetMin ? parseFloat(zapierData.budgetMin) : null,
      budget_max: zapierData.budgetMax ? parseFloat(zapierData.budgetMax) : null,
      preferred_start_date: zapierData.startDate,
      location_type: zapierData.locationType || 'in_person',
      urgency: zapierData.urgency
    },
    lead_details: {
      created_at: zapierData.createdAt || new Date().toISOString(),
      lead_fee: zapierData.leadFee ? parseFloat(zapierData.leadFee) : null,
      response_deadline: zapierData.responseDeadline,
      source_details: zapierData.sourceDetails || {}
    },
    metadata: {
      webhook_received_at: new Date().toISOString(),
      zapier_webhook: true,
      raw_zapier_data: zapierData
    }
  };
}

// Main webhook endpoint for Zapier
app.post('/webhook/zapier/thumbtack', validateWebhook, async (req, res) => {
  try {
    console.log('Received Zapier webhook:', JSON.stringify(req.body, null, 2));
    
    const zapierData = req.body;
    
    // Transform to PCM format
    const pcmLead = transformZapierToPCM(zapierData);
    
    // Send to PCM Integration
    const response = await axios.post(
      `${PCM_API_BASE_URL}/v1/leads`,
      pcmLead,
      {
        headers: {
          'Authorization': `Bearer ${PCM_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Source': 'zapier-thumbtack'
        },
        timeout: 10000
      }
    );
    
    console.log('Lead sent to PCM successfully:', response.status);
    
    // Optional: Trigger follow-up actions
    await triggerFollowupActions(pcmLead);
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Lead processed',
      leadId: pcmLead.external_lead_id,
      pcmResponse: response.status
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    
    // Return success to Zapier to avoid retries for permanent failures
    if (error.response && error.response.status < 500) {
      res.status(200).json({ 
        status: 'error', 
        message: 'Permanent error - not retrying',
        error: error.message
      });
    } else {
      // Return error for temporary issues (Zapier will retry)
      res.status(500).json({ 
        error: 'Temporary error - please retry',
        message: error.message
      });
    }
  }
});

async function triggerFollowupActions(pcmLead) {
  try {
    // Example: Send SMS notification
    if (pcmLead.customer.phone) {
      await axios.post(`${PCM_API_BASE_URL}/v1/notifications/sms`, {
        to: pcmLead.customer.phone,
        message: `Hi ${pcmLead.customer.first_name}, thanks for your interest! We'll call you within 24 hours.`,
        lead_id: pcmLead.external_lead_id
      }, {
        headers: { 'Authorization': `Bearer ${PCM_API_KEY}` }
      });
    }
    
    // Example: Create task in PCM
    await axios.post(`${PCM_API_BASE_URL}/v1/tasks`, {
      title: `Follow up with ${pcmLead.customer.first_name} ${pcmLead.customer.last_name}`,
      description: `New ${pcmLead.service_request.category} lead from Thumbtack`,
      due_date: new Date(Date.now() + 24*60*60*1000).toISOString(),
      lead_id: pcmLead.external_lead_id,
      priority: 'high'
    }, {
      headers: { 'Authorization': `Bearer ${PCM_API_KEY}` }
    });
    
  } catch (error) {
    console.error('Follow-up action failed:', error.message);
    // Don't throw - lead processing was successful
  }
}

// Test endpoint
app.post('/webhook/test', (req, res) => {
  console.log('Test webhook received:', req.body);
  res.json({ status: 'test successful', received: req.body });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Zapier webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/zapier/thumbtack`);
});

module.exports = app;
