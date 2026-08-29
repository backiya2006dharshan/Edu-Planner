import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

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
      const [planRes, summaryRes, classRes] = await Promise.allSettled([
        learningPlansApi.getActivePlan(),
        progressApi.getSummary(),
        classroomApi.getStudentClasses(),
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
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
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
      if (res.passed) {
        await loadDashboardData();
      }
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
      setJoinSuccessMsg(`Successfully joined ${joinedCls.name}! 🎉`);
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.response?.data?.detail || 'Failed to join class. Please check your code.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveClass = async (classId: number, className: string) => {
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
        <div className="relative p-4 rounded-xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 border border-primary/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-200">
                Your profile is <span className="text-primary font-bold">{profileCompletion}% complete</span>
              </p>
              <p className="text-xs text-gray-400">Complete your academic details to receive maximum personalized learning plans.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => navigate('/student/profile')} className="text-xs">
              Complete Profile
            </Button>
            <button onClick={() => setBannerDismissed(true)} className="p-1 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Student Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.full_name}. Real data calculated directly from your database records.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Current Streak</p>
              <p className="text-2xl font-bold">{progressSummary?.streak_days ?? 0} Days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Plans Completed</p>
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
              <p className="text-sm font-medium text-gray-400">Tasks Done</p>
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
              <p className="text-sm font-medium text-gray-400">Plan Status</p>
              <p className="text-lg font-bold capitalize">
                {activePlan?.status === 'completed' ? 'Verified 🎉' : activePlan ? 'In Progress' : 'No Active Plan'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes Section */}
      <Card className="border-primary/20 bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
          <div>
            <CardTitle className="text-xl flex items-center">
              <School className="w-5 h-5 mr-2 text-primary" /> My Classes
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">Enrolled classrooms from your instructors.</p>
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
                <div key={cls.id} className="p-4 rounded-xl bg-surface-light border border-white/10 hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-white">{cls.name}</h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {cls.code}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-300 mb-2">
                      Instructor: <span className="text-primary">{cls.teacher_name || 'Instructor'}</span>
                    </p>

                    <div className="text-xs space-y-1 text-gray-400">
                      {cls.college && <p><span className="text-gray-500">College:</span> {cls.college}</p>}
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

                  <div className="pt-2 flex justify-between items-center border-t border-white/5">
                    <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Enrolled
                    </span>
                    <button
                      onClick={() => handleLeaveClass(cls.id, cls.name)}
                      className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <LogOut className="w-3 h-3" /> Leave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              You haven't joined any classes yet. Click <span className="text-primary font-semibold">"Join Class"</span> and enter a 6-character class code from your instructor.
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
                  <span className="ml-3 text-gray-400">Loading plan from database...</span>
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
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 relative">
                    {activePlan.status === 'completed' && (
                      <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Award className="w-4 h-4 text-yellow-300" />
                        Learning Path Verified & Completed
                      </div>
                    )}
                    <p className="text-sm text-primary font-medium mb-1">{activePlan.subject}</p>
                    <h3 className="text-xl font-bold">{activePlan.topic}</h3>
                    <p className="text-gray-300 mt-2 text-sm">{activePlan.learning_goal}</p>
                    <div className="w-full bg-black/40 rounded-full h-2 mt-4 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-6 mt-6">
                    {activePlan.modules.map((module) => (
                      <div key={module.id} className="space-y-3">
                        <h4 className="font-semibold text-lg border-b border-white/10 pb-2 flex justify-between">
                          {module.title}
                        </h4>
                        <div className="space-y-2">
                          {module.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-4 flex items-center justify-between rounded-lg border ${
                                task.is_completed
                                  ? 'bg-green-500/10 border-green-500/20'
                                  : 'bg-white/5 border-white/10'
                              } transition-colors`}
                            >
                              <div className="flex items-center gap-3">
                                {task.is_completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-500 shrink-0" />
                                )}
                                <div>
                                  <p className={`font-medium text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-200'}`}>
                                    {task.title}
                                  </p>
                                  <p className="text-xs text-gray-500 capitalize">{task.task_type}</p>
                                </div>
                              </div>
                              {!task.is_completed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={completingTaskId === task.id}
                                  onClick={() => handleCompleteTask(task.id)}
                                >
                                  {completingTaskId === task.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    'Complete'
                                  )}
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

        {/* Right Column: Quick Stats & Actions */}
        <div className="space-y-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <School className="w-6 h-6 mr-2 text-primary" /> Join Classroom
              </h2>
              <p className="text-xs text-gray-400 mt-1">Enter the 6-character class code provided by your instructor.</p>
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
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Class Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WD7K9P"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full bg-black/40 border border-white/10 focus:border-primary rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest font-bold text-white focus:outline-none uppercase"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowVerifyModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-400" /> Path Verification Test
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Answer 5 AI-generated questions to verify mastery of {activePlan?.topic}. Pass mark: 60% (3/5 correct).
              </p>
            </div>

            {isLoadingVerify ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-gray-400">Generating verification questions from curriculum...</p>
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
                  <div key={q.id} className="p-4 bg-surface-light border border-white/5 rounded-xl space-y-3">
                    <p className="font-semibold text-sm text-gray-200">
                      {idx + 1}. {q.question_text}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            verifyAnswers[q.id] === opt
                              ? 'bg-primary/20 border-primary text-white'
                              : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-300'
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

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
