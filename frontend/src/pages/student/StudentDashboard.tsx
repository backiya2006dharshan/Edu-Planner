import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../components/auth/AuthProvider';
import { Flame, CheckCircle2, TrendingUp, Sparkles, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { learningPlansApi, LearningPlan, LearningTask } from '../../api/learningPlans';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  useEffect(() => {
    fetchActivePlan();
  }, []);

  const fetchActivePlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const plan = await learningPlansApi.getActivePlan();
      setActivePlan(plan);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No active plan, which is fine
        setActivePlan(null);
      } else {
        setError('Failed to load your learning plan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    setCompletingTaskId(taskId);
    try {
      await learningPlansApi.completeTask(taskId);
      // Re-fetch plan to get updated progress
      await fetchActivePlan();
    } catch (err) {
      alert("Failed to complete task");
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Calculate Progress
  let totalTasks = 0;
  let completedTasks = 0;
  
  if (activePlan) {
    activePlan.modules.forEach(m => {
      m.tasks.forEach(t => {
        totalTasks++;
        if (t.is_completed) completedTasks++;
      });
    });
  }
  
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {user?.full_name.split(' ')[0]} 👋</h1>
          <p className="text-gray-400">Continue your personalized learning journey.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/student/generate')} variant="outline" className="shrink-0 group">
            <BookOpen className="w-4 h-4 mr-2 text-primary" />
            New Learning Plan
          </Button>
          <Button onClick={() => navigate('/student/assessment')} className="shrink-0 group">
            <Sparkles className="w-4 h-4 mr-2 text-yellow-300 group-hover:animate-pulse" />
            Take Assessment
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Plan Progress</p>
              <p className="text-2xl font-bold">{progressPercent}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Tasks Completed</p>
              <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-500/20 text-green-400 rounded-2xl border border-green-500/30">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Current Streak</p>
              <p className="text-2xl font-bold">4 Days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Learning Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-gray-400">Loading your plan...</span>
                </div>
              ) : error ? (
                <div className="flex items-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                  {error}
                </div>
              ) : !activePlan ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p className="text-gray-400 mb-4">No active learning plan yet.</p>
                  <Button onClick={() => navigate('/student/generate')}>
                    Generate AI Learning Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary font-medium mb-1">{activePlan.subject}</p>
                    <h3 className="text-xl font-bold">{activePlan.topic}</h3>
                    <p className="text-gray-300 mt-2 text-sm">{activePlan.learning_goal}</p>
                    <div className="w-full bg-black/40 rounded-full h-2 mt-4 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-6 mt-6">
                    {activePlan.modules.map(module => (
                      <div key={module.id} className="space-y-3">
                        <h4 className="font-semibold text-lg border-b border-white/10 pb-2 flex justify-between">
                          {module.title}
                        </h4>
                        <div className="space-y-2">
                          {module.tasks.map(task => (
                            <div key={task.id} className={`p-4 flex items-center justify-between rounded-lg border ${task.is_completed ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'} transition-colors`}>
                              <div className="flex items-center gap-3">
                                {task.is_completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-gray-500 shrink-0" />
                                )}
                                <span className={task.is_completed ? 'text-gray-400 line-through' : 'text-gray-200'}>
                                  {task.title}
                                </span>
                              </div>
                              
                              {!task.is_completed && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled={completingTaskId === task.id}
                                  onClick={() => handleCompleteTask(task.id)}
                                >
                                  {completingTaskId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete"}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <p className="text-sm text-gray-400 italic">No recent activity.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
