import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, accountType);
      }
      onClose();
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {mode === "login" ? "Log In" : "Create Account"}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {mode === "signup" && (
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setAccountType("personal")}
                    className={`flex-1 p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      accountType === "personal"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                    data-testid="button-account-personal"
                  >
                    <User className={`w-5 h-5 ${accountType === "personal" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${accountType === "personal" ? "text-foreground" : "text-muted-foreground"}`}>
                      Personal
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("business")}
                    className={`flex-1 p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      accountType === "business"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                    data-testid="button-account-business"
                  >
                    <Building2 className={`w-5 h-5 ${accountType === "business" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${accountType === "business" ? "text-foreground" : "text-muted-foreground"}`}>
                      Business
                    </span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-4 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-11 px-4 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    data-testid="input-password"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-submit-auth"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === "login" ? "Log In" : "Create Account"}
                </button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => setMode("signup")}
                      className="text-primary hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="text-primary hover:underline"
                    >
                      Log in
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
                <p>Demo accounts:</p>
                <p className="mt-1">Personal: democlient@contrahackathon.com / democlient</p>
                <p>Business: demobusiness@contrahackathon.com / demobusiness</p>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
