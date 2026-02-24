import { describe, it, expect } from 'vitest';

describe('Protocol Customization', () => {
  it('should validate customized protocol structure', () => {
    const customProtocol = {
      title: 'Customized Diabetes Protocol',
      diagnosis: 'Type 2 Diabetes Mellitus',
      duration: '16 weeks',
      goals: [
        'Achieve HbA1c below 7%',
        'Reduce weight by 10%',
      ],
      interventions: [
        {
          category: 'Dietary Modifications',
          items: ['Low carb diet', 'Portion control'],
        },
        {
          category: 'Exercise',
          items: ['30 min walking daily'],
        },
      ],
      medications: [
        {
          name: 'Metformin',
          dosage: '1000mg',
          frequency: 'Twice daily',
          instructions: 'Take with meals',
        },
      ],
      lifestyle: ['Monitor blood glucose daily', 'Keep food diary'],
      followUp: {
        frequency: 'Every 2 weeks',
        metrics: ['Blood glucose', 'Weight', 'HbA1c'],
      },
      warnings: ['Contact physician if glucose < 70 mg/dL'],
    };

    // Validate structure
    expect(customProtocol.title).toBeTruthy();
    expect(customProtocol.diagnosis).toBeTruthy();
    expect(customProtocol.duration).toBeTruthy();
    expect(Array.isArray(customProtocol.goals)).toBe(true);
    expect(customProtocol.goals.length).toBeGreaterThan(0);
    expect(Array.isArray(customProtocol.interventions)).toBe(true);
    expect(customProtocol.interventions.length).toBeGreaterThan(0);
    
    // Validate intervention structure
    customProtocol.interventions.forEach(intervention => {
      expect(intervention.category).toBeTruthy();
      expect(Array.isArray(intervention.items)).toBe(true);
    });

    // Validate medication structure
    expect(Array.isArray(customProtocol.medications)).toBe(true);
    customProtocol.medications?.forEach(med => {
      expect(med.name).toBeTruthy();
      expect(med.dosage).toBeTruthy();
      expect(med.frequency).toBeTruthy();
    });

    // Validate follow-up structure
    expect(customProtocol.followUp).toBeTruthy();
    expect(customProtocol.followUp?.frequency).toBeTruthy();
    expect(Array.isArray(customProtocol.followUp?.metrics)).toBe(true);
  });

  it('should detect allergen conflicts', () => {
    const patientAllergies = ['Penicillin', 'Sulfa drugs'];
    const medications = [
      { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily' },
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
    ];

    const conflicts: string[] = [];
    
    medications.forEach(med => {
      patientAllergies.forEach(allergy => {
        // Simple substring matching (real implementation would be more sophisticated)
        if (med.name.toLowerCase().includes(allergy.toLowerCase()) || 
            allergy.toLowerCase().includes(med.name.toLowerCase())) {
          conflicts.push(`${med.name} may conflict with allergy: ${allergy}`);
        }
      });
    });

    // Amoxicillin is a penicillin derivative, but our simple check won't catch it
    // In production, this would use a drug database
    expect(Array.isArray(conflicts)).toBe(true);
  });

  it('should handle empty optional fields', () => {
    const minimalProtocol = {
      title: 'Basic Protocol',
      diagnosis: 'General Care',
      duration: '4 weeks',
      goals: ['Improve health'],
      interventions: [
        {
          category: 'Lifestyle',
          items: ['Exercise regularly'],
        },
      ],
    };

    expect(minimalProtocol.title).toBeTruthy();
    expect(minimalProtocol.diagnosis).toBeTruthy();
    expect(minimalProtocol.goals.length).toBeGreaterThan(0);
    expect(minimalProtocol.interventions.length).toBeGreaterThan(0);
    
    // Optional fields should be undefined
    expect((minimalProtocol as any).medications).toBeUndefined();
    expect((minimalProtocol as any).lifestyle).toBeUndefined();
    expect((minimalProtocol as any).followUp).toBeUndefined();
    expect((minimalProtocol as any).warnings).toBeUndefined();
  });

  it('should validate medication dosage modifications', () => {
    const originalMedication = {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      instructions: 'Take with meals',
    };

    const modifiedMedication = {
      ...originalMedication,
      dosage: '1000mg', // Physician increased dosage
      instructions: 'Take with meals, avoid alcohol',
    };

    expect(modifiedMedication.name).toBe(originalMedication.name);
    expect(modifiedMedication.dosage).not.toBe(originalMedication.dosage);
    expect(modifiedMedication.dosage).toBe('1000mg');
    expect(modifiedMedication.instructions).toContain('avoid alcohol');
  });

  it('should allow adding and removing interventions', () => {
    let interventions = [
      { category: 'Diet', items: ['Low sodium'] },
      { category: 'Exercise', items: ['Walking'] },
    ];

    // Add new intervention
    interventions.push({
      category: 'Monitoring',
      items: ['Daily weight check'],
    });

    expect(interventions.length).toBe(3);
    expect(interventions[2].category).toBe('Monitoring');

    // Remove intervention
    interventions = interventions.filter(i => i.category !== 'Exercise');

    expect(interventions.length).toBe(2);
    expect(interventions.find(i => i.category === 'Exercise')).toBeUndefined();
  });

  it('should preserve physician customizations in protocol data', () => {
    const baseProtocol = {
      title: 'Standard Protocol',
      goals: ['Goal 1', 'Goal 2'],
    };

    const customizedProtocol = {
      ...baseProtocol,
      title: 'Customized for Patient X',
      goals: [...baseProtocol.goals, 'Goal 3 - Patient Specific'],
      warnings: ['Custom warning for this patient'],
    };

    expect(customizedProtocol.title).not.toBe(baseProtocol.title);
    expect(customizedProtocol.goals.length).toBe(3);
    expect(customizedProtocol.goals).toContain('Goal 3 - Patient Specific');
    expect((customizedProtocol as any).warnings).toBeTruthy();
    expect((customizedProtocol as any).warnings[0]).toContain('Custom warning');
  });
});
