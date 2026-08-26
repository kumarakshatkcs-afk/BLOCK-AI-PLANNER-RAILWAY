export interface Platform {
  id: string;
  number: number;
  name?: string;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Reserved';
  trainId?: string;
  trainName?: string;
  trainType?: 'Vande Bharat' | 'Rajdhani' | 'Superfast' | 'Freight';
  lineType?: 'Main Line' | 'Loop Line' | 'Through Line';
  lengthMeters?: number;
  signalState?: 'Green' | 'Yellow' | 'Red';
  trackCircuit?: 'Clear' | 'Occupied' | 'Route_Locked';
  arrivalETA?: string;
  dwellRemainingSeconds?: number;
}

export interface Division {
  id: string;
  name: string;
  color: string;
  zone?: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  divisionId: string;
  platforms: Platform[];
  trackAngle?: number; // Angle in degrees for platform alignment
  yardLength?: number;
  
  // GI Mapping / Geographic Information System (GIS) Data
  lat?: number;
  lng?: number;
  elevationMeters?: number;
  state?: string;
  district?: string;
  chainageKm?: number;
  zone?: string;
  divisionName?: string;
  gaugeType?: string;
  interlockingType?: string;
  speedClassification?: string;
  electrification?: string;
}

export interface TrackSegment {
  id: string;
  sourceId: string;
  targetId: string;
  name: string;
  status: 'Operational' | 'Maintenance' | 'Degraded';
  maintenanceRequired: boolean;
  maintenanceDurationMinutes: number;
  baseCapacity: number;
  currentLoad: number;
  maintenanceRisk: number; // 0-100 for predictive maintenance
  weatherRisk?: string;
  speedLimit?: number;
  electrification?: string;
  
  // GI Mapping / Engineering Data
  distanceKm?: number;
  gradient?: string;
  signallingType?: string;
  trackStructure?: string;
  lineCount?: number;
}

export interface Train {
  id: string; // Train Number, e.g. "20825"
  trainNumber: string; // "20825"
  trainName: string; // "Bilaspur - Nagpur Vande Bharat Express"
  category: 'Vande Bharat' | 'Rajdhani' | 'Duronto' | 'Superfast' | 'Express' | 'Freight';
  type: 'Vande Bharat' | 'Rajdhani' | 'Superfast' | 'Freight'; // for UI compatibility
  status: 'RUNNING' | 'DELAYED' | 'ON_TIME' | 'CANCELLED' | 'DIVERTED' | 'TERMINATED';
  lastStation: string; // "Durg Jn"
  lastStationCode: string; // "DURG"
  nextStation: string; // "Gondia Jn"
  nextStationCode: string; // "G"
  currentLocationDesc?: string;
  latitude?: number;
  longitude?: number;
  speed: number;
  direction: 'UP' | 'DN';
  scheduledArrival: string; // "14:25"
  scheduledDeparture: string; // "14:30"
  expectedArrival: string; // "14:33"
  expectedDeparture: string; // "14:38"
  delayMinutes: number;
  source: string; // "AUTHORIZED RAILWAY DATA / CRIS NTES FEED"
  destination?: string;
  lastUpdated: string; // "13:35:42"
  isLive: boolean;
  isEstimated: boolean;
  positionLabel: string; // "POSITION: ESTIMATED FROM LATEST LIVE UPDATE" or "POSITION: GPS / NTES SYNC"
  dataFreshnessSeconds: number;
  authenticityStatus: 'LIVE' | 'NEAR REAL-TIME' | 'LAST KNOWN' | 'ESTIMATED' | 'DEMO MODE';
  trackAssignment: string; // "MAIN LINE" | "LOOP LINE 1" | "PLATFORM 2"
  trackAssignmentSource: 'AI PROPOSED' | 'OPERATIONAL FEED' | 'AI NETWORK INFERENCE';

  // Spatial Routing & Platform State
  route: string[]; // Array of Station IDs
  currentSegmentId: string | null;
  currentStationId: string | null;
  currentPlatformId: string | null;
  platformNumber?: number;
  platformPhase?: 'approaching' | 'berthing' | 'dwelling' | 'departing';
  progress: number; // 0 to 100 percentage on current segment
  scheduledDepartureMin: number; // Minutes from 00:00 for simulation math
  scheduledArrivalMin: number;
  actualDepartureMin: number;
  predictedDelay: number;
  aiAgentState: 'Routing' | 'Idle' | 'Delayed' | 'Optimized';
  delayPropagation?: number;
  coaches?: number;
  locoType?: string;
  appliedPlanOption?: 'AI_REROUTE' | 'LOOP_DIVERSION' | 'PRECEDENCE_OVERTAKE' | 'CAUTION_TSR_30' | 'MANUAL_OVERRIDE';
  statusMessage?: string;
  assignedActionIcon?: string;
  targetPlatformResolved?: number;
}

export interface LiveStationData {
  stationCode: string;
  stationName: string;
  division: string;
  zone: string;
  lastUpdated: string;
  dataFreshnessSeconds: number;
  dataSource: string;
  connectionStatus: 'ONLINE' | 'FALLBACK';
  authenticityStatus: 'LIVE' | 'NEAR REAL-TIME' | 'LAST KNOWN';
  arriving: Train[];
  departing: Train[];
  passing: Train[];
}

export interface AIConstraintData {
  name: string;
  weight: number;
  satisfaction: number;
}

export interface ScenarioComparison {
  name: string;
  delay: number;
  availability: number;
  score: number;
  isAiBest?: boolean;
}

export interface ResolutionStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface PlanOption {
  id: 'approve_ai' | 'loop_divert' | 'precedence' | 'tsr_30' | 'manual';
  title: string;
  label: string;
  badge: string;
  description: string;
  trainEffect: string;
  delaySavings: number;
  speedLimit: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommended?: boolean;
}

export interface IssueDetails {
  id: string;
  title: string;
  type: 'TRACK_DEGRADATION' | 'HEADWAY_CONFLICT' | 'POINT_FAILURE' | 'OHE_DEFECT' | 'PLATFORM_CONGESTION';
  location: string;
  segmentId?: string;
  segmentName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  description: string;
  rootCause: string;
  affectedTrainIds: string[];
  projectedDelayMinutes: number;
  cascadeImpact: string;
  resolutionSteps: ResolutionStep[];
}

export interface OptimizationResult {
  segmentId?: string;
  routePath?: string[];
  bestStartTime: number;
  bestEndTime: number;
  confidenceScore: number;
  affectedTrains: Train[];
  systemDelayReduction: number; // minutes saved compared to baseline
  constraints: AIConstraintData[];
  convergenceData: { iteration: number; loss: number }[];
  alternatives: {
    startTime: number;
    endTime: number;
    affectedCount: number;
    score: number;
  }[];
  xaiReasoning: string[]; // Explainable AI text
  multiObjectiveScores: {
    delayMinimization: number;
    assetAvailability: number;
    costEfficiency: number;
    trackUtilization: number;
  };
  scenarios: ScenarioComparison[];
  issue?: IssueDetails;
  options?: PlanOption[];
  resolutionStatus?: 'DETECTED' | 'REVIEW_REQUIRED' | 'APPLYING' | 'RESOLVING' | 'RESOLVED';
  selectedOptionId?: string;
  resolutionProgress?: number;
}

export interface NTESLiveStationEntry {
  trainNumber: string;
  trainName: string;
  trainNameHindi?: string;
  sourceStation: string;
  destinationStation: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  expectedArrival: string;
  expectedDeparture: string;
  delayMinutes: number;
  platform: string;
  status: string;
  haltTimeMinutes: number;
}

export interface NTESSpotYourTrainResult {
  trainNumber: string;
  trainName: string;
  trainNameHindi: string;
  source: string;
  destination: string;
  startDate: string;
  currentStation: string;
  currentStationHindi: string;
  lastReportedStation: string;
  lastReportedStationHindi: string;
  lastReportedTime: string;
  nextStation: string;
  nextStationHindi: string;
  distanceToNextKm: number;
  etaNextStation: string;
  delayMinutes: number;
  statusSummary: string;
  statusSummaryHindi: string;
  speedKmH: number;
  speedState: 'CRUISING' | 'SLOWING_CAUTION' | 'APPROACHING_BERTH' | 'HALTED_STATION' | 'ACCELERATING';
  platform: string;
  officialNTESUrl: string;
  lastSyncedTimestamp: string;
  stationSchedule: {
    sNo: number;
    stationCode: string;
    stationName: string;
    stationNameHindi?: string;
    day: number;
    schedArr: string;
    schedDep: string;
    actArr: string;
    actDep: string;
    delayMins: number;
    platform: string;
    distanceKm: number;
    status: 'Departed' | 'Current' | 'Upcoming';
  }[];
}

export interface NTESPacingConfig {
  mode: 'NTES_REALTIME' | 'CALM_REALISTIC' | 'FAST_SIMULATION';
  playbackSpeed: number; // 0.25x, 0.5x, 1x, 2x, 5x
  stepIntervalMs: number;
  slowOnCautionEnabled: boolean;
  slowOnApproachEnabled: boolean;
  ntesGatewayStatus: 'ONLINE' | 'CONNECTED';
}

export interface WhereIsMyTrainLiveStop {
  stationCode: string;
  stationName: string;
  stationNameHindi: string;
  distanceKm: number;
  scheduledArrival: string;
  scheduledDeparture: string;
  expectedArrival: string;
  expectedDeparture: string;
  delayMinutes: number;
  platform: string;
  status: 'Departed' | 'Current' | 'Upcoming';
  haltMinutes: number;
}

export interface WhereIsMyTrainData {
  trainNumber: string;
  trainName: string;
  trainNameHindi: string;
  category: 'Vande Bharat' | 'Rajdhani' | 'Duronto' | 'Superfast' | 'Express' | 'Freight';
  currentSpeed: number;
  maxSpeed: number;
  speedState?: 'CRUISING' | 'SLOWING_CAUTION' | 'APPROACHING_BERTH' | 'HALTED_STATION' | 'ACCELERATING';
  speedStateReason?: string;
  speedStateReasonHindi?: string;
  status: 'RUNNING' | 'DELAYED' | 'ON_TIME';
  liveLocationDesc: string;
  liveLocationDescHindi: string;
  nextStation: string;
  nextStationHindi: string;
  nextStationCode: string;
  lastStation: string;
  lastStationHindi: string;
  lastStationCode: string;
  distanceToNextStationKm: number;
  etaNextStation: string;
  platformNumber: number;
  delayMinutes: number;
  delayCause: string;
  delayCauseHindi: string;
  aiSolutionTitle: string;
  aiSolutionTitleHindi: string;
  aiSolutionDetails: string;
  aiSolutionDetailsHindi: string;
  voiceAnnouncementHindi: string;
  voiceAnnouncementEnglish: string;
  stops: WhereIsMyTrainLiveStop[];
  isLiveGPS: boolean;
  gpsAccuracyMeters: number;
  lastUpdated: string;
  ntesSourceUrl?: string;
  ntesGatewaySynced?: boolean;
}

export interface DelayedTrainAnalysis {
  trainNumber: string;
  trainName: string;
  trainNameHindi?: string;
  category: 'Vande Bharat' | 'Rajdhani' | 'Duronto' | 'Superfast' | 'Express' | 'Freight';
  type: string;
  delayMinutes: number;
  location: string;
  locationHindi?: string;
  lastStation: string;
  nextStation: string;
  cause: string;
  causeHindi: string;
  solutionTitle: string;
  solutionTitleHindi: string;
  solutionDetails: string;
  solutionDetailsHindi: string;
  delaySavings: number;
  restoredSpeed: number;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  voiceScriptHindi?: string;
  voiceScriptEnglish?: string;
}

export interface DelayIdentificationReport {
  totalDelayedTrains: number;
  totalDelayMinutes: number;
  delayedTrains: DelayedTrainAnalysis[];
  degradedSegmentsCount: number;
  primaryBottleneck: string;
  primaryBottleneckHindi?: string;
  voiceSummaryText: string;
  voiceSummaryHindi: string;
  voiceDetailedScript: string;
  voiceDetailedScriptHindi: string;
  resolutionSummary: string;
  resolutionSummaryHindi?: string;
  isExecuted?: boolean;
  timestamp: string;
}

export interface LiveFeedMeta {
  dataSource: string;
  lastUpdated: string;
  dataAgeSeconds: number;
  connectionStatus: 'ONLINE' | 'FALLBACK';
  authenticityStatus: 'LIVE' | 'NEAR REAL-TIME' | 'LAST KNOWN' | 'ESTIMATED' | 'DEMO MODE';
}

export interface DashboardData {
  divisions: Division[];
  stations: Station[];
  segments: TrackSegment[];
  trains: Train[];
  simulationTime: number;
  networkHealth: number; // 0-100
  activeAlerts: number;
  weather: 'Clear' | 'Heavy Rain' | 'Dense Fog' | 'Heat Wave';
  assetKPIs: {
    network: number;
    tracks: number;
    trains: number;
    maintenance: number;
    infrastructure: number;
  };
  liveFeedMeta: LiveFeedMeta;
}

// ==========================================
// 3-DEPARTMENT AI BLOCK PLANNING SUITE TYPES
// ==========================================

export type DepartmentType = 'Engineering' | 'S&T' | 'Traction';

export interface MaintenanceScoreBreakdown {
  severity: number;          // 0 - 100
  assetCriticality: number;  // 0 - 100
  urgency: number;           // 0 - 100
  safetyRisk: number;        // 0 - 100
  trafficImpact: number;     // 0 - 100
}

export interface MaintenanceRequest {
  id: string; // e.g. "M001"
  department: DepartmentType;
  asset: string; // e.g. "Track-24", "Signal-08", "OHE-17"
  problem: string; // e.g. "Rail defect", "Signal fault", "Inspection"
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  durationHours: number; // e.g. 2, 1, 1.5
  durationStr: string; // "2h", "1h", "1.5h"
  priorityScore: number; // e.g. 89, 86, 72
  isOverdue: boolean;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed';
  corridorId: string; // e.g. "NDLS-GZB", "GZB-ALJN", "BSP-CPH"
  corridorName: string;
  scores: MaintenanceScoreBreakdown;
  recommendationBadge: string; // "🔴 CRITICAL - Schedule in next suitable block"
  explainWhy: string;
  detailedXAI?: string;
  assignedCrew?: string;
  safetyEquipmentRequired?: string[];
}

export interface GanttBlockItem {
  id: string;
  department: 'Engineering' | 'S&T' | 'Traction' | 'Passenger' | 'Goods';
  label: string; // "Track Repair", "Signal Maintenance", "OHE Maintenance", "Train 12051"
  assetOrTrain: string;
  startHour: number; // e.g. 10.0 (10:00)
  endHour: number;   // e.g. 12.0 (12:00)
  timeRangeStr: string; // "10:00 - 12:00"
  type: 'Block_Task' | 'Train_Running' | 'Train_Halt' | 'Conflict_Warning';
  isCombinedRecommendation?: boolean;
  color: string;
  description: string;
  speedOrCrew?: string;
}

export interface ConflictSlotOption {
  id: string;
  window: string; // "08:00–10:00", "10:00–12:00", "12:30–14:30", "15:00–17:00"
  startHour: number;
  endHour: number;
  hasConflict: boolean;
  conflictReason?: string;
  conflictingTrain?: string;
  isAiRecommended: boolean;
  score: number;
  blockUtilization: number;
  estimatedDowntimeReduction: number;
  safetyScore: number;
  tag: string;
  explanation: string;
}

export interface CorridorAssetSummary {
  id: string;
  sectionCode: string; // "A-B"
  fromCode: string; // "NDLS"
  fromName: string; // "New Delhi"
  toCode: string; // "GZB"
  toName: string; // "Ghaziabad"
  status: 'Available' | 'Maintenance' | 'Blocked' | 'Critical';
  statusColor: 'green' | 'yellow' | 'red' | 'amber';
  totalAssets: number;
  criticalAssets: number;
  pendingMaintenance: number;
  nextTrainTime: string;
  nextTrainNumber: string;
  nextTrainName: string;
  recommendedBlockWindow: string;
  engineeringAssets: number;
  stAssets: number;
  tractionAssets: number;
  activeTSR?: string; // e.g. "30 km/h caution at km 142/6"
  keyDefectNotice?: string;
}

export interface WhatIfSimulationState {
  currentPlanWindow: string;
  eventTriggered: string;
  status: 'idle' | 'simulating' | 'calculated';
  evaluatedOptions: ConflictSlotOption[];
  recommendedOption: ConflictSlotOption | null;
  rationale: string;
}

export interface BlockApprovalState {
  status: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
  sanctionMemoNumber: string;
  selectedWindow: string;
  departments: DepartmentType[];
  tasksCombined: number;
  trainConflicts: number;
  safetyConstraintsPassed: boolean;
  blockUtilizationPercent: number;
  estimatedDowntimeReductionPercent: number;
  approvedBy?: string;
  sanctionTimestamp?: string;
  cautionOrderRequired: string;
  notes?: string;
}



