import { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateProfile, useAddBodyweight, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { EquipmentLevel, Units } from "@workspace/api-client-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();
  const addBodyweight = useAddBodyweight();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [equipment, setEquipment] = useState<EquipmentLevel>("full_gym");
  const [units, setUnits] = useState<Units>("kg");
  const [weight, setWeight] = useState("");

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    try {
      await updateProfile.mutateAsync({
        data: {
          displayName: displayName || "Lifter",
          equipment,
          units
        }
      });

      if (weight && !isNaN(Number(weight))) {
        await addBodyweight.mutateAsync({
          data: { weight: Number(weight) }
        });
      }

      // Make sure we read the freshly-flagged isOnboarded profile before navigating,
      // otherwise the AuthWrapper will bounce us right back to onboarding.
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      await queryClient.refetchQueries({ queryKey: getGetProfileQueryKey() });
      setLocation("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-background z-0 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/50">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-mono tracking-tight uppercase">IRONLOG</h1>
          <p className="text-muted-foreground mt-2">Forged in discipline.</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-xl">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-bold mb-4">What should we call you?</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    placeholder="e.g. Ronnie" 
                    className="h-12 text-lg"
                  />
                </div>
                <Button className="w-full h-12 text-lg font-bold" onClick={handleNext}>Continue</Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-bold mb-4">What equipment do you have?</h2>
              <RadioGroup value={equipment} onValueChange={(v) => setEquipment(v as EquipmentLevel)} className="space-y-3 mb-6">
                {[
                  { value: "full_gym", label: "Full Gym", desc: "Access to everything" },
                  { value: "machines_only", label: "Machines Only", desc: "Planet fitness style" },
                  { value: "dumbbells_only", label: "Dumbbells Only", desc: "Basic free weights" },
                  { value: "home", label: "Home / Bodyweight", desc: "Minimal or no gear" }
                ].map(opt => (
                  <div key={opt.value} className="flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setEquipment(opt.value as EquipmentLevel)}>
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value} className="flex-1 cursor-pointer">
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button className="w-full h-12 text-lg font-bold" onClick={handleNext}>Continue</Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-bold mb-4">Preferred Units</h2>
              <RadioGroup value={units} onValueChange={(v) => setUnits(v as Units)} className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:border-primary/50" onClick={() => setUnits("kg")}>
                  <RadioGroupItem value="kg" id="kg" />
                  <Label htmlFor="kg" className="flex-1 cursor-pointer font-bold">Kilograms (kg)</Label>
                </div>
                <div className="flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:border-primary/50" onClick={() => setUnits("lb")}>
                  <RadioGroupItem value="lb" id="lb" />
                  <Label htmlFor="lb" className="flex-1 cursor-pointer font-bold">Pounds (lb)</Label>
                </div>
              </RadioGroup>
              <Button className="w-full h-12 text-lg font-bold" onClick={handleNext}>Continue</Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-bold mb-4">Starting Body Weight (Optional)</h2>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight ({units})</Label>
                  <Input 
                    id="weight" 
                    type="number"
                    value={weight} 
                    onChange={e => setWeight(e.target.value)} 
                    placeholder="0.0" 
                    className="h-12 text-lg"
                  />
                </div>
              </div>
              <Button className="w-full h-12 text-lg font-bold" onClick={handleNext} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Start Lifting"}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
