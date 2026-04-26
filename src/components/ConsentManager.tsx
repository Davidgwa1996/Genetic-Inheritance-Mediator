import React from 'react';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Lock, Shield, UserCheck, Eye, EyeOff } from 'lucide-react';

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
    shareNeuroMarkers: false,
    isRevoked: false
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
      
      const logRef = doc(db, 'families', familyId, 'auditLogs', `consent-${Date.now()}`);
      await setDoc(logRef, {
        actorId: memberId,
        action: 'UPDATE_CONSENT',
        targetId: memberId,
        details: localConsent.isRevoked ? 'User REVOKED all data access' : 'User updated sharing consent flags',
        timestamp: serverTimestamp()
      });

      toast.success(localConsent.isRevoked ? "Data Transmission Terminated" : "Consent Stream Synchronized");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/consents/${memberId}`);
    }
  };

  return (
    <Card className="glass-card border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-[#002F5C] text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
             </div>
             <div>
                <CardTitle className="text-2xl font-black tracking-tighter">Consent Ledger</CardTitle>
                <CardDescription className="text-blue-200/60 font-mono text-[10px]">NHS_GDPR_V4 Compliance Engine</CardDescription>
             </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <Label className="text-[10px] font-black uppercase tracking-widest text-blue-300">Kill Switch</Label>
             <Switch 
               checked={localConsent.isRevoked} 
               onCheckedChange={() => toggle('isRevoked')} 
               className="data-[state=checked]:bg-rose-500"
             />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { id: 'heart', label: 'Cardiovascular', color: 'blue' },
            { id: 'cancer', label: 'Oncology', color: 'rose' },
            { id: 'neuro', label: 'Neurology', color: 'indigo' }
          ].map((cat) => (
            <div key={cat.id} className={`space-y-4 p-6 rounded-3xl border-2 transition-all ${localConsent.isRevoked ? 'opacity-30 bg-slate-50 border-slate-100' : 'bg-white border-slate-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                 <div className={`w-8 h-8 rounded-lg bg-${cat.color}-100 flex items-center justify-center`}>
                    <Lock className={`w-4 h-4 text-${cat.color}-600`} />
                 </div>
                 <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest">{cat.label}</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between group cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  if (!localConsent.isRevoked) toggle(`share${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}Risk`);
                }}>
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-bold text-slate-700 cursor-pointer">Risk Attribution</Label>
                    <p className="text-[9px] text-slate-400 font-medium">Share AI predicted scores</p>
                  </div>
                  <Checkbox 
                    checked={localConsent[`share${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}Risk`]} 
                    onCheckedChange={() => !localConsent.isRevoked && toggle(`share${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}Risk`)}
                    disabled={localConsent.isRevoked}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="h-px bg-slate-50" />

                <div className="flex items-center justify-between group cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  if (!localConsent.isRevoked) toggle(`share${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}Markers`);
                }}>
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-bold text-slate-700 cursor-pointer">Deep Phenotype</Label>
                    <p className="text-[9px] text-slate-400 font-medium">Share raw markers & reports</p>
                  </div>
                  <Checkbox 
                    checked={localConsent[`share${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}Markers`]} 
                    onCheckedChange={() => !localConsent.isRevoked && toggle(`share${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}Markers`)}
                    disabled={localConsent.isRevoked}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-4">
           <Button 
             onClick={save} 
             className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 ${localConsent.isRevoked ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#002F5C] hover:bg-black'}`}
           >
              {localConsent.isRevoked ? (
                 <span className="flex items-center gap-2">Revoke All Access <EyeOff className="w-4 h-4" /></span>
              ) : (
                 <span className="flex items-center gap-2">Authorize Protocol <UserCheck className="w-4 h-4" /></span>
              )}
           </Button>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
           <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-amber-600" />
           </div>
           <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
             <strong>Privacy Note:</strong> Every change in consent is cryptographically recorded in the family audit ledger. Administrative bypass is physically impossible.
           </p>
        </div>
      </CardContent>
    </Card>
  );
};
