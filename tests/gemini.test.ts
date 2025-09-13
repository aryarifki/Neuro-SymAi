import { GeminiClient } from '@/lib/gemini';

// Mock the Google Generative AI module
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Mocked response from Gemini API'
        }
      })
    })
  }))
}));

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    // Set up environment variable
    process.env.GEMINI_API_KEY = 'test-api-key';
    client = new GeminiClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with API key from environment', () => {
      expect(client).toBeInstanceOf(GeminiClient);
    });

    test('should throw error if no API key provided', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GeminiClient()).toThrow('Gemini API key is required');
    });

    test('should use custom configuration', () => {
      const customClient = new GeminiClient({
        apiKey: 'custom-key',
        model: 'gemini-pro',
        temperature: 0.5,
        maxTokens: 1000
      });

      const config = customClient.getConfig();
      expect(config.model).toBe('gemini-pro');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(1000);
    });
  });

  describe('Response Generation', () => {
    test('should generate response for valid legal query', async () => {
      const result = await client.generateResponse('Apa sanksi pidana untuk pencurian?');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Mocked response from Gemini API');
      expect(result.usage).toBeDefined();
    });

    test('should handle empty input', async () => {
      const result = await client.generateResponse('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_INPUT');
    });

    test('should handle input that is too long', async () => {
      const longInput = 'x'.repeat(1001);
      const result = await client.generateResponse(longInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_INPUT');
    });

    test('should sanitize malicious input', async () => {
      const maliciousInput = '<script>alert("xss")</script>Apa itu KUHP?';
      const result = await client.generateResponse(maliciousInput);

      expect(result.success).toBe(true);
      // Input should be sanitized
      expect(maliciousInput).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Mock a high number of requests
      const promises = Array(70).fill(0).map(() => 
        client.generateResponse('Test query')
      );

      const results = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResults = results.filter(r => r.error === 'RATE_LIMITED');
      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    test('should provide retry information for rate limited requests', async () => {
      // Assuming we hit rate limit
      const result = await client.generateResponse('Test query', 'test-client-with-many-requests');
      
      if (result.error === 'RATE_LIMITED') {
        expect(result.text).toContain('Please wait');
      }
    });
  });

  describe('Health Check', () => {
    test('should return healthy status for working API', async () => {
      const health = await client.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
    });

    test('should handle API errors in health check', async () => {
      // Mock API error
      const errorClient = new GeminiClient();
      jest.spyOn(errorClient as any, 'model').mockImplementation({
        generateContent: jest.fn().mockRejectedValue(new Error('API Error'))
      });

      const health = await errorClient.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle API timeouts', async () => {
      // Mock timeout
      jest.spyOn(client as any, 'model').mockImplementation({
        generateContent: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 100)
          )
        )
      });

      const result = await client.generateResponse('Test query');

      expect(result.success).toBe(false);
      expect(result.error).toBe('TIMEOUT');
    });

    test('should handle quota exceeded errors', async () => {
      // Mock quota error
      jest.spyOn(client as any, 'model').mockImplementation({
        generateContent: jest.fn().mockRejectedValue(new Error('quota exceeded'))
      });

      const result = await client.generateResponse('Test query');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QUOTA_EXCEEDED');
    });

    test('should handle general API errors', async () => {
      // Mock general error
      jest.spyOn(client as any, 'model').mockImplementation({
        generateContent: jest.fn().mockRejectedValue(new Error('Unknown API error'))
      });

      const result = await client.generateResponse('Test query');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API_ERROR');
    });
  });

  describe('Configuration', () => {
    test('should not expose API key in configuration', () => {
      const config = client.getConfig();

      expect(config).not.toHaveProperty('apiKey');
      expect(config.model).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.maxTokens).toBeDefined();
    });
  });
});