import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('Creating test patient portal data...\n');

// 1. Create a test patient user
const testPatient = await db.insert(schema.user).values({
  openId: 'test-patient-001',
  name: 'John Patient',
  email: 'john.patient@test.com',
  role: 'user',
}).onDuplicateKeyUpdate({ set: { name: 'John Patient' } });

console.log('✓ Created test patient user');

// Get the patient ID
const [patient] = await db.select().from(schema.user).where(schema.user.email.eq('john.patient@test.com'));
console.log(`  Patient ID: ${patient.id}`);

// 2. Create a patient record
const [patientRecord] = await db.insert(schema.patients).values({
  userId: patient.id,
  firstName: 'John',
  lastName: 'Patient',
  dateOfBirth: new Date('1980-05-15'),
  gender: 'male',
  phone: '555-0123',
  email: 'john.patient@test.com',
  address: '123 Test St',
  city: 'Test City',
  state: 'TC',
  zipCode: '12345',
  emergencyContact: 'Jane Patient',
  emergencyPhone: '555-0124',
}).onDuplicateKeyUpdate({ set: { firstName: 'John' } });

console.log('✓ Created patient record');

// Get physician (current user)
const [physician] = await db.select().from(schema.user).where(schema.user.role.eq('admin')).limit(1);
console.log(`  Physician ID: ${physician.id}`);

// 3. Create a care plan
const [carePlan] = await db.insert(schema.patientCarePlans).values({
  patientId: patient.id,
  physicianId: physician.id,
  title: 'Type 2 Diabetes Management Plan',
  diagnosis: 'Type 2 Diabetes Mellitus (E11.9)',
  goals: JSON.stringify([
    'Reduce HbA1c to below 7%',
    'Lose 10-15 pounds over 3 months',
    'Exercise 30 minutes daily',
    'Monitor blood glucose twice daily'
  ]),
  medications: JSON.stringify([
    {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily with meals',
      instructions: 'Take with food to reduce stomach upset',
      startDate: new Date().toISOString()
    },
    {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      instructions: 'Take in the morning',
      startDate: new Date().toISOString()
    }
  ]),
  lifestyle: JSON.stringify([
    {
      recommendation: 'Low-carb Mediterranean diet',
      frequency: 'Daily'
    },
    {
      recommendation: 'Brisk walking or swimming',
      frequency: '30 minutes, 5 days per week'
    },
    {
      recommendation: 'Blood glucose monitoring',
      frequency: 'Fasting and 2 hours post-meal'
    }
  ]),
  monitoring: JSON.stringify([
    { metric: 'HbA1c', frequency: 'Every 3 months' },
    { metric: 'Blood pressure', frequency: 'Weekly' },
    { metric: 'Weight', frequency: 'Weekly' }
  ]),
  checkInFrequency: 'weekly',
  nextCheckInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: 'active',
  startDate: new Date(),
  sharedWithPatient: true,
});

console.log('✓ Created care plan');
console.log(`  Care Plan ID: ${carePlan.insertId}`);

// 4. Create some sample lab results
const labResults = [
  {
    patientId: patient.id,
    testDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    labName: 'Comprehensive Metabolic Panel',
    testResults: JSON.stringify([
      { testName: 'HbA1c', value: '8.2', unit: '%', referenceRange: '4.0-5.6', flag: 'high' },
      { testName: 'Fasting Glucose', value: '145', unit: 'mg/dL', referenceRange: '70-100', flag: 'high' },
      { testName: 'Total Cholesterol', value: '210', unit: 'mg/dL', referenceRange: '<200', flag: 'high' },
    ]),
    uploadedBy: physician.id,
    uploadMethod: 'manual',
  },
  {
    patientId: patient.id,
    testDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    labName: 'Follow-up Glucose',
    testResults: JSON.stringify([
      { testName: 'HbA1c', value: '7.8', unit: '%', referenceRange: '4.0-5.6', flag: 'high' },
      { testName: 'Fasting Glucose', value: '132', unit: 'mg/dL', referenceRange: '70-100', flag: 'high' },
    ]),
    uploadedBy: physician.id,
    uploadMethod: 'manual',
  }
];

for (const lab of labResults) {
  await db.insert(schema.patientLabResults).values(lab);
}

console.log('✓ Created sample lab results (2 entries)');

// 5. Create a sample check-in
const [checkIn] = await db.insert(schema.patientCheckIns).values({
  patientId: patient.id,
  carePlanId: carePlan.insertId,
  checkInDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  overallFeeling: 7,
  symptoms: JSON.stringify([
    { symptom: 'Fatigue', severity: 3, notes: 'Better than last week' },
    { symptom: 'Increased thirst', severity: 2 }
  ]),
  metrics: JSON.stringify([
    { metric: 'Weight', value: '185', unit: 'lbs' },
    { metric: 'Fasting glucose', value: '128', unit: 'mg/dL' }
  ]),
  medicationsTaken: JSON.stringify([
    { medication: 'Metformin', taken: true, missedDoses: 0 },
    { medication: 'Lisinopril', taken: true, missedDoses: 0 }
  ]),
  lifestyleAdherence: JSON.stringify([
    { activity: 'Diet', adherence: 85 },
    { activity: 'Exercise', adherence: 70 }
  ]),
  conversationSummary: 'Patient reports feeling better overall. Glucose levels improving with medication. Still struggling with exercise routine but diet adherence is good.',
  aiConcerns: null,
  alertGenerated: false,
});

console.log('✓ Created sample check-in');

// 6. Create progress metrics
const progressMetrics = [];
for (let i = 0; i < 4; i++) {
  const weekAgo = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
  progressMetrics.push({
    patientId: patient.id,
    carePlanId: carePlan.insertId,
    periodStart: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
    periodEnd: weekAgo,
    avgOverallFeeling: 7 + Math.random() * 2,
    avgSymptomSeverity: 2 + Math.random(),
    medicationAdherence: 85 + Math.random() * 10,
    lifestyleAdherence: 75 + Math.random() * 15,
    checkInsCompleted: 1,
    alertsGenerated: 0,
  });
}

for (const metric of progressMetrics) {
  await db.insert(schema.patientProgressMetrics).values(metric);
}

console.log('✓ Created progress metrics (4 weeks)');

console.log('\n✅ Test data created successfully!');
console.log('\nTest Patient Login:');
console.log(`  Email: john.patient@test.com`);
console.log(`  Patient ID: ${patient.id}`);
console.log('\nYou can now test the patient portal at: /patient-portal');

await connection.end();
