import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { BookOpen } from 'lucide-react';
import bgVideo from '../../27726-365890980_medium.mp4';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Force dark mode on login page to preserve design
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }, []);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/30 z-0" />

      <Card className="glass-card w-full max-w-md relative z-10">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-primary/40 shadow-[0_0_30px_rgba(79,126,255,0.4)]">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-text-primary">Welcome back</CardTitle>
          <p className="text-text-muted text-sm">Enter your credentials to continue your learning journey</p>
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

            <Button type="submit" className="w-full btn-gradient py-3 rounded-xl font-semibold mt-2" isLoading={isLoading}>
              Sign In
            </Button>

            <div className="text-center text-sm text-text-muted pt-4">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-blue-400 font-medium transition-colors">
                Create one now
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="mt-8 text-text-muted italic text-sm relative z-10 text-center max-w-sm">
        "Education is not the filling of a pail, but the lighting of a fire."
      </p>
    </div>
  );
}
