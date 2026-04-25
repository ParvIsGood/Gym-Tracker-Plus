import { useState } from "react";
import { useGetPlan, useUpdatePlanDay, useListExercises, getGetPlanQueryKey, Weekday, Exercise } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Plus, Trash2, Save, X, Edit2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function Plan() {
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = useGetPlan();
  const [editingDay, setEditingDay] = useState<Weekday | null>(null);

  if (isLoading) return <div className="p-6">Loading plan...</div>;

  return (
    <div className="p-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono uppercase flex items-center gap-3">
          <CalendarDays className="text-primary" /> Protocol
        </h1>
        <p className="text-muted-foreground mt-1">Design your weekly battle plan.</p>
      </div>

      <div className="space-y-4">
        {DAYS.map((day, idx) => {
          const dayPlan = plan?.find(p => p.day === day);
          const isRest = dayPlan?.isRest;

          return (
            <motion.div 
              key={day} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`border-border overflow-hidden transition-all ${isRest ? 'opacity-60' : ''}`}>
                <CardContent className="p-0">
                  <div className="flex items-stretch justify-between p-4 cursor-pointer hover:bg-muted/30" onClick={() => setEditingDay(day)}>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">{day}</span>
                        {isRest && <Badge variant="secondary" className="text-[10px]">REST</Badge>}
                      </div>
                      <h3 className="font-bold text-lg">{dayPlan?.label || "No Plan"}</h3>
                      {!isRest && dayPlan?.exercises && dayPlan.exercises.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">{dayPlan.exercises.length} exercises</p>
                      )}
                      {!isRest && (!dayPlan?.exercises || dayPlan.exercises.length === 0) && (
                        <p className="text-sm text-muted-foreground mt-1">Empty</p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center justify-center">
                      <Edit2 size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {editingDay && (
        <EditDayDialog 
          day={editingDay} 
          currentPlan={plan?.find(p => p.day === editingDay)} 
          onClose={() => setEditingDay(null)} 
        />
      )}
    </div>
  );
}

function EditDayDialog({ day, currentPlan, onClose }: { day: Weekday, currentPlan: any, onClose: () => void }) {
  const queryClient = useQueryClient();
  const updatePlanDay = useUpdatePlanDay();
  const { data: catalog } = useListExercises();

  const [label, setLabel] = useState(currentPlan?.label || "");
  const [isRest, setIsRest] = useState(currentPlan?.isRest || false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>(currentPlan?.exercises || []);

  const [showCatalog, setShowCatalog] = useState(false);

  const handleSave = async () => {
    await updatePlanDay.mutateAsync({
      day,
      data: {
        label: label || (isRest ? "Rest Day" : "Workout"),
        isRest,
        exerciseIds: selectedExercises.map(e => e.id)
      }
    });
    queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey() });
    onClose();
  };

  const toggleExercise = (ex: Exercise) => {
    if (selectedExercises.find(e => e.id === ex.id)) {
      setSelectedExercises(selectedExercises.filter(e => e.id !== ex.id));
    } else {
      setSelectedExercises([...selectedExercises, ex]);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md h-[85vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 border-b border-border bg-card">
          <DialogTitle className="uppercase tracking-wider">Edit {day}</DialogTitle>
        </DialogHeader>

        {!showCatalog ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
              <Label htmlFor="rest-mode" className="text-base font-bold uppercase tracking-wide">Rest Day</Label>
              <Switch id="rest-mode" checked={isRest} onCheckedChange={setIsRest} />
            </div>

            <div className="space-y-3">
              <Label className="uppercase tracking-wider text-muted-foreground text-xs">Workout Name</Label>
              <Input 
                value={label} 
                onChange={e => setLabel(e.target.value)} 
                placeholder={isRest ? "e.g. Active Recovery" : "e.g. Push Day"}
                className="h-12 text-lg bg-card"
              />
            </div>

            {!isRest && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="uppercase tracking-wider text-muted-foreground text-xs">Exercises</Label>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setShowCatalog(true)}>
                    <Plus size={16} className="mr-1" /> Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <AnimatePresence>
                    {selectedExercises.map((ex, i) => (
                      <motion.div 
                        key={ex.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-mono text-sm w-4">{i + 1}</span>
                          <span className="font-bold">{ex.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => toggleExercise(ex)}>
                          <Trash2 size={16} />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {selectedExercises.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-border rounded-xl bg-card/50">
                      <Dumbbell className="mx-auto text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No exercises selected</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border bg-card flex items-center justify-between">
              <span className="font-bold">Select Exercises</span>
              <Button variant="ghost" size="sm" onClick={() => setShowCatalog(false)}>Done</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {catalog?.map(ex => {
                const isSelected = !!selectedExercises.find(e => e.id === ex.id);
                return (
                  <div 
                    key={ex.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/50' : 'bg-card border-border hover:bg-muted/50'}`}
                    onClick={() => toggleExercise(ex)}
                  >
                    <div>
                      <div className="font-bold">{ex.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{ex.muscleGroup.replace('_', ' ')}</div>
                    </div>
                    {isSelected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><Plus size={14} className="rotate-45" /></div>}
                    {!isSelected && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center"><Plus size={14} className="text-muted-foreground/50" /></div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!showCatalog && (
          <div className="p-4 border-t border-border bg-card">
            <Button className="w-full h-12 text-lg font-bold uppercase tracking-wider" onClick={handleSave} disabled={updatePlanDay.isPending}>
              {updatePlanDay.isPending ? "Saving..." : "Save Protocol"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
