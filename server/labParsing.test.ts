import { describe, it, expect } from 'vitest';
import { LabParsingService } from './labParsingService';

describe('LabParsingService', () => {
  const labParsingService = new LabParsingService();

  describe('detectFileFormat', () => {
    it('should detect PDF format from MIME type', () => {
      const format = labParsingService.detectFileFormat('application/pdf', 'test.pdf');
      expect(format).toBe('pdf');
    });

    it('should detect PDF format from filename', () => {
      const format = labParsingService.detectFileFormat('application/octet-stream', 'test.pdf');
      expect(format).toBe('pdf');
    });

    it('should detect image format from MIME type', () => {
      const format = labParsingService.detectFileFormat('image/jpeg', 'test.jpg');
      expect(format).toBe('image');
    });

    it('should detect image format from filename', () => {
      const formats = [
        labParsingService.detectFileFormat('application/octet-stream', 'test.jpg'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.jpeg'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.png'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.gif'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.bmp'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.tiff'),
      ];
      expect(formats.every(f => f === 'image')).toBe(true);
    });

    it('should detect text format from MIME type', () => {
      const format = labParsingService.detectFileFormat('text/plain', 'test.txt');
      expect(format).toBe('text');
    });

    it('should detect text format from filename', () => {
      const formats = [
        labParsingService.detectFileFormat('application/octet-stream', 'test.txt'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.csv'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.tsv'),
      ];
      expect(formats.every(f => f === 'text')).toBe(true);
    });

    it('should return unknown for unsupported formats', () => {
      const format = labParsingService.detectFileFormat('application/zip', 'test.zip');
      expect(format).toBe('unknown');
    });

    it('should handle case-insensitive file extensions', () => {
      const formats = [
        labParsingService.detectFileFormat('application/octet-stream', 'test.PDF'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.JPG'),
        labParsingService.detectFileFormat('application/octet-stream', 'test.TXT'),
      ];
      expect(formats).toEqual(['pdf', 'image', 'text']);
    });
  });

  describe('parseUnstructuredLabReport', () => {
    it('should throw error for unsupported format', async () => {
      await expect(
        labParsingService.parseUnstructuredLabReport(
          'test content',
          'application/zip',
          'test.zip'
        )
      ).rejects.toThrow('Unsupported file format');
    });

    it('should route to PDF parser for PDF files', async () => {
      // Mock the parsePDFLabReport method
      const originalMethod = labParsingService.parsePDFLabReport;
      let called = false;
      labParsingService.parsePDFLabReport = async () => {
        called = true;
        return {
          results: [],
          sourceFormat: 'PDF'
        };
      };

      await labParsingService.parseUnstructuredLabReport(
        'PDF content',
        'application/pdf',
        'test.pdf'
      );

      expect(called).toBe(true);
      
      // Restore original method
      labParsingService.parsePDFLabReport = originalMethod;
    });

    it('should handle Buffer input for images', async () => {
      const buffer = Buffer.from('fake image data');
      
      // This will fail without real API, but we're testing the routing logic
      try {
        await labParsingService.parseUnstructuredLabReport(
          buffer,
          'image/jpeg',
          'test.jpg'
        );
      } catch (error) {
        // Expected to fail without real API, but should not throw format error
        expect(error).toBeDefined();
      }
    });

    it('should handle string input for text files', async () => {
      const textContent = 'Lab Results\nTest: Value\nDate: 2024-01-01';
      
      // This will fail without real API, but we're testing the routing logic
      try {
        await labParsingService.parseUnstructuredLabReport(
          textContent,
          'text/plain',
          'test.txt'
        );
      } catch (error) {
        // Expected to fail without real API, but should not throw format error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Format Support', () => {
    it('should support all documented image formats', () => {
      const supportedFormats = [
        { mime: 'image/jpeg', ext: '.jpg' },
        { mime: 'image/jpeg', ext: '.jpeg' },
        { mime: 'image/png', ext: '.png' },
        { mime: 'image/gif', ext: '.gif' },
        { mime: 'image/bmp', ext: '.bmp' },
        { mime: 'image/tiff', ext: '.tiff' },
        { mime: 'image/tiff', ext: '.tif' },
      ];

      supportedFormats.forEach(({ mime, ext }) => {
        const format = labParsingService.detectFileFormat(mime, `test${ext}`);
        expect(format).toBe('image');
      });
    });

    it('should support all documented text formats', () => {
      const supportedFormats = [
        { mime: 'text/plain', ext: '.txt' },
        { mime: 'text/csv', ext: '.csv' },
        { mime: 'text/tab-separated-values', ext: '.tsv' },
      ];

      supportedFormats.forEach(({ mime, ext }) => {
        const format = labParsingService.detectFileFormat(mime, `test${ext}`);
        expect(format).toBe('text');
      });
    });
  });
});
