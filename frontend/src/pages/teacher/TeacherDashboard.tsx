import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { useAuth } from '../../components/auth/AuthProvider';
import { Users, BookOpen, AlertCircle, TrendingUp, Loader2, Plus, Copy, Check, School, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { teacherApi, TeacherStats, TeacherActivity, StudentProgress } from '../../api/teacher';
import { classroomApi, Classroom, ClassMember, ClassCreatePayload } from '../../api/classroom';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [classForm, setClassForm] = useState<ClassCreatePayload>({
    name: '',
    college: '',
    year: '',
    semester: '',
    regulation: '',
    section: ''
  });

  // View Members Modal
  const [selectedClassForMembers, setSelectedClassForMembers] = useState<Classroom | null>(null);
  const [classMembers, setClassMembers] = useState<ClassMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, actRes, stdRes, classRes] = await Promise.allSettled([
        teacherApi.getStats(),
        teacherApi.getActivity(),
        teacherApi.getStudents(),
        classroomApi.getTeacherClasses(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (actRes.status === 'fulfilled') setActivities(actRes.value);
      if (stdRes.status === 'fulfilled') setStudents(stdRes.value);
      if (classRes.status === 'fulfilled') setClasses(classRes.value);
    } catch (err) {
      console.error('Failed to load teacher dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClassForm({ ...classForm, [e.target.name]: e.target.value });
  };

  const handleCreateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) return;
    setIsCreatingClass(true);
    setCreateError('');
    try {
      const newClass = await classroomApi.createClass(classForm);
      setClasses(prev => [newClass, ...prev]);
      setCreatedClassCode(newClass.code);
      setClassForm({ name: '', college: '', year: '', semester: '', regulation: '', section: '' });
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create class.');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleViewMembers = async (cls: Classroom) => {
    setSelectedClassForMembers(cls);
    setIsLoadingMembers(true);
    try {
      const members = await classroomApi.getClassMembers(cls.id);
      setClassMembers(members);
    } catch (err) {
      console.error('Failed to load class members', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const needingAttention = students.filter(s => s.average_score < 50 || s.skills_assessed === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-gray-400">Loading instructor dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Instructor Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.full_name}. Real-time analytics from PostgreSQL database.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Students</p>
              <p className="text-2xl font-bold">{stats?.total_students ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Active Plans</p>
              <p className="text-2xl font-bold">{stats?.active_plans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-500/20 text-green-400 rounded-2xl border border-green-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Avg Completion</p>
              <p className="text-2xl font-bold">{stats?.avg_completion_rate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Needs Attention</p>
              <p className="text-2xl font-bold">{stats?.students_needing_attention ?? 0}</p>
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
            <p className="text-xs text-gray-400 mt-1">Manage classrooms, generate class codes, and view enrolled students.</p>
          </div>
          <Button onClick={() => { setShowCreateModal(true); setCreatedClassCode(null); setCreateError(''); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Class
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl bg-surface-light border border-white/10 hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-white">{cls.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {cls.member_count} {cls.member_count === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-gray-400 mb-3">
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

                    {/* Class Code Box */}
                    <div className="p-3 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400">Class Code</p>
                        <p className="text-lg font-mono font-bold tracking-wider text-primary">{cls.code}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyCode(cls.code)}
                        className="text-xs flex items-center gap-1 text-gray-300 hover:text-white"
                      >
                        {copiedCode === cls.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleViewMembers(cls)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5" /> View Members ({cls.member_count})
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No classes created yet. Click <span className="text-primary font-semibold">"Create Class"</span> to generate a class code.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Student Activity</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/teacher/students')}>View All Students</Button>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <p className="font-semibold text-gray-200">{item.name}</p>
                        <p className="text-sm text-gray-400">{item.action}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No recent student activity recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Students Needing Attention</CardTitle>
            </CardHeader>
            <CardContent>
              {needingAttention.length > 0 ? (
                <div className="space-y-4">
                  {needingAttention.map((student) => (
                    <div key={student.user.id} className="flex gap-4 items-start p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-200">{student.user.full_name}</p>
                        <p className="text-xs text-red-400/80">
                          {student.skills_assessed === 0 ? 'Assessment not completed' : `Low average score (${student.average_score}%)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4 text-center">All students are making good progress! 🎉</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <School className="w-6 h-6 mr-2 text-primary" /> Create New Class
              </h2>
              <p className="text-xs text-gray-400 mt-1">Enter details to generate a unique 6-character class code.</p>
            </div>

            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                {createError}
              </div>
            )}

            {createdClassCode ? (
              <div className="space-y-4 py-4 text-center">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300">
                  <p className="font-semibold text-sm">Class Created Successfully!</p>
                  <p className="text-xs text-green-400/80 mt-1">Share this code with your students to let them join.</p>
                </div>

                <div className="p-6 bg-black/60 rounded-xl border border-primary/30 inline-block w-full">
                  <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Generated Class Code</p>
                  <p className="text-3xl font-mono font-bold tracking-widest text-primary">{createdClassCode}</p>
                </div>

                <Button
                  onClick={() => handleCopyCode(createdClassCode)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {copiedCode === createdClassCode ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" /> Copied Code to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Code
                    </>
                  )}
                </Button>

                <Button variant="outline" className="w-full" onClick={() => setShowCreateModal(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateClassSubmit} className="space-y-4">
                <Input
                  label="Class Name *"
                  name="name"
                  placeholder="e.g. Web Development"
                  value={classForm.name}
                  onChange={handleFormChange}
                  required
                />
                <Input
                  label="College"
                  name="college"
                  placeholder="e.g. Kongu Engineering College"
                  value={classForm.college}
                  onChange={handleFormChange}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Year"
                    name="year"
                    placeholder="4"
                    value={classForm.year}
                    onChange={handleFormChange}
                  />
                  <Input
                    label="Semester"
                    name="semester"
                    placeholder="7"
                    value={classForm.semester}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Regulation"
                    name="regulation"
                    placeholder="2022"
                    value={classForm.regulation}
                    onChange={handleFormChange}
                  />
                  <Input
                    label="Section"
                    name="section"
                    placeholder="A"
                    value={classForm.section}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full" disabled={isCreatingClass}>
                    {isCreatingClass ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Class
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Class Members Modal */}
      {selectedClassForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedClassForMembers(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" /> {selectedClassForMembers.name} — Members
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Code: <span className="font-mono text-primary font-bold">{selectedClassForMembers.code}</span></p>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-3">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-gray-400">Loading enrolled students...</span>
                </div>
              ) : classMembers.length > 0 ? (
                classMembers.map((m) => (
                  <div key={m.id} className="p-3 bg-surface-light border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-white">{m.student_name}</p>
                      <p className="text-xs text-gray-400">{m.student_email}</p>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No students have joined this class yet. Share code <span className="font-mono font-bold text-primary">{selectedClassForMembers.code}</span> with your students.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedClassForMembers(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
