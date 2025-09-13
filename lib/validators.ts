import * as stringSimilarity from 'string-similarity';

// Types for validation system
export interface ValidationResult {
  isValid: boolean;
  validatedText: string;
  confidence: number;
  issues: ValidationIssue[];
  sources: string[];
  suggestions?: string[];
}

export interface ValidationIssue {
  type: 'TOPIC_IRRELEVANT' | 'MISSING_SOURCE' | 'HALLUCINATION' | 'INCONSISTENCY' | 'INCOMPLETE' | 'UNSAFE_CONTENT' | 'LOW_QUALITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  suggestion?: string;
}

export interface LegalSource {
  type: 'UU' | 'PERPPU' | 'PERPRES' | 'PERATURAN' | 'PUTUSAN' | 'KUHP' | 'KUHPERDATA' | 'UUD';
  number?: string;
  year?: string;
  article?: string;
  fullCitation: string;
}

export interface IndonesianLawKnowledgeBase {
  constitutionalLaw: Record<string, string>;
  criminalLaw: Record<string, string>;
  civilLaw: Record<string, string>;
  administrativeLaw: Record<string, string>;
  procedures: Record<string, string[]>;
  commonMisconceptions: Record<string, string>;
}

// Indonesian law knowledge base for cross-validation
const INDONESIAN_LAW_KB: IndonesianLawKnowledgeBase = {
  constitutionalLaw: {
    'UUD 1945 Pasal 1': 'Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik',
    'UUD 1945 Pasal 27': 'Segala warga negara bersamaan kedudukannya di dalam hukum dan pemerintahan',
    'UUD 1945 Pasal 28': 'Kemerdekaan berserikat dan berkumpul, mengeluarkan pikiran dengan lisan dan tulisan',
    'UUD 1945 Pasal 28A': 'Setiap orang berhak untuk hidup serta berhak mempertahankan hidup dan kehidupannya',
    'UUD 1945 Pasal 28D': 'Setiap orang berhak atas pengakuan, jaminan, perlindungan, dan kepastian hukum',
    'UUD 1945 Pasal 28H': 'Setiap orang berhak hidup sejahtera lahir dan batin, bertempat tinggal'
  },
  criminalLaw: {
    'KUHP Pasal 362': 'Pencurian diancam dengan pidana penjara paling lama lima tahun',
    'KUHP Pasal 338': 'Pembunuhan diancam dengan pidana penjara paling lama lima belas tahun',
    'KUHP Pasal 351': 'Penganiayaan diancam dengan pidana penjara paling lama dua tahun delapan bulan',
    'KUHP Pasal 372': 'Penggelapan diancam dengan pidana penjara paling lama empat tahun',
    'KUHP Pasal 378': 'Penipuan diancam dengan pidana penjara paling lama empat tahun'
  },
  civilLaw: {
    'KUHPerdata Pasal 1320': 'Syarat sahnya perjanjian: sepakat, cakap, hal tertentu, sebab halal',
    'KUHPerdata Pasal 1365': 'Perbuatan melawan hukum yang menimbulkan kerugian wajib mengganti',
    'KUHPerdata Pasal 1131': 'Segala kebendaan si berutang menjadi tanggungan untuk segala perikatan',
    'KUHPerdata Pasal 584': 'Hak milik adalah hak untuk menikmati kegunaan suatu kebendaan'
  },
  administrativeLaw: {
    'UU No. 30 Tahun 2014': 'Administrasi Pemerintahan',
    'UU No. 25 Tahun 2009': 'Pelayanan Publik',
    'UU No. 14 Tahun 2008': 'Keterbukaan Informasi Publik'
  },
  procedures: {
    'gugatan_cerai': [
      'Pengajuan gugatan ke Pengadilan Agama (Islam) atau Pengadilan Negeri (non-Islam)',
      'Pembayaran biaya perkara',
      'Proses mediasi wajib',
      'Persidangan dan pembuktian',
      'Putusan hakim',
      'Pelaksanaan putusan'
    ],
    'laporan_polisi': [
      'Datang ke kantor polisi terdekat',
      'Membawa identitas diri yang sah',
      'Menyampaikan kronologi kejadian',
      'Pemberian nomor laporan polisi',
      'Proses penyelidikan'
    ]
  },
  commonMisconceptions: {
    'pidana_mati_dihapus': 'SALAH: Pidana mati masih berlaku di Indonesia berdasarkan KUHP',
    'poligami_bebas': 'SALAH: Poligami harus mendapat izin pengadilan dengan syarat ketat',
    'hukum_adat_tidak_berlaku': 'SALAH: Hukum adat diakui sepanjang tidak bertentangan dengan UU'
  }
};

// Keywords for Indonesian law topic detection
const LEGAL_KEYWORDS = {
  positive: [
    'undang-undang', 'uu', 'perppu', 'perpres', 'peraturan', 'pasal', 'ayat',
    'kuhp', 'kuhperdata', 'kuhap', 'kuhd', 'uud', 'konstitusi',
    'hukum', 'pidana', 'perdata', 'administrasi', 'tata usaha negara',
    'mahkamah', 'pengadilan', 'hakim', 'jaksa', 'advokat', 'pengacara',
    'gugatan', 'tuntutan', 'dakwaan', 'putusan', 'vonis', 'eksekusi',
    'pelanggaran', 'kejahatan', 'tindak pidana', 'delik', 'perbuatan melawan hukum',
    'perjanjian', 'kontrak', 'wanprestasi', 'ganti rugi', 'denda',
    'hak asasi', 'ham', 'kebebasan', 'demokrasi', 'rule of law'
  ],
  negative: [
    'resep', 'masakan', 'olahraga', 'musik', 'film', 'game', 'teknologi',
    'programming', 'coding', 'matematika', 'fisika', 'kimia', 'biologi',
    'agama', 'fikih', 'hadits', 'tafsir', 'ibadah', 'shalat', 'puasa',
    'ekonomi', 'bisnis', 'investasi', 'saham', 'cryptocurrency',
    'politik', 'partai', 'pemilu', 'kampanye', 'ideologi'
  ]
};

// Legal source citation patterns
const CITATION_PATTERNS = [
  /UU\s+No\.?\s*(\d+)\s+Tahun\s+(\d{4})/gi,
  /Undang-Undang\s+Nomor\s+(\d+)\s+Tahun\s+(\d{4})/gi,
  /Perppu\s+No\.?\s*(\d+)\/(\d{4})/gi,
  /Perpres\s+No\.?\s*(\d+)\s+Tahun\s+(\d{4})/gi,
  /KUHP\s+Pasal\s+(\d+)/gi,
  /KUHPerdata\s+Pasal\s+(\d+)/gi,
  /KUHAP\s+Pasal\s+(\d+)/gi,
  /UUD\s+1945\s+Pasal\s+(\d+[A-Z]?)/gi,
  /Putusan\s+MK\s+No\.?\s*(\d+\/[A-Z]+-[A-Z]+\/\d{4})/gi,
  /Putusan\s+MA\s+No\.?\s*(\d+\s*K\/[A-Z]+\/\d{4})/gi
];

export class IndonesianLawValidator {
  private debugMode: boolean;
  
  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode || process.env.DEBUG_MODE === 'true';
    
    if (this.debugMode) {
      console.log('🔍 Indonesian Law Validator initialized in debug mode');
    }
  }

  /**
   * Main validation function - orchestrates all validation checks
   */
  async validateResponse(
    userQuery: string, 
    aiResponse: string, 
    maxRetries: number = 2
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    if (this.debugMode) {
      console.log('🔍 Starting validation for response length:', aiResponse.length);
    }

    try {
      // Initialize validation result
      const result: ValidationResult = {
        isValid: false,
        validatedText: aiResponse,
        confidence: 0,
        issues: [],
        sources: []
      };

      // Run all validation checks
      const checks = await Promise.all([
        this.validateTopicRelevance(userQuery, aiResponse),
        this.validateSourceCitations(aiResponse),
        this.detectHallucinations(aiResponse),
        this.checkLogicalConsistency(aiResponse),
        this.validateCompleteness(userQuery, aiResponse),
        this.checkUnsafeContent(aiResponse),
        this.assessQuality(aiResponse)
      ]);

      // Aggregate results
      let totalScore = 0;
      let maxScore = 0;

      checks.forEach(check => {
        result.issues.push(...check.issues);
        result.sources.push(...check.sources);
        totalScore += check.score;
        maxScore += check.maxScore;
      });

      // Calculate confidence and determine validity
      result.confidence = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      result.isValid = result.confidence >= 70 && !result.issues.some(issue => issue.severity === 'CRITICAL');

      // Remove duplicate sources
      result.sources = [...new Set(result.sources)];

      // Generate suggestions for improvement
      if (!result.isValid) {
        result.suggestions = this.generateSuggestions(result.issues);
      }

      const duration = Date.now() - startTime;
      
      if (this.debugMode) {
        console.log(`✅ Validation completed in ${duration}ms - Valid: ${result.isValid}, Confidence: ${result.confidence.toFixed(1)}%`);
        console.log('Issues found:', result.issues.length);
        console.log('Sources found:', result.sources.length);
      }

      return result;

    } catch (error) {
      console.error('❌ Validation error:', error);
      
      return {
        isValid: false,
        validatedText: aiResponse,
        confidence: 0,
        issues: [{
          type: 'LOW_QUALITY',
          severity: 'CRITICAL',
          message: 'Validation system error occurred',
          suggestion: 'Please try again with a different query'
        }],
        sources: []
      };
    }
  }

  /**
   * Check if the response is relevant to Indonesian law topics
   */
  private async validateTopicRelevance(
    query: string, 
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    // Combine query and response for analysis
    const text = `${query} ${response}`.toLowerCase();
    
    // Count positive and negative keywords
    const positiveMatches = LEGAL_KEYWORDS.positive.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;
    
    const negativeMatches = LEGAL_KEYWORDS.negative.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;

    // Calculate relevance score
    const relevanceScore = positiveMatches - (negativeMatches * 2);
    const score = Math.max(0, Math.min(10, relevanceScore));

    if (score < 3) {
      issues.push({
        type: 'TOPIC_IRRELEVANT',
        severity: 'CRITICAL',
        message: 'Query appears to be outside Indonesian law topics',
        suggestion: 'Please ask about Indonesian laws, regulations, or legal procedures'
      });
    } else if (negativeMatches > 0) {
      issues.push({
        type: 'TOPIC_IRRELEVANT',
        severity: 'MEDIUM',
        message: 'Response contains some non-legal content',
        suggestion: 'Focus the response strictly on Indonesian legal matters'
      });
    }

    if (this.debugMode) {
      console.log(`📊 Topic relevance - Positive: ${positiveMatches}, Negative: ${negativeMatches}, Score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Validate presence and format of legal source citations
   */
  private async validateSourceCitations(
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    // Find all citations using regex patterns
    const foundCitations: LegalSource[] = [];
    
    CITATION_PATTERNS.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        sources.push(match[0]);
        foundCitations.push({
          type: this.determineCitationType(match[0]),
          fullCitation: match[0]
        });
      }
    });

    // Calculate citation score
    const citationCount = foundCitations.length;
    const responseLength = response.length;
    const expectedCitations = Math.max(1, Math.floor(responseLength / 200)); // Expect 1 citation per 200 chars
    
    let score = Math.min(10, (citationCount / expectedCitations) * 10);

    if (citationCount === 0) {
      issues.push({
        type: 'MISSING_SOURCE',
        severity: 'CRITICAL',
        message: 'No legal source citations found in response',
        suggestion: 'Include specific references to Indonesian laws (UU, KUHP, etc.) with article numbers'
      });
      score = 0;
    } else if (citationCount < expectedCitations) {
      issues.push({
        type: 'MISSING_SOURCE',
        severity: 'MEDIUM',
        message: 'Insufficient source citations for response length',
        suggestion: 'Add more specific legal references to support claims'
      });
    }

    // Validate citation formats
    foundCitations.forEach(citation => {
      if (!this.isValidCitationFormat(citation.fullCitation)) {
        issues.push({
          type: 'MISSING_SOURCE',
          severity: 'LOW',
          message: `Citation format may be incorrect: ${citation.fullCitation}`,
          suggestion: 'Use standard Indonesian legal citation format'
        });
      }
    });

    if (this.debugMode) {
      console.log(`📚 Citations found: ${citationCount}, Expected: ${expectedCitations}, Score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Detect potential hallucinations by cross-checking with knowledge base
   */
  private async detectHallucinations(
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    let score = 10; // Start with perfect score, deduct for issues
    
    // Check against common misconceptions
    Object.entries(INDONESIAN_LAW_KB.commonMisconceptions).forEach(([misconception, truth]) => {
      if (response.toLowerCase().includes(misconception.replace('_', ' '))) {
        issues.push({
          type: 'HALLUCINATION',
          severity: 'HIGH',
          message: `Potential misconception detected: ${truth}`,
          suggestion: 'Verify this claim against current Indonesian law'
        });
        score -= 3;
      }
    });

    // Cross-check specific legal claims with knowledge base
    const knowledgeEntries = [
      ...Object.entries(INDONESIAN_LAW_KB.constitutionalLaw),
      ...Object.entries(INDONESIAN_LAW_KB.criminalLaw),
      ...Object.entries(INDONESIAN_LAW_KB.civilLaw)
    ];

    knowledgeEntries.forEach(([key, value]) => {
      if (response.includes(key)) {
        const similarity = stringSimilarity.compareTwoStrings(
          response.toLowerCase(),
          value.toLowerCase()
        );
        
        if (similarity < 0.3) {
          issues.push({
            type: 'HALLUCINATION',
            severity: 'MEDIUM',
            message: `Content about ${key} may not align with established law`,
            suggestion: 'Double-check this legal provision'
          });
          score -= 2;
        }
      }
    });

    // Check for absolute statements without proper citations
    const absolutePatterns = [
      /selalu\s+\w+/gi,
      /tidak pernah\s+\w+/gi,
      /semua\s+\w+/gi,
      /tidak ada\s+\w+/gi
    ];

    absolutePatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'HALLUCINATION',
          severity: 'LOW',
          message: 'Absolute statements should be avoided without clear legal basis',
          suggestion: 'Use more qualified language or provide specific citations'
        });
        score -= 1;
      }
    });

    score = Math.max(0, score);

    if (this.debugMode) {
      console.log(`🚫 Hallucination check score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Check logical consistency within the response
   */
  private async checkLogicalConsistency(
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    let score = 10;

    // Split into sentences for analysis
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Check for contradictions (basic keyword-based approach)
    const contradictoryPairs = [
      ['dilarang', 'diperbolehkan'],
      ['wajib', 'tidak wajib'],
      ['harus', 'tidak harus'],
      ['boleh', 'tidak boleh'],
      ['legal', 'ilegal']
    ];

    contradictoryPairs.forEach(([pos, neg]) => {
      const hasPositive = response.toLowerCase().includes(pos);
      const hasNegative = response.toLowerCase().includes(neg);
      
      if (hasPositive && hasNegative) {
        // Check if they're about the same topic
        const distance = this.findWordDistance(response.toLowerCase(), pos, neg);
        if (distance < 50) { // Words are close together
          issues.push({
            type: 'INCONSISTENCY',
            severity: 'HIGH',
            message: `Potential contradiction found between "${pos}" and "${neg}"`,
            suggestion: 'Clarify the specific circumstances for each statement'
          });
          score -= 3;
        }
      }
    });

    // Check for logical flow (very basic)
    if (sentences.length >= 3) {
      let flowScore = 0;
      for (let i = 0; i < sentences.length - 1; i++) {
        const similarity = stringSimilarity.compareTwoStrings(
          sentences[i].toLowerCase(),
          sentences[i + 1].toLowerCase()
        );
        if (similarity > 0.2) flowScore++;
      }
      
      const expectedFlow = sentences.length - 1;
      if (flowScore < expectedFlow * 0.3) {
        issues.push({
          type: 'INCONSISTENCY',
          severity: 'LOW',
          message: 'Response may lack logical flow between statements',
          suggestion: 'Ensure ideas are connected and build upon each other'
        });
        score -= 1;
      }
    }

    score = Math.max(0, score);

    if (this.debugMode) {
      console.log(`🔗 Logical consistency score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Validate completeness of response based on query type
   */
  private async validateCompleteness(
    query: string, 
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    let score = 10;
    
    // Check for procedural queries
    if (query.toLowerCase().includes('cara') || query.toLowerCase().includes('prosedur')) {
      const hasSteps = /\d+[\.\)]\s|\bpertama\b|\bkedua\b|\bketiga\b|\blangkah\b/gi.test(response);
      if (!hasSteps) {
        issues.push({
          type: 'INCOMPLETE',
          severity: 'MEDIUM',
          message: 'Procedural query should include step-by-step guidance',
          suggestion: 'Provide numbered steps or clear sequence of actions'
        });
        score -= 3;
      }
    }

    // Check minimum response length for complex queries
    if (query.length > 50 && response.length < 100) {
      issues.push({
        type: 'INCOMPLETE',
        severity: 'MEDIUM',
        message: 'Response appears too brief for the complexity of the query',
        suggestion: 'Provide more detailed explanation with relevant context'
      });
      score -= 2;
    }

    // Check for definition queries
    if (query.toLowerCase().includes('apa itu') || query.toLowerCase().includes('definisi')) {
      const hasDefinition = response.toLowerCase().includes('adalah') || 
                           response.toLowerCase().includes('yaitu') ||
                           response.toLowerCase().includes('merupakan');
      if (!hasDefinition) {
        issues.push({
          type: 'INCOMPLETE',
          severity: 'LOW',
          message: 'Definition query should include clear definition',
          suggestion: 'Provide explicit definition using "adalah" or "yaitu"'
        });
        score -= 1;
      }
    }

    score = Math.max(0, score);

    if (this.debugMode) {
      console.log(`📝 Completeness score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Check for unsafe or inappropriate content
   */
  private async checkUnsafeContent(
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    let score = 10;

    // Unsafe legal advice patterns
    const unsafePatterns = [
      /cara.*korupsi/gi,
      /cara.*suap/gi,
      /cara.*menghindar.*hukum/gi,
      /cara.*melanggar/gi,
      /tips.*menghindari.*sanksi/gi
    ];

    unsafePatterns.forEach(pattern => {
      if (pattern.test(response)) {
        issues.push({
          type: 'UNSAFE_CONTENT',
          severity: 'CRITICAL',
          message: 'Response contains potentially harmful legal advice',
          suggestion: 'Focus on legal compliance and proper procedures instead'
        });
        score = 0;
      }
    });

    // Check for inappropriate legal guidance
    const inappropriatePatterns = [
      /pasti.*menang/gi,
      /dijamin.*bebas/gi,
      /tidak akan.*ketahuan/gi
    ];

    inappropriatePatterns.forEach(pattern => {
      if (pattern.test(response)) {
        issues.push({
          type: 'UNSAFE_CONTENT',
          severity: 'HIGH',
          message: 'Response provides inappropriate legal assurances',
          suggestion: 'Avoid giving absolute guarantees about legal outcomes'
        });
        score -= 4;
      }
    });

    score = Math.max(0, score);

    if (this.debugMode) {
      console.log(`⚠️ Safety check score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Assess overall quality of the response
   */
  private async assessQuality(
    response: string
  ): Promise<{ score: number; maxScore: number; issues: ValidationIssue[]; sources: string[] }> {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    
    let score = 10;

    // Check length adequacy
    if (response.length < 50) {
      issues.push({
        type: 'LOW_QUALITY',
        severity: 'MEDIUM',
        message: 'Response is too short to be informative',
        suggestion: 'Provide more detailed explanation'
      });
      score -= 3;
    }

    // Check for repetitive content
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 5);
    let repetitionCount = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const similarity = stringSimilarity.compareTwoStrings(
          sentences[i].toLowerCase(),
          sentences[j].toLowerCase()
        );
        if (similarity > 0.8) repetitionCount++;
      }
    }

    if (repetitionCount > 1) {
      issues.push({
        type: 'LOW_QUALITY',
        severity: 'LOW',
        message: 'Response contains repetitive content',
        suggestion: 'Vary the language and avoid redundancy'
      });
      score -= 2;
    }

    // Check for proper Indonesian legal language
    const formalLanguageScore = this.assessFormalLanguage(response);
    if (formalLanguageScore < 5) {
      issues.push({
        type: 'LOW_QUALITY',
        severity: 'LOW',
        message: 'Response should use more formal legal language',
        suggestion: 'Use appropriate legal terminology and formal Indonesian'
      });
      score -= 1;
    }

    score = Math.max(0, score);

    if (this.debugMode) {
      console.log(`⭐ Quality assessment score: ${score}/10`);
    }

    return { score, maxScore: 10, issues, sources };
  }

  /**
   * Helper methods
   */
  private determineCitationType(citation: string): LegalSource['type'] {
    if (citation.includes('UU') || citation.includes('Undang-Undang')) return 'UU';
    if (citation.includes('Perppu')) return 'PERPPU';
    if (citation.includes('Perpres')) return 'PERPRES';
    if (citation.includes('KUHP')) return 'KUHP';
    if (citation.includes('KUHPerdata')) return 'KUHPERDATA';
    if (citation.includes('UUD')) return 'UUD';
    if (citation.includes('Putusan')) return 'PUTUSAN';
    return 'PERATURAN';
  }

  private isValidCitationFormat(citation: string): boolean {
    // Basic format validation - can be expanded
    return CITATION_PATTERNS.some(pattern => pattern.test(citation));
  }

  private findWordDistance(text: string, word1: string, word2: string): number {
    const index1 = text.indexOf(word1);
    const index2 = text.indexOf(word2);
    
    if (index1 === -1 || index2 === -1) return Infinity;
    
    return Math.abs(index1 - index2);
  }

  private assessFormalLanguage(text: string): number {
    const formalWords = [
      'berdasarkan', 'sebagaimana', 'dimaksud', 'ketentuan', 'peraturan',
      'undang-undang', 'pasal', 'ayat', 'huruf', 'angka', 'jo', 'juncto'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const formalCount = words.filter(word => 
      formalWords.some(formal => word.includes(formal))
    ).length;
    
    return Math.min(10, (formalCount / words.length) * 100);
  }

  private generateSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();
    
    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.add(issue.suggestion);
      }
    });

    // Add general suggestions based on issue types
    const issueTypes = issues.map(issue => issue.type);
    
    if (issueTypes.includes('MISSING_SOURCE')) {
      suggestions.add('Include specific references to Indonesian laws with article numbers');
    }
    
    if (issueTypes.includes('TOPIC_IRRELEVANT')) {
      suggestions.add('Focus strictly on Indonesian legal topics and regulations');
    }
    
    if (issueTypes.includes('INCOMPLETE')) {
      suggestions.add('Provide more comprehensive coverage of the legal topic');
    }

    return Array.from(suggestions);
  }

  /**
   * Generate error message for invalid responses
   */
  generateErrorMessage(result: ValidationResult): string {
    const criticalIssues = result.issues.filter(issue => issue.severity === 'CRITICAL');
    
    if (criticalIssues.length > 0) {
      const issue = criticalIssues[0];
      
      switch (issue.type) {
        case 'TOPIC_IRRELEVANT':
          return 'Maaf, saya hanya dapat membantu dengan pertanyaan tentang hukum Indonesia. Silakan tanyakan tentang undang-undang, peraturan, atau aspek hukum lainnya yang berlaku di Indonesia.';
        
        case 'MISSING_SOURCE':
          return 'Respons memerlukan sumber hukum yang valid (UU/Peraturan). Silakan ajukan pertanyaan yang lebih spesifik agar saya dapat memberikan jawaban dengan rujukan yang tepat.';
        
        case 'UNSAFE_CONTENT':
          return 'Maaf, saya tidak dapat memberikan informasi yang dapat digunakan untuk melanggar hukum. Silakan tanyakan tentang cara mematuhi peraturan yang berlaku.';
        
        default:
          return 'Respons tidak dapat divalidasi sebagai informasi hukum yang akurat. Silakan coba dengan pertanyaan yang lebih spesifik tentang hukum Indonesia.';
      }
    }
    
    return 'Informasi yang diberikan mungkin tidak lengkap atau akurat. Untuk kepastian hukum, konsultasikan dengan ahli hukum yang berwenang.';
  }
}

// Singleton instance
let validatorInstance: IndonesianLawValidator | null = null;

export function getValidator(): IndonesianLawValidator {
  if (!validatorInstance) {
    validatorInstance = new IndonesianLawValidator();
  }
  return validatorInstance;
}

export default IndonesianLawValidator;