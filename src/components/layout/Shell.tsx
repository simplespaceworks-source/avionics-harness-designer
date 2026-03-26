import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plane, Library, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Shell() {
  const location = useLocation();

  const nav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workspace', path: '/editor', icon: Plane },
    { name: 'Templates', path: '/templates', icon: Library },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-text">
      {/* Sidebar */}
      <aside className="w-16 border-r border-border bg-panel flex flex-col items-center py-4 gap-4 z-20 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white mb-4 shadow-lg shadow-accent/20">
          <Plane size={24} />
        </div>
        
        {nav.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              title={item.name}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-accent/10 hover:text-accent",
                isActive ? "bg-accent/20 text-accent" : "text-text-muted"
              )}
            >
              <item.icon size={20} />
            </Link>
          );
        })}

        <div className="mt-auto">
          <Link 
            to="/settings"
            title="Settings"
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-accent/10 hover:text-accent",
              location.pathname === '/settings' ? "bg-accent/20 text-accent" : "text-text-muted"
            )}
          >
            <Settings size={20} />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0 bg-canvas">
        <Outlet />
      </main>
    </div>
  );
}
