import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { assessmentApi, Skill } from '../../api/assessment';
import { Loader2, Network } from 'lucide-react';

export default function SkillTree() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const data = await assessmentApi.getSkills();
        setSkills(data);
      } catch (err) {
        console.error("Failed to fetch skills", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSkills();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Skill Tree</h1>
        <p className="text-gray-400">Your current knowledge profile and skill progression.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((skill) => {
          const percentage = Math.round(skill.score * 100);
          
          let level = "Beginner";
          let colorClass = "text-blue-400";
          let bgClass = "bg-blue-500";
          let borderClass = "border-blue-500/30";
          
          if (percentage >= 80) {
            level = "Advanced";
            colorClass = "text-purple-400";
            bgClass = "bg-purple-500";
            borderClass = "border-purple-500/30";
          } else if (percentage >= 50) {
            level = "Intermediate";
            colorClass = "text-green-400";
            bgClass = "bg-green-500";
            borderClass = "border-green-500/30";
          }

          return (
            <Card key={skill.id} className={`border-t-4 ${borderClass.replace('border-', 'border-t-').replace('/30', '')}`}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <Network className={`w-6 h-6 ${colorClass}`} />
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold uppercase tracking-wider ${colorClass}`}>{level}</p>
                    <p className="text-2xl font-bold">{percentage}%</p>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold capitalize mb-4">{skill.skill_category}</h3>
                
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${bgClass} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
                </div>
                
                <p className="text-xs text-gray-500 mt-4 text-right">
                  Last assessed: {new Date(skill.last_assessed).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {skills.length === 0 && (
        <Card className="border-dashed border-white/20 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Network className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-300">No Skills Found</h3>
            <p className="text-gray-500 mt-2 max-w-sm">Complete a knowledge assessment to map out your skill tree.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
