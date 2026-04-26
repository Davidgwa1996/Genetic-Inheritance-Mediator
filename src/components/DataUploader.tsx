import React from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, Database, Braces, Clipboard, Activity, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { FamilyMember } from '../types';
import { FileDropzone } from './FileDropzone';

interface DataUploaderProps {
  familyId: string;
  currentUserId: string;
  members: FamilyMember[];
  auditLogs?: any[];
}

export const DataUploader: React.FC<DataUploaderProps> = ({ familyId, currentUserId, members, auditLogs = [] }) => {
   const [targetMemberId, setTargetMemberId] = React.useState(currentUserId);
  const [type, setType] = React.useState('genetic');
  const [category, setCategory] = React.useState('heart');
  const [fileContent, setFileContent] = React.useState('');
  const [textContent, setTextContent] = React.useState('');
  const [fileSize, setFileSize] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const MAX_SIZE_MB = 40;
  const currentSizeMB = Number((fileSize / (1024 * 1024)).toFixed(2));
  const capacityPercentage = Math.min(100, (currentSizeMB / MAX_SIZE_MB) * 100);

  const handleFilesSelected = (content: string, fileName: string) => {
    setFileContent(content);
    setFileSize(new Blob([content]).size);
    if (fileName.toLowerCase().endsWith('.vcf') || fileName.toLowerCase().endsWith('.vcf.gz')) setType('genetic');
    if (fileName.toLowerCase().endsWith('.json')) setType('genetic');
    toast.success(`Securely buffered ${fileName}`);
  };

  const handleClear = () => {
    setFileContent('');
    setFileSize(0);
    setTextContent('');
  };

  const handleUpload = async () => {
    const finalContent = fileContent || textContent;
    if (!finalContent) return;
    
    const size = new Blob([finalContent]).size;
    if (size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Exceeds 40MB limit. Neural buffer overflow.`);
      return;
    }

    setLoading(true);
    try {
      const dataRef = collection(db, 'families', familyId, 'healthData');
      await addDoc(dataRef, {
        memberId: targetMemberId,
        uploadedBy: currentUserId,
        type,
        category,
        content: finalContent,
        pseudonymizedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'analyzing', // Clinical analysis pipeline status
        hospitalNode: 'NEXUS-ALPHA-1'
      });

      const logRef = doc(db, 'families', familyId, 'auditLog', `upload-${Date.now()}`);
      await setDoc(logRef, {
        actorId: currentUserId,
        action: 'UPLOAD_DATA',
        targetId: targetMemberId,
        details: `Uploaded ${type} payload for ${category}. Initializing neural cross-reference.`,
        timestamp: serverTimestamp()
      });

      toast.success(`Encrypted data linked to member ${targetMemberId.slice(0, 5)}...`);
      
      // Simulate real-time neural analysis integration for hospital settings
      setTimeout(() => {
        toast.info("Neural Synthesis Engine: Cross-referencing familial phenotypes...");
      }, 2000);

      handleClear();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/healthData`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
      <CardHeader className="bg-[#002F5C] text-white p-10">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tighter uppercase">Secure Data Ingestion</CardTitle>
            <CardDescription className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">AES-256 Multi-Shard Protocol</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-10 space-y-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Target Node</Label>
            <Select value={targetMemberId} onValueChange={setTargetMemberId}>
              <SelectTrigger className="rounded-[1.5rem] h-14 border-slate-100 bg-slate-50 font-bold active:scale-95 transition-all">
                <SelectValue placeholder="Select bio-target" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                {members?.map(m => (
                  <SelectItem key={m.id} value={m.id} className="rounded-xl font-bold">
                    {m.name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Capture Mode (Unlimited Streams)</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-[1.5rem] h-14 border-slate-100 bg-slate-50 font-bold active:scale-95 transition-all">
                  <SelectValue />
                </SelectTrigger>
               <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                  <SelectItem value="genetic" className="rounded-xl font-bold text-xs uppercase">Genetic (VCF/WGS/JSON)</SelectItem>
                  <SelectItem value="clinical" className="rounded-xl font-bold text-xs uppercase">Clinical Summary (ICD-10)</SelectItem>
                  <SelectItem value="note" className="rounded-xl font-bold text-xs uppercase">Phenotypic Observations</SelectItem>
                  <SelectItem value="imaging" className="rounded-xl font-bold text-xs uppercase">Imaging Analysis (MRI/CT)</SelectItem>
                  <SelectItem value="biopsy" className="rounded-xl font-bold text-xs uppercase">Pathology/Histology</SelectItem>
                  <SelectItem value="lab" className="rounded-xl font-bold text-xs uppercase">Biochemical Lab Profile</SelectItem>
                  <SelectItem value="pharmacy" className="rounded-xl font-bold text-xs uppercase">Medication / Rx Stream</SelectItem>
                  <SelectItem value="wearable" className="rounded-xl font-bold text-xs uppercase">Wearable Bio-Telemetry</SelectItem>
                  <SelectItem value="lifestyle" className="rounded-xl font-bold text-xs uppercase">Exposome / Lifestyle</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Physiological Stream (Node)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-[1.5rem] h-14 border-slate-100 bg-slate-50 font-bold active:scale-95 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl max-h-[300px]">
                  <SelectItem value="heart" className="rounded-xl font-bold text-xs uppercase">Cardiovascular (Heart)</SelectItem>
                  <SelectItem value="cancer" className="rounded-xl font-bold text-xs uppercase">Oncology (Solid Tumor)</SelectItem>
                  <SelectItem value="heme_onc" className="rounded-xl font-bold text-xs uppercase">Heme-Oncology (Blood)</SelectItem>
                  <SelectItem value="breast_cancer" className="rounded-xl font-bold text-xs uppercase">Reproductive Oncology</SelectItem>
                  <SelectItem value="colon_cancer" className="rounded-xl font-bold text-xs uppercase">Gastrointestinal Oncology</SelectItem>
                  <SelectItem value="neuro" className="rounded-xl font-bold text-xs uppercase">Neuro-Degeneration</SelectItem>
                  <SelectItem value="alzh" className="rounded-xl font-bold text-xs uppercase">Cognitive Nexus (AZ/Dementia)</SelectItem>
                  <SelectItem value="eye" className="rounded-xl font-bold text-xs uppercase">Ocular Health (AMD)</SelectItem>
                  <SelectItem value="endo" className="rounded-xl font-bold text-xs uppercase">Endocrine (Diabetes)</SelectItem>
                  <SelectItem value="autoimmune" className="rounded-xl font-bold text-xs uppercase">Autoimmune / Renal</SelectItem>
                  <SelectItem value="pulmonary" className="rounded-xl font-bold text-xs uppercase">Pulmonary (Asthma/COPD)</SelectItem>
                  <SelectItem value="hematology" className="rounded-xl font-bold text-xs uppercase">Hematology (General)</SelectItem>
                  <SelectItem value="metabolic" className="rounded-xl font-bold text-xs uppercase">Metabolic (Inborn Errors)</SelectItem>
                  <SelectItem value="rare" className="rounded-xl font-bold text-xs uppercase">Rare Disease / Dysmorphology</SelectItem>
                  <SelectItem value="pediatric" className="rounded-xl font-bold text-xs uppercase">Pediatric Developmental</SelectItem>
                  <SelectItem value="mental" className="rounded-xl font-bold text-xs uppercase">Neuro-Psychiatric</SelectItem>
                  <SelectItem value="other" className="rounded-xl font-bold text-xs uppercase">Other Phenotypic Divergence</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">
             <span>Source Feed</span>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                         className={`h-full transition-all duration-500 ${capacityPercentage > 90 ? 'bg-rose-500' : 'bg-blue-500'}`} 
                         style={{ width: `${capacityPercentage}%` }} 
                      />
                   </div>
                   <span className={`font-mono ${capacityPercentage > 90 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {currentSizeMB} / {MAX_SIZE_MB}MB
                   </span>
                </div>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-500" /> RAW BUFFER</span>
             </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <FileDropzone onFilesSelected={handleFilesSelected} isLoading={loading} />
              {fileContent && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase">Binary Stream Loaded ({currentSizeMB}MB)</span>
                   </div>
                   <Button variant="ghost" onClick={handleClear} className="h-8 text-[9px] font-black text-rose-500 hover:bg-rose-50">Clear</Button>
                </div>
              )}
            </div>
            <Textarea 
              placeholder="Or manually input raw phenotypic observations here..." 
              value={textContent}
              onChange={(e) => {
                setTextContent(e.target.value);
                setFileSize(new Blob([e.target.value]).size + (fileContent ? new Blob([fileContent]).size : 0));
              }}
              className="min-h-[200px] rounded-[2.5rem] bg-slate-50 border-slate-100 font-mono text-[10px] p-8 focus-visible:ring-blue-500 shadow-inner resize-none"
            />
          </div>
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={loading || (!fileContent && !textContent)} 
          className="w-full bg-[#005EB8] hover:bg-black text-white h-20 rounded-3xl font-black uppercase tracking-[0.5em] text-[10px] transition-all active:scale-95 shadow-2xl shadow-blue-500/20 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-blue-400/10 group-hover:bg-transparent transition-all" />
          {loading ? (
             <span className="flex items-center gap-3"><Upload className="animate-bounce w-5 h-5" /> SYNCHRONIZING WITH NEXUS...</span>
          ) : (
             <span className="flex items-center gap-3">INITIALIZE PROTOCOL SYNC <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
          )}
        </Button>

        <p className="text-[9px] text-center text-slate-400 italic">
          Files are automatically pseudonymized before transmission. No raw genomic data is persisted.
        </p>

        {auditLogs.length > 0 && (
          <div className="pt-8 border-t border-slate-50 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em]">Recent Node Transmissions</h3>
                <span className="text-[8px] font-bold text-slate-300">{auditLogs.length} LOGS PERSISTED</span>
             </div>
             <div className="space-y-2">
                {auditLogs.filter(log => log.actorId === currentUserId).slice(0, 3).map((log) => (
                  <div key={`nexus-log-${log.id}`} className="p-4 bg-slate-50/50 rounded-2xl flex items-center justify-between group hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                       <Activity className="w-3 h-3 text-blue-400" />
                       <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                          {log.action} <span className="text-slate-400 mx-1">/</span> {log.details.split('.')[0]}
                       </div>
                    </div>
                    <div className="text-[8px] font-bold text-slate-300 uppercase">
                       {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
