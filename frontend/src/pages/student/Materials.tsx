import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../components/auth/AuthProvider';
import { materialsApi, Material, MaterialDetail } from '../../api/materials';
import { apiClient } from '../../api/client';
import {
  Loader2,
  FileText,
  Search,
  Library,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FilePlus2,
  Filter,
  Eye,
  Layers,
} from 'lucide-react';

/* ── File-type badge ──────────────────────────────────────────── */
function FileBadge({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pdf:  { label: 'PDF',  bg: 'bg-red-500/20',   text: 'text-red-400'   },
    docx: { label: 'DOCX', bg: 'bg-blue-500/20',  text: 'text-blue-400'  },
    pptx: { label: 'PPTX', bg: 'bg-orange-500/20',text: 'text-orange-400'},
    txt:  { label: 'TXT',  bg: 'bg-gray-500/20',  text: 'text-gray-400'  },
    md:   { label: 'MD',   bg: 'bg-green-500/20', text: 'text-green-400' },
  };
  const { label, bg, text } = map[ext] ?? { label: ext.toUpperCase() || 'FILE', bg: 'bg-white/10', text: 'text-gray-400' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bg} ${text}`}>
      {label}
    </span>
  );
}

/* ── Upload Modal (students & teachers) ────────────────────────── */
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [college, setCollege]     = useState('');
  const [semester, setSemester]   = useState('');
  const [regulation, setRegulation] = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file || !college || !semester || !regulation) {
      setError('All fields and a file are required.');
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('college', college);
      formData.append('semester', semester);
      formData.append('regulation', regulation);
      formData.append('file', file);
      await apiClient.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(detail ?? 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
              <FilePlus2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Upload Learning Material</h2>
              <p className="text-xs text-gray-400">PDF, DOCX, TXT, MD supported</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? 'border-primary/60 bg-primary/5'
                : 'border-white/15 hover:border-primary/40 bg-white/3'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.rst"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-white text-sm">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-auto text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-300">Drop file here or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">PDF · DOCX · TXT · MD · RST</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="College"
              placeholder="KEC"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            />
            <Input
              label="Semester"
              placeholder="3"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
            <Input
              label="Regulation"
              placeholder="R2021"
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Uploaded and indexed successfully!
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} isLoading={isUploading} disabled={isUploading || !file}>
            <Upload className="w-4 h-4 mr-2" />
            Upload & Index
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── View Document Modal ───────────────────────────────────────── */
function ViewDocumentModal({ materialId, onClose }: { materialId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<MaterialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await materialsApi.getDetail(materialId);
        setDetail(data);
      } catch (err) {
        console.error('Failed to load document detail', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [materialId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-surface border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">{detail?.file_name || 'Loading Document...'}</h2>
              {detail && (
                <p className="text-xs text-gray-400">
                  {detail.college} · Sem {detail.semester} · Reg {detail.regulation} ({detail.chunk_count} RAG chunks)
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
              <span className="text-gray-300">Reading document chunks from database...</span>
            </div>
          ) : !detail || detail.chunks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No content chunks found for this document.</div>
          ) : (
            <div className="space-y-4">
              {detail.chunks.map((chunk, idx) => (
                <div key={chunk.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-primary font-semibold border-b border-white/5 pb-2">
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Chunk #{idx + 1}
                    </span>
                    {chunk.page_number != null && <span>Page {chunk.page_number}</span>}
                  </div>
                  <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>Close Viewer</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Materials page ──────────────────────────────────────── */
export default function Materials() {
  const { user } = useAuth();
  const [materials, setMaterials]     = useState<Material[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [showUpload, setShowUpload]   = useState(false);
  const [viewingMaterialId, setViewingMaterialId] = useState<number | null>(null);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await materialsApi.list(collegeFilter || undefined);
      setMaterials(data);
    } catch (err) {
      console.error('Failed to fetch materials', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const filtered = materials.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.file_name.toLowerCase().includes(q) ||
      m.college.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchMaterials} />
      )}

      {viewingMaterialId !== null && (
        <ViewDocumentModal materialId={viewingMaterialId} onClose={() => setViewingMaterialId(null)} />
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Learning Materials</h1>
            <p className="text-gray-400">
              Browse RAG-indexed curriculum documents — stored persistently in database & ChromaDB.
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} className="shrink-0">
            <Upload className="w-4 h-4 mr-2" />
            Upload Material
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by filename, subject, college…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-surface text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMaterials()}
              placeholder="Filter by college"
              className="w-full sm:w-48 h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-surface text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-white/20 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Library className="w-9 h-9 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-200">No Materials Found</h3>
                <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                  Upload your learning materials to index them into RAG.
                </p>
              </div>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload First Material
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => setShowUpload(true)}
              className="border-2 border-dashed border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:border-primary/60 hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FilePlus2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary">Upload New Material</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, MD</p>
              </div>
            </button>

            {filtered.map((material) => (
              <Card
                key={material.id}
                className="hover:border-primary/30 transition-all duration-200 group hover:shadow-lg hover:shadow-primary/5"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileBadge name={material.file_name} />
                      </div>
                      <h3
                        className="font-bold text-base leading-tight truncate text-white"
                        title={material.file_name}
                      >
                        {material.file_name}
                      </h3>
                      <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                        <p>College: <span className="text-gray-200">{material.college}</span></p>
                        <p>
                          Sem <span className="text-gray-200">{material.semester}</span>
                          {' · '}
                          Reg <span className="text-gray-200">{material.regulation}</span>
                          {material.chunk_count != null && (
                            <>
                              {' · '}
                              <span className="text-gray-200">{material.chunk_count} chunks</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setViewingMaterialId(material.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      View Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
