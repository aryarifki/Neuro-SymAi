import type { NextApiRequest, NextApiResponse } from 'next';
import { getGeminiClient } from '@/lib/gemini';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    gemini: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    validator: {
      status: 'healthy' | 'unhealthy';
    };
  };
  environment: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    console.log('🏥 Health check initiated');

    // Check Gemini API
    const geminiClient = getGeminiClient();
    const geminiHealth = await geminiClient.healthCheck();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (geminiHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        gemini: {
          status: geminiHealth.status,
          latency: geminiHealth.latency,
          error: geminiHealth.error
        },
        validator: {
          status: 'healthy' // Validator is always healthy if imported correctly
        }
      },
      environment: process.env.NODE_ENV || 'unknown'
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);

    console.log(`✅ Health check completed - Status: ${overallStatus}`);

  } catch (error) {
    console.error('❌ Health check failed:', error);

    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        gemini: {
          status: 'unhealthy',
          error: 'Health check failed'
        },
        validator: {
          status: 'unhealthy'
        }
      },
      environment: process.env.NODE_ENV || 'unknown'
    };

    res.status(503).json(response);
  }
}