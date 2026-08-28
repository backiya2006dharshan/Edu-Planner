import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { access_token, user } = await authApi.register(email, password, fullName, role);
      localStorage.setItem('token', access_token);
      
      login(access_token, user);
      
      navigate(`/${user.role}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:3rem_3rem]" />
      <div className="absolute inset-0 bg-background/90 backdrop-blur-3xl" />
      
      <Card className="w-full max-w-md relative z-10 border-white/5 bg-surface/80">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
          <p className="text-gray-400 text-sm">Join the platform to start your learning journey</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {error}
              </div>
            )}
            
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Role</label>
              <select
                className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={role}
                onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign Up
            </Button>
            
            <div className="text-center text-sm text-gray-400 pt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-blue-400 font-medium">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
