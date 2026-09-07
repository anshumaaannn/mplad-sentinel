import { Project } from '../types/project.js';
import * as fs from 'fs';
import * as path from 'path';

export function generateSyntheticProjects(): Project[] {
  const projects: Project[] = [];

  // 1. SPECIFIC DEMO ANOMALY 1: Massive Financial Overrun / Peer Cost Outlier
  projects.push({
    project_id: 'DEMO-001',
    work_name: 'Construction of CC Road from Main Market to Panchayat Bhavan, Barabanki',
    state: 'Uttar Pradesh',
    district: 'Barabanki',
    constituency: 'Barabanki (SC)',
    mp_name: 'Tanuj Punia',
    sector: 'Infrastructure',
    work_type: 'Road Construction',
    sanctioned_amount: 8500000,
    estimated_cost: 8500000,
    actual_expenditure: 8250000,
    sanction_date: '2024-03-10',
    start_date: '2024-04-01',
    expected_completion_date: '2024-11-30',
    completion_date: '2024-12-15',
    status: 'Completed',
    physical_progress_percentage: 100,
    implementing_agency: 'Public Works Department (PWD Div-2)',
    latitude: 26.9271,
    longitude: 81.1834,
    beneficiary_count: 3200,
    unit: 'km',
    quantity: 1.1,
    created_at: '2024-03-10T10:00:00Z'
  });

  // 2. SPECIFIC DEMO ANOMALY 2: Severe Execution Delay & Stalled Health Facility
  projects.push({
    project_id: 'DEMO-002',
    work_name: 'Construction of 30-bed Primary Health Centre Inpatient Wing at Chargawan',
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    constituency: 'Gorakhpur',
    mp_name: 'Ravi Kishan',
    sector: 'Healthcare',
    work_type: 'Primary Health Centre',
    sanctioned_amount: 6500000,
    estimated_cost: 6500000,
    actual_expenditure: 4200000,
    sanction_date: '2022-04-15',
    start_date: '2022-06-01',
    expected_completion_date: '2023-03-31',
    completion_date: null,
    status: 'Stalled',
    physical_progress_percentage: 42,
    implementing_agency: 'Uttar Pradesh State Construction Corp (UPSIC)',
    latitude: 26.7915,
    longitude: 83.3982,
    beneficiary_count: 15000,
    unit: 'beds',
    quantity: 30,
    created_at: '2022-04-15T11:00:00Z'
  });

  // 3. SPECIFIC DEMO ANOMALY 3: Severe Expenditure vs Physical Progress Gap (96% funds disbursed, 30% progress)
  projects.push({
    project_id: 'DEMO-003',
    work_name: 'Installation of 150 High-Mast Solar Street Light Units across 12 Rural Wards',
    state: 'Bihar',
    district: 'Patna',
    constituency: 'Patna Sahib',
    mp_name: 'Ravi Shankar Prasad',
    sector: 'Energy & Lighting',
    work_type: 'Solar Street Lights',
    sanctioned_amount: 4800000,
    estimated_cost: 4800000,
    actual_expenditure: 4620000,
    sanction_date: '2023-08-20',
    start_date: '2023-10-05',
    expected_completion_date: '2024-04-30',
    completion_date: null,
    status: 'In Progress',
    physical_progress_percentage: 30,
    implementing_agency: 'Bihar Renewable Energy Development Agency (BREDA)',
    latitude: 25.5941,
    longitude: 85.1376,
    beneficiary_count: 8500,
    unit: 'units',
    quantity: 150,
    created_at: '2023-08-20T09:30:00Z'
  });

  // 4. SPECIFIC DEMO ANOMALY 4 & 5: Potential Duplicate / Overlapping Works in Close Proximity
  projects.push({
    project_id: 'DEMO-004',
    work_name: 'Construction of Multipurpose Community Hall at Village Rampur Kalan, Loni Block',
    state: 'Uttar Pradesh',
    district: 'Ghaziabad',
    constituency: 'Ghaziabad',
    mp_name: 'Atul Garg',
    sector: 'Public Amenities',
    work_type: 'Community Hall',
    sanctioned_amount: 3500000,
    estimated_cost: 3500000,
    actual_expenditure: 3450000,
    sanction_date: '2023-06-12',
    start_date: '2023-07-15',
    expected_completion_date: '2024-02-28',
    completion_date: '2024-03-10',
    status: 'Completed',
    physical_progress_percentage: 100,
    implementing_agency: 'Rural Engineering Services (RES Div-1)',
    latitude: 28.6692,
    longitude: 77.4538,
    beneficiary_count: 4500,
    unit: 'sq.m',
    quantity: 350,
    created_at: '2023-06-12T10:15:00Z'
  });

  projects.push({
    project_id: 'DEMO-005',
    work_name: 'Construction of Community Hall and Cultural Center at Gram Rampur Kalan',
    state: 'Uttar Pradesh',
    district: 'Ghaziabad',
    constituency: 'Ghaziabad',
    mp_name: 'Atul Garg',
    sector: 'Public Amenities',
    work_type: 'Community Hall',
    sanctioned_amount: 3400000,
    estimated_cost: 3400000,
    actual_expenditure: 3100000,
    sanction_date: '2023-09-25',
    start_date: '2023-11-01',
    expected_completion_date: '2024-06-30',
    completion_date: null,
    status: 'In Progress',
    physical_progress_percentage: 75,
    implementing_agency: 'Zila Parishad Ghaziabad',
    latitude: 28.6715,
    longitude: 77.4565,
    beneficiary_count: 4200,
    unit: 'sq.m',
    quantity: 340,
    created_at: '2023-09-25T14:30:00Z'
  });

  // 5. SPECIFIC DEMO ANOMALY 6: Agency Systemic Pattern Project
  projects.push({
    project_id: 'DEMO-006',
    work_name: 'Modernization of Integrated Drainage System, Ward 14 to 18, Danapur',
    state: 'Bihar',
    district: 'Patna',
    constituency: 'Patliputra',
    mp_name: 'Misa Bharti',
    sector: 'Water & Sanitation',
    work_type: 'Drainage Network',
    sanctioned_amount: 5200000,
    estimated_cost: 5200000,
    actual_expenditure: 6100000, // Cost Overrun
    sanction_date: '2022-11-10',
    start_date: '2023-01-15',
    expected_completion_date: '2023-09-30',
    completion_date: null,
    status: 'Delayed',
    physical_progress_percentage: 62,
    implementing_agency: 'District Rural Infrastructure Corp (DRIC)',
    latitude: 25.6295,
    longitude: 85.0441,
    beneficiary_count: 11000,
    unit: 'km',
    quantity: 2.8,
    created_at: '2022-11-10T11:20:00Z'
  });

  // Regional templates for remaining 244 realistic projects
  const statesAndDistricts = [
    { state: 'Uttar Pradesh', districts: ['Lucknow', 'Varanasi', 'Gorakhpur', 'Barabanki', 'Ghaziabad', 'Agra', 'Kanpur Nagar', 'Prayagraj', 'Meerut', 'Aligarh'], mp: 'Rajveer Singh', constituency: 'Regional Central' },
    { state: 'Maharashtra', districts: ['Pune', 'Nagpur', 'Nashik', 'Thane', 'Kolhapur', 'Solapur', 'Aurangabad', 'Amravati'], mp: 'Sanjay Deshmukh', constituency: 'Maharashtra West' },
    { state: 'Bihar', districts: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Nalanda'], mp: 'Sanjay Jha', constituency: 'Bihar North' },
    { state: 'Tamil Nadu', districts: ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Vellore'], mp: 'K. Kanimozhi', constituency: 'Tamil Nadu South' },
    { state: 'Rajasthan', districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar'], mp: 'Gajendra S. Shekhawat', constituency: 'Rajasthan Central' },
    { state: 'Karnataka', districts: ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Dharwad', 'Mangaluru', 'Tumakuru'], mp: 'Tejasvi Surya', constituency: 'Karnataka South' },
    { state: 'Madhya Pradesh', districts: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'], mp: 'Alok Sharma', constituency: 'MP Central' },
    { state: 'Gujarat', districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar'], mp: 'H. S. Patel', constituency: 'Gujarat West' },
    { state: 'Odisha', districts: ['Khordha', 'Cuttack', 'Ganjam', 'Sambalpur', 'Puri', 'Balasore'], mp: 'Aparajita Sarangi', constituency: 'Bhubaneswar' },
    { state: 'West Bengal', districts: ['Kolkata', 'North 24 Parganas', 'Howrah', 'Hooghly', 'Darjeeling', 'Murshidabad'], mp: 'S. Bandyopadhyay', constituency: 'Kolkata North' },
    { state: 'Assam', districts: ['Kamrup Metropolitan', 'Dibrugarh', 'Silchar', 'Nagaon', 'Jorhat'], mp: 'Gaurav Gogoi', constituency: 'Assam East' },
    { state: 'Kerala', districts: ['Thiruvananthapuram', 'Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam'], mp: 'Shashi Tharoor', constituency: 'Thiruvananthapuram' }
  ];

  const workTemplates = [
    {
      sector: 'Infrastructure',
      work_type: 'Road Construction',
      unit: 'km',
      nameTemplate: (loc: string) => `Construction of CC Road and Interlocking Pavement in ${loc}`,
      costRange: [1800000, 3200000],
      qtyRange: [0.8, 1.8],
      durationMonths: [4, 8],
      agencies: ['Public Works Department (PWD)', 'Rural Engineering Services (RES)', 'Zila Parishad Engineering Wing']
    },
    {
      sector: 'Public Amenities',
      work_type: 'Community Hall',
      unit: 'sq.m',
      nameTemplate: (loc: string) => `Construction of Dr. Ambedkar Community Center & Bhavan at ${loc}`,
      costRange: [2200000, 3800000],
      qtyRange: [250, 450],
      durationMonths: [6, 12],
      agencies: ['Rural Development Authority', 'Zila Parishad', 'Municipal Corporation']
    },
    {
      sector: 'Water & Sanitation',
      work_type: 'Drinking Water Borewell',
      unit: 'points',
      nameTemplate: (loc: string) => `Installation of Solar-Powered Deep Tube Well & RO Plant in ${loc}`,
      costRange: [600000, 1400000],
      qtyRange: [2, 6],
      durationMonths: [2, 5],
      agencies: ['Public Health Engineering Dept (PHED)', 'Jal Nigam', 'Panchayati Raj Dept']
    },
    {
      sector: 'Energy & Lighting',
      work_type: 'Solar Street Lights',
      unit: 'units',
      nameTemplate: (loc: string) => `Supply and Erection of 60W LED Solar Street Lights in Gram Panchayat ${loc}`,
      costRange: [1200000, 2400000],
      qtyRange: [40, 100],
      durationMonths: [3, 6],
      agencies: ['State Renewable Energy Dev Agency', 'Zila Panchayat Electrical Wing', 'District Rural Development Agency']
    },
    {
      sector: 'Education',
      work_type: 'School Classroom Block',
      unit: 'classrooms',
      nameTemplate: (loc: string) => `Construction of 4 Additional Smart Classrooms at Govt Secondary School, ${loc}`,
      costRange: [2400000, 4200000],
      qtyRange: [3, 6],
      durationMonths: [6, 11],
      agencies: ['State Educational Infrastructure Dev Corp', 'PWD (Building Division)', 'Samagra Shiksha Abhiyan Cell']
    },
    {
      sector: 'Healthcare',
      work_type: 'Primary Health Centre',
      unit: 'facility',
      nameTemplate: (loc: string) => `Renovation and Medical Equipment Upgrade for PHC Sub-Centre at ${loc}`,
      costRange: [1500000, 2800000],
      qtyRange: [1, 2],
      durationMonths: [4, 9],
      agencies: ['National Health Mission (NHM) Cell', 'State Health System Corp', 'PWD (Health Division)']
    },
    {
      sector: 'Education',
      work_type: 'Public Library',
      unit: 'library',
      nameTemplate: (loc: string) => `Establishment of Youth Digital Library and E-Learning Hub at ${loc}`,
      costRange: [1400000, 2600000],
      qtyRange: [1, 1],
      durationMonths: [4, 8],
      agencies: ['District Library Authority', 'Zila Parishad', 'Education Department']
    },
    {
      sector: 'Water & Sanitation',
      work_type: 'Drainage Network',
      unit: 'km',
      nameTemplate: (loc: string) => `Construction of Underground Covered RCC Drain in ${loc}`,
      costRange: [2000000, 4500000],
      qtyRange: [1.2, 3.5],
      durationMonths: [5, 10],
      agencies: ['Urban Local Bodies Directorate', 'Jal Sansthan', 'District Rural Infrastructure Corp (DRIC)']
    },
    {
      sector: 'Rural Development',
      work_type: 'Anganwadi Centre',
      unit: 'centres',
      nameTemplate: (loc: string) => `Construction of Model Anganwadi Child Care Centre in Village ${loc}`,
      costRange: [900000, 1600000],
      qtyRange: [1, 2],
      durationMonths: [3, 7],
      agencies: ['Women & Child Development Dept', 'Panchayat Samiti', 'Rural Works Organization']
    },
    {
      sector: 'Public Amenities',
      work_type: 'Crematorium Shed',
      unit: 'shed',
      nameTemplate: (loc: string) => `Modernization of Moksha Dham / Crematorium Shed with Solar Lights at ${loc}`,
      costRange: [1100000, 2000000],
      qtyRange: [1, 1],
      durationMonths: [3, 6],
      agencies: ['Zila Parishad', 'Municipal Council', 'District Rural Infrastructure Corp (DRIC)']
    },
    {
      sector: 'Sports & Youth Affairs',
      work_type: 'Open Gym & Sports',
      unit: 'facility',
      nameTemplate: (loc: string) => `Installation of Open Gym Equipment and Play Ground Development in ${loc}`,
      costRange: [800000, 1700000],
      qtyRange: [1, 2],
      durationMonths: [2, 5],
      agencies: ['Sports & Youth Welfare Directorate', 'Municipal Board', 'Panchayat Sports Wing']
    }
  ];

  const villageNames = [
    'Rampur', 'Shivpur', 'Kalyanpur', 'Chandpur', 'Govindpur', 'Fatehpur', 'Sultanpur', 'Madhopur', 'Bishanpur', 'Haripur',
    'Mohanpur', 'Laxmipur', 'Ganeshpur', 'Sundarpur', 'Balarampur', 'Daulatpur', 'Narayanpur', 'Kishunpur', 'Mirzapur', 'Sitapur',
    'Chanderi', 'Deoria', 'Bhagwanpur', 'Gokulpur', 'Dharmapur', 'Keshopur', 'Maharajpur', 'Jagatpur', 'Shahpur', 'Bahadurpur'
  ];

  // Coordinates bounding box centers for states
  const stateCoordinates: Record<string, { lat: number; lng: number }> = {
    'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
    'Maharashtra': { lat: 19.7515, lng: 75.7139 },
    'Bihar': { lat: 25.0961, lng: 85.3131 },
    'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
    'Rajasthan': { lat: 27.0238, lng: 74.2179 },
    'Karnataka': { lat: 15.3173, lng: 75.7139 },
    'Madhya Pradesh': { lat: 22.9734, lng: 78.6569 },
    'Gujarat': { lat: 22.2587, lng: 71.1924 },
    'Odisha': { lat: 20.9517, lng: 85.0985 },
    'West Bengal': { lat: 22.9868, lng: 87.8550 },
    'Assam': { lat: 26.2006, lng: 92.9376 },
    'Kerala': { lat: 10.8505, lng: 76.2711 }
  };

  let idCounter = 7;
  // Generate 244 additional projects (total 250)
  for (let i = 0; i < 244; i++) {
    const stateObj = statesAndDistricts[i % statesAndDistricts.length];
    const district = stateObj.districts[i % stateObj.districts.length];
    const template = workTemplates[i % workTemplates.length];
    const village = villageNames[(i * 3 + 7) % villageNames.length];
    const locString = `${village}, Block ${district}`;
    const work_name = template.nameTemplate(locString);
    const agency = template.agencies[i % template.agencies.length];

    const baseCost = Math.round((template.costRange[0] + ((i * 37) % (template.costRange[1] - template.costRange[0]))) / 10000) * 10000;
    const qty = Number((template.qtyRange[0] + ((i * 13) % (template.qtyRange[1] - template.qtyRange[0]))).toFixed(1));
    const durationMonths = template.durationMonths[0] + (i % (template.durationMonths[1] - template.durationMonths[0] + 1));

    // Determine year (2023, 2024, 2025)
    const year = 2023 + (i % 3);
    const month = (i % 12) + 1;
    const day = ((i * 7) % 25) + 1;
    const sanctionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const startDateObj = new Date(sanctionDate);
    startDateObj.setDate(startDateObj.getDate() + 20 + (i % 15));
    const startDate = startDateObj.toISOString().split('T')[0];

    const expDateObj = new Date(startDateObj);
    expDateObj.setMonth(expDateObj.getMonth() + durationMonths);
    const expectedCompletionDate = expDateObj.toISOString().split('T')[0];

    // Status & progress distribution
    let status: Project['status'] = 'Completed';
    let physical_progress_percentage = 100;
    let actual_expenditure = Math.round(baseCost * (0.92 + (i % 8) * 0.015));
    let completion_date: string | null = null;

    // Introduce natural variations and realistic operational statuses
    if (agency === 'District Rural Infrastructure Corp (DRIC)') {
      // DRIC has a systemic pattern: high delay rate and overruns
      if (i % 2 === 0) {
        status = 'Delayed';
        physical_progress_percentage = 55;
        actual_expenditure = Math.round(baseCost * 1.18); // 18% cost overrun
        completion_date = null;
      } else {
        status = 'In Progress';
        physical_progress_percentage = 70;
        actual_expenditure = Math.round(baseCost * 0.95);
        completion_date = null;
      }
    } else if (i % 7 === 0) {
      // In progress project
      status = 'In Progress';
      physical_progress_percentage = 40 + (i % 45);
      actual_expenditure = Math.round(baseCost * (physical_progress_percentage / 100) * (0.95 + (i % 5) * 0.03));
      completion_date = null;
    } else if (i % 19 === 0) {
      // Moderate delay anomaly
      status = 'Delayed';
      physical_progress_percentage = 65;
      actual_expenditure = Math.round(baseCost * 0.85);
      completion_date = null;
    } else if (i % 23 === 0) {
      // Moderate cost variance
      status = 'Completed';
      physical_progress_percentage = 100;
      actual_expenditure = Math.round(baseCost * 1.22); // 22% overrun
      const compDateObj = new Date(expDateObj);
      compDateObj.setDate(compDateObj.getDate() + 45);
      completion_date = compDateObj.toISOString().split('T')[0];
    } else if (i % 31 === 0) {
      // Stalled project
      status = 'Stalled';
      physical_progress_percentage = 25;
      actual_expenditure = Math.round(baseCost * 0.40);
      completion_date = null;
    } else {
      // Normal completed project
      status = 'Completed';
      physical_progress_percentage = 100;
      const compDateObj = new Date(expDateObj);
      compDateObj.setDate(compDateObj.getDate() - 10 + (i % 25));
      completion_date = compDateObj.toISOString().split('T')[0];
    }

    // Coordinates with jitter around state centers
    const baseCoords = stateCoordinates[stateObj.state] || { lat: 23.5, lng: 80.0 };
    const latJitter = ((i * 17) % 100 - 50) * 0.035;
    const lngJitter = ((i * 29) % 100 - 50) * 0.035;
    let latitude = Number((baseCoords.lat + latJitter).toFixed(4));
    let longitude = Number((baseCoords.lng + lngJitter).toFixed(4));

    // Introduce 2 realistic missing-coordinate cases in data quality audit
    if (i === 42 || i === 118) {
      latitude = 0;
      longitude = 0;
    }

    // Introduce 1 completed project with missing completion date in data quality audit
    if (i === 87 && status === 'Completed') {
      completion_date = null;
    }

    const beneficiary_count = Math.round(1500 + (baseCost / 1000) * 1.2 + (i % 10) * 200);
    const projectId = `MPL-${year}-${stateObj.state.substring(0, 2).toUpperCase()}-${String(idCounter).padStart(4, '0')}`;
    idCounter++;

    projects.push({
      project_id: projectId,
      work_name,
      state: stateObj.state,
      district,
      constituency: `${district} Parliamentary Constituency`,
      mp_name: stateObj.mp,
      sector: template.sector,
      work_type: template.work_type,
      sanctioned_amount: baseCost,
      estimated_cost: baseCost,
      actual_expenditure,
      sanction_date: sanctionDate,
      start_date: startDate,
      expected_completion_date: expectedCompletionDate,
      completion_date,
      status,
      physical_progress_percentage,
      implementing_agency: agency,
      latitude,
      longitude,
      beneficiary_count,
      unit: template.unit,
      quantity: qty,
      created_at: `${sanctionDate}T09:00:00Z`
    });
  }

  return projects;
}

export function exportProjectsToCSV(projects: Project[], filepath: string): void {
  const headers = [
    'project_id',
    'work_name',
    'state',
    'district',
    'constituency',
    'mp_name',
    'sector',
    'work_type',
    'sanctioned_amount',
    'estimated_cost',
    'actual_expenditure',
    'sanction_date',
    'start_date',
    'expected_completion_date',
    'completion_date',
    'status',
    'physical_progress_percentage',
    'implementing_agency',
    'latitude',
    'longitude',
    'beneficiary_count',
    'unit',
    'quantity'
  ];

  const csvRows = [headers.join(',')];

  for (const p of projects) {
    const row = [
      `"${p.project_id}"`,
      `"${p.work_name.replace(/"/g, '""')}"`,
      `"${p.state}"`,
      `"${p.district}"`,
      `"${p.constituency}"`,
      `"${p.mp_name}"`,
      `"${p.sector}"`,
      `"${p.work_type}"`,
      p.sanctioned_amount,
      p.estimated_cost,
      p.actual_expenditure,
      `"${p.sanction_date}"`,
      `"${p.start_date}"`,
      `"${p.expected_completion_date}"`,
      p.completion_date ? `"${p.completion_date}"` : '""',
      `"${p.status}"`,
      p.physical_progress_percentage,
      `"${p.implementing_agency.replace(/"/g, '""')}"`,
      p.latitude,
      p.longitude,
      p.beneficiary_count,
      `"${p.unit}"`,
      p.quantity
    ];
    csvRows.push(row.join(','));
  }

  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, csvRows.join('\n'), 'utf-8');
}
