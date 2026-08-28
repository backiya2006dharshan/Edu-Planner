import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { TrendingUp, Award, Calendar, CheckCircle } from 'lucide-react';

export default function Progress() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Progress</h1>
        <p className="text-gray-400">Track your learning streak, completed plans, and milestones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/20 to-transparent border-orange-500/30">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 text-orange-400 mb-4" />
            <p className="text-sm font-medium text-gray-400">Current Streak</p>
            <p className="text-3xl font-bold text-white mt-1">4 Days</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-blue-400 mb-4" />
            <p className="text-sm font-medium text-gray-400">Plans Completed</p>
            <p className="text-3xl font-bold text-white mt-1">2</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-transparent border-purple-500/30">
          <CardContent className="p-6">
            <Award className="w-8 h-8 text-purple-400 mb-4" />
            <p className="text-sm font-medium text-gray-400">Skills Mastered</p>
            <p className="text-3xl font-bold text-white mt-1">5</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 text-green-400 mb-4" />
            <p className="text-sm font-medium text-gray-400">Study Hours</p>
            <p className="text-3xl font-bold text-white mt-1">12.5h</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {/* Item 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-surface text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Award className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-white/5 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white">Mastered Advanced React</div>
                    <time className="font-caveat font-medium text-primary">2 days ago</time>
                  </div>
                  <div className="text-gray-400 text-sm">Completed the final assessment with 95% score.</div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-surface text-green-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-white/5 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white">Started Machine Learning Basics</div>
                    <time className="font-caveat font-medium text-green-400">1 week ago</time>
                  </div>
                  <div className="text-gray-400 text-sm">Generated an AI learning plan and started the first module.</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-500">Activity chart will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
