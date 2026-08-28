import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { useAuth } from '../../components/auth/AuthProvider';
import { Users, BookOpen, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Instructor Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.full_name}. Here's an overview of your students.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Students</p>
              <p className="text-2xl font-bold">142</p>
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
              <p className="text-2xl font-bold">87</p>
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
              <p className="text-2xl font-bold">64%</p>
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
              <p className="text-2xl font-bold">12</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Student Activity</CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Alice Johnson", action: "Completed Assessment: Web Tech", time: "10 mins ago" },
                  { name: "Bob Smith", action: "Generated Learning Plan for React", time: "1 hour ago" },
                  { name: "Charlie Davis", action: "Mastered Skill: Database Indexing", time: "3 hours ago" },
                  { name: "Diana Prince", action: "Started Assessment: Algorithms", time: "5 hours ago" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="font-semibold text-gray-200">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.action}</p>
                    </div>
                    <span className="text-xs text-gray-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Students Needing Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Evan Wright", reason: "Failed Assessment 3 times" },
                  { name: "Fiona Gallagher", reason: "Inactive for 14 days" },
                  { name: "George Miller", reason: "Struggling with Plan" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">{item.name}</p>
                      <p className="text-xs text-red-400/80">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
