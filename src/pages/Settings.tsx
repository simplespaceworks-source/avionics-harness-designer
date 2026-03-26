import React, { useState } from 'react';
import { db } from '../db/db';
import type { WireType } from '../db/db';
import { Settings as SettingsIcon, Save, Trash2, Plus, Palette, Activity } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function Settings() {
  const wireTypes = useLiveQuery(() => db.wireTypes.toArray());
  const [defaultWireColor, setDefaultWireColor] = useState(localStorage.getItem('defaultWireColor') || '#3b82f6');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<WireType>>({});

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setDefaultWireColor(color);
    localStorage.setItem('defaultWireColor', color);
  };

  const startEdit = (wt: WireType) => {
    setEditingId(wt.id!);
    setEditForm(wt);
  };

  const saveEdit = async () => {
    if (editingId && editForm.designation) {
      await db.wireTypes.update(editingId, {
        designation: editForm.designation,
        maxCurrent: Number(editForm.maxCurrent) || 0,
        resistancePerFt: Number(editForm.resistancePerFt) || 0
      });
      setEditingId(null);
    }
  };

  const tableBottomRef = React.useRef<HTMLTableRowElement>(null);

  const addWireType = async () => {
    const defaultData = {
      designation: 'New Wire Type',
      maxCurrent: 10,
      resistancePerFt: 0.010
    };
    const newId = await db.wireTypes.add(defaultData);
    setEditingId(newId as number);
    setEditForm(defaultData);
    
    setTimeout(() => {
      tableBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const confirmDelete = async () => {
    if (confirmDeleteId !== null) {
      try {
        console.log('Attempting deletion of wire type ID:', confirmDeleteId);
        await db.wireTypes.delete(Number(confirmDeleteId));
      } catch (err: any) {
        console.error('Deletion failure:', err);
        window.alert('Failed to delete wire type. See console for details.');
      }
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex-1 w-full h-full bg-canvas flex flex-col text-text overflow-y-auto">
      <div className="bg-panel border-b border-border px-8 py-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <SettingsIcon className="text-accent" /> App Configuration
          </h1>
          <p className="text-sm text-text-muted mt-1">Manage global harness styling and canonical parts library.</p>
        </div>
      </div>

      <div className="p-8 max-w-4xl space-y-12">
        {/* Global Styles */}
        <section className="bg-panel border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-accent" />
            <h2 className="text-lg font-medium text-white">Default Theme Configuration</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-canvas rounded-lg border border-border/50">
             <div>
               <h3 className="font-medium text-white mb-1">Default Wire Output Color</h3>
               <p className="text-sm text-text-muted">The initial color trace utilized when instantiating new wires connecting blocks structurally.</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-panel shadow-sm flex items-center justify-center overflow-hidden">
                   <input 
                     type="color" 
                     value={defaultWireColor}
                     onChange={handleColorChange}
                     className="w-14 h-14 cursor-pointer"
                   />
                </div>
                <span className="font-mono text-sm text-text-muted uppercase px-2 py-1 bg-panel rounded border border-border/50">
                  {defaultWireColor}
                </span>
             </div>
          </div>
        </section>

        {/* Wire Type Matrix */}
        <section className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-panel/50">
            <div className="flex items-center gap-3">
              <Activity className="text-system-warn" />
              <h2 className="text-lg font-medium text-white">Canonical Wire Types</h2>
            </div>
            <button 
              onClick={addWireType}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add Wire Gauge
            </button>
          </div>
          
          <div className="w-full">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium text-text-muted">Designation (Name/Gauge)</th>
                  <th className="px-6 py-3 font-medium text-text-muted">Max Current (Amps)</th>
                  <th className="px-6 py-3 font-medium text-text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {wireTypes?.map((wt) => (
                  <tr key={wt.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === wt.id ? (
                        <input 
                          type="text"
                          value={editForm.designation}
                          onChange={e => setEditForm({...editForm, designation: e.target.value})}
                          className="w-full bg-canvas border border-accent rounded px-3 py-1.5 text-white outline-none"
                        />
                      ) : (
                        <span className="font-medium text-white">{wt.designation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === wt.id ? (
                        <input 
                          type="number"
                          value={editForm.maxCurrent}
                          onChange={e => setEditForm({...editForm, maxCurrent: Number(e.target.value)})}
                          className="w-full max-w-[120px] bg-canvas border border-accent rounded px-3 py-1.5 text-white outline-none"
                        />
                      ) : (
                        <span className="text-system-warn font-mono bg-system-warn/10 px-2 py-1 rounded">
                          {wt.maxCurrent} A
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === wt.id ? (
                        <button 
                          onClick={saveEdit}
                          className="p-1.5 bg-system-success/20 text-system-success rounded hover:bg-system-success/30 transition-colors"
                          title="Save Changes"
                        >
                          <Save size={16} />
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => startEdit(wt)}
                            className="text-text-muted hover:text-white text-xs underline underline-offset-2 transition-colors mr-3"
                          >
                            Edit Properties
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteId(wt.id!)}
                            className="p-1.5 text-text-muted hover:text-system-error hover:bg-system-error/10 rounded transition-all"
                            title="Delete Wire Type"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {(!wireTypes || wireTypes.length === 0) && (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-text-muted">No canonical wire types defined in library.</td>
                   </tr>
                )}
                <tr ref={tableBottomRef} />
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        title="Delete Canonical Wire Gauge"
        message="Are you sure you want to delete this wire type? Standard template references utilizing this gauge may break."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
