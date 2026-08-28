import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { teacherApi, StudentProgress } from '../../api/teacher';
import { Search, MoreVertical, Eye, Network } from 'lucide-react';

export default function StudentViewer() {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      const data = await teacherApi.getStudents();
      setStudents(data);
    };
    fetchStudents();
  }, []);

  const filtered = students.filter(s => 
    s.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Students Directory</h1>
          <p className="text-gray-400">Manage and monitor student learning plans.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input 
            placeholder="Search students..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-200">Student Name</th>
                  <th className="px-6 py-4 font-medium text-gray-200">Skills</th>
                  <th className="px-6 py-4 font-medium text-gray-200">Avg Score</th>
                  <th className="px-6 py-4 font-medium text-gray-200">Last Active</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30 shrink-0">
                          {s.user.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200">{s.user.full_name}</p>
                          <p className="text-xs">{s.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-purple-400" />
                        <span>{s.skills_assessed} Assessed</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${s.average_score >= 80 ? 'bg-green-500' : s.average_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${s.average_score}%` }} 
                          />
                        </div>
                        <span className="font-medium text-gray-200">{s.average_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(s.last_active).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No students found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
