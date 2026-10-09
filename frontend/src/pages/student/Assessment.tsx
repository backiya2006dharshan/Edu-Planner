import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { assessmentApi, Question, MaterialOption, DynamicAssessmentSubmitResponse, GeneratedQuestionsResponse } from '../../api/assessment';
import { CheckCircle2, ChevronRight, Brain, AlertCircle, FileText, Loader2, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Assessment() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [sessionInfo, setSessionInfo] = useState<GeneratedQuestionsResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'materials' | 'questions' | 'results'>('materials');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<DynamicAssessmentSubmitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await assessmentApi.getMaterials();
      setMaterials(data);
    } catch (err) {
      setError('Failed to load materials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMaterial = async (materialId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await assessmentApi.generateQuestions({ material_id: materialId, num_questions: 10 });
      if (!data.questions || data.questions.length === 0) {
        setError('No questions could be generated for this material. It might not have enough content or is still processing.');
        return;
      }
      setSessionInfo(data);
      setQuestions(data.questions);
      setCurrentStep('questions');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate questions. Ensure material is indexed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!sessionInfo) return;
    setIsLoading(true);
    setError(null);
    try {
      const answersList = Object.entries(answers).map(([qId, selected]) => ({
        question_id: Number(qId),
        selected_option: selected,
      }));
      const res = await assessmentApi.submit({
        session_id: sessionInfo.session_id,
        answers: answersList
      });
      setResults(res);
      setCurrentStep('results');
    } catch (err) {
      setError('Failed to submit assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  /* ── Step 1: Materials ─────────────────────────────────────────────── */
  if (currentStep === 'materials') {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Dynamic Material Assessment</CardTitle>
            <p className="text-text-muted mt-2">
              Select a material below to generate a dynamic assessment and personalized learning plan.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            {isLoading && materials.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : materials.length === 0 ? (
              <p className="text-center text-text-muted py-8">No materials available for your curriculum.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    disabled={isLoading}
                    onClick={() => handleSelectMaterial(m.id)}
                    className="flex flex-col text-left p-5 rounded-2xl border border-border bg-surface-light hover:bg-surface-light hover:border-primary/50 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text-primary line-clamp-2">{m.file_name}</h4>
                        <p className="text-sm text-text-muted mt-1">{m.subject}</p>
                        <div className="flex gap-2 mt-3">
                          <span className="text-xs px-2 py-1 bg-surface-light rounded-md text-text-muted">
                            {m.college} • Sem {m.semester}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Step 3: Results ────────────────────────────────────────────── */
  if (currentStep === 'results' && results) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <Card className="border-primary/30">
          <CardHeader className="text-center pb-0">
            <div className="mx-auto bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-text-primary mb-2">
              {results.score_percent.toFixed(0)}% Score
            </CardTitle>
            <p className="text-text-muted">{results.correct_count} out of {results.total_count} correct</p>
          </CardHeader>
          <CardContent className="mt-8 space-y-6">
            <div className="bg-surface-light border border-border p-4 rounded-xl">
              <p className="text-center text-text-primary flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                {results.message}
              </p>
              <p className="text-center text-sm text-text-muted mt-2">{results.learning_plan_summary}</p>
            </div>

            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Skill Breakdown
            </h3>
            
            <div className="grid gap-3">
              {Object.entries(results.skill_performance).map(([skill, score]) => {
                const isStrong = score >= 70;
                return (
                  <div key={skill} className={`flex justify-between items-center p-4 rounded-xl border ${isStrong ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <span className="font-medium text-text-primary capitalize">{skill}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-surface-light rounded-full overflow-hidden hidden sm:block">
                        <div className={`h-full ${isStrong ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
                      </div>
                      <span className={`font-bold ${isStrong ? 'text-green-400' : 'text-red-400'}`}>
                        {score.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-center pt-6">
              <Button onClick={() => navigate('/student/dashboard')} size="lg" className="w-full sm:w-auto">
                View My Learning Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Step 2: Questions ──────────────────────────────────────────── */
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">{sessionInfo?.topic}</h2>
          <p className="text-sm text-text-muted">{sessionInfo?.subject}</p>
        </div>
      </div>
      
      <div className="mb-8 flex items-center gap-4">
        <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium text-text-muted shrink-0">
          {currentQuestionIndex + 1} / {questions.length}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed text-text-primary">
            {currentQuestion?.question_text}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-4">
            {currentQuestion?.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === option;
              return (
                <button
                  key={idx}
                  id={`option-${idx}`}
                  onClick={() => handleSelectOption(currentQuestion.id, option)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-primary/20 border-primary/50 text-text-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-surface-light border-border text-text-muted hover:bg-surface-light'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end items-center gap-4">
            {error && (
              <div className="mr-auto flex items-center text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            {isLastQuestion ? (
              <Button
                id="submit-assessment-btn"
                onClick={handleSubmit}
                disabled={!isAnswered || isLoading}
                isLoading={isLoading}
              >
                Submit Assessment
              </Button>
            ) : (
              <Button
                id="next-question-btn"
                onClick={handleNext}
                disabled={!isAnswered}
                className="group"
              >
                Next Question
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
