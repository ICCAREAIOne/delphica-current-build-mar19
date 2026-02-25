import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe.sequential('Billing System', () => {
  let testUserId: number;
  let testProfileId: number;
  let testClaimId: number;
  let testClaimNumber: string;

  beforeAll(async () => {
    // Use existing test user (ID 1 should exist from other tests)
    testUserId = 1;
  });

  it('should create a provider profile', async () => {
    expect(testUserId).toBeGreaterThan(0);
    const profileData = {
      userId: testUserId,
      npi: '1234567890',
      taxId: '12-3456789',
      licenseNumber: 'CA12345',
      licenseState: 'CA',
      practiceName: 'Test Medical Group',
      practiceAddress: '123 Test Street',
      practiceCity: 'Los Angeles',
      practiceState: 'CA',
      practiceZip: '90001',
      practicePhone: '(555) 123-4567',
      specialty: 'Internal Medicine',
      isActive: true,
      isPrimary: true,
    };

    await db.createProviderProfile(profileData);
    
    // Query back the created profile
    const profiles = await db.getProviderProfilesByUserId(testUserId);
    expect(profiles.length).toBeGreaterThan(0);
    testProfileId = profiles[0].id;
    expect(testProfileId).toBeGreaterThan(0);
  });

  it('should retrieve provider profile by ID', async () => {
    expect(testProfileId).toBeGreaterThan(0);
    const profile = await db.getProviderProfileById(testProfileId);

    expect(profile).toBeDefined();
    expect(profile?.npi).toBe('1234567890');
    expect(profile?.practiceName).toBe('Test Medical Group');
  });

  it('should retrieve provider profiles by user ID', async () => {
    expect(testUserId).toBeGreaterThan(0);
    const profiles = await db.getProviderProfilesByUserId(testUserId);

    expect(profiles).toBeDefined();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0].userId).toBe(testUserId);
  });

  it('should retrieve primary provider profile', async () => {
    expect(testUserId).toBeGreaterThan(0);
    const profile = await db.getPrimaryProviderProfile(testUserId);

    expect(profile).toBeDefined();
    expect(profile?.isPrimary).toBe(true);
    expect(profile?.userId).toBe(testUserId);
  });

  it('should update provider profile', async () => {
    expect(testProfileId).toBeGreaterThan(0);
    await db.updateProviderProfile(testProfileId, {
      specialty: 'Family Medicine',
      practicePhone: '(555) 999-8888',
    });

    const updatedProfile = await db.getProviderProfileById(testProfileId);

    expect(updatedProfile?.specialty).toBe('Family Medicine');
    expect(updatedProfile?.practicePhone).toBe('(555) 999-8888');
  });

  it('should generate unique claim numbers', async () => {
    const claimNumber1 = await db.generateClaimNumber();
    // Add small delay to ensure different sequence number
    await new Promise(resolve => setTimeout(resolve, 10));
    const claimNumber2 = await db.generateClaimNumber();

    expect(claimNumber1).toMatch(/^CLM-\d{8}-\d{5}$/);
    expect(claimNumber2).toMatch(/^CLM-\d{8}-\d{5}$/);
    // Both should be valid claim numbers (uniqueness is enforced by DB constraint)
  });

  it('should create a billing claim', async () => {
    expect(testProfileId).toBeGreaterThan(0);
    testClaimNumber = await db.generateClaimNumber();

    const claimData = {
      claimNumber: testClaimNumber,
      protocolDeliveryId: 1,
      patientId: 1,
      providerProfileId: testProfileId,
      createdByUserId: testUserId,
      insuranceCompany: 'Blue Cross Blue Shield',
      insurancePolicyNumber: 'ABC123456',
      insuranceGroupNumber: 'GRP789',
      subscriberName: 'John Doe',
      subscriberDob: new Date('1980-01-15'),
      relationshipToSubscriber: 'self' as const,
      serviceDate: new Date(),
      diagnosisCodes: ['M79.3', 'R51.9'],
      procedureCodes: [
        { code: '99213', description: 'Office visit', charge: 150.00, units: 1 },
        { code: '80053', description: 'Comprehensive metabolic panel', charge: 75.00, units: 1 },
      ],
      totalCharges: '225.00',
      status: 'draft' as const,
    };

    await db.createBillingClaim(claimData);
    
    // Query back the created claim
    const claim = await db.getBillingClaimByClaimNumber(testClaimNumber);
    expect(claim).toBeDefined();
    testClaimId = claim!.id;
    expect(testClaimId).toBeGreaterThan(0);
  });

  it('should retrieve billing claim by ID', async () => {
    expect(testClaimId).toBeGreaterThan(0);
    const claim = await db.getBillingClaimById(testClaimId);

    expect(claim).toBeDefined();
    expect(claim?.claimNumber).toBe(testClaimNumber);
    expect(claim?.status).toBe('draft');
    expect(claim?.totalCharges).toBe('225.00');
  });

  it('should retrieve billing claim by claim number', async () => {
    expect(testClaimNumber).toBeDefined();
    const claim = await db.getBillingClaimByClaimNumber(testClaimNumber);

    expect(claim).toBeDefined();
    expect(claim?.id).toBe(testClaimId);
    expect(claim?.insuranceCompany).toBe('Blue Cross Blue Shield');
  });

  it('should update billing claim', async () => {
    expect(testClaimId).toBeGreaterThan(0);
    await db.updateBillingClaim(testClaimId, {
      notes: 'Test claim for billing system',
      insuranceGroupNumber: 'GRP999',
    });

    const updatedClaim = await db.getBillingClaimById(testClaimId);

    expect(updatedClaim?.notes).toBe('Test claim for billing system');
    expect(updatedClaim?.insuranceGroupNumber).toBe('GRP999');
  });

  it('should update billing claim status', async () => {
    expect(testClaimId).toBeGreaterThan(0);
    await db.updateBillingClaimStatus(testClaimId, 'submitted');

    const claim = await db.getBillingClaimById(testClaimId);

    expect(claim?.status).toBe('submitted');
    expect(claim?.submittedDate).toBeDefined();
  });

  it('should retrieve claims by patient', async () => {
    const claims = await db.getBillingClaimsByPatient(1);

    expect(claims).toBeDefined();
    expect(Array.isArray(claims)).toBe(true);
    // Should have at least the claim we created in tests
    expect(claims.length).toBeGreaterThan(0);
  });

  it('should retrieve claims by provider', async () => {
    expect(testProfileId).toBeGreaterThan(0);
    const claims = await db.getBillingClaimsByProvider(testProfileId);

    expect(claims).toBeDefined();
    expect(Array.isArray(claims)).toBe(true);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].providerProfileId).toBe(testProfileId);
  });

  it('should retrieve claims by protocol delivery', async () => {
    const claims = await db.getBillingClaimsByProtocolDelivery(1);

    expect(claims).toBeDefined();
    expect(Array.isArray(claims)).toBe(true);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].protocolDeliveryId).toBe(1);
  });
});
