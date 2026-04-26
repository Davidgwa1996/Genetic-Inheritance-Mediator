import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface RiskHeatmapProps {
  data: any[];
}

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ data }) => {
  // Flatten data for Recharts
   const chartData = data?.flatMap(member => 
    member.risks?.map((risk: any) => ({
      name: member.pseudonym,
      fullLabel: `${member.pseudonym} - ${risk.condition}`,
      condition: risk.condition,
      score: risk.score,
      reasoning: risk.reasoning
    }))
  ) || [];

  const getBarColor = (score: number) => {
    if (score > 70) return '#ef4444'; // Red
    if (score > 40) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family Risk Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="fullLabel" type="category" width={150} fontSize={10} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg max-w-xs">
                      <p className="font-bold">{payload[0].payload.fullLabel}</p>
                      <p className="text-2-xl font-bold" style={{ color: getBarColor(payload[0].value as number) }}>
                        Score: {payload[0].value}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{payload[0].payload.reasoning}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {chartData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
