import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  Library,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import bgImage from '../download.jpg';
import { ThemeToggle } from '../components/ThemeToggle';
export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Students', path: '/teacher/students', icon: Users },
    { name: 'Materials', path: '/teacher/materials', icon: Library },
  ];

  return (
    <div 
      className="min-h-screen flex relative bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-background/40 pointer-events-none z-0" />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border shadow-[4px_0_24px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ease-in-out flex flex-col lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold tracking-wide text-text-primary">EduPlatform</span>
          </div>
          <button className="ml-auto lg:hidden text-text-muted hover:text-text-primary" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm duration-300",
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-l-2 border-primary shadow-[inset_2px_0_10px_rgba(79,126,255,0.15)]"
                  : "text-text-muted hover:bg-surface-light hover:text-text-primary"
              )}
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Navbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-surface sticky top-0 z-30 relative border-b border-border">
          <button
            className="lg:hidden p-2 -ml-2 text-text-muted hover:text-text-primary rounded-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-text-primary">{user?.full_name}</p>
              <p className="text-xs text-text-muted capitalize">Instructor / {user?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
