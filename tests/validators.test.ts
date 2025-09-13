import { IndonesianLawValidator, ValidationResult } from '@/lib/validators';

describe('IndonesianLawValidator', () => {
  let validator: IndonesianLawValidator;

  beforeEach(() => {
    validator = new IndonesianLawValidator(true); // Enable debug mode for tests
  });

  describe('Topic Relevance Validation', () => {
    test('should validate Indonesian law topics as relevant', async () => {
      const userQuery = 'Apa sanksi pidana untuk pencurian?';
      const aiResponse = 'Berdasarkan KUHP Pasal 362, pencurian diancam dengan pidana penjara paling lama lima tahun atau pidana denda paling banyak sembilan ratus rupiah.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.sources).toContain('KUHP Pasal 362');
    });

    test('should reject non-legal topics', async () => {
      const userQuery = 'Bagaimana cara memasak nasi goreng?';
      const aiResponse = 'Untuk memasak nasi goreng, siapkan nasi, telur, dan bumbu-bumbu.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'TOPIC_IRRELEVANT',
          severity: 'CRITICAL'
        })
      );
    });

    test('should handle mixed content appropriately', async () => {
      const userQuery = 'Apakah ada aturan hukum tentang cryptocurrency di Indonesia?';
      const aiResponse = 'Menurut UU No. 7 Tahun 2011 tentang Mata Uang, penggunaan cryptocurrency sebagai alat pembayaran dilarang. Namun, cryptocurrency dapat diperdagangkan sebagai komoditas berdasarkan peraturan Bappebti.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.isValid).toBe(true);
      expect(result.sources).toContain('UU No. 7 Tahun 2011');
    });
  });

  describe('Source Citation Validation', () => {
    test('should validate proper UU citations', async () => {
      const userQuery = 'Tentang hak asasi manusia';
      const aiResponse = 'Hak asasi manusia dijamin dalam UUD 1945 Pasal 28A yang menyatakan bahwa setiap orang berhak untuk hidup.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.sources).toContain('UUD 1945 Pasal 28A');
      expect(result.confidence).toBeGreaterThan(60);
    });

    test('should detect missing citations', async () => {
      const userQuery = 'Tentang hukum pidana';
      const aiResponse = 'Hukum pidana mengatur tentang kejahatan dan pelanggaran serta sanksinya.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_SOURCE',
          severity: 'CRITICAL'
        })
      );
    });

    test('should recognize various citation formats', async () => {
      const testCases = [
        'UU No. 11 Tahun 2020',
        'Undang-Undang Nomor 8 Tahun 1999',
        'KUHP Pasal 338',
        'KUHPerdata Pasal 1320',
        'Perppu No. 1/2020',
        'UUD 1945 Pasal 28',
        'Putusan MK No. 90/PUU-XXI/2023'
      ];

      for (const citation of testCases) {
        const aiResponse = `Berdasarkan ${citation}, dijelaskan bahwa...`;
        const result = await validator.validateResponse('Test query', aiResponse);
        
        expect(result.sources).toContain(citation);
      }
    });
  });

  describe('Hallucination Detection', () => {
    test('should detect common legal misconceptions', async () => {
      const userQuery = 'Apakah pidana mati sudah dihapus di Indonesia?';
      const aiResponse = 'Ya, pidana mati sudah dihapuskan di Indonesia berdasarkan KUHP terbaru.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'HALLUCINATION',
          severity: 'HIGH'
        })
      );
    });

    test('should flag absolute statements without citations', async () => {
      const userQuery = 'Tentang hak waris';
      const aiResponse = 'Semua anak selalu mendapat bagian waris yang sama tanpa memandang jenis kelamin.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'HALLUCINATION',
          severity: 'LOW'
        })
      );
    });

    test('should accept well-cited accurate information', async () => {
      const userQuery = 'Tentang hak milik';
      const aiResponse = 'Berdasarkan KUHPerdata Pasal 584, hak milik adalah hak untuk menikmati kegunaan suatu kebendaan dengan leluasa dan untuk berbuat bebas terhadap kebendaan itu.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.confidence).toBeGreaterThan(80);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Unsafe Content Detection', () => {
    test('should reject guidance for illegal activities', async () => {
      const userQuery = 'Bagaimana cara melakukan korupsi tanpa ketahuan?';
      const aiResponse = 'Untuk melakukan korupsi tanpa ketahuan, Anda bisa...';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'UNSAFE_CONTENT',
          severity: 'CRITICAL'
        })
      );
    });

    test('should reject inappropriate legal guarantees', async () => {
      const userQuery = 'Bisakah saya menang di pengadilan?';
      const aiResponse = 'Ya, Anda pasti menang di pengadilan jika mengikuti saran saya.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'UNSAFE_CONTENT',
          severity: 'HIGH'
        })
      );
    });

    test('should accept proper legal guidance', async () => {
      const userQuery = 'Bagaimana cara melaporkan korupsi?';
      const aiResponse = 'Untuk melaporkan tindak pidana korupsi, Anda dapat mengajukan laporan ke KPK berdasarkan UU No. 30 Tahun 2002 atau ke kepolisian setempat.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(70);
    });
  });

  describe('Completeness Validation', () => {
    test('should require steps for procedural queries', async () => {
      const userQuery = 'Bagaimana cara mengajukan gugatan cerai?';
      const aiResponse = 'Anda perlu mengajukan ke pengadilan.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'INCOMPLETE',
          severity: 'MEDIUM'
        })
      );
    });

    test('should accept complete procedural guidance', async () => {
      const userQuery = 'Bagaimana cara mengajukan gugatan cerai?';
      const aiResponse = `Untuk mengajukan gugatan cerai, ikuti langkah berikut:
      1. Pengajuan gugatan ke Pengadilan Agama (Islam) atau Pengadilan Negeri (non-Islam)
      2. Pembayaran biaya perkara
      3. Proses mediasi wajib berdasarkan UU No. 30 Tahun 1999
      4. Persidangan dan pembuktian
      5. Putusan hakim`;

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.confidence).toBeGreaterThan(80);
      expect(result.isValid).toBe(true);
    });

    test('should require definitions for definition queries', async () => {
      const userQuery = 'Apa itu hak milik?';
      const aiResponse = 'Hak milik sangat penting dalam hukum perdata.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'INCOMPLETE',
          severity: 'LOW'
        })
      );
    });
  });

  describe('Logical Consistency Validation', () => {
    test('should detect contradictory statements', async () => {
      const userQuery = 'Tentang hukuman mati';
      const aiResponse = 'Hukuman mati dilarang berdasarkan HAM. Namun, KUHP Pasal 340 mengatur hukuman mati untuk pembunuhan berencana yang diperbolehkan.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'INCONSISTENCY',
          severity: 'HIGH'
        })
      );
    });

    test('should accept consistent legal explanations', async () => {
      const userQuery = 'Tentang syarat perjanjian';
      const aiResponse = 'Berdasarkan KUHPerdata Pasal 1320, syarat sahnya perjanjian adalah sepakat, cakap, hal tertentu, dan sebab halal. Keempat syarat ini harus dipenuhi secara kumulatif.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.confidence).toBeGreaterThan(75);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Quality Assessment', () => {
    test('should flag responses that are too short', async () => {
      const userQuery = 'Jelaskan tentang hukum pidana Indonesia';
      const aiResponse = 'KUHP.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'LOW_QUALITY',
          severity: 'MEDIUM'
        })
      );
    });

    test('should detect repetitive content', async () => {
      const userQuery = 'Tentang KUHP';
      const aiResponse = 'KUHP adalah kitab hukum pidana. KUHP adalah kitab hukum pidana. KUHP adalah kitab hukum pidana.';

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'LOW_QUALITY',
          severity: 'LOW'
        })
      );
    });

    test('should accept high-quality responses', async () => {
      const userQuery = 'Jelaskan tentang asas legalitas';
      const aiResponse = `Asas legalitas merupakan prinsip fundamental dalam hukum pidana yang diatur dalam UUD 1945 Pasal 28I dan KUHP Pasal 1 ayat (1). Asas ini mengandung makna "nullum crimen, nulla poena sine previ lege" yang berarti tidak ada kejahatan dan tidak ada hukuman tanpa undang-undang yang mengaturnya terlebih dahulu. Prinsip ini bertujuan untuk memberikan kepastian hukum dan melindungi hak asasi manusia dari kesewenang-wenangan penguasa.`;

      const result = await validator.validateResponse(userQuery, aiResponse);

      expect(result.confidence).toBeGreaterThan(85);
      expect(result.isValid).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
    });
  });

  describe('Error Message Generation', () => {
    test('should generate appropriate error messages for different issue types', () => {
      const criticalTopicResult: ValidationResult = {
        isValid: false,
        validatedText: '',
        confidence: 0,
        issues: [{
          type: 'TOPIC_IRRELEVANT',
          severity: 'CRITICAL',
          message: 'Off-topic'
        }],
        sources: []
      };

      const errorMessage = validator.generateErrorMessage(criticalTopicResult);
      expect(errorMessage).toContain('hukum Indonesia');
      expect(errorMessage).toContain('undang-undang');
    });

    test('should generate error message for missing sources', () => {
      const missingSourceResult: ValidationResult = {
        isValid: false,
        validatedText: '',
        confidence: 0,
        issues: [{
          type: 'MISSING_SOURCE',
          severity: 'CRITICAL',
          message: 'No sources'
        }],
        sources: []
      };

      const errorMessage = validator.generateErrorMessage(missingSourceResult);
      expect(errorMessage).toContain('sumber hukum');
      expect(errorMessage).toContain('UU/Peraturan');
    });

    test('should generate error message for unsafe content', () => {
      const unsafeResult: ValidationResult = {
        isValid: false,
        validatedText: '',
        confidence: 0,
        issues: [{
          type: 'UNSAFE_CONTENT',
          severity: 'CRITICAL',
          message: 'Unsafe advice'
        }],
        sources: []
      };

      const errorMessage = validator.generateErrorMessage(unsafeResult);
      expect(errorMessage).toContain('melanggar hukum');
      expect(errorMessage).toContain('mematuhi');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty responses', async () => {
      const result = await validator.validateResponse('Test query', '');
      
      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test('should handle very long responses', async () => {
      const longResponse = 'Berdasarkan KUHP Pasal 1, ' + 'test '.repeat(1000);
      const result = await validator.validateResponse('Test query', longResponse);
      
      expect(result.sources).toContain('KUHP Pasal 1');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle special characters in citations', async () => {
      const aiResponse = 'Berdasarkan UU No. 11/2020 dan Perppu No. 1/2020...';
      const result = await validator.validateResponse('Test query', aiResponse);
      
      expect(result.sources.length).toBeGreaterThan(0);
    });

    test('should handle responses with mixed languages', async () => {
      const aiResponse = 'Berdasarkan KUHP Article 362, theft is punishable by maximum 5 years imprisonment.';
      const result = await validator.validateResponse('Tentang pencurian', aiResponse);
      
      expect(result.sources).toContain('KUHP Article 362');
      expect(result.confidence).toBeGreaterThan(40); // Lower but still valid due to mixed content
    });
  });

  describe('Performance Tests', () => {
    test('should complete validation within reasonable time', async () => {
      const start = Date.now();
      const result = await validator.validateResponse(
        'Tentang hak asasi manusia',
        'HAM diatur dalam UUD 1945 Pasal 28A hingga 28J yang mencakup berbagai aspek kehidupan manusia.'
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeDefined();
    });

    test('should handle concurrent validations', async () => {
      const queries = Array(5).fill(0).map((_, i) => 
        validator.validateResponse(
          `Query ${i}`,
          `Berdasarkan UU No. ${i + 1} Tahun 2020, dijelaskan bahwa...`
        )
      );

      const results = await Promise.all(queries);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });
});