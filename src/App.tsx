import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FamilyGraph } from './components/FamilyGraph';
import { ConsentManager } from './components/ConsentManager';
import { DataUploader } from './components/DataUploader';
import { RiskHeatmap } from './components/RiskHeatmap';
import { runRiskAssessment, RiskAssessmentResult } from './services/gemini';
import { Toaster } from '@/components/ui/sonner';
import { Shield, Activity, Users, Settings, History, Lock, FileText, AlertTriangle, Plus, ChevronRight, Brain, Droplets, Network } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<RiskAssessmentResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      if (u) setShowLanding(false);
    });
  }, []);

  // Fetch Family details if user is logged in
  useEffect(() => {
    if (!user) return;

    // Fixed query to match security rules and find admin-owned families
    const q = query(collection(db, 'families'), where('adminId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const famDoc = snapshot.docs[0];
        setFamily({ id: famDoc.id, ...famDoc.data() });
      }
    }, (err) => {
      console.error("Family snapshot error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!family) return;

    const unsubMembers = onSnapshot(collection(db, 'families', family.id, 'members'), (snaps) => {
      setMembers(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConsents = onSnapshot(collection(db, 'families', family.id, 'consents'), (snaps) => {
      setConsents(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubData = onSnapshot(collection(db, 'families', family.id, 'healthData'), (snaps) => {
      setHealthData(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubLogs = onSnapshot(collection(db, 'families', family.id, 'auditLog'), (snaps) => {
      setAuditLogs(snaps.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.timestamp - a.timestamp));
    });

    const unsubAss = onSnapshot(collection(db, 'families', family.id, 'assessments'), (snaps) => {
      if (!snaps.empty) {
        setAssessment(snaps.docs[0].data() as RiskAssessmentResult);
      }
    });

    return () => {
      unsubMembers();
      unsubConsents();
      unsubData();
      unsubLogs();
      unsubAss();
    };
  }, [family]);

  const createFamily = async () => {
    if (!user) return;
    const famId = `fam-${user.uid}`;
    const famRef = doc(db, 'families', famId);
    await setDoc(famRef, {
      name: `${user.displayName}'s Family Health Graph`,
      adminId: user.uid,
      createdAt: serverTimestamp()
    });
    
    // Add self as admin member
    const memberRef = doc(db, 'families', famId, 'members', user.uid);
    await setDoc(memberRef, {
      userId: user.uid,
      email: user.email,
      pseudonym: 'Proband (Admin)',
      role: 'admin',
      status: 'active',
      joinedAt: serverTimestamp()
    });

    // Add mock members for inheritance simulation
    const mockMembers = [
      { id: 'm1', pseudonym: 'Ancestor Gen-1 (Paternal)', role: 'member' },
      { id: 'm2', pseudonym: 'Ancestor Gen-1 (Maternal)', role: 'member' }
    ];
    for (const m of mockMembers) {
      await setDoc(doc(db, 'families', famId, 'members', m.id), {
        userId: m.id,
        email: 'mock@example.com',
        pseudonym: m.pseudonym,
        role: m.role,
        status: 'active',
        joinedAt: serverTimestamp()
      });
    }

    toast.success("Family setup completed");
  };

  const handleAssessment = async () => {
    if (!family) return;
    setCalculating(true);
    try {
      const result = await runRiskAssessment(members, healthData);
      const assRef = doc(db, 'families', family.id, 'assessments', 'current');
      await setDoc(assRef, {
        ...result,
        createdAt: serverTimestamp()
      });
      toast.success("Deep clinical modeling complete");
    } catch (error) {
      console.error(error);
      toast.error("Failed to run risk assessment");
    } finally {
      setCalculating(false);
    }
  };

  if (loadingAuth) return <div className="flex items-center justify-center h-screen bg-slate-50 font-sans">Verifying Genetic Vault...</div>;

  // LANDING PAGE
  if (showLanding && !user) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] font-sans selection:bg-blue-100 selection:text-blue-900">
        <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-2 font-bold text-2xl text-[#002F5C]">
            <Shield className="w-8 h-8 text-[#005EB8]" />
            GIM
          </div>
          <Button onClick={loginWithGoogle} className="bg-[#005EB8] hover:bg-[#002F5C] text-white px-8 rounded-full h-12 shadow-lg shadow-blue-200/50">
            Secure Entry
          </Button>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-[#005EB8] text-xs font-bold uppercase tracking-widest">
              <Activity className="w-4 h-4" /> NHS-Aligned Genetic Intelligence
            </div>
            <h1 className="text-6xl lg:text-8xl font-black text-[#002F5C] leading-[0.9] tracking-tighter">
              Mediate Your <span className="text-[#005EB8]">Inheritance.</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
              GIM is the world's first privacy-first family health mediator. Model 5 generations of genetic patterns, estimate IQ, and navigate NHS pathways with zero raw data exposure.
            </p>
            <div className="flex gap-4">
              <Button onClick={loginWithGoogle} className="bg-[#002F5C] text-white px-10 h-16 rounded-2xl text-lg hover:scale-105 transition-transform">
                Get Started <ChevronRight className="ml-2" />
              </Button>
              <div className="hidden sm:flex items-center gap-4 px-6 border border-slate-200 rounded-2xl">
                 <Lock className="text-slate-400" />
                 <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">AES-256 Secured</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[4rem] rotate-3 shadow-2xl overflow-hidden flex items-center justify-center p-12">
               <div className="grid grid-cols-3 gap-4 w-full">
                  {[...Array(9)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                      className="aspect-square bg-white/20 rounded-2xl backdrop-blur-sm"
                    />
                  ))}
               </div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
                  <Activity className="w-32 h-32 text-white opacity-20" />
               </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-8 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-2xl shadow-xl shadow-slate-200/50 border border-border"
        >
          <Shield className="w-16 h-16 text-[#005EB8] mx-auto opacity-20" />
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-[#111827]">Welcome, {user.displayName?.split(' ')[0]}</h2>
            <p className="text-[#6B7280] text-sm leading-relaxed">
              Initialize your private Family Health Graph to start modeling inheritance patterns securely over 5 generations.
            </p>
          </div>
          <Button onClick={createFamily} className="w-full h-14 text-lg rounded-xl bg-[#005EB8] hover:bg-[#004a91] transition-all flex items-center justify-center gap-3">
            <Plus className="w-5 h-5" /> Let's Initialize GIM
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground grid grid-cols-1 lg:grid-cols-[240px_1fr] grid-rows-[64px_1fr]">
      <Toaster position="top-right" />
      
      <aside className="lg:row-start-1 lg:row-end-3 bg-[#002F5C] text-white p-6 flex flex-col gap-8 hidden lg:flex">
        <div className="flex items-center gap-3 font-bold text-xl">
          <Shield className="w-6 h-6 text-blue-400" />
          GIM Core
        </div>
        
        <nav className="flex flex-col gap-1">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 text-white text-sm font-medium cursor-pointer">
            <Activity className="w-5 h-5" /> Overview
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-white/70 hover:bg-white/5 text-sm font-medium cursor-pointer">
            <Users className="w-5 h-5" /> Family Health Graph
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-white/70 hover:bg-white/5 text-sm font-medium cursor-pointer">
            <Lock className="w-5 h-5" /> Consent Center
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-white/70 hover:bg-white/5 text-sm font-medium cursor-pointer">
            <Network className="w-5 h-5" /> Ancestry Explorer
          </div>
        </nav>

        <div className="mt-auto space-y-4">
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-white/50 hover:text-red-400 hover:bg-white/5 px-3 border-none">
             Sign Out
          </Button>
        </div>
      </aside>

      <nav className="bg-white border-b border-border px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg">Family Administrator Dashboard</h1>
          <span className="bg-[#DCFCE7] text-[#166534] text-[11px] px-3 py-1 rounded-full font-semibold uppercase tracking-wide">
            AES-256 Encrypted
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
             <p className="text-sm font-semibold leading-none">{user.displayName}</p>
             <p className="text-[11px] text-muted-foreground mt-1">Health Admin</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-border overflow-hidden">
             {user.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" alt="" /> : <div className="w-full h-full bg-slate-200" />}
          </div>
        </div>
      </nav>

      <main className="main-content grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 p-6 overflow-y-auto">
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Inheritance Modeling
            </h2>
            <Button onClick={handleAssessment} disabled={calculating} className="bg-[#005EB8] hover:bg-[#004a91] text-white">
              {calculating ? "Modeling Risk..." : "Launch Generational Assessment"}
            </Button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={assessment ? 'active' : 'empty'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 gap-6"
            >
              {assessment && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                       <RiskHeatmap data={assessment.heatmap} />
                    </div>
                    <div className="space-y-6">
                       <Card className="bg-[#002F5C] text-white border-none shadow-xl">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-xs uppercase tracking-widest text-blue-300">Predicted Traits</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                             {assessment.heatmap.slice(0, 1).map((m, i) => (
                               <div key={i} className="space-y-4">
                                  <div className="flex items-center gap-4">
                                     <Brain className="w-8 h-8 text-blue-400" />
                                     <div>
                                        <p className="text-[10px] text-blue-200 uppercase">Estimated IQ range</p>
                                        <p className="text-xl font-bold font-mono">{m.predictedTraits?.estimatedIQ || "Insufficient Data"}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <Droplets className="w-8 h-8 text-red-400" />
                                     <div>
                                        <p className="text-[10px] text-blue-200 uppercase">Likely Blood Group</p>
                                        <p className="text-xl font-bold font-mono">{m.predictedTraits?.bloodGroup || "Pending markers"}</p>
                                     </div>
                                  </div>
                               </div>
                             ))}
                          </CardContent>
                       </Card>

                       <Card className="shadow-sm">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Family Connectivity</CardTitle>
                          </CardHeader>
                          <CardContent>
                             <FamilyGraph members={members} consents={consents} />
                          </CardContent>
                       </Card>
                    </div>
                 </div>
              )}
            </motion.div>
          </AnimatePresence>

          <Tabs defaultValue="ancestry" className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg">
              <TabsTrigger value="ancestry">Generational Reconstruct</TabsTrigger>
              <TabsTrigger value="reports">Clinical Analysis</TabsTrigger>
              <TabsTrigger value="audit">Integrity Proof</TabsTrigger>
              <TabsTrigger value="settings">Consent Center</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ancestry" className="pt-4">
               {assessment?.ancestryGraph?.length ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {assessment.ancestryGraph.map((anc, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="p-4 bg-white border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 p-2 opacity-10"><Activity className="w-8 h-8" /></div>
                         <h3 className="text-xs font-bold text-[#005EB8] uppercase tracking-tighter">{anc.generation}</h3>
                         <p className="font-semibold text-sm mt-1">{anc.relation}</p>
                         <div className="mt-4 space-y-2">
                            <p className="text-[10px] text-muted-foreground uppercase leading-none">Inferred Traits</p>
                            <p className="text-xs text-slate-700 leading-tight">{anc.inferredTraits}</p>
                            <div className="pt-2 border-t mt-2">
                               <p className="text-[10px] text-muted-foreground uppercase leading-none">Health Likelihood</p>
                               <p className="text-xs font-medium text-slate-900">{anc.healthLikelihood}</p>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </div>
               ) : (
                <div className="h-40 flex items-center justify-center border-2 border-dashed rounded-xl grayscale opacity-30">
                  <p>Run Generational Assessment to reconstruct 5-gen ancestry.</p>
                </div>
               )}
            </TabsContent>

            <TabsContent value="reports" className="pt-4">
               {assessment && (
                 <Card className="border-none bg-white shadow-sm overflow-hidden">
                   <div className="bg-slate-50 border-b p-4">
                     <h3 className="font-semibold text-sm">Gemini Health Forecast</h3>
                   </div>
                   <CardContent className="p-6 prose prose-slate max-w-none text-sm font-sans">
                     <ReactMarkdown>{assessment.familySummary}</ReactMarkdown>
                   </CardContent>
                 </Card>
               )}
            </TabsContent>
            
            <TabsContent value="audit" className="pt-4">
               <Card>
                 <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Immutable Logs</CardTitle></CardHeader>
                 <CardContent>
                   <div className="space-y-2 font-mono text-[11px] text-muted-foreground">
                     {auditLogs.map(log => (
                       <div key={log.id} className="border-b border-slate-50 pb-2">
                         <span className="text-blue-600 font-bold">[{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'PENDING'}]</span> {log.action}: {log.details}
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="pt-4">
               <ConsentManager familyId={family.id} memberId={user.uid} consent={consents.find(c => c.id === user.uid)} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <Card className="border border-border shadow-sm border-t-4 border-t-[#005EB8]">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[#005EB8]">NHS Referral Pathways</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessment?.referrals?.map((ref, i) => (
                <div key={i} className={`p-4 rounded-lg border-l-4 ${
                  ref.priority === 'High' ? 'bg-red-50 border-l-[#EF4444]' : 'bg-slate-50 border-l-slate-400'
                }`}>
                   <div className="font-bold text-[13px] text-foreground flex justify-between">
                     {ref.pseudonym}
                     <span className={`text-[9px] uppercase px-1 rounded ${
                       ref.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'
                     }`}>{ref.priority}</span>
                   </div>
                   <p className="text-[12px] mt-2 text-foreground/80 leading-relaxed">
                     {ref.nhsPathway}
                   </p>
                </div>
              ))}
              {!assessment?.referrals?.length && (
                <div className="text-center py-10 grayscale opacity-30">
                  <Activity className="w-10 h-10 mx-auto" />
                  <p className="text-xs mt-2">No active pathways found</p>
                </div>
              )}
              <Button className="w-full bg-[#005EB8] hover:bg-[#004a91] text-white text-xs py-5">
                Generate Referral Bundle
              </Button>
            </CardContent>
          </Card>

          <DataUploader familyId={family.id} memberId={user.uid} />
        </aside>

      </main>
    </div>
  );
}
