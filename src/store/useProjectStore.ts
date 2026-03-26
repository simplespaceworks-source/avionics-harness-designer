import { create } from 'zustand';
import { db } from '../db/db';
import type { Project, ComponentTemplate, ComponentInstance, Wire, WireType, CanvasGroup, InstanceDistance, ConnectorTemplate } from '../db/db';
import { liveQuery } from 'dexie';

export interface ProjectState {
  activeProject: Project | null;
  instances: ComponentInstance[];
  groups: CanvasGroup[];
  wires: Wire[];
  instanceDistances: InstanceDistance[];
  templates: ComponentTemplate[];
  connectorTemplates: ConnectorTemplate[];
  wireTypes: WireType[];
  
  loadProject: (id: number) => Promise<void>;
  unloadProject: () => void;
  loadStaticData: () => Promise<void>;
  
  addInstance: (instance: Omit<ComponentInstance, 'id'>) => Promise<number>;
  updateInstance: (id: number, data: Partial<ComponentInstance>) => Promise<void>;
  updateInstancePosition: (id: number, x: number, y: number) => Promise<void>;
  toggleInstanceCollapse: (id: number) => Promise<void>;
  deleteInstance: (id: number) => Promise<void>;

  addGroup: (group: Omit<CanvasGroup, 'id'>) => Promise<number>;
  updateGroup: (id: number, data: Partial<CanvasGroup>) => Promise<void>;
  deleteGroup: (id: number) => Promise<void>;

  addWire: (wire: Wire) => Promise<string>;
  updateWire: (id: string, updates: Partial<Wire>) => Promise<void>;
  removeWire: (id: string) => Promise<void>;
  
  setInstanceDistance: (projectId: number, instanceAId: number, instanceBId: number, distance: number) => Promise<void>;
}

let projectSubscription: any = null;

export const useProjectStore = create<ProjectState>((set) => ({
  activeProject: null,
  instances: [],
  groups: [],
  wires: [],
  instanceDistances: [],
  templates: [],
  connectorTemplates: [],
  wireTypes: [],

  loadStaticData: async () => {
    const templates = await db.templates.toArray();
    const connectorTemplates = await db.connectorTemplates.toArray();
    const wireTypes = await db.wireTypes.toArray();
    set({ templates, connectorTemplates, wireTypes });
  },

  loadProject: async (id) => {
    if (projectSubscription) {
      projectSubscription.unsubscribe();
      projectSubscription = null;
    }

    projectSubscription = liveQuery(async () => {
      const [project, instances, groups, wires, instanceDistances] = await Promise.all([
        db.projects.get(id),
        db.instances.where({ projectId: id }).toArray(),
        db.groups.where({ projectId: id }).toArray(),
        db.wires.where({ projectId: id }).toArray(),
        db.instanceDistances.where({ projectId: id }).toArray(),
      ]);
      return { project, instances, groups, wires, instanceDistances };
    }).subscribe({
      next: ({ project, instances, groups, wires, instanceDistances }) => {
        set({
          activeProject: project || null,
          instances,
          groups,
          wires,
          instanceDistances,
        });
      },
      error: (error) => console.error("LiveQuery error:", error),
    });

    await useProjectStore.getState().loadStaticData();
  },

  unloadProject: () => {
    if (projectSubscription) {
      projectSubscription.unsubscribe();
      projectSubscription = null;
    }
    set({ activeProject: null, instances: [], groups: [], wires: [], instanceDistances: [] });
  },

  addInstance: async (instance) => {
    return await db.instances.add(instance as ComponentInstance) as number;
  },

  updateInstance: async (id, data) => {
    await db.instances.update(id, data);
  },

  updateInstancePosition: async (id, x, y) => {
    await db.instances.update(id, { posX: x, posY: y });
  },

  toggleInstanceCollapse: async (id) => {
    const inst = await db.instances.get(id);
    if (inst) {
      await db.instances.update(id, { isCollapsed: !inst.isCollapsed });
    }
  },

  deleteInstance: async (id) => {
    await db.wires.where('sourceInstanceId').equals(String(id)).delete();
    await db.wires.where('targetInstanceId').equals(String(id)).delete();
    await db.instances.delete(id);
  },
  
  addGroup: async (group) => {
    return await db.groups.add(group as CanvasGroup) as number;
  },

  updateGroup: async (id, data) => {
    await db.groups.update(id, data);
  },

  deleteGroup: async (id) => {
    const group = await db.groups.get(id);
    if (!group) return;
    
    const children = await db.instances.where('groupId').equals(id).toArray();
    for (const child of children) {
       await db.instances.update(child.id!, { 
         groupId: undefined,
         posX: child.posX + group.posX,
         posY: child.posY + group.posY
       });
    }
    await db.groups.delete(id);
  },

  addWire: async (wire) => {
    return await db.wires.add(wire) as string;
  },

  updateWire: async (id, updates) => {
    await db.wires.update(id, updates);
  },

  removeWire: async (id) => {
    await db.wires.delete(id);
  },

  setInstanceDistance: async (projectId, instanceAId, instanceBId, distance) => {
    const [a, b] = instanceAId < instanceBId ? [instanceAId, instanceBId] : [instanceBId, instanceAId];
    await db.instanceDistances.put({ projectId, instanceAId: a, instanceBId: b, distance });
  }
}));
