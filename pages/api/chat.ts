import type { NextApiRequest, NextApiResponse } from 'next';
import { getGeminiClient } from '@/lib/gemini';
import { getValidator } from '@/lib/validators';

// Types for API
interface ChatRequest {
  message: string;
  sessionId?: string;
}

interface ChatResponse {
  response: string;
  isValid: boolean;
  confidence?: number;
  sources?: string[];
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface ApiError {
  error: string;
  code: string;
  details?: string;
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Request validation
function validateRequest(req: NextApiRequest): { isValid: boolean; error?: string } {
  // Check HTTP method
  if (req.method !== 'POST') {
    return { isValid: false, error: 'Method not allowed. Use POST.' };
  }

  // Check content type
  const contentType = req.headers['content-type'];
  if (!contentType?.includes('application/json')) {
    return { isValid: false, error: 'Content-Type must be application/json' };
  }

  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    return { isValid: false, error: 'Request body must be valid JSON' };
  }

  const { message } = req.body as ChatRequest;

  // Validate message
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'Message is required and must be a string' };
  }

  if (message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (message.length > 1000) {
    return { isValid: false, error: 'Message too long (max 1000 characters)' };
  }

  return { isValid: true };
}

// IP-based rate limiting
function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = parseInt(process.env.RATE_LIMIT_RPM || '60');

  const key = `rate_limit_${clientIp}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // New window or expired window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime };
}

// Get client IP address
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return req.socket.remoteAddress || 'unknown';
}

// Security headers
function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : '*';
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Main API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ApiError>
) {
  const startTime = Date.now();
  const clientIp = getClientIp(req);
  
  // Set security headers
  setSecurityHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log(`🔄 Chat API request from ${clientIp} - ${req.method}`);

    // Validate request
    const validation = validateRequest(req);
    if (!validation.isValid) {
      console.log(`❌ Request validation failed: ${validation.error}`);
      return res.status(400).json({
        error: validation.error!,
        code: 'INVALID_REQUEST'
      });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      console.log(`🚫 Rate limit exceeded for ${clientIp}`);
      
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        details: `Please wait ${retryAfter} seconds before making another request`
      });
    }

    // Extract request data
    const { message, sessionId = clientIp } = req.body as ChatRequest;
    
    console.log(`📝 Processing message (${message.length} chars) for session: ${sessionId}`);

    // Initialize services
    const geminiClient = getGeminiClient();
    const validator = getValidator();

    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await geminiClient.generateResponse(message, sessionId);

    if (!aiResponse.success) {
      console.log(`❌ AI generation failed: ${aiResponse.error}`);
      return res.status(500).json({
        error: aiResponse.text,
        code: aiResponse.error || 'AI_ERROR'
      });
    }

    // Validate response
    console.log('🔍 Validating AI response...');
    const validationResult = await validator.validateResponse(message, aiResponse.text);

    // Prepare response
    if (validationResult.isValid) {
      console.log(`✅ Response validated successfully (confidence: ${validationResult.confidence.toFixed(1)}%)`);
      
      const response: ChatResponse = {
        response: validationResult.validatedText,
        isValid: true,
        confidence: validationResult.confidence,
        sources: validationResult.sources,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      };

      res.status(200).json(response);
    } else {
      console.log(`❌ Response validation failed (confidence: ${validationResult.confidence.toFixed(1)}%)`);
      console.log('Issues:', validationResult.issues.map(i => i.message));

      // Generate user-friendly error message
      const errorMessage = validator.generateErrorMessage(validationResult);
      
      const response: ChatResponse = {
        response: errorMessage,
        isValid: false,
        confidence: validationResult.confidence,
        sources: validationResult.sources,
        error: 'VALIDATION_FAILED',
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      };

      res.status(200).json(response);
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ Request completed in ${duration}ms`);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 Unexpected error in chat API (${duration}ms):`, error);

    // Don't expose internal errors to client
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Terjadi kesalahan server. Silakan coba lagi.';

    res.status(500).json({
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
}

// API configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '8mb',
  },
}