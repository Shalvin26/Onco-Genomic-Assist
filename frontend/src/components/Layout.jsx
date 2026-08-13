import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function Layout({ children }) {
  const { doctor, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-primary">GenomicAssist</span>
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <Link to="/patients" className="text-sm text-muted-foreground hover:text-foreground">
                Patients
              </Link>
              <Link to="/news" className="text-sm text-muted-foreground hover:text-foreground">
                News
              </Link>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Dr. {doctor?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden text-foreground p-2"
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-border px-4 py-3 space-y-3">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              to="/patients"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              Patients
            </Link>
            <Link
              to="/news"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              News
            </Link>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dr. {doctor?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}