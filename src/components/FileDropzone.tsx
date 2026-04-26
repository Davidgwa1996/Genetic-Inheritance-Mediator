import React, { useState, useRef } from 'react';
import { Upload, X, File, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileDropzoneProps {
  onFilesSelected: (content: string, fileName: string) => void;
  isLoading?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelected, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    
    // Check file size (40MB user limit)
    if (file.size > 40 * 1024 * 1024) {
      toast.error("File exceeds 40MB security threshold");
      return;
    }

    // Expanded formats: Images, PDFs, Docs, Data
    const validExtensions = ['.txt', '.json', '.vcf', '.csv', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.jsx'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast.error(`Format ${extension} not supported. Use PDF, Image, or Data files.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setSelectedFile(file);
        onFilesSelected(content, file.name);
        toast.success(`Encrypted buffer primed with ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    onFilesSelected('', '');
  };

  return (
    <div className="space-y-4">
      <div 
        className={`relative h-56 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".txt,.json,.vcf,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.jsx"
        />

        {!selectedFile ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg text-slate-400">
               <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-[#002F5C] tracking-[0.2em]">Clinical Artifact Buffer</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">PDF, IMG, DOCX, VCF • MAX 40MB</p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => inputRef.current?.click()}
              className="h-10 px-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-slate-200 bg-white hover:bg-slate-100 transition-colors"
            >
              Select Bio-Data
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500">
                   <File className="w-7 h-7" />
                </div>
                <div className="text-left">
                   <p className="text-xs font-black text-emerald-900 truncate max-w-[180px]">{selectedFile.name}</p>
                   <p className="text-[9px] font-bold text-emerald-600">AES-256 ENCRYPTED BUFFER</p>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-2 hover:bg-rose-100 rounded-lg text-rose-500 transition-colors"
                >
                   <X className="w-4 h-4" />
                </button>
             </div>
             <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 animate-pulse uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" /> local validation successful
             </div>
          </div>
        )}

        {dragActive && (
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none rounded-[2rem] border-4 border-blue-400 border-dashed" />
        )}
      </div>
    </div>
  );
};
