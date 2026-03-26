import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Clock, Plane, Download, Upload } from 'lucide-react';
import { exportProjectJSON, importProjectJSON } from '../utils/export';

export default function Dashboard() {
  const navigate = useNavigate();
  const projects = useLiveQuery(() => db.projects.orderBy('lastModified').reverse().toArray());

  const createProject = async () => {
    const id = await db.projects.add({
      name: 'New Harness Project',
      lastModified: Date.now(),
      canvasState: '{}'
    });
    navigate(`/editor/${id}`);
  };

  const deleteProject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      await db.projects.delete(id);
      await db.instances.where('projectId').equals(id).delete();
      await db.wires.where('projectId').equals(id).delete();
    }
  };

  const handleExport = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await exportProjectJSON(id);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const newId = await importProjectJSON(file);
        if (newId) navigate(`/editor/${newId}`);
      } catch (error) {
        alert("Failed to import project. Invalid file.");
      }
    }
    // reset input
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full mx-auto p-10 lg:p-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-semibold text-white mb-2 tracking-tight">Projects</h1>
          <p className="text-text-muted text-lg">Manage your avionics harness designs</p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 bg-panel hover:bg-white/5 text-white border border-border px-5 py-3 rounded-xl font-medium transition-all shadow-md cursor-pointer">
            <Upload size={20} />
            Import Backup
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={createProject}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-accent/20 active:scale-95"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {projects?.map(project => (
          <div
            key={project.id}
            onClick={() => navigate(`/editor/${project.id}`)}
            className="group relative bg-panel border border-border hover:border-accent/40 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-canvas flex items-center justify-center text-accent mb-5">
              <Plane size={24} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2 line-clamp-1">{project.name}</h3>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Clock size={14} />
              <span>{new Date(project.lastModified).toLocaleDateString()}</span>
            </div>
            
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => handleExport(e, project.id!)}
                className="p-2 text-text-muted hover:text-white rounded-lg hover:bg-white/10"
                title="Backup Project"
              >
                <Download size={18} />
              </button>
              <button 
                onClick={(e) => deleteProject(e, project.id!)}
                className="p-2 text-text-muted hover:text-system-error rounded-lg hover:bg-system-error/10"
                title="Delete Project"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {projects?.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl text-text-muted bg-panel/30">
            <Plane size={48} className="mb-4 opacity-30" />
            <p className="text-xl mb-2 text-white font-medium">No projects yet</p>
            <p className="text-base">Create a new project to start designing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
