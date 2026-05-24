import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Users, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, pageTitle, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">NetQuest</h1>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/dashboard"
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/users"
            className={`nav-item ${isActive('/users') ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Users</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} style={{ marginRight: '8px' }} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <h2 className="header-title">{pageTitle}</h2>
          <div className="header-info">
            <span>Admin Dashboard</span>
          </div>
        </header>

        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
