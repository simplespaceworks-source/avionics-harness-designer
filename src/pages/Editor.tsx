import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { db } from '../db/db';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  SelectionMode
} from '@xyflow/react';
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, PenSquare, FolderPen } from 'lucide-react';
import ComponentNode from '../components/canvas/ComponentNode';
import { GroupNode } from '../components/canvas/GroupNode';
import WireEdge from '../components/canvas/WireEdge';
import TemplateSidebar from '../components/editor/TemplateSidebar';
import PropertiesPanel from '../components/editor/PropertiesPanel';
import DistanceMatrix from './DistanceMatrix';
import WiringList from './WiringList';

const nodeTypes = {
  componentNode: ComponentNode,
  groupNode: GroupNode
};
const edgeTypes = { wire: WireEdge };

function EditorCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeProject, instances, groups, wires, loadProject, unloadProject, updateInstance, updateGroup, addGroup, deleteGroup, addWire, addInstance, deleteInstance, removeWire } = useProjectStore();
  const { screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'canvas' | 'wiring' | 'matrix'>('canvas');

  // Load project
  useEffect(() => {
    if (id) {
      loadProject(Number(id)).then(() => setLoading(false));
    }
    return () => unloadProject();
  }, [id, loadProject, unloadProject]);

  const initialNodes = useMemo(() => {
    return [
      ...groups.map(g => ({
         id: `group-${g.id}`,
         type: 'groupNode',
         position: { x: g.posX, y: g.posY },
         data: { 
           name: g.name,
           id: g.id!,
           onChangeName: (newName: string) => updateGroup(g.id!, { name: newName }),
           onResizeBox: async (w: number, h: number) => {
             await updateGroup(g.id!, { width: w, height: h });
             
             // Dynamic spatial sweep for orphaned components now enveloped by resized group
             for (const inst of instances) {
                if (inst.groupId) continue;
                if (inst.posX >= g.posX && inst.posX <= g.posX + w && 
                    inst.posY >= g.posY && inst.posY <= g.posY + h) {
                   await updateInstance(inst.id!, {
                      groupId: g.id!,
                      posX: inst.posX - g.posX,
                      posY: inst.posY - g.posY
                   });
                }
             }
           }
         },
         style: { width: g.width, height: g.height },
         className: 'react-flow__node-group shadow-lg rounded-lg'
      })),
      ...instances.map(inst => ({
        id: String(inst.id),
        type: 'componentNode',
        position: { x: inst.posX, y: inst.posY },
        parentId: inst.groupId ? `group-${inst.groupId}` : undefined,
        extent: (inst.groupId ? 'parent' : undefined) as 'parent' | undefined,
        data: { instance: inst },
      }))
    ];
  }, [instances, groups, updateGroup]);

  // Sync instances and groups to React Flow nodes once loaded or updated externally
  useEffect(() => {
    if (!loading) {
      setNodes((prevNodes) => initialNodes.map(node => {
        const existing = prevNodes.find(p => p.id === node.id);
        return existing ? { ...node, selected: existing.selected, dragging: existing.dragging } : node;
      }));
    }
  }, [initialNodes, loading, setNodes]);

  // Sync wires to React Flow edges
  useEffect(() => {
    if (!loading) {
      const flowEdges = wires.map(w => ({
        id: w.id,
        type: 'wire',
        source: String(w.sourceInstanceId),
        target: String(w.targetInstanceId),
        sourceHandle: w.sourcePinId,
        targetHandle: w.targetPinId,
        data: { color: w.color },
      }));
      
      setEdges((prevEdges) => flowEdges.map((edge: any) => {
        const existing = prevEdges.find(p => p.id === edge.id);
        return existing ? { ...edge, selected: existing.selected } as Edge : edge as Edge;
      }));
    }
  }, [wires, loading, setEdges]);

  // Save node position back to DB on drag stop
  const onNodesChangeMap = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      
      for (const change of changes) {
         if (change.type === 'dimensions' && change.dimensions) {
             if (change.id.startsWith('group-')) {
                 const gId = Number(change.id.split('-')[1]);
                 if (change.dimensions.width && change.dimensions.height) {
                    updateGroup(gId, { width: change.dimensions.width, height: change.dimensions.height });
                 }
             }
         }
      }
    },
    [onNodesChange, updateGroup]
  );

  const onNodeDragStop = useCallback(
    async (event: React.MouseEvent, node: Node, allNodes: Node[]) => {
      if (node.type === 'groupNode') {
         const gId = Number(node.id.split('-')[1]);
         const targetGroup = groups.find(g => g.id === gId);
         if (!targetGroup) return;

         await updateGroup(gId, { posX: node.position.x, posY: node.position.y });
         
         // Mathematical sweep to vacuum up orphaned components into the relocated group
         for (const inst of instances) {
            if (inst.groupId) continue;
            if (inst.posX >= node.position.x && inst.posX <= node.position.x + targetGroup.width &&
                inst.posY >= node.position.y && inst.posY <= node.position.y + targetGroup.height) {
               await updateInstance(inst.id!, {
                  groupId: gId,
                  posX: inst.posX - node.position.x,
                  posY: inst.posY - node.position.y
               });
            }
         }
         return;
      }
      
      const instId = Number(node.id);
      // Native X/Y geometry vectors (global frame)
      const absPos = (node as any).computed?.positionAbsolute || (node as any).positionAbsolute;
      const absX = absPos?.x || node.position.x;
      const absY = absPos?.y || node.position.y;

      const targetGroup = groups.find(g => 
         absX >= g.posX && absX <= g.posX + g.width &&
         absY >= g.posY && absY <= g.posY + g.height
      );

      if (targetGroup) {
         await updateInstance(instId, { 
            groupId: targetGroup.id, 
            posX: absX - targetGroup.posX, 
            posY: absY - targetGroup.posY 
         });
      } else {
         await updateInstance(instId, { 
            groupId: undefined, 
            posX: absX, 
            posY: absY 
         });
      }
    },
    [updateInstance, updateGroup, groups]
  );

  const onSelectionDragStop = useCallback((_: React.MouseEvent, nodes: Node[]) => {
    nodes.forEach(n => {
      // This needs to be updated to handle groups and instances correctly
      // For now, it will only update instances not in groups
      if (n.type === 'componentNode' && !n.parentId) {
        updateInstance(Number(n.id), { posX: n.position.x, posY: n.position.y });
      } else if (n.type === 'groupNode') {
        updateGroup(Number(n.id.split('-')[1]), { posX: n.position.x, posY: n.position.y });
      }
    });
  }, [updateInstance, updateGroup]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    deletedNodes.forEach(node => {
      if (node.type === 'componentNode') {
        deleteInstance(Number(node.id));
      } else if (node.type === 'groupNode') {
        const gId = Number(node.id.split('-')[1]);
        deleteGroup(gId);
      }
    });
  }, [deleteInstance, deleteGroup]);

  const onBeforeDelete = useCallback(async ({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[], edges: Edge[] }) => {
    const deletedGroupIds = new Set(
      deletedNodes.filter(n => n.type === 'groupNode').map(n => n.id)
    );

    const autoDeletedChildrenIds = new Set(
      deletedNodes
        .filter(n => n.type === 'componentNode' && n.parentId && deletedGroupIds.has(n.parentId))
        .map(n => n.id)
    );

    const nodesToKeep = deletedNodes.filter(n => !autoDeletedChildrenIds.has(n.id));
    
    const edgesToKeep = deletedEdges.filter(e => {
      // If this edge is attached to a component we are actively rescuing from cascade deletion, preserve the wire too
      if (autoDeletedChildrenIds.has(e.source) || autoDeletedChildrenIds.has(e.target)) {
         return e.selected === true; // Unless explicitly clicked and selected for deletion by the user
      }
      return true;
    });

    return { nodes: nodesToKeep, edges: edgesToKeep };
  }, []);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      removeWire(edge.id);
    });
  }, [removeWire]);

  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      if (params.source && params.target) {
        const wireId = crypto.randomUUID();
        await addWire({
          id: wireId,
          projectId: Number(id),
          sourceInstanceId: Number(params.source),
          targetInstanceId: Number(params.target),
          sourceConnectorId: 'default',
          sourcePinId: params.sourceHandle || 'default',
          targetConnectorId: 'default',
          targetPinId: params.targetHandle || 'default',
          wireTypeId: 1, 
          color: localStorage.getItem('defaultWireColor') || '#3b82f6',
          waypoints: '[]',
          buildPhase: 'Baseline'
        });
      }
    },
    [addWire, id]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const templateId = event.dataTransfer.getData('application/reactflow');
      if (!templateId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      await addInstance({
        projectId: Number(id),
        templateId: Number(templateId),
        name: 'New Component',
        posX: position.x,
        posY: position.y
      });
    },
    [screenToFlowPosition, addInstance, id]
  );

  if (loading) {
    return <div className="flex-1 p-8 text-text-muted flex items-center justify-center">Loading workspace...</div>;
  }

  if (!activeProject) {
    return <div className="flex-1 p-8 text-system-error flex items-center justify-center">Project not found.</div>;
  }

  return (
    <div className="flex-1 w-full h-full bg-canvas flex flex-col relative overflow-hidden">
      {/* Editor Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-panel/80 backdrop-blur-md border-b border-border z-10 flex items-center px-4 justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-text-muted hover:text-white transition-colors rounded-lg hover:bg-canvas"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-medium text-white">{activeProject.name}</h2>
             <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent font-medium mt-0.5">Editor</span>
          </div>
        </div>
        
        <div className="flex bg-canvas rounded-lg p-1 border border-border shadow-sm absolute left-1/2 -translate-x-1/2 opacity-0 md:opacity-100 transition-opacity">
           <button 
             onClick={() => setActiveTab('canvas')} 
             className={`px-6 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'canvas' ? 'bg-panel text-white shadow border border-border/50' : 'text-text-muted hover:text-white'}`}
           >
             Visual Canvas
           </button>
           <button 
             onClick={() => setActiveTab('wiring')} 
             className={`px-6 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'wiring' ? 'bg-panel text-white shadow border border-border/50' : 'text-text-muted hover:text-white'}`}
           >
             Wire List
           </button>
           <button 
             onClick={() => setActiveTab('matrix')} 
             className={`px-6 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'matrix' ? 'bg-panel text-white shadow border border-border/50' : 'text-text-muted hover:text-white'}`}
           >
             Routing Matrix
           </button>
        </div>

        <div className="flex items-center gap-3 pr-4 text-xs text-text-muted font-mono hidden md:flex pointer-events-auto">
           <button 
             onClick={async () => {
               await addGroup({
                 projectId: Number(id),
                 name: 'New Components Group',
                 posX: 250,
                 posY: 150,
                 width: 400,
                 height: 300
               });
             }}
             className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 hover:bg-accent hover:text-white text-accent rounded-lg transition-colors cursor-pointer"
             title="Spawn Graphic Boundary Box"
           >
             <FolderPen size={16} />
             <span className="font-sans font-medium text-sm">Add Group</span>
           </button>
           <div className="ml-4 opacity-70">Auto-saved</div>
        </div>
      </div>

      {/* Editor Main Content */}
      <div className="flex-1 w-full h-full relative pt-14 flex overflow-hidden">
        {activeTab === 'canvas' && (
          <>
            <TemplateSidebar />
            <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeMap}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onBeforeDelete={onBeforeDelete}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onSelectionDragStop={onSelectionDragStop}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            selectionOnDrag={true}
            selectionMode={SelectionMode.Partial}
            panOnScroll={true}
            panOnDrag={[1, 2]}
            fitView
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#2f3342" />
            <Controls className="fill-text-muted border-border" />
            <MiniMap 
              nodeColor="#3b82f6" 
              maskColor="rgba(15, 17, 21, 0.7)"
              style={{ backgroundColor: '#1c1e26' }}
              pannable
            />
          </ReactFlow>
            </div>
            <PropertiesPanel />
          </>
        )}
        {activeTab === 'wiring' && <WiringList />}
        {activeTab === 'matrix' && <DistanceMatrix />}
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorCanvas />
    </ReactFlowProvider>
  );
}
