import React from 'react';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConsentManagerProps {
  familyId: string;
  memberId: string;
  consent: any;
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({ familyId, memberId, consent }) => {
  const [localConsent, setLocalConsent] = React.useState(consent || {
    shareHeartRisk: false,
    shareHeartMarkers: false,
    shareCancerRisk: false,
    shareCancerMarkers: false,
    shareNeuroRisk: false,
    shareNeuroMarkers: false
  });

  const toggle = (field: string) => {
    setLocalConsent((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const save = async () => {
    try {
      const consentRef = doc(db, 'families', familyId, 'consents', memberId);
      await setDoc(consentRef, {
        ...localConsent,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Log audit
      const logRef = doc(db, 'families', familyId, 'auditLog', `consent-${Date.now()}`);
      await setDoc(logRef, {
        actorId: memberId,
        action: 'UPDATE_CONSENT',
        targetId: memberId,
        details: 'User updated sharing consent flags',
        timestamp: serverTimestamp()
      });

      toast.success("Consent updated successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/consents/${memberId}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Granular Consent Flags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Cardiovascular</h3>
            <div className="flex items-center space-x-2">
              <Checkbox id="heartRisk" checked={localConsent.shareHeartRisk} onCheckedChange={() => toggle('shareHeartRisk')} />
              <Label htmlFor="heartRisk">Share risk scores only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="heartMarkers" checked={localConsent.shareHeartMarkers} onCheckedChange={() => toggle('shareHeartMarkers')} />
              <Label htmlFor="heartMarkers">Share raw markers & letters</Label>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Oncology</h3>
            <div className="flex items-center space-x-2">
              <Checkbox id="cancerRisk" checked={localConsent.shareCancerRisk} onCheckedChange={() => toggle('shareCancerRisk')} />
              <Label htmlFor="cancerRisk">Share risk scores only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="cancerMarkers" checked={localConsent.shareCancerMarkers} onCheckedChange={() => toggle('shareCancerMarkers')} />
              <Label htmlFor="cancerMarkers">Share raw markers & letters</Label>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Neurology</h3>
            <div className="flex items-center space-x-2">
              <Checkbox id="neuroRisk" checked={localConsent.shareNeuroRisk} onCheckedChange={() => toggle('shareNeuroRisk')} />
              <Label htmlFor="neuroRisk">Share risk scores only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="neuroMarkers" checked={localConsent.shareNeuroMarkers} onCheckedChange={() => toggle('shareNeuroMarkers')} />
              <Label htmlFor="neuroMarkers">Share raw markers & letters</Label>
            </div>
          </div>
        </div>
        
        <Button onClick={save} className="w-full mt-4">Save Consent Settings</Button>
      </CardContent>
    </Card>
  );
};
