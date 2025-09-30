# Railway Deployment Guide for Zapier Thumbtack Webhook

## 📁 Files Included:
- `server.js` - Main webhook server
- `package.json` - Node.js dependencies
- `Procfile` - Railway deployment config
- `.env.example` - Environment variables template

## 🚀 Railway Deployment Steps:

### 1. Setup Repository
```bash
# Create new directory
mkdir zapier-thumbtack-webhook
cd zapier-thumbtack-webhook

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial webhook implementation"
```

### 2. Railway Deployment
1. **Login to Railway dashboard**: https://railway.app
2. **Create New Project** → "Deploy from GitHub repo"
3. **Connect your repository** with these files
4. **Railway auto-detects Node.js** and deploys

### 3. Set Environment Variables
In Railway dashboard → Variables tab:

**Required:**
- `PCM_API_KEY` = your_actual_pcm_api_key
- `PCM_API_BASE_URL` = https://api.pcmintegrations.com

**Optional:**
- `WEBHOOK_SECRET` = random_string_for_security
- `NODE_ENV` = production

### 4. Get Your Webhook URL
After deployment: `https://your-app-name.railway.app`

**Your webhook endpoint will be:**
`https://your-app-name.railway.app/webhook/zapier/thumbtack`

## 🔧 Zapier Configuration:

### Step 1: Create Zap
1. **Trigger**: Thumbtack - "New Lead"
2. **Action**: Webhooks by Zapier - "POST"

### Step 2: Configure Webhook
- **URL**: `https://your-app-name.railway.app/webhook/zapier/thumbtack`
- **Method**: POST
- **Headers** (optional):
  - `X-Webhook-Secret`: your_webhook_secret_value

### Step 3: Map Fields
Map Thumbtack trigger data to these JSON fields:
```json
{
  "leadId": "{thumbtack_lead_id}",
  "customerFirstName": "{customer_first_name}",
  "customerLastName": "{customer_last_name}",
  "customerEmail": "{customer_email}",
  "customerPhone": "{customer_phone}",
  "customerAddress": "{customer_address}",
  "customerCity": "{customer_city}",
  "customerState": "{customer_state}",
  "customerZip": "{customer_zip}",
  "serviceCategory": "{service_category}",
  "requestTitle": "{request_title}",
  "requestDescription": "{request_description}",
  "budgetMin": "{budget_minimum}",
  "budgetMax": "{budget_maximum}",
  "startDate": "{preferred_start_date}",
  "urgency": "{urgency_level}",
  "createdAt": "{created_at}"
}
```

## 🧪 Testing:

### Test Webhook Directly:
```bash
curl -X POST https://your-app-name.railway.app/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Health Check:
```bash
curl https://your-app-name.railway.app/health
```

## 📋 What Happens Next:

1. **Zapier sends webhook** → Your Railway app
2. **Webhook transforms data** → PCM format
3. **Sends to PCM Integration** → Creates lead
4. **Triggers follow-up actions**:
   - Sends SMS to customer
   - Creates task in PCM system

## 🐛 Debugging:
- Check Railway logs for errors
- Use `/webhook/test` endpoint for testing
- Verify environment variables are set
- Check PCM API key permissions

## 💰 Costs:
- Railway: ~$5/month
- Zapier: $20+/month (for premium features)
