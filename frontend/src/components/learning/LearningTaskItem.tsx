import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../common/Button';
import { LearningTask } from '../../api/learningPlans';
import { CheckCircle2, Circle, CheckCircle, Clock, BarChart, Target, BrainCircuit, X, Play, Loader2 } from 'lucide-react';

interface LearningTaskItemProps {
  task: LearningTask;
  onStart: (taskId: number) => Promise<void>;
  onComplete: (taskId: number) => Promise<void>;
  isLoading: boolean;
}

export function LearningTaskItem({ task, onStart, onComplete, isLoading }: LearningTaskItemProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    }
    
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowPopup(false);
      }
    }

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showPopup]);

  const handleActionClick = async () => {
    if (task.status === 'not_started' || (!task.is_completed && task.status !== 'in_progress')) {
      await onStart(task.id);
      setShowPopup(true);
    } else if (task.status === 'in_progress') {
      setShowPopup(true);
    } else if (task.status === 'completed' || task.is_completed) {
      setShowPopup(true);
    }
    setShowTooltip(false);
  };

  const handleMarkComplete = async () => {
    await onComplete(task.id);
    setShowPopup(false);
  };

  const isCompleted = task.is_completed || task.status === 'completed';
  const isInProgress = task.status === 'in_progress' && !task.is_completed;
  
  // Create arrays from comma separated strings for display
  const objectives = task.objectives ? task.objectives.split('\n').filter(Boolean) : [];
  const skills = task.skills ? task.skills.split(',').filter(Boolean) : [];

  return (
    <div className={`relative p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
      isCompleted
        ? 'bg-green-500/10 border-green-500/20'
        : isInProgress
        ? 'bg-primary/10 border-primary/30'
        : 'bg-surface-light border-border hover:border-border'
    } ${showPopup || showTooltip ? 'z-50' : 'z-10'}`} ref={containerRef}>
      
      {/* Left side: Icon and Title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
        ) : isInProgress ? (
          <div className="relative flex items-center justify-center shrink-0">
            <Circle className="w-5 h-5 text-primary" />
            <div className="w-2.5 h-2.5 bg-primary rounded-full absolute" />
          </div>
        ) : (
          <Circle className="w-5 h-5 text-text-muted shrink-0" />
        )}
        
        <div className="truncate pr-4">
          <p className={`text-sm font-semibold truncate ${isCompleted ? 'text-text-muted' : 'text-text-primary'}`}>
            {task.title}
          </p>
          <p className="text-[10px] text-text-muted capitalize">{task.task_type}</p>
        </div>
      </div>

      {/* Right side: Action Button */}
      <div 
        className="relative shrink-0"
        onMouseEnter={() => !showPopup && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Button
          size="sm"
          variant={isCompleted ? 'ghost' : isInProgress ? 'primary' : 'outline'}
          disabled={isLoading}
          onClick={handleActionClick}
          className={`text-xs ${isCompleted ? 'text-green-400 hover:text-green-300' : ''}`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isCompleted ? (
            <>✓ Completed</>
          ) : isInProgress ? (
            'Continue'
          ) : (
            'Start'
          )}
        </Button>

        {/* Hover Tooltip Preview */}
        {showTooltip && !showPopup && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg p-3 shadow-xl z-10 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-bold text-xs text-text-primary mb-1 line-clamp-2">{task.title}</h4>
            <p className="text-[10px] text-text-muted mb-2 line-clamp-3">
              {task.description || `Engage in this ${task.task_type} to improve your skills.`}
            </p>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-text-muted">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.estimated_time} min</span>
              <span className="flex items-center gap-1"><BarChart className="w-3 h-3" /> {task.difficulty}</span>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              ref={popupRef}
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4 shrink-0">
                <div className="pr-8">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{task.task_type}</p>
                  <h3 className="font-bold text-lg text-text-primary leading-tight">{task.title}</h3>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowPopup(false); }}
                  className="absolute top-6 right-6 text-text-muted hover:text-text-primary bg-surface-light rounded-full p-1.5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {/* Description */}
                {task.description ? (
                  <div>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                ) : null}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 p-3 bg-surface-light rounded-xl border border-border">
                  {task.estimated_time ? (
                    <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{task.estimated_time} min</span>
                    </div>
                  ) : null}
                  {task.difficulty ? (
                    <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                      <BarChart className="w-4 h-4 text-warning" />
                      <span className="capitalize">{task.difficulty}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                    <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-green-400' : 'text-text-muted'}`} />
                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Objectives */}
                {objectives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-primary" /> Learning Objectives
                    </h4>
                    <ul className="text-sm text-text-muted space-y-1.5 pl-1">
                      {objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span className="leading-snug">{obj.replace(/^•\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-2">
                      <BrainCircuit className="w-4 h-4 text-secondary" /> Relevant Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, i) => (
                        <span key={i} className="text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20 px-2.5 py-1 rounded-md">
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outcome */}
                {task.learning_outcome && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-1.5">Expected Outcome</h4>
                    <p className="text-sm text-text-muted italic bg-background/50 p-3 rounded-lg border border-border/50">
                      "{task.learning_outcome}"
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Action */}
              <div className="mt-6 pt-4 border-t border-border flex justify-end gap-3 shrink-0">
                <Button 
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setShowPopup(false); }}
                >
                  Close
                </Button>
                {!isCompleted && (
                  <Button 
                    onClick={handleMarkComplete}
                    disabled={isLoading}
                    className="min-w-[140px]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
