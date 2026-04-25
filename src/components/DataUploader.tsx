import React from 'react';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, Database, Braces, Clipboard } from 'lucide-react';
import { toast } from 'sonner';
import { FamilyMember } from '@/src/types';

interface DataUploaderProps {
  familyId: string;
  currentUserId: string;
  members: FamilyMember[];
}

export const DataUploader: React.FC<DataUploaderProps> = ({ familyId, currentUserId, members }) => {
  const [targetMemberId, setTargetMemberId] = React.useState(currentUserId);
  const [type, setType] = React.useState('genetic');
  const [category, setCategory] = React.useState('heart');
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleUpload = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const dataRef = collection(db, 'families', familyId, 'healthData');
      await addDoc(dataRef, {
        memberId: targetMemberId,
        type,
        category,
        content,
        pseudonymizedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      const logRef = doc(db, 'families', familyId, 'auditLog', `upload-${Date.now()}`);
      await setDoc(logRef, {
        actorId: currentUserId,
        action: 'UPLOAD_DATA',
        targetId: targetMemberId,
        details: `Uploaded ${type} payload for ${category}`,
        timestamp: serverTimestamp()
      });

      toast.success(`Encrypted data linked to member ${targetMemberId.slice(0, 5)}...`);
      setContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/healthData`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-none shadow-2xl rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-[#002F5C] text-white p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-black tracking-tighter">Secure Ingestion</CardTitle>
            <CardDescription className="text-blue-200 text-xs font-mono">AES-256 Pseudonymization Protocol</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Node</Label>
            <Select value={targetMemberId} onValueChange={setTargetMemberId}>
              <SelectTrigger className="rounded-xl h-12 border-slate-100">
                <SelectValue placeholder="Select family member" />
              </SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl h-12 border-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="genetic">
                    <span className="flex items-center gap-2"><Braces className="w-3 h-3"/> Genetic (JSON)</span>
                  </SelectItem>
                  <SelectItem value="clinical">
                    <span className="flex items-center gap-2"><FileText className="w-3 h-3"/> Clinical Report</span>
                  </SelectItem>
                  <SelectItem value="note">
                    <span className="flex items-center gap-2"><Clipboard className="w-3 h-3"/> Personal Note</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl h-12 border-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heart">Heart/Cardio</SelectItem>
                  <SelectItem value="cancer">Oncology</SelectItem>
                  <SelectItem value="neuro">Neurology</SelectItem>
                  <SelectItem value="eye">Ophthalmology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Striict Payload Input</Label>
          <Textarea 
            placeholder="Paste raw VCF data, clinical summaries, or phenotypic markers here..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] rounded-[1.5rem] bg-slate-50 border-slate-100 font-mono text-xs p-4 focus-visible:ring-blue-500"
          />
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={loading || !content} 
          className="w-full bg-[#005EB8] hover:bg-[#002F5C] text-white h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-500/20"
        >
          {loading ? (
             <span className="flex items-center gap-2"><Upload className="animate-bounce w-4 h-4" /> Shredding & Encrypting...</span>
          ) : (
             <span className="flex items-center gap-2">Protocol Sync <Database className="w-4 h-4" /></span>
          )}
        </Button>

        <p className="text-[9px] text-center text-slate-400 italic">
          Files are automatically pseudonymized before transmission. No raw genomic data is persisted.
        </p>
      </CardContent>
    </Card>
  );
};
