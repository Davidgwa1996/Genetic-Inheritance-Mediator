import React from 'react';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface DataUploaderProps {
  familyId: string;
  memberId: string;
}

export const DataUploader: React.FC<DataUploaderProps> = ({ familyId, memberId }) => {
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
        memberId,
        type,
        category,
        content, // In a real app, this would be encrypted with a family key or KMS
        originalFileName: type === 'clinical' ? 'clinical_letter.pdf' : 'markers.json',
        createdAt: serverTimestamp()
      });

      // Audit Log
      const logRef = doc(db, 'families', familyId, 'auditLog', `upload-${Date.now()}`);
      await setDoc(logRef, {
        actorId: memberId,
        action: 'UPLOAD_DATA',
        targetId: memberId,
        details: `Uploaded ${type} data for ${category}`,
        timestamp: serverTimestamp()
      });

      toast.success("Data uploaded successfully");
      setContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/healthData`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Add Health Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="genetic">Genetic Markers (JSON)</SelectItem>
                <SelectItem value="clinical">Clinical Letter (PDF/Text)</SelectItem>
                <SelectItem value="note">Family History Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heart">Cardiovascular</SelectItem>
                <SelectItem value="cancer">Oncology</SelectItem>
                <SelectItem value="neuro">Neurology</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>File Content (Simulated)</Label>
          <Input 
            placeholder="Paste raw data or clinical summary here..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <Button onClick={handleUpload} disabled={loading || !content} className="w-full">
          {loading ? "Uploading..." : "Encrypt & Upload"}
        </Button>
      </CardContent>
    </Card>
  );
};
