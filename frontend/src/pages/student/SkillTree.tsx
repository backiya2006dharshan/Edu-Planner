import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { assessmentApi, Skill } from '../../api/assessment';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Network,
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Plus,
  BarChart3,
  Zap,
  X,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

/* ── Skill-level configuration ──────────────────────────────────── */
function getSkillConfig(score: number) {
  const pct = Math.round(score);
  if (pct >= 80) return { level: 'Advanced',      color: 'purple', hex: '#a855f7' };
  if (pct >= 50) return { level: 'Intermediate',  color: 'green',  hex: '#22c55e' };
  if (pct >= 25) return { level: 'Developing',    color: 'yellow', hex: '#eab308' };
  return          { level: 'Beginner',    color: 'blue',   hex: '#3b82f6' };
}

const colorMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  purple: { text: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-500/40', glow: 'shadow-purple-500/20' },
  green:  { text: 'text-green-400',  bg: 'bg-green-500',  border: 'border-green-500/40',  glow: 'shadow-green-500/20'  },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/20' },
  blue:   { text: 'text-blue-400',   bg: 'bg-blue-500',   border: 'border-blue-500/40',   glow: 'shadow-blue-500/20'   },
};

const skillIcons: Record<string, React.ElementType> = {
  'Numerical Calculation': BarChart3,
  'Abstract Thinking':     BrainCircuit,
  'Logical Reasoning':     Network,
  'Association/Analogy':   Sparkles,
  'Spatial Imagination':   Zap,
};

function SkillCard({ skill, onEdit }: { skill: Skill; onEdit: (s: Skill) => void }) {
  const pct = Math.round(skill.score);
  const { level, color, hex } = getSkillConfig(pct);
  const cls = colorMap[color];
  const Icon = skillIcons[skill.skill_category] ?? Network;

  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (pct / 100);

  return (
    <Card className={`relative overflow-hidden border ${cls.border} hover:shadow-lg transition-all duration-300 group`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${cls.bg} opacity-80`} />

      <CardContent className="pt-6 pb-5">
        <div className="flex justify-between items-start mb-5">
          <div className={`p-2.5 rounded-xl border ${cls.border} bg-white/5`}>
            <Icon className={`w-5 h-5 ${cls.text}`} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(skill)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Update Skill Score"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <span className={`text-xs font-bold uppercase tracking-widest ${cls.text} px-2 py-1 rounded-full bg-white/5 border ${cls.border}`}>
              {level}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-base mb-4 text-white">{skill.skill_category}</h3>

        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 88 88" className="w-20 h-20 -rotate-90">
              <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              <circle
                cx="44" cy="44" r={radius}
                fill="none"
                stroke={hex}
                strokeWidth="8"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
              {pct}%
            </span>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${cls.bg} rounded-full transition-all duration-1000`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Last updated:{' '}
              {skill.last_updated
                ? new Date(skill.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SkillTree() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);

  // Edit skill states
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editScore, setEditScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);

  const navigate = useNavigate();

  const fetchSkills = async () => {
    try {
      const data = await assessmentApi.getSkills();
      setSkills(data);
    } catch (err) {
      console.error('Failed to fetch skills', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setIsAdding(true);
    try {
      await assessmentApi.addCustomSkill(newSkillName.trim());
      await fetchSkills();
      setAddSuccessMsg(`Successfully added "${newSkillName.trim()}". Conduct an assessment now!`);
      setNewSkillName('');
      setTimeout(() => setAddSuccessMsg(null), 4000);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add custom skill', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    setIsUpdating(true);
    try {
      await assessmentApi.updateSkillScore(editingSkill.id, editScore);
      await fetchSkills();
      setEditingSkill(null);
    } catch (err) {
      console.error('Failed to update skill score', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const avgScore = skills.length
    ? Math.round(skills.reduce((s, k) => s + k.score, 0) / skills.length)
    : 0;
  const assessed = skills.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">5-D Skill Tree & Competencies</h1>
          <p className="text-gray-400">
            Real-time student skill progression map persisted in PostgreSQL. Add or update skills anytime!
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowAddModal(true)}
            className="group"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
            Add Custom Skill
          </Button>
          <Button
            onClick={() => navigate('/student/assessment')}
            className="group"
          >
            <BrainCircuit className="w-4 h-4 mr-2" />
            Conduct Assessment
          </Button>
        </div>
      </div>

      {addSuccessMsg && (
        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <span>{addSuccessMsg}</span>
          </div>
          <Button size="sm" onClick={() => navigate('/student/assessment')}>
            Start Assessment Now
          </Button>
        </div>
      )}

      {skills.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Overall Average</p>
                <p className="text-2xl font-bold">{avgScore}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30">
                <Network className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Active Skills</p>
                <p className="text-2xl font-bold">{assessed}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <BrainCircuit className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Top Strength</p>
                <p className="text-base font-bold truncate">
                  {skills.length > 0
                    ? skills.reduce((a, b) => (a.score > b.score ? a : b)).skill_category.split(' ')[0]
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {skills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={(s) => {
                setEditingSkill(s);
                setEditScore(Math.round(s.score));
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-white/20 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Network className="w-10 h-10 text-gray-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-200">No Skills Mapped Yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                Add custom skills or take the diagnostic assessment to unlock your personalised Skill Tree.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                Add Custom Skill
              </Button>
              <Button onClick={() => navigate('/student/assessment')}>
                <BrainCircuit className="w-5 h-5 mr-2" />
                Take the Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add Custom Skill Modal ───────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-bold text-lg text-white">Add Custom Skill</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <Input
                label="Skill Category Name"
                placeholder="e.g. Data Structures, Python, Machine Learning"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">
                After adding this skill, conduct an assessment to test your knowledge and get graded.
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isAdding} disabled={!newSkillName.trim()}>
                  Add & Assess
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Skill Score Modal ────────────────────────────────── */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                  <Edit3 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-white">Update Skill Level</h2>
                  <p className="text-xs text-gray-400">{editingSkill.skill_category}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSkill(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSkill} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-300">Competence Score</span>
                  <span className="text-primary font-bold text-lg">{editScore}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editScore}
                  onChange={(e) => setEditScore(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingSkill(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isUpdating}>
                  Save Score
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
