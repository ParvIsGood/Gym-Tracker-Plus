import { useState, useEffect } from "react";
import { useGetProfile, useUpdateProfile, EquipmentLevel, Units } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Settings as SettingsIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();

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
      // Will refetch on background automatically
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono uppercase flex items-center gap-3">
          <SettingsIcon className="text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure your iron journey.</p>
      </div>

      <div className="space-y-6">
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
