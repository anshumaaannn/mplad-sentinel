import assert from 'assert';
import { Project } from '../types/project.js';
import { FeatureEngineeringService } from '../services/featureEngineering.service.js';
import { PeerBenchmarkingService } from '../services/peerBenchmarking.service.js';
import { MLClientService } from '../services/mlClient.service.js';

function runFeaturePipelineUnitTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ML FEATURE PIPELINE UNIT TESTS (TS CONTRACT)');
  console.log('====================================================\n');

  let passed = 0;

  // Test 1: FeatureEngineeringService computes project_age_days, delay_days, actual_execution_days
  console.log('Test Suite 1: FeatureEngineeringService Timeline & Delay Metrics');
  const sampleProject: Project = {
    project_id: 'TEST-PROJ-001',
    work_name: 'Construction of Sub Health Centre',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    constituency: 'Varanasi',
    mp_name: 'Honorable MP',
    sector: 'Health & Family Welfare',
    work_type: 'Primary Health Centre Ward Modernization',
    sanction_date: '2024-01-01',
    start_date: '2024-02-01',
    expected_completion_date: '2024-06-01',
    completion_date: '2024-10-01',
    status: 'Completed',
    sanctioned_amount: 2500000,
    estimated_cost: 2500000,
    actual_expenditure: 2800000,
    physical_progress_percentage: 100,
    implementing_agency: 'UP Jal Nigam',
    latitude: 25.3176,
    longitude: 82.9739,
    beneficiary_count: 3500,
    unit: 'Units',
    quantity: 1
  };

  const feat = FeatureEngineeringService.extractFeatures(sampleProject);
  assert.strictEqual(typeof feat.delay_days, 'number');
  assert.strictEqual(typeof feat.actual_execution_days, 'number');
  assert.strictEqual(typeof feat.project_age_days, 'number');
  // start 2024-02-01 to completion 2024-10-01 is 243 days
  assert.strictEqual(feat.actual_execution_days, 243);
  // expected completion 2024-06-01 to completion 2024-10-01 is 122 days
  assert.strictEqual(feat.delay_days, 122);
  // sanction 2024-01-01 to completion 2024-10-01 is 274 days
  assert.strictEqual(feat.project_age_days, 274);
  console.log(`  ✅ PASS: Calculated execution duration (${feat.actual_execution_days}d), delay (${feat.delay_days}d), project age (${feat.project_age_days}d)`);
  passed++;

  // Test 2: PeerBenchmarkingService calculates hierarchical deviations, ratios and progress deviations
  console.log('\nTest Suite 2: PeerBenchmarkingService Hierarchical Benchmarks');
  const peerA: Project = {
    ...sampleProject,
    project_id: 'PEER-001',
    actual_expenditure: 2000000,
    physical_progress_percentage: 90
  };
  const peerB: Project = {
    ...sampleProject,
    project_id: 'PEER-002',
    actual_expenditure: 2200000,
    physical_progress_percentage: 80
  };
  const peerC: Project = {
    ...sampleProject,
    project_id: 'PEER-003',
    actual_expenditure: 2400000,
    physical_progress_percentage: 85
  };

  const allProjects = [sampleProject, peerA, peerB, peerC];
  const featuresMap = FeatureEngineeringService.extractAllFeatures(allProjects);
  const benchmark = PeerBenchmarkingService.getBenchmarkForProject(sampleProject, feat, allProjects, featuresMap);

  // Self-excluded peers: peerA, peerB, peerC (costs: 2.0M, 2.2M, 2.4M -> median 2.2M)
  assert.strictEqual(benchmark.peer_count, 3);
  assert.strictEqual(benchmark.peer_cost_median, 2200000);
  assert.ok(benchmark.cost_deviation_pct !== undefined && benchmark.cost_deviation_pct > 0);
  assert.ok(benchmark.peer_progress_median !== undefined);
  assert.ok(benchmark.peer_progress_deviation !== undefined);
  assert.ok(benchmark.peer_cost_ratio !== undefined && benchmark.peer_cost_ratio > 1.0);
  assert.ok(benchmark.peer_duration_ratio !== undefined);
  console.log(`  ✅ PASS: Peer benchmarks calculated: Cost dev ${benchmark.cost_deviation_pct}%, Dur dev ${benchmark.duration_deviation_pct}%, Prog dev ${benchmark.peer_progress_deviation}%, Cost ratio ${benchmark.peer_cost_ratio}`);
  passed++;

  // Test 3: Explicit 16-feature transform retains all 6 critical quantities without defaults
  console.log('\nTest Suite 3: MLClientService.transformToMLFeatures Explicit 16-Feature Contract');
  const mlFeatures = MLClientService.transformToMLFeatures(sampleProject, feat, benchmark);

  // 16 feature keys validation
  const expectedKeys = [
    'sanctioned_amount',
    'estimated_cost',
    'actual_expenditure',
    'expenditure_ratio',
    'cost_overrun_ratio',
    'physical_progress_percentage',
    'expenditure_progress_gap',
    'project_age_days',
    'delay_days',
    'execution_duration_days',
    'peer_cost_deviation',
    'peer_duration_deviation',
    'beneficiary_count',
    'peer_cost_ratio',
    'peer_duration_ratio',
    'peer_progress_deviation'
  ];

  assert.strictEqual(Object.keys(mlFeatures).length, 16);
  for (const k of expectedKeys) {
    assert.ok(k in mlFeatures, `Key ${k} must exist in ML feature vector`);
    assert.strictEqual(typeof (mlFeatures as any)[k], 'number', `${k} must be a number`);
  }

  // The 6 named quantities verification:
  // 1. delay
  assert.strictEqual(mlFeatures.delay_days, feat.delay_days);
  assert.notStrictEqual(mlFeatures.delay_days, 0); // Must not be fallback default 0
  // 2. peer cost deviation
  assert.strictEqual(mlFeatures.peer_cost_deviation, benchmark.cost_deviation_pct);
  // 3. peer duration deviation
  assert.strictEqual(mlFeatures.peer_duration_deviation, benchmark.duration_deviation_pct);
  // 4. peer progress deviation
  assert.strictEqual(mlFeatures.peer_progress_deviation, benchmark.peer_progress_deviation);
  // 5. project age
  assert.strictEqual(mlFeatures.project_age_days, feat.project_age_days);
  assert.notStrictEqual(mlFeatures.project_age_days, 180); // Must not be fallback default 180
  // 6. execution duration
  assert.strictEqual(mlFeatures.execution_duration_days, feat.actual_execution_days);
  assert.notStrictEqual(mlFeatures.execution_duration_days, 180); // Must not be fallback default 180

  console.log('  ✅ PASS: Verified all 6 calculated quantities match engineered & peer values without fallback defaults:');
  console.log(`    - delay_days: ${mlFeatures.delay_days} (expected: ${feat.delay_days})`);
  console.log(`    - peer_cost_deviation: ${mlFeatures.peer_cost_deviation}% (expected: ${benchmark.cost_deviation_pct}%)`);
  console.log(`    - peer_duration_deviation: ${mlFeatures.peer_duration_deviation}% (expected: ${benchmark.duration_deviation_pct}%)`);
  console.log(`    - peer_progress_deviation: ${mlFeatures.peer_progress_deviation}% (expected: ${benchmark.peer_progress_deviation}%)`);
  console.log(`    - project_age_days: ${mlFeatures.project_age_days} (expected: ${feat.project_age_days})`);
  console.log(`    - execution_duration_days: ${mlFeatures.execution_duration_days} (expected: ${feat.actual_execution_days})`);
  passed++;

  console.log('\n====================================================');
  console.log(`FEATURE PIPELINE UNIT TESTS: ${passed} Passed, 0 Failed`);
  console.log('====================================================\n');
}

runFeaturePipelineUnitTests();
