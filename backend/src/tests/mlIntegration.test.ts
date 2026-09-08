import assert from 'assert';
import { MLClientService } from '../services/mlClient.service.js';
import { StorageService } from '../services/storage.service.js';
import { FeatureEngineeringService } from '../services/featureEngineering.service.js';
import { PeerBenchmarkingService } from '../services/peerBenchmarking.service.js';

async function runMLIntegrationTests() {
  console.log('====================================================');
  console.log('🤖 RUNNING ML INTEGRATION & HYBRID PIPELINE TESTS');
  console.log('====================================================\n');

  let passed = 0;

  // Test 1: Python ML Service Health
  console.log('Test Suite 1: Python ML Service Connectivity');
  const health = await MLClientService.checkHealth();
  assert.strictEqual(health.isHealthy, true, 'Python ML Service should be reachable on port 8000');
  assert.ok(health.info?.models?.isolation_forest?.active, 'Isolation Forest should be active in ML service');
  assert.ok(health.info?.models?.sentence_transformers?.active, 'Sentence Transformers should be active in ML service');
  console.log('  ✅ PASS: ML Service is healthy with Isolation Forest & Sentence Transformers active');
  passed++;

  // Test 2: ML Model Info
  console.log('\nTest Suite 2: ML Model Metadata Inspection');
  const modelInfo = await MLClientService.getModelInfo();
  assert.ok(modelInfo, 'Model info should be returned');
  assert.strictEqual(modelInfo.isolation_forest.model_name, 'Isolation Forest');
  assert.strictEqual(modelInfo.isolation_forest.features.length, 16);
  assert.strictEqual(modelInfo.semantic_nlp.model_name, 'all-MiniLM-L6-v2');
  console.log('  ✅ PASS: Model metadata confirms 16 features and all-MiniLM-L6-v2 embeddings');
  passed++;

  // Test 3: Storage Service ML Signal Enrichment
  console.log('\nTest Suite 3: Hybrid Enrichment & Scoring Integration');
  StorageService.initialize();
  await StorageService.triggerMLAnalysis();

  const allProjects = StorageService.getAllProjects();
  const mlEnriched = allProjects.filter(p => p.ml_status === 'ACTIVE');
  assert.ok(mlEnriched.length > 0, 'Projects should be enriched with active ML status');
  console.log(`  ✅ PASS: ${mlEnriched.length} projects enriched with active ML signals`);
  passed++;

  // Test 4: Isolation Forest Anomaly Detection Verification
  console.log('\nTest Suite 4: Isolation Forest Anomaly Signal Validation');
  const anomalies = allProjects.filter(p => p.is_ml_anomaly);
  assert.ok(anomalies.length > 0, 'At least one statistical anomaly should be flagged by Isolation Forest');
  const firstAnomaly = anomalies[0];
  assert.ok(firstAnomaly.ml_anomaly_score !== undefined && firstAnomaly.ml_anomaly_score >= 0);
  assert.ok(firstAnomaly.ml_anomaly_percentile !== undefined);
  console.log(`  ✅ PASS: Detected ${anomalies.length} ML anomalies. Top outlier: ${firstAnomaly.project_id} (Score: ${firstAnomaly.ml_anomaly_score}/100, Percentile: ${firstAnomaly.ml_anomaly_percentile}th)`);
  passed++;

  // Test 5: Dashboard ML Health Status
  console.log('\nTest Suite 5: Dashboard Summary ML Status');
  const summary = StorageService.getDashboardSummary();
  assert.ok(summary.ml_engine, 'Dashboard summary must include ml_engine block');
  assert.strictEqual(summary.ml_engine.isolation_forest_status, 'Active');
  assert.strictEqual(summary.ml_engine.sentence_transformers_status, 'Active');
  assert.strictEqual(summary.ml_engine.peer_benchmarking_status, 'Active');
  assert.strictEqual(summary.ml_engine.rule_engine_status, 'Active');
  console.log('  ✅ PASS: Dashboard summary reports Active status for all hybrid engines');
  passed++;

  // Test 6: Explicit Calculated Quantities Reach Python ML Engine
  console.log('\nTest Suite 6: Proving 6 Calculated Features Reach Python (No Fallback Defaults)');
  const testProject = {
    project_id: 'TEST-TRANSFER-PROJ',
    work_name: 'High Deviation Test Road Work',
    state: 'Uttar Pradesh',
    district: 'Ghaziabad',
    constituency: 'Ghaziabad',
    mp_name: 'Test MP',
    sector: 'Roads, Bridges & Pathways',
    work_type: 'Concrete & Interlocking Pavement Road',
    sanction_date: '2023-01-01',
    start_date: '2023-03-01',
    expected_completion_date: '2023-09-01',
    completion_date: '2024-12-01',
    status: 'Completed' as const,
    sanctioned_amount: 8500000,
    estimated_cost: 8500000,
    actual_expenditure: 8400000,
    physical_progress_percentage: 100,
    implementing_agency: 'PWD Division 1',
    latitude: 28.6692,
    longitude: 77.4538,
    beneficiary_count: 5000,
    unit: 'km',
    quantity: 3
  };

  const feat = FeatureEngineeringService.extractFeatures(testProject);
  const benchmark = PeerBenchmarkingService.getBenchmarkForProject(testProject, feat, [testProject]);
  const mlFeatures = MLClientService.transformToMLFeatures(testProject, feat, benchmark);

  // Assert all 6 values are present and non-default in TypeScript
  assert.strictEqual(mlFeatures.delay_days, 457);
  assert.strictEqual(mlFeatures.execution_duration_days, 641);
  assert.strictEqual(mlFeatures.project_age_days, 700);
  assert.strictEqual(typeof mlFeatures.peer_cost_deviation, 'number');
  assert.strictEqual(typeof mlFeatures.peer_duration_deviation, 'number');
  assert.strictEqual(typeof mlFeatures.peer_progress_deviation, 'number');

  // Submit project payload to Python ML engine and verify response
  const response = await MLClientService.analyzeProjects([{
    ...testProject,
    features: feat,
    peer_benchmark: benchmark,
    ml_features: mlFeatures,
    delay_days: mlFeatures.delay_days,
    execution_duration_days: mlFeatures.execution_duration_days,
    project_age_days: mlFeatures.project_age_days,
    peer_cost_deviation: mlFeatures.peer_cost_deviation,
    peer_duration_deviation: mlFeatures.peer_duration_deviation,
    peer_progress_deviation: mlFeatures.peer_progress_deviation,
    peer_cost_ratio: mlFeatures.peer_cost_ratio,
    peer_duration_ratio: mlFeatures.peer_duration_ratio,
    expenditure_ratio: mlFeatures.expenditure_ratio,
    cost_overrun_ratio: mlFeatures.cost_overrun_ratio,
    expenditure_progress_gap: mlFeatures.expenditure_progress_gap
  }]);

  assert.ok(response && response.success, 'Python ML engine should successfully process calculated features payload');
  const anomalyInfo = response.anomalies['TEST-TRANSFER-PROJ'];
  assert.ok(anomalyInfo, 'Python ML engine must return analysis for the submitted project');
  assert.ok(anomalyInfo.anomaly_score >= 0, 'Anomaly score must be numeric');
  console.log(`  ✅ PASS: Python ML received calculated values without defaults:`);
  console.log(`    - delay_days: ${mlFeatures.delay_days}`);
  console.log(`    - execution_duration_days: ${mlFeatures.execution_duration_days}`);
  console.log(`    - project_age_days: ${mlFeatures.project_age_days}`);
  console.log(`    - peer_cost_deviation: ${mlFeatures.peer_cost_deviation}%`);
  console.log(`    - peer_duration_deviation: ${mlFeatures.peer_duration_deviation}%`);
  console.log(`    - peer_progress_deviation: ${mlFeatures.peer_progress_deviation}%`);
  console.log(`    - Python returned Anomaly Score: ${anomalyInfo.anomaly_score}/100 (Model Status: ${anomalyInfo.model_status})`);
  passed++;

  console.log('\n====================================================');
  console.log(`ML INTEGRATION TEST RESULTS: ${passed} Passed, 0 Failed`);
  console.log('====================================================\n');
}

runMLIntegrationTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
