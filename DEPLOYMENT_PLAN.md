# Deployment Plan: Delphi Simulator & Feedback System

**Version:** 1.0  
**Date:** February 26, 2026  
**Author:** Manus AI  
**Project:** AI-Driven Physician Portal

---

## Executive Summary

This deployment plan outlines the comprehensive strategy for deploying three major features to the AI-Driven Physician Portal production environment: the **Delphi Simulator** (treatment scenario exploration), **Feedback Mechanism** (physician rating system), and **Peer Comparison** (benchmarking analytics). These features introduce AI-powered virtual patient simulation, evidence-based outcome prediction, and collaborative quality improvement capabilities that fundamentally enhance clinical decision-making workflows.

The deployment involves database schema changes (6 new tables), backend API expansions (16 new tRPC procedures), and significant UI additions. All features have been validated through 29 passing unit tests and are currently running in the development environment without errors.

---

## Feature Overview

### 1. Delphi Simulator

The Delphi Simulator enables physicians to explore multiple treatment scenarios through conversational role-play with AI-powered virtual patients before finalizing care plans. The system generates evidence-based outcome predictions and provides scenario comparison capabilities to support informed decision-making.

**Key Capabilities:**
- **AI Scenario Generation**: Automatically generates 3-5 treatment scenarios from diagnosis codes using LLM analysis of clinical guidelines and evidence
- **Virtual Patient Simulation**: Conversational interface where physicians interact with AI patients exhibiting realistic responses to proposed treatments
- **Outcome Prediction**: Evidence-based forecasting of treatment outcomes including symptom improvement, adverse events, and quality of life changes
- **Scenario Comparison**: Side-by-side analysis with ranking algorithms to identify optimal treatment approaches

**Technical Components:**
- 4 database tables: `simulation_scenarios`, `scenario_interactions`, `scenario_outcomes`, `scenario_comparisons`
- 9 tRPC procedures: scenario generation, patient simulation, outcome prediction, comparison
- 12 unit tests covering all functionality
- Integration with Causal Brain for bidirectional communication

### 2. Feedback Mechanism

The feedback mechanism allows physicians to rate the realism of virtual patient interactions and the accuracy of outcome predictions, creating a continuous learning loop for system improvement.

**Key Capabilities:**
- **Interaction Feedback**: 5-star ratings for realism, clinical accuracy, and conversational quality
- **Outcome Feedback**: 5-star ratings for prediction accuracy, evidence quality, and clinical relevance
- **Detailed Comments**: Free-text feedback with issue reporting and improvement suggestions
- **Analytics Dashboard**: Aggregate feedback metrics for identifying improvement opportunities

**Technical Components:**
- 2 database tables: `interaction_feedback`, `outcome_feedback`
- 5 tRPC procedures: feedback submission, retrieval, and analytics
- Star rating UI component with modal dialogs
- 9 unit tests covering feedback workflows

### 3. Peer Comparison

The peer comparison feature enables physicians to benchmark their feedback patterns against colleagues through anonymized analytics, percentile rankings, and visual charts.

**Key Capabilities:**
- **Percentile Rankings**: Shows where each physician stands relative to peers (0-100th percentile)
- **Quality Scores**: Composite scores for interaction and outcome rating patterns
- **Visual Benchmarking**: Side-by-side progress bars comparing individual vs. peer averages
- **Distribution Analysis**: Charts showing how all physicians rate system components
- **Anonymized Data**: Protects individual physician privacy while enabling meaningful comparison

**Technical Components:**
- 2 database helpers: peer comparison analytics, feedback distribution
- 2 tRPC procedures: peer comparison, distribution analysis
- Full-featured dashboard page with charts and progress bars
- 8 unit tests covering comparison logic

---

## Pre-Deployment Checklist

### Database Preparation

**Schema Validation:**
- [ ] Verify all 6 new tables exist in development database
- [ ] Confirm foreign key relationships are properly established
- [ ] Validate index creation on frequently queried columns
- [ ] Test database migration scripts on staging environment
- [ ] Backup production database before schema changes

**Data Integrity:**
- [ ] Ensure existing `clinical_sessions` table has required fields
- [ ] Verify `users` table includes physician role field
- [ ] Confirm no orphaned records in related tables
- [ ] Test cascade delete behaviors for scenario cleanup

### Application Code Review

**Backend Validation:**
- [ ] Review all 16 new tRPC procedures for security vulnerabilities
- [ ] Verify authentication checks on protected procedures
- [ ] Confirm LLM API rate limiting and error handling
- [ ] Test database connection pooling under load
- [ ] Validate input sanitization on all user-provided data

**Frontend Validation:**
- [ ] Test UI responsiveness across desktop and tablet devices
- [ ] Verify accessibility compliance (WCAG 2.1 AA standards)
- [ ] Confirm error handling and user feedback messages
- [ ] Test loading states and skeleton screens
- [ ] Validate navigation flow and back button behavior

### Testing & Quality Assurance

**Unit Tests:**
- [ ] Run all 29 unit tests and confirm 100% pass rate
- [ ] Review test coverage for critical paths (target >80%)
- [ ] Verify mock data doesn't leak into production tests

**Integration Tests:**
- [ ] Test complete Delphi Simulator workflow end-to-end
- [ ] Verify feedback submission and retrieval across sessions
- [ ] Confirm peer comparison calculations with multiple physicians
- [ ] Test Causal Brain integration and data flow

**Performance Tests:**
- [ ] Benchmark LLM response times for scenario generation (target <10s)
- [ ] Test virtual patient simulation latency (target <3s per message)
- [ ] Verify database query performance on large datasets
- [ ] Load test with 50+ concurrent physicians using simulator

**Security Tests:**
- [ ] Verify physicians can only access their own scenarios
- [ ] Test SQL injection prevention on all input fields
- [ ] Confirm XSS protection on feedback comments
- [ ] Validate session management and token expiration

### Infrastructure Preparation

**Environment Configuration:**
- [ ] Verify production LLM API keys are configured (not test keys)
- [ ] Confirm database connection strings point to production
- [ ] Validate environment variables for all services
- [ ] Test backup and restore procedures

**Monitoring Setup:**
- [ ] Configure application performance monitoring (APM)
- [ ] Set up error tracking and alerting (e.g., Sentry)
- [ ] Enable database query monitoring
- [ ] Configure LLM API usage tracking and cost alerts

**Capacity Planning:**
- [ ] Estimate storage requirements for scenario data (1-2 GB per 1000 scenarios)
- [ ] Calculate LLM API costs based on expected usage
- [ ] Verify database connection pool size is adequate
- [ ] Confirm server resources can handle peak load

### Documentation & Training

**Technical Documentation:**
- [ ] Update API documentation with new tRPC procedures
- [ ] Document database schema changes
- [ ] Create troubleshooting guide for common issues
- [ ] Update system architecture diagrams

**User Documentation:**
- [ ] Create physician user guide for Delphi Simulator
- [ ] Write feedback submission instructions
- [ ] Document peer comparison interpretation
- [ ] Prepare FAQ for common questions

**Training Materials:**
- [ ] Record video walkthrough of Delphi Simulator workflow
- [ ] Create quick-start guide with screenshots
- [ ] Prepare training session slides for physician onboarding
- [ ] Develop example scenarios for demonstration

---

## Deployment Steps

### Phase 1: Database Migration (Estimated: 30 minutes)

**Timing:** Deploy during maintenance window (low-traffic period)

**Steps:**

1. **Backup Production Database**
   ```bash
   # Create full database backup
   mysqldump -u [username] -p physician_portal > backup_pre_deployment_$(date +%Y%m%d_%H%M%S).sql
   
   # Verify backup integrity
   mysql -u [username] -p physician_portal_test < backup_pre_deployment_*.sql
   ```

2. **Apply Schema Changes**
   ```bash
   # Navigate to project directory
   cd /home/ubuntu/physician-portal
   
   # Generate migration files
   pnpm drizzle-kit generate
   
   # Review migration SQL before applying
   cat drizzle/migrations/*.sql
   
   # Apply migrations to production
   pnpm drizzle-kit migrate
   ```

3. **Verify Schema Changes**
   ```sql
   -- Confirm all tables exist
   SHOW TABLES LIKE 'simulation_%';
   SHOW TABLES LIKE '%_feedback';
   
   -- Verify table structures
   DESCRIBE simulation_scenarios;
   DESCRIBE interaction_feedback;
   DESCRIBE outcome_feedback;
   
   -- Check foreign key constraints
   SELECT * FROM information_schema.KEY_COLUMN_USAGE 
   WHERE TABLE_SCHEMA = 'physician_portal' 
   AND TABLE_NAME LIKE 'simulation_%';
   ```

4. **Create Initial Indexes**
   ```sql
   -- Optimize query performance
   CREATE INDEX idx_scenarios_physician ON simulation_scenarios(physician_id, created_at);
   CREATE INDEX idx_interactions_scenario ON scenario_interactions(scenario_id, created_at);
   CREATE INDEX idx_outcomes_scenario ON scenario_outcomes(scenario_id);
   CREATE INDEX idx_feedback_physician ON interaction_feedback(physician_id, created_at);
   ```

**Rollback Procedure:**
If schema migration fails, restore from backup:
```bash
mysql -u [username] -p physician_portal < backup_pre_deployment_*.sql
```

### Phase 2: Application Deployment (Estimated: 15 minutes)

**Steps:**

1. **Deploy Backend Code**
   ```bash
   # Pull latest code from GitHub
   cd /home/ubuntu/physician-portal
   git pull origin main
   
   # Verify correct commit
   git log -1 --oneline  # Should show: 947bc2a
   
   # Install dependencies
   pnpm install
   
   # Build application
   pnpm build
   ```

2. **Restart Application Server**
   ```bash
   # Stop current server
   pm2 stop physician-portal
   
   # Start with new code
   pm2 start ecosystem.config.js
   
   # Verify server is running
   pm2 status
   pm2 logs physician-portal --lines 50
   ```

3. **Verify Health Checks**
   ```bash
   # Test API endpoint
   curl https://your-domain.com/api/health
   
   # Verify tRPC router
   curl https://your-domain.com/api/trpc/delphiSimulator.getScenarios
   ```

**Rollback Procedure:**
If application deployment fails:
```bash
# Revert to previous commit
git reset --hard [previous-commit-hash]
pnpm install
pnpm build
pm2 restart physician-portal
```

### Phase 3: Feature Validation (Estimated: 45 minutes)

**Smoke Tests:**

1. **Delphi Simulator Workflow**
   - [ ] Create new clinical session with diagnosis
   - [ ] Click "Explore Scenarios" button
   - [ ] Verify 3-5 scenarios generate within 10 seconds
   - [ ] Select scenario and test virtual patient conversation
   - [ ] Verify outcome predictions display correctly
   - [ ] Test scenario comparison and ranking

2. **Feedback Mechanism**
   - [ ] Submit interaction feedback with 5-star rating
   - [ ] Submit outcome feedback with comments
   - [ ] Verify feedback appears in analytics
   - [ ] Test feedback retrieval for specific scenarios

3. **Peer Comparison**
   - [ ] Navigate to Peer Comparison page
   - [ ] Verify percentile rankings display
   - [ ] Check quality scores calculate correctly
   - [ ] Confirm distribution charts render
   - [ ] Test with multiple physician accounts

**Error Monitoring:**
- [ ] Check application logs for errors
- [ ] Monitor database connection pool
- [ ] Verify LLM API calls succeed
- [ ] Confirm no JavaScript console errors

### Phase 4: Gradual Rollout (Estimated: 1-2 weeks)

**Week 1: Pilot Group (10-20 physicians)**

1. **Select Pilot Physicians**
   - Choose tech-savvy early adopters
   - Include physicians from different specialties
   - Ensure mix of experience levels

2. **Enable Feature Access**
   ```sql
   -- Grant pilot access (if using feature flags)
   UPDATE users 
   SET feature_flags = JSON_SET(feature_flags, '$.delphi_simulator', true)
   WHERE id IN (1, 2, 3, ...);
   ```

3. **Provide Training**
   - Schedule 30-minute onboarding session
   - Share user guide and video walkthrough
   - Set up feedback channel (Slack, email)

4. **Monitor Usage**
   - Track scenario generation count
   - Monitor feedback submission rate
   - Review error logs daily
   - Collect qualitative feedback

**Week 2: Full Rollout (All physicians)**

1. **Analyze Pilot Results**
   - Review usage metrics and feedback
   - Identify and fix any issues
   - Update documentation based on feedback

2. **Enable for All Users**
   ```sql
   -- Enable for all physicians
   UPDATE users 
   SET feature_flags = JSON_SET(feature_flags, '$.delphi_simulator', true)
   WHERE role = 'physician';
   ```

3. **Announce Launch**
   - Send email announcement to all physicians
   - Post in-app notification
   - Share success stories from pilot group

4. **Ongoing Monitoring**
   - Track daily active users
   - Monitor system performance
   - Review feedback trends
   - Address issues promptly

---

## Post-Deployment Validation

### Functional Validation

**Delphi Simulator:**
- [ ] Verify scenario generation success rate >95%
- [ ] Confirm virtual patient response time <3 seconds
- [ ] Test outcome prediction accuracy against known cases
- [ ] Validate scenario comparison rankings are logical

**Feedback Mechanism:**
- [ ] Confirm feedback submission success rate 100%
- [ ] Verify feedback retrieval performance <500ms
- [ ] Test analytics calculations with sample data
- [ ] Validate star ratings persist correctly

**Peer Comparison:**
- [ ] Verify percentile calculations are accurate
- [ ] Confirm anonymization protects physician identity
- [ ] Test distribution charts with various data sizes
- [ ] Validate quality scores match expected formulas

### Performance Validation

**Response Times:**
| Endpoint | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| Scenario Generation | <8s | <12s | >15s |
| Virtual Patient Message | <2s | <4s | >6s |
| Outcome Prediction | <5s | <8s | >12s |
| Feedback Submission | <500ms | <1s | >2s |
| Peer Comparison Load | <1s | <2s | >4s |

**Database Performance:**
- [ ] Query execution time <100ms for 95th percentile
- [ ] Connection pool utilization <80%
- [ ] No slow query warnings in logs
- [ ] Index usage confirmed on all major queries

**LLM API Performance:**
- [ ] API success rate >98%
- [ ] Average response time <5 seconds
- [ ] Rate limit not exceeded
- [ ] Cost per scenario <$0.10

### Security Validation

**Access Control:**
- [ ] Physicians can only view their own scenarios
- [ ] Feedback is properly attributed to submitting physician
- [ ] Peer comparison data is anonymized
- [ ] Admin users have appropriate elevated access

**Data Protection:**
- [ ] Patient data in scenarios is properly de-identified
- [ ] Feedback comments don't contain PHI
- [ ] Database encryption at rest is enabled
- [ ] API endpoints use HTTPS only

**Audit Logging:**
- [ ] Scenario creation events are logged
- [ ] Feedback submissions are tracked
- [ ] Peer comparison access is recorded
- [ ] Failed authentication attempts are logged

### User Acceptance

**Physician Feedback:**
- [ ] Collect satisfaction ratings (target >4.0/5.0)
- [ ] Review qualitative feedback for improvements
- [ ] Identify most-used features
- [ ] Document feature requests for future iterations

**Usage Metrics:**
- [ ] Track daily active users (target >50% of physicians)
- [ ] Monitor scenario generation rate (target >10 per day)
- [ ] Measure feedback submission rate (target >30% of scenarios)
- [ ] Analyze peer comparison page views (target >20% weekly)

---

## Monitoring & Alerting

### Application Metrics

**Key Performance Indicators:**

| Metric | Target | Warning Threshold | Critical Threshold |
|--------|--------|-------------------|-------------------|
| Scenario Generation Success Rate | >95% | <90% | <85% |
| Virtual Patient Response Time | <3s | >5s | >8s |
| Feedback Submission Success Rate | 100% | <98% | <95% |
| Peer Comparison Load Time | <1s | >2s | >4s |
| Database Query Time (p95) | <100ms | >200ms | >500ms |
| LLM API Error Rate | <2% | >5% | >10% |

**Alert Configuration:**

1. **Critical Alerts** (Immediate response required)
   - Database connection failures
   - LLM API complete outage
   - Application server crashes
   - Security breach attempts

2. **Warning Alerts** (Review within 1 hour)
   - Performance degradation beyond thresholds
   - Elevated error rates
   - Unusual usage patterns
   - Database query slow-downs

3. **Informational Alerts** (Daily review)
   - Usage statistics summary
   - Feedback trends
   - Cost tracking reports
   - Feature adoption rates

### Error Tracking

**Error Categories:**

1. **User-Facing Errors**
   - Scenario generation failures
   - Virtual patient unresponsive
   - Feedback submission errors
   - Peer comparison calculation errors

2. **System Errors**
   - Database connection timeouts
   - LLM API rate limiting
   - Memory leaks
   - Unhandled exceptions

3. **Data Errors**
   - Invalid scenario data
   - Missing foreign key references
   - Feedback validation failures
   - Calculation anomalies

**Error Response Procedures:**

- **Severity 1 (Critical)**: Immediate investigation, rollback if necessary
- **Severity 2 (High)**: Fix within 4 hours, deploy hotfix
- **Severity 3 (Medium)**: Fix within 24 hours, include in next release
- **Severity 4 (Low)**: Document for future sprint, no immediate action

### Cost Monitoring

**LLM API Costs:**
- Track daily spending on scenario generation
- Monitor cost per physician per month
- Set budget alerts at $500, $1000, $2000 thresholds
- Review cost optimization opportunities monthly

**Infrastructure Costs:**
- Database storage growth rate
- Server compute utilization
- Network bandwidth usage
- Backup storage costs

---

## Rollback Procedures

### Immediate Rollback (Critical Issues)

**Triggers for Immediate Rollback:**
- Data corruption or loss
- Security vulnerability exploitation
- System-wide outages
- >50% error rate on core functionality

**Rollback Steps:**

1. **Disable New Features**
   ```sql
   -- Disable Delphi Simulator for all users
   UPDATE users 
   SET feature_flags = JSON_SET(feature_flags, '$.delphi_simulator', false);
   ```

2. **Revert Application Code**
   ```bash
   cd /home/ubuntu/physician-portal
   git reset --hard [previous-stable-commit]
   pnpm install
   pnpm build
   pm2 restart physician-portal
   ```

3. **Restore Database** (if schema changes caused issues)
   ```bash
   # Stop application
   pm2 stop physician-portal
   
   # Restore from backup
   mysql -u [username] -p physician_portal < backup_pre_deployment_*.sql
   
   # Restart application
   pm2 start physician-portal
   ```

4. **Verify System Stability**
   - Test core functionality
   - Monitor error rates
   - Check user access
   - Confirm data integrity

**Communication:**
- Notify all physicians of rollback via email
- Post in-app notification explaining situation
- Provide timeline for resolution
- Set up status page for updates

### Partial Rollback (Feature-Specific Issues)

**If only one feature is problematic:**

1. **Disable Specific Feature**
   - Hide UI elements via feature flag
   - Disable tRPC procedures
   - Maintain database schema for future re-enable

2. **Monitor Other Features**
   - Ensure other features remain functional
   - Track usage of working features
   - Collect feedback on remaining functionality

3. **Fix and Redeploy**
   - Identify root cause
   - Implement fix
   - Test thoroughly
   - Redeploy only affected feature

---

## Success Criteria

### Technical Success Metrics

**Performance:**
- [ ] 95th percentile response time <5 seconds for all endpoints
- [ ] Zero critical errors in first 48 hours
- [ ] Database query performance within targets
- [ ] LLM API success rate >98%

**Reliability:**
- [ ] System uptime >99.5% in first month
- [ ] Zero data loss incidents
- [ ] Successful backup and restore tests
- [ ] No security incidents

**Scalability:**
- [ ] System handles 100+ concurrent users
- [ ] Database supports 10,000+ scenarios
- [ ] LLM API rate limits not exceeded
- [ ] Server resources <70% utilization

### Business Success Metrics

**Adoption:**
- [ ] >50% of physicians use Delphi Simulator within 2 weeks
- [ ] >30% feedback submission rate on scenarios
- [ ] >20% of physicians view peer comparison weekly
- [ ] Average 5+ scenarios per active physician per week

**Satisfaction:**
- [ ] Physician satisfaction rating >4.0/5.0
- [ ] <5% feature disable requests
- [ ] Positive qualitative feedback
- [ ] Feature requests indicate engagement

**Clinical Impact:**
- [ ] Physicians report improved decision confidence
- [ ] Reduction in treatment plan revisions
- [ ] Increased evidence-based practice adoption
- [ ] Positive patient outcome trends

---

## Post-Deployment Support

### Support Channels

**Tier 1: Self-Service**
- User guide and FAQ documentation
- Video tutorials and walkthroughs
- In-app help tooltips
- Example scenarios and use cases

**Tier 2: Direct Support**
- Email support: support@physician-portal.com
- Response time: <4 hours during business hours
- Slack channel for urgent issues
- Monthly office hours for Q&A

**Tier 3: Engineering Escalation**
- Critical bug reports
- Security vulnerability reports
- Performance degradation issues
- Data integrity concerns

### Maintenance Schedule

**Daily:**
- Monitor error logs and alerts
- Review usage metrics
- Check LLM API costs
- Respond to support tickets

**Weekly:**
- Analyze feedback trends
- Review peer comparison data
- Optimize slow queries
- Update documentation

**Monthly:**
- Generate usage reports
- Conduct security reviews
- Plan feature enhancements
- Review cost optimization

**Quarterly:**
- Major feature updates
- Performance tuning
- Security audits
- User satisfaction surveys

---

## Risk Assessment & Mitigation

### High-Risk Areas

**1. LLM API Dependency**

**Risk:** External LLM service outage or rate limiting prevents scenario generation

**Mitigation:**
- Implement exponential backoff and retry logic
- Cache common scenario patterns
- Provide fallback to manual scenario creation
- Set up secondary LLM provider for redundancy

**2. Database Performance**

**Risk:** Large scenario datasets cause query slowdowns

**Mitigation:**
- Implement database indexing on all foreign keys
- Archive old scenarios after 6 months
- Use read replicas for analytics queries
- Monitor query performance continuously

**3. User Adoption**

**Risk:** Physicians don't use new features due to complexity or time constraints

**Mitigation:**
- Simplify onboarding with guided tours
- Integrate into existing workflows
- Provide clear value proposition
- Collect and act on user feedback

**4. Data Quality**

**Risk:** Poor feedback quality reduces system improvement effectiveness

**Mitigation:**
- Require minimum comment length for low ratings
- Implement feedback validation rules
- Provide feedback examples and templates
- Gamify feedback submission with recognition

### Medium-Risk Areas

**1. Cost Overruns**

**Risk:** LLM API costs exceed budget

**Mitigation:**
- Set hard spending limits
- Implement usage quotas per physician
- Optimize prompts for efficiency
- Monitor costs daily

**2. Security Vulnerabilities**

**Risk:** Feedback comments contain PHI or sensitive data

**Mitigation:**
- Implement PHI detection and filtering
- Provide clear guidelines on feedback content
- Regular security audits
- Encrypt all data at rest and in transit

**3. Performance Degradation**

**Risk:** System slows down under peak load

**Mitigation:**
- Load testing before deployment
- Auto-scaling infrastructure
- Caching frequently accessed data
- Rate limiting per user

---

## Conclusion

This deployment plan provides a comprehensive roadmap for successfully launching the Delphi Simulator, Feedback Mechanism, and Peer Comparison features to production. The phased approach with pilot testing, gradual rollout, and continuous monitoring ensures minimal disruption while maximizing feature adoption and clinical impact.

**Key Success Factors:**
- Thorough pre-deployment testing and validation
- Clear communication with physician users
- Robust monitoring and alerting infrastructure
- Rapid response to issues and feedback
- Continuous iteration based on usage data

**Next Steps:**
1. Review and approve deployment plan with stakeholders
2. Schedule maintenance window for database migration
3. Identify pilot physician group
4. Prepare training materials and documentation
5. Execute Phase 1 deployment during next maintenance window

---

## Appendix A: Database Schema Changes

### New Tables

**simulation_scenarios**
```sql
CREATE TABLE simulation_scenarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  physician_id INT NOT NULL,
  patient_id INT NOT NULL,
  scenario_name VARCHAR(255) NOT NULL,
  diagnosis_code VARCHAR(50),
  treatment_code VARCHAR(50),
  treatment_description TEXT,
  patient_age INT,
  patient_gender VARCHAR(20),
  time_horizon INT,
  simulation_goal TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES clinical_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (physician_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

**scenario_interactions**
```sql
CREATE TABLE scenario_interactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  scenario_id INT NOT NULL,
  role VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  day_in_simulation INT,
  interaction_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id) REFERENCES simulation_scenarios(id) ON DELETE CASCADE
);
```

**scenario_outcomes**
```sql
CREATE TABLE scenario_outcomes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  scenario_id INT NOT NULL,
  outcome_type VARCHAR(100),
  probability VARCHAR(20),
  severity VARCHAR(50),
  expected_day INT,
  evidence_source TEXT,
  confidence_score VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id) REFERENCES simulation_scenarios(id) ON DELETE CASCADE
);
```

**scenario_comparisons**
```sql
CREATE TABLE scenario_comparisons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  physician_id INT NOT NULL,
  comparison_data JSON,
  ranking_rationale TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES clinical_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (physician_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**interaction_feedback**
```sql
CREATE TABLE interaction_feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  interaction_id INT NOT NULL,
  scenario_id INT NOT NULL,
  physician_id INT NOT NULL,
  realism_score INT NOT NULL CHECK (realism_score BETWEEN 1 AND 5),
  clinical_accuracy INT NOT NULL CHECK (clinical_accuracy BETWEEN 1 AND 5),
  conversational_quality INT NOT NULL CHECK (conversational_quality BETWEEN 1 AND 5),
  comments TEXT,
  issues_reported JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interaction_id) REFERENCES scenario_interactions(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (physician_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**outcome_feedback**
```sql
CREATE TABLE outcome_feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  outcome_id INT NOT NULL,
  scenario_id INT NOT NULL,
  physician_id INT NOT NULL,
  accuracy_score INT NOT NULL CHECK (accuracy_score BETWEEN 1 AND 5),
  evidence_quality INT NOT NULL CHECK (evidence_quality BETWEEN 1 AND 5),
  clinical_relevance INT NOT NULL CHECK (clinical_relevance BETWEEN 1 AND 5),
  actual_outcome_occurred VARCHAR(20),
  actual_probability VARCHAR(20),
  actual_severity VARCHAR(50),
  comments TEXT,
  suggested_improvements TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (outcome_id) REFERENCES scenario_outcomes(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (physician_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Appendix B: API Endpoints

### Delphi Simulator Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `delphiSimulator.generateScenarios` | POST | Generate treatment scenarios from diagnosis | Yes |
| `delphiSimulator.getScenarios` | GET | Retrieve scenarios for session | Yes |
| `delphiSimulator.simulatePatientResponse` | POST | Get virtual patient response | Yes |
| `delphiSimulator.getConversation` | GET | Retrieve scenario conversation history | Yes |
| `delphiSimulator.predictOutcomes` | POST | Generate outcome predictions | Yes |
| `delphiSimulator.getOutcomes` | GET | Retrieve scenario outcomes | Yes |
| `delphiSimulator.compareScenarios` | POST | Compare multiple scenarios | Yes |
| `delphiSimulator.selectScenario` | POST | Mark scenario as selected | Yes |
| `delphiSimulator.getComparisons` | GET | Retrieve scenario comparisons | Yes |

### Feedback Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `delphiSimulator.submitInteractionFeedback` | POST | Submit virtual patient feedback | Yes |
| `delphiSimulator.submitOutcomeFeedback` | POST | Submit outcome prediction feedback | Yes |
| `delphiSimulator.getInteractionFeedback` | GET | Retrieve interaction feedback | Yes |
| `delphiSimulator.getOutcomeFeedback` | GET | Retrieve outcome feedback | Yes |
| `delphiSimulator.getFeedbackAnalytics` | GET | Get aggregate feedback metrics | Yes |

### Peer Comparison Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `delphiSimulator.getPeerComparison` | GET | Get peer comparison analytics | Yes |
| `delphiSimulator.getFeedbackDistribution` | GET | Get feedback distribution data | Yes |

---

## Appendix C: Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:password@host:port/physician_portal

# Authentication
JWT_SECRET=your-jwt-secret-key
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# LLM API
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im

# Application
VITE_APP_ID=physician-portal
VITE_APP_TITLE=AI-Driven Physician Portal
VITE_APP_LOGO=/logo.png

# Owner Information
OWNER_OPEN_ID=owner-open-id
OWNER_NAME=Portal Administrator
```

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-26 | Manus AI | Initial deployment plan created |
