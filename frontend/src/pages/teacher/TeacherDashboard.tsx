import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { useAuth } from '../../components/auth/AuthProvider';
import { Users, BookOpen, AlertCircle, TrendingUp, Loader2, Plus, Copy, Check, School, ShieldCheck, X, Upload, File as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { teacherApi, TeacherStats, TeacherActivity, StudentProgress } from '../../api/teacher';
import { classroomApi, Classroom, ClassMember, ClassCreatePayload } from '../../api/classroom';
import { materialsApi, Material } from '../../api/materials';
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

  // Upload Material Modal
  const [selectedClassForUpload, setSelectedClassForUpload] = useState<Classroom | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [classMaterials, setClassMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState<number | null>(null);

  // Delete Class Modal
  const [classToDelete, setClassToDelete] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleViewMaterials = async (cls: Classroom) => {
    setSelectedClassForUpload(cls);
    setUploadFile(null);
    setUploadError('');
    setUploadSuccess(false);
    setIsLoadingMaterials(true);
    try {
      const allMaterials = await materialsApi.list(cls.college);
      setClassMaterials(allMaterials.filter(m => m.semester === cls.semester && m.regulation === cls.regulation));
    } catch (err) {
      console.error('Failed to load materials', err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    setIsDeletingMaterial(id);
    try {
      await materialsApi.delete(id);
      setClassMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete material', err);
    } finally {
      setIsDeletingMaterial(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedClassForUpload) return;
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);
    try {
      const newMaterial = await materialsApi.upload({
        file: uploadFile,
        college: selectedClassForUpload.college || 'General',
        semester: selectedClassForUpload.semester || 'General',
        regulation: selectedClassForUpload.regulation || 'General',
        classId: selectedClassForUpload.id,
      });
      setClassMaterials(prev => [newMaterial, ...prev]);
      setUploadSuccess(true);
      setUploadFile(null);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 2500);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload material.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await classroomApi.deleteClass(classToDelete.id);
      setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
      setClassToDelete(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete class.');
    } finally {
      setIsDeleting(false);
    }
  };

  const needingAttention = students.filter(s => s.average_score < 50 || s.skills_assessed === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-text-muted">Loading instructor dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Instructor Dashboard</h1>
        <p className="text-text-muted">Welcome back, {user?.full_name}. Real-time analytics from PostgreSQL database.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/5 text-primary rounded-2xl border border-primary/40 shadow-[0_0_15px_rgba(79,126,255,0.2)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Total Students</p>
              <p className="text-2xl font-bold">{stats?.total_students ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/30 to-purple-500/5 text-purple-400 rounded-2xl border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Active Plans</p>
              <p className="text-2xl font-bold">{stats?.active_plans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-secondary/30 to-secondary/5 text-secondary rounded-2xl border border-secondary/40 shadow-[0_0_15px_rgba(34,211,160,0.2)]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Avg Completion</p>
              <p className="text-2xl font-bold">{stats?.avg_completion_rate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-warning/30 to-warning/5 text-warning rounded-2xl border border-warning/40 shadow-[0_0_15px_rgba(255,181,71,0.2)]">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Needs Attention</p>
              <p className="text-2xl font-bold">{stats?.students_needing_attention ?? 0}</p>
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
            <p className="text-xs text-text-muted mt-1">Manage classrooms, generate class codes, and view enrolled students.</p>
          </div>
          <Button onClick={() => { setShowCreateModal(true); setCreatedClassCode(null); setCreateError(''); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Class
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl bg-surface-light border border-border hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-text-primary">{cls.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {cls.member_count} {cls.member_count === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-text-muted mb-3">
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

                    {/* Class Code Box */}
                    <div className="p-3 bg-background/40 rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-text-muted">Class Code</p>
                        <p className="text-lg font-mono font-bold tracking-wider text-primary">{cls.code}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyCode(cls.code)}
                        className="text-xs flex items-center gap-1 text-text-muted hover:text-text-primary"
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

                  <div className="pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleViewMembers(cls)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5" /> Members ({cls.member_count})
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleViewMaterials(cls)}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Materials
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="px-2"
                      onClick={() => setClassToDelete(cls)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-text-primary" />
                    </Button>
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
                Create your first class to start managing your students and sharing materials.
              </p>
              <Button onClick={() => { setShowCreateModal(true); setCreatedClassCode(null); setCreateError(''); }} className="btn-gradient">
                Create Your First Class
              </Button>
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
                    <div key={i} className="flex gap-4 items-start p-4 bg-surface/50 rounded-xl border-l-4 border-l-primary border-y border-y-white/5 border-r border-r-white/5 hover:bg-surface transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary">{item.name}</p>
                        <p className="text-sm text-text-muted">{item.action}</p>
                      </div>
                      <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                        {new Date(item.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted text-sm">
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
                    <div key={student.user.id} className="flex gap-4 items-start p-4 bg-surface/50 rounded-xl border border-alert/20 relative overflow-hidden group hover:bg-surface transition-colors">
                      <div className="absolute top-0 left-0 w-1 h-full bg-alert group-hover:shadow-[0_0_10px_rgba(255,107,107,0.8)] transition-all"></div>
                      <div className="relative">
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-alert rounded-full animate-ping"></div>
                        <div className="w-2.5 h-2.5 bg-alert rounded-full absolute -top-1 -right-1"></div>
                        <AlertCircle className="w-5 h-5 text-alert shrink-0" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{student.user.full_name}</p>
                        <p className="text-xs text-alert/80 mt-1">
                          {student.skills_assessed === 0 ? 'Assessment not completed' : `Low average score (${student.average_score}%)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted py-4 text-center">All students are making good progress! 🎉</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl font-bold text-text-primary flex items-center">
                <School className="w-6 h-6 mr-2 text-primary" /> Create New Class
              </h2>
              <p className="text-xs text-text-muted mt-1">Enter details to generate a unique 6-character class code.</p>
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

                <div className="p-6 bg-background/60 rounded-xl border border-primary/30 inline-block w-full">
                  <p className="text-xs font-semibold uppercase text-text-muted mb-1">Generated Class Code</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedClassForMembers(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" /> {selectedClassForMembers.name} — Members
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Code: <span className="font-mono text-primary font-bold">{selectedClassForMembers.code}</span></p>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-3">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-text-muted">Loading enrolled students...</span>
                </div>
              ) : classMembers.length > 0 ? (
                classMembers.map((m) => (
                  <div key={m.id} className="p-3 bg-surface-light border border-border rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-text-primary">{m.student_name}</p>
                      <p className="text-xs text-text-muted">{m.student_email}</p>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-muted text-sm">
                  No students have joined this class yet. Share code <span className="font-mono font-bold text-primary">{selectedClassForMembers.code}</span> with your students.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedClassForMembers(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Material Modal */}
      {selectedClassForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedClassForUpload(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" /> Class Materials
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Manage materials for <span className="text-text-primary font-semibold">{selectedClassForUpload.name}</span>.
              </p>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {isLoadingMaterials ? (
                <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
              ) : classMaterials.length > 0 ? (
                classMaterials.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-surface-light border border-border rounded-xl">
                    <div className="truncate pr-4 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{m.file_name}</p>
                    </div>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      className="px-2" 
                      onClick={() => handleDeleteMaterial(m.id)}
                      disabled={isDeletingMaterial === m.id}
                    >
                      {isDeletingMaterial === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-text-primary" />}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-text-muted">No materials uploaded yet.</div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                {uploadError}
              </div>
            )}

            {uploadSuccess ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-center">
                <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="font-semibold text-sm">Material Uploaded Successfully!</p>
                <p className="text-xs text-green-400/80 mt-1">The document is now available to students and indexed for Ask AI.</p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="p-4 border-2 border-dashed border-border rounded-xl bg-background/20 text-center relative hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <FileIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  {uploadFile ? (
                    <p className="text-sm font-medium text-primary">{uploadFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-text-muted font-medium">Click to select or drag and drop</p>
                      <p className="text-xs text-text-muted mt-1">PDF, DOCX, TXT, MD (Max 10MB)</p>
                    </>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedClassForUpload(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full" disabled={isUploading || !uploadFile}>
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Upload File
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="bg-surface border border-red-500/30 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative text-center">
            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-text-primary">Delete Classroom?</h2>
              <p className="text-sm text-text-muted mt-2">
                Are you sure you want to delete <span className="text-text-primary font-semibold">{classToDelete.name}</span>? 
                This will permanently remove the class, kick out enrolled students, and delete all materials uploaded for this class's scope.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => setClassToDelete(null)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                className="w-full" 
                onClick={handleDeleteClass}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete Class
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
