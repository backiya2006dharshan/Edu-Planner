import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  BookOpen,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Shield,
} from 'lucide-react';

/* ── Completion checklist item ─────────────────────────────────── */
function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      done
        ? 'bg-green-500/10 border-green-500/20 text-green-300'
        : 'bg-white/5 border-white/10 text-gray-400'
    }`}>
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-600 shrink-0" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

/* ── Input with icon ───────────────────────────────────────────── */
function IconInput({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex h-11 w-full rounded-xl border border-white/10 bg-surface px-4 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  /* Form state — initialised from auth context */
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [yearOfStudy, setYearOfStudy] = useState(user?.year_of_study ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [regulation, setRegulation] = useState(user?.regulation ?? '');
  const [semester, setSemester] = useState(user?.semester ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* Completion checklist */
  const checks = [
    { done: !!(user?.full_name && user.full_name.length > 1), label: 'Full name set' },
    { done: !!user?.phone, label: 'Phone number added' },
    { done: !!user?.department, label: 'Department specified' },
    { done: !!user?.year_of_study, label: 'Year of study filled' },
    { done: !!user?.college, label: 'College name entered' },
    { done: !!user?.regulation, label: 'Regulation code set' },
    { done: !!user?.semester, label: 'Semester selected' },
    { done: !!user?.bio, label: 'Bio / About me written' },
  ];
  const completedCount = checks.filter((c) => c.done).length;
  const completionPercent = Math.round((completedCount / checks.length) * 100);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await authApi.updateProfile({
        full_name: fullName || undefined,
        phone: phone || undefined,
        department: department || undefined,
        year_of_study: yearOfStudy || undefined,
        bio: bio || undefined,
        college: college || undefined,
        regulation: regulation || undefined,
        semester: semester || undefined,
      });
      updateUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarInitial = (user?.full_name ?? 'U').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Profile</h1>
        <p className="text-gray-400">Manage your personal details and academic information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column — avatar + completion ──────────────────── */}
        <div className="space-y-6">
          {/* Avatar card */}
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-primary/30 border-4 border-primary/20">
                  {avatarInitial}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-background" />
              </div>
              <div>
                <p className="font-bold text-lg text-white">{user?.full_name}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                  <Shield className="w-3 h-3" />
                  {user?.role}
                </span>
              </div>
              {user?.department && (
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {user.department}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profile completion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress ring area */}
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle
                      cx="32" cy="32" r="26"
                      fill="none"
                      stroke="rgb(99,102,241)"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - completionPercent / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {completionPercent}%
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-white">{completedCount}/{checks.length} complete</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {completionPercent === 100
                      ? '🎉 Profile fully complete!'
                      : 'Fill in more details below'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {checks.map((c) => (
                  <CheckItem key={c.label} done={c.done} label={c.label} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column — edit form ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <IconInput
                  icon={User}
                  label="Full Name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={setFullName}
                />
                <IconInput
                  icon={Mail}
                  label="Email Address"
                  placeholder="your@email.com"
                  value={user?.email ?? ''}
                  onChange={() => {}}
                  type="email"
                  disabled
                />
              </div>
              <IconInput
                icon={Phone}
                label="Phone Number"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={setPhone}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Bio / About Me
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short description about yourself..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent resize-none transition-colors"
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <IconInput
                  icon={Building2}
                  label="College / Institution"
                  placeholder="Kongu Engineering College"
                  value={college}
                  onChange={setCollege}
                />
                <IconInput
                  icon={Building2}
                  label="Department"
                  placeholder="Artificial Intelligence & Data Science"
                  value={department}
                  onChange={setDepartment}
                />
                <IconInput
                  icon={Calendar}
                  label="Year of Study"
                  placeholder="e.g. 2nd Year"
                  value={yearOfStudy}
                  onChange={setYearOfStudy}
                />
                <IconInput
                  icon={BookOpen}
                  label="Semester"
                  placeholder="e.g. Semester 3"
                  value={semester}
                  onChange={setSemester}
                />
                <IconInput
                  icon={FileText}
                  label="Regulation"
                  placeholder="e.g. R2021"
                  value={regulation}
                  onChange={setRegulation}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save feedback + button */}
          {saveSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Profile saved successfully!</span>
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{saveError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isSaving}
              className="px-10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
