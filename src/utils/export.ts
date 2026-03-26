import { db } from '../db/db';

export async function exportWireListCSV(projectId: number) {
  const project = await db.projects.get(projectId);
  if (!project) return;
  
  const wires = await db.wires.where('projectId').equals(projectId).toArray();
  const instances = await db.instances.where('projectId').equals(projectId).toArray();
  const templates = await db.templates.toArray();
  const wireTypes = await db.wireTypes.toArray();
  const distances = await db.instanceDistances.where({ projectId }).toArray();

  let csvRows: string[] = [];
  csvRows.push(`"PROJECT WIRE LIST: ${project.name}"`);

  instances.forEach(inst => {
    const template = templates.find(t => t.id === inst.templateId);
    if (!template) return;

    csvRows.push(''); // Blank spacer between components
    csvRows.push(`"--- COMPONENT: ${inst.customName || template.name} ---"`);
    csvRows.push(`"Connector","Pin Name","Signal Type","Target Component","Target Pin","Wire Gauge","Wire Color","Length"`);

    const connectors = template.defaultConnectors;
    connectors.forEach(conn => {
      conn.pins.forEach(pin => {
        if (pin.type === 'Not Used') return;
        
        const fullPinId = `${conn.id}-${pin.id}`;
        
        // Find wires terminating at this specific pin
        const connectedWires = wires.filter(w => 
          (w.sourceInstanceId === inst.id && w.sourcePinId === fullPinId) ||
          (w.targetInstanceId === inst.id && w.targetPinId === fullPinId)
        );

        if (connectedWires.length === 0) {
           csvRows.push(`"${conn.customName || conn.id}","${pin.name}","${pin.type}","--","--","--","--","--"`);
        } else {
          connectedWires.forEach(wire => {
             const isSource = wire.sourceInstanceId === inst.id;
             const targetInstId = isSource ? wire.targetInstanceId : wire.sourceInstanceId;
             const targetPinFullId = isSource ? wire.targetPinId : wire.sourcePinId;
             
             const targetInst = instances.find(i => i.id === targetInstId);
             const targetTpl = templates.find(t => t.id === targetInst?.templateId);
             const targetName = targetInst?.customName || targetTpl?.name || 'Unknown';
             
             let targetPinName = targetPinFullId;
             if (targetTpl) {
               const [tConnId, tPinId] = targetPinFullId.split('-');
               const tConn = targetTpl.defaultConnectors.find((c: any) => c.id === tConnId);
               const tPin = tConn?.pins.find((p: any) => String(p.id) === String(tPinId));
               if (tPin) targetPinName = tPin.name;
             }

             const wireType = wireTypes.find(wt => wt.id === wire.wireTypeId);
             
             let lengthStr = "TBD";
             if (inst.id !== undefined && targetInstId !== undefined) {
               const [a, b] = inst.id < targetInstId ? [inst.id, targetInstId] : [targetInstId, inst.id];
               const distRec = distances.find(d => d.instanceAId === a && d.instanceBId === b);
               if (distRec && distRec.distance > 0) {
                 lengthStr = distRec.distance.toFixed(2);
               }
             }
             
             csvRows.push(`"${conn.customName || conn.id}","${pin.name}","${pin.type}","${targetName}","${targetPinName}","${wireType?.designation || '--'}","${wire.color}","${lengthStr}"`);
          });
        }
      });
    });
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_wire_list.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportProjectJSON(projectId: number) {
  const project = await db.projects.get(projectId);
  if (!project) return;
  const instances = await db.instances.where('projectId').equals(projectId).toArray();
  const wires = await db.wires.where({ projectId }).toArray();
  const instanceDistances = await db.instanceDistances.where({ projectId }).toArray();
  
  const data = {
    project,
    instances,
    wires,
    instanceDistances
  };
  
  const jsonStr = JSON.stringify(data, null, 2);
  const encodedUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function importProjectJSON(file: File): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.project || !data.instances || !data.wires) {
          throw new Error("Invalid format");
        }
        
        const newProject = { ...data.project };
        delete newProject.id;
        newProject.name = newProject.name + ' (Imported)';
        newProject.lastModified = Date.now();
        
        const newProjectId = await db.projects.add(newProject);
        
        const idMap = new Map<number, number>();
        for (const inst of data.instances) {
          const oldId = inst.id;
          const newInst = { ...inst, projectId: newProjectId as number };
          delete newInst.id;
          const newInstId = await db.instances.add(newInst);
          idMap.set(oldId, newInstId as number);
        }
        
        for (const wire of data.wires) {
           const newWire = { ...wire, projectId: newProjectId as number, id: crypto.randomUUID() };
           newWire.sourceInstanceId = idMap.get(wire.sourceInstanceId) || wire.sourceInstanceId;
           newWire.targetInstanceId = idMap.get(wire.targetInstanceId) || wire.targetInstanceId;
           await db.wires.add(newWire);
        }

        if (data.instanceDistances) {
          for (const d of data.instanceDistances) {
             const a = idMap.get(d.instanceAId) || d.instanceAId;
             const b = idMap.get(d.instanceBId) || d.instanceBId;
             await db.instanceDistances.add({ ...d, projectId: newProjectId as number, instanceAId: a, instanceBId: b });
          }
        }
        
        resolve(newProjectId as number);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}
