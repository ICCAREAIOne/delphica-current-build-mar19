import * as fs from 'fs';
import * as path from 'path';
import * as db from '../server/db';

async function seedProtocolTemplates() {
  console.log('Starting protocol template seeding...\n');
  
  // Read the generated templates
  const templatesPath = path.join(process.cwd(), 'scripts', 'all-templates.json');
  const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
  
  console.log(`Found ${templatesData.length} templates to seed\n`);
  
  const seededTemplates = [];
  
  for (const template of templatesData) {
    try {
      console.log(`Seeding: ${template.name}...`);
      
      const result = await db.createProtocolTemplate({
        createdBy: 1, // System/Admin user
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        templateData: template.templateData,
        isPublic: true, // Make available to all physicians
      });
      
      seededTemplates.push(result);
      console.log(`  ✓ Created template ID: ${result.id}`);
    } catch (error) {
      console.error(`  ✗ Error seeding ${template.name}:`, error);
    }
  }
  
  console.log(`\n✓ Successfully seeded ${seededTemplates.length}/${templatesData.length} protocol templates`);
  console.log('\nSeeded templates:');
  seededTemplates.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name} (ID: ${t.id}, Category: ${t.category})`);
  });
  
  return seededTemplates;
}

seedProtocolTemplates()
  .then(() => {
    console.log('\n✓ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  });
