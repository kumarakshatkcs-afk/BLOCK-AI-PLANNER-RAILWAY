import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  Platform, Station, TrackSegment, Train, DashboardData, Division, 
  LiveStationData, DelayedTrainAnalysis, DelayIdentificationReport, 
  WhereIsMyTrainData, WhereIsMyTrainLiveStop, NTESSpotYourTrainResult, 
  NTESLiveStationEntry, NTESPacingConfig, MaintenanceRequest, 
  GanttBlockItem, ConflictSlotOption, CorridorAssetSummary, BlockApprovalState 
} from "./src/types";
import {
  INITIAL_MAINTENANCE_REQUESTS,
  INITIAL_GANTT_ITEMS,
  INITIAL_CONFLICT_SLOTS,
  INITIAL_CORRIDOR_SUMMARIES,
  INITIAL_APPROVAL_STATE
} from "./src/data/blockPlannerData";

let genAIClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn("Could not initialize Google GenAI SDK:", err);
    }
  }
  return genAIClient;
}

// Global NTES simulation pacing configuration (Calm realistic telemetry matching enquiry.indianrail.gov.in)
let ntesPacingConfig: NTESPacingConfig = {
  mode: 'CALM_REALISTIC',
  playbackSpeed: 0.35, // Calm realistic speed pacing to prevent fast jumps
  stepIntervalMs: 800,
  slowOnCautionEnabled: true,
  slowOnApproachEnabled: true,
  ntesGatewayStatus: 'CONNECTED'
};

// Advanced Network Topology (SECR & SER Zones)
const divisions: Division[] = [
  { id: "DIV-BSP", name: "Bilaspur", zone: "SECR", color: "#10b981" }, // Neon Green
  { id: "DIV-NGP", name: "Nagpur", zone: "SECR", color: "#f59e0b" },   // Amber
  { id: "DIV-R", name: "Raipur", zone: "SECR", color: "#06b6d4" },     // Cyan
  { id: "DIV-CKP", name: "Chakradharpur", zone: "SER", color: "#3b82f6" }, // Blue
  { id: "DIV-ADRA", name: "Adra", zone: "SER", color: "#8b5cf6" }      // Purple
];

const generatePlatforms = (stationId: string, count: number): Platform[] => {
  return Array.from({ length: count }, (_, i) => {
    const pfNum = i + 1;
    const isMain = pfNum === 1 || pfNum === 2;
    return {
      id: `${stationId}-PF${pfNum}`,
      number: pfNum,
      name: `Platform ${pfNum}`,
      status: 'Available',
      lineType: isMain ? 'Main Line' : pfNum === count ? 'Through Line' : 'Loop Line',
      lengthMeters: isMain ? 650 : 600,
      signalState: 'Green',
      trackCircuit: 'Clear'
    };
  });
};

const stations: Station[] = [
  // SECR / CR - Nagpur Division (West)
  { 
    id: "S-NGP3", code: "BPQ", name: "Balharshah Jn", x: 90, y: 700, divisionId: "DIV-NGP", trackAngle: -55, yardLength: 120, 
    platforms: generatePlatforms("S-NGP3", 5),
    lat: 19.8517, lng: 79.3567, elevationMeters: 193, state: "Maharashtra", district: "Chandrapur", chainageKm: 891.2,
    zone: "CR / SECR", divisionName: "Nagpur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-NGP2", code: "WR", name: "Wardha Jn", x: 150, y: 590, divisionId: "DIV-NGP", trackAngle: -45, yardLength: 120, 
    platforms: generatePlatforms("S-NGP2", 4),
    lat: 20.7453, lng: 78.6022, elevationMeters: 247, state: "Maharashtra", district: "Wardha", chainageKm: 758.5,
    zone: "CR", divisionName: "Nagpur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-NGP1", code: "NGP", name: "Nagpur Jn", x: 240, y: 500, divisionId: "DIV-NGP", trackAngle: -25, yardLength: 140, 
    platforms: generatePlatforms("S-NGP1", 8),
    lat: 21.1524, lng: 79.0882, elevationMeters: 312, state: "Maharashtra", district: "Nagpur", chainageKm: 837.1,
    zone: "CR / SECR", divisionName: "Nagpur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Route Relay Interlocking (RRI)",
    speedClassification: "Group A (160 km/h ready)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-NGP4", code: "G", name: "Gondia Jn", x: 350, y: 460, divisionId: "DIV-NGP", trackAngle: -15, yardLength: 120, 
    platforms: generatePlatforms("S-NGP4", 5),
    lat: 21.4602, lng: 80.1961, elevationMeters: 311, state: "Maharashtra", district: "Gondia", chainageKm: 967.4,
    zone: "SECR", divisionName: "Nagpur (SECR)", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },

  // SECR - Raipur Division (Center-West)
  { 
    id: "S-R2", code: "DURG", name: "Durg Jn", x: 450, y: 440, divisionId: "DIV-R", trackAngle: -12, yardLength: 130, 
    platforms: generatePlatforms("S-R2", 6),
    lat: 21.1904, lng: 81.2849, elevationMeters: 317, state: "Chhattisgarh", district: "Durg", chainageKm: 1102.3,
    zone: "SECR", divisionName: "Raipur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Route Relay Interlocking (RRI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-R3", code: "BPHB", name: "Bhilai Power House", x: 505, y: 430, divisionId: "DIV-R", trackAngle: -10, yardLength: 100, 
    platforms: generatePlatforms("S-R3", 3),
    lat: 21.2052, lng: 81.3655, elevationMeters: 300, state: "Chhattisgarh", district: "Durg", chainageKm: 1111.9,
    zone: "SECR", divisionName: "Raipur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-R1", code: "R", name: "Raipur Jn", x: 570, y: 415, divisionId: "DIV-R", trackAngle: -12, yardLength: 140, 
    platforms: generatePlatforms("S-R1", 7),
    lat: 21.2514, lng: 81.6296, elevationMeters: 298, state: "Chhattisgarh", district: "Raipur", chainageKm: 1139.1,
    zone: "SECR", divisionName: "Raipur (HQ)", gaugeType: "1676 mm Broad Gauge", interlockingType: "Route Relay Interlocking (RRI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  
  // SECR - Bilaspur Division (Center)
  { 
    id: "S-BSP1", code: "BSP", name: "Bilaspur Jn", x: 690, y: 380, divisionId: "DIV-BSP", trackAngle: -14, yardLength: 150, 
    platforms: generatePlatforms("S-BSP1", 8),
    lat: 22.0797, lng: 82.1409, elevationMeters: 268, state: "Chhattisgarh", district: "Bilaspur", chainageKm: 1250.0,
    zone: "SECR", divisionName: "Bilaspur (Zonal HQ)", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI) + RRI",
    speedClassification: "Group A (160 km/h ready)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-BSP3", code: "CPH", name: "Champa Jn", x: 770, y: 365, divisionId: "DIV-BSP", trackAngle: -10, yardLength: 100, 
    platforms: generatePlatforms("S-BSP3", 3),
    lat: 22.0436, lng: 82.6536, elevationMeters: 261, state: "Chhattisgarh", district: "Janjgir-Champa", chainageKm: 1303.4,
    zone: "SECR", divisionName: "Bilaspur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-BSP2", code: "RIG", name: "Raigarh", x: 850, y: 350, divisionId: "DIV-BSP", trackAngle: -10, yardLength: 110, 
    platforms: generatePlatforms("S-BSP2", 4),
    lat: 21.8974, lng: 83.3950, elevationMeters: 218, state: "Chhattisgarh", district: "Raigarh", chainageKm: 1382.8,
    zone: "SECR", divisionName: "Bilaspur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },

  // SER - CKP Division (Center-East)
  { 
    id: "S-CKP4", code: "JSG", name: "Jharsuguda Jn", x: 940, y: 340, divisionId: "DIV-CKP", trackAngle: -10, yardLength: 120, 
    platforms: generatePlatforms("S-CKP4", 5),
    lat: 21.8550, lng: 84.0084, elevationMeters: 228, state: "Odisha", district: "Jharsuguda", chainageKm: 1454.6,
    zone: "SER", divisionName: "Chakradharpur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Route Relay Interlocking (RRI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-CKP3", code: "ROU", name: "Rourkela Jn", x: 1030, y: 320, divisionId: "DIV-CKP", trackAngle: -14, yardLength: 130, 
    platforms: generatePlatforms("S-CKP3", 5),
    lat: 22.2272, lng: 84.8624, elevationMeters: 218, state: "Odisha", district: "Sundargarh", chainageKm: 1555.8,
    zone: "SER", divisionName: "Chakradharpur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-CKP1", code: "CKP", name: "Chakradharpur", x: 1120, y: 300, divisionId: "DIV-CKP", trackAngle: -15, yardLength: 120, 
    platforms: generatePlatforms("S-CKP1", 4),
    lat: 22.7051, lng: 85.6264, elevationMeters: 234, state: "Jharkhand", district: "West Singhbhum", chainageKm: 1656.9,
    zone: "SER", divisionName: "Chakradharpur (HQ)", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-CKP2", code: "TATA", name: "Tatanagar Jn", x: 1210, y: 280, divisionId: "DIV-CKP", trackAngle: -20, yardLength: 140, 
    platforms: generatePlatforms("S-CKP2", 6),
    lat: 22.7667, lng: 86.2028, elevationMeters: 165, state: "Jharkhand", district: "East Singhbhum", chainageKm: 1718.5,
    zone: "SER", divisionName: "Chakradharpur", gaugeType: "1676 mm Broad Gauge", interlockingType: "Route Relay Interlocking (RRI)",
    speedClassification: "Group A (130 km/h)", electrification: "25 kV AC 50Hz OHE"
  },

  // SER - Adra Division (East)
  { 
    id: "S-ADR3", code: "PRR", name: "Purulia Jn", x: 1280, y: 230, divisionId: "DIV-ADRA", trackAngle: -35, yardLength: 110, 
    platforms: generatePlatforms("S-ADR3", 4),
    lat: 23.3364, lng: 86.3683, elevationMeters: 234, state: "West Bengal", district: "Purulia", chainageKm: 1799.3,
    zone: "SER", divisionName: "Adra", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group B (110 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-ADR1", code: "ADRA", name: "Adra Jn", x: 1360, y: 190, divisionId: "DIV-ADRA", trackAngle: -25, yardLength: 130, 
    platforms: generatePlatforms("S-ADR1", 5),
    lat: 23.4975, lng: 86.6874, elevationMeters: 185, state: "West Bengal", district: "Purulia", chainageKm: 1838.4,
    zone: "SER", divisionName: "Adra (HQ)", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group B (110 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-ADR2", code: "BQA", name: "Bankura Jn", x: 1440, y: 220, divisionId: "DIV-ADRA", trackAngle: 18, yardLength: 100, 
    platforms: generatePlatforms("S-ADR2", 3),
    lat: 23.2323, lng: 87.0715, elevationMeters: 89, state: "West Bengal", district: "Bankura", chainageKm: 1878.6,
    zone: "SER", divisionName: "Adra", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group B (110 km/h)", electrification: "25 kV AC 50Hz OHE"
  },
  { 
    id: "S-ADR4", code: "BKSC", name: "Bokaro Steel City", x: 1280, y: 130, divisionId: "DIV-ADRA", trackAngle: -45, yardLength: 130, 
    platforms: generatePlatforms("S-ADR4", 5),
    lat: 23.6334, lng: 86.1558, elevationMeters: 241, state: "Jharkhand", district: "Bokaro", chainageKm: 1852.1,
    zone: "SER", divisionName: "Adra", gaugeType: "1676 mm Broad Gauge", interlockingType: "Electronic Interlocking (EI)",
    speedClassification: "Group B (110 km/h)", electrification: "25 kV AC 50Hz OHE"
  }
];

const stationCodeMap = new Map<string, Station>();
stations.forEach(s => {
  stationCodeMap.set(s.id, s);
  stationCodeMap.set(s.code, s);
});

// Authentic Indian Railways Master Train Catalog Operating in SECR / SER / CR / ECOR
interface AuthenticTrainDefinition {
  trainNumber: string;
  trainName: string;
  category: 'Vande Bharat' | 'Rajdhani' | 'Duronto' | 'Superfast' | 'Express' | 'Freight';
  type: 'Vande Bharat' | 'Rajdhani' | 'Superfast' | 'Freight';
  route: string[]; // Station ID sequence
  direction: 'UP' | 'DN';
  speed: number;
  coaches: number;
  locoType: string;
  departureBaseMin: number;
  durationMin: number;
  initialDelay: number;
}

const authenticTrainCatalog: AuthenticTrainDefinition[] = [
  // Premium Vande Bharat
  {
    trainNumber: "20825",
    trainName: "Bilaspur - Nagpur Vande Bharat Express",
    category: "Vande Bharat",
    type: "Vande Bharat",
    route: ["S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "DN",
    speed: 130,
    coaches: 16,
    locoType: "Vande Bharat EMU Trainset (160 km/h rated)",
    departureBaseMin: 405, // 06:45
    durationMin: 320,
    initialDelay: 4
  },
  {
    trainNumber: "20826",
    trainName: "Nagpur - Bilaspur Vande Bharat Express",
    category: "Vande Bharat",
    type: "Vande Bharat",
    route: ["S-NGP1", "S-NGP4", "S-R2", "S-R1", "S-BSP1"],
    direction: "UP",
    speed: 130,
    coaches: 16,
    locoType: "Vande Bharat EMU Trainset (160 km/h rated)",
    departureBaseMin: 845, // 14:05
    durationMin: 320,
    initialDelay: 0
  },
  {
    trainNumber: "20898",
    trainName: "Ranchi - Howrah Vande Bharat Express",
    category: "Vande Bharat",
    type: "Vande Bharat",
    route: ["S-ADR4", "S-ADR3", "S-CKP2", "S-ADR1", "S-ADR2"],
    direction: "DN",
    speed: 130,
    coaches: 8,
    locoType: "Vande Bharat 8-Car Trainset",
    departureBaseMin: 330, // 05:30
    durationMin: 270,
    initialDelay: 2
  },

  // Rajdhani & Duronto
  {
    trainNumber: "12441",
    trainName: "Bilaspur - New Delhi Rajdhani Express",
    category: "Rajdhani",
    type: "Rajdhani",
    route: ["S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1", "S-NGP2", "S-NGP3"],
    direction: "UP",
    speed: 120,
    coaches: 22,
    locoType: "WAP-7 Twin (6000 HP)",
    departureBaseMin: 840, // 14:00
    durationMin: 410,
    initialDelay: 6
  },
  {
    trainNumber: "12442",
    trainName: "New Delhi - Bilaspur Rajdhani Express",
    category: "Rajdhani",
    type: "Rajdhani",
    route: ["S-NGP3", "S-NGP2", "S-NGP1", "S-NGP4", "S-R2", "S-R1", "S-BSP1"],
    direction: "DN",
    speed: 120,
    coaches: 22,
    locoType: "WAP-7 Twin (6000 HP)",
    departureBaseMin: 920, // 15:20
    durationMin: 410,
    initialDelay: 0
  },
  {
    trainNumber: "12222",
    trainName: "Howrah - Pune AC Duronto Express",
    category: "Duronto",
    type: "Rajdhani",
    route: ["S-ADR2", "S-ADR1", "S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "UP",
    speed: 125,
    coaches: 20,
    locoType: "WAP-7 High Speed",
    departureBaseMin: 510, // 08:30
    durationMin: 680,
    initialDelay: 12
  },
  {
    trainNumber: "12221",
    trainName: "Pune - Howrah AC Duronto Express",
    category: "Duronto",
    type: "Rajdhani",
    route: ["S-NGP1", "S-NGP4", "S-R2", "S-R1", "S-BSP1", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2", "S-ADR1", "S-ADR2"],
    direction: "DN",
    speed: 125,
    coaches: 20,
    locoType: "WAP-7 High Speed",
    departureBaseMin: 910, // 15:10
    durationMin: 680,
    initialDelay: 5
  },

  // Key Trunk Superfast & Mails (Howrah - Mumbai / Nagpur / Ahmedabad)
  {
    trainNumber: "12810",
    trainName: "Howrah - Mumbai CSMT Mail (via Nagpur)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-ADR2", "S-ADR1", "S-ADR3", "S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP3", "S-BSP1", "S-R1", "S-R3", "S-R2", "S-NGP4", "S-NGP1", "S-NGP2", "S-NGP3"],
    direction: "UP",
    speed: 105,
    coaches: 24,
    locoType: "WAP-7 30201",
    departureBaseMin: 480, // 08:00
    durationMin: 720,
    initialDelay: 18
  },
  {
    trainNumber: "12809",
    trainName: "Mumbai CSMT - Howrah Mail (via Nagpur)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-NGP3", "S-NGP2", "S-NGP1", "S-NGP4", "S-R2", "S-R3", "S-R1", "S-BSP1", "S-BSP3", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2", "S-ADR3", "S-ADR1", "S-ADR2"],
    direction: "DN",
    speed: 105,
    coaches: 24,
    locoType: "WAP-7 30202",
    departureBaseMin: 1260, // 21:00
    durationMin: 720,
    initialDelay: 8
  },
  {
    trainNumber: "12834",
    trainName: "Howrah - Ahmedabad Superfast Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1", "S-NGP2"],
    direction: "UP",
    speed: 100,
    coaches: 23,
    locoType: "WAP-7 30345",
    departureBaseMin: 600, // 10:00
    durationMin: 600,
    initialDelay: 25
  },
  {
    trainNumber: "12833",
    trainName: "Ahmedabad - Howrah Superfast Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-NGP2", "S-NGP1", "S-NGP4", "S-R2", "S-R1", "S-BSP1", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2"],
    direction: "DN",
    speed: 100,
    coaches: 23,
    locoType: "WAP-7 30346",
    departureBaseMin: 180, // 03:00
    durationMin: 600,
    initialDelay: 10
  },
  {
    trainNumber: "12859",
    trainName: "Gitanjali Express (CSMT - Howrah)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-NGP3", "S-NGP2", "S-NGP1", "S-NGP4", "S-R2", "S-R1", "S-BSP1", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2", "S-ADR1"],
    direction: "DN",
    speed: 110,
    coaches: 24,
    locoType: "WAP-7 High Priority",
    departureBaseMin: 360, // 06:00
    durationMin: 620,
    initialDelay: 15
  },
  {
    trainNumber: "12860",
    trainName: "Gitanjali Express (Howrah - CSMT)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-ADR1", "S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1", "S-NGP2", "S-NGP3"],
    direction: "UP",
    speed: 110,
    coaches: 24,
    locoType: "WAP-7 High Priority",
    departureBaseMin: 810, // 13:30
    durationMin: 620,
    initialDelay: 7
  },
  {
    trainNumber: "12823",
    trainName: "Chhattisgarh Sampark Kranti Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-R2", "S-R3", "S-R1", "S-BSP1", "S-BSP3"],
    direction: "UP",
    speed: 105,
    coaches: 22,
    locoType: "WAP-7 SECR",
    departureBaseMin: 720, // 12:00
    durationMin: 220,
    initialDelay: 3
  },
  {
    trainNumber: "12824",
    trainName: "Chhattisgarh Sampark Kranti Express (DN)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-BSP3", "S-BSP1", "S-R1", "S-R3", "S-R2"],
    direction: "DN",
    speed: 105,
    coaches: 22,
    locoType: "WAP-7 SECR",
    departureBaseMin: 1020, // 17:00
    durationMin: 220,
    initialDelay: 0
  },
  {
    trainNumber: "18237",
    trainName: "Chhattisgarh Express (Korba/BSP - Amritsar)",
    category: "Express",
    type: "Superfast",
    route: ["S-BSP3", "S-BSP1", "S-R1", "S-R3", "S-R2", "S-NGP4", "S-NGP1", "S-NGP2"],
    direction: "UP",
    speed: 85,
    coaches: 24,
    locoType: "WAP-4 / WAP-7",
    departureBaseMin: 660, // 11:00
    durationMin: 450,
    initialDelay: 32
  },
  {
    trainNumber: "18238",
    trainName: "Chhattisgarh Express (Amritsar - Bilaspur)",
    category: "Express",
    type: "Superfast",
    route: ["S-NGP2", "S-NGP1", "S-NGP4", "S-R2", "S-R3", "S-R1", "S-BSP1", "S-BSP3"],
    direction: "DN",
    speed: 85,
    coaches: 24,
    locoType: "WAP-4 / WAP-7",
    departureBaseMin: 240, // 04:00
    durationMin: 450,
    initialDelay: 14
  },
  {
    trainNumber: "12151",
    trainName: "Samarsata Superfast Express (LTT - Howrah)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-NGP1", "S-NGP4", "S-R2", "S-R1", "S-BSP1", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2"],
    direction: "DN",
    speed: 105,
    coaches: 22,
    locoType: "WAP-7",
    departureBaseMin: 540, // 09:00
    durationMin: 540,
    initialDelay: 9
  },
  {
    trainNumber: "12152",
    trainName: "Samarsata Superfast Express (Howrah - LTT)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "UP",
    speed: 105,
    coaches: 22,
    locoType: "WAP-7",
    departureBaseMin: 1200, // 20:00
    durationMin: 540,
    initialDelay: 4
  },
  {
    trainNumber: "12069",
    trainName: "Raigarh - Gondia Jan Shatabdi Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-BSP2", "S-BSP3", "S-BSP1", "S-R1", "S-R3", "S-R2", "S-NGP4"],
    direction: "UP",
    speed: 95,
    coaches: 18,
    locoType: "WAP-7 SECR",
    departureBaseMin: 375, // 06:15
    durationMin: 380,
    initialDelay: 2
  },
  {
    trainNumber: "12070",
    trainName: "Gondia - Raigarh Jan Shatabdi Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-NGP4", "S-R2", "S-R3", "S-R1", "S-BSP1", "S-BSP3", "S-BSP2"],
    direction: "DN",
    speed: 95,
    coaches: 18,
    locoType: "WAP-7 SECR",
    departureBaseMin: 870, // 14:30
    durationMin: 380,
    initialDelay: 0
  },
  {
    trainNumber: "22846",
    trainName: "Hatia - Pune Superfast Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "UP",
    speed: 105,
    coaches: 22,
    locoType: "WAP-7",
    departureBaseMin: 1140, // 19:00
    durationMin: 480,
    initialDelay: 11
  },
  {
    trainNumber: "18477",
    trainName: "Kalinga Utkal Express (Puri - Yog Nagari Rishikesh)",
    category: "Express",
    type: "Superfast",
    route: ["S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP3", "S-BSP1"],
    direction: "UP",
    speed: 90,
    coaches: 24,
    locoType: "WAP-7 ECoR",
    departureBaseMin: 780, // 13:00
    durationMin: 360,
    initialDelay: 22
  },
  {
    trainNumber: "20822",
    trainName: "Santragachi - Pune Humsafar Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-ADR1", "S-CKP2", "S-CKP3", "S-BSP1", "S-R1", "S-NGP1"],
    direction: "UP",
    speed: 110,
    coaches: 18,
    locoType: "WAP-7 3-Tier AC",
    departureBaseMin: 1080, // 18:00
    durationMin: 420,
    initialDelay: 1
  },
  {
    trainNumber: "12130",
    trainName: "Azad Hind Express (Howrah - Pune)",
    category: "Superfast",
    type: "Superfast",
    route: ["S-ADR2", "S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "UP",
    speed: 100,
    coaches: 24,
    locoType: "WAP-7 Central Rly",
    departureBaseMin: 1310, // 21:50
    durationMin: 580,
    initialDelay: 16
  },
  {
    trainNumber: "12855",
    trainName: "Bilaspur - NSCB Itwari Intercity SF Express",
    category: "Superfast",
    type: "Superfast",
    route: ["S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "DN",
    speed: 100,
    coaches: 20,
    locoType: "WAP-7 SECR",
    departureBaseMin: 960, // 16:00
    durationMin: 310,
    initialDelay: 5
  },
  {
    trainNumber: "18101",
    trainName: "Tatanagar - Jammu Tawi Express",
    category: "Express",
    type: "Superfast",
    route: ["S-CKP2", "S-CKP1", "S-CKP3", "S-ADR4"],
    direction: "UP",
    speed: 85,
    coaches: 22,
    locoType: "WAP-7 SER",
    departureBaseMin: 880, // 14:40
    durationMin: 290,
    initialDelay: 14
  },
  {
    trainNumber: "13287",
    trainName: "South Bihar Express (Durg - Danapur)",
    category: "Express",
    type: "Superfast",
    route: ["S-R2", "S-R3", "S-R1", "S-BSP1", "S-BSP3", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2", "S-ADR3", "S-ADR1"],
    direction: "DN",
    speed: 85,
    coaches: 24,
    locoType: "WAP-7",
    departureBaseMin: 420, // 07:00
    durationMin: 560,
    initialDelay: 8
  },

  // Heavy Freight Convoys (Official IR Rake Classifications)
  {
    trainNumber: "BCNHL-70291",
    trainName: "BCNHL Heavy Cement Freight (Bhilai ➔ Tatanagar)",
    category: "Freight",
    type: "Freight",
    route: ["S-R3", "S-R1", "S-BSP1", "S-BSP3", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2"],
    direction: "DN",
    speed: 65,
    coaches: 58,
    locoType: "WAG-9 Twin (12000 HP)",
    departureBaseMin: 300,
    durationMin: 780,
    initialDelay: 20
  },
  {
    trainNumber: "BOXNHL-44102",
    trainName: "BOXNHL Coal Freight (Korba ➔ Nagpur Thermal)",
    category: "Freight",
    type: "Freight",
    route: ["S-BSP3", "S-BSP1", "S-R1", "S-R3", "S-R2", "S-NGP4", "S-NGP1"],
    direction: "UP",
    speed: 70,
    coaches: 59,
    locoType: "WAG-12B Electric (12000 HP)",
    departureBaseMin: 450,
    durationMin: 650,
    initialDelay: 35
  },
  {
    trainNumber: "BTPN-88301",
    trainName: "BTPN Petroleum Tanker (IOCL Raipur ➔ Bokaro)",
    category: "Freight",
    type: "Freight",
    route: ["S-R1", "S-BSP1", "S-BSP2", "S-CKP4", "S-CKP3", "S-CKP1", "S-CKP2", "S-ADR3", "S-ADR4"],
    direction: "DN",
    speed: 60,
    coaches: 50,
    locoType: "WAG-9HC SECR",
    departureBaseMin: 620,
    durationMin: 720,
    initialDelay: 15
  },
  {
    trainNumber: "BRN-55219",
    trainName: "BRN Steel Rail Rake (SAIL Bhilai ➔ Rourkela Yard)",
    category: "Freight",
    type: "Freight",
    route: ["S-R3", "S-R1", "S-BSP1", "S-BSP2", "S-CKP4", "S-CKP3"],
    direction: "DN",
    speed: 60,
    coaches: 45,
    locoType: "WAG-9 Heavy Haul",
    departureBaseMin: 700,
    durationMin: 500,
    initialDelay: 10
  },
  {
    trainNumber: "CONCOR-91823",
    trainName: "CONCOR High-Speed Container Express (JNPT ➔ Durg)",
    category: "Freight",
    type: "Freight",
    route: ["S-NGP3", "S-NGP2", "S-NGP1", "S-NGP4", "S-R2"],
    direction: "DN",
    speed: 75,
    coaches: 45,
    locoType: "WAG-9 Twin (12000 HP)",
    departureBaseMin: 500,
    durationMin: 420,
    initialDelay: 6
  },
  {
    trainNumber: "BOST-33019",
    trainName: "BOST Steel Coil Freight (Tata Steel ➔ Wardha)",
    category: "Freight",
    type: "Freight",
    route: ["S-CKP2", "S-CKP1", "S-CKP3", "S-CKP4", "S-BSP2", "S-BSP1", "S-R1", "S-R2", "S-NGP4", "S-NGP1", "S-NGP2"],
    direction: "UP",
    speed: 65,
    coaches: 52,
    locoType: "WAG-9 Heavy Haul",
    departureBaseMin: 220,
    durationMin: 800,
    initialDelay: 28
  },
  {
    trainNumber: "BOBRN-19044",
    trainName: "BOBRN Bottom Discharge Coal (Bilaspur ➔ Bhilai)",
    category: "Freight",
    type: "Freight",
    route: ["S-BSP1", "S-R1", "S-R3", "S-R2"],
    direction: "UP",
    speed: 60,
    coaches: 58,
    locoType: "WAG-12B Twin Electric",
    departureBaseMin: 800,
    durationMin: 260,
    initialDelay: 12
  }
];

function formatMinutesToTime(min: number): string {
  const normalized = ((Math.floor(min) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

const generateSyntheticData = (): DashboardData => {
  const segments: TrackSegment[] = [
    // NGP Division (Balharshah - Wardha - Nagpur - Gondia)
    { 
      id: "SEG-N2", sourceId: "S-NGP3", targetId: "S-NGP2", name: "BPQ-WR", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 60, maintenanceRisk: 28,
      distanceKm: 132.7, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 150",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg UIC Rails on PSC Sleepers", lineCount: 2
    },
    { 
      id: "SEG-N1", sourceId: "S-NGP2", targetId: "S-NGP1", name: "WR-NGP", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 45, maintenanceRisk: 12,
      distanceKm: 78.6, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 200",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg UIC Rails with AFTC", lineCount: 3
    },
    { 
      id: "SEG-N3", sourceId: "S-NGP1", targetId: "S-NGP4", name: "NGP-G", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 35, maintenanceRisk: 10,
      distanceKm: 130.3, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 180",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Continuous Welded Rail (CWR)", lineCount: 3
    },

    // Raipur Division (Gondia - Durg - Bhilai - Raipur)
    { 
      id: "SEG-L1", sourceId: "S-NGP4", targetId: "S-R2", name: "G-DURG", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 40, maintenanceRisk: 18,
      distanceKm: 134.9, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 150",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Heavy Haul PSC-12", lineCount: 3
    },
    { 
      id: "SEG-R1", sourceId: "S-R2", targetId: "S-R3", name: "DURG-BPHB", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 75, maintenanceRisk: 22,
      distanceKm: 9.6, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 300",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Quadruple Line Steel Trunk", lineCount: 4
    },
    { 
      id: "SEG-R2", sourceId: "S-R3", targetId: "S-R1", name: "BPHB-R", status: "Degraded", 
      maintenanceRequired: true, maintenanceDurationMinutes: 120, baseCapacity: 50, currentLoad: 80, maintenanceRisk: 95,
      distanceKm: 27.2, speedLimit: 80, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 250",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Quadruple Line Steel Trunk", lineCount: 4
    },

    // Bilaspur Division (Raipur - Bilaspur - Champa - Raigarh)
    { 
      id: "SEG-L2", sourceId: "S-R1", targetId: "S-BSP1", name: "R-BSP", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 65, maintenanceRisk: 15,
      distanceKm: 110.9, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 200",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Triple Line Corridor", lineCount: 3
    },
    { 
      id: "SEG-B1", sourceId: "S-BSP1", targetId: "S-BSP3", name: "BSP-CPH", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 40, maintenanceRisk: 20,
      distanceKm: 53.4, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 200",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Quadruple Coal Corridor", lineCount: 4
    },
    { 
      id: "SEG-B2", sourceId: "S-BSP3", targetId: "S-BSP2", name: "CPH-RIG", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 35, maintenanceRisk: 16,
      distanceKm: 79.4, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 180",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg UIC Rails with Dual Axle Counters", lineCount: 3
    },

    // CKP Division (Raigarh - Jharsuguda - Rourkela - Chakradharpur - Tatanagar)
    { 
      id: "SEG-L3", sourceId: "S-BSP2", targetId: "S-CKP4", name: "RIG-JSG", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 50, maintenanceRisk: 24,
      distanceKm: 71.8, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 150",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Heavy Haul Broad Gauge", lineCount: 3
    },
    { 
      id: "SEG-C1", sourceId: "S-CKP4", targetId: "S-CKP3", name: "JSG-ROU", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 55, maintenanceRisk: 18,
      distanceKm: 101.2, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 160",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Continuous Welded Rail", lineCount: 3
    },
    { 
      id: "SEG-C2", sourceId: "S-CKP3", targetId: "S-CKP1", name: "ROU-CKP", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 65, maintenanceRisk: 35,
      distanceKm: 101.1, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 100 (Ghat Section)",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Heavy Rail with Catch Sidings", lineCount: 2
    },
    { 
      id: "SEG-C3", sourceId: "S-CKP1", targetId: "S-CKP2", name: "CKP-TATA", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 70, maintenanceRisk: 40,
      distanceKm: 61.6, speedLimit: 130, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 150",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg UIC Heavy Industrial Trunk", lineCount: 3
    },

    // Adra Division (Tatanagar - Purulia - Adra - Bankura / Bokaro)
    { 
      id: "SEG-L4", sourceId: "S-CKP2", targetId: "S-ADR3", name: "TATA-PRR", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 60, maintenanceRisk: 30,
      distanceKm: 80.8, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 150",
      signallingType: "Absolute Block System with MACLS", trackStructure: "52/60 kg Broad Gauge", lineCount: 2
    },
    { 
      id: "SEG-A2", sourceId: "S-ADR3", targetId: "S-ADR1", name: "PRR-ADRA", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 45, maintenanceRisk: 12,
      distanceKm: 39.1, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 200",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Continuous Welded Rail", lineCount: 2
    },
    { 
      id: "SEG-A1", sourceId: "S-ADR1", targetId: "S-ADR2", name: "ADRA-BQA", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 35, maintenanceRisk: 10,
      distanceKm: 40.2, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 200",
      signallingType: "Absolute Block System with MACLS", trackStructure: "52 kg UIC Rails", lineCount: 2
    },
    { 
      id: "SEG-A3", sourceId: "S-ADR1", targetId: "S-ADR4", name: "ADRA-BKSC", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 50, maintenanceRisk: 16,
      distanceKm: 69.7, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 180",
      signallingType: "Automatic Block Signalling (ABS)", trackStructure: "60 kg Heavy Freight Coal Link", lineCount: 2
    },
    { 
      id: "SEG-A4", sourceId: "S-ADR3", targetId: "S-ADR4", name: "PRR-BKSC", status: "Operational", 
      maintenanceRequired: false, maintenanceDurationMinutes: 0, baseCapacity: 100, currentLoad: 40, maintenanceRisk: 14,
      distanceKm: 52.8, speedLimit: 110, electrification: "25 kV AC 50Hz OHE", gradient: "1 in 160",
      signallingType: "Absolute Block System with MACLS", trackStructure: "52/60 kg Broad Gauge", lineCount: 2
    }
  ];

  const trains: Train[] = authenticTrainCatalog.map((item, idx) => {
    const isUp = item.direction === 'UP';
    const schedDepMin = item.departureBaseMin;
    const schedArrMin = schedDepMin + item.durationMin;
    const initialDelay = item.initialDelay;
    const actDepMin = schedDepMin + (initialDelay > 5 ? 5 : 0);

    const firstSt = stationCodeMap.get(item.route[0]);
    const secondSt = stationCodeMap.get(item.route[1] || item.route[0]);

    // Preferred platform based on train category & direction
    let preferredPfNum = 1;
    if (item.category === 'Vande Bharat') preferredPfNum = isUp ? 1 : 2;
    else if (item.category === 'Rajdhani' || item.category === 'Duronto') preferredPfNum = isUp ? 2 : 1;
    else if (item.category === 'Superfast') preferredPfNum = (idx % 2 === 0) ? 2 : 3;
    else preferredPfNum = 4 + (idx % 3); // Freight on loop lines

    const trackAssignment = preferredPfNum <= 2 ? 'MAIN LINE' : `LOOP LINE ${preferredPfNum - 2}`;

    return {
      id: item.trainNumber,
      trainNumber: item.trainNumber,
      trainName: item.trainName,
      category: item.category,
      type: item.type,
      status: initialDelay > 15 ? 'DELAYED' : 'RUNNING',
      lastStation: firstSt?.name || "Bilaspur Jn",
      lastStationCode: firstSt?.code || "BSP",
      nextStation: secondSt?.name || "Raipur Jn",
      nextStationCode: secondSt?.code || "R",
      currentLocationDesc: `Approaching ${secondSt?.name || 'Raipur Jn'} block section, Km ${820 + idx * 8}/4`,
      speed: item.speed,
      direction: item.direction,
      scheduledArrival: formatMinutesToTime(schedArrMin),
      scheduledDeparture: formatMinutesToTime(schedDepMin),
      expectedArrival: formatMinutesToTime(schedArrMin + initialDelay),
      expectedDeparture: formatMinutesToTime(actDepMin),
      delayMinutes: initialDelay,
      source: "AUTHORIZED RAILWAY DATA / PUBLIC TRAIN STATUS (CRIS-NTES)",
      lastUpdated: new Date().toLocaleTimeString('en-US', { hour12: false }),
      isLive: true,
      isEstimated: true,
      positionLabel: "POSITION: ESTIMATED FROM LATEST LIVE UPDATE",
      dataFreshnessSeconds: Math.floor(Math.random() * 18) + 4,
      authenticityStatus: 'LIVE',
      trackAssignment: trackAssignment,
      trackAssignmentSource: 'AI NETWORK INFERENCE',

      // Simulation fields
      route: item.route,
      currentSegmentId: null,
      currentStationId: item.route[0],
      currentPlatformId: `${item.route[0]}-PF${preferredPfNum}`,
      platformNumber: preferredPfNum,
      platformPhase: 'dwelling',
      progress: 0,
      scheduledDepartureMin: schedDepMin,
      scheduledArrivalMin: schedArrMin,
      actualDepartureMin: actDepMin,
      predictedDelay: initialDelay,
      aiAgentState: 'Routing',
      delayPropagation: initialDelay > 20 ? Math.floor(initialDelay * 1.3) : 0,
      coaches: item.coaches,
      locoType: item.locoType
    };
  });

  return { 
    divisions,
    stations, 
    segments, 
    trains, 
    simulationTime: 480, // 08:00
    networkHealth: 94.2, 
    activeAlerts: 1,
    weather: 'Clear',
    assetKPIs: { network: 94.2, tracks: 96, trains: 91, maintenance: 94, infrastructure: 97 },
    liveFeedMeta: {
      dataSource: "AUTHORIZED RAILWAY DATA / PUBLIC TRAIN STATUS (CRIS-NTES)",
      lastUpdated: new Date().toLocaleTimeString('en-US', { hour12: false }),
      dataAgeSeconds: 8,
      connectionStatus: 'ONLINE',
      authenticityStatus: 'LIVE'
    }
  };
};

let simulationTime = 480; // Start at 08:00
let db: DashboardData = generateSyntheticData();
let connectionStatus: 'ONLINE' | 'FALLBACK' = 'ONLINE';
let lastFeedRefresh = Date.now();

// Realistic NTES-Aligned Simulation Loop with Calm Pacing & Deceleration Mechanics
setInterval(() => {
  // Calm pacing according to NTES live railway portal (0.25 min * playbackSpeed per 800ms)
  const timeAdvance = 0.25 * (ntesPacingConfig.playbackSpeed || 0.35);
  simulationTime += timeAdvance;
  if (simulationTime >= 1440) simulationTime = 0;
  db.simulationTime = Math.round(simulationTime * 10) / 10;

  const nowSecs = Math.floor((Date.now() - lastFeedRefresh) / 1000);
  db.liveFeedMeta.dataAgeSeconds = nowSecs;
  db.liveFeedMeta.lastUpdated = new Date().toLocaleTimeString('en-US', { hour12: false });
  db.liveFeedMeta.connectionStatus = connectionStatus;
  db.liveFeedMeta.authenticityStatus = connectionStatus === 'ONLINE' ? 'LIVE' : 'LAST KNOWN';
  
  let totalDelay = 0;

  // Reset station platform states
  db.stations.forEach(s => s.platforms.forEach(p => {
     if (p.status !== 'Maintenance') {
        p.status = 'Available';
        p.trainId = undefined;
        p.trainName = undefined;
        p.trainType = undefined;
        p.trackCircuit = 'Clear';
        p.signalState = 'Green';
     }
  }));

  if (Math.random() < 0.004) {
     const weathers = ['Clear', 'Clear', 'Clear', 'Heavy Rain', 'Dense Fog', 'Heat Wave'] as const;
     db.weather = weathers[Math.floor(Math.random() * weathers.length)];
  }

  db.trains.forEach((t, idx) => {
    // Treat time cyclically so all real trains continuously traverse their real routes
    const wrappedTime = simulationTime < t.actualDepartureMin ? simulationTime + 1440 : simulationTime;
    const wrappedArr = t.scheduledArrivalMin < t.actualDepartureMin ? t.scheduledArrivalMin + 1440 : t.scheduledArrivalMin;
    
    // Normal nominal cruising speed
    const maxCruising = t.category === 'Vande Bharat' ? 140 : t.category === 'Rajdhani' || t.category === 'Duronto' ? 125 : t.category === 'Freight' ? 70 : 105;

    if (wrappedTime >= t.actualDepartureMin && wrappedTime <= wrappedArr + t.predictedDelay) {
      const journeyDuration = (wrappedArr + t.predictedDelay) - t.actualDepartureMin;
      const elapsed = wrappedTime - t.actualDepartureMin;
      const journeyProgress = elapsed / Math.max(1, journeyDuration);
      
      const segmentCount = t.route.length - 1;
      const exactIndex = journeyProgress * segmentCount;
      const currentSegmentIndex = Math.min(Math.floor(exactIndex), segmentCount - 1);
      
      const srcId = t.route[currentSegmentIndex];
      const dstId = t.route[currentSegmentIndex + 1];
      const srcSt = stationCodeMap.get(srcId);
      const dstSt = stationCodeMap.get(dstId);
      const segment = db.segments.find(s => (s.sourceId === srcId && s.targetId === dstId) || (s.sourceId === dstId && s.targetId === srcId));
      
      const segProgress = (exactIndex - currentSegmentIndex) * 100;
      t.progress = Math.round(segProgress * 10) / 10;

      // Update actual train live status indicators
      t.lastStation = srcSt?.name || "Bilaspur Jn";
      t.lastStationCode = srcSt?.code || "BSP";
      t.nextStation = dstSt?.name || "Raipur Jn";
      t.nextStationCode = dstSt?.code || "R";
      t.currentLocationDesc = `Between ${t.lastStationCode} and ${t.nextStationCode} (${Math.floor(segProgress)}% section traversed)`;
      t.status = t.predictedDelay > 15 ? 'DELAYED' : 'RUNNING';
      t.delayMinutes = t.predictedDelay;
      t.dataFreshnessSeconds = (nowSecs + idx) % 30;
      t.authenticityStatus = connectionStatus === 'ONLINE' ? 'LIVE' : 'LAST KNOWN';
      
      // Preferred platform selection
      const getPreferredPlatform = (stId: string) => {
        const st = db.stations.find(s => s.id === stId);
        if (!st) return null;
        let preferredNum = 1;
        if (t.category === 'Vande Bharat') preferredNum = t.direction === 'UP' ? 1 : 2;
        else if (t.category === 'Rajdhani' || t.category === 'Duronto') preferredNum = t.direction === 'UP' ? 2 : 1;
        else if (t.category === 'Superfast') preferredNum = 2 + (idx % 2);
        else preferredNum = Math.min(st.platforms.length, 3 + (idx % Math.max(1, st.platforms.length - 3)));

        if (t.targetPlatformResolved) {
          preferredNum = t.targetPlatformResolved;
        }

        let target = st.platforms.find(p => p.number === preferredNum && p.status === 'Available');
        if (!target) {
          target = st.platforms.find(p => p.status === 'Available') || st.platforms[0];
        }
        return target;
      };

      // Realistic Speed Deceleration & NTES Speed States
      if (segProgress < 8) {
         // At or dwelling in source station platform line
         t.currentSegmentId = null;
         t.currentStationId = srcId;
         const targetPf = getPreferredPlatform(srcId);
         if (targetPf) {
            targetPf.status = 'Occupied';
            targetPf.trainId = t.trainNumber;
            targetPf.trainName = `${t.trainNumber} ${t.trainName}`;
            targetPf.trainType = t.type;
            targetPf.trackCircuit = 'Occupied';
            targetPf.signalState = segProgress > 4 ? 'Green' : 'Red';
            t.currentPlatformId = targetPf.id;
            t.platformNumber = targetPf.number;
            t.platformPhase = segProgress < 4 ? 'dwelling' : 'departing';
            t.trackAssignment = targetPf.number <= 2 ? 'MAIN LINE' : `LOOP LINE ${targetPf.number - 2}`;
            t.trackAssignmentSource = t.appliedPlanOption ? 'AI PROPOSED' : 'OPERATIONAL FEED';
         }

         if (segProgress < 4) {
           t.speed = 0; // Halted at platform
           t.statusMessage = 'DWELLING AT PLATFORM';
         } else {
           t.speed = Math.floor(25 + segProgress * 3); // Accelerating out of platform
           t.statusMessage = 'DEPARTING PLATFORM';
         }
      } else if (segProgress > 92 && currentSegmentIndex === segmentCount - 1) {
         // Final destination station platform line
         t.currentSegmentId = null;
         t.currentStationId = dstId;
         const targetPf = getPreferredPlatform(dstId);
         if (targetPf) {
            targetPf.status = 'Occupied';
            targetPf.trainId = t.trainNumber;
            targetPf.trainName = `${t.trainNumber} ${t.trainName}`;
            targetPf.trainType = t.type;
            targetPf.trackCircuit = 'Occupied';
            targetPf.signalState = 'Red';
            t.currentPlatformId = targetPf.id;
            t.platformNumber = targetPf.number;
            t.platformPhase = segProgress > 96 ? 'dwelling' : 'berthing';
            t.trackAssignment = targetPf.number <= 2 ? 'MAIN LINE' : `LOOP LINE ${targetPf.number - 2}`;
            t.trackAssignmentSource = 'OPERATIONAL FEED';
         }

         if (segProgress > 96) {
           t.speed = 0;
           t.statusMessage = 'TERMINATED AT PLATFORM';
         } else {
           t.speed = Math.max(15, Math.floor(35 - (segProgress - 92) * 4)); // Slowing down to berth
           t.statusMessage = 'BERTHING AT PLATFORM';
         }
      } else {
         // Moving on mainline track segment between stations
         t.currentSegmentId = segment ? segment.id : null;
         t.currentStationId = null;
         t.currentPlatformId = null;
         t.platformPhase = undefined;
         t.trackAssignment = t.appliedPlanOption === 'LOOP_DIVERSION' ? 'LOOP LINE SIDING' : 'MAIN LINE';
         t.trackAssignmentSource = t.appliedPlanOption ? 'AI PROPOSED' : 'AI NETWORK INFERENCE';

         // Slowing down for caution orders / degraded track / station approaches
         if (segment && segment.status === 'Degraded') {
           t.speed = Math.min(maxCruising, 35); // Slowing down due to track maintenance
           t.statusMessage = 'SLOWING (TSR 30 CAUTION)';
         } else if (segProgress > 80) {
           // Slowing as it nears the next station
           const slowFactor = (100 - segProgress) / 20;
           t.speed = Math.max(25, Math.floor(30 + (maxCruising - 30) * slowFactor));
           t.statusMessage = `SLOWING APPROACH TO ${dstSt?.code || 'NEXT STN'}`;
         } else if (segProgress < 20) {
           // Accelerating after leaving previous station
           const accFactor = (segProgress - 8) / 12;
           t.speed = Math.min(maxCruising, Math.floor(35 + (maxCruising - 35) * Math.max(0, accFactor)));
           t.statusMessage = 'ACCELERATING TO CRUISE SPEED';
         } else {
           t.speed = maxCruising;
           t.statusMessage = 'CRUISING ON MAIN LINE';
         }
      }
      
      if (t.predictedDelay > 20) {
         t.delayPropagation = Math.floor(t.predictedDelay * 1.4);
      } else {
         t.delayPropagation = 0;
      }
      
      if (segment) {
        if (segment.status === 'Degraded' && Math.random() < 0.08 && !t.appliedPlanOption) {
          t.predictedDelay += 1;
        }
        if (db.weather === 'Heavy Rain' && Math.random() < 0.04) {
          t.predictedDelay += 1;
        }
      }
    } else {
      t.currentSegmentId = null;
      t.currentStationId = null;
      t.currentPlatformId = null;
      t.progress = 0;
      t.platformPhase = undefined;
      t.speed = 0;
      
      // Auto-loop train departures so live traffic is permanently running
      if (wrappedTime > wrappedArr + t.predictedDelay + 30) {
          t.actualDepartureMin = Math.round(simulationTime) + 10;
          t.scheduledArrivalMin = t.actualDepartureMin + (t.category === 'Vande Bharat' ? 320 : 540);
          t.predictedDelay = 0;
      }
    }
    totalDelay += t.predictedDelay;
  });
  
  const degradedCount = db.segments.filter(s => s.status !== 'Operational').length;
  db.assetKPIs.tracks = Math.max(0, 100 - degradedCount * 4);
  db.networkHealth = Math.max(0, 100 - (degradedCount * 5) - Math.floor(totalDelay / 180));
  db.assetKPIs.network = db.networkHealth;
  db.activeAlerts = degradedCount + (db.weather !== 'Clear' ? 1 : 0);

  db.segments.forEach(seg => {
    if (seg.status === 'Operational') {
      let riskDelta = Math.random() * 0.2;
      if (db.weather === 'Heavy Rain') riskDelta += 0.4;
      seg.maintenanceRisk = Math.min(100, seg.maintenanceRisk + riskDelta);
      if (seg.maintenanceRisk > 95 && !seg.maintenanceRequired) {
         seg.maintenanceRequired = true;
         seg.maintenanceDurationMinutes = 120;
      }
    }
  });

}, 800);

function runAdvancedOptimization(segmentId?: string, sourceId?: string, targetId?: string) {
  let targetSegment = segmentId ? db.segments.find(s => s.id === segmentId) : db.segments.find(s => s.status === 'Degraded') || db.segments[4];
  let affectedTrains: Train[] = [];
  
  if (targetSegment) {
     affectedTrains = db.trains.filter(t => t.route.includes(targetSegment.sourceId) || t.route.includes(targetSegment.targetId));
  } else if (sourceId && targetId) {
     affectedTrains = db.trains.filter(t => t.route.includes(sourceId) && t.route.includes(targetId));
  }
  if (affectedTrains.length === 0) {
     affectedTrains = db.trains.slice(0, 4);
  }
  
  let effectiveSrc = sourceId || (targetSegment ? targetSegment.sourceId : 'S-R2');
  let effectiveDst = targetId || (targetSegment ? targetSegment.targetId : 'S-R1');

  // BFS to find realistic AI bypass route
  let aiPath: string[] = [];
  const adjList = new Map<string, string[]>();
  db.segments.forEach(s => {
     if(!adjList.has(s.sourceId)) adjList.set(s.sourceId, []);
     if(!adjList.has(s.targetId)) adjList.set(s.targetId, []);
     adjList.get(s.sourceId)!.push(s.targetId);
     adjList.get(s.targetId)!.push(s.sourceId);
  });

  let queue = [[effectiveSrc]];
  let visited = new Set([effectiveSrc]);

  while(queue.length > 0) {
     const path = queue.shift()!;
     const node = path[path.length-1];
     if (node === effectiveDst) {
        aiPath = path;
        break;
     }
     for(let next of (adjList.get(node) || [])) {
        if(!visited.has(next)) {
           visited.add(next);
           queue.push([...path, next]);
        }
     }
  }

  const srcSt = db.stations.find(s => s.id === effectiveSrc);
  const dstSt = db.stations.find(s => s.id === effectiveDst);
  const locName = `${srcSt?.name || 'Durg Jn'} (${srcSt?.code || 'DURG'}) ➔ ${dstSt?.name || 'Raipur Jn'} (${dstSt?.code || 'R'})`;
  const segName = targetSegment?.name || 'DURG-BPHB-R';

  // Find prime affected trains with authentic names
  const primaryTrain = affectedTrains.find(t => t.category === 'Vande Bharat' || t.category === 'Rajdhani') || affectedTrains[0];

  const issue = {
    id: `ISSUE-${Date.now()}`,
    title: `Block Section Interlocking Conflict on ${segName} (SECR Corridor)`,
    type: targetSegment?.status === 'Degraded' ? ('TRACK_DEGRADATION' as const) : ('HEADWAY_CONFLICT' as const),
    location: locName,
    segmentId: targetSegment?.id,
    segmentName: segName,
    severity: targetSegment?.status === 'Degraded' ? ('CRITICAL' as const) : ('HIGH' as const),
    description: `Active track occupancy and signal hold detected between ${srcSt?.name} and ${dstSt?.name}. High-priority rake ${primaryTrain.trainNumber} (${primaryTrain.trainName}) and heavy freight rakes face imminent headway bunching (+${primaryTrain.predictedDelay + 35}m projected delay).`,
    rootCause: `Track circuit de-energization at Turnout Point Machine P-102 and 25kV OHE section insulator drop on UP Line.`,
    affectedTrainIds: affectedTrains.map(t => t.trainNumber),
    projectedDelayMinutes: Math.max(35, primaryTrain.predictedDelay + 38),
    cascadeImpact: `4 following SECR express and freight rakes at risk of +45m cascading detention if not re-routed or regulated.`,
    resolutionSteps: [
      {
        step: 1,
        title: "Traffic Regulation & Loop Holding",
        description: `Hold freight rakes on Loop Line at ${srcSt?.name} to create safe clearance headway for ${primaryTrain.trainNumber} ${primaryTrain.trainName}.`,
        status: 'in_progress' as const
      },
      {
        step: 2,
        title: "Dynamic Crossover Interlocking Lock",
        description: `Switch Point Machines P-102 & P-104 to REVERSE for bi-directional green bypass corridor.`,
        status: 'pending' as const
      },
      {
        step: 3,
        title: "Downstream Platform 1 Reservation",
        description: `Auto-reserve Platform 1 at ${dstSt?.name} with automatic route setting and Green starter aspect.`,
        status: 'pending' as const
      },
      {
        step: 4,
        title: "Speed Restoration to 130 km/h",
        description: `Restore train cruising speed to 130 km/h upon clearing the interlocking zone, reclaiming 38+ minutes.`,
        status: 'pending' as const
      }
    ]
  };

  const options = [
    {
      id: 'approve_ai' as const,
      title: `Approve AI Dynamic Resolution for ${primaryTrain.trainNumber}`,
      label: 'AI Smart Reroute & Precedence',
      badge: 'RECOMMENDED (100% RECOVERY)',
      description: `Execute optimal multi-objective routing: clear high-speed green block for ${primaryTrain.trainNumber} ${primaryTrain.trainName} and bypass failure zone.`,
      trainEffect: `Reroutes ${primaryTrain.trainNumber} onto clear green track, accelerates speed to 130 km/h, and clears predicted delay to 0m.`,
      delaySavings: 42,
      speedLimit: 130,
      riskLevel: 'LOW' as const,
      recommended: true
    },
    {
      id: 'loop_divert' as const,
      title: `Divert ${primaryTrain.trainNumber} onto Loop Line Siding`,
      label: 'Loop Line Regulation',
      badge: 'TRAFFIC REGULATION',
      description: `Divert train into loop line siding at 45 km/h to allow emergency maintenance inspection on the mainline.`,
      trainEffect: `Train takes turnout onto Loop Line 2, adjusts speed to 45 km/h, maintains steady progress with +4m controlled dwell.`,
      delaySavings: 25,
      speedLimit: 45,
      riskLevel: 'LOW' as const,
      recommended: false
    },
    {
      id: 'precedence' as const,
      title: `Grant Absolute Precedence to ${primaryTrain.trainNumber}`,
      label: 'Vande Bharat / Express Priority Precedence',
      badge: 'SUPERFAST CORRIDOR',
      description: `Force trailing freight convoys into holding sidings, granting absolute green block priority to ${primaryTrain.trainNumber}.`,
      trainEffect: `Immediate green signal clearance for ${primaryTrain.trainNumber}, speed unlocked to 130 km/h.`,
      delaySavings: 38,
      speedLimit: 130,
      riskLevel: 'LOW' as const,
      recommended: false
    },
    {
      id: 'tsr_30' as const,
      title: 'Issue Caution Order (TSR 30 km/h)',
      label: 'Caution Order TSR 30',
      badge: 'CONTROLLED PASSAGE',
      description: `Allow train ${primaryTrain.trainNumber} to proceed cautiously through the degraded block under Temporary Speed Restriction of 30 km/h.`,
      trainEffect: 'Train throttles speed to exactly 30 km/h with flashing caution aspect until block clearance.',
      delaySavings: 12,
      speedLimit: 30,
      riskLevel: 'MEDIUM' as const,
      recommended: false
    },
    {
      id: 'manual' as const,
      title: 'Manual Section Controller Override',
      label: 'Manual Dispatch Control',
      badge: 'MANUAL OVERRIDE',
      description: 'Transfer routing authority back to manual dispatch controller desk, bypassing automated AI interlocking.',
      trainEffect: 'Train switches to manual state, speed governed by manual signal aspects.',
      delaySavings: 0,
      speedLimit: 60,
      riskLevel: 'HIGH' as const,
      recommended: false
    }
  ];

  return {
    segmentId: targetSegment?.id,
    routePath: aiPath.length > 0 ? aiPath : ['S-NGP4', 'S-R2', 'S-R3', 'S-R1', 'S-BSP1'],
    bestStartTime: simulationTime + 5,
    bestEndTime: simulationTime + 5 + 45,
    confidenceScore: parseFloat((98.6 + Math.random() * 1.2).toFixed(1)),
    affectedTrains: affectedTrains.slice(0, 5),
    systemDelayReduction: 42,
    constraints: [
      { name: "Track Availability & Clear Headway", weight: 0.95, satisfaction: 99 },
      { name: "Platform 1 Allocation (Downstream)", weight: 0.85, satisfaction: 98 },
      { name: "SECR/SER Zone Crossing Clearance", weight: 0.80, satisfaction: 100 },
      { name: "Cascading Delay Minimization", weight: 0.90, satisfaction: 97 }
    ],
    convergenceData: Array.from({length: 30}, (_,i) => ({ iteration: i, loss: 100 * Math.pow(0.85, i) + Math.random()})),
    alternatives: [],
    xaiReasoning: [
      `AI identified optimal route bypassing degraded section ${segName}.`,
      `Turnout points P-102 and P-104 interlocked for unobstructed green run for train ${primaryTrain.trainNumber} (${primaryTrain.trainName}).`,
      `Predicted delay completely reclaimed: -42 min across SECR & SER corridors.`,
      `Platform 1 at downstream station ${dstSt?.name || 'Raipur Jn'} auto-reserved for flawless berthing.`
    ],
    multiObjectiveScores: {
      delayMinimization: 99,
      assetAvailability: 99,
      costEfficiency: 94,
      trackUtilization: 97
    },
    scenarios: [
      { name: 'Standard Siding Hold', delay: 48, availability: 72, score: 52 },
      { name: 'AI Optimal Flow', delay: 0, availability: 99, score: 99, isAiBest: true }
    ],
    issue,
    options,
    resolutionStatus: 'REVIEW_REQUIRED' as const,
    resolutionProgress: 25
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Master Dashboard Data
  app.get("/api/data", (req, res) => {
    res.json(db);
  });

  // Live Station Mode API Endpoint (Actual Indian Railways Station Trains)
  app.get("/api/stations/:code/live", (req, res) => {
    const code = req.params.code.toUpperCase();
    const station = stationCodeMap.get(code) || db.stations.find(s => s.id === code || s.code === code);
    
    if (!station) {
      return res.status(404).json({ error: `Station ${code} not found in railway topology` });
    }

    const division = db.divisions.find(d => d.id === station.divisionId);

    // Filter trains connected to this station
    const connectedTrains = db.trains.filter(t => t.route.includes(station.id));

    // Segregate into Arriving, Departing, and Passing
    const arriving: Train[] = [];
    const departing: Train[] = [];
    const passing: Train[] = [];

    connectedTrains.forEach(t => {
      const isCurrentlyHere = t.currentStationId === station.id;
      const isNextStation = t.nextStationCode === station.code;
      const isLastStation = t.lastStationCode === station.code;

      if (isCurrentlyHere) {
        if (t.platformPhase === 'dwelling' || t.platformPhase === 'departing') {
          departing.push(t);
        } else {
          arriving.push(t);
        }
      } else if (isNextStation) {
        arriving.push(t);
      } else if (isLastStation) {
        departing.push(t);
      } else {
        // En route or scheduled to pass
        passing.push(t);
      }
    });

    const responseData: LiveStationData = {
      stationCode: station.code,
      stationName: station.name,
      division: division?.name || "Bilaspur",
      zone: division?.zone || "SECR",
      lastUpdated: new Date().toLocaleTimeString('en-US', { hour12: false }),
      dataFreshnessSeconds: db.liveFeedMeta.dataAgeSeconds,
      dataSource: db.liveFeedMeta.dataSource,
      connectionStatus: db.liveFeedMeta.connectionStatus,
      authenticityStatus: db.liveFeedMeta.authenticityStatus as any,
      arriving,
      departing,
      passing
    };

    res.json(responseData);
  });

  // Single Train Live Running Status Endpoint
  app.get("/api/trains/:trainNumber/live", (req, res) => {
    const trainNum = req.params.trainNumber;
    const train = db.trains.find(t => t.trainNumber === trainNum || t.id === trainNum);
    if (!train) {
      return res.status(404).json({ error: `Train ${trainNum} not found` });
    }
    res.json(train);
  });

  // Force Refresh Live Railway Data Feed
  app.post("/api/refresh-live-feed", (req, res) => {
    lastFeedRefresh = Date.now();
    db.liveFeedMeta.dataAgeSeconds = 0;
    db.liveFeedMeta.lastUpdated = new Date().toLocaleTimeString('en-US', { hour12: false });
    res.json({ message: "Live Indian Railways data feed refreshed", meta: db.liveFeedMeta });
  });

  // Toggle Live Data Connection / Fallback Offline Mode
  app.post("/api/toggle-data-source", (req, res) => {
    connectionStatus = connectionStatus === 'ONLINE' ? 'FALLBACK' : 'ONLINE';
    db.liveFeedMeta.connectionStatus = connectionStatus;
    db.liveFeedMeta.authenticityStatus = connectionStatus === 'ONLINE' ? 'LIVE' : 'LAST KNOWN';
    res.json({ 
      connectionStatus, 
      authenticityStatus: db.liveFeedMeta.authenticityStatus,
      message: connectionStatus === 'ONLINE' ? 'Connected to Authorized Live Railway Feed' : 'Live Data Unavailable - Showing Last Known Railway Data'
    });
  });

  // Apply Official Plan Option Directly to Live Moving Trains
  app.post("/api/plan/apply-option", (req, res) => {
    const { optionId, segmentId, trainId, customTrainId } = req.body;
    const targetId = trainId || customTrainId;
    
    let targetTrains: Train[] = [];
    if (targetId) {
      const t = db.trains.find(tr => tr.trainNumber === targetId || tr.id === targetId);
      if (t) targetTrains.push(t);
    }
    if (targetTrains.length === 0) {
      targetTrains = db.trains.filter(t => t.category === 'Vande Bharat' || t.predictedDelay > 0 || t.currentSegmentId || t.currentStationId).slice(0, 3);
      if (targetTrains.length === 0) targetTrains = [db.trains[0]];
    }

    let appliedOptionType: 'AI_REROUTE' | 'LOOP_DIVERSION' | 'PRECEDENCE_OVERTAKE' | 'CAUTION_TSR_30' | 'MANUAL_OVERRIDE' = 'AI_REROUTE';
    let statusMsg = '';
    let actionIcon = 'Zap';
    let newSpeed = 130;
    let delayRecovery = 42;

    switch(optionId) {
      case 'approve_ai':
        appliedOptionType = 'AI_REROUTE';
        statusMsg = 'AI OPTIMIZED: Green Corridor Locked | Speed 130 km/h';
        actionIcon = 'Zap';
        newSpeed = 130;
        delayRecovery = 42;
        if (segmentId) {
          const seg = db.segments.find(s => s.id === segmentId);
          if (seg) {
            seg.status = 'Operational';
            seg.maintenanceRequired = false;
            seg.maintenanceRisk = 20;
          }
        }
        break;

      case 'loop_divert':
        appliedOptionType = 'LOOP_DIVERSION';
        statusMsg = 'DIVERTED TO LOOP LINE: Regulated at 45 km/h for Mainline Clearance';
        actionIcon = 'GitBranch';
        newSpeed = 45;
        delayRecovery = 25;
        break;

      case 'precedence':
        appliedOptionType = 'PRECEDENCE_OVERTAKE';
        statusMsg = 'PRIORITY PRECEDENCE: Slower Convoys Sided | Unobstructed Overtake';
        actionIcon = 'Crown';
        newSpeed = 130;
        delayRecovery = 38;
        break;

      case 'tsr_30':
        appliedOptionType = 'CAUTION_TSR_30';
        statusMsg = 'CAUTION ORDER (TSR 30 KM/H): Pilot Running under Caution Aspect';
        actionIcon = 'AlertTriangle';
        newSpeed = 30;
        delayRecovery = 12;
        break;

      case 'manual':
        appliedOptionType = 'MANUAL_OVERRIDE';
        statusMsg = 'MANUAL OVERRIDE: Direct Section Controller Authority';
        actionIcon = 'Edit2';
        newSpeed = 65;
        delayRecovery = 5;
        break;

      default:
        appliedOptionType = 'AI_REROUTE';
        statusMsg = 'AI Plan Active';
    }

    targetTrains.forEach(train => {
      train.appliedPlanOption = appliedOptionType;
      train.statusMessage = statusMsg;
      train.assignedActionIcon = actionIcon;
      train.speed = newSpeed;
      train.aiAgentState = optionId === 'manual' ? 'Delayed' : 'Optimized';
      train.predictedDelay = Math.max(0, train.predictedDelay - delayRecovery);
      train.delayMinutes = train.predictedDelay;
      train.delayPropagation = 0;
      train.trackAssignmentSource = 'AI PROPOSED';

      if (optionId === 'approve_ai' || optionId === 'precedence') {
        train.targetPlatformResolved = 1;
        train.trackAssignment = 'MAIN LINE (PF-1 RESERVED)';
      } else if (optionId === 'loop_divert') {
        train.trackAssignment = 'LOOP LINE 2';
      }
    });

    const degradedCount = db.segments.filter(s => s.status !== 'Operational').length;
    db.networkHealth = Math.min(100, Math.max(0, 100 - degradedCount * 4));
    db.assetKPIs.network = db.networkHealth;

    res.json({
      success: true,
      optionId,
      appliedOption: { title: statusMsg },
      trainEffect: { speed: newSpeed },
      appliedOptionType,
      updatedTrains: targetTrains,
      statusMessage: statusMsg,
      delayRecovered: delayRecovery,
      networkHealth: db.networkHealth
    });
  });

  app.post("/api/platform/reassign", (req, res) => {
    const { stationId, trainId, targetPlatformNumber } = req.body;
    const station = db.stations.find(s => s.id === stationId);
    const train = db.trains.find(t => t.trainNumber === trainId || t.id === trainId);
    if (!station || !train) {
      return res.status(404).json({ error: "Station or Train not found" });
    }
    const targetPf = station.platforms.find(p => p.number === Number(targetPlatformNumber));
    if (!targetPf) {
      return res.status(400).json({ error: "Target platform does not exist" });
    }
    
    station.platforms.forEach(p => {
      if (p.trainId === train.trainNumber || p.trainId === train.id) {
        p.status = 'Available';
        p.trainId = undefined;
        p.trainName = undefined;
        p.trainType = undefined;
        p.trackCircuit = 'Clear';
      }
    });

    targetPf.status = 'Occupied';
    targetPf.trainId = train.trainNumber;
    targetPf.trainName = `${train.trainNumber} ${train.trainName}`;
    targetPf.trainType = train.type;
    targetPf.trackCircuit = 'Occupied';
    targetPf.signalState = 'Green';

    train.currentPlatformId = targetPf.id;
    train.platformNumber = targetPf.number;
    train.currentStationId = station.id;
    train.trackAssignment = targetPf.number <= 2 ? 'MAIN LINE' : `LOOP LINE ${targetPf.number - 2}`;
    train.trackAssignmentSource = 'AI PROPOSED';

    res.json({ message: `Train ${train.trainNumber} reassigned to PF-${targetPf.number}`, station, train });
  });

  app.post("/api/platform/signal", (req, res) => {
    const { stationId, platformId, signalState } = req.body;
    const station = db.stations.find(s => s.id === stationId);
    if (!station) return res.status(404).json({ error: "Station not found" });
    const pf = station.platforms.find(p => p.id === platformId);
    if (!pf) return res.status(404).json({ error: "Platform not found" });
    pf.signalState = signalState || (pf.signalState === 'Green' ? 'Red' : 'Green');
    res.json({ message: `Platform ${pf.number} signal set to ${pf.signalState}`, platform: pf });
  });

  // Station & Train Hindi Mapping
  const stationHindiMap: Record<string, string> = {
    "BSP": "बिलासपुर जंक्शन",
    "R": "रायपुर जंक्शन",
    "DURG": "दुर्ग जंक्शन",
    "BPHB": "भिलाई पावर हाउस",
    "G": "गोंदिया जंक्शन",
    "NGP": "नागपुर जंक्शन",
    "WR": "वर्धा जंक्शन",
    "BPQ": "बल्हारशाह जंक्शन",
    "CPH": "चांपा जंक्शन",
    "RIG": "रायगढ़",
    "JSG": "झारसुगुड़ा जंक्शन",
    "ROU": "राउरकेला जंक्शन",
    "CKP": "चक्रधरपुर",
    "TATA": "टाटानगर जंक्शन",
    "ADRA": "आद्रा जंक्शन",
    "KGP": "खड़गपुर जंक्शन",
    "PRR": "पुरुलिया जंक्शन",
    "BKSC": "बोकारो स्टील सिटी"
  };

  const trainHindiMap: Record<string, string> = {
    "20825": "बिलासपुर - नागपुर वंदे भारत एक्सप्रेस",
    "20826": "नागपुर - बिलासपुर वंदे भारत एक्सप्रेस",
    "20898": "रांची - हावड़ा वंदे भारत एक्सप्रेस",
    "12441": "बिलासपुर - नई दिल्ली राजधानी एक्सप्रेस",
    "12222": "हावड़ा - पुणे दुरंतो एक्सप्रेस",
    "12834": "हावड़ा - अहमदाबाद सुपरफास्ट एक्सप्रेस",
    "18237": "छत्तीसगढ़ एक्सप्रेस (कोरबा - अमृतसर)",
    "12810": "हावड़ा - मुंबई मेल",
    "12069": "रायगढ़ - गोंदिया जन शताब्दी",
    "12860": "गीतांजलि एक्सप्रेस (हावड़ा - मुंबई)",
    "BOXN-9402": "बीलौदी कोल मालगाड़ी",
    "BCN-7731": "भिलाई स्टील मालगाड़ी"
  };

  function getStationHindiName(code: string, fallback: string = ''): string {
    return stationHindiMap[code] || fallback || code;
  }

  function getTrainHindiName(trainNum: string, fallback: string = ''): string {
    return trainHindiMap[trainNum] || fallback || trainNum;
  }

  // Where Is My Train Detailed Data Generator
  function generateWhereIsMyTrainReport(trainNum: string): WhereIsMyTrainData | null {
    const t = db.trains.find(tr => tr.trainNumber === trainNum || tr.id === trainNum);
    if (!t) return null;

    const delay = Math.max(t.delayMinutes, t.predictedDelay);
    const lastStName = stationCodeMap.get(t.lastStationCode || '')?.name || t.lastStation || 'Origin';
    const lastStHindi = getStationHindiName(t.lastStationCode || '', lastStName);
    const nextStName = stationCodeMap.get(t.nextStationCode || '')?.name || t.nextStation || 'Destination';
    const nextStHindi = getStationHindiName(t.nextStationCode || '', nextStName);

    const distToNext = Math.max(1.2, Math.round((1 - (t.progress || 35) / 100) * 46 * 10) / 10);
    const pastDist = Math.max(0.8, Math.round(((t.progress || 35) / 100) * 46 * 10) / 10);

    const liveLocDesc = `${pastDist} km ahead of ${lastStName}, approaching ${nextStName} (Speed: ${t.speed} km/h, PF-${t.platformNumber || 1})`;
    const liveLocDescHindi = `${lastStHindi} से ${pastDist} किमी आगे, ${nextStHindi} की ओर अग्रसर (गति: ${t.speed} किमी/घंटा, प्लेटफार्म-${t.platformNumber || 1})`;

    let cause = "Block section signal hold and trailing traffic headway bunching.";
    let causeHindi = "ब्लॉक सेक्शन में सिग्नल प्रतीक्षा एवं आगे धीमी गति से चल रहे ट्रैफिक के कारण देरी।";
    let solutionTitle = "AI High-Speed Precedence & Green Corridor";
    let solutionTitleHindi = "AI हाई-स्पीड ग्रीन कॉरिडोर एवं सिग्नल प्राथमिकता";
    let solutionDetails = `Clear signal blocks ahead, hold slower traffic on siding loop lines, and restore cruising speed to ${t.category === 'Freight' ? 75 : 130} km/h.`;
    let solutionDetailsHindi = `आगे के सभी सिग्नल ग्रीन कर दिए गए हैं, लूप लाइन डायवर्जन लागू किया गया है और गति ${t.category === 'Freight' ? 75 : 130} किमी/घंटा तक बहाल कर दी गई है।`;

    if (t.category === 'Vande Bharat') {
      cause = "Interlocking point route contention with freight rake on main line.";
      causeHindi = "मुख्य लाइन पर मालगाड़ी क्रॉसिंग एवं इंटरलॉकिंग प्वाइंट पर सिग्नल क्लीयरेंस प्रतीक्षा।";
      solutionTitle = "Vande Bharat Absolute Track Clearance";
      solutionTitleHindi = "वंदे भारत पूर्ण ट्रैक क्लीयरेंस एवं ग्रीन वेव";
      solutionDetails = "Lock bi-directional electronic interlocking; clear Main Line 1 through upcoming block sections; reclaim 100% delay.";
      solutionDetailsHindi = "इलेक्ट्रॉनिक इंटरलॉकिंग लॉक, मेन लाइन 1 को पूरी तरह ग्रीन और ट्रेन को 130 किमी/घंटा पर निर्बाध संचालन।";
    } else if (t.category === 'Rajdhani' || t.category === 'Duronto') {
      cause = "Substation OHE voltage regulation and platform clearance delay.";
      causeHindi = "सबस्टेशन OHE वोल्टेज रेगुलेशन एवं आगे स्टेशन पर प्लेटफार्म ऑक्यूपेंसी।";
      solutionTitle = "Trunk Line Dynamic Interlocking Bypass";
      solutionTitleHindi = "ट्रंक लाइन डायनामिक इंटरलॉकिंग बाईपास";
      solutionDetails = "Set automatic green starter signal; bypass degraded switch machines; recover speed to 125 km/h.";
      solutionDetailsHindi = "ऑटोमैटिक ग्रीन स्टार्टर सिग्नल सक्रिय; डायनामिक बाईपास द्वारा 125 किमी/घंटा गति पर समय रिकवरी।";
    } else if (t.category === 'Freight') {
      cause = "Heavy haul rake detention on single-line section awaiting passenger rake passage.";
      causeHindi = "सिंगल लाइन सेक्शन पर एक्सप्रेस ट्रेनों को रास्ता देने हेतु मालगाड़ी का ठहराव।";
      solutionTitle = "Freight Corridors Loop Line Overtake Optimization";
      solutionTitleHindi = "मालगाड़ी लूप लाइन ओवरटेक एवं समर्पित गति स्लॉट";
      solutionDetails = "Regulate rake into dedicated freight bypass siding; dispatch immediately behind express convoy at 75 km/h.";
      solutionDetailsHindi = "मालगाड़ी को समर्पित साइडिंग लूप में लेकर एक्सप्रेस के निकलते ही 75 किमी/घंटा पर रवाना करना।";
    }

    const trainNameHindi = getTrainHindiName(t.trainNumber, t.trainName);

    // Build timeline stops for Where Is My Train
    const routeStations = t.route.map(stId => db.stations.find(s => s.id === stId)).filter(Boolean) as Station[];
    const currentIdx = routeStations.findIndex(s => s.code === t.nextStationCode || s.name === t.nextStation);
    const resolvedCurrentIdx = currentIdx >= 0 ? currentIdx : Math.floor(routeStations.length / 2);

    let cumulativeDist = 0;
    const baseHour = Math.floor((t.scheduledDepartureMin || 360) / 60);
    const baseMin = (t.scheduledDepartureMin || 360) % 60;

    const stops: WhereIsMyTrainLiveStop[] = routeStations.map((st, idx) => {
      const isPast = idx < resolvedCurrentIdx;
      const isCurrent = idx === resolvedCurrentIdx;
      const stopDist = idx === 0 ? 0 : 45 + ((idx * 17) % 25);
      cumulativeDist += stopDist;

      const schedArrHour = (baseHour + Math.floor((idx * 45) / 60)) % 24;
      const schedArrMin = (baseMin + (idx * 45)) % 60;
      const schedDepMin = (schedArrMin + 5) % 60;
      const schedDepHour = (schedArrHour + Math.floor((schedArrMin + 5) / 60)) % 24;

      const schedArrStr = `${String(schedArrHour).padStart(2, '0')}:${String(schedArrMin).padStart(2, '0')}`;
      const schedDepStr = `${String(schedDepHour).padStart(2, '0')}:${String(schedDepMin).padStart(2, '0')}`;

      const stopDelay = isPast ? 0 : isCurrent ? delay : Math.max(0, delay - (idx - resolvedCurrentIdx) * 3);
      const expArrMinTotal = (schedArrHour * 60 + schedArrMin + stopDelay);
      const expArrStr = `${String(Math.floor(expArrMinTotal / 60) % 24).padStart(2, '0')}:${String(expArrMinTotal % 60).padStart(2, '0')}`;
      const expDepMinTotal = expArrMinTotal + 5;
      const expDepStr = `${String(Math.floor(expDepMinTotal / 60) % 24).padStart(2, '0')}:${String(expDepMinTotal % 60).padStart(2, '0')}`;

      const stHindi = getStationHindiName(st.code, st.name);

      return {
        stationCode: st.code,
        stationName: st.name,
        stationNameHindi: stHindi,
        distanceKm: cumulativeDist,
        scheduledArrival: idx === 0 ? '--' : schedArrStr,
        scheduledDeparture: idx === routeStations.length - 1 ? '--' : schedDepStr,
        expectedArrival: idx === 0 ? '--' : expArrStr,
        expectedDeparture: idx === routeStations.length - 1 ? '--' : expDepStr,
        delayMinutes: stopDelay,
        platform: String((idx % 4) + 1),
        status: isPast ? 'Departed' : isCurrent ? 'Current' : 'Upcoming',
        haltMinutes: idx === 0 || idx === routeStations.length - 1 ? 0 : (idx % 2 === 0 ? 5 : 2)
      };
    });

    const voiceAnnouncementHindi = delay > 0
      ? `यात्रीगण कृपया ध्यान दें: गाड़ी संख्या ${t.trainNumber} ${trainNameHindi}, वर्तमान में ${lastStHindi} से ${nextStHindi} के बीच ${delay} मिनट की देरी से चल रही है। देरी का कारण: ${causeHindi}। AI ब्लॉक प्लानर ने समस्या का समाधान कर दिया है: ${solutionTitleHindi} लागू करके सिग्नल को ग्रीन कर दिया गया है और गति ${t.speed} किलोमीटर प्रति घंटा बहाल कर दी गई है।`
      : `यात्रीगण कृपया ध्यान दें: गाड़ी संख्या ${t.trainNumber} ${trainNameHindi}, वर्तमान में ${lastStHindi} से ${nextStHindi} के बीच सही समय पर चल रही है। गति ${t.speed} किलोमीटर प्रति घंटा है। प्लेटफार्म नंबर ${t.platformNumber || 1} पर आगमन अपेक्षित है।`;

    const voiceAnnouncementEnglish = delay > 0
      ? `Attention Passengers: Train number ${t.trainNumber} ${t.trainName} is currently running between ${lastStName} and ${nextStName} delayed by ${delay} minutes. Delay cause: ${cause}. AI Block Planner has solved the problem by applying ${solutionTitle}. Speed is restored to ${t.speed} kilometers per hour.`
      : `Attention Passengers: Train number ${t.trainNumber} ${t.trainName} is running on time between ${lastStName} and ${nextStName} at ${t.speed} kilometers per hour. Scheduled at Platform ${t.platformNumber || 1}.`;

    let speedState: 'CRUISING' | 'SLOWING_CAUTION' | 'APPROACHING_BERTH' | 'HALTED_STATION' | 'ACCELERATING' = 'CRUISING';
    let speedStateReason = `Cruising smoothly on mainline block at ${t.speed} km/h`;
    let speedStateReasonHindi = `मेनलाइन ब्लॉक पर ${t.speed} किमी/घंटे की गति से सुचारू संचालन`;

    if (t.speed === 0) {
      speedState = 'HALTED_STATION';
      speedStateReason = `Halted at ${t.lastStation} Platform ${t.platformNumber || 1} for passenger dwell`;
      speedStateReasonHindi = `${lastStHindi} प्लेटफार्म ${t.platformNumber || 1} पर ठहराव (पैसेंजर बोर्डिंग/डीबोर्डिंग)`;
    } else if (t.statusMessage?.includes('SLOWING (TSR')) {
      speedState = 'SLOWING_CAUTION';
      speedStateReason = `Slowing to ${t.speed} km/h due to Caution Order TSR-30 Track Maintenance`;
      speedStateReasonHindi = `कॉशन ऑर्डर TSR-30 ट्रैक मेंटेनेंस के कारण गति घटकर ${t.speed} किमी/घंटा`;
    } else if (t.statusMessage?.includes('BERTHING') || (t.progress || 0) > 80) {
      speedState = 'APPROACHING_BERTH';
      speedStateReason = `Slowing down (${t.speed} km/h) on approach to ${nextStName} PF-${t.platformNumber || 1}`;
      speedStateReasonHindi = `${nextStHindi} प्लेटफार्म-${t.platformNumber || 1} में प्रवेश हेतु गति मंद (${t.speed} किमी/घंटा)`;
    } else if (t.statusMessage?.includes('DEPARTING') || (t.progress || 0) < 20) {
      speedState = 'ACCELERATING';
      speedStateReason = `Accelerating (${t.speed} km/h) exiting ${lastStName}`;
      speedStateReasonHindi = `${lastStHindi} से प्रस्थान उपरांत गति वर्धन (${t.speed} किमी/घंटा)`;
    }

    return {
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      trainNameHindi,
      category: t.category,
      currentSpeed: t.speed,
      maxSpeed: t.category === 'Vande Bharat' ? 160 : t.category === 'Freight' ? 75 : 130,
      speedState,
      speedStateReason,
      speedStateReasonHindi,
      status: delay > 0 ? 'DELAYED' : 'ON_TIME',
      liveLocationDesc: liveLocDesc,
      liveLocationDescHindi: liveLocDescHindi,
      nextStation: nextStName,
      nextStationHindi: nextStHindi,
      nextStationCode: t.nextStationCode || '',
      lastStation: lastStName,
      lastStationHindi: lastStHindi,
      lastStationCode: t.lastStationCode || '',
      distanceToNextStationKm: distToNext,
      etaNextStation: t.expectedArrival || '14:35',
      platformNumber: t.platformNumber || 1,
      delayMinutes: delay,
      delayCause: cause,
      delayCauseHindi: causeHindi,
      aiSolutionTitle: solutionTitle,
      aiSolutionTitleHindi: solutionTitleHindi,
      aiSolutionDetails: solutionDetails,
      aiSolutionDetailsHindi: solutionDetailsHindi,
      voiceAnnouncementHindi,
      voiceAnnouncementEnglish,
      stops,
      isLiveGPS: true,
      gpsAccuracyMeters: 8,
      lastUpdated: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ntesSourceUrl: "https://enquiry.indianrail.gov.in/mntes/",
      ntesGatewaySynced: true
    };
  }

  // NTES Spot Your Train Report Generator (enquiry.indianrail.gov.in/mntes/)
  function generateNTESSpotYourTrainReport(trainNum: string, day: string = 'TODAY'): NTESSpotYourTrainResult | null {
    const t = db.trains.find(tr => tr.trainNumber === trainNum || tr.id === trainNum);
    if (!t) return null;

    const delay = Math.max(t.delayMinutes, t.predictedDelay);
    const lastStName = stationCodeMap.get(t.lastStationCode || '')?.name || t.lastStation || 'Origin';
    const lastStHindi = getStationHindiName(t.lastStationCode || '', lastStName);
    const nextStName = stationCodeMap.get(t.nextStationCode || '')?.name || t.nextStation || 'Destination';
    const nextStHindi = getStationHindiName(t.nextStationCode || '', nextStName);
    const trainNameHindi = getTrainHindiName(t.trainNumber, t.trainName);

    const distToNext = Math.max(1.2, Math.round((1 - (t.progress || 35) / 100) * 46 * 10) / 10);
    const pastDist = Math.max(0.8, Math.round(((t.progress || 35) / 100) * 46 * 10) / 10);

    const routeStations = t.route.map(stId => db.stations.find(s => s.id === stId)).filter(Boolean) as Station[];
    const currentIdx = routeStations.findIndex(s => s.code === t.nextStationCode || s.name === t.nextStation);
    const resolvedCurrentIdx = currentIdx >= 0 ? currentIdx : Math.floor(routeStations.length / 2);

    let speedState: 'CRUISING' | 'SLOWING_CAUTION' | 'APPROACHING_BERTH' | 'HALTED_STATION' | 'ACCELERATING' = 'CRUISING';
    if (t.speed === 0) speedState = 'HALTED_STATION';
    else if (t.statusMessage?.includes('SLOWING (TSR')) speedState = 'SLOWING_CAUTION';
    else if (t.statusMessage?.includes('BERTHING') || (t.progress || 0) > 80) speedState = 'APPROACHING_BERTH';
    else if (t.statusMessage?.includes('DEPARTING') || (t.progress || 0) < 20) speedState = 'ACCELERATING';

    const lastTimeStr = new Date(Date.now() - (t.dataFreshnessSeconds || 5) * 1000).toLocaleTimeString('en-US', { hour12: false });

    let cumulativeDist = 0;
    const baseHour = Math.floor((t.scheduledDepartureMin || 360) / 60);
    const baseMin = (t.scheduledDepartureMin || 360) % 60;

    const stationSchedule = routeStations.map((st, idx) => {
      const isPast = idx < resolvedCurrentIdx;
      const isCurrent = idx === resolvedCurrentIdx;
      const stopDist = idx === 0 ? 0 : 45 + ((idx * 17) % 25);
      cumulativeDist += stopDist;

      const schedArrHour = (baseHour + Math.floor((idx * 45) / 60)) % 24;
      const schedArrMin = (baseMin + (idx * 45)) % 60;
      const schedDepMin = (schedArrMin + 5) % 60;
      const schedDepHour = (schedArrHour + Math.floor((schedArrMin + 5) / 60)) % 24;

      const schedArrStr = `${String(schedArrHour).padStart(2, '0')}:${String(schedArrMin).padStart(2, '0')}`;
      const schedDepStr = `${String(schedDepHour).padStart(2, '0')}:${String(schedDepMin).padStart(2, '0')}`;

      const stopDelay = isPast ? 0 : isCurrent ? delay : Math.max(0, delay - (idx - resolvedCurrentIdx) * 3);
      const expArrMinTotal = (schedArrHour * 60 + schedArrMin + stopDelay);
      const expArrStr = `${String(Math.floor(expArrMinTotal / 60) % 24).padStart(2, '0')}:${String(expArrMinTotal % 60).padStart(2, '0')}`;
      const expDepMinTotal = expArrMinTotal + 5;
      const expDepStr = `${String(Math.floor(expDepMinTotal / 60) % 24).padStart(2, '0')}:${String(expDepMinTotal % 60).padStart(2, '0')}`;

      const stHindi = getStationHindiName(st.code, st.name);

      return {
        sNo: idx + 1,
        stationCode: st.code,
        stationName: st.name,
        stationNameHindi: stHindi,
        day: 1,
        schedArr: idx === 0 ? 'SRC' : schedArrStr,
        schedDep: idx === routeStations.length - 1 ? 'DST' : schedDepStr,
        actArr: idx === 0 ? 'SRC' : isPast ? schedArrStr : expArrStr,
        actDep: idx === routeStations.length - 1 ? 'DST' : isPast ? schedDepStr : expDepStr,
        delayMins: stopDelay,
        platform: String((idx % 4) + 1),
        distanceKm: cumulativeDist,
        status: (isPast ? 'Departed' : isCurrent ? 'Current' : 'Upcoming') as 'Departed' | 'Current' | 'Upcoming'
      };
    });

    const statusSummary = delay === 0 
      ? `Right Time. Passed ${lastStName} at ${lastTimeStr}, expected at ${nextStName} at ${t.expectedArrival || '14:35'} (Speed: ${t.speed} km/h).`
      : `Running Late by ${delay} mins. Departed ${lastStName} with ${delay} min delay, approaching ${nextStName} (Speed: ${t.speed} km/h).`;

    const statusSummaryHindi = delay === 0
      ? `सही समय पर। ${lastStHindi} से ${lastTimeStr} बजे प्रस्थान, ${nextStHindi} पर संभावित आगमन ${t.expectedArrival || '14:35'} (गति: ${t.speed} किमी/घंटा)।`
      : `${delay} मिनट की देरी से चल रही है। ${lastStHindi} से देरी से रवाना, ${nextStHindi} की ओर अग्रसर (गति: ${t.speed} किमी/घंटा)।`;

    return {
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      trainNameHindi,
      source: routeStations[0]?.name || t.source || 'BSP',
      destination: routeStations[routeStations.length - 1]?.name || t.destination || 'NGP',
      startDate: new Date().toISOString().split('T')[0],
      currentStation: t.nextStation || nextStName,
      currentStationHindi: nextStHindi,
      lastReportedStation: lastStName,
      lastReportedStationHindi: lastStHindi,
      lastReportedTime: lastTimeStr,
      nextStation: nextStName,
      nextStationHindi: nextStHindi,
      distanceToNextKm: distToNext,
      etaNextStation: t.expectedArrival || '14:35',
      delayMinutes: delay,
      statusSummary,
      statusSummaryHindi,
      speedKmH: t.speed,
      speedState,
      platform: `PF-${t.platformNumber || 1}`,
      officialNTESUrl: "https://enquiry.indianrail.gov.in/mntes/",
      lastSyncedTimestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      stationSchedule
    };
  }

  // NTES Live Station Board Generator (enquiry.indianrail.gov.in/mntes/)
  function generateNTESLiveStationReport(stationCode: string, hours: number = 4) {
    const st = db.stations.find(s => s.code.toUpperCase() === stationCode.toUpperCase() || s.id === stationCode);
    const targetCode = st ? st.code : stationCode.toUpperCase();
    const stName = st ? st.name : stationCode;
    const stHindi = getStationHindiName(targetCode, stName);

    const relevantTrains: NTESLiveStationEntry[] = [];

    db.trains.forEach((t, idx) => {
      const hasStation = t.route.includes(st?.id || '') || t.lastStationCode === targetCode || t.nextStationCode === targetCode;
      if (hasStation || idx % 2 === 0) {
        const delay = Math.max(t.delayMinutes, t.predictedDelay);
        const schedH = (8 + idx * 2) % 24;
        const schedArr = `${String(schedH).padStart(2, '0')}:15`;
        const schedDep = `${String(schedH).padStart(2, '0')}:25`;
        
        const expH = (schedH + Math.floor(delay / 60)) % 24;
        const expM = (15 + (delay % 60)) % 60;
        const expArr = `${String(expH).padStart(2, '0')}:${String(expM).padStart(2, '0')}`;
        const expDep = `${String(expH).padStart(2, '0')}:${String((expM + 10) % 60).padStart(2, '0')}`;

        const isDeparted = t.lastStationCode === targetCode && (t.progress || 0) > 15;
        const isCurrent = (t.lastStationCode === targetCode && (t.progress || 0) <= 15) || (t.nextStationCode === targetCode && (t.progress || 0) > 85);

        relevantTrains.push({
          trainNumber: t.trainNumber,
          trainName: t.trainName,
          trainNameHindi: getTrainHindiName(t.trainNumber, t.trainName),
          sourceStation: t.source || 'Bilaspur (BSP)',
          destinationStation: t.destination || 'Nagpur (NGP)',
          scheduledArrival: schedArr,
          scheduledDeparture: schedDep,
          expectedArrival: expArr,
          expectedDeparture: expDep,
          delayMinutes: delay,
          platform: `PF-${t.platformNumber || (idx % 4) + 1}`,
          status: isDeparted ? 'Departed' : isCurrent ? 'At Platform' : delay > 0 ? `Late by ${delay}m` : 'On Time (Expected)',
          haltTimeMinutes: 10
        });
      }
    });

    return {
      stationCode: targetCode,
      stationName: stName,
      stationNameHindi: stHindi,
      queryHours: hours,
      officialSource: "https://enquiry.indianrail.gov.in/mntes/",
      queryTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
      totalTrains: relevantTrains.length,
      trains: relevantTrains
    };
  }

  // NTES API Endpoints
  app.get("/api/ntes/spot-your-train/:trainNumber", (req, res) => {
    const report = generateNTESSpotYourTrainReport(req.params.trainNumber, String(req.query.day || 'TODAY'));
    if (!report) {
      return res.status(404).json({ error: `Train ${req.params.trainNumber} not found in NTES gateway.` });
    }
    res.json(report);
  });

  app.get("/api/ntes/live-station/:stationCode", (req, res) => {
    const hours = parseInt(String(req.query.hours || '4'), 10);
    const report = generateNTESLiveStationReport(req.params.stationCode, hours);
    res.json(report);
  });

  app.get("/api/ntes/pacing", (req, res) => {
    res.json({
      config: ntesPacingConfig,
      simulationTime: db.simulationTime,
      activeTrains: db.trains.length,
      officialUrl: "https://enquiry.indianrail.gov.in/mntes/",
      timestamp: new Date().toLocaleTimeString()
    });
  });

  app.post("/api/ntes/pacing", (req, res) => {
    const { mode, playbackSpeed, slowOnCautionEnabled, slowOnApproachEnabled } = req.body;
    if (mode) ntesPacingConfig.mode = mode;
    if (playbackSpeed !== undefined) {
      ntesPacingConfig.playbackSpeed = Math.max(0.1, Math.min(5, Number(playbackSpeed)));
    }
    if (slowOnCautionEnabled !== undefined) ntesPacingConfig.slowOnCautionEnabled = Boolean(slowOnCautionEnabled);
    if (slowOnApproachEnabled !== undefined) ntesPacingConfig.slowOnApproachEnabled = Boolean(slowOnApproachEnabled);

    res.json({
      success: true,
      message: `NTES simulation pacing updated to ${ntesPacingConfig.mode} at ${ntesPacingConfig.playbackSpeed}x.`,
      config: ntesPacingConfig
    });
  });

  app.get("/api/ntes/bulletin", (req, res) => {
    res.json({
      source: "CRIS / NTES (National Train Enquiry System)",
      officialUrl: "https://enquiry.indianrail.gov.in/mntes/",
      publishedAt: new Date().toLocaleTimeString(),
      zone: "SECR / SER (South East Central Railway & South Eastern Railway)",
      rescheduledTrains: [
        { trainNo: "12834", name: "HWH-ADI SF Express", originalTime: "10:30", revisedTime: "11:45", delay: 75, reason: "Late arrival of incoming rake" }
      ],
      divertedTrains: [
        { trainNo: "BOXN-9402", name: "Coal Heavy Haul Freight", routeVia: "Bypass Siding Line 3 (Durg - Bhilai)", reason: "Express precedence corridor" }
      ],
      cancelledTrains: []
    });
  });

  // Where Is My Train Endpoints
  app.get("/api/where-is-my-train", (req, res) => {
    const list = db.trains.map(t => generateWhereIsMyTrainReport(t.trainNumber)).filter(Boolean);
    res.json({ trains: list, count: list.length, timestamp: new Date().toLocaleTimeString() });
  });

  app.get("/api/where-is-my-train/:trainNumber", (req, res) => {
    const data = generateWhereIsMyTrainReport(req.params.trainNumber);
    if (!data) {
      return res.status(404).json({ error: "Train not found in Where Is My Train live feed." });
    }
    res.json(data);
  });

  // Delay Identification & Problem Solving Engine with Hindi Voice Support
  function generateDelayedTrainsAnalysis(): DelayIdentificationReport {
    const delayedList: DelayedTrainAnalysis[] = [];
    let totalDelay = 0;

    db.trains.forEach((t) => {
      const delay = Math.max(t.delayMinutes, t.predictedDelay);
      if (delay > 0) {
        totalDelay += delay;
        
        const lastSt = stationCodeMap.get(t.lastStationCode || '')?.name || t.lastStation || 'Origin';
        const nextSt = stationCodeMap.get(t.nextStationCode || '')?.name || t.nextStation || 'Destination';
        const lastStHindi = getStationHindiName(t.lastStationCode || '', lastSt);
        const nextStHindi = getStationHindiName(t.nextStationCode || '', nextSt);
        const loc = `${lastSt} ➔ ${nextSt}`;
        const locHindi = `${lastStHindi} ➔ ${nextStHindi}`;

        let cause = "Block section signal hold and trailing traffic headway bunching.";
        let causeHindi = "ब्लॉक सेक्शन में सिग्नल प्रतीक्षा एवं आगे ट्रैफिक की गति धीमी होने से देरी।";
        let solutionTitle = "AI High-Speed Precedence & Green Corridor";
        let solutionTitleHindi = "AI हाई-स्पीड ग्रीन कॉरिडोर एवं सिग्नल प्राथमिकता";
        let solutionDetails = `Clear signal blocks ahead, hold slower traffic on siding loop lines, and restore cruising speed to ${t.category === 'Freight' ? 75 : 130} km/h.`;
        let solutionDetailsHindi = `आगे के सिग्नल ग्रीन कर दिए गए हैं, लूप लाइन डायवर्जन लागू है और गति ${t.category === 'Freight' ? 75 : 130} किमी/घंटा बहाल की गई है।`;
        let restoredSpeed = 130;
        let priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';

        if (t.category === 'Vande Bharat') {
          cause = "Priority route contention at interlocking crossover and headway regulation.";
          causeHindi = "मुख्य लाइन पर मालगाड़ी क्रॉसिंग एवं इलेक्ट्रॉनिक इंटरलॉकिंग पर प्राथमिकता क्लीयरेंस।";
          solutionTitle = "Vande Bharat Absolute Track Clearance";
          solutionTitleHindi = "वंदे भारत पूर्ण ट्रैक क्लीयरेंस एवं ग्रीन वेव";
          solutionDetails = "Lock bi-directional electronic interlocking; clear Main Line 1 through all upcoming block sections; reclaim 100% delay.";
          solutionDetailsHindi = "इलेक्ट्रॉनिक इंटरलॉकिंग लॉक; मेन लाइन 1 को ग्रीन किया गया; 100% देरी समाप्त।";
          restoredSpeed = 130;
          priorityLevel = delay > 5 ? 'CRITICAL' : 'HIGH';
        } else if (t.category === 'Rajdhani' || t.category === 'Duronto') {
          cause = "Substation OHE voltage regulation and intermediate platform clearance delay.";
          causeHindi = "सबस्टेशन OHE वोल्टेज रेगुलेशन एवं आगे स्टेशन पर प्लेटफार्म ऑक्यूपेंसी।";
          solutionTitle = "Trunk Line Dynamic Interlocking Bypass";
          solutionTitleHindi = "ट्रंक लाइन डायनामिक इंटरलॉकिंग बाईपास";
          solutionDetails = "Set automatic green starter signal; bypass degraded switch machines; recover speed to 125 km/h.";
          solutionDetailsHindi = "ऑटोमैटिक ग्रीन स्टार्टर सिग्नल सक्रिय; 125 किमी/घंटा गति पर समय रिकवरी।";
          restoredSpeed = 125;
          priorityLevel = delay > 10 ? 'CRITICAL' : 'HIGH';
        } else if (t.category === 'Freight') {
          cause = "Heavy haul rake detention on single-line section awaiting passenger rake passage.";
          causeHindi = "सिंगल लाइन सेक्शन पर एक्सप्रेस ट्रेनों को पास कराने हेतु मालगाड़ी का ठहराव।";
          solutionTitle = "Freight Corridors Loop Line Overtake Optimization";
          solutionTitleHindi = "मालगाड़ी लूप लाइन ओवरटेक एवं समर्पित गति स्लॉट";
          solutionDetails = "Regulate rake into dedicated freight bypass siding; dispatch immediately behind express convoy at 75 km/h.";
          solutionDetailsHindi = "मालगाड़ी को साइडिंग लूप में पार्क कर एक्सप्रेस के निकलते ही 75 किमी/घंटा पर रवाना करना।";
          restoredSpeed = 75;
          priorityLevel = 'MEDIUM';
        } else {
          cause = "Interlocking point machine hold and platform line occupancy downstream.";
          causeHindi = "प्वाइंट मशीन होल्ड एवं आगे के स्टेशन पर प्लेटफार्म लाइन व्यस्तता।";
          solutionTitle = "Dynamic Platform Allocation & Signal Reset";
          solutionTitleHindi = "डायनामिक प्लेटफार्म आवंटन एवं सिग्नल रीसेट";
          solutionDetails = "Auto-assign Platform 2 with green aspect, unlocking continuous run through division boundary.";
          solutionDetailsHindi = "प्लेटफार्म 2 को ग्रीन सिग्नल के साथ आवंटित कर ट्रेन को निर्बाध गति दी गई।";
          restoredSpeed = 110;
          priorityLevel = delay > 20 ? 'CRITICAL' : 'HIGH';
        }

        const trainHindi = getTrainHindiName(t.trainNumber, t.trainName);
        const voiceHindi = `गाड़ी संख्या ${t.trainNumber} ${trainHindi}: यह ट्रेन ${locHindi} के बीच ${delay} मिनट की देरी से चल रही है। देरी का कारण: ${causeHindi}। AI समाधान: ${solutionTitleHindi}। गति ${restoredSpeed} किमी/घंटा बहाल।`;
        const voiceEng = `Train ${t.trainNumber} ${t.trainName} running between ${loc} is delayed by ${delay} minutes due to ${cause}. AI Solution: ${solutionTitle}. Restored speed to ${restoredSpeed} km/h.`;

        delayedList.push({
          trainNumber: t.trainNumber,
          trainName: t.trainName,
          trainNameHindi: trainHindi,
          category: t.category,
          type: t.type,
          delayMinutes: delay,
          location: loc,
          locationHindi: locHindi,
          lastStation: lastSt,
          nextStation: nextSt,
          cause,
          causeHindi,
          solutionTitle,
          solutionTitleHindi,
          solutionDetails,
          solutionDetailsHindi,
          delaySavings: delay,
          restoredSpeed,
          priorityLevel,
          voiceScriptHindi: voiceHindi,
          voiceScriptEnglish: voiceEng
        });
      }
    });

    delayedList.sort((a, b) => b.delayMinutes - a.delayMinutes);

    const degradedSegments = db.segments.filter(s => s.status === 'Degraded');
    const degradedCount = degradedSegments.length;
    const primaryBottleneck = degradedSegments.length > 0 
      ? `Degraded track on ${degradedSegments.map(s => s.name).join(', ')} with active signal hold`
      : `Peak headway congestion across Bilaspur, Raipur, and Nagpur corridors`;
    const primaryBottleneckHindi = degradedSegments.length > 0
      ? `${degradedSegments.map(s => s.name).join(', ')} ट्रैक पर खराबी एवं सिग्नल अवरोध`
      : `बिलासपुर, रायपुर एवं नागपुर रेलखंड में व्यस्ततम समय का सिग्नल कंजेक्शन`;

    const trainCount = delayedList.length;
    let voiceSummaryText = '';
    let voiceSummaryHindi = '';
    let voiceDetailedScript = '';
    let voiceDetailedScriptHindi = '';

    if (trainCount > 0) {
      const topTrainsEng = delayedList.slice(0, 4).map(t => `Train ${t.trainNumber} ${t.trainName} delayed by ${t.delayMinutes} minutes`).join('. ');
      const topTrainsHindi = delayedList.slice(0, 4).map(t => `गाड़ी ${t.trainNumber} ${t.trainNameHindi || t.trainName} ${t.delayMinutes} मिनट लेट`).join('; ');

      voiceSummaryText = `Attention Division Control: Identified ${trainCount} delayed trains across SECR and SER corridors, with ${totalDelay} minutes total delay. Primary bottleneck: ${primaryBottleneck}. AI has prepared complete delay resolution.`;
      voiceSummaryHindi = `यात्रीगण एवं कंट्रोल रूम ध्यान दें: बिलासपुर, रायपुर एवं नागपुर मंडल में कुल ${trainCount} गाड़ियाँ ${totalDelay} मिनट की देरी से चल रही हैं। मुख्य कारण: ${primaryBottleneckHindi}। AI ब्लॉक प्लानर ने समस्या का पूर्ण समाधान तैयार कर लिया है।`;

      voiceDetailedScript = `Attention Division Control. AI diagnostic complete. Identified ${trainCount} delayed trains across the network, totaling ${totalDelay} minutes of delay. Key delayed trains include: ${topTrainsEng}. Executing AI Multi-Objective Network Resolution: Clearing signal holds, resetting degraded track sections, locking green interlockings, and restoring cruising speeds. All ${trainCount} train delays are cleared to zero minutes.`;
      voiceDetailedScriptHindi = `यात्रीगण कृपया ध्यान दें: AI ब्लॉक प्लानर डायग्नोस्टिक पूर्ण हुआ। रेल नेटवर्क में कुल ${trainCount} लेट गाड़ियाँ पहचानी गईं, कुल देरी ${totalDelay} मिनट है। मुख्य लेट गाड़ियाँ: ${topTrainsHindi}। AI द्वारा सभी सिग्नल ग्रीन कर दिए गए हैं, ट्रैक की समस्या हल हो गई है और गाड़ियाँ 130 किमी/घंटा की गति से समय पर चल रही हैं।`;
    } else {
      voiceSummaryText = `All trains across SECR and SER divisions are operating on time with zero delay. Network health is 100 percent.`;
      voiceSummaryHindi = `भारतीय रेल SECR एवं SER मंडल की सभी गाड़ियाँ पूर्णतः सही समय पर चल रही हैं। कोई देरी नहीं है और नेटवर्क स्वास्थ्य 100 प्रतिशत है।`;
      voiceDetailedScript = `Attention Division Control: All trains are currently running on schedule with zero detected delays. Track circuits and electronic interlockings are all green and clear.`;
      voiceDetailedScriptHindi = `यात्रीगण कृपया ध्यान दें: सभी रेलगाड़ियाँ अपने निर्धारित समय पर चल रही हैं। इलेक्ट्रॉनिक इंटरलॉकिंग एवं सभी सिग्नल पूर्णतः ग्रीन हैं।`;
    }

    return {
      totalDelayedTrains: trainCount,
      totalDelayMinutes: totalDelay,
      delayedTrains: delayedList,
      degradedSegmentsCount: degradedCount,
      primaryBottleneck,
      primaryBottleneckHindi,
      voiceSummaryText,
      voiceSummaryHindi,
      voiceDetailedScript,
      voiceDetailedScriptHindi,
      resolutionSummary: `Identified ${trainCount} delayed trains (${totalDelay} min delay). AI resolution prepared for immediate execution.`,
      resolutionSummaryHindi: `${trainCount} लेट गाड़ियाँ (${totalDelay} मिनट कुल देरी) पहचानी गईं। AI समाधान तत्काल क्रियान्वयन हेतु तैयार है।`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
  }

  // Delay Report Endpoint
  app.get("/api/delays/report", (req, res) => {
    res.json(generateDelayedTrainsAnalysis());
  });

  // Solve All Delays Endpoint with Hindi & English Voice
  app.post("/api/delays/solve-all", (req, res) => {
    const beforeReport = generateDelayedTrainsAnalysis();
    const trainCount = beforeReport.totalDelayedTrains;
    const savedMinutes = beforeReport.totalDelayMinutes;

    // Reset and solve all trains
    db.trains.forEach(t => {
      t.predictedDelay = 0;
      t.delayMinutes = 0;
      t.delayPropagation = 0;
      t.status = 'RUNNING';
      t.appliedPlanOption = 'AI_REROUTE';
      t.statusMessage = 'AI RESOLVED: Delay cleared to 0m | Speed restored to 130 km/h';
      t.assignedActionIcon = 'Zap';
      t.aiAgentState = 'Optimized';
      if (t.category === 'Vande Bharat' || t.category === 'Rajdhani') {
        t.speed = 130;
        t.targetPlatformResolved = 1;
        t.trackAssignment = 'MAIN LINE (PF-1 RESERVED)';
      } else if (t.category === 'Superfast') {
        t.speed = 110;
        t.trackAssignment = 'MAIN LINE';
      } else {
        t.speed = 75;
      }
    });

    // Repair degraded track segments
    db.segments.forEach(s => {
      if (s.status === 'Degraded') {
        s.status = 'Operational';
        s.maintenanceRequired = false;
        s.maintenanceDurationMinutes = 0;
        s.maintenanceRisk = 15;
      }
    });

    db.networkHealth = 100;
    db.assetKPIs.network = 100;
    db.assetKPIs.tracks = 100;
    db.assetKPIs.trains = 100;
    db.activeAlerts = 0;

    const afterReport = generateDelayedTrainsAnalysis();

    const voiceAnnouncementHindi = trainCount > 0
      ? `यात्रीगण कृपया ध्यान दें: AI ब्लॉक प्लानर द्वारा सभी ${trainCount} लेट ट्रेनों की समस्या का सफल समाधान कर दिया गया है। कुल ${savedMinutes} मिनट की देरी समाप्त कर दी गई है। सभी इलेक्ट्रॉनिक इंटरलॉकिंग को ग्रीन सिग्नल पर लॉक कर दिया गया है, ट्रैक दुरुस्त हो चुके हैं और ट्रेनों की गति 130 किलोमीटर प्रति घंटा बहाल कर दी गई है।`
      : `यात्रीगण कृपया ध्यान दें: रेल नेटवर्क पूर्णतः अनुकूलित है। सभी गाड़ियाँ सही समय पर चल रही हैं।`;

    const voiceAnnouncementEnglish = trainCount > 0
      ? `Attention Division Control. All ${trainCount} delayed trains have been successfully resolved by the AI Block Planner. A total of ${savedMinutes} delay minutes have been cleared. All electronic interlockings are locked on green aspects, degraded tracks repaired, and speeds restored up to 130 kilometers per hour.`
      : `Attention Division Control. Network is fully optimized. All trains are running on time with zero delay.`;

    res.json({
      success: true,
      totalResolved: trainCount,
      minutesReclaimed: savedMinutes,
      beforeReport,
      afterReport,
      voiceAnnouncement: voiceAnnouncementEnglish,
      voiceAnnouncementHindi,
      voiceAnnouncementEnglish,
      voiceScript: voiceAnnouncementEnglish,
      voiceScriptHindi: voiceAnnouncementHindi,
      resolvedSummary: `Successfully resolved ${trainCount} delayed trains. Cleared ${savedMinutes} minutes of cumulative delay across SECR and SER corridors. Network health restored to 100%.`,
      resolvedSummaryHindi: `सभी ${trainCount} लेट ट्रेनों का समाधान पूर्ण। ${savedMinutes} मिनट की देरी समाप्त। नेटवर्क स्वास्थ्य 100%।`,
      updatedDb: db
    });
  });

  // Solve Single Train Delay Endpoint with Hindi & English Voice
  app.post("/api/delays/solve-train", (req, res) => {
    const { trainNumber } = req.body;
    const train = db.trains.find(t => t.trainNumber === trainNumber || t.id === trainNumber);
    if (!train) {
      return res.status(404).json({ error: "Train not found" });
    }

    const previousDelay = Math.max(train.delayMinutes, train.predictedDelay);
    train.predictedDelay = 0;
    train.delayMinutes = 0;
    train.delayPropagation = 0;
    train.status = 'RUNNING';
    train.appliedPlanOption = 'AI_REROUTE';
    train.statusMessage = `AI RESOLVED: Delay cleared from +${previousDelay}m to 0m | Full Green Signal`;
    train.assignedActionIcon = 'Zap';
    train.aiAgentState = 'Optimized';
    train.speed = train.category === 'Freight' ? 75 : 130;
    train.trackAssignment = 'MAIN LINE (AI RESERVED)';

    const trainHindi = getTrainHindiName(train.trainNumber, train.trainName);

    const voiceAnnouncementHindi = `यात्रीगण कृपया ध्यान दें: गाड़ी संख्या ${train.trainNumber} ${trainHindi} की ${previousDelay} मिनट की देरी को AI ब्लॉक प्लानर द्वारा शून्य कर दिया गया है। ग्रीन सिग्नल लॉक कर दिया गया है और ट्रेन 130 किलोमीटर प्रति घंटा की गति से समय पर चल रही है।`;
    const voiceAnnouncementEnglish = `Train ${train.trainNumber} ${train.trainName} has been resolved by AI. The previous ${previousDelay} minute delay is now cleared to zero minutes. Green aspect signal locked at 130 kilometers per hour.`;

    res.json({
      success: true,
      train,
      previousDelay,
      voiceAnnouncement: voiceAnnouncementEnglish,
      voiceAnnouncementHindi,
      voiceAnnouncementEnglish,
      message: `Train ${train.trainNumber} delay resolved.`
    });
  });

  // AI Voice Agent Query Handler with Gemini and Bilingual Hindi/English Support
  app.post("/api/ask-ai", async (req, res) => {
    const { question, context, language = 'hi' } = req.body;
    const q = (question || "").toLowerCase();
    const isHindiRequested = language === 'hi' || /[अ-ह]/.test(question || "") || q.includes("hindi") || q.includes("हिंदी") || q.includes("कहाँ") || q.includes("लेट") || q.includes("समस्या");

    // Check if query is for Where Is My Train / Live Location
    const trainMatch = (question || "").match(/\b(20825|20826|20898|12441|12222|12834|18237|12810|12069|12860|9402|7731)\b/);
    if (trainMatch || q.includes("where is my train") || q.includes("मेरी ट्रेन") || q.includes("कहाँ है") || q.includes("live location") || q.includes("लाइव लोकेशन")) {
      const trainNum = trainMatch ? trainMatch[1] : '20825';
      const wData = generateWhereIsMyTrainReport(trainNum);
      if (wData) {
        const text = isHindiRequested ? wData.voiceAnnouncementHindi : wData.voiceAnnouncementEnglish;
        return res.json({
          answer: text,
          voiceScript: text,
          voiceAnnouncementHindi: wData.voiceAnnouncementHindi,
          voiceAnnouncementEnglish: wData.voiceAnnouncementEnglish,
          whereIsMyTrain: wData
        });
      }
    }

    // Check if query is about delayed trains or solving delays
    if (q.includes("delay") || q.includes("solve") || q.includes("identify") || q.includes("problem") || q.includes("late") || q.includes("why") || q.includes("लेट") || q.includes("हल") || q.includes("समाधान") || q.includes("देरी")) {
      const report = generateDelayedTrainsAnalysis();
      
      if (q.includes("solve") || q.includes("fix") || q.includes("clear") || q.includes("हल") || q.includes("दूर") || q.includes("समाधान")) {
        // Trigger solve-all automatically
        const trainCount = report.totalDelayedTrains;
        const savedMinutes = report.totalDelayMinutes;

        db.trains.forEach(t => {
          t.predictedDelay = 0;
          t.delayMinutes = 0;
          t.delayPropagation = 0;
          t.status = 'RUNNING';
          t.appliedPlanOption = 'AI_REROUTE';
          t.statusMessage = 'AI RESOLVED: Delay cleared to 0m | Speed restored to 130 km/h';
        });
        db.segments.forEach(s => {
          if (s.status === 'Degraded') {
            s.status = 'Operational';
            s.maintenanceRequired = false;
            s.maintenanceRisk = 15;
          }
        });
        db.networkHealth = 100;
        db.activeAlerts = 0;

        const voiceAnswerHindi = `AI ब्लॉक प्लानर द्वारा सभी ${trainCount} लेट ट्रेनों का समाधान कर दिया गया है। ${savedMinutes} मिनट की कुल देरी समाप्त कर दी गई है। सिग्नल ग्रीन हैं और ट्रेनें 130 किमी/घंटा की गति से चल रही हैं।`;
        const voiceAnswerEng = `Identified and resolved ${trainCount} delayed trains across SECR and SER divisions. Total delay of ${savedMinutes} minutes has been cleared to zero. Signals set to green and speed restored to 130 km/h.`;

        const chosenVoice = isHindiRequested ? voiceAnswerHindi : voiceAnswerEng;

        return res.json({
          answer: chosenVoice,
          voiceScript: chosenVoice,
          voiceAnnouncementHindi: voiceAnswerHindi,
          voiceAnnouncementEnglish: voiceAnswerEng,
          actionTaken: 'SOLVED_ALL_DELAYS',
          report
        });
      }

      // If just identifying
      const chosenText = isHindiRequested ? report.voiceDetailedScriptHindi : report.voiceDetailedScript;
      return res.json({
        answer: chosenText,
        voiceScript: chosenText,
        voiceAnnouncementHindi: report.voiceDetailedScriptHindi,
        voiceAnnouncementEnglish: report.voiceDetailedScript,
        report
      });
    }

    // Try Gemini if configured
    const gemini = getGemini();
    if (gemini && process.env.GEMINI_API_KEY) {
      try {
        const delayed = db.trains.filter(t => t.delayMinutes > 0 || t.predictedDelay > 0);
        const prompt = `You are the Indian Railways AI Voice Dispatch Agent for Bilaspur, Raipur, Nagpur, and Chakradharpur divisions.
Question: "${question}".
Language preference: ${isHindiRequested ? 'Hindi (भारतीय हिन्दी भाषा - शुद्ध रेलवे उद्घोषणा शैली)' : 'English'}.
Current Network State:
- Delayed Trains (${delayed.length}): ${delayed.map(t => `${t.trainNumber} ${t.trainName} (Delay: +${t.delayMinutes}m, Location: ${t.lastStation} to ${t.nextStation})`).join('; ')}
- Network Health: ${db.networkHealth}%
- Degraded Segments: ${db.segments.filter(s => s.status === 'Degraded').map(s => s.name).join(', ') || 'None'}

Provide a clear, authentic railway voice announcement (2-3 sentences max) in ${isHindiRequested ? 'Hindi (हिंदी Devanagari script, starting with "यात्रीगण कृपया ध्यान दें" or "कंट्रोल रूम सूचना")' : 'English'}. Include train numbers and AI resolution clearly.`;

        const response = await gemini.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
        });

        const text = response.text || (isHindiRequested ? "AI विश्लेषण: सभी रेलवे ट्रैक सर्किट एवं सिग्नल सक्रिय हैं।" : "AI analysis confirmed: All railway track circuits are monitored.");
        return res.json({ answer: text, voiceScript: text, voiceAnnouncementHindi: text, voiceAnnouncementEnglish: text });
      } catch (geminiErr) {
        console.warn("Gemini call failed, using rule engine fallback:", geminiErr);
      }
    }

    // Rule-based fallback response
    let answerHindi = `रेलवे वॉइस एजेंट: SECR और SER मंडल के 18 स्टेशनों पर लाइव टेलीमेट्री सक्रिय है। सभी गाड़ियों का लाइव लोकेशन ट्रैक किया जा रहा है।`;
    let answerEng = `Railway Voice Agent: Telemetry synchronized across 18 stations. All train movements and track circuits are active.`;

    if (q.includes("vande bharat") || q.includes("वंदे भारत")) {
      answerHindi = "गाड़ी 20825 वंदे भारत एक्सप्रेस बिलासपुर-नागपुर रूट पर 130 किमी/घंटा की गति से ग्रीन सिग्नल पर चल रही है।";
      answerEng = "Vande Bharat Express 20825 is cruising at 130 km/h with clear signal block on the Bilaspur-Nagpur corridor.";
    } else if (q.includes("status") || q.includes("health") || q.includes("स्थिति")) {
      answerHindi = `रेलवे नेटवर्क स्वास्थ्य ${db.networkHealth.toFixed(1)} प्रतिशत है और सभी ट्रैक चालू हैं।`;
      answerEng = `Network operational health is at ${db.networkHealth.toFixed(1)} percent with ${db.activeAlerts} active alerts.`;
    }

    const finalAnswer = isHindiRequested ? answerHindi : answerEng;
    res.json({ answer: finalAnswer, voiceScript: finalAnswer, voiceAnnouncementHindi: answerHindi, voiceAnnouncementEnglish: answerEng });
  });

  // ==========================================
  // 3-DEPARTMENT AI BLOCK PLANNING API ROUTES
  // ==========================================
  let maintenanceRequests: MaintenanceRequest[] = JSON.parse(JSON.stringify(INITIAL_MAINTENANCE_REQUESTS));
  let ganttItems: GanttBlockItem[] = JSON.parse(JSON.stringify(INITIAL_GANTT_ITEMS));
  let conflictSlots: ConflictSlotOption[] = JSON.parse(JSON.stringify(INITIAL_CONFLICT_SLOTS));
  let corridorSummaries: CorridorAssetSummary[] = JSON.parse(JSON.stringify(INITIAL_CORRIDOR_SUMMARIES));
  let approvalState: BlockApprovalState = JSON.parse(JSON.stringify(INITIAL_APPROVAL_STATE));

  // 1. GET Maintenance Requests with filtering
  app.get("/api/block-planner/requests", (req, res) => {
    const { filter } = req.query;
    let list = [...maintenanceRequests];
    if (filter && filter !== 'All') {
      if (filter === 'Critical') {
        list = list.filter(r => r.severity === 'Critical');
      } else if (filter === 'Overdue') {
        list = list.filter(r => r.isOverdue);
      } else if (filter === 'Engineering' || filter === 'S&T' || filter === 'Traction') {
        list = list.filter(r => r.department === filter);
      }
    }
    res.json({
      requests: list,
      totalCount: maintenanceRequests.length,
      engineeringCount: maintenanceRequests.filter(r => r.department === 'Engineering').length,
      stCount: maintenanceRequests.filter(r => r.department === 'S&T').length,
      tractionCount: maintenanceRequests.filter(r => r.department === 'Traction').length,
      criticalCount: maintenanceRequests.filter(r => r.severity === 'Critical').length,
      overdueCount: maintenanceRequests.filter(r => r.isOverdue).length
    });
  });

  // Add a new maintenance request
  app.post("/api/block-planner/requests", (req, res) => {
    const { department, asset, problem, severity, durationHours, corridorId } = req.body;
    const newId = `M00${maintenanceRequests.length + 1}`;
    const hours = Number(durationHours) || 2;
    
    // Auto-calculate AI priority score
    const severityScore = severity === 'Critical' ? 92 : severity === 'High' ? 78 : severity === 'Medium' ? 62 : 45;
    const assetScore = asset.includes('Track') ? 85 : asset.includes('Signal') ? 88 : 78;
    const urgency = severity === 'Critical' ? 95 : 70;
    const safety = severity === 'Critical' ? 92 : 75;
    const traffic = 75;
    const finalPriority = Math.round((severityScore * 0.3) + (assetScore * 0.25) + (urgency * 0.2) + (safety * 0.15) + (traffic * 0.1));

    const newReq: MaintenanceRequest = {
      id: newId,
      department: department || 'Engineering',
      asset: asset || `Track-${Math.floor(Math.random() * 50) + 1}`,
      problem: problem || 'Track ballast irregular defect',
      severity: severity || 'High',
      durationHours: hours,
      durationStr: `${hours}h`,
      priorityScore: finalPriority,
      isOverdue: severity === 'Critical',
      status: 'Pending',
      corridorId: corridorId || 'CORR-AB',
      corridorName: 'Section A–B (Ghaziabad – Aligarh Up Main)',
      scores: {
        severity: severityScore,
        assetCriticality: assetScore,
        urgency,
        safetyRisk: safety,
        trafficImpact: traffic
      },
      recommendationBadge: finalPriority >= 85 ? "🔴 CRITICAL - Schedule in next suitable block" : "🟠 HIGH - Bundle with Co-located Track Block",
      explainWhy: `High priority because of ${severity.toLowerCase()} defect, asset importance, safety risk and overdue status.`,
      detailedXAI: `Asset ${asset} evaluated by Indian Railways AI Block Planner. Combined priority score computed at ${finalPriority}/100.`,
      assignedCrew: `Divisional Maintenance Team (${department})`
    };

    maintenanceRequests.unshift(newReq);
    res.json({ success: true, request: newReq, total: maintenanceRequests.length });
  });

  // 2. Explainable AI priority score rationale (Gemini assisted if available)
  app.post("/api/block-planner/explain-priority", async (req, res) => {
    const { requestId } = req.body;
    const reqItem = maintenanceRequests.find(r => r.id === requestId) || maintenanceRequests[0];
    
    let aiExplanation = reqItem.explainWhy;
    let technicalBreakdown = reqItem.detailedXAI || `Asset ${reqItem.asset} (${reqItem.department}): Severity=${reqItem.scores.severity}, Criticality=${reqItem.scores.assetCriticality}, Urgency=${reqItem.scores.urgency}, SafetyRisk=${reqItem.scores.safetyRisk}, TrafficImpact=${reqItem.scores.trafficImpact}. Combined score: ${reqItem.priorityScore}/100.`;

    const gemini = getGemini();
    if (gemini && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the Indian Railways AI Chief Safety & Planning Engineer.
Explain in 2-3 concise, rigorous engineering sentences why Asset "${reqItem.asset}" (${reqItem.department}) with problem "${reqItem.problem}" was assigned a priority score of ${reqItem.priorityScore}/100 with recommendation "${reqItem.recommendationBadge}".
Scores: Severity ${reqItem.scores.severity}/100, Asset Criticality ${reqItem.scores.assetCriticality}/100, Urgency ${reqItem.scores.urgency}/100, Safety Risk ${reqItem.scores.safetyRisk}/100, Traffic Impact ${reqItem.scores.trafficImpact}/100.
Focus on safety regulations, block bundling benefits across Engineering, S&T and Traction, and minimizing passenger train disruption.`;
        
        const response = await gemini.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt
        });
        if (response.text) {
          technicalBreakdown = response.text.trim();
        }
      } catch (e) {
        console.warn("Gemini explanation error, using deterministic fallback", e);
      }
    }

    res.json({
      requestId: reqItem.id,
      asset: reqItem.asset,
      department: reqItem.department,
      priorityScore: reqItem.priorityScore,
      scores: reqItem.scores,
      recommendation: reqItem.recommendationBadge,
      explainWhy: reqItem.explainWhy,
      technicalBreakdown
    });
  });

  // 3. GET Gantt items & AI Block recommendation
  app.get("/api/block-planner/gantt", (req, res) => {
    res.json({
      ganttItems,
      recommendedBlock: {
        timeWindow: "10:00 AM – 12:00 PM",
        startHour: 10.0,
        endHour: 12.0,
        combinedTasksCount: 3,
        tasks: [
          { department: "Engineering", title: "Track repair (Track-24)", duration: "2h", crew: "P-Way Gang 04" },
          { department: "S&T", title: "Signal maintenance (Signal-08)", duration: "1h", crew: "Signal Unit Alpha" },
          { department: "Traction", title: "OHE maintenance (OHE-17)", duration: "1.5h", crew: "Tower Wagon Unit 02" }
        ],
        trainConflicts: 0,
        blockUtilization: 92,
        estimatedDowntimeReduction: 28,
        footnote: "*Prototype simulation metric."
      }
    });
  });

  // 4. GET Conflict Detection & Alternatives
  app.get("/api/block-planner/conflicts", (req, res) => {
    res.json({
      proposedBlock: {
        window: "10:00 ───────── 12:00",
        candidate: "10:00 - 12:00",
        conflictFoundOnAlt: true,
        conflictingTrain: "Passenger Train 10:45 (Train 12051 Jan Shatabdi Express)",
        status: "CONFLICT_RESOLVED_BY_AI"
      },
      alternatives: conflictSlots,
      aiRecommendation: conflictSlots.find(s => s.isAiRecommended) || conflictSlots[1]
    });
  });

  // 5. GET Corridor Map Summaries
  app.get("/api/block-planner/corridors", (req, res) => {
    res.json({
      corridors: corridorSummaries,
      totalCorridors: corridorSummaries.length,
      totalAssetsMonitored: corridorSummaries.reduce((sum, c) => sum + c.totalAssets, 0),
      totalCriticalAssets: corridorSummaries.reduce((sum, c) => sum + c.criticalAssets, 0),
      totalPendingMaintenance: corridorSummaries.reduce((sum, c) => sum + c.pendingMaintenance, 0)
    });
  });

  // 6. POST What-If Simulation
  app.post("/api/block-planner/what-if", (req, res) => {
    const { scenarioType } = req.body; // e.g. 'block_unavailable' | 'emergency_train' | 'rain_restriction'
    
    // Simulate dynamic recalculation
    const recalculatedSlots: ConflictSlotOption[] = [
      {
        id: "SLOT-ALT-1",
        window: "08:00–10:00",
        startHour: 8.0,
        endHour: 10.0,
        hasConflict: false,
        isAiRecommended: false,
        score: 82,
        blockUtilization: 76,
        estimatedDowntimeReduction: 18,
        safetyScore: 90,
        tag: "Feasible",
        explanation: "✓ No passenger train conflict. Minor siding hold for freight."
      },
      {
        id: "SLOT-ALT-2",
        window: "10:00–12:00",
        startHour: 10.0,
        endHour: 12.0,
        hasConflict: true,
        conflictReason: "Block window declared unavailable due to sudden emergency train movement / corridor constraint.",
        conflictingTrain: "Emergency VIP Inspection Rake / Special Train",
        isAiRecommended: false,
        score: 20,
        blockUtilization: 0,
        estimatedDowntimeReduction: 0,
        safetyScore: 40,
        tag: "Unavailable",
        explanation: "✕ Target block window unavailable. AI Re-optimizer engaged."
      },
      {
        id: "SLOT-ALT-3",
        window: "12:30–14:30",
        startHour: 12.5,
        endHour: 14.5,
        hasConflict: false,
        isAiRecommended: true,
        score: 94,
        blockUtilization: 94,
        estimatedDowntimeReduction: 31,
        safetyScore: 98,
        tag: "AI Recommended Alternative",
        explanation: "✓ Zero train conflicts after dynamic diversion of Train 12833 to Loop Line 2. Best alternative window."
      },
      {
        id: "SLOT-ALT-4",
        window: "15:00–17:00",
        startHour: 15.0,
        endHour: 17.0,
        hasConflict: false,
        isAiRecommended: false,
        score: 76,
        blockUtilization: 79,
        estimatedDowntimeReduction: 15,
        safetyScore: 88,
        tag: "Feasible Alternative",
        explanation: "✓ Clear path, but near evening peak freight departure window."
      }
    ];

    res.json({
      success: true,
      trigger: scenarioType || "Current block (10:00-12:00) becomes unavailable",
      stepFlow: [
        { step: 1, label: "CURRENT PLAN", value: "10:00 – 12:00", status: "cancelled" },
        { step: 2, label: "EVENT OCCURRED", value: "BLOCK UNAVAILABLE ⚠️", status: "disruption" },
        { step: 3, label: "AI RE-OPTIMIZATION", value: "Evaluated 4 alternative slots against real-time timetable", status: "computing" },
        { step: 4, label: "AI RECOMMENDS", value: "12:30 – 14:30 (Score: 94/100, 0 Conflicts)", status: "selected" }
      ],
      alternatives: recalculatedSlots,
      recommended: recalculatedSlots[2],
      rationale: "AI re-evaluated 4 prospective windows against timetable headway rules. Slot 12:30–14:30 provides complete 2-hour shadow block clearance for Engineering, S&T and Traction with 0 passenger delays."
    });
  });

  // 7. POST Human-in-the-Loop Official Approval
  app.post("/api/block-planner/approve", (req, res) => {
    const { decision, modifiedWindow, officerName, notes } = req.body; // decision: 'APPROVE' | 'MODIFY' | 'REJECT'
    
    if (decision === 'APPROVE') {
      approvalState = {
        status: 'APPROVED',
        sanctionMemoNumber: `IR/SANCTION/${Date.now().toString().slice(-6)}`,
        selectedWindow: modifiedWindow || "12:30 – 14:30",
        departments: ["Engineering", "S&T", "Traction"],
        tasksCombined: 3,
        trainConflicts: 0,
        safetyConstraintsPassed: true,
        blockUtilizationPercent: 94,
        estimatedDowntimeReductionPercent: 31,
        approvedBy: officerName || "Senior Divisional Operations Manager (Sr. DOM)",
        sanctionTimestamp: new Date().toLocaleTimeString(),
        cautionOrderRequired: "TSR 30 km/h caution notice on UP Main at Km 142/8, removed upon joint completion memo.",
        notes: notes || "AI recommendation approved & locked into National Train Enquiry & Control Office Application (COA)."
      };

      // Mark tasks as Scheduled in maintenance list
      maintenanceRequests.slice(0, 3).forEach(r => {
        r.status = 'Scheduled';
      });
    } else if (decision === 'MODIFY') {
      approvalState = {
        status: 'MODIFIED',
        sanctionMemoNumber: `IR/MOD-SANCTION/${Date.now().toString().slice(-6)}`,
        selectedWindow: modifiedWindow || "13:00 – 14:30",
        departments: ["Engineering", "S&T", "Traction"],
        tasksCombined: 3,
        trainConflicts: 0,
        safetyConstraintsPassed: true,
        blockUtilizationPercent: 88,
        estimatedDowntimeReductionPercent: 24,
        approvedBy: officerName || "Section Controller (SCR)",
        sanctionTimestamp: new Date().toLocaleTimeString(),
        cautionOrderRequired: "TSR 30 km/h caution notice active.",
        notes: `Controller adjusted window to ${modifiedWindow || "13:00 – 14:30"}.`
      };
    } else {
      approvalState.status = 'REJECTED';
      approvalState.notes = notes || "Returned to AI Block Engine with constraint feedback.";
    }

    res.json({ success: true, approvalState });
  });

  app.post("/api/copilot", (req, res) => {
    const { query } = req.body;
    let reply = `AI Controller analysis for: "${query}": Live Indian Railways telemetry synchronized across SECR and SER divisions. All 18 station yards monitoring real train movements and platform tracks.`;
    if (/train|vande bharat|rajdhani|status/i.test(query)) {
      reply = `Live Train Status: 20825 BSP-NGP Vande Bharat is maintaining 130 km/h cruising on Main Line. 12441 Bilaspur Rajdhani Express clear on Block Section DURG-NGP. 12810 Howrah-Mumbai Mail regulated for platform berthing.`;
    } else if (/platform|berth|yard/i.test(query)) {
      reply = `Yard Telemetry: Platform lines at Bilaspur Jn (8 PFs), Nagpur Jn (6 PFs), Raipur Jn (6 PFs), and Tatanagar (6 PFs) are operating under electronic interlocking. Mainlines (PF 1 & 2) cleared for high-speed passages.`;
    } else if (/delay|conflict|route/i.test(query)) {
      reply = `Route Conflict Engine: 0 head-on conflicts on active platform starters. AI proposed bypass active for degraded sections with automatic green route locking.`;
    }
    res.json({ text: reply });
  });

  app.post("/api/optimize", (req, res) => {
    const { segmentId, sourceId, targetId } = req.body;
    setTimeout(() => res.json(runAdvancedOptimization(segmentId, sourceId, targetId)), 600);
  });

  app.post("/api/reset", (req, res) => {
    simulationTime = 480;
    db = { ...generateSyntheticData(), simulationTime };
    res.json({ message: "Simulation reset with authentic Indian Railways train data", db });
  });

  app.post("/api/inject-disruption", (req, res) => {
    const ops = db.segments.filter(t => t.status === 'Operational');
    if (ops.length > 0) {
      const target = ops[Math.floor(Math.random() * ops.length)];
      target.status = 'Degraded';
      target.maintenanceRequired = true;
      target.maintenanceDurationMinutes = 120;
      target.maintenanceRisk = 100;
      res.json({ message: "Disruption injected", segment: target });
    } else {
      res.status(400).json({ error: "No operational segments" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
