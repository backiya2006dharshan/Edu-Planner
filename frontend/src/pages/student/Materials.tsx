import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { materialsApi, Material } from '../../api/materials';
import { Loader2, FileText, Search, Library } from 'lucide-react';

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const data = await materialsApi.list();
        setMaterials(data);
      } catch (err) {
        console.error("Failed to fetch materials", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter(m => 
    m.filename.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Curriculum Materials</h1>
          <p className="text-gray-400">Browse available lecture notes, slides, and RAG-indexed documents.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input 
            placeholder="Search materials..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <Card key={material.id} className="hover:border-primary/30 transition-colors group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate" title={material.filename}>
                      {material.filename}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-400">
                      <p>Subject: <span className="text-gray-200">{material.subject || 'Unknown'}</span></p>
                      <p>College: <span className="text-gray-200">{material.college}</span></p>
                      <p>Sem: <span className="text-gray-200">{material.semester}</span> | Reg: <span className="text-gray-200">{material.regulation}</span></p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Button variant="secondary" className="w-full">
                    View Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredMaterials.length === 0 && (
            <div className="col-span-full">
              <Card className="border-dashed border-white/20 bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Library className="w-12 h-12 text-gray-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-300">No Materials Found</h3>
                  <p className="text-gray-500 mt-2">Try adjusting your search query.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
