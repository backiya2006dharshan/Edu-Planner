import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { progressApi, StudentProgressSummary } from '../../api/progress';
import { TrendingUp, Award, Calendar, CheckCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function Progress() {
  const [summary, setSummary] = useState<StudentProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await progressApi.getSummary();
      setSummary(data);
    } catch {
      setError('Failed to load real progress metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-text-muted">Loading your learning metrics...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Learning Progress</h1>
        <p className="text-text-primary font-medium">Real student metrics and milestone history calculated directly from database records.</p>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/20 to-transparent border-orange-500/30">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 text-orange-400 mb-4" />
            <p className="text-sm font-medium text-text-muted">Current Streak</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{summary?.streak_days ?? 0} Days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-blue-400 mb-4" />
            <p className="text-sm font-medium text-text-muted">Plans Completed</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{summary?.plans_completed ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-transparent border-purple-500/30">
          <CardContent className="p-6">
            <Award className="w-8 h-8 text-purple-400 mb-4" />
            <p className="text-sm font-medium text-text-muted">Skills Mastered</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{summary?.skills_mastered ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 text-green-400 mb-4" />
            <p className="text-sm font-medium text-text-muted">Tasks Completed</p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {summary ? `${summary.completed_tasks}/${summary.total_tasks}` : '0/0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Milestones & Analytics ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Milestones & Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.recent_milestones && summary.recent_milestones.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {summary.recent_milestones.map((item, idx) => (
                  <div key={item.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-surface text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      {item.type === 'plan_completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : item.type === 'skill_mastered' ? (
                        <Award className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-surface-light shadow">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-text-primary text-sm">{item.title}</div>
                        <time className="text-xs text-primary font-medium">
                          {new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </time>
                      </div>
                      <div className="text-text-muted text-xs">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-text-muted text-sm">No activity recorded yet.</p>
                <p className="text-xs text-text-muted mt-1">Complete assessments or tasks to populate your timeline!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-surface-light rounded-xl border border-border">
              <p className="text-xs text-text-muted">Average Competence Score</p>
              <p className="text-3xl font-bold text-primary mt-1">{summary?.average_skill_score ?? 0}%</p>
            </div>

            <div className="p-4 bg-surface-light rounded-xl border border-border">
              <p className="text-xs text-text-muted">RAG Documents Uploaded</p>
              <p className="text-3xl font-bold text-purple-400 mt-1">{summary?.materials_count ?? 0}</p>
            </div>

            <div className="p-4 bg-surface-light rounded-xl border border-border">
              <p className="text-xs text-text-muted">Task Completion Rate</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                {summary && summary.total_tasks > 0
                  ? `${Math.round((summary.completed_tasks / summary.total_tasks) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
