
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Email parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Email webhook endpoint (for services like Mailgun, SendGrid, etc.)
app.post('/email-webhook', async (req, res) => {
    console.log('📧 Received email webhook:', JSON.stringify(req.body, null, 2));
    
    try {
        // Parse email data based on the service
        let emailData = null;
        
        // Mailgun format
        if (req.body.sender && req.body.subject && req.body.body) {
            emailData = {
                from: req.body.sender,
                subject: req.body.subject,
                body: req.body['body-plain'] || req.body['body-html'] || req.body.body,
                html: req.body['body-html']
            };
        }
        // SendGrid format 
        else if (req.body.from && req.body.subject && req.body.text) {
            emailData = {
                from: req.body.from,
                subject: req.body.subject,
                body: req.body.text,
                html: req.body.html
            };
        }
        // Generic format
        else {
            emailData = {
                from: req.body.from || req.body.sender || req.body.email,
                subject: req.body.subject || req.body.title,
                body: req.body.body || req.body.text || req.body.content,
                html: req.body.html
            };
        }
        
        console.log('📧 Parsed email data:', emailData);
        
        // Check if this is a Thumbtack lead notification
        if (isThumbtrackLeadEmail(emailData)) {
            console.log('🎯 Detected Thumbtack lead email!');
            
            // Extract lead information
            const leadData = extractThumbtrackLeadData(emailData);
            console.log('📊 Extracted lead data:', leadData);
            
            // Generate call script
            const callScript = generateCallScript(leadData);
            
            // Send SMS notification
            await sendSMSNotification(leadData, callScript);
            
            res.json({ 
                success: true, 
                message: 'Thumbtack lead processed successfully',
                lead: leadData
            });
        } else {
            console.log('📧 Not a Thumbtack lead email, ignoring');
            res.json({ success: true, message: 'Email received but not a Thumbtack lead' });
        }
        
    } catch (error) {
        console.error('❌ Error processing email:', error);
        res.status(500).json({ error: error.message });
    }
});

// Function to detect if email is from Thumbtack about a lead
function isThumbtrackLeadEmail(emailData) {
    const from = (emailData.from || '').toLowerCase();
    const subject = (emailData.subject || '').toLowerCase();
    const body = (emailData.body || '').toLowerCase();
    
    // Check various indicators this is a Thumbtack lead email
    const thumbtrackIndicators = [
        from.includes('thumbtack'),
        from.includes('noreply@thumbtack.com'),
        subject.includes('new lead'),
        subject.includes('customer request'),
        subject.includes('quote request'),
        body.includes('thumbtack'),
        body.includes('wants a quote'),
        body.includes('customer is looking'),
        body.includes('service request')
    ];
    
    return thumbtrackIndicators.some(indicator => indicator);
}

// Function to extract lead data from Thumbtack email
function extractThumbtrackLeadData(emailData) {
    const body = emailData.body || '';
    const subject = emailData.subject || '';
    
    // Initialize lead data
    const leadData = {
        name: '',
        phone: '',
        email: '',
        service_type: 'Cleaning Service',
        description: '',
        location: '',
        received_at: new Date().toISOString(),
        source: 'Thumbtack Email'
    };
    
    // Extract name patterns
    const namePatterns = [
        /name[:\s]+([^\n\r]+)/i,
        /customer[:\s]+([^\n\r]+)/i,
        /from[:\s]+([^\n\r]+)/i,
        /([A-Z][a-z]+\s+[A-Z][a-z]+)/
    ];
    
    for (const pattern of namePatterns) {
        const match = body.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
            leadData.name = match[1].trim();
            break;
        }
    }
    
    // Extract phone patterns
    const phonePatterns = [
        /phone[:\s]+(\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4})/i,
        /(\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4})/g,
        /call[:\s]+(\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4})/i
    ];
    
    for (const pattern of phonePatterns) {
        const match = body.match(pattern);
        if (match && match[1]) {
            leadData.phone = match[1].trim();
            break;
        }
    }
    
    // Extract email patterns  
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = body.match(emailPattern);
    if (emailMatch) {
        leadData.email = emailMatch[1];
    }
    
    // Extract location patterns
    const locationPatterns = [
        /location[:\s]+([^\n\r]+)/i,
        /address[:\s]+([^\n\r]+)/i,
        /city[:\s]+([^\n\r]+)/i,
        /zip[:\s]+(\d{5})/i
    ];
    
    for (const pattern of locationPatterns) {
        const match = body.match(pattern);
        if (match && match[1]) {
            leadData.location = match[1].trim();
            break;
        }
    }
    
    // Extract service description
    const servicePatterns = [
        /description[:\s]+([^\n\r]{10,200})/i,
        /details[:\s]+([^\n\r]{10,200})/i,
        /looking for[:\s]+([^\n\r]{10,200})/i,
        /needs[:\s]+([^\n\r]{10,200})/i
    ];
    
    for (const pattern of servicePatterns) {
        const match = body.match(pattern);
        if (match && match[1]) {
            leadData.description = match[1].trim();
            break;
        }
    }
    
    // If no specific description found, use subject
    if (!leadData.description && subject) {
        leadData.description = subject;
    }
    
    // Set default name if not found
    if (!leadData.name) {
        leadData.name = 'Thumbtack Lead';
    }
    
    return leadData;
}

// Generate call script for the lead
function generateCallScript(leadData) {
    return `📞 CALL SCRIPT for ${leadData.name}

🎯 OPENING:
"Hi ${leadData.name}, this is [Your Name] from Tile And Carpet Solutions. You recently requested a quote through Thumbtack for cleaning services. I got your request and wanted to follow up immediately!"

📋 SERVICE DETAILS:
- Service: ${leadData.service_type}
- Request: ${leadData.description}
${leadData.location ? `- Location: ${leadData.location}` : ''}

💬 KEY QUESTIONS:
1. "When are you looking to schedule this service?"
2. "What's the size of the area needing cleaning?"
3. "Any specific concerns or problem areas?"
4. "What's your preferred time frame?"

🎯 CLOSING:
"I can provide you with a competitive quote right now and schedule you as early as [next available]. What works best for your schedule?"

📞 Contact: ${leadData.phone}
${leadData.email ? `📧 Email: ${leadData.email}` : ''}
⏰ Lead received: ${new Date(leadData.received_at).toLocaleString()}`;
}

// Send SMS notification
async function sendSMSNotification(leadData, callScript) {
    const message = `🚨 NEW THUMBTACK LEAD! 🚨

👤 ${leadData.name}
📞 ${leadData.phone}
🏠 ${leadData.service_type}
📍 ${leadData.location}

💬 "${leadData.description}"

⚡ IMMEDIATE ACTION REQUIRED!
Call now while they're actively looking for service.

🎯 Call Script: Check your webhook logs or dashboard for the full call script.

💼 Tile And Carpet Solutions
⏰ ${new Date().toLocaleString()}`;

    try {
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.YOUR_PHONE_NUMBER
        });
        
        console.log('✅ SMS sent successfully:', result.sid);
        console.log('📞 Call Script:\n', callScript);
        
        return result;
    } catch (error) {
        console.error('❌ SMS sending failed:', error);
        throw error;
    }
}

// Your existing webhook endpoints
app.post('/webhook', async (req, res) => {
    console.log('🪝 Direct webhook received:', req.body);
    
    try {
        const leadData = req.body;
        const callScript = generateCallScript(leadData);
        await sendSMSNotification(leadData, callScript);
        
        res.json({ success: true, message: 'Lead processed successfully' });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        endpoints: ['/webhook', '/email-webhook', '/health']
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🧹 Tile And Carpet Solutions - Lead Processor</h1>
        <p><strong>Status:</strong> ✅ Active</p>
        <p><strong>Email Webhook:</strong> /email-webhook</p>
        <p><strong>Direct Webhook:</strong> /webhook</p>
        <p><strong>Health Check:</strong> /health</p>
        <hr>
        <h2>📧 Email Forwarding Setup:</h2>
        <ol>
            <li>Set up email forwarding service (Mailgun, SendGrid, etc.)</li>
            <li>Forward Thumbtack emails to your service</li>
            <li>Configure service to POST to: <code>${req.protocol}://${req.get('host')}/email-webhook</code></li>
            <li>Get instant SMS notifications for new leads!</li>
        </ol>
    `);
});

app.listen(port, () => {
    console.log(`🚀 Email-to-SMS Lead Processor running on port ${port}`);
    console.log(`📧 Email webhook: /email-webhook`);
    console.log(`🪝 Direct webhook: /webhook`);
    console.log(`💚 Health check: /health`);
});
