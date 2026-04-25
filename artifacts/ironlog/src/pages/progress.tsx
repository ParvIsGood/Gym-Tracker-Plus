import { useState } from "react";
import { useGetStatsSummary, useGetVolumeTimeline, useGetFrequencyTimeline, useListPersonalRecords, useListBodyweight } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LineChart as ChartLine, TrendingUp, Calendar, Trophy, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";

export default function Progress() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: volumeData } = useGetVolumeTimeline();
  const { data: freqData } = useGetFrequencyTimeline();
  const { data: prs } = useListPersonalRecords();
  const { data: bodyweightData } = useListBodyweight();

  const [activeTab, setActiveTab] = useState<"volume" | "frequency" | "bodyweight">("volume");

  if (statsLoading) return <div className="p-6">Loading progress...</div>;

  return (
    <div className="p-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono uppercase flex items-center gap-3">
          <ChartLine className="text-primary" /> Progress
        </h1>
        <p className="text-muted-foreground mt-1">Data driven results.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Consistency</div>
            <div className="text-3xl font-black text-primary">{stats?.consistencyScore || 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">All Time Vol</div>
            <div className="text-3xl font-black text-primary">{stats?.totalVolumeAllTime || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 bg-card p-1 rounded-xl border border-border">
        {["volume", "frequency", "bodyweight"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="bg-card border-border mb-8">
        <CardContent className="p-4 h-64">
          {activeTab === "volume" && volumeData && volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <XAxis dataKey="weekStart" tickFormatter={d => format(parseISO(d), 'MMM d')} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} itemStyle={{ color: '#ff6600' }} />
                <Line type="monotone" dataKey="volume" stroke="#ff6600" strokeWidth={3} dot={{ r: 4, fill: '#ff6600' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : activeTab === "frequency" && freqData && freqData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqData}>
                <XAxis dataKey="weekStart" tickFormatter={d => format(parseISO(d), 'MMM d')} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} cursor={{ fill: '#222' }} />
                <Bar dataKey="count" fill="#ff6600" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : activeTab === "bodyweight" && bodyweightData && bodyweightData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...bodyweightData].reverse()}>
                <XAxis dataKey="recordedAt" tickFormatter={d => format(parseISO(d), 'MMM d')} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} itemStyle={{ color: '#ff6600' }} />
                <Line type="monotone" dataKey="weight" stroke="#ff6600" strokeWidth={3} dot={{ r: 4, fill: '#ff6600' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data available yet.</div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
          <Trophy className="text-primary" /> Personal Records
        </h2>
        
        {prs && prs.length > 0 ? (
          <div className="space-y-3">
            {prs.map((pr) => (
              <motion.div 
                key={pr.exerciseId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-border p-4 rounded-xl flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-lg">{pr.exerciseName}</h3>
                  <p className="text-xs text-muted-foreground">{format(new Date(pr.achievedAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">{pr.weight} <span className="text-sm font-sans font-bold text-muted-foreground">× {pr.reps}</span></div>
                  {pr.estimatedOneRm && <div className="text-xs text-muted-foreground font-mono">est 1RM: {Math.round(pr.estimatedOneRm)}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground">No PRs recorded yet. Go lift heavy!</p>
          </div>
        )}
      </div>
    </div>
  );
}
