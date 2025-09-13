# Contributing to Indonesian Law Chatbot

Thank you for your interest in contributing to the Indonesian Law Chatbot! This guide will help you get started with contributing to this project.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Basic knowledge of TypeScript/React
- Understanding of Indonesian legal system (helpful but not required)

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   git clone https://github.com/aryarifki/Neuro-SymAi.git
   cd indonesian-law-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Add your Gemini API key to .env.local
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 📝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Reports** - Help us identify and fix issues
2. **Feature Requests** - Suggest new functionality
3. **Code Contributions** - Submit code improvements
4. **Documentation** - Improve docs and examples
5. **Legal Knowledge** - Enhance Indonesian law database
6. **Translation** - Help with internationalization
7. **Testing** - Add test cases and improve coverage

### Bug Reports

When filing a bug report, please include:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. iOS, Windows, Linux]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

For feature requests, please include:

1. **Problem Statement** - What problem does this solve?
2. **Proposed Solution** - How should it work?
3. **Alternative Solutions** - Any other approaches considered?
4. **Legal Context** - How does this relate to Indonesian law?

### Pull Requests

#### Before You Start

1. Check existing issues and PRs to avoid duplication
2. Create an issue to discuss major changes
3. Fork the repository and create a feature branch

#### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards (see below)
   - Add tests for new functionality
   - Update documentation if needed

3. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add new validation rule for constitutional law"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a descriptive title
   - Link to related issues
   - Describe your changes clearly
   - Include screenshots for UI changes

#### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (white-space, formatting)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
```bash
feat(validators): add citation validation for Supreme Court decisions
fix(api): handle rate limiting edge cases
docs(readme): update deployment instructions
test(validators): add tests for hallucination detection
```

## 🏗️ Project Architecture

### Directory Structure

```
lib/                    # Core business logic
├── gemini.ts          # Gemini API integration
└── validators.ts      # Legal validation system

pages/                 # Next.js pages and API routes
├── api/
│   ├── chat.ts       # Main chat endpoint
│   └── health.ts     # Health check endpoint
├── _app.tsx          # Next.js app wrapper
└── index.tsx         # Main chat interface

styles/               # CSS styles
└── globals.css       # Global styles and theme

tests/                # Test suites
├── validators.test.ts # Validator tests
└── gemini.test.ts    # API client tests
```

### Key Components

1. **Gemini Client** (`lib/gemini.ts`)
   - Handles API communication
   - Implements rate limiting
   - Manages error handling

2. **Validator System** (`lib/validators.ts`)
   - Multi-layered validation
   - Legal knowledge base
   - Source citation enforcement

3. **Chat Interface** (`pages/index.tsx`)
   - React-based UI
   - Message handling
   - Local storage management

4. **API Endpoints** (`pages/api/`)
   - RESTful API design
   - Request validation
   - Security headers

## 📋 Coding Standards

### TypeScript Guidelines

1. **Use strict TypeScript**
   ```typescript
   // Good
   interface User {
     id: string;
     name: string;
     email: string;
   }
   
   // Bad
   const user: any = { ... };
   ```

2. **Prefer interfaces over types for object shapes**
   ```typescript
   // Good
   interface ApiResponse {
     data: string;
     error?: string;
   }
   
   // Good for unions
   type Status = 'loading' | 'success' | 'error';
   ```

3. **Use proper error handling**
   ```typescript
   // Good
   try {
     const result = await apiCall();
     return { success: true, data: result };
   } catch (error) {
     console.error('API call failed:', error);
     return { success: false, error: error.message };
   }
   ```

### React Guidelines

1. **Use functional components with hooks**
   ```typescript
   // Good
   const MyComponent: React.FC<Props> = ({ title }) => {
     const [state, setState] = useState<string>('');
     return <div>{title}</div>;
   };
   ```

2. **Prefer custom hooks for complex logic**
   ```typescript
   // Good
   const useChat = () => {
     const [messages, setMessages] = useState<Message[]>([]);
     const sendMessage = useCallback((message: string) => {
       // Logic here
     }, []);
     return { messages, sendMessage };
   };
   ```

3. **Use proper prop types**
   ```typescript
   interface ButtonProps {
     children: React.ReactNode;
     onClick: () => void;
     disabled?: boolean;
   }
   ```

### CSS Guidelines

1. **Use CSS custom properties**
   ```css
   :root {
     --primary-color: #3b82f6;
     --spacing-md: 1rem;
   }
   
   .button {
     background: var(--primary-color);
     padding: var(--spacing-md);
   }
   ```

2. **Follow BEM naming convention**
   ```css
   .chat-message { }
   .chat-message--user { }
   .chat-message__content { }
   ```

3. **Use mobile-first responsive design**
   ```css
   .container {
     padding: 1rem;
   }
   
   @media (min-width: 768px) {
     .container {
       padding: 2rem;
     }
   }
   ```

## 🧪 Testing Guidelines

### Test Structure

1. **Unit Tests** - Test individual functions
   ```typescript
   describe('validateCitation', () => {
     test('should validate UU citation format', () => {
       expect(validateCitation('UU No. 11 Tahun 2020')).toBe(true);
     });
   });
   ```

2. **Integration Tests** - Test component interactions
   ```typescript
   describe('Chat API', () => {
     test('should return valid response for legal query', async () => {
       const response = await request(app)
         .post('/api/chat')
         .send({ message: 'Apa itu KUHP?' });
       
       expect(response.status).toBe(200);
       expect(response.body.isValid).toBe(true);
     });
   });
   ```

3. **End-to-End Tests** - Test user workflows
   ```typescript
   describe('Chat Flow', () => {
     test('user can send message and receive response', async () => {
       // Test complete user journey
     });
   });
   ```

### Test Coverage

- Aim for >90% test coverage
- Focus on critical business logic
- Test error conditions and edge cases
- Include performance tests for validators

## 🌐 Indonesian Legal Knowledge

### Contributing Legal Content

When adding or updating legal knowledge:

1. **Verify Sources**
   - Use only official government sources
   - Cite specific laws and regulations
   - Include publication dates

2. **Format Citations Properly**
   ```typescript
   // Good
   const citation = {
     type: 'UU',
     number: '11',
     year: '2020',
     title: 'Cipta Kerja',
     article: '5',
     paragraph: '1'
   };
   ```

3. **Keep Content Neutral**
   - Avoid legal opinions
   - Present facts objectively
   - Include multiple viewpoints when applicable

4. **Update Knowledge Base**
   ```typescript
   // lib/validators.ts
   const INDONESIAN_LAW_KB = {
     constitutionalLaw: {
       'UUD 1945 Pasal 28': 'Human rights provision...'
     }
   };
   ```

### Legal Validation Rules

When adding new validation rules:

1. **Document the Rule**
   ```typescript
   /**
    * Validates citation format for Constitutional Court decisions
    * Format: Putusan MK No. 90/PUU-XXI/2023
    */
   const validateMKDecision = (citation: string): boolean => {
     // Implementation
   };
   ```

2. **Add Test Cases**
   ```typescript
   test('should validate MK decision citations', () => {
     expect(validateMKDecision('Putusan MK No. 90/PUU-XXI/2023')).toBe(true);
     expect(validateMKDecision('Invalid format')).toBe(false);
   });
   ```

3. **Update Documentation**
   - Add to README.md
   - Include examples
   - Explain legal context

## 🌍 Internationalization

Currently supporting:
- **Bahasa Indonesia** (primary)
- **English** (secondary)

To add translations:

1. **Create language files**
   ```typescript
   // lib/i18n/id.ts
   export const id = {
     'error.validation': 'Validasi gagal',
     'button.send': 'Kirim'
   };
   ```

2. **Use translation function**
   ```typescript
   const t = useTranslation();
   return <button>{t('button.send')}</button>;
   ```

## 📚 Documentation

### Writing Documentation

1. **Use clear, concise language**
2. **Include code examples**
3. **Add screenshots for UI features**
4. **Keep it up to date**

### Documentation Types

- **README.md** - Project overview and setup
- **API.md** - API documentation
- **DEPLOYMENT.md** - Deployment guide
- **Code Comments** - Inline documentation
- **JSDoc** - Function documentation

```typescript
/**
 * Validates Indonesian law citation format
 * @param citation - The citation string to validate
 * @param type - Expected citation type (UU, KUHP, etc.)
 * @returns Validation result with confidence score
 * @example
 * ```typescript
 * const result = validateCitation('UU No. 11 Tahun 2020', 'UU');
 * console.log(result.isValid); // true
 * ```
 */
export const validateCitation = (citation: string, type?: string): ValidationResult => {
  // Implementation
};
```

## 🔄 Release Process

### Version Management

We use [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0) - Breaking changes
- **Minor** (0.1.0) - New features, backward compatible
- **Patch** (0.0.1) - Bug fixes, backward compatible

### Release Checklist

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run full test suite
4. Create release branch
5. Deploy to staging
6. Create GitHub release
7. Deploy to production

## 📞 Getting Help

### Communication Channels

1. **GitHub Issues** - Bug reports and feature requests
2. **GitHub Discussions** - Questions and general discussion
3. **Pull Request Reviews** - Code feedback

### Mentorship

New contributors can:
- Look for "good first issue" labels
- Ask questions in issues or discussions
- Request code reviews from maintainers

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to the Indonesian Law Chatbot! 🇮🇩⚖️
