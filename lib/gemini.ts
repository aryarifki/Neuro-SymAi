import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for Gemini API integration
export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Rate limiting implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  getTimeUntilReset(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }
}

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: any;
  private rateLimiter: RateLimiter;
  private config: GeminiConfig;

  constructor(config: Partial<GeminiConfig> = {}) {
    // Validate API key
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }

    this.config = {
      apiKey,
      model: config.model || 'gemini-1.5-pro-latest',
      temperature: config.temperature || 0.1, // Low temperature for factual legal responses
      maxTokens: config.maxTokens || 2048,
    };

    this.client = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.client.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: this.config.maxTokens,
      },
    });

    // Initialize rate limiter (default: 60 requests per minute)
    const rpmLimit = parseInt(process.env.RATE_LIMIT_RPM || '60');
    this.rateLimiter = new RateLimiter(rpmLimit);

    console.log('✅ Gemini client initialized with model:', this.config.model);
  }

  /**
   * Generate a legal-focused system prompt for Indonesian law queries
   */
  private createLegalSystemPrompt(): string {
    return `Anda adalah asisten AI yang ahli dalam hukum Indonesia. Tugas Anda adalah memberikan informasi akurat tentang peraturan perundang-undangan Indonesia.

ATURAN PENTING:
1. HANYA jawab pertanyaan tentang hukum Indonesia (UU, Perppu, Perpres, KUHP, KUHPerdata, hukum pidana, perdata, konstitusi, dll.)
2. SELALU sertakan sumber hukum yang spesifik dan valid (contoh: UU No. 11 Tahun 2020 Pasal 5, KUHP Pasal 362, UUD 1945 Pasal 28)
3. Gunakan bahasa Indonesia yang formal dan jelas
4. Jika tidak yakin atau informasi tidak lengkap, nyatakan dengan jelas
5. JANGAN memberikan nasihat hukum atau opini pribadi
6. JANGAN bahas topik di luar hukum Indonesia
7. JANGAN berspekulasi atau membuat asumsi tanpa dasar hukum yang jelas

Format jawaban:
- Berikan penjelasan yang akurat berdasarkan peraturan yang berlaku
- Cantumkan sumber hukum (UU/Pasal) untuk setiap klaim hukum
- Gunakan struktur yang mudah dipahami
- Akhiri dengan disclaimer bahwa ini adalah informasi umum, bukan nasihat hukum

Jika pertanyaan di luar topik hukum Indonesia, jawab: "Maaf, saya hanya dapat membantu dengan pertanyaan tentang hukum Indonesia. Silakan tanyakan tentang undang-undang, peraturan, atau aspek hukum lainnya yang berlaku di Indonesia."`;
  }

  /**
   * Check rate limiting before making request
   */
  private checkRateLimit(identifier: string = 'global'): { allowed: boolean; retryAfter?: number } {
    if (!this.rateLimiter.canMakeRequest(identifier)) {
      const retryAfter = Math.ceil(this.rateLimiter.getTimeUntilReset(identifier) / 1000);
      return { allowed: false, retryAfter };
    }
    return { allowed: true };
  }

  /**
   * Sanitize and validate user input
   */
  private sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input: message must be a non-empty string');
    }

    // Remove potentially harmful content
    const sanitized = input
      .trim()
      .replace(/[<>\"'&]/g, '') // Basic XSS prevention
      .substring(0, 1000); // Limit length

    if (sanitized.length === 0) {
      throw new Error('Input is empty after sanitization');
    }

    return sanitized;
  }

  /**
   * Generate response for legal query with retry logic
   */
  async generateResponse(
    userMessage: string, 
    clientId: string = 'anonymous'
  ): Promise<GeminiResponse> {
    try {
      // Rate limiting check
      const rateLimitCheck = this.checkRateLimit(clientId);
      if (!rateLimitCheck.allowed) {
        return {
          text: `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} seconds before making another request.`,
          success: false,
          error: 'RATE_LIMITED'
        };
      }

      // Sanitize input
      const sanitizedMessage = this.sanitizeInput(userMessage);
      
      // Create full prompt with system instructions and user query
      const systemPrompt = this.createLegalSystemPrompt();
      const fullPrompt = `${systemPrompt}\n\nPertanyaan pengguna: ${sanitizedMessage}`;

      console.log('🔄 Sending request to Gemini API...');
      
      // Make API call with timeout and retry logic
      const startTime = Date.now();
      let result;
      
      try {
        result = await Promise.race([
          this.model.generateContent(fullPrompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
      } catch (error) {
        console.error('❌ Gemini API call failed:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            return {
              text: 'Maaf, sistem sedang mengalami keterlambatan. Silakan coba lagi dalam beberapa saat.',
              success: false,
              error: 'TIMEOUT'
            };
          }
          
          if (error.message.includes('quota') || error.message.includes('limit')) {
            return {
              text: 'Sistem sedang sibuk. Silakan coba lagi nanti.',
              success: false,
              error: 'QUOTA_EXCEEDED'
            };
          }
        }

        return {
          text: 'Terjadi kesalahan dalam memproses permintaan Anda. Silakan coba lagi.',
          success: false,
          error: 'API_ERROR'
        };
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ Gemini API response received in ${responseTime}ms`);

      // Extract text from response
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        return {
          text: 'Maaf, tidak dapat menghasilkan respons yang sesuai. Silakan coba dengan pertanyaan yang lebih spesifik.',
          success: false,
          error: 'EMPTY_RESPONSE'
        };
      }

      console.log('📤 Generated response length:', text.length, 'characters');

      return {
        text: text.trim(),
        success: true,
        usage: {
          promptTokens: fullPrompt.length / 4, // Rough estimation
          completionTokens: text.length / 4,
          totalTokens: (fullPrompt.length + text.length) / 4
        }
      };

    } catch (error) {
      console.error('❌ Unexpected error in generateResponse:', error);
      
      return {
        text: 'Maaf, terjadi kesalahan sistem. Tim teknis kami akan segera memperbaikinya.',
        success: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Health check for the Gemini API connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      const result = await this.model.generateContent('Test koneksi - jawab dengan "OK"');
      const response = await result.response;
      const text = response.text();
      
      const latency = Date.now() - startTime;
      
      if (text) {
        return { status: 'healthy', latency };
      } else {
        return { status: 'unhealthy', error: 'Empty response' };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Omit<GeminiConfig, 'apiKey'> {
    return {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };
  }
}

// Singleton instance for the application
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    geminiClient = new GeminiClient();
  }
  return geminiClient;
}

export default GeminiClient;