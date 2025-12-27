import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { BookOpen, Home, Users, FolderOpen, User, LogOut, Menu } from 'lucide-react';

interface NavbarProps {
  onShowDiscover?: () => void;
}

export default function Navbar({ onShowDiscover }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleNavClick = (path: string, callback?: () => void) => {
    if (callback) {
      callback();
    }
    navigate(path);
    setMobileMenuOpen(false);
    if (path === '/dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: Home,
      onClick: () => handleNavClick('/dashboard'),
    },
    {
      path: '/dashboard',
      label: 'Active Groups',
      icon: Users,
      onClick: () => {
        if (onShowDiscover) {
          onShowDiscover();
        }
        handleNavClick('/dashboard');
      },
    },
    {
      path: '/documents',
      label: 'Documents',
      icon: FolderOpen,
      onClick: () => handleNavClick('/documents'),
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: User,
      onClick: () => handleNavClick('/profile'),
    },
  ];

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
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path + item.label}
                  onClick={item.onClick}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                    active
                      ? 'text-foreground bg-muted/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            {/* Desktop Logout */}
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="hidden md:flex hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h1 className="text-xl font-semibold text-foreground">MindThread</h1>
                  </div>
                  
                  <nav className="flex flex-col gap-2 flex-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <button
                          key={item.path + item.label}
                          onClick={item.onClick}
                          className={`flex items-center gap-3 text-base font-medium transition-colors px-4 py-3 rounded-md ${
                            active
                              ? 'text-foreground bg-muted/50'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>

                  <div className="mt-auto pt-4 border-t border-border">
                    <Button 
                      variant="ghost" 
                      onClick={handleLogout}
                      className="w-full justify-start hover:bg-muted transition-colors"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
