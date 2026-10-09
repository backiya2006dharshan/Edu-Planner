import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { LearningTaskItem } from '../../components/learning/LearningTaskItem';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../components/auth/AuthProvider';
import {
  Flame,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Loader2,
  BookOpen,
  AlertCircle,
  UserCircle2,
  X,
  Award,
  School,
  Plus,
  LogOut,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  learningPlansApi,
  LearningPlan,
  VerificationQuestion,
  VerificationSubmitResult,
} from '../../api/learningPlans';
import { progressApi, StudentProgressSummary } from '../../api/progress';
import { classroomApi, Classroom } from '../../api/classroom';
import { skillsApi, SkillScores } from '../../api/skills';

function getProfileCompletion(user: any): number {
  const fields = ['phone', 'department', 'year_of_study', 'bio', 'college', 'regulation', 'semester'];
  const filled = fields.filter((f) => !!user?.[f]);
  return Math.round((filled.length / fields.length) * 100);
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);
  const [progressSummary, setProgressSummary] = useState<StudentProgressSummary | null>(null);
  const [studentClasses, setStudentClasses] = useState<Classroom[]>([]);
  const [skillScores, setSkillScores] = useState<SkillScores | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<number | null>(null);

  // Verification 5-MCQ test states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyQuestions, setVerifyQuestions] = useState<VerificationQuestion[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<Record<number, string>>({});
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationSubmitResult | null>(null);

  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Join Class Modal states
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccessMsg, setJoinSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [planRes, summaryRes, classRes, skillsRes] = await Promise.allSettled([
        learningPlansApi.getActivePlan(),
        progressApi.getSummary(),
        classroomApi.getStudentClasses(),
        skillsApi.getSkills(),
      ]);

      if (planRes.status === 'fulfilled') {
        setActivePlan(planRes.value);
      } else {
        setActivePlan(null);
      }

      if (summaryRes.status === 'fulfilled') {
        setProgressSummary(summaryRes.value);
      }

      if (classRes.status === 'fulfilled') {
        setStudentClasses(classRes.value);
      }

      if (skillsRes.status === 'fulfilled') {
        setSkillScores(skillsRes.value);
      }
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTask = async (taskId: number) => {
    setStartingTaskId(taskId);
    try {
      await learningPlansApi.startTask(taskId);
      await loadDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setStartingTaskId(null);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    setCompletingTaskId(taskId);
    try {
      await learningPlansApi.completeTask(taskId);
      await loadDashboardData();
    } catch {
      alert('Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleStartVerification = async () => {
    if (!activePlan) return;
    setIsLoadingVerify(true);
    setVerifyResult(null);
    setVerifyAnswers({});
    setShowVerifyModal(true);
    try {
      const qList = await learningPlansApi.getVerificationQuestions(activePlan.id);
      setVerifyQuestions(qList);
    } catch {
      alert('Failed to load verification test questions.');
      setShowVerifyModal(false);
    } finally {
      setIsLoadingVerify(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!activePlan) return;
    setIsSubmittingVerify(true);
    try {
      const payload = Object.entries(verifyAnswers).map(([qId, option]) => ({
        question_id: Number(qId),
        selected_option: option,
      }));
      const res = await learningPlansApi.submitVerificationTest(activePlan.id, payload);
      setVerifyResult(res);
      // Always reload dashboard data:
      // - On pass: reflects plan completed status
      // - On fail: reflects restored (not_started) task statuses
      await loadDashboardData();
    } catch {
      alert('Failed to submit verification test.');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleJoinClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError('');
    setJoinSuccessMsg(null);
    try {
      const joinedCls = await classroomApi.joinClass({ code: joinCode.trim() });
      setStudentClasses((prev) => [joinedCls, ...prev]);
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/student/classroom/${joinedCls.id}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.detail || 'Failed to join class. Please check your code.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveClass = async (e: React.MouseEvent, classId: number, className: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to leave ${className}?`)) return;
    try {
      await classroomApi.leaveClass(classId);
      setStudentClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to leave class.');
    }
  };

  // Calculate Plan Progress
  let totalPlanTasks = 0;
  let completedPlanTasks = 0;
  if (activePlan) {
    activePlan.modules.forEach((m) => {
      m.tasks.forEach((t) => {
        totalPlanTasks++;
        if (t.is_completed) completedPlanTasks++;
      });
    });
  }
  const progressPercent = totalPlanTasks > 0 ? Math.round((completedPlanTasks / totalPlanTasks) * 100) : 0;
  const profileCompletion = getProfileCompletion(user);

  return (
    <div className="space-y-6">
      {/* Profile Completion Nudge Banner */}
      {!bannerDismissed && profileCompletion < 100 && (
        <div className="relative p-4 rounded-xl bg-gradient-to-r from-[#6B3FFF] to-[#4F7EFF] border border-border flex items-center justify-between gap-4 shadow-[0_4px_20px_rgba(79,126,255,0.4)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-surface-light text-text-primary rounded-xl shrink-0 backdrop-blur-sm">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-text-primary">
                Your profile is <span className="font-bold">{profileCompletion}% complete</span>
              </p>
              <p className="text-xs text-text-primary/80">Complete your academic details to receive maximum personalized learning plans.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => navigate('/student/profile')} className="text-xs bg-white text-[#4F7EFF] hover:bg-gray-100 border-0">
              Complete Profile
            </Button>
            <button onClick={() => setBannerDismissed(true)} className="p-1 text-text-primary/70 hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-text-primary">Student Dashboard</h1>
        <p className="text-text-primary font-medium opacity-90">Welcome back, {user?.full_name}. Real data calculated directly from your database records.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-warning/30 to-warning/5 text-warning rounded-2xl border border-warning/40 shadow-[0_0_15px_rgba(255,181,71,0.2)]">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Current Streak</p>
              <p className="text-2xl font-bold">{progressSummary?.streak_days ?? 0} Days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/5 text-primary rounded-2xl border border-primary/40 shadow-[0_0_15px_rgba(79,126,255,0.2)]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Plans Completed</p>
              <p className="text-2xl font-bold">{progressSummary?.plans_completed ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Tasks Done</p>
              <p className="text-2xl font-bold">
                {progressSummary?.completed_tasks ?? 0}/{progressSummary?.total_tasks ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-2xl border border-yellow-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Plan Status</p>
              <p className="text-lg font-bold capitalize">
                {activePlan?.status === 'completed' ? 'Verified 🎉' : activePlan ? 'In Progress' : 'No Active Plan'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes Section */}
      <Card className="border-primary/20 bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <div>
            <CardTitle className="text-xl flex items-center">
              <School className="w-5 h-5 mr-2 text-primary" /> My Classes
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">Click any enrolled classroom to access its materials, skills, and AI learning plan.</p>
          </div>
          <Button
            onClick={() => {
              setShowJoinModal(true);
              setJoinError('');
              setJoinSuccessMsg(null);
              setJoinCode('');
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Join Class
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {studentClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentClasses.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/student/classroom/${cls.id}`)}
                  className="p-5 rounded-2xl bg-[#0a0a0a] border border-border hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">{cls.name}</h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {cls.code}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-text-muted mb-2">
                      Instructor: <span className="text-primary">{cls.teacher_name || 'Instructor'}</span>
                    </p>

                    <div className="text-xs space-y-1 text-text-muted">
                      {cls.college && <p><span className="text-text-muted">College:</span> {cls.college}</p>}
                      {(cls.year || cls.semester || cls.regulation || cls.section) && (
                        <p>
                          {cls.year && `Year ${cls.year} • `}
                          {cls.semester && `Sem ${cls.semester} • `}
                          {cls.regulation && `Reg ${cls.regulation} `}
                          {cls.section && `(Sec ${cls.section})`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between items-center border-t border-border">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:underline">
                      Enter Classroom →
                    </span>
                    <button
                      onClick={(e) => handleLeaveClass(e, cls.id, cls.name)}
                      className="text-xs text-text-muted hover:text-red-400 flex items-center gap-1 transition-colors z-10"
                    >
                      <LogOut className="w-3 h-3" /> Leave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
                <School className="w-12 h-12 text-primary opacity-80" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">No Classes Yet</h3>
              <p className="text-text-muted text-sm max-w-md mb-6">
                You haven't joined any classes yet. Get a 6-character class code from your instructor to get started!
              </p>
              <Button onClick={() => { setShowJoinModal(true); setJoinCode(''); setJoinError(''); }} className="btn-gradient">
                Join a Class
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Learning Plan */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Learning Plan</CardTitle>
              {activePlan && activePlan.status !== 'completed' && (
                <Button size="sm" onClick={handleStartVerification} className="gap-2">
                  <Award className="w-4 h-4 text-yellow-300" />
                  Verify Path (5-MCQ Test)
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-text-muted">Loading plan from database...</span>
                </div>
              ) : error ? (
                <div className="flex items-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                  {error}
                </div>
              ) : !activePlan ? (
                <div className="text-center py-12 border border-primary/20 rounded-2xl bg-surface shadow-[0_0_20px_rgba(79,126,255,0.1)] flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Ready to Learn?</h3>
                  <p className="text-text-muted mb-6 max-w-md">Let our AI generate a personalized learning path tailored just for you.</p>
                  <Button onClick={() => navigate('/student/generate')} className="btn-gradient">
                    Generate AI Learning Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-primary/20 relative shadow-[0_8px_32px_rgba(79,126,255,0.1)]">
                    {activePlan.status === 'completed' && (
                      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-secondary/20 text-secondary border border-secondary/30 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Award className="w-4 h-4" />
                        Learning Path Verified & Completed
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-primary font-medium mb-1">{activePlan.subject}</p>
                        <h3 className="text-2xl font-bold text-text-primary">{activePlan.topic}</h3>
                        <p className="text-text-muted mt-2 text-sm max-w-2xl">{activePlan.learning_goal}</p>
                      </div>
                      <Sparkles className="w-10 h-10 text-primary opacity-80" />
                    </div>
                    <div className="w-full bg-background/40 rounded-full h-2 mt-4 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-6 mt-6">
                    {activePlan.modules.map((module) => (
                      <div key={module.id} className="space-y-3">
                        <h4 className="font-semibold text-lg border-b border-border pb-2 flex justify-between">
                          {module.title}
                        </h4>
                        <div className="space-y-2">
                          {module.tasks.map((task) => (
                            <LearningTaskItem
                              key={task.id}
                              task={task}
                              onStart={handleStartTask}
                              onComplete={handleCompleteTask}
                              isLoading={completingTaskId === task.id || startingTaskId === task.id}
                            />
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

        {/* Right Column: Quick Stats & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {skillScores ? (
                <div className="space-y-3">
                  {Object.entries(skillScores).map(([key, score]) => {
                    const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    const isStrong = score >= 70;
                    return (
                      <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-surface-light border border-border">
                        <span className="text-sm font-medium text-text-primary">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{Math.round(Number(score) || 0)}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isStrong ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {isStrong ? 'Strong' : 'Needs Work'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted text-sm border border-border rounded-2xl bg-surface/50 backdrop-blur-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[120px]">
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <UserCircle2 className="w-6 h-6 mb-2 opacity-50" />
                    <p>Complete assignments to unlock skill insights.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => navigate('/student/generate')} className="w-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 mr-2" /> Create Learning Plan
              </Button>
              <Button onClick={() => navigate('/student/skill-tree')} variant="outline" className="w-full">
                View Skill Tree
              </Button>
              <Button onClick={() => navigate('/student/assessment')} variant="outline" className="w-full">
                Take Diagnostic Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-text-primary flex items-center">
                <School className="w-6 h-6 mr-2 text-primary" /> Join Classroom
              </h2>
              <p className="text-xs text-text-muted mt-1">Enter the 6-character class code provided by your instructor.</p>
            </div>

            {joinError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                {joinError}
              </div>
            )}

            {joinSuccessMsg ? (
              <div className="space-y-4 py-4 text-center">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300">
                  <p className="font-semibold text-sm">{joinSuccessMsg}</p>
                </div>
                <Button className="w-full" onClick={() => setShowJoinModal(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleJoinClassSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Class Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WD7K9P"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full bg-background/40 border border-border focus:border-primary rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest font-bold text-text-primary focus:outline-none uppercase"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowJoinModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full" disabled={isJoining || !joinCode.trim()}>
                    {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Join Class
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Verification 5-MCQ Test Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowVerifyModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-text-primary flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-400" /> Path Verification Test
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Answer 5 AI-generated questions to verify mastery of {activePlan?.topic}. Pass mark: 60% (3/5 correct).
              </p>
            </div>

            {isLoadingVerify ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-text-muted">Generating verification questions from curriculum...</p>
              </div>
            ) : verifyResult ? (
              <div className="space-y-6 py-4">
                <div
                  className={`p-6 rounded-xl border text-center space-y-2 ${
                    verifyResult.passed
                      ? 'bg-green-500/10 border-green-500/30 text-green-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <p className="text-3xl font-bold">{verifyResult.score_percent}%</p>
                  <p className="font-semibold text-lg">{verifyResult.passed ? 'PASSED & VERIFIED!' : 'NEEDS REVISION'}</p>
                  <p className="text-sm opacity-90">{verifyResult.message}</p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setShowVerifyModal(false)}>Close</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {verifyQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-surface-light border border-border rounded-xl space-y-3">
                    <p className="font-semibold text-sm text-text-primary">
                      {idx + 1}. {q.question_text}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            verifyAnswers[q.id] === opt
                              ? 'bg-primary/20 border-primary text-text-primary'
                              : 'bg-surface-light border-border hover:border-border text-text-muted'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt}
                            checked={verifyAnswers[q.id] === opt}
                            onChange={() => setVerifyAnswers({ ...verifyAnswers, [q.id]: opt })}
                            className="sr-only"
                          />
                          <span className="text-xs font-medium mr-3 text-primary">{String.fromCharCode(65 + oIdx)}.</span>
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowVerifyModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={isSubmittingVerify || Object.keys(verifyAnswers).length < verifyQuestions.length}
                  >
                    {isSubmittingVerify ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Verification Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
