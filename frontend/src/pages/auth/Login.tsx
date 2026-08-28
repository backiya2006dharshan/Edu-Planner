import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { BookOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { access_token, user } = await authApi.login(email, password);
      localStorage.setItem('token', access_token);
      
      login(access_token, user);
      
      navigate(`/${user.role}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
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
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
          <p className="text-gray-400 text-sm">Enter your credentials to continue your learning journey</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {error}
              </div>
            )}
            
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
            
            <div className="flex items-center justify-end">
              <a href="#" className="text-sm text-primary hover:text-blue-400 font-medium">
                Forgot password?
              </a>
            </div>
            
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
            
            <div className="text-center text-sm text-gray-400 pt-4">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-blue-400 font-medium">
                Create one now
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
