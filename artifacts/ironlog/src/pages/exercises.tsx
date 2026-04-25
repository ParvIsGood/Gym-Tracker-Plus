import { useState } from "react";
import { Link } from "wouter";
import { useListExercises, MuscleGroup, EquipmentLevel } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Search, Filter, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "all">("all");
  
  const { data: exercises, isLoading } = useListExercises({ 
    muscleGroup: muscleGroup === "all" ? undefined : muscleGroup 
  });

  const filteredExercises = exercises?.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 pb-24 h-[100dvh] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold font-mono uppercase flex items-center gap-3">
          <Dumbbell className="text-primary" /> Arsenal
        </h1>
        <p className="text-muted-foreground mt-1">Exercise database & form guide.</p>
      </div>

      <div className="flex gap-3 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <Input 
            className="pl-10 h-12 bg-card border-border" 
            placeholder="Search exercises..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={muscleGroup} onValueChange={(v) => setMuscleGroup(v as MuscleGroup | "all")}>
          <SelectTrigger className="w-32 h-12 bg-card">
            <Filter size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="chest">Chest</SelectItem>
            <SelectItem value="back">Back</SelectItem>
            <SelectItem value="legs">Legs</SelectItem>
            <SelectItem value="shoulders">Shoulders</SelectItem>
            <SelectItem value="arms">Arms</SelectItem>
            <SelectItem value="core">Core</SelectItem>
            <SelectItem value="full_body">Full Body</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {isLoading ? (
          <div className="text-center py-8">Loading arsenal...</div>
        ) : filteredExercises?.length ? (
          filteredExercises.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/exercises/${ex.id}`}>
                <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-1">{ex.name}</h3>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                        {ex.muscleGroup.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 bg-muted text-muted-foreground rounded capitalize">
                        {ex.equipment.replace('_', ' ')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No exercises found matching criteria.
          </div>
        )}
      </div>
    </div>
  );
}
