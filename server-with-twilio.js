const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const yourPhoneNumber = process.env.YOUR_PHONE_NUMBER;

let twilioClient;
if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Thumbtack Webhook Integration',
        twilio_configured: !!twilioClient
    });
});

// Privacy Policy endpoint for Thumbtack OAuth
app.get('/privacy', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Thumbtack Integration</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
            h1, h2 { color: #333; }
            .last-updated { color: #666; font-style: italic; }
        </style>
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: October 2024</p>
        
        <h2>Information We Collect</h2>
        <p>We collect lead information from Thumbtack including customer names, phone numbers, and service requests to provide SMS notifications to our users.</p>
        
        <h2>How We Use Your Information</h2>
        <p>We use the collected information solely to:</p>
        <ul>
            <li>Send SMS notifications about new leads</li>
            <li>Process webhook data from Thumbtack</li>
            <li>Provide lead management services</li>
        </ul>
        
        <h2>Data Security</h2>
        <p>We implement appropriate security measures to protect your information. Data is transmitted securely and stored only as long as necessary to provide our services.</p>
        
        <h2>Contact Us</h2>
        <p>If you have questions about this Privacy Policy, please contact us through our support channels.</p>
    </html>
`);
});

// Terms of Service endpoint for Thumbtack OAuth
app.get('/terms', (req, res) => {
res.send(`
<!DOCTYPE html>
<html lang="en">

        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terms of Service - Thumbtack Integration</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
            h1, h2 { color: #333; }
            .last-updated { color: #666; font-style: italic; }
        </style>
        <h1>Terms of Service</h1>
        <p class="last-updated">Last updated: October 2024</p>
        
        <h2>Service Description</h2>
        <p>Our service provides SMS notifications for Thumbtack leads through webhook integration.</p>
        
        <h2>Acceptable Use</h2>
        <p>You may use our service only for legitimate business purposes related to managing Thumbtack leads. You agree not to:</p>
        <ul>
            <li>Use the service for spam or unsolicited communications</li>
            <li>Attempt to circumvent security measures</li>
            <li>Interfere with the operation of the service</li>
        </ul>
        
        <h2>Service Availability</h2>
        <p>We strive to maintain high availability but do not guarantee uninterrupted service. We reserve the right to modify or discontinue the service with notice.</p>
        
        <h2>Limitation of Liability</h2>
        <p>Our liability is limited to the maximum extent permitted by law. We are not responsible for any indirect or consequential damages.</p>
        
        <h2>Contact</h2>
        <p>For questions about these Terms, please contact us through our support channels.</p>
    </html>
`);
});

// OAuth callback endpoint (placeholder for Thumbtack OAuth)
app.get('/auth/callback', (req, res) => {
res.json({
status: 'callback_received',
query: req.query,
message: 'OAuth callback endpoint is ready'
});
});

// Test SMS endpoint
app.post('/test-sms', async (req, res) => {
if (!twilioClient) {
return res.status(500).json({
error: 'Twilio not configured',
message: 'Please check your Twilio environment variables'
});
}

const testPhone = req.body.phone_number || yourPhoneNumber;

try {
    const message = await twilioClient.messages.create({
        body: '🧪 Test SMS from your Thumbtack webhook! SMS notifications are working correctly. 🎉',
        from: twilioPhoneNumber,
        to: testPhone
    });

    res.json({ 
        success: true, 
        messageSid: message.sid,
        to: testPhone,
        message: 'Test SMS sent successfully!'
    });
} catch (error) {
    console.error('SMS Error:', error);
    res.status(500).json({ 
        error: 'Failed to send SMS',
        details: error.message 
    });
}
});

// Main webhook endpoint for Zapier/Thumbtack integration
app.post('/webhook/zapier/thumbtack', async (req, res) => {
console.log('Webhook received:', JSON.stringify(req.body, null, 2));
console.log('Headers:', JSON.stringify(req.headers, null, 2));

try {
    // Extract lead information from the webhook payload
    const leadData = req.body;
    
    // Send SMS notification if Twilio is configured
    if (twilioClient && yourPhoneNumber) {
        const smsBody = `🏠 NEW THUMBTACK LEAD!
👤 Customer: ${leadData.customer_name || 'Unknown'}
📞 Phone: ${leadData.phone_number || 'Not provided'}
🔧 Service: ${leadData.service_type || 'Not specified'}
📍 Location: ${leadData.location || 'Not provided'}
💰 Budget: ${leadData.budget || 'Not specified'}
📝 Details: ${leadData.description || 'No details provided'}

⏰ Respond quickly to win this lead!`;

        try {
            const message = await twilioClient.messages.create({
                body: smsBody,
                from: twilioPhoneNumber,
                to: yourPhoneNumber
            });
            
            console.log('SMS sent successfully:', message.sid);
        } catch (smsError) {
            console.error('SMS Error:', smsError);
            // Continue processing even if SMS fails
        }
    }

    // Respond to Zapier/webhook caller
    res.json({
        success: true,
        message: 'Lead processed successfully',
        leadId: leadData.id || `lead_${Date.now()}`,
        timestamp: new Date().toISOString(),
        sms_sent: !!twilioClient
    });

} catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        details: error.message
    });
}
});

// Catch-all endpoint for debugging
app.use('*', (req, res) => {
res.status(404).json({
error: 'Endpoint not found',
method: req.method,
path: req.originalUrl,
available_endpoints: {
'GET /health': 'Health check',
'GET /privacy': 'Privacy policy for OAuth',
'GET /terms': 'Terms of service for OAuth',
'GET /auth/callback': 'OAuth callback',
'POST /test-sms': 'Test SMS functionality',
'POST /webhook/zapier/thumbtack': 'Main webhook endpoint'
}
});
});

app.listen(PORT, () => {
console.log(Thumbtack webhook server running on port ${PORT});
console.log(Twilio configured: ${!!twilioClient});
console.log('Available endpoints:');
console.log( GET /health - Health check);
console.log( GET /privacy - Privacy policy);
console.log( GET /terms - Terms of service);
console.log( POST /test-sms - Test SMS);
console.log( POST /webhook/zapier/thumbtack - Main webhook);
});

