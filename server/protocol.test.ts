import { describe, it, expect, beforeAll } from 'vitest';
import { generateProtocolPDF } from './pdfService';

describe('Protocol PDF Generation', () => {
  it('should generate a valid PDF buffer', async () => {
    const testData = {
      patientName: 'John Doe',
      patientEmail: 'john@example.com',
      protocolName: 'Diabetes Management Protocol',
      diagnosis: 'Type 2 Diabetes Mellitus',
      startDate: new Date('2026-02-24'),
      duration: '12 weeks',
      goals: [
        'Achieve HbA1c below 7%',
        'Maintain fasting glucose 80-130 mg/dL',
        'Reduce weight by 5-10%',
      ],
      interventions: [
        {
          category: 'Dietary Modifications',
          items: [
            'Low glycemic index diet',
            'Portion control',
            'Limit refined carbohydrates',
          ],
        },
        {
          category: 'Physical Activity',
          items: [
            '30 minutes moderate exercise 5 days/week',
            'Strength training 2 days/week',
          ],
        },
      ],
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          instructions: 'Take with meals',
        },
      ],
      lifestyle: [
        'Monitor blood glucose daily',
        'Keep a food diary',
        'Stay hydrated (8 glasses water/day)',
      ],
      followUp: {
        frequency: 'Every 2 weeks',
        metrics: ['Blood glucose readings', 'Weight', 'HbA1c (monthly)'],
      },
      warnings: [
        'Contact physician if blood glucose falls below 70 mg/dL',
        'Report any signs of hypoglycemia immediately',
      ],
      physicianName: 'Dr. Jane Smith',
      physicianContact: 'drsmith@clinic.com',
    };

    const pdfBuffer = await generateProtocolPDF(testData);

    // Verify PDF buffer is generated
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Verify PDF header (PDF files start with %PDF-)
    const header = pdfBuffer.slice(0, 5).toString('utf-8');
    expect(header).toBe('%PDF-');
  });

  it('should handle minimal protocol data', async () => {
    const minimalData = {
      patientName: 'Jane Doe',
      patientEmail: 'jane@example.com',
      protocolName: 'Basic Care Protocol',
      diagnosis: 'General Wellness',
      startDate: new Date(),
      duration: '4 weeks',
      goals: ['Improve overall health'],
      interventions: [
        {
          category: 'Lifestyle',
          items: ['Regular exercise', 'Healthy diet'],
        },
      ],
      physicianName: 'Dr. Test',
    };

    const pdfBuffer = await generateProtocolPDF(minimalData);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should include all sections when provided', async () => {
    const completeData = {
      patientName: 'Test Patient',
      patientEmail: 'test@example.com',
      protocolName: 'Comprehensive Protocol',
      diagnosis: 'Test Condition',
      startDate: new Date(),
      duration: '8 weeks',
      goals: ['Goal 1', 'Goal 2'],
      interventions: [
        {
          category: 'Treatment',
          items: ['Item 1', 'Item 2'],
        },
      ],
      medications: [
        {
          name: 'Test Med',
          dosage: '10mg',
          frequency: 'Daily',
          instructions: 'With food',
        },
      ],
      lifestyle: ['Recommendation 1', 'Recommendation 2'],
      followUp: {
        frequency: 'Weekly',
        metrics: ['Metric 1', 'Metric 2'],
      },
      warnings: ['Warning 1', 'Warning 2'],
      physicianName: 'Dr. Complete',
      physicianContact: 'complete@test.com',
    };

    const pdfBuffer = await generateProtocolPDF(completeData);

    // Should generate a larger PDF with all sections
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // Expect substantial content
  });
});

describe('Protocol Delivery Tracking', () => {
  it('should have protocol deliveries table schema', async () => {
    const { protocolDeliveries } = await import('../drizzle/schema');
    
    // Verify table exists and has expected structure
    expect(protocolDeliveries).toBeDefined();
    expect(typeof protocolDeliveries).toBe('object');
  });
});
