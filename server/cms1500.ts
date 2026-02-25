import PDFDocument from 'pdfkit';
import type { ProviderProfile, Patient, BillingClaim } from '../drizzle/schema';

/**
 * CMS-1500 Form Generator
 * Generates insurance-ready CMS-1500 (02/12) claim forms
 */

export interface CMS1500Data {
  claim: BillingClaim;
  patient: Patient;
  provider: ProviderProfile;
  diagnosisCodes: Array<{ code: string; description: string }>;
  procedureCodes: Array<{ code: string; description: string; charge: number; units: number; date: Date }>;
}

export async function generateCMS1500PDF(data: CMS1500Data): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // CMS-1500 form is 8.5" x 11" (612 x 792 points)
      // Form has specific field positions that must be matched

      // Helper function to write text at specific position
      const writeField = (x: number, y: number, text: string, options?: any) => {
        doc.fontSize(9).text(text, x, y, { width: 200, ...options });
      };

      // Title
      doc.fontSize(12).font('Helvetica-Bold').text('HEALTH INSURANCE CLAIM FORM', 200, 30);
      doc.fontSize(8).font('Helvetica').text('APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12', 180, 45);

      // Form border
      doc.rect(30, 60, 552, 680).stroke();

      // Section 1: Patient Information (Top Left)
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('1. MEDICARE', 35, 70);
      doc.text('MEDICAID', 35, 80);
      doc.text('TRICARE', 35, 90);
      doc.text('CHAMPVA', 35, 100);
      doc.text('GROUP HEALTH PLAN', 35, 110);
      doc.text('FECA BLK LUNG', 35, 120);
      doc.text('OTHER', 35, 130);

      // Box 1a: Insured's ID Number
      doc.text("1a. INSURED'S I.D. NUMBER", 200, 70);
      doc.fontSize(10).font('Helvetica');
      doc.text(data.claim.insurancePolicyNumber || '', 200, 85);

      // Box 2: Patient's Name
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("2. PATIENT'S NAME", 35, 145);
      doc.fontSize(10).font('Helvetica');
      doc.text(`${data.patient.lastName}, ${data.patient.firstName}`, 35, 160);

      // Box 3: Patient's Birth Date and Sex
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("3. PATIENT'S BIRTH DATE", 200, 145);
      doc.text('SEX', 320, 145);
      doc.fontSize(10).font('Helvetica');
      const dob = new Date(data.patient.dateOfBirth);
      doc.text(`${String(dob.getMonth() + 1).padStart(2, '0')}/${String(dob.getDate()).padStart(2, '0')}/${dob.getFullYear()}`, 200, 160);
      doc.text(data.patient.gender === 'male' ? 'M' : data.patient.gender === 'female' ? 'F' : 'X', 320, 160);

      // Box 4: Insured's Name
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("4. INSURED'S NAME", 380, 145);
      doc.fontSize(10).font('Helvetica');
      doc.text(data.claim.subscriberName || 'SAME', 380, 160);

      // Box 5: Patient's Address
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("5. PATIENT'S ADDRESS", 35, 180);
      doc.fontSize(9).font('Helvetica');
      if (data.patient.address) {
        doc.text(data.patient.address, 35, 195, { width: 150 });
      }

      // Box 6: Patient Relationship to Insured
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('6. PATIENT RELATIONSHIP TO INSURED', 200, 180);
      doc.fontSize(10).font('Helvetica');
      const relationship = data.claim.relationshipToSubscriber || 'self';
      doc.text(relationship === 'self' ? 'X' : '', 210, 195);
      doc.fontSize(7).text('Self', 220, 197);
      doc.fontSize(10).text(relationship === 'spouse' ? 'X' : '', 250, 195);
      doc.fontSize(7).text('Spouse', 260, 197);
      doc.fontSize(10).text(relationship === 'child' ? 'X' : '', 300, 195);
      doc.fontSize(7).text('Child', 310, 197);
      doc.fontSize(10).text(relationship === 'other' ? 'X' : '', 350, 195);
      doc.fontSize(7).text('Other', 360, 197);

      // Box 7: Insured's Address
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("7. INSURED'S ADDRESS", 380, 180);
      doc.fontSize(9).font('Helvetica');
      doc.text('SAME', 380, 195);

      // Box 9: Other Insured's Name
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("9. OTHER INSURED'S NAME", 35, 230);

      // Box 10: Is Patient's Condition Related To
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("10. IS PATIENT'S CONDITION RELATED TO:", 200, 230);
      doc.fontSize(7).text('a. EMPLOYMENT?', 205, 245);
      doc.text('YES', 280, 245);
      doc.text('NO', 310, 245);
      doc.fontSize(10).text('X', 310, 243); // Default to NO
      doc.fontSize(7).text('b. AUTO ACCIDENT?', 205, 260);
      doc.text('YES', 280, 260);
      doc.text('NO', 310, 260);
      doc.fontSize(10).text('X', 310, 258); // Default to NO
      doc.fontSize(7).text('c. OTHER ACCIDENT?', 205, 275);
      doc.text('YES', 280, 275);
      doc.text('NO', 310, 275);
      doc.fontSize(10).text('X', 310, 273); // Default to NO

      // Box 11: Insured's Policy Group or FECA Number
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("11. INSURED'S POLICY GROUP OR FECA NUMBER", 380, 230);
      doc.fontSize(10).font('Helvetica');
      doc.text(data.claim.insuranceGroupNumber || '', 380, 245);

      // Box 12: Patient's or Authorized Person's Signature
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("12. PATIENT'S OR AUTHORIZED PERSON'S SIGNATURE", 35, 300);
      doc.fontSize(9).font('Helvetica');
      doc.text('SIGNATURE ON FILE', 35, 315);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 35, 330);

      // Box 13: Insured's or Authorized Person's Signature
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("13. INSURED'S OR AUTHORIZED PERSON'S SIGNATURE", 380, 300);
      doc.fontSize(9).font('Helvetica');
      doc.text('SIGNATURE ON FILE', 380, 315);

      // Box 14: Date of Current Illness, Injury, or Pregnancy
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('14. DATE OF CURRENT ILLNESS, INJURY, OR PREGNANCY', 35, 350);
      doc.fontSize(9).font('Helvetica');
      const serviceDate = new Date(data.claim.serviceDate);
      doc.text(`${String(serviceDate.getMonth() + 1).padStart(2, '0')}/${String(serviceDate.getDate()).padStart(2, '0')}/${serviceDate.getFullYear()}`, 35, 365);

      // Box 17: Name of Referring Provider
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('17. NAME OF REFERRING PROVIDER OR OTHER SOURCE', 35, 390);

      // Box 19: Additional Claim Information
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('19. ADDITIONAL CLAIM INFORMATION', 35, 420);

      // Box 21: Diagnosis or Nature of Illness or Injury
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY', 35, 450);
      doc.fontSize(9).font('Helvetica');
      
      // Display up to 12 diagnosis codes (ICD-10)
      let diagY = 465;
      data.diagnosisCodes.slice(0, 12).forEach((diag, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const x = 35 + (col * 130);
        const y = diagY + (row * 15);
        doc.text(`${String.fromCharCode(65 + idx)}. ${diag.code}`, x, y);
      });

      // Box 24: Service Lines
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('24. A. DATE(S) OF SERVICE', 35, 510);
      doc.text('B. PLACE', 120, 510);
      doc.text('C. EMG', 155, 510);
      doc.text('D. PROCEDURES, SERVICES, OR SUPPLIES', 185, 510);
      doc.text('E. DIAGNOSIS POINTER', 350, 510);
      doc.text('F. $ CHARGES', 440, 510);
      doc.text('G. DAYS/UNITS', 510, 510);

      // Service lines (up to 6 lines)
      doc.fontSize(8).font('Helvetica');
      let serviceY = 525;
      data.procedureCodes.slice(0, 6).forEach((proc, idx) => {
        const y = serviceY + (idx * 20);
        const procDate = new Date(proc.date);
        doc.text(`${String(procDate.getMonth() + 1).padStart(2, '0')}/${String(procDate.getDate()).padStart(2, '0')}/${String(procDate.getFullYear()).slice(-2)}`, 35, y);
        doc.text('11', 120, y); // Place of service: Office
        doc.text(proc.code, 185, y);
        doc.text('A', 350, y); // Diagnosis pointer
        doc.text(`$${proc.charge.toFixed(2)}`, 440, y);
        doc.text(proc.units.toString(), 510, y);
      });

      // Box 25: Federal Tax ID Number
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('25. FEDERAL TAX I.D. NUMBER', 35, 650);
      doc.fontSize(9).font('Helvetica');
      doc.text(data.provider.taxId, 35, 665);
      doc.text('SSN', 120, 665);
      doc.text('X EIN', 150, 665);

      // Box 26: Patient's Account No
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text("26. PATIENT'S ACCOUNT NO.", 200, 650);
      doc.fontSize(9).font('Helvetica');
      doc.text(data.patient.mrn, 200, 665);

      // Box 27: Accept Assignment
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('27. ACCEPT ASSIGNMENT?', 300, 650);
      doc.fontSize(9).font('Helvetica');
      doc.text('YES X', 300, 665);
      doc.text('NO', 340, 665);

      // Box 28: Total Charge
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('28. TOTAL CHARGE', 390, 650);
      doc.fontSize(10).font('Helvetica');
      doc.text(`$${data.claim.totalCharges}`, 390, 665);

      // Box 29: Amount Paid
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('29. AMOUNT PAID', 470, 650);
      doc.fontSize(10).font('Helvetica');
      doc.text('$0.00', 470, 665);

      // Box 31: Signature of Physician or Supplier
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('31. SIGNATURE OF PHYSICIAN OR SUPPLIER', 35, 690);
      doc.fontSize(9).font('Helvetica');
      doc.text('SIGNATURE ON FILE', 35, 705);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 35, 720);

      // Box 32: Service Facility Location Information
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('32. SERVICE FACILITY LOCATION INFORMATION', 200, 690);
      doc.fontSize(8).font('Helvetica');
      doc.text(data.provider.practiceName, 200, 705);
      doc.text(`${data.provider.practiceAddress}`, 200, 717);
      doc.text(`${data.provider.practiceCity}, ${data.provider.practiceState} ${data.provider.practiceZip}`, 200, 729);

      // Box 33: Billing Provider Info & Phone
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('33. BILLING PROVIDER INFO & PH #', 400, 690);
      doc.fontSize(8).font('Helvetica');
      doc.text(data.provider.practiceName, 400, 705);
      doc.text(data.provider.practicePhone, 400, 717);
      doc.text(`NPI: ${data.provider.npi}`, 400, 729);

      // Claim number at bottom
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(`Claim Number: ${data.claim.claimNumber}`, 35, 750);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
