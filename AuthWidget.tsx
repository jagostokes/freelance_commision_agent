import { useState } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "./AuthModal";

export function AuthWidget() {
  const { user, logout, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="h-8 w-24 bg-muted/50 rounded-lg animate-pulse" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-login"
        >
          Log In
        </button>
        <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-xs"
        data-testid="button-user-menu"
      >
        <User className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground max-w-[120px] truncate">{user.email}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{user.accountType} account</p>
            </div>
            <button
              onClick={() => {
                logout();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted flex items-center gap-2"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
