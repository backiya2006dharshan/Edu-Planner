import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './routes/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import Assessment from './pages/student/Assessment';
import LearningPlanGenerator from './pages/student/LearningPlanGenerator';
import SkillTree from './pages/student/SkillTree';
import Materials from './pages/student/Materials';
import Progress from './pages/student/Progress';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentViewer from './pages/teacher/StudentViewer';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/assessment" element={<Assessment />} />
              <Route path="/student/generate" element={<LearningPlanGenerator />} />
              <Route path="/student/skill-tree" element={<SkillTree />} />
              <Route path="/student/materials" element={<Materials />} />
              <Route path="/student/progress" element={<Progress />} />
            </Route>
          </Route>

          {/* Protected Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/students" element={<StudentViewer />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
