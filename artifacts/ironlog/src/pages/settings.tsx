import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetProfile, useUpdateProfile, EquipmentLevel, Units } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Settings as SettingsIcon, Save, LogOut, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth/context";
import { SyncStatus } from "@/components/sync-status";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const { isAuthenticated, clearSession } = useAuth();
  const [, setLocation] = useLocation();

  const [displayName, setDisplayName] = useState("");
  const [equipment, setEquipment] = useState<EquipmentLevel>("full_gym");
  const [units, setUnits] = useState<Units>("kg");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setEquipment(profile.equipment || "full_gym");
      setUnits(profile.units || "kg");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        data: { displayName, equipment, units }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    clearSession();
    queryClient.clear();
    setLocation("/login");
  };

  if (isLoading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 pb-24">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase flex items-center gap-3">
            <SettingsIcon className="text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure your iron journey.</p>
        </div>
        <SyncStatus />
      </div>

      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-primary flex items-center gap-2 text-lg">
              <ShieldCheck size={20} /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated && profile?.username ? (
              <>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    Signed in as
                  </div>
                  <div className="font-mono text-lg font-bold mt-0.5">
                    @{profile.username}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Your training is synced across every device you sign in on.
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full font-bold uppercase tracking-wider"
                >
                  <LogOut size={16} className="mr-2" /> Log out
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-amber-400/90">
                    Guest mode
                  </div>
                  <div className="text-sm mt-1 text-foreground/90">
                    Your data lives on this device only. Create an account to sync
                    across devices and protect your gains.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild className="font-bold uppercase tracking-wider">
                    <Link href="/signup">
                      <UserPlus size={16} className="mr-2" /> Sign up
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="font-bold uppercase tracking-wider">
                    <Link href="/login">
                      <LogIn size={16} className="mr-2" /> Sign in
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-primary flex items-center gap-2 text-lg">
              <User size={20} /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Equipment Access</Label>
              <Select value={equipment} onValueChange={(v) => setEquipment(v as EquipmentLevel)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_gym">Full Gym</SelectItem>
                  <SelectItem value="machines_only">Machines Only</SelectItem>
                  <SelectItem value="dumbbells_only">Dumbbells Only</SelectItem>
                  <SelectItem value="home">Home / Bodyweight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Units</Label>
              <Select value={units} onValueChange={(v) => setUnits(v as Units)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || (displayName === profile?.displayName && equipment === profile?.equipment && units === profile?.units)}
              className="w-full mt-4 font-bold"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"} <Save size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p className="font-mono uppercase font-bold tracking-widest text-primary mb-2">IronLog v1.0</p>
          <p>Forged in discipline.</p>
        </div>
      </div>
    </div>
  );
}
