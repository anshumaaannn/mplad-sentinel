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
  console.log('🧪 RUNNING MPLAD SENTINEL RISK INTELLIGENCE TESTS');
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

  assert(!!demo1 && !!demo2 && !!demo3 && !!demo4 && !!demo5 && !!demo6, 'Benchmark demo anomaly records (DEMO-001 to DEMO-006) present');

  // 2. Feature engineering
  console.log('\nTest Suite 2: Feature Engineering Layer');
  const featuresMap = FeatureEngineeringService.extractAllFeatures(projects);
  assert(featuresMap.size === projects.length, 'All projects have engineered features extracted');

  const feat3 = featuresMap.get('DEMO-003')!;
  assert(feat3.expenditure_progress_gap > 50, 'DEMO-003 exhibits > 50% expenditure-to-progress gap', `Gap: ${feat3.expenditure_progress_gap.toFixed(1)}%`);

  // 3. Peer benchmarking
  console.log('\nTest Suite 3: Peer Benchmarking & Normalization');
  const peerGroups = PeerBenchmarkingService.computePeerGroups(projects, featuresMap);
  assert(peerGroups.size >= 5, 'Multiple sector::work_type peer groups formed', `Groups: ${peerGroups.size}`);

  const roadGroup = peerGroups.get('Infrastructure::Road Construction');
  assert(!!roadGroup && roadGroup.cost_median > 0, 'Road Construction peer group median computed properly', `Median: ₹${roadGroup?.cost_median}`);

  const benchmark1 = PeerBenchmarkingService.getBenchmarkForProject(demo1!, featuresMap.get('DEMO-001')!, peerGroups);
  assert(benchmark1.cost_deviation_pct > 100, 'DEMO-001 flagged with massive cost deviation above peer median', `Deviation: +${benchmark1.cost_deviation_pct}%`);

  // 4. NLP Semantic Similarity & Geospatial Distance
  console.log('\nTest Suite 4: NLP Semantic Matching & Geographic Distance');
  const distBetweenDemo4and5 = GeoSpatialService.calculateHaversineDistance(
    demo4!.latitude, demo4!.longitude,
    demo5!.latitude, demo5!.longitude
  );
  assert(distBetweenDemo4and5 < 1.0, 'DEMO-004 and DEMO-005 are within 1 km distance', `Distance: ${distBetweenDemo4and5} km`);

  const nlpSim = NlpSimilarityService.calculateCosineSimilarity(demo4!.work_name, demo5!.work_name);
  assert(nlpSim >= 75, 'DEMO-004 and DEMO-005 show high semantic similarity', `NLP Similarity: ${nlpSim}%`);

  const dupMatches = NlpSimilarityService.findDuplicateMatches(demo4!, projects);
  assert(dupMatches.some(m => m.matched_project_id === 'DEMO-005'), 'Duplicate detector identifies DEMO-005 as duplicate candidate for DEMO-004');

  // 5. Multi-Signal Risk Scoring
  console.log('\nTest Suite 5: Multi-Signal Risk Scoring & Explainability');
  const agencies = AgencyAnalyticsService.computeAgencyProfiles(projects, featuresMap);
  
  const score1 = RiskScoringService.evaluateProject(demo1!, featuresMap.get('DEMO-001')!, peerGroups, projects, agencies);
  assert(score1.risk_score >= 50, 'DEMO-001 assigned HIGH/CRITICAL risk score', `Score: ${score1.risk_score}/100`);
  assert(score1.evidences.some(e => e.anomaly_type === 'Financial Anomaly'), 'DEMO-001 has Financial Anomaly evidence');

  const score2 = RiskScoringService.evaluateProject(demo2!, featuresMap.get('DEMO-002')!, peerGroups, projects, agencies);
  assert(score2.evidences.some(e => e.anomaly_type === 'Delay Anomaly'), 'DEMO-002 has Delay Anomaly evidence');

  const score3 = RiskScoringService.evaluateProject(demo3!, featuresMap.get('DEMO-003')!, peerGroups, projects, agencies);
  assert(score3.evidences.some(e => e.anomaly_type === 'Progress Mismatch'), 'DEMO-003 has Progress Mismatch evidence');

  // 6. Safe Non-Accusatory Language Validation
  console.log('\nTest Suite 6: Non-Accusatory Governance Language Audit');
  const allAnalyses = projects.map(p => RiskScoringService.evaluateProject(p, featuresMap.get(p.project_id)!, peerGroups, projects, agencies));
  
  let foundFraudWord = false;
  for (const a of allAnalyses) {
    for (const ev of a.evidences) {
      const text = `${ev.explanation} ${ev.recommended_action} ${ev.metric}`.toLowerCase();
      if (text.includes('fraudulent') || text.includes('scam') || text.includes('corrupt')) {
        foundFraudWord = true;
      }
    }
  }
  assert(!foundFraudWord, 'System strictly adheres to objective non-accusatory terms (no premature fraud allegations)');

  // 7. Storage Service & Summary Invariants
  console.log('\nTest Suite 7: Storage & Dashboard Summary Pipeline');
  StorageService.initialize();
  const summary = StorageService.getDashboardSummary();
  assert(summary.total_projects === projects.length, 'Dashboard summary tracks all loaded projects');
  assert(summary.high_critical_count > 0, 'Dashboard tracks High & Critical risk cohorts', `High/Crit Count: ${summary.high_critical_count}`);
  assert(summary.data_quality.data_integrity_score_pct > 90, 'Data quality integrity score reported');

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
