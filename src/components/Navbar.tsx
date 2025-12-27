import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Home, Users, FolderOpen, User, LogOut } from 'lucide-react';

interface NavbarProps {
  onShowDiscover?: () => void;
}

export default function Navbar({ onShowDiscover }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path;
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">MindThread</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/dashboard')
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>
            <button 
              onClick={() => {
                if (onShowDiscover) {
                  onShowDiscover();
                  navigate('/dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  navigate('/dashboard');
                }
              }}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-muted/50"
            >
              <Users className="h-4 w-4" />
              Active Groups
            </button>
            <button 
              onClick={() => navigate('/documents')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/documents')
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Documents
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/profile')
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
