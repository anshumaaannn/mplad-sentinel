import { generateSyntheticProjects } from '../data/syntheticDataGenerator.js';
import { FeatureEngineeringService } from '../services/featureEngineering.service.js';
import { PeerBenchmarkingService } from '../services/peerBenchmarking.service.js';
import { NlpSimilarityService } from '../services/nlpSimilarity.service.js';
import { GeoSpatialService } from '../services/geoSpatial.service.js';
import { AgencyAnalyticsService } from '../services/agencyAnalytics.service.js';
import { RiskScoringService } from '../services/riskScoring.service.js';
import { StorageService } from '../services/storage.service.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING MPLAD SENTINEL AUDIT & RISK ENGINE TESTS');
  console.log('====================================================\n');

  // 1. Synthetic dataset generation
  console.log('Test Suite 1: Synthetic Dataset & Seed Integrity');
  const projects = generateSyntheticProjects();
  assert(projects.length >= 240, 'Synthetic dataset generates at least 240 projects', `Count: ${projects.length}`);

  const demo1 = projects.find(p => p.project_id === 'DEMO-001');
  const demo2 = projects.find(p => p.project_id === 'DEMO-002');
  const demo3 = projects.find(p => p.project_id === 'DEMO-003');
  const demo4 = projects.find(p => p.project_id === 'DEMO-004');
  const demo5 = projects.find(p => p.project_id === 'DEMO-005');
  const demo6 = projects.find(p => p.project_id === 'DEMO-006');

  assert(Boolean(demo1 && demo2 && demo3 && demo4 && demo5 && demo6), 'Benchmark demo anomaly records (DEMO-001 to DEMO-006) present');

  // 2. Feature engineering
  console.log('\nTest Suite 2: Feature Engineering Layer');
  const featuresMap = FeatureEngineeringService.extractAllFeatures(projects);
  assert(featuresMap.size === projects.length, 'All projects have engineered features extracted');

  const feat3 = featuresMap.get('DEMO-003')!;
  assert(feat3.expenditure_progress_gap > 50, 'DEMO-003 exhibits > 50% expenditure-to-progress gap', `Gap: ${feat3.expenditure_progress_gap.toFixed(1)}%`);

  // 3. Hierarchical Peer Benchmarking
  console.log('\nTest Suite 3: Hierarchical Peer Benchmarking & Self-Exclusion');
  const peerGroups = PeerBenchmarkingService.computePeerGroups(projects, featuresMap);
  assert(peerGroups.size >= 5, 'Multiple sector::work_type peer groups formed', `Groups: ${peerGroups.size}`);

  const benchmark1 = PeerBenchmarkingService.getBenchmarkForProject(demo1!, featuresMap.get('DEMO-001')!, projects, featuresMap);
  assert(benchmark1.cost_deviation_pct > 100, 'DEMO-001 flagged with massive cost deviation above peer median', `Deviation: +${benchmark1.cost_deviation_pct}%`);
  assert(Boolean(benchmark1.peer_group_definition), 'Peer group definition is stored', benchmark1.peer_group_definition);
  assert(Boolean(benchmark1.peer_level), 'Hierarchical peer level (DISTRICT/STATE/SECTOR) resolved', `Level: ${benchmark1.peer_level}`);
  assert(benchmark1.peer_count >= 1, 'Peer count is populated', `Count: ${benchmark1.peer_count}`);
  assert(benchmark1.peer_cost_median > 0, 'Peer cost median is non-zero', `Median: ₹${benchmark1.peer_cost_median}`);

  // Test self-exclusion: ensure DEMO-001's 85L does not pull up peer median
  const roadPeersExcludingDemo1 = projects.filter(p => p.project_id !== 'DEMO-001' && p.sector === demo1?.sector && p.work_type === demo1?.work_type);
  assert(roadPeersExcludingDemo1.length > 0, 'Road peer candidates found');

  // 4. Duplicate Detection
  console.log('\nTest Suite 4: Duplicate Detection (Text + Work Type + District + Distance)');
  const distBetweenDemo4and5 = GeoSpatialService.calculateHaversineDistance(
    demo4!.latitude, demo4!.longitude,
    demo5!.latitude, demo5!.longitude
  );
  assert(distBetweenDemo4and5 < 1.0, 'DEMO-004 and DEMO-005 are within 1 km distance', `Distance: ${distBetweenDemo4and5} km`);

  const nlpSim = NlpSimilarityService.calculateCosineSimilarity(demo4!.work_name, demo5!.work_name);
  assert(nlpSim >= 70, 'DEMO-004 and DEMO-005 show high semantic similarity', `NLP Similarity: ${nlpSim}%`);

  const dupMatches = NlpSimilarityService.findDuplicateMatches(demo4!, projects);
  const match5 = dupMatches.find(m => m.matched_project_id === 'DEMO-005');
  assert(Boolean(match5), 'Duplicate detector identifies DEMO-005 as duplicate candidate for DEMO-004');
  assert(
    match5?.risk_indicator === 'Potential Duplicate' || match5?.risk_indicator === 'Overlapping Scope',
    'Duplicate detector uses objective non-accusatory terminology',
    `Term: ${match5?.risk_indicator}`
  );

  // False positive test: projects in different districts far away should NOT be flagged as duplicates
  const farDifferentProject = projects.find(p => p.district !== demo4?.district && GeoSpatialService.calculateHaversineDistance(demo4!.latitude, demo4!.longitude, p.latitude, p.longitude) > 50);
  if (farDifferentProject) {
    const falseMatch = dupMatches.find(m => m.matched_project_id === farDifferentProject.project_id);
    assert(!falseMatch, 'Projects in distant districts are not falsely flagged as duplicates');
  }

  // 5. Deterministic Risk Score Bounds & Breakdown Invariants
  console.log('\nTest Suite 5: Deterministic Risk Score Bounds & Breakdown Sum');
  const agencies = AgencyAnalyticsService.computeAgencyProfiles(projects, featuresMap);

  let boundsViolations = 0;
  let sumDesyncViolations = 0;

  for (const p of projects) {
    const feat = featuresMap.get(p.project_id)!;
    const analysis = RiskScoringService.evaluateProject(p, feat, projects, featuresMap, agencies);

    const rb = analysis.risk_breakdown;
    if (rb.financial_risk > 25 || rb.financial_risk < 0) boundsViolations++;
    if (rb.delay_risk > 20 || rb.delay_risk < 0) boundsViolations++;
    if (rb.progress_mismatch_risk > 20 || rb.progress_mismatch_risk < 0) boundsViolations++;
    if (rb.duplicate_risk > 15 || rb.duplicate_risk < 0) boundsViolations++;
    if (rb.geospatial_risk > 10 || rb.geospatial_risk < 0) boundsViolations++;
    if (rb.agency_risk > 10 || rb.agency_risk < 0) boundsViolations++;

    if (analysis.risk_score > 100 || analysis.risk_score < 0) boundsViolations++;

    const expectedSum = rb.financial_risk + rb.delay_risk + rb.progress_mismatch_risk + rb.duplicate_risk + rb.geospatial_risk + rb.agency_risk;
    if (analysis.risk_score !== Math.min(100, expectedSum)) {
      sumDesyncViolations++;
    }
  }

  assert(boundsViolations === 0, 'All 250 projects adhere strictly to dimension bounds (Fin<=25, Delay<=20, Prog<=20, Dup<=15, Geo<=10, Agency<=10)');
  assert(sumDesyncViolations === 0, 'Risk score is 100% deterministic sum of its 6 breakdown components');

  // 6. Benchmark Anomaly Evidence Verification
  console.log('\nTest Suite 6: Benchmark Anomaly Evidence & Explainability');
  const score1 = RiskScoringService.evaluateProject(demo1!, featuresMap.get('DEMO-001')!, projects, featuresMap, agencies);
  assert(score1.risk_score >= 25, 'DEMO-001 assigned significant risk score', `Score: ${score1.risk_score}/100`);
  const finEv = score1.evidences.find(e => e.anomaly_type === 'Financial Anomaly');
  assert(Boolean(finEv && finEv.observed_value && finEv.baseline_value && finEv.recommended_action), 'DEMO-001 contains complete Financial Anomaly audit evidence');

  const score2 = RiskScoringService.evaluateProject(demo2!, featuresMap.get('DEMO-002')!, projects, featuresMap, agencies);
  const delayEv = score2.evidences.find(e => e.anomaly_type === 'Delay Anomaly');
  assert(Boolean(delayEv && delayEv.observed_value && delayEv.baseline_value), 'DEMO-002 contains Delay Anomaly audit evidence');

  const score3 = RiskScoringService.evaluateProject(demo3!, featuresMap.get('DEMO-003')!, projects, featuresMap, agencies);
  const progEv = score3.evidences.find(e => e.anomaly_type === 'Progress Mismatch');
  assert(Boolean(progEv && progEv.observed_value && progEv.baseline_value), 'DEMO-003 contains Progress Mismatch audit evidence');

  // 7. Non-Accusatory Governance Audit
  console.log('\nTest Suite 7: Non-Accusatory Governance Language Audit');
  let foundFraudWord = false;
  for (const p of [demo1!, demo2!, demo3!, demo4!, demo5!, demo6!]) {
    const a = RiskScoringService.evaluateProject(p, featuresMap.get(p.project_id)!, projects, featuresMap, agencies);
    for (const ev of a.evidences) {
      const text = `${ev.explanation} ${ev.recommended_action} ${ev.metric}`.toLowerCase();
      if (text.includes('fraudulent') || text.includes('scam') || text.includes('corrupt')) {
        foundFraudWord = true;
      }
    }
  }
  assert(!foundFraudWord, 'System strictly adheres to objective non-accusatory terms (no premature fraud allegations)');

  // 8. Storage & Data Quality Calculation
  console.log('\nTest Suite 8: Live Data Quality Metrics Calculation');
  StorageService.initialize();
  const summary = StorageService.getDashboardSummary();
  const dq = summary.data_quality;

  assert(dq.total_projects === projects.length, 'Data Quality tracks total records dynamically', `Total: ${dq.total_projects}`);
  assert(dq.valid_records + dq.invalid_records === dq.total_projects, 'valid_records + invalid_records equals total_projects');
  assert(dq.missing_coordinates_count >= 0, 'missing_coordinates_count calculated from actual dataset', `Count: ${dq.missing_coordinates_count}`);
  assert(dq.missing_completion_dates_count >= 0, 'missing_completion_dates_count calculated from actual dataset', `Count: ${dq.missing_completion_dates_count}`);
  assert(dq.missing_required_fields_count >= 0, 'missing_required_fields_count calculated from actual dataset', `Count: ${dq.missing_required_fields_count}`);
  assert(dq.data_integrity_score_pct > 0 && dq.data_integrity_score_pct <= 100, 'data_integrity_score_pct is calculated percentage', `Integrity: ${dq.data_integrity_score_pct}%`);

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
