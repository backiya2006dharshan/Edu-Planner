import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { aiApi } from '../../api/ai';
import { LearningPlanRequest, LearningPlanResponse } from '../../types/learningPlan';
import { Sparkles, BrainCircuit, Library, Loader2, ArrowRight, ShieldAlert, Target, BookOpen, Layers, CheckCircle2, TrendingUp, NotebookPen, Lightbulb, FileText, Award, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LearningPlanGenerator() {
  const [formData, setFormData] = useState<LearningPlanRequest>({
    subject: '',
    topic: '',
    learning_goal: '',
    college: '',
    semester: '',
    regulation: '',
    year: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStateIndex, setLoadingStateIndex] = useState(0);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<LearningPlanResponse | null>(null);
  const navigate = useNavigate();

  const loadingMessages = [
    "Retrieving learning materials from RAG vector store...",
    "Analyzing your current skill tree & history...",
    "Identifying missing & weak prerequisite skills...",
    "Synthesizing personalized plan with AI agents...",
    "Evaluating plan quality & grounding..."
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Animate loading text progression
    const interval = setInterval(() => {
      setLoadingStateIndex(prev => Math.min(prev + 1, loadingMessages.length - 1));
    }, 2000);

    try {
      const response = await aiApi.generateLearningPlan(formData);
      setPlan(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate learning plan. Please try again.');
    } finally {
      clearInterval(interval);
      setIsLoading(false);
      setLoadingStateIndex(0);
    }
  };

  if (plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{formData.topic}</h1>
            <p className="text-gray-400">RAG-Grounded Personalized Learning Plan</p>
          </div>
          <Button onClick={() => setPlan(null)} variant="outline">Create Another</Button>
        </div>

        {/* Status Metrics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-primary">Status</p>
              <p className="text-xl font-bold text-white capitalize">{plan.status.toLowerCase()}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-purple-400">Evaluator Score</p>
              <p className="text-xl font-bold text-white">{plan.score}/100</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-green-400">RAG Chunks Retrieved</p>
              <p className="text-xl font-bold text-white">{plan.rag_chunks_retrieved ?? 0} Chunks</p>
            </CardContent>
          </Card>
        </div>

        {/* Skill Profile & Gap Analysis */}
        {plan.skill_gaps && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-400 flex items-center text-lg">
                <BrainCircuit className="w-5 h-5 mr-2" /> Skill Tree & Gap Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-green-400 mb-2">Mastered / Known Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.skill_gaps.known_skills && plan.skill_gaps.known_skills.length > 0 ? (
                      plan.skill_gaps.known_skills.map((skill, i) => (
                        <span key={i} className="text-xs bg-green-500/10 text-green-300 border border-green-500/20 px-2.5 py-1 rounded-md">
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">None recorded yet</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-orange-400 mb-2">Target Weak / Missing Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[...(plan.skill_gaps.weak_skills || []), ...(plan.skill_gaps.missing_skills || [])].length > 0 ? (
                      [...(plan.skill_gaps.weak_skills || []), ...(plan.skill_gaps.missing_skills || [])].map((skill, i) => (
                        <span key={i} className="text-xs bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2.5 py-1 rounded-md">
                          ⚠ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">None identified</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RAG Status Notice */}
        {plan.rag_retrieval_status && (
          <div className={`p-4 rounded-xl border text-sm flex items-start ${
            plan.rag_chunks_retrieved && plan.rag_chunks_retrieved > 0 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {plan.rag_chunks_retrieved && plan.rag_chunks_retrieved > 0 ? (
              <FileText className="w-5 h-5 mr-3 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-3 shrink-0 text-amber-400 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{plan.rag_chunks_retrieved && plan.rag_chunks_retrieved > 0 ? "RAG Material Grounded" : "RAG Retrieval Notice"}</p>
              <p className="text-xs mt-0.5 opacity-90">{plan.rag_retrieval_status}</p>
            </div>
          </div>
        )}

        {/* Evaluator Notes */}
        {plan.issues && plan.issues.length > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 flex items-center text-lg">
                <ShieldAlert className="w-5 h-5 mr-2" /> Evaluator Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-100/70">
                {plan.issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center">
                <Target className="w-5 h-5 mr-2 text-primary" /> Learning Objectives
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {plan.plan.learning_objectives.map((obj: string, i: number) => (
                <div key={i} className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-gray-300 text-sm leading-relaxed">{obj}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" /> Personalization & Prerequisites
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">Prerequisite Review</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{plan.plan.prerequisite_review}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">Personalization Notes</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{plan.plan.personalization_notes}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expected Skills Gained */}
        {plan.plan.expected_skills && plan.plan.expected_skills.length > 0 && (
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-400 flex items-center text-lg">
                <Award className="w-5 h-5 mr-2" /> Expected Skills Gained After Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-wrap gap-2">
                {plan.plan.expected_skills.map((skill: string, i: number) => (
                  <span key={i} className="bg-purple-500/10 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg text-sm font-medium">
                    ✦ {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Learning Modules */}
        <Card>
          <CardHeader className="pb-4 border-b border-white/5">
            <CardTitle className="text-xl flex items-center">
              <Layers className="w-6 h-6 mr-2 text-blue-400" /> Personalized Learning Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              {plan.plan.lesson_sequence.map((lesson: string, index: number) => (
                <div key={index} className="flex bg-surface-light border border-white/5 rounded-xl p-4">
                  <div className="bg-primary/20 text-primary font-bold rounded-lg w-10 h-10 flex items-center justify-center shrink-0 mr-4">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200">Module {index + 1}</h3>
                    <p className="text-gray-400 text-sm mt-1">{lesson}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="bg-surface-light p-4 rounded-xl border border-white/5">
                <h4 className="font-semibold flex items-center text-gray-200 mb-3">
                  <NotebookPen className="w-4 h-4 mr-2 text-purple-400" /> Practice Activities
                </h4>
                <ul className="space-y-2">
                  {plan.plan.practice_activities.map((practice: string, i: number) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start">
                      <span className="text-purple-400 mr-2">•</span> {practice}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface-light p-4 rounded-xl border border-white/5 space-y-4">
                <div>
                  <h4 className="font-semibold flex items-center text-gray-200 mb-1">
                    <TrendingUp className="w-4 h-4 mr-2 text-orange-400" /> Difficulty Progression
                  </h4>
                  <p className="text-sm text-gray-400">{plan.plan.difficulty_progression}</p>
                </div>
                <div>
                  <h4 className="font-semibold flex items-center text-gray-200 mb-1">
                    <BookOpen className="w-4 h-4 mr-2 text-green-400" /> Assessment Strategy
                  </h4>
                  <p className="text-sm text-gray-400">{plan.plan.assessment_strategy}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => navigate('/student/dashboard')} className="px-8">
                Start Plan in Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Learning Plan</h1>
        <p className="text-gray-400">Generate a personalized curriculum powered by RAG materials, your student skill tree, and multi-agent AI.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-500/20">{error}</div>}
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center text-gray-200">
                <Library className="w-5 h-5 mr-2 text-primary" /> RAG Filter Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="College" name="college" placeholder="Kongu Engineering College" value={formData.college} onChange={handleChange} required />
                <Input label="Year" name="year" placeholder="4" value={formData.year} onChange={handleChange} required />
                <Input label="Semester" name="semester" placeholder="7" value={formData.semester} onChange={handleChange} required />
                <Input label="Regulation" name="regulation" placeholder="2022" value={formData.regulation} onChange={handleChange} required />
              </div>
            </div>

            <hr className="border-white/10" />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center text-gray-200">
                <BrainCircuit className="w-5 h-5 mr-2 text-purple-400" /> Learning Goal & Topic
              </h3>
              <Input label="Subject" name="subject" placeholder="Web Development" value={formData.subject} onChange={handleChange} required />
              <Input label="Topic" name="topic" placeholder="React Hooks" value={formData.topic} onChange={handleChange} required />
              <Input label="Learning Goal" name="learning_goal" placeholder="Understand hooks, state, useEffect and custom hooks" value={formData.learning_goal} onChange={handleChange} required />
            </div>

            <Button type="submit" className="w-full h-12 text-base shadow-xl shadow-primary/20" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 mr-3 animate-spin text-white" />
                  <span className="text-white/90">{loadingMessages[loadingStateIndex]}</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" /> Generate Personalized Learning Plan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
