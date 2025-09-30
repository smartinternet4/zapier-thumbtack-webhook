const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Thumbtack Webhook Integration'
  });
});

// Privacy Policy route
app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - Thumbtack Webhook Integration</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        p { margin-bottom: 15px; }
    </style>
</head>
<body>
# Privacy Policy for Thumbtack Webhook Integration Service<br><br>**Service URL:** https://zapier-thumbtack-webhook-production.railway.app<br><br>## Data Collection  <br>Thumbtack Webhook Integration Service collects customer contact information including name, phone number, and email address, as well as service requests and lead details necessary to facilitate lead management and notifications.<br><br>## Data Usage  <br>Collected data is used solely for processing new leads and sending timely notifications to service professionals to ensure efficient lead management.<br><br>## Data Retention  <br>Personal data is processed temporarily and is not stored long-term. No personal information is retained beyond the immediate processing required for lead management and notification.<br><br>## User Rights  <br>Users have the right to access, correct, or request deletion of their personal data processed by the service. Since no long-term storage occurs, data retention is limited to processing periods only. Users may contact the service provider for any inquiries or requests regarding their personal information.
</body>
</html>
`);
});

// Terms of Service route
app.get('/terms', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Terms of Service - Thumbtack Webhook Integration</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        p { margin-bottom: 15px; }
    </style>
</head>
<body>
# Terms of Service<br><br>## 1. Service Description  <br>Thumbtack Webhook Integration Service provides automated processing of Thumbtack leads through webhook integration. The service is accessible via https://zapier-thumbtack-webhook-production.railway.app and is designed to streamline lead management by automating data transfer and processing.<br><br>## 2. User Responsibilities  <br>Users must ensure the proper use and security of their API credentials at all times. Compliance with Thumbtack’s terms of service is mandatory. Users are responsible for maintaining confidentiality of their access information and for all activities conducted through their accounts.<br><br>## 3. Limitations of Liability  <br>Service availability is subject to operational conditions and may experience interruptions. Data processing capabilities have inherent limitations and the service does not guarantee uninterrupted or error-free operation. The service owner is not liable for any damages resulting from service downtime, data loss, or processing errors.<br><br>## 4. Contact Information  <br>For inquiries or support, please contact the service owner directly using the provided contact information.
</body>
</html>
`);
});

// OAuth callback route (for Thumbtack API integration)
app.get('/auth/callback', (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  
  // TODO: Exchange code for access token with Thumbtack API
  res.json({ 
    message: 'OAuth callback received',
    code: code,
    state: state,
    timestamp: new Date().toISOString()
  });
});

// Main webhook endpoint for Thumbtack leads
app.post('/webhook/zapier/thumbtack', (req, res) => {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET || 'test-secret-123';
    const receivedSecret = req.headers['x-webhook-secret'];
    
    if (receivedSecret !== webhookSecret) {
      console.log('Webhook authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Process the Thumbtack lead data
    const leadData = req.body;
    console.log('Received Thumbtack lead:', JSON.stringify(leadData, null, 2));
    
    // TODO: Process lead data (send to PCM API, Twilio SMS, etc.)
    
    // Respond to acknowledge receipt
    res.status(200).json({ 
      message: 'Lead processed successfully',
      leadId: leadData.customer_name || 'unknown',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Thumbtack webhook server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Privacy Policy: http://localhost:${port}/privacy`);
  console.log(`Terms of Service: http://localhost:${port}/terms`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down webhook server...');
  process.exit(0);
});