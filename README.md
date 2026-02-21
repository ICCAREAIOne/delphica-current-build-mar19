# AI-Driven Physician Portal

A comprehensive clinical decision support platform implementing an advanced AI-driven framework for optimized physician workflows, evidence-based treatment planning, and patient care automation.

## Overview

The AI-Driven Physician Portal integrates multiple AI-powered clinical modules into a unified workflow system designed to enhance diagnostic accuracy, treatment planning, and patient outcomes. The platform combines structured clinical protocols, causal AI analysis, semantic medical coding, safety verification, and continuous outcome tracking to support evidence-based medical practice.

## Core Framework Components

The portal implements a sophisticated bidirectional AI framework with the following integrated modules:

### 1. DAO Protocol System
Structured clinical data entry and protocol management system providing standardized diagnosis and treatment documentation. The system includes comprehensive clinical protocols with evidence-based guidelines, ICD-10/CPT coding, and patient education materials.

**Key Features:**
- Comprehensive clinical protocol library with searchable evidence-based guidelines
- Protocol application workflow that pre-fills encounter forms with protocol-specific suggestions
- Lab order templates integrated with protocols for streamlined ordering
- Protocol analytics dashboard tracking usage, feedback rates, and clinical outcomes
- Side-by-side protocol comparison with effectiveness scoring and actionable insights

**Implemented Protocols:**
- **Fatigue Evaluation Protocol**: Complete diagnostic evaluation including initial assessment with red flags, comprehensive laboratory workup, differential diagnosis covering 15+ conditions (endocrine, hematologic, cardiac, psychiatric, sleep, infectious, autoimmune, lifestyle factors), condition-specific treatment plans with medications and dosages, follow-up strategy, and expected outcomes
- Hydration and caffeine assessment integrated into fatigue protocol
- Patient education handouts for hydration guidelines, caffeine management, and stimulant tapering

### 2. Semantic Processor
AI-powered medical coding engine that automatically extracts ICD-10 diagnosis codes and CPT procedure codes from clinical documentation, standardizes medical terminology, and ensures coding accuracy for optimal reimbursement.

### 3. Causal Brain
Evidence-based AI analysis engine that performs causal relationship analysis, generates treatment recommendations based on clinical evidence, and integrates with a clinical knowledge base containing mechanistic insights and research findings.

**Knowledge Base Integration:**
- Searchable repository of clinical knowledge entries with mechanisms of action, clinical evidence, dosing guidelines, contraindications, and drug interactions
- Automatic retrieval of relevant knowledge during patient analysis based on chief complaint and symptoms
- Initial entries include: Cinnamic Acid PPAR-gamma agonist, Bempedoic Acid dual-mechanism lipid lowering, Statin pleiotropic effects

### 4. Delphi Simulator
AI-powered scenario exploration tool enabling physicians to simulate treatment options, compare predicted outcomes, and explore alternative clinical pathways through bidirectional communication with the Causal Brain.

### 5. Precision Care Plan Generator
Personalized treatment plan generation system that creates patient-specific care plans based on AI analysis, clinical protocols, and evidence-based guidelines with customization and versioning capabilities.

### 6. Digital Review Board
Multi-layer safety verification system that detects potential safety alerts, checks compliance with clinical guidelines, and provides approval workflows with audit trails for clinical decision oversight.

### 7. Marketplace Entry & Outcome Tracking
Continuous learning system that documents clinical outcomes, collects feedback data, and enables system improvement through outcome analysis and performance metrics tracking.

## Patient Intake Automation

### AI Avatar Intake Agent
Conversational AI-powered patient intake system that automates pre-visit data collection through natural language interaction.

**Features:**
- **Multilingual Support**: English, Spanish, Chinese, French, Haitian Creole with AI-powered translation
- **Voice Input**: Browser-based speech-to-text using Web Speech API with visual recording feedback
- **Smart Follow-up Questions**: AI generates contextual follow-up questions based on patient responses
- **DAO Protocol Integration**: Automatically populates encounter forms with collected intake data
- **Session Management**: Physician dashboard for reviewing completed intake sessions, sending email invitations, and creating encounters from intake data

**Intake Session Management Dashboard:**
- List view with filtering (in progress, completed, all sessions)
- Search by patient name or email
- Session detail modal with full conversation history
- Collected data display in structured format
- Generate intake link with copy-to-clipboard functionality
- Create encounter directly from intake data
- Email integration for sending intake invitations with customizable templates

**Email Integration:**
- Nodemailer-based SMTP email service
- Customizable email templates (invitation, reminder)
- Appointment date field for personalized messaging
- Environment variable configuration for SMTP settings

## Technical Architecture

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS 4 for styling
- Shadcn/UI component library
- Wouter for client-side routing
- tRPC React Query hooks for type-safe API calls

**Backend:**
- Node.js with Express 4
- tRPC 11 for end-to-end type safety
- Prisma ORM for database access
- PostgreSQL database
- Superjson for automatic serialization

**AI Integration:**
- OpenAI API for LLM-powered analysis and conversational intake
- Structured JSON schema responses for reliable data extraction
- Streaming responses for real-time user feedback
- Knowledge base integration for evidence-based recommendations

**Authentication:**
- Manus OAuth integration
- Session-based authentication with JWT
- Role-based access control (admin/user)

**Email Services:**
- Nodemailer with SMTP configuration
- HTML email templates with inline styling
- Customizable template system

### Database Schema

The platform uses a comprehensive relational database schema with the following core tables:

**Patient Management:**
- `patients`: Patient demographics, medical history, medications, allergies
- `encounters`: Clinical encounters with SOAP notes, diagnoses, treatment plans

**Clinical Protocols:**
- `protocols`: Protocol metadata and content
- `protocol_applications`: Tracking of protocol usage per patient
- `lab_order_templates`: Standardized lab order sets linked to protocols

**AI Framework:**
- `delphi_simulations`: Scenario exploration history
- `causal_insights`: AI-generated evidence-based recommendations
- `precision_care_plans`: Personalized treatment plans
- `safety_reviews`: Digital Review Board verification records
- `clinical_outcomes`: Outcome tracking for continuous learning

**Knowledge Base:**
- `knowledge_base`: Clinical knowledge entries with mechanisms, evidence, dosing
- `knowledge_base_references`: Citations and sources
- `knowledge_base_usage`: Usage tracking for clinical integration

**Patient Intake:**
- `intake_sessions`: Patient intake session metadata (status, language, patient info)
- `intake_messages`: Conversation messages with role (user/assistant) and content

**Analytics:**
- `coding_analytics`: Semantic processor performance metrics
- `protocol_analytics`: Protocol usage and outcome tracking

### Project Structure

```
client/
  src/
    pages/              # Page components
      Home.tsx          # Dashboard overview
      PatientList.tsx   # Patient management
      PatientDetail.tsx # Patient record view
      NewPatient.tsx    # Patient registration
      NewEncounter.tsx  # Encounter documentation
      WorkflowDemo.tsx  # Complete framework demo
      CodingDemo.tsx    # Semantic processor demo
      QualityAssurance.tsx # QA dashboard
      OutcomeAnalytics.tsx # Outcome tracking
      ClinicalAlerts.tsx   # Alert monitoring
      NotificationPreferences.tsx # Alert settings
      KnowledgeBase.tsx    # Knowledge repository
      ClinicalLibrary.tsx  # Protocol library
      ProtocolAuthoring.tsx # Protocol creation
      CaseConsultation.tsx  # Multi-provider collaboration
      FatigueProtocol.tsx   # Fatigue protocol detail
      ProtocolAnalytics.tsx # Protocol usage metrics
      ProtocolComparison.tsx # Protocol comparison view
      PatientIntake.tsx     # AI avatar intake interface
      IntakeDashboard.tsx   # Intake session management
    components/
      ui/               # Shadcn/UI components
      DashboardLayout.tsx # Main layout with sidebar
    lib/
      trpc.ts           # tRPC client configuration

server/
  routers.ts            # tRPC procedure definitions
  db.ts                 # Database query helpers
  aiService.ts          # AI integration module
  intakeAgent.ts        # Conversational intake AI
  emailService.ts       # Nodemailer email service
  _core/                # Framework infrastructure
    llm.ts              # LLM integration helper
    oauth.ts            # Authentication handling

drizzle/
  schema.ts             # Database schema definitions

shared/
  types.ts              # Shared TypeScript types
```

## Key Features

### Clinical Decision Support
- Evidence-based protocol library with searchable guidelines
- Real-time AI-powered diagnostic assistance
- Treatment recommendation engine with confidence scoring
- Causal relationship analysis for complex cases
- Clinical knowledge base with automatic retrieval

### Protocol Management
- Comprehensive protocol library with specialty categorization
- Apply protocol workflow pre-filling encounter forms
- Lab order templates for streamlined ordering
- Protocol analytics tracking usage and outcomes
- Side-by-side protocol comparison with effectiveness scoring
- Protocol authoring tool with AI-assisted generation

### Medical Coding Automation
- Automatic ICD-10 diagnosis code extraction
- CPT procedure code suggestion
- Medical terminology standardization
- Coding quality metrics and accuracy scoring
- Reimbursement optimization insights

### Patient Intake Automation
- Multilingual conversational AI (5 languages)
- Voice input with speech-to-text
- Smart contextual follow-up questions
- Automatic encounter form population
- Email invitation system with templates
- Session management dashboard

### Quality Assurance
- Documentation quality analysis
- Coding accuracy metrics
- Improvement suggestion generation
- Trend analysis over time
- Reimbursement optimization tracking

### Safety & Compliance
- Multi-layer safety verification
- Clinical guideline compliance checking
- Critical value detection
- High-risk patient identification
- Alert acknowledgment and audit trail

### Outcome Tracking
- Clinical outcome documentation
- AI recommendation accuracy metrics
- Treatment success rate analysis
- Predicted vs actual outcome comparison
- Continuous learning feedback loop

### Collaboration Tools
- Multi-provider case consultation rooms
- Real-time presence indicators
- Discussion threads and commenting
- Shared patient views
- Activity feeds for case updates

## Getting Started

### Prerequisites
- Node.js 22.x or higher
- PostgreSQL database
- OpenAI API key (for AI features)
- SMTP credentials (for email features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ICCAREForAll/Draft-physician-portal.git
cd Draft-physician-portal
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/physician_portal

# OpenAI API (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Email Service (for intake invitations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Physician Portal <your_email@gmail.com>

# Authentication (provided by Manus platform)
JWT_SECRET=your_jwt_secret
OAUTH_SERVER_URL=oauth_server_url
VITE_OAUTH_PORTAL_URL=oauth_portal_url
```

4. Initialize database:
```bash
pnpm db:push
```

5. Start development server:
```bash
pnpm dev
```

6. Access the portal at `http://localhost:3000`

### Testing

Run the test suite:
```bash
pnpm test
```

Current test coverage includes:
- Authentication flow tests
- Patient management procedures
- Protocol system functionality
- Semantic processor accuracy
- tRPC procedure validation

## Usage

### For Physicians

1. **Patient Management**: Register new patients, document encounters using structured SOAP notes, and track patient history
2. **Protocol Application**: Browse clinical library, select appropriate protocols, and apply them to patient encounters with pre-filled suggestions
3. **AI Analysis**: Run complete framework workflow on patient cases to receive diagnostic insights, treatment recommendations, and safety verification
4. **Intake Management**: Send intake links to patients via email, review completed intake sessions, and create encounters from collected data
5. **Outcome Tracking**: Document clinical outcomes and review analytics to improve decision-making

### For Patients

1. **Intake Session**: Receive email invitation with intake link
2. **Select Language**: Choose preferred language (English, Spanish, Chinese, French, Haitian Creole)
3. **Conversational Interface**: Interact with AI avatar using text or voice input
4. **Answer Questions**: Respond to smart follow-up questions about symptoms, medical history, and medications
5. **Complete Session**: Review collected information before submission

### For Administrators

1. **Protocol Authoring**: Create new clinical protocols using the authoring tool with AI-assisted generation
2. **Knowledge Base Management**: Add clinical knowledge entries with mechanisms, evidence, and dosing guidelines
3. **Analytics Review**: Monitor protocol usage, coding accuracy, and outcome metrics
4. **Quality Assurance**: Review documentation quality metrics and implement improvement suggestions

## Development Roadmap

### Completed Features ✅
- Core framework architecture with bidirectional AI workflow
- Patient management and encounter documentation
- Semantic processor with ICD-10/CPT coding
- Causal Brain with knowledge base integration
- Complete workflow demonstration
- Quality assurance dashboard
- Clinical alerts system
- Notification preferences
- Clinical decision support library
- Protocol authoring tool
- Multi-provider case consultation
- Comprehensive fatigue evaluation protocol
- Universal protocol system with analytics
- Protocol comparison view
- Clinical knowledge base
- AI avatar intake agent with multilingual support
- Voice input for patient intake
- Intake session management dashboard
- Email integration for intake invitations
- Quick actions dropdown for intake navigation

### Planned Enhancements 🚀
- Real-time data integration with monitoring devices
- Advanced protocol versioning and publishing workflow
- Patient-specific alert overrides
- Drug interaction reference database
- Clinical calculators and tools
- Intake analytics dashboard
- Session status badges with real-time counts
- Email delivery tracking
- Bulk invitation system
- Report generation with customizable date ranges
- Keyboard shortcuts for power users

## Contributing

This project is maintained by the ICCARE organization. For contributions, please follow the standard GitHub workflow:

1. Fork the repository
2. Create a feature branch
3. Commit your changes with descriptive messages
4. Write tests for new features
5. Submit a pull request

## License

Copyright © 2026 ICCARE. All rights reserved.

## Support

For questions, issues, or feature requests, please open an issue on GitHub or contact the ICCARE development team.

---

**Built with ❤️ by ICCARE using the Manus AI platform**
