import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../components/auth/AuthProvider';
import { LearningTaskItem } from '../../components/learning/LearningTaskItem';
import {
  classroomApi,
  Classroom,
  ClassroomOverview,
  ClassroomProgress,
  ClassroomCurriculum,
  ClassroomSkills,
  ClassroomAskAIResponse,
} from '../../api/classroom';
import { materialsApi, Material, MaterialDetail } from '../../api/materials';
import { assessmentApi, Question, Skill } from '../../api/assessment';
import {
  learningPlansApi,
  LearningPlan,
  VerificationQuestion,
  VerificationSubmitResult,
} from '../../api/learningPlans';
import { aiApi } from '../../api/ai';
import {
  School,
  BookOpen,
  Brain,
  BrainCircuit,
  Award,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Info,
  ChevronLeft,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Eye,
  Layers,
  CheckCircle2,
  Plus,
  Play,
  ArrowRight,
  ShieldAlert,
  Target,
  Lightbulb,
  NotebookPen,
  LogOut,
  Send,
  HelpCircle,
  Clock,
  User,
  Zap,
  BarChart3,
  Network,
  X,
  Edit3,
} from 'lucide-react';

/* ── File Badge Helper ────────────────────────────────────────── */
function FileBadge({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pdf: { label: 'PDF', bg: 'bg-red-500/20', text: 'text-red-400' },
    docx: { label: 'DOCX', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    pptx: { label: 'PPTX', bg: 'bg-orange-500/20', text: 'text-orange-400' },
    txt: { label: 'TXT', bg: 'bg-gray-500/20', text: 'text-text-muted' },
    md: { label: 'MD', bg: 'bg-green-500/20', text: 'text-green-400' },
  };
  const { label, bg, text } = map[ext] ?? { label: ext.toUpperCase() || 'FILE', bg: 'bg-surface-light', text: 'text-text-muted' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bg} ${text}`}>
      {label}
    </span>
  );
}

/* ── Skill Level Config ───────────────────────────────────────── */
function getSkillConfig(score: number) {
  const pct = Math.round(score);
  if (pct >= 80) return { level: 'Advanced', color: 'purple', hex: '#a855f7' };
  if (pct >= 50) return { level: 'Intermediate', color: 'green', hex: '#22c55e' };
  if (pct >= 25) return { level: 'Developing', color: 'yellow', hex: '#eab308' };
  return { level: 'Beginner', color: 'blue', hex: '#3b82f6' };
}

const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  purple: { text: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-500/40' },
  green: { text: 'text-green-400', bg: 'bg-green-500', border: 'border-green-500/40' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/40' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/40' },
};

/* ── View Document Modal ──────────────────────────────────────── */
function ViewDocumentModal({ materialId, onClose }: { materialId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<MaterialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await materialsApi.getDetail(materialId);
        setDetail(data);
      } catch (err) {
        console.error('Failed to load document detail', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [materialId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-text-primary">{detail?.file_name || 'Loading Document...'}</h2>
              {detail && (
                <p className="text-xs text-text-muted">
                  {detail.college} · Sem {detail.semester} · Reg {detail.regulation} ({detail.chunk_count} RAG chunks)
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
              <span className="text-text-muted">Reading document chunks from database...</span>
            </div>
          ) : !detail || detail.chunks.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No content chunks found for this document.</div>
          ) : (
            <div className="space-y-4">
              {detail.chunks.map((chunk, idx) => (
                <div key={chunk.id} className="p-4 bg-surface-light border border-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-primary font-semibold border-b border-border pb-2">
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Chunk #{idx + 1}
                    </span>
                    {chunk.page_number != null && <span>Page {chunk.page_number}</span>}
                  </div>
                  <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Close Viewer</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Student Classroom Component ─────────────────────────── */
export default function StudentClassroom() {
  const { classId } = useParams<{ classId: string }>();
  const classIdNum = Number(classId);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Tabs state
  type TabType =
    | 'overview'
    | 'materials'
    | 'skills'
    | 'assessment'
    | 'learning_plan'
    | 'progress'
    | 'ask_ai'
    | 'info';

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Classroom data states
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [overview, setOverview] = useState<ClassroomOverview | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [curriculum, setCurriculum] = useState<ClassroomCurriculum | null>(null);
  const [skillsData, setSkillsData] = useState<ClassroomSkills | null>(null);
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [progressData, setProgressData] = useState<ClassroomProgress | null>(null);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Materials tab states
  const [materialSearch, setMaterialSearch] = useState('');
  const [viewingMaterialId, setViewingMaterialId] = useState<number | null>(null);

  // Skills tab states
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Assessment tab states
  const [assessmentStep, setAssessmentStep] = useState<'intro' | 'active' | 'result'>('intro');
  const [assessmentQuestions, setAssessmentQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, string>>({});
  const [isStartingAssessment, setIsStartingAssessment] = useState(false);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentActiveId, setAssessmentActiveId] = useState<number | null>(null);
  const [assessmentResultMsg, setAssessmentResultMsg] = useState<string | null>(null);

  // AI Learning Plan Generator states
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generateLoadingIdx, setGenerateLoadingIdx] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activePlanView, setActivePlanView] = useState<LearningPlan | null>(null);


  // Verification 5-MCQ test states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyQuestions, setVerifyQuestions] = useState<VerificationQuestion[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<Record<number, string>>({});
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationSubmitResult | null>(null);

  // Ask AI states
  interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    sources?: Array<{ file_name: string; page_number?: number; content_snippet: string }>;
    rag_grounded?: boolean;
    timestamp: Date;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadingMessages = [
    "Retrieving classroom-specific materials from ChromaDB vector store...",
    "Analyzing your current skill tree & gaps for this subject...",
    "Synthesizing personalized plan with Analyst agent...",
    "Optimizing lesson sequence with Optimizer agent...",
    "Evaluating plan grounding and quality with Evaluator agent...",
  ];

  /* ── Fetch Classroom Data ─────────────────────────────────────── */
  const loadClassroomData = async () => {
    if (!classIdNum) return;
    setIsLoading(true);
    setError(null);
    try {
      const [clsRes, ovRes, matRes, curRes, skRes, lpRes, prRes] = await Promise.allSettled([
        classroomApi.getClassDetails(classIdNum),
        classroomApi.getClassOverview(classIdNum),
        classroomApi.getClassMaterials(classIdNum),
        classroomApi.getClassCurriculum(classIdNum),
        classroomApi.getClassSkills(classIdNum),
        classroomApi.getClassLearningPlans(classIdNum),
        classroomApi.getClassProgress(classIdNum),
      ]);

      if (clsRes.status === 'fulfilled') {
        setClassroom(clsRes.value);
      } else {
        const status = (clsRes.reason as any)?.response?.status;
        if (status === 403) {
          setError('You are not enrolled in this classroom or unauthorized.');
        } else {
          setError('Classroom not found.');
        }
        setIsLoading(false);
        return;
      }

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (matRes.status === 'fulfilled') setMaterials(matRes.value);
      if (curRes.status === 'fulfilled') setCurriculum(curRes.value);
      if (skRes.status === 'fulfilled') setSkillsData(skRes.value);
      if (lpRes.status === 'fulfilled') {
        setLearningPlans(lpRes.value);
        if (lpRes.value.length > 0) {
          const active = lpRes.value.find((p) => p.status === 'active') || lpRes.value[0];
          setActivePlanView(active);
        }
      }
      if (prRes.status === 'fulfilled') setProgressData(prRes.value);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load classroom data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClassroomData();
  }, [classIdNum]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAskingAI]);

  const handleCopyCode = () => {
    if (classroom?.code) {
      navigator.clipboard.writeText(classroom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLeaveClass = async () => {
    if (!classroom) return;
    if (!window.confirm(`Are you sure you want to leave ${classroom.name}?`)) return;
    try {
      await classroomApi.leaveClass(classroom.id);
      navigate('/student/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to leave class.');
    }
  };

  /* ── Materials Filtering ─────────────────────────────────────── */
  const filteredMaterials = materials.filter((m) => {
    const q = materialSearch.toLowerCase();
    return m.file_name.toLowerCase().includes(q);
  });

  /* ── Add Custom Skill ────────────────────────────────────────── */
  const handleAddSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setIsAddingSkill(true);
    try {
      await assessmentApi.addCustomSkill(newSkillName.trim());
      await loadClassroomData();
      setNewSkillName('');
      setShowAddSkillModal(false);
    } catch (err) {
      console.error('Failed to add skill', err);
    } finally {
      setIsAddingSkill(false);
    }
  };

  /* ── Assessment Flow ─────────────────────────────────────────── */
  const handleStartAssessment = async () => {
    setIsStartingAssessment(true);
    try {
      const startRes = await assessmentApi.start();
      setAssessmentActiveId(startRes.assessment_id);
      const qList = await assessmentApi.getQuestions(startRes.assessment_id);
      setAssessmentQuestions(qList);
      setCurrentQuestionIdx(0);
      setAssessmentAnswers({});
      setAssessmentStep('active');
    } catch {
      alert('Failed to start assessment.');
    } finally {
      setIsStartingAssessment(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!assessmentActiveId) return;
    setIsSubmittingAssessment(true);
    try {
      const answersList = Object.entries(assessmentAnswers).map(([qId, ans]) => ({
        question_id: Number(qId),
        selected_option: ans,
      }));
      const res = await assessmentApi.submit({ session_id: String(assessmentActiveId), answers: answersList });
      setAssessmentResultMsg(res.message || 'Assessment successfully completed and scored!');
      setAssessmentStep('result');
      await loadClassroomData();
    } catch {
      alert('Failed to submit assessment.');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  /* ── AI Learning Plan Generator Flow ─────────────────────────── */
  const handleGeneratePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const topicToUse = (selectedTopic === 'custom' ? customTopic : selectedTopic) || classroom?.name || '';
    if (!topicToUse.trim()) return;

    setIsGeneratingPlan(true);
    setGenerateError(null);

    const interval = setInterval(() => {
      setGenerateLoadingIdx((prev) => Math.min(prev + 1, loadingMessages.length - 1));
    }, 2500);

    try {
      await aiApi.generateLearningPlan({
        subject: classroom?.name || 'Class Subject',
        topic: topicToUse.trim(),
        learning_goal: learningGoal.trim() || `Master core concepts and problem solving in ${topicToUse.trim()}`,
        college: classroom?.college || '',
        semester: classroom?.semester || '',
        regulation: classroom?.regulation || '',
        year: classroom?.year || '',
      });

      await loadClassroomData();
      // Fetch latest plan
      const updatedPlans = await classroomApi.getClassLearningPlans(classIdNum);
      setLearningPlans(updatedPlans);
      if (updatedPlans.length > 0) {
        setActivePlanView(updatedPlans[0]);
      }
      setSelectedTopic('');
      setCustomTopic('');
      setLearningGoal('');
    } catch (err: any) {
      setGenerateError(err.response?.data?.detail || 'Failed to generate learning plan. Please try again.');
    } finally {
      clearInterval(interval);
      setIsGeneratingPlan(false);
      setGenerateLoadingIdx(0);
    }
  };

  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<number | null>(null);

  const handleStartTask = async (taskId: number) => {
    setStartingTaskId(taskId);
    try {
      await learningPlansApi.startTask(taskId);
      await loadClassroomData();
      if (activePlanView) {
        const updated = await learningPlansApi.getPlanById(activePlanView.id);
        setActivePlanView(updated);
      }
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
      await loadClassroomData();
      if (activePlanView) {
        const updated = await learningPlansApi.getPlanById(activePlanView.id);
        setActivePlanView(updated);
      }
    } catch {
      alert('Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

  /* ── Plan Verification Flow ──────────────────────────────────── */
  const handleStartVerification = async () => {
    if (!activePlanView) return;
    setIsLoadingVerify(true);
    setVerifyResult(null);
    setVerifyAnswers({});
    setShowVerifyModal(true);
    try {
      const qList = await learningPlansApi.getVerificationQuestions(activePlanView.id);
      setVerifyQuestions(qList);
    } catch {
      alert('Failed to load verification test questions.');
      setShowVerifyModal(false);
    } finally {
      setIsLoadingVerify(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!activePlanView) return;
    setIsSubmittingVerify(true);
    try {
      const payload = Object.entries(verifyAnswers).map(([qId, option]) => ({
        question_id: Number(qId),
        selected_option: option,
      }));
      const res = await learningPlansApi.submitVerificationTest(activePlanView.id, payload);
      setVerifyResult(res);
      // Always reload data:
      // - On pass: reflects plan completed status
      // - On fail: reflects restored (not_started) task statuses
      await loadClassroomData();
      const updated = await learningPlansApi.getPlanById(activePlanView.id);
      setActivePlanView(updated);
    } catch {
      alert('Failed to submit verification test.');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  /* ── Ask AI Flow ─────────────────────────────────────────────── */
  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isAskingAI) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: inputQuestion.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsAskingAI(true);

    try {
      const res: ClassroomAskAIResponse = await classroomApi.askClassroomAI(classIdNum, userMsg.text);
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: res.answer,
        sources: res.sources,
        rag_grounded: res.rag_grounded,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: err.response?.data?.detail || 'Sorry, I encountered an error retrieving materials. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAskingAI(false);
    }
  };

  /* ── Loading and Error Views ─────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-text-muted font-medium">Loading classroom environment...</p>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-surface border border-red-500/30 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Classroom Access Error</h2>
        <p className="text-sm text-text-muted">{error || 'Classroom details could not be retrieved.'}</p>
        <Button onClick={() => navigate('/student/dashboard')} className="mt-2">
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
      {viewingMaterialId !== null && (
        <ViewDocumentModal materialId={viewingMaterialId} onClose={() => setViewingMaterialId(null)} />
      )}

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── Top Bar with Back Button & Leave Option ───────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="inline-flex items-center text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </button>
          <button
            onClick={handleLeaveClass}
            className="inline-flex items-center text-xs text-text-muted hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Leave Classroom
          </button>
        </div>

        {/* ── Classroom Header Banner ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-purple-900/20 to-blue-900/20 border border-primary/30 p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  Classroom
                </span>
                <span className="px-3 py-1 bg-surface-light text-text-muted border border-border rounded-full text-xs font-semibold">
                  {classroom.member_count} Enrolled Student{classroom.member_count === 1 ? '' : 's'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
                {classroom.name}
              </h1>
              <p className="text-sm text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Instructor: <strong className="text-text-primary">{classroom.teacher_name || 'Teacher'}</strong></span>
                {classroom.college && <span>• College: <strong className="text-text-primary">{classroom.college}</strong></span>}
                {(classroom.year || classroom.semester || classroom.regulation) && (
                  <span>
                    • {classroom.year && `Yr ${classroom.year} `}
                    {classroom.semester && `Sem ${classroom.semester} `}
                    {classroom.regulation && `(${classroom.regulation})`}
                  </span>
                )}
                {classroom.section && <span>• Sec {classroom.section}</span>}
              </p>
            </div>

            {/* Class Code Box */}
            <div className="flex items-center gap-3 bg-background/40 border border-white/15 p-4 rounded-xl shrink-0 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Classroom Code</p>
                <p className="text-2xl font-mono font-extrabold text-primary tracking-widest">{classroom.code}</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-2.5 bg-surface-light hover:bg-surface-light text-text-primary hover:text-text-primary rounded-lg transition-colors"
                title="Copy Classroom Code"
              >
                {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────── */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-border pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'materials', label: 'Materials', icon: FileText, count: materials.length },
            { id: 'skills', label: 'Skills', icon: BrainCircuit },
            { id: 'assessment', label: 'Assessment', icon: Brain },
            { id: 'learning_plan', label: 'AI Learning Plan', icon: Sparkles },
            { id: 'progress', label: 'My Progress', icon: TrendingUp },
            { id: 'ask_ai', label: 'Ask AI', icon: MessageSquare },
            { id: 'info', label: 'Classroom Info', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-text-primary shadow-lg shadow-primary/20'
                    : 'bg-surface hover:bg-surface-light text-text-muted hover:text-text-primary border border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-surface-light text-text-primary' : 'bg-surface-light text-text-muted'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Overview ─────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Learning Materials</p>
                    <p className="text-2xl font-bold text-text-primary mt-0.5">{materials.length} Documents</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 text-green-400 rounded-2xl border border-green-500/30">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Classroom Progress</p>
                    <p className="text-2xl font-bold text-text-primary mt-0.5">{progressData?.overall_progress_percent ?? 0}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Skills Tracked</p>
                    <p className="text-2xl font-bold text-text-primary mt-0.5">{skillsData?.skills.length ?? 0} Skills</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-2xl border border-yellow-500/30">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Average Competency</p>
                    <p className="text-2xl font-bold text-text-primary mt-0.5">{progressData?.average_skill_score ?? 0}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Learning Plan / Continue Learning Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
                    <CardTitle className="text-lg flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-primary" /> Active Learning Plan
                    </CardTitle>
                    {activePlanView && (
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('learning_plan')}>
                        Open Full Plan <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    {activePlanView ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs text-primary font-bold uppercase tracking-wider">{activePlanView.subject}</p>
                              <h3 className="text-xl font-bold text-text-primary mt-1">{activePlanView.topic}</h3>
                              <p className="text-xs text-text-muted mt-1">{activePlanView.learning_goal}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                              activePlanView.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {activePlanView.status}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-text-muted">Current Modules</p>
                          {activePlanView.modules.slice(0, 3).map((mod) => (
                            <div key={mod.id} className="p-3 bg-surface-light border border-border rounded-lg flex items-center justify-between">
                              <span className="text-sm font-medium text-text-primary truncate">{mod.title}</span>
                              <span className="text-xs text-text-muted">{mod.tasks.filter((t) => t.is_completed).length}/{mod.tasks.length} Tasks Done</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 border border-dashed border-border rounded-xl space-y-3">
                        <p className="text-text-muted text-sm">No active AI learning plan generated for {classroom.name} yet.</p>
                        <Button onClick={() => setActiveTab('learning_plan')}>
                          <Sparkles className="w-4 h-4 mr-2" /> Generate Learning Plan
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Materials */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-400" /> Recent Classroom Materials
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => setActiveTab('materials')}>
                      View All ({materials.length})
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {materials.length > 0 ? (
                      <div className="space-y-3">
                        {materials.slice(0, 4).map((m) => (
                          <div
                            key={m.id}
                            className="p-3 bg-surface-light border border-border hover:border-primary/40 rounded-xl flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileBadge name={m.file_name} />
                              <span className="text-sm font-medium text-text-primary truncate">{m.file_name}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setViewingMaterialId(m.id)}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted text-center py-6">No materials uploaded yet for this classroom.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Required Skills & Quick Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-lg flex items-center">
                      <BrainCircuit className="w-5 h-5 mr-2 text-purple-400" /> Required Skills & Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-text-muted mb-2">Subject Competencies</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overview?.required_skills.map((skill, idx) => (
                          <span key={idx} className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-md">
                            ✦ {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border">
                      <p className="text-xs font-semibold uppercase text-text-muted mb-2">Your Assessed Skills</p>
                      {skillsData && skillsData.skills.length > 0 ? (
                        <div className="space-y-2">
                          {skillsData.skills.slice(0, 4).map((s) => (
                            <div key={s.id} className="flex justify-between items-center text-xs">
                              <span className="text-text-muted truncate">{s.skill_category}</span>
                              <span className="font-bold text-primary">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted">No skills assessed yet.</p>
                      )}
                    </div>

                    <Button variant="outline" className="w-full text-xs" onClick={() => setActiveTab('skills')}>
                      View Full Skill Tree
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Assistant Ask Prompt */}
                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                  <CardContent className="p-5 space-y-3 text-center">
                    <MessageSquare className="w-8 h-8 text-primary mx-auto" />
                    <h4 className="font-bold text-text-primary text-sm">Have a question on {classroom.name}?</h4>
                    <p className="text-xs text-text-muted">Ask the Classroom AI teaching assistant grounded on your uploaded syllabus and lecture notes.</p>
                    <Button onClick={() => setActiveTab('ask_ai')} className="w-full text-xs">
                      Ask AI Assistant
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Materials ─────────────────────────────────────── */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Classroom Learning Materials</h2>
                <p className="text-xs text-text-muted mt-1">
                  All documents and lecture notes uploaded for {classroom.name} ({classroom.college}, Sem {classroom.semester}, {classroom.regulation}).
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {filteredMaterials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMaterials.map((m) => (
                  <Card key={m.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FileBadge name={m.file_name} />
                          <span className="text-[10px] text-text-muted">{m.chunk_count} RAG Chunks</span>
                        </div>
                        <h3 className="font-bold text-base text-text-primary truncate" title={m.file_name}>
                          {m.file_name}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {m.college} • Sem {m.semester} • Reg {m.regulation}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border flex justify-between items-center">
                        <span className="text-[10px] text-text-muted">
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setViewingMaterialId(m.id)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Excerpts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl space-y-3">
                <FileText className="w-10 h-10 text-text-muted mx-auto" />
                <p className="text-text-muted text-sm">No classroom materials match your query.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Skills ────────────────────────────────────────── */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Classroom Skill Competency Tree</h2>
                <p className="text-xs text-text-muted mt-1">
                  Real-time cognitive and domain mastery scores calculated from database diagnostic records.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddSkillModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Custom Skill
                </Button>
                <Button size="sm" onClick={() => setActiveTab('assessment')}>
                  <Brain className="w-4 h-4 mr-1" /> Take Assessment
                </Button>
              </div>
            </div>

            {skillsData && skillsData.skills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillsData.skills.map((s) => {
                  const cfg = getSkillConfig(s.score);
                  const colors = colorMap[cfg.color];
                  return (
                    <Card key={s.id} className={`border ${colors.border}`}>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.text} bg-surface-light border ${colors.border}`}>
                            {cfg.level}
                          </span>
                          <span className="text-xl font-bold text-text-primary">{Math.round(s.score)}%</span>
                        </div>

                        <h4 className="font-bold text-base text-text-primary">{s.skill_category}</h4>

                        <div className="w-full bg-background/40 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${colors.bg} rounded-full transition-all duration-500`} style={{ width: `${s.score}%` }} />
                        </div>

                        <p className="text-[10px] text-text-muted">
                          Last evaluated: {s.last_updated ? new Date(s.last_updated).toLocaleDateString() : 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl space-y-3">
                <BrainCircuit className="w-10 h-10 text-text-muted mx-auto" />
                <p className="text-text-muted text-sm">No skill scores recorded yet for this student.</p>
                <Button onClick={() => setActiveTab('assessment')}>Take Diagnostic Assessment</Button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Assessment ────────────────────────────────────── */}
        {activeTab === 'assessment' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {assessmentStep === 'intro' && (
              <Card>
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Classroom Knowledge Assessment</CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    Evaluate your cognitive dimensions and technical understanding for {classroom.name}.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Numerical Calculation', 'Abstract Thinking', 'Logical Reasoning', 'Association/Analogy', 'Spatial Imagination', `${classroom.name} Fundamentals`].map((cat, i) => (
                      <div key={i} className="p-3 bg-surface-light border border-border rounded-xl flex items-center gap-2.5">
                        <Zap className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-text-primary">{cat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center pt-2">
                    <Button size="lg" onClick={handleStartAssessment} disabled={isStartingAssessment}>
                      {isStartingAssessment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Start Assessment Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {assessmentStep === 'active' && assessmentQuestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex justify-between items-center text-xs text-text-muted">
                    <span className="font-semibold text-primary uppercase">{assessmentQuestions[currentQuestionIdx]?.skill_category}</span>
                    <span>Question {currentQuestionIdx + 1} of {assessmentQuestions.length}</span>
                  </div>
                  <CardTitle className="text-lg mt-2 text-text-primary leading-relaxed">
                    {assessmentQuestions[currentQuestionIdx]?.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2.5">
                    {assessmentQuestions[currentQuestionIdx]?.options.map((opt, oIdx) => {
                      const qId = assessmentQuestions[currentQuestionIdx].id;
                      const isSelected = assessmentAnswers[qId] === opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => setAssessmentAnswers({ ...assessmentAnswers, [qId]: opt })}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-primary/20 border-primary text-text-primary'
                              : 'bg-surface-light border-border hover:border-border text-text-muted'
                          }`}
                        >
                          <span className="text-sm">{opt}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                    >
                      Previous
                    </Button>

                    {currentQuestionIdx < assessmentQuestions.length - 1 ? (
                      <Button
                        size="sm"
                        disabled={!assessmentAnswers[assessmentQuestions[currentQuestionIdx].id]}
                        onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      >
                        Next Question
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isSubmittingAssessment || Object.keys(assessmentAnswers).length < assessmentQuestions.length}
                        onClick={handleSubmitAssessment}
                      >
                        {isSubmittingAssessment ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Submit Assessment
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {assessmentStep === 'result' && (
              <Card className="text-center p-6 space-y-4 border-green-500/30 bg-green-500/5">
                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary">Assessment Complete!</h3>
                <p className="text-sm text-text-muted">{assessmentResultMsg}</p>
                <div className="pt-2 flex justify-center gap-3">
                  <Button onClick={() => setAssessmentStep('intro')} variant="outline">
                    Take Another Assessment
                  </Button>
                  <Button onClick={() => setActiveTab('skills')}>
                    View Updated Skills
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Tab 5: AI Learning Plan ──────────────────────────────── */}
        {activeTab === 'learning_plan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Generate Form */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-lg flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-primary" /> Generate Plan
                    </CardTitle>
                    <p className="text-xs text-text-muted mt-1">Multi-Agent workflow: Analyst → Optimizer → Evaluator grounded with ChromaDB RAG.</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <form onSubmit={handleGeneratePlanSubmit} className="space-y-4">
                      {generateError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                          {generateError}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                          Select Curriculum Topic
                        </label>
                        <select
                          value={selectedTopic}
                          onChange={(e) => setSelectedTopic(e.target.value)}
                          className="w-full bg-surface-light border border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none"
                        >
                          <option value="">-- Choose from Curriculum --</option>
                          {curriculum?.units.flatMap((u) =>
                            u.topics.map((t) => (
                              <option key={t.id} value={t.name}>
                                {u.name}: {t.name}
                              </option>
                            ))
                          )}
                          <option value="custom">-- Custom Topic --</option>
                        </select>
                      </div>

                      {selectedTopic === 'custom' && (
                        <Input
                          label="Custom Topic Name"
                          placeholder="e.g. Asynchronous Programming"
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          required
                        />
                      )}

                      <Input
                        label="Specific Learning Goal (Optional)"
                        placeholder="e.g. Deep dive into algorithms and hands-on code"
                        value={learningGoal}
                        onChange={(e) => setLearningGoal(e.target.value)}
                      />

                      <Button
                        type="submit"
                        className="w-full h-11"
                        disabled={isGeneratingPlan || (!selectedTopic && !customTopic)}
                      >
                        {isGeneratingPlan ? (
                          <div className="flex items-center text-xs">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span>{loadingMessages[generateLoadingIdx]}</span>
                          </div>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" /> Generate AI Learning Plan
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Saved Plans for this Classroom */}
                <Card>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-base flex items-center">
                      <BookOpen className="w-4 h-4 mr-2 text-blue-400" /> Saved Plans ({learningPlans.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {learningPlans.length > 0 ? (
                      learningPlans.map((lp) => (
                        <button
                          key={lp.id}
                          onClick={() => setActivePlanView(lp)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            activePlanView?.id === lp.id
                              ? 'bg-primary/20 border-primary text-text-primary'
                              : 'bg-surface-light border-border hover:border-border text-text-muted'
                          }`}
                        >
                          <p className="font-semibold text-xs truncate">{lp.topic}</p>
                          <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
                            <span className="capitalize">{lp.status}</span>
                            <span>{lp.modules.length} Modules</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted text-center py-4">No plans created yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Active Plan View & Checklist */}
              <div className="lg:col-span-2 space-y-6">
                {activePlanView ? (
                  <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary uppercase">{activePlanView.subject}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            activePlanView.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {activePlanView.status}
                          </span>
                        </div>
                        <CardTitle className="text-xl font-bold mt-1 text-text-primary">{activePlanView.topic}</CardTitle>
                      </div>
                      {activePlanView.status !== 'completed' && (
                        <Button size="sm" onClick={handleStartVerification} className="gap-1.5">
                          <Award className="w-4 h-4 text-yellow-300" />
                          Verify Path (5-MCQ)
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="p-4 bg-surface-light rounded-xl border border-border">
                        <p className="text-xs text-text-muted uppercase font-semibold">Goal Description</p>
                        <p className="text-sm text-text-primary mt-1">{activePlanView.learning_goal}</p>
                      </div>

                      {/* Modules & Task Checkboxes */}
                      <div className="space-y-6">
                        {activePlanView.modules.map((mod) => (
                          <div key={mod.id} className="space-y-3">
                            <h4 className="font-bold text-sm text-text-primary border-b border-border pb-2">
                              {mod.title}
                            </h4>
                            <div className="space-y-2">
                              {mod.tasks.map((task) => (
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
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-white/15 bg-transparent text-center py-16">
                    <CardContent className="space-y-3">
                      <Sparkles className="w-10 h-10 text-text-muted mx-auto" />
                      <h3 className="font-bold text-base text-text-muted">No Learning Plan Selected</h3>
                      <p className="text-xs text-text-muted max-w-sm mx-auto">
                        Choose a topic on the left to generate a personalized AI plan with the multi-agent system.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 6: My Progress ───────────────────────────────────── */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
                <CardContent className="p-6">
                  <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
                  <p className="text-xs font-medium text-text-muted uppercase">Overall Progress</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">{progressData?.overall_progress_percent ?? 0}%</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
                <CardContent className="p-6">
                  <CheckCircle2 className="w-8 h-8 text-blue-400 mb-2" />
                  <p className="text-xs font-medium text-text-muted uppercase">Tasks Completed</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {progressData?.completed_tasks ?? 0}/{progressData?.total_tasks ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/20 to-transparent border-purple-500/30">
                <CardContent className="p-6">
                  <Award className="w-8 h-8 text-purple-400 mb-2" />
                  <p className="text-xs font-medium text-text-muted uppercase">Plans Mastered</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">{progressData?.plans_completed ?? 0}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/20 to-transparent border-yellow-500/30">
                <CardContent className="p-6">
                  <Brain className="w-8 h-8 text-yellow-400 mb-2" />
                  <p className="text-xs font-medium text-text-muted uppercase">Assessments Taken</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">{progressData?.assessments_completed_count ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Progress Breakdown */}
            <Card>
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg">Classroom Completion Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-muted">Task Completion Rate</span>
                    <span className="text-primary">{progressData?.overall_progress_percent ?? 0}%</span>
                  </div>
                  <div className="w-full bg-background/40 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progressData?.overall_progress_percent ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-muted">Average Competency Score</span>
                    <span className="text-yellow-400">{progressData?.average_skill_score ?? 0}%</span>
                  </div>
                  <div className="w-full bg-background/40 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progressData?.average_skill_score ?? 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tab 7: Ask AI ────────────────────────────────────────── */}
        {activeTab === 'ask_ai' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="flex flex-col h-[70vh] border-primary/20">
              <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 text-primary rounded-xl border border-primary/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-text-primary">
                      Classroom AI Assistant: {classroom.name}
                    </CardTitle>
                    <p className="text-xs text-text-muted">
                      Grounded strictly on {materials.length} uploaded classroom materials via ChromaDB RAG.
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Message List */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <HelpCircle className="w-12 h-12 text-gray-600 mx-auto" />
                    <h3 className="font-bold text-base text-text-muted">Ask any question about {classroom.name}</h3>
                    <p className="text-xs text-text-muted max-w-md mx-auto">
                      "Explain the key concepts in Chapter 1", "How do these algorithms work?", or "Summarize the required assignments."
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-primary text-text-primary rounded-tr-none'
                            : 'bg-surface-light border border-border text-text-primary rounded-tl-none space-y-3'
                        }`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="flex items-center gap-2 mb-1 text-xs">
                            {msg.rag_grounded ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                <FileText className="w-3 h-3" /> Grounded in Classroom Materials
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-text-muted bg-surface-light border border-border px-2 py-0.5 rounded-full">
                                General Academic Guidance
                              </span>
                            )}
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Sources snippet */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="pt-3 border-t border-border space-y-1.5">
                            <p className="text-[10px] font-bold uppercase text-text-muted">Referenced Documents:</p>
                            <div className="grid gap-1.5">
                              {msg.sources.map((src, i) => (
                                <div key={i} className="p-2 bg-background/40 rounded-lg border border-border text-xs text-text-muted">
                                  <span className="font-semibold text-primary">{src.file_name}</span>
                                  {src.page_number && <span className="text-text-muted"> (Page {src.page_number})</span>}
                                  <p className="text-[11px] text-text-muted mt-0.5 truncate">{src.content_snippet}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}

                {isAskingAI && (
                  <div className="flex items-center gap-2 text-xs text-primary p-3 bg-surface-light border border-border rounded-2xl w-fit">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Retrieving classroom materials & synthesizing response...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </CardContent>

              {/* Chat Input */}
              <div className="p-4 border-t border-border bg-surface">
                <form onSubmit={handleSendQuestion} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Ask a question about ${classroom.name}...`}
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    disabled={isAskingAI}
                    className="flex-1 bg-surface-light border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none"
                  />
                  <Button type="submit" disabled={isAskingAI || !inputQuestion.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* ── Tab 8: Classroom Info ─────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Card>
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg">Instructor & Course Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-light rounded-xl border border-border space-y-1">
                    <p className="text-xs text-text-muted font-semibold uppercase">Instructor</p>
                    <p className="text-base font-bold text-text-primary">{classroom.teacher_name || 'Instructor'}</p>
                    {classroom.teacher_email && <p className="text-xs text-primary">{classroom.teacher_email}</p>}
                  </div>

                  <div className="p-4 bg-surface-light rounded-xl border border-border space-y-1">
                    <p className="text-xs text-text-muted font-semibold uppercase">Classroom Code</p>
                    <p className="text-base font-mono font-bold text-primary">{classroom.code}</p>
                    <p className="text-xs text-text-muted">Share this code with eligible students.</p>
                  </div>

                  <div className="p-4 bg-surface-light rounded-xl border border-border space-y-1">
                    <p className="text-xs text-text-muted font-semibold uppercase">Institution</p>
                    <p className="text-base font-bold text-text-primary">{classroom.college || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-surface-light rounded-xl border border-border space-y-1">
                    <p className="text-xs text-text-muted font-semibold uppercase">Academic Term</p>
                    <p className="text-base font-bold text-text-primary">
                      {classroom.year ? `Year ${classroom.year}` : ''} {classroom.semester ? `• Sem ${classroom.semester}` : ''} {classroom.regulation ? `(${classroom.regulation})` : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-surface-light rounded-xl border border-border space-y-2 mt-4">
                  <p className="text-xs text-text-muted font-semibold uppercase">Announcements & Notices</p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Welcome to {classroom.name}! Make sure to explore the Materials tab for uploaded lecture documents, test your competency in the Skills tab, and generate your personalized AI Learning Plan.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Add Custom Skill Modal ───────────────────────────────── */}
      {showAddSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="font-bold text-lg text-text-primary">Add Custom Skill</h2>
              <button onClick={() => setShowAddSkillModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSkillSubmit} className="space-y-4">
              <Input
                label="Skill Name"
                placeholder="e.g. Matrix Algebra, Deep Learning"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddSkillModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingSkill || !newSkillName.trim()}>
                  {isAddingSkill ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Add Skill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Verification 5-MCQ Test Modal ────────────────────────── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowVerifyModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-text-primary flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-400" /> Path Verification Test
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Answer 5 questions to verify mastery of {activePlanView?.topic}. Pass mark: 60% (3/5 correct).
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
    </>
  );
}
