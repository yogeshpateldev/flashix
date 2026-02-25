import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionContext } from "@/contexts/SessionContext";
import { Upload, Clock, Shield, ArrowRight, QrCode, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const { sessionId } = useSessionContext();
  const [activeTab, setActiveTab] = useState<"quick" | "login">("quick");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="slide-up space-y-8 max-w-lg">
          <div className="flex justify-center">
            <Link to="/" className="flex flex-col items-center">
              <img 
                src="/logo.png" 
                alt="Flashix Logo" 
                className="h-16 w-16"
              />
            </Link>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Flash<span className="gradient-text">ix</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Share files that self-destruct. Fast, secure, ephemeral.
            </p>
          </div>

          {/* Mode indicator */}
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {isAuthenticated ? (
              <>
                <span>Mode: Logged-in</span>
                <span className="text-foreground">
                  ({user?.email ?? "Account"})
                </span>
              </>
            ) : (
              <>
                <span>Mode: Anonymous</span>
                <span className="font-mono text-[10px] opacity-70">
                  {sessionId.slice(0, 10)}…
                </span>
              </>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: Upload, label: "Drag & Drop" },
              { icon: Clock, label: "Auto-Expire" },
              { icon: Shield, label: "Password Lock" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="mt-4 inline-flex items-center rounded-full bg-secondary p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("quick")}
              className={`rounded-full px-4 py-1.5 transition-all ${
                activeTab === "quick"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quick upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`rounded-full px-4 py-1.5 transition-all ${
                activeTab === "login"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login / Sign up
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "quick" ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-border bg-secondary/60 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">Quick anonymous upload</p>
                  <p className="text-xs text-muted-foreground">
                    No account needed. Files are tied to this browser session and subject to smaller size limits.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-1">
                  <Clock className="h-3 w-3" />
                  Expiration control
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-1">
                  <Shield className="h-3 w-3" />
                  Optional password
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-1">
                  <QrCode className="h-3 w-3" />
                  QR sharing
                </span>
              </div>
              <Link
                to="/upload"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
              >
                Start Quick Upload
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <p className="text-[11px] text-muted-foreground">
                  Want higher limits and analytics? Switch to{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="underline underline-offset-2"
                  >
                    Login / Sign up
                  </button>
                  .
                </p>
              )}
              <Link
                to="/public"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground transition-all hover:bg-secondary/80"
              >
                <Globe className="h-4 w-4" />
                Browse Public Files
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-2xl border border-border bg-secondary/60 p-4 text-left">
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Sign in for more power</p>
                <p className="text-xs text-muted-foreground">
                  Get higher upload limits, full history, and file analytics when you create an account.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/register"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-background/60"
                >
                  Sign In
                </Link>
              </div>
              {isAuthenticated && (
                <p className="text-[11px] text-muted-foreground">
                  You&apos;re already logged in. Jump to your{" "}
                  <Link to="/dashboard" className="underline underline-offset-2">
                    dashboard
                  </Link>{" "}
                  or{" "}
                  <Link to="/upload" className="underline underline-offset-2">
                    upload
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        Flashix — Files that disappear.
      </footer>
    </div>
  );
};

export default Index;
