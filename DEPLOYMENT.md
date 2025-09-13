# Indonesian Law Chatbot - Deployment Guide

## Vercel Deployment (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- Gemini API key from Google AI Studio

### Step-by-Step Deployment

#### 1. Prepare Repository
```bash
# Ensure all files are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect to Vercel

**Option A: Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: indonesian-law-chatbot
# - Directory: ./
# - Want to override settings? No
```

**Option B: Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings (auto-detected)
5. Click "Deploy"

#### 3. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
GEMINI_API_KEY=your_production_gemini_api_key
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
RATE_LIMIT_RPM=100
DEBUG_MODE=false
```

#### 4. Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Production Deployment
```bash
# Deploy to production
vercel --prod
```

## Alternative Deployment Options

### 1. Netlify

```bash
# Build the application
npm run build
npm run export

# Deploy the 'out' directory to Netlify
```

**Note**: API routes need to be adapted for Netlify Functions.

### 2. Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy
```

### 3. DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy with auto-scaling enabled

### 4. Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run Docker container
docker build -t indonesian-law-chatbot .
docker run -p 3000:3000 --env-file .env.local indonesian-law-chatbot
```

## Performance Optimization

### 1. Vercel Edge Functions (Advanced)

Convert API routes to Edge Functions for better performance:

```typescript
// pages/api/chat.ts
export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  // Edge-optimized handler
}
```

### 2. CDN Configuration

Vercel automatically provides CDN. For other platforms:

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
  },
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

### 3. Database Integration (Optional)

For production with user accounts and chat history:

```bash
# Add database dependencies
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init
```

## Monitoring and Analytics

### 1. Vercel Analytics

Enable in Vercel Dashboard → Project → Analytics

### 2. Custom Monitoring

```typescript
// lib/monitoring.ts
export const trackUsage = async (action: string, metadata?: any) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ action, metadata, timestamp: Date.now() })
    });
  }
};
```

### 3. Error Tracking

```bash
# Add Sentry for error tracking
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, sentryOptions);
```

## Security Considerations

### 1. API Key Security
- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys regularly
- Monitor API usage for anomalies

### 2. Rate Limiting in Production
```typescript
// Enhanced rate limiting with Redis
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const rateLimitWithRedis = async (key: string) => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  return count <= 100; // 100 requests per minute
};
```

### 3. Content Security Policy

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ]
  },
}
```

## Scaling Considerations

### 1. Horizontal Scaling
- Vercel automatically handles scaling
- For other platforms, use load balancers
- Implement proper session management

### 2. Database Scaling
```sql
-- PostgreSQL indexes for chat history
CREATE INDEX idx_chat_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp);
```

### 3. Caching Strategy
```typescript
// lib/cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cacheResponse = async (key: string, data: any, ttl = 300) => {
  await redis.setex(key, ttl, JSON.stringify(data));
};

export const getCachedResponse = async (key: string) => {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};
```

## Maintenance

### 1. Regular Updates
```bash
# Update dependencies monthly
npm audit
npm update
npm test
```

### 2. Performance Monitoring
- Monitor API response times
- Track error rates
- Monitor Gemini API usage and costs

### 3. Backup Strategy
- Regular database backups
- Environment variable backups
- Code repository backups

## Troubleshooting Production Issues

### 1. Vercel Function Timeout
```javascript
// Increase timeout (max 60s for Pro plans)
export const config = {
  api: {
    responseLimit: false,
  },
  maxDuration: 30,
}
```

### 2. Memory Issues
```javascript
// Monitor memory usage
process.on('exit', (code) => {
  console.log('Memory usage:', process.memoryUsage());
});
```

### 3. API Rate Limiting
```typescript
// Implement exponential backoff
const retryWithBackoff = async (fn: Function, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

---

**Need help?** Check the main [README.md](./README.md) or create an issue on GitHub.