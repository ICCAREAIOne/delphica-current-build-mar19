import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface ProtocolPDFData {
  patientName: string;
  patientEmail: string;
  protocolName: string;
  diagnosis: string;
  startDate: Date;
  duration: string;
  goals: string[];
  interventions: {
    category: string;
    items: string[];
  }[];
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
  }[];
  lifestyle?: string[];
  followUp?: {
    frequency: string;
    metrics: string[];
  };
  warnings?: string[];
  physicianName: string;
  physicianContact?: string;
}

/**
 * Generate a protocol PDF document
 * Returns a Buffer containing the PDF data
 */
export async function generateProtocolPDF(data: ProtocolPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `${data.protocolName} - ${data.patientName}`,
          Author: data.physicianName,
          Subject: 'Patient Care Protocol',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .fillColor('#1e40af')
        .text('Patient Care Protocol', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' })
        .moveDown(2);

      // Patient Information Section
      doc
        .fontSize(16)
        .fillColor('#1f2937')
        .text('Patient Information')
        .moveDown(0.5);

      doc
        .fontSize(11)
        .fillColor('#374151')
        .text(`Name: ${data.patientName}`)
        .text(`Email: ${data.patientEmail}`)
        .text(`Protocol: ${data.protocolName}`)
        .text(`Diagnosis: ${data.diagnosis}`)
        .text(`Start Date: ${data.startDate.toLocaleDateString()}`)
        .text(`Duration: ${data.duration}`)
        .moveDown(1.5);

      // Treatment Goals Section
      if (data.goals && data.goals.length > 0) {
        doc
          .fontSize(16)
          .fillColor('#1f2937')
          .text('Treatment Goals')
          .moveDown(0.5);

        doc.fontSize(11).fillColor('#374151');
        data.goals.forEach((goal, index) => {
          doc.text(`${index + 1}. ${goal}`, { indent: 20 });
        });
        doc.moveDown(1.5);
      }

      // Interventions Section
      if (data.interventions && data.interventions.length > 0) {
        doc
          .fontSize(16)
          .fillColor('#1f2937')
          .text('Treatment Interventions')
          .moveDown(0.5);

        data.interventions.forEach((intervention) => {
          doc
            .fontSize(13)
            .fillColor('#1e40af')
            .text(intervention.category)
            .moveDown(0.3);

          doc.fontSize(11).fillColor('#374151');
          intervention.items.forEach((item) => {
            doc.text(`• ${item}`, { indent: 20 });
          });
          doc.moveDown(1);
        });
        doc.moveDown(0.5);
      }

      // Medications Section
      if (data.medications && data.medications.length > 0) {
        doc
          .fontSize(16)
          .fillColor('#1f2937')
          .text('Prescribed Medications')
          .moveDown(0.5);

        data.medications.forEach((med) => {
          doc
            .fontSize(12)
            .fillColor('#1e40af')
            .text(med.name)
            .fontSize(11)
            .fillColor('#374151')
            .text(`Dosage: ${med.dosage}`, { indent: 20 })
            .text(`Frequency: ${med.frequency}`, { indent: 20 });
          
          if (med.instructions) {
            doc.text(`Instructions: ${med.instructions}`, { indent: 20 });
          }
          doc.moveDown(0.8);
        });
        doc.moveDown(0.5);
      }

      // Lifestyle Recommendations Section
      if (data.lifestyle && data.lifestyle.length > 0) {
        doc
          .fontSize(16)
          .fillColor('#1f2937')
          .text('Lifestyle Recommendations')
          .moveDown(0.5);

        doc.fontSize(11).fillColor('#374151');
        data.lifestyle.forEach((item) => {
          doc.text(`• ${item}`, { indent: 20 });
        });
        doc.moveDown(1.5);
      }

      // Follow-up Section
      if (data.followUp) {
        doc
          .fontSize(16)
          .fillColor('#1f2937')
          .text('Follow-up Care')
          .moveDown(0.5);

        doc
          .fontSize(11)
          .fillColor('#374151')
          .text(`Frequency: ${data.followUp.frequency}`)
          .moveDown(0.5);

        if (data.followUp.metrics && data.followUp.metrics.length > 0) {
          doc.text('Metrics to Monitor:');
          data.followUp.metrics.forEach((metric) => {
            doc.text(`• ${metric}`, { indent: 20 });
          });
        }
        doc.moveDown(1.5);
      }

      // Warnings Section
      if (data.warnings && data.warnings.length > 0) {
        doc
          .fontSize(16)
          .fillColor('#dc2626')
          .text('Important Warnings')
          .moveDown(0.5);

        doc.fontSize(11).fillColor('#991b1b');
        data.warnings.forEach((warning) => {
          doc.text(`⚠ ${warning}`, { indent: 20 });
        });
        doc.moveDown(1.5);
      }

      // Footer
      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text('_'.repeat(80), { align: 'center' })
        .moveDown(0.5);

      doc
        .text(`Prescribed by: ${data.physicianName}`, { align: 'center' });
      
      if (data.physicianContact) {
        doc.text(`Contact: ${data.physicianContact}`, { align: 'center' });
      }

      doc
        .moveDown(0.5)
        .fontSize(9)
        .fillColor('#9ca3af')
        .text('This protocol is personalized for the patient named above. Do not share with others.', {
          align: 'center',
        })
        .text('Contact your physician if you have questions or experience adverse effects.', {
          align: 'center',
        });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a protocol PDF from care plan data
 */
export async function generateProtocolFromCarePlan(
  carePlan: any,
  patient: any,
  physician: any
): Promise<Buffer> {
  // Parse the care plan data
  const planData = typeof carePlan.plan === 'string' ? JSON.parse(carePlan.plan) : carePlan.plan;

  const pdfData: ProtocolPDFData = {
    patientName: patient.name || 'Patient',
    patientEmail: patient.email || '',
    protocolName: carePlan.title || 'Care Protocol',
    diagnosis: carePlan.diagnosis || planData.diagnosis || 'Not specified',
    startDate: carePlan.createdAt || new Date(),
    duration: planData.duration || '12 weeks',
    goals: planData.goals || [],
    interventions: planData.interventions || [],
    medications: planData.medications || [],
    lifestyle: planData.lifestyle || [],
    followUp: planData.followUp || {
      frequency: 'Every 2 weeks',
      metrics: ['Symptoms', 'Lab results', 'Adherence'],
    },
    warnings: planData.warnings || [],
    physicianName: physician.name || 'Dr. Physician',
    physicianContact: physician.email || '',
  };

  return generateProtocolPDF(pdfData);
}
