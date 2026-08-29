import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { assessmentApi, Question } from '../../api/assessment';
import { CheckCircle2, ChevronRight, Brain, AlertCircle, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SkillResult {
  skill_category: string;
  score: number;
}

interface AssessmentResult {
  message: string;
  results?: SkillResult[];
}

export default function Assessment() {
  const navigate = useNavigate();
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'intro' | 'questions' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAssessment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await assessmentApi.start();
      setAssessmentId(response.assessment_id);

      const questionList = await assessmentApi.getQuestions(response.assessment_id);
      setQuestions(questionList);
      setCurrentStep('questions');
    } catch {
      setError('Failed to start assessment. Please try again.');
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
    if (assessmentId === null) return;
    setIsLoading(true);
    setError(null);
    try {
      const answersList = Object.entries(answers).map(([qId, selected]) => ({
        question_id: Number(qId),
        selected_answer: selected,
      }));
      const res = await assessmentApi.submit(assessmentId, { answers: answersList });
      setResults(res as AssessmentResult);
      setCurrentStep('results');
    } catch {
      setError('Failed to submit assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  /* ── Intro ─────────────────────────────────────────────── */
  if (currentStep === 'intro') {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">5-D Knowledge Assessment</CardTitle>
            <p className="text-gray-400 mt-2">
              EduPlanner will evaluate your skills across 5 cognitive dimensions to build your
              personalised learning plan.
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {['Numerical Calculation', 'Abstract Thinking', 'Logical Reasoning', 'Association / Analogy', 'Spatial Imagination'].map((dim) => (
                <div key={dim} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Network className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-gray-300">{dim}</span>
                </div>
              ))}
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <Button id="start-assessment-btn" onClick={startAssessment} isLoading={isLoading} size="lg" className="w-full sm:w-auto">
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Results ────────────────────────────────────────────── */
  if (currentStep === 'results') {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <Card className="border-primary/30">
          <CardHeader className="text-center pb-0">
            <div className="mx-auto bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl">Assessment Complete 🎉</CardTitle>
            <p className="text-gray-400 mt-2">Your skill profile has been updated.</p>
          </CardHeader>
          <CardContent className="mt-8 space-y-6">
            {results?.results && results.results.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold">Skills Identified:</h3>
                <div className="grid gap-3">
                  {results.results.map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10"
                    >
                      <span className="font-medium text-gray-200 capitalize">{skill.skill_category}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-primary" style={{ width: `${skill.score * 100}%` }} />
                        </div>
                        <span className="font-bold">{(skill.score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center">{results?.message ?? 'Assessment submitted successfully.'}</p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate('/student/skill-tree')}>
                <Network className="w-4 h-4 mr-2" />
                View Skill Tree
              </Button>
              <Button onClick={() => navigate('/student/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Questions ──────────────────────────────────────────── */
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium text-gray-400 shrink-0">
          {currentQuestionIndex + 1} / {questions.length}
        </span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {currentQuestion?.skill_category}
            </span>
            <span className="text-xs text-gray-500">
              Difficulty: {currentQuestion?.difficulty}
            </span>
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion?.text}
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
                      ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
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
