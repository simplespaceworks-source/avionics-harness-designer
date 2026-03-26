import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface Project {
  id?: number;
  name: string;
  tailNumber: string;
  aircraftType: string;
  lastModified: Date;
}

export interface CanvasGroup {
  id?: number;
  projectId: number;
  name: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface ConnectorTemplate {
  id?: number;
  name: string;
  imageData: string;
  pinCount: number;
}

export interface ComponentTemplate {
  id?: number;
  name: string;
  type: string;
  defaultConnectors: { 
    id: string; 
    connectorTemplateId: number; 
    customName: string; 
    pins: { id: string; pinIndex: number; name: string; type: string }[];
  }[]; 
  imageData: string;
  drawContinuous: number;
  drawIntermittent: number;
}

export interface ComponentInstance {
  id?: number; // DB ID
  projectId: number;
  templateId: number;
  name: string;
  posX: number;
  posY: number;
  isCollapsed?: boolean;
  notes?: string;
  groupId?: number; // Logical binding referencing CanvasGroup ID mapping visual container enclosure
}

export interface Wire {
  id: string; // UUID from react-flow edge
  projectId: number;
  sourceInstanceId: number;
  sourceConnectorId: string;
  sourcePinId: string;
  targetInstanceId: number;
  targetConnectorId: string;
  targetPinId: string;
  wireTypeId: number;
  color: string;
  waypoints: string; // JSON serialized edge waypoints
  buildPhase: string;
}

export interface WireType {
  id?: number;
  designation: string;
  maxCurrent: number;
  resistancePerFt: number; // optional logic for voltage drop
}

export interface InstanceDistance {
  projectId: number;
  instanceAId: number;
  instanceBId: number;
  distance: number;
}

export class AvionicsDatabase extends Dexie {
  projects!: Table<Project>;
  templates!: Table<ComponentTemplate>;
  connectorTemplates!: Table<ConnectorTemplate, number>;
  instances!: Table<ComponentInstance>;
  wires!: Table<Wire>;
  wireTypes!: Table<WireType>;
  instanceDistances!: Table<InstanceDistance>;
  groups!: Table<CanvasGroup>;

  constructor() {
    super('AvionicsDB');
    this.version(4).stores({
      projects: '++id, lastModified',
      templates: '++id, category',
      connectorTemplates: '++id, name',
      instances: '++id, projectId, templateId, groupId',
      wires: '++id, projectId, sourceInstanceId, targetInstanceId, wireTypeId',
      wireTypes: '++id',
      instanceDistances: '++id, projectId, instanceAId, instanceBId',
      groups: '++id, projectId'
    });
  }
}

export const db = new AvionicsDatabase();

// Pre-populate standard wire types
db.on('populate', async () => {
  await db.wireTypes.bulkAdd([
    { designation: '22 AWG', maxCurrent: 5, resistancePerFt: 0.016 },
    { designation: '20 AWG', maxCurrent: 7.5, resistancePerFt: 0.010 },
    { designation: '18 AWG', maxCurrent: 10, resistancePerFt: 0.006 },
    { designation: '16 AWG', maxCurrent: 13, resistancePerFt: 0.004 },
    { designation: '14 AWG', maxCurrent: 17, resistancePerFt: 0.0025 },
    { designation: '12 AWG', maxCurrent: 23, resistancePerFt: 0.0016 },
    { designation: '10 AWG', maxCurrent: 33, resistancePerFt: 0.0010 },
    { designation: '8 AWG', maxCurrent: 46, resistancePerFt: 0.0006 },
    { designation: '4 AWG', maxCurrent: 80, resistancePerFt: 0.0002 },
    { designation: '2 AWG', maxCurrent: 100, resistancePerFt: 0.00016 }
  ]);
});
