import assert from 'assert';
import { MLClientService } from '../services/mlClient.service.js';
import { StorageService } from '../services/storage.service.js';

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

  console.log('\n====================================================');
  console.log(`ML INTEGRATION TEST RESULTS: ${passed} Passed, 0 Failed`);
  console.log('====================================================\n');
}

runMLIntegrationTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
