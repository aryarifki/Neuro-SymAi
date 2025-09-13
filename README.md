# Neuro-Symbolic AI 🇮🇩⚖️

A production-ready AI chatbot specialized in Indonesian law, built with Next.js, TypeScript, and the Gemini API. This application provides accurate legal information with comprehensive validation and source citation enforcement.

## 🌟 Features

### Core Functionality
- **Specialized Legal AI**: Focused exclusively on Indonesian law topics (UU, KUHP, KUHPerdata, constitutional law, etc.)
- **Advanced Validation**: Multi-layered validation system to prevent hallucinations and ensure accuracy
- **Source Citation**: Automatic detection and validation of legal source citations
- **Real-time Chat**: Responsive chat interface with typing indicators and confidence scores
- **Mobile Responsive**: Optimized for both desktop and mobile devices

### Technical Features
- **Zero-Config Deployment**: Ready for Vercel deployment with no additional configuration
- **Rate Limiting**: Built-in API rate limiting for production use
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Local Storage**: Automatic chat history persistence
- **Health Monitoring**: API health checks and connection status indicators
- **Security**: XSS protection, CORS configuration, and input sanitization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Gemini API key from Google AI Studio

### Installation

1. **Clone and Setup**
   ```bash
   git clone https://github.com/aryarifki/Neuro-SymAi.git
   cd indonesian-law-chatbot
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   RATE_LIMIT_RPM=60
   DEBUG_MODE=true
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to see the application.

4. **Run Tests**
   ```bash
   npm test
   ```

## 🌐 Deployment to Vercel

### Automated Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   ```bash
   npx vercel
   ```
   
   Or connect your GitHub repository to Vercel Dashboard.

3. **Set Environment Variables**
   In Vercel Dashboard → Project Settings → Environment Variables:
   ```
   GEMINI_API_KEY=your_production_gemini_api_key
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   RATE_LIMIT_RPM=100
   DEBUG_MODE=false
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Deployment

```bash
npm run build
npm start
```

## 📁 Project Structure

```
indonesian-law-chatbot/
├── lib/                      # Core business logic
│   ├── gemini.ts            # Gemini API integration
│   └── validators.ts        # Legal validation system
├── pages/                   # Next.js pages and API routes
│   ├── api/
│   │   ├── chat.ts         # Main chat endpoint
│   │   └── health.ts       # Health check endpoint
│   ├── _app.tsx            # Next.js app wrapper
│   └── index.tsx           # Main chat interface
├── styles/
│   └── globals.css         # DeepSeek-inspired dark theme
├── tests/                  # Test suites
│   ├── validators.test.ts  # Validator tests
│   └── gemini.test.ts     # API client tests
├── .env.example           # Environment template
├── .env.local            # Local environment (DO NOT COMMIT)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── next.config.js        # Next.js configuration
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio | - | ✅ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `NEXT_PUBLIC_APP_URL` | Your application URL | `http://localhost:3000` | ❌ |
| `RATE_LIMIT_RPM` | Requests per minute limit | `60` | ❌ |
| `DEBUG_MODE` | Enable debug logging | `false` | ❌ |

### API Configuration

The application uses the Gemini 1.5 Pro model with optimized settings for legal accuracy:
- **Temperature**: 0.1 (low randomness for factual responses)
- **Max Tokens**: 2048
- **Model**: `gemini-1.5-pro-latest`

## 🛡️ Validation System

The Indonesian Law Validator implements multi-layered validation:

### 1. Topic Relevance
- Validates Indonesian law keywords
- Rejects off-topic queries
- Supports legal terminology in Bahasa Indonesia

### 2. Source Citation
- Detects legal citations (UU, KUHP, KUHPerdata, etc.)
- Validates citation formats
- Requires proper source attribution

### 3. Hallucination Detection
- Cross-checks against Indonesian law knowledge base
- Detects common legal misconceptions
- Flags unsupported absolute statements

### 4. Safety Checks
- Prevents harmful legal advice
- Rejects guidance for illegal activities
- Ensures ethical legal information

### 5. Quality Assessment
- Checks response completeness
- Validates logical consistency
- Ensures appropriate legal language

## 🎨 UI/UX Features

### DeepSeek-Inspired Design
- **Dark Theme**: Professional dark color scheme
- **Typography**: Inter font family for readability
- **Animations**: Smooth transitions and typing indicators
- **Responsive**: Mobile-first responsive design

### Chat Interface
- **Message Bubbles**: Distinct styling for user/AI/error messages
- **Confidence Scores**: Visual confidence indicators for AI responses
- **Source Display**: Legal source citations prominently displayed
- **History**: Local storage for chat persistence

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML and ARIA labels
- **High Contrast**: Optimized for various vision needs
- **Reduced Motion**: Respects user motion preferences

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Validator System**: Comprehensive validation logic testing
- **API Integration**: Gemini API client testing with mocks
- **Edge Cases**: Error handling, rate limiting, and edge cases
- **Performance**: Response time and concurrent request testing

## 🔍 API Documentation

### POST /api/chat

Main chat endpoint for legal queries.

**Request:**
```json
{
  "message": "Apa sanksi pidana untuk pencurian?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "Berdasarkan KUHP Pasal 362...",
  "isValid": true,
  "confidence": 95.2,
  "sources": ["KUHP Pasal 362"],
  "rateLimit": {
    "remaining": 59,
    "resetTime": 1640995200000
  }
}
```

**Error Response:**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "details": "Please wait 30 seconds before making another request"
}
```

### GET /api/health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "gemini": {
      "status": "healthy",
      "latency": 250
    },
    "validator": {
      "status": "healthy"
    }
  },
  "environment": "production"
}
```

## 🚦 Rate Limiting

The application implements rate limiting to ensure fair usage:

- **Default Limit**: 60 requests per minute per IP
- **Configurable**: Set via `RATE_LIMIT_RPM` environment variable
- **Headers**: Includes rate limit information in responses
- **Graceful Handling**: User-friendly error messages for rate limit exceeded

## 🔒 Security Features

### Input Validation
- XSS prevention through input sanitization
- Maximum message length limits
- Type validation for all inputs

### API Security
- CORS configuration for production
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Environment variable protection

### Error Handling
- No sensitive information in error messages
- Proper HTTP status codes
- Graceful fallbacks for all error scenarios

## 🐛 Troubleshooting

### Common Issues

**1. "Cannot find module" errors during development**
```bash
rm -rf node_modules package-lock.json
npm install
```

**2. TypeScript compilation errors**
```bash
npm run build
# Check tsconfig.json for configuration issues
```

**3. API key issues**
```bash
# Verify your .env.local file
cat .env.local
# Ensure GEMINI_API_KEY is set correctly
```

**4. Rate limiting in development**
```bash
# Increase rate limit in .env.local
echo "RATE_LIMIT_RPM=200" >> .env.local
```

### Debug Mode

Enable debug mode for detailed logging:
```env
DEBUG_MODE=true
```

This will log:
- API request/response details
- Validation process steps
- Performance metrics
- Error stack traces

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and test**
   ```bash
   npm test
   npm run build
   ```
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new validation rule"
   ```
5. **Push and create pull request**

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow the configured rules
- **Prettier**: Auto-formatting on save
- **Testing**: Maintain >90% test coverage

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google AI**: For the Gemini API
- **Vercel**: For hosting and deployment platform
- **Next.js**: For the React framework
- **Indonesian Legal System**: For providing the foundation of legal knowledge

## 📞 Support

For support and questions:

1. **Documentation**: Check this README and inline code comments
2. **Issues**: Create a GitHub issue with detailed description
3. **Health Check**: Use `/api/health` to verify system status
4. **Logs**: Check browser console and server logs for errors

---

**Built with ❤️ for the Indonesian legal community**

This chatbot is designed to provide general legal information and should not be considered as professional legal advice. For specific legal matters, please consult with qualified legal professionals.
A Neuro Symbolic Artificial Intelegent which focuses on the field of legal science
