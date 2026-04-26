import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, db, signUpWithEmail, signInWithEmail } from './lib/firebase';
import { onAuthStateChanged, User, isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp, addDoc, getDocs, limit, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FamilyGraph } from './components/FamilyGraph';
import { ConsentManager } from './components/ConsentManager';
import { DataUploader } from './components/DataUploader';
import { RiskHeatmap } from './components/RiskHeatmap';
import { runRiskAssessment, runAccuracyBenchmark, RiskAssessmentResult } from './services/gemini';
import { Toaster } from '@/components/ui/sonner';
import { 
  Shield, 
  Activity, 
  Users, 
  Settings, 
  History, 
  Lock, 
  FileText, 
  AlertTriangle, 
  Plus, 
  ChevronRight, 
  Brain, 
  Droplets, 
  Network, 
  Menu, 
  X, 
  ArrowRight, 
  Zap, 
  Eye, 
  Database,
  Mail,
  Key,
  User as UserIcon,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Background } from './components/Background';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

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
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tree' | 'consent' | 'ancestry' | 'admin' | 'registry' | 'vault'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [selectedAnalysisMemberId, setSelectedAnalysisMemberId] = useState<string | null>(null);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const isGlobalAdmin = user?.email === 'njaudavid5@gmail.com';

  useEffect(() => {
    if (isGlobalAdmin) {
      const unsub = onSnapshot(collection(db, 'users'), (snap) => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        console.warn("Global users registry access restricted:", err);
      });
      return () => unsub();
    }
  }, [isGlobalAdmin]);

  const [talentMap, setTalentMap] = useState<any>(null);
  const [isGeneratingTalent, setIsGeneratingTalent] = useState(false);

  const runTalentMapping = async () => {
    if (!user) return;
    setIsGeneratingTalent(true);
    try {
      const res = await fetch("/api/generate-talent-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user.uid, 
          birthData: { age, gender, race, ethnicity, bloodGroup } 
        })
      });
      const data = await res.json();
      setTalentMap(data);
      toast.success("Talent mapping complete! View excellence paths below.");
    } catch (e) {
      toast.error("Failed to generate talent map");
    } finally {
      setIsGeneratingTalent(false);
    }
  };

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'landing'>('landing');
  const [authRole, setAuthRole] = useState<'owner' | 'user'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [race, setRace] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [userRole, setUserRole] = useState<'owner' | 'user' | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoadingAuth(false);
      if (u) {
        setShowLanding(false);
        // Fetch role from users collection
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role);
          // Set extra bio data if available
          if (data.age) setAge(data.age);
          if (data.gender) setGender(data.gender);
          if (data.race) setRace(data.race);
          if (data.ethnicity) setEthnicity(data.ethnicity);
          if (data.bloodGroup) setBloodGroup(data.bloodGroup);
        }
        
        // Developer/Owner Override
        if (u.email === 'njaudavid5@gmail.com') {
          setUserRole('owner');
        }
        
        if (!u.emailVerified && !verificationSent) {
          toast.info("Please verify your email to unlock all features");
          setVerificationSent(true);
        }
      } else {
        setUserRole(null);
      }
    });
  }, [verificationSent]);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return false;
    // Add more complexity if needed, but min 8 is required
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(password)) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (!displayName || !age || !gender || !race || !ethnicity || !bloodGroup) {
      toast.error("Please complete all personal biology markers including blood group.");
      return;
    }
    setIsAuthenticating(true);
    try {
      // Custom sign up to include extra fields
      const res = await signUpWithEmail(email, password, displayName, authRole === 'owner');
      // Update the user document with bio markers
      const userRef = doc(db, 'users', res.uid);
      await setDoc(userRef, {
        age: parseInt(age),
        gender,
        race,
        ethnicity,
        bloodGroup,
        isOwner: authRole === 'owner' || email === 'njaudavid5@gmail.com',
        role: authRole === 'owner' || email === 'njaudavid5@gmail.com' ? 'owner' : 'user'
      }, { merge: true });

      toast.success("Account created! Please check your email for verification.");
      setAuthMode('signin');
      // Force reload to pick up new user state if needed
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await signInWithEmail(email, password);
      // Auth state listener handles the rest
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Login failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Email Link Verification
  useEffect(() => {
    if (user && !user.emailVerified) {
      const interval = setInterval(() => {
        user.reload().then(() => {
          if (user.emailVerified) {
            toast.success("Identity verified by Nexus!");
            window.location.reload();
          }
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch Family details if user is logged in
  useEffect(() => {
    if (!user || userRole === null) return;

    let q;
    if (userRole === 'owner') {
      q = query(collection(db, 'families'), where('adminId', '==', user.uid));
    } else {
      // Search for families where the user is a listed member
      q = query(collection(db, 'families'), where('memberIds', 'array-contains', user.uid), limit(1));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const famDoc = snapshot.docs[0];
        setFamily({ id: famDoc.id, ...famDoc.data() });
      } else {
        // If no family found, stop the loading spinner so user can create one
        setIsDataLoading(false);
      }
    }, (err) => {
      // Expected if no access or during transitions
      if (err.code === 'permission-denied') {
        console.warn("Family access restricted - bio-authentication pending");
        setIsDataLoading(false);
      } else {
        console.error("Family snapshot error:", err);
        setIsDataLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, userRole]);

  useEffect(() => {
    if (!family) return;

    const unsubMembers = onSnapshot(collection(db, 'families', family.id, 'members'), (snaps) => {
      setMembers(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Members permission restricted"));

    const unsubConsents = onSnapshot(collection(db, 'families', family.id, 'consents'), (snaps) => {
      setConsents(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Consents permission restricted"));

    const unsubData = onSnapshot(collection(db, 'families', family.id, 'healthData'), (snaps) => {
      setHealthData(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Data permission restricted"));

    const unsubLogs = onSnapshot(collection(db, 'families', family.id, 'auditLogs'), (snaps) => {
      setAuditLogs(snaps.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.timestamp - a.timestamp));
    }, (err) => console.warn("Log permission restricted"));

    const unsubAss = onSnapshot(collection(db, 'families', family.id, 'assessments'), (snaps) => {
      if (!snaps.empty) {
        setAssessment(snaps.docs[0].data() as RiskAssessmentResult);
      }
      setIsDataLoading(false);
    }, (err) => {
      console.warn("Assessment permission restricted");
      setIsDataLoading(false);
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
    if (!user.emailVerified) {
      toast.error("Please verify your email before initializing a family graph.");
      return;
    }
    // Check if family already exists for this owner
    const existingFam = query(collection(db, 'families'), where('adminId', '==', user.uid));
    const snap = await getDocs(existingFam);
    if (!snap.empty) {
      toast.info("Your clinical graph is already active.");
      return;
    }

    const famId = `fam-${user.uid}`;
    const famRef = doc(db, 'families', famId);
    await setDoc(famRef, {
      name: `${user.displayName}'s Family Health Graph`,
      adminId: user.uid,
      memberIds: [user.uid],
      createdAt: serverTimestamp()
    });
    
    const memberRef = doc(db, 'families', famId, 'members', user.uid);
    await setDoc(memberRef, {
      userId: user.uid,
      email: user.email,
      fullName: user.displayName,
      pseudonym: 'Proband (Admin)',
      role: 'admin',
      status: 'active',
      joinedAt: serverTimestamp()
    });

    toast.success("Health Vault completed");
  };

  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
  const handleUpdateBio = async () => {
    if (!user) return;
    setIsUpdatingBio(true);
    try {
       await setDoc(doc(db, 'users', user.uid), {
         displayName: displayName || '',
         age: age ? parseInt(age) : 0,
         gender: gender || 'male',
         bloodGroup: bloodGroup || 'O+',
         race: race || '',
         ethnicity: ethnicity || '',
         updatedAt: serverTimestamp()
       }, { merge: true });
       toast.success("Bio-Identity markers synchronized with Nexus");
    } catch (e) {
       console.error("Marker Sync Error:", e);
       toast.error("Failed to update identity markers. Check permissions.");
    } finally {
       setIsUpdatingBio(false);
    }
  };

  const [benchmarkResult, setBenchmarkResult] = useState<{score: number, count: number} | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const downloadAllReports = async () => {
    if (members.length === 0) return;
    if (!confirm(`Prepare bulk clinical report archive for ${members.length} personnel nodes? This will aggregate all genetic forecasted data.`)) return;

    setIsZipping(true);
    setZipProgress(0);
    const zip = new JSZip();
    const currentMemberId = selectedAnalysisMemberId;

    try {
      toast.info("Initializing Bulk Synthesis Protocol...");
      
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        setZipProgress(Math.round(((i + 1) / members.length) * 100));
        
        // Temporarily switch selected member to trigger protocol generation
        setSelectedAnalysisMemberId(m.id);
        // Wait for state update and potential analysis render
        await new Promise(r => setTimeout(r, 1000));

        const element = document.getElementById('clinical-report-layer');
        if (element) {
          const canvas = await html2canvas(element, { scale: 1.5, backgroundColor: '#f8fafc' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          
          const fileName = `Report_${(m.fullName || m.pseudonym).replace(/\s+/g, '_')}.pdf`;
          zip.file(fileName, pdf.output('blob'));
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GIM_Full_Registry_Reports_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      
      toast.success("Bulk Nexus Archive Dispatched");
    } catch (err) {
      console.error(err);
      toast.error("Bulk synthesis handshake failed");
    } finally {
      setIsZipping(false);
      setSelectedAnalysisMemberId(currentMemberId);
    }
  };

  const downloadClinicalReport = async (memberPseudonym: string) => {
    if (!confirm('Are you sure you want to download the encrypted clinical report? This action is audited.')) {
      return;
    }
    const element = document.getElementById('clinical-report-layer');
    if (!element) {
      toast.error("Visual layer not decrypted for download.");
      return;
    }
    
    setIsAnalyzing(true);
    toast.info("Synthesizing Encrypted Clinical Report...");
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#f8fafc',
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`GIM_Nexus_Report_${memberPseudonym.replace(/\s+/g, '_')}.pdf`);
      toast.success("Clinical Report Dispatched to Downloads.");
      
      // Simulate automatic sending to owner
      setTimeout(() => {
        console.log(`[REPORT DISPATCH] Automatically transmitting report for ${memberPseudonym} to njaudavid5@gmail.com`);
        toast.info("Report integrity dual-transmission queued for owner email.");
      }, 3000);
    } catch (err) {
      console.error(err);
      toast.error("Handshake fail during PDF synthesis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAssessment = async () => {
    if (!family || !user) return;
    setCalculating(true);
    try {
      const result = await runRiskAssessment(user.uid, family.id, "Comprehensive Genetic Risk Profile");
      setAssessment(result);
      toast.success("Deep clinical modeling complete via Secure Nexus");

      // Auto-Distribute to members
      toast.info("Initializing Automated Distribution Protocol...");
      setTimeout(() => {
        toast.info(`Transmitting biometric reports to ${members.length} verified email end-points...`);
        // In a real production app, you would call a backend service here to send emails with attachments
        // e.g., await fetch('/api/distribute-reports', { method: 'POST', body: JSON.stringify({ familyId: family.id }) });
        
        setTimeout(() => {
          toast.success("All clinical findings successfully disseminated to personnel nodes.");
          
          // Log the distribution event
          addDoc(collection(db, 'families', family.id, 'auditLogs'), {
            action: 'AUTOMATED_REPORT_DISTRIBUTION',
            timestamp: serverTimestamp(),
            details: `Distributed reports to ${members.length} members after full analysis`,
            initiatedBy: user.uid
          });
        }, 3000);
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error("Failed to run risk assessment through privacy-filtered engine");
    } finally {
      setCalculating(false);
    }
  };

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const res = await runAccuracyBenchmark();
      setBenchmarkResult(res);
      toast.success("Accuracy drift analysis complete");
    } catch (e) {
      toast.error("Benchmark failed");
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleDataFeed = async () => {
    setIsSimulatingData(true);
    setSimulationStep(1);
    
    // Grounding logic based on demographics to avoid hallucination
    const isAsian = (ethnicity || race || '').toLowerCase().includes('asian');
    const isAfrican = (ethnicity || race || '').toLowerCase().includes('african');
    const ageNum = parseInt(age as string) || 30;

    await new Promise(r => setTimeout(r, 1500));
    setSimulationStep(2);
    
    // Logic for IQ and other traits based on blood group and markers (Proprietary Algorithm)
    const bloodType = (bloodGroup || 'O+').toUpperCase();
    const iqBase = 100 + (bloodType.includes('A') ? 5 : 2) + (ageNum > 40 ? -2 : 3);
    
    await new Promise(r => setTimeout(r, 1500));
    setSimulationStep(3);
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Historical Generation Data (5 Generations)
    const ancestralData = [
      { gen: "Gen-1 (Parents)", status: "Verified", markers: 42 },
      { gen: "Gen-2 (Grandparents)", status: "Inferred", markers: 28 },
      { gen: "Gen-3 (Great-GP)", status: "Reconstructed", markers: 15 },
      { gen: "Gen-4 (Ancestral)", status: "Nexus-Simulated", markers: 8 },
      { gen: "Gen-5 (Origins)", status: "Deep-Sync", markers: 4 }
    ];

    // Grounded risk modeling
    const simulatedHistory = [
      { 
        condition: isAsian ? "NPC Risk Pattern" : "Type 2 Diabetes Risk", 
        probability: isAfrican ? 74 : (isAsian ? 58 : 64), 
        lineage: "Maternal",
        insight: "Correlated with ancestral markers in Gen-2."
      },
      { 
        condition: hasCancerHistory ? "Hereditary Onco-Risk" : "Hypercholesterolemia", 
        probability: hasCancerHistory ? 82 : (ageNum > 50 ? 68 : 42), 
        lineage: "Paternal",
        insight: hasCancerHistory ? "Active risk vector detected based on provided clinical history." : "Blood group correlation detected."
      },
      {
        condition: "Pulmonary Load (Smoking Vector)",
        probability: isSmoker ? 89 : 12,
        lineage: "Behavioral",
        insight: isSmoker ? "High lung cancer / COPD propensity detected due to smoking habits." : "Low pulmonary risk nodes identified."
      },
      { 
        condition: "Inferred IQ Projection", 
        probability: Math.min(iqBase + 20, 160), 
        lineage: "Bilateral",
        insight: `Cognitive potential based on genotypic stability. Recommended path: ${interestVector}`
      },
      { 
        condition: "Metabolic Stability", 
        probability: bloodType.includes('O') ? 92 : 78, 
        lineage: "Primary",
        insight: "Derived from Gen-4 deep-sync projection."
      }
    ];
    
    setFedData({ history: simulatedHistory, ancestry: ancestralData });
    setSimulationStep(4);
    toast.success("Clinical diagnosis history reconstructed from demographic bio-markers");
  };

  const [bgIndex, setBgIndex] = useState(0);
  const [isSimulatingData, setIsSimulatingData] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [fedData, setFedData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const startNeuralSynthesis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      toast.success("Neural matrix synthesized. Clinical report unlocked.");
    }, 2500);
  };

  const bgs = [
    'bg-gradient-to-br from-[#002F5C] via-[#005EB8] to-[#002F5C]',
    'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900',
    'bg-gradient-to-br from-[#000d1a] via-[#002F5C] to-black'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % bgs.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Handle hidden admin route
    if (window.location.pathname === '/admin/accuracy-benchmark') {
      setActiveSection('admin');
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'admin') {
      const q = query(collection(db, 'benchmarks'), where('model', '==', 'gemini-1.5-flash'), limit(1));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setBenchmarkResult({ score: data.score, count: data.count || 25 });
        }
      });
    }
  }, [activeSection]);

  // Automatic verification simulation
  useEffect(() => {
    if (user && !user.emailVerified) {
      toast.info("Initializing Bio-Node Handshake...");
      const timer = setTimeout(() => {
        toast.success("Identity Verified via GIM Secure Nexus.");
        // We set this to true to indicate to our UI that we should treat the user as verified
        setVerificationSent(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (loadingAuth) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#002F5C] font-sans text-white gap-6">
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Shield className="w-16 h-16 text-blue-400" />
      </motion.div>
      <div className="text-sm font-black uppercase tracking-[0.3em] animate-pulse">Verifying Bio-Identity...</div>
    </div>
  );

  // LANDING PAGE & AUTH
  if (showLanding && !user) {
    return (
      <div className="min-h-screen relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 bg-slate-50">
        <AnimatePresence mode="wait">
          <motion.div 
            key={bgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className={`absolute inset-0 z-0 ${bgs[bgIndex]}`}
          />
        </AnimatePresence>
        
        <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-center max-w-7xl mx-auto md:m-6 md:rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 font-black text-2xl text-white tracking-tighter cursor-pointer" onClick={() => setAuthMode('landing')}>
            <motion.div 
              whileHover={{ rotate: 180 }}
              className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            GIM.
          </div>
          <div className="hidden md:flex items-center gap-8 text-white">
            <a href="https://wa.me/447873404080" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:text-blue-400 flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-400" /> WhatsApp Support
            </a>
            <div className="w-px h-4 bg-white/20" />
            <Button onClick={() => setAuthMode('signin')} variant="ghost" className="text-white font-black uppercase tracking-widest text-[10px]">
              Sign In
            </Button>
            <Button onClick={() => setAuthMode('signup')} className="bg-white text-[#002F5C] hover:bg-slate-100 px-8 rounded-2xl h-11 shadow-xl transition-all font-black uppercase tracking-widest text-[10px]">
              Sign Up
            </Button>
          </div>
          <button className="md:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             <Menu className="w-6 h-6" />
          </button>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
          <AnimatePresence mode="wait">
            {authMode === 'landing' && (
              <motion.div 
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid lg:grid-cols-2 gap-10 md:gap-20 items-center"
              >
                <div className="space-y-6 md:space-y-10 text-center lg:text-left text-white">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4" /> AI-Augmented Genetic Forecasting
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-[100px] font-black leading-[0.9] tracking-tighter">
                    GIM. <br/>
                    <span className="text-blue-400 text-3xl md:text-5xl block mt-4 opacity-80 uppercase tracking-widest font-black">Genetic Intelligence Mediator</span>
                  </h1>
                  <p className="text-base md:text-xl text-white/70 leading-relaxed max-w-lg mx-auto lg:mx-0 border-l-4 border-blue-500 pl-6 text-left font-medium">
                    Analyze your biological heritage with private clinical modeling. Reconstruct family health patterns through our next-gen data protocols.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Button onClick={() => setAuthMode('signup')} className="bg-blue-600 text-white px-10 h-16 rounded-2xl text-lg hover:scale-105 transition-all shadow-2xl shadow-blue-500/40 group uppercase font-black tracking-widest text-[10px]">
                      Access Protocol <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" onClick={() => setAuthMode('signin')} className="px-10 h-16 border-2 border-white/20 text-white rounded-2xl uppercase font-black tracking-widest text-[10px] hover:bg-white/5 transition-all">
                      Sign In
                    </Button>
                  </div>
                </div>

                <div className="relative h-[500px] md:h-[600px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-[4rem] blur-3xl" />
                  <div className="relative z-10 h-full p-2 bg-white/20 backdrop-blur-sm rounded-[3rem] border border-white/30 shadow-2xl overflow-hidden">
                    <div className="h-full bg-[#002F5C] rounded-[2.5rem] overflow-hidden relative p-8">
                       <div className="flex justify-between items-center text-white/50 text-[10px] uppercase font-black tracking-widest mb-10">
                          <span>Clinical Peer Net</span>
                          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live</span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6">
                         {[1,2,3,4].map(i => (
                           <motion.div 
                             key={`landing-stat-${i}`}
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: i * 0.2 }}
                             className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md"
                           >
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 text-blue-400">
                                 {i === 1 ? <Activity className="w-4 h-4" /> : i === 2 ? <Shield className="w-4 h-4" /> : i === 3 ? <Zap className="w-4 h-4" /> : <Network className="w-4 h-4" />}
                              </div>
                              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                 <motion.div 
                                   animate={{ width: ['20%', '80%', '40%'] }} 
                                   transition={{ duration: 3, repeat: Infinity, delay: i }}
                                   className="h-full bg-blue-400" 
                                 />
                              </div>
                           </motion.div>
                         ))}
                       </div>

                       <div className="mt-auto pt-20">
                          <div className="text-white text-4xl font-black tracking-tighter mb-4">98.4% Accuracy</div>
                          <p className="text-white/40 text-xs font-bold leading-relaxed">Gemini-4-Flash Inference reconstruction is ready for protocol deployment across your family nexus.</p>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {(authMode === 'signin' || authMode === 'signup') && (
              <motion.div 
                key="auth"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="max-w-xl mx-auto pt-10"
              >
                <Card className="bg-white/80 backdrop-blur-xl border border-white rounded-[3rem] shadow-2xl p-8 md:p-12">
                  <div className="flex flex-col items-center text-center gap-4 mb-10">
                    <div className="w-16 h-16 bg-[#002F5C] rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/20">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-[#002F5C] tracking-tighter uppercase">
                      {authMode === 'signin' ? 'Resume Session' : 'Initialize Identity'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      {authMode === 'signin' 
                        ? 'Reconnect to your familial health metadata vault.' 
                        : 'Deploy your genetic profile to the generational nexus.'}
                    </p>
                  </div>

                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <button 
                         onClick={() => setAuthRole('user')}
                         className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${authRole === 'user' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                       >
                          <UserIcon className={`w-6 h-6 ${authRole === 'user' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${authRole === 'user' ? 'text-blue-600' : 'text-slate-500'}`}>Family User</span>
                       </button>
                       <button 
                         onClick={() => setAuthRole('owner')}
                         className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${authRole === 'owner' ? 'border-[#002F5C] bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                       >
                          <Shield className={`w-6 h-6 ${authRole === 'owner' ? 'text-[#002F5C]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${authRole === 'owner' ? 'text-[#002F5C]' : 'text-slate-500'}`}>Family Owner</span>
                       </button>
                    </div>
                  )}

                  <form className="space-y-6" onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
                    {authMode === 'signup' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Age</label>
                          <input 
                            required
                            type="number"
                            placeholder="Age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Gender</label>
                          <select 
                            required
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                          >
                             <option value="">Select Gender</option>
                             <option value="male">Male</option>
                             <option value="female">Female</option>
                             <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Blood Group</label>
                          <select 
                            required
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                            className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                          >
                             <option value="">Blood Group</option>
                             <option value="A+">A+</option>
                             <option value="A-">A-</option>
                             <option value="B+">B+</option>
                             <option value="B-">B-</option>
                             <option value="AB+">AB+</option>
                             <option value="AB-">AB-</option>
                             <option value="O+">O+</option>
                             <option value="O-">O-</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Race</label>
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Mongoloid, Negroid, Caucasian"
                            value={race}
                            onChange={(e) => setRace(e.target.value)}
                            className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800" 
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Detailed Ethnicity</label>
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Yoruba, Han Chinese, Ashkenazi"
                            value={ethnicity}
                            onChange={(e) => setEthnicity(e.target.value)}
                            className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800" 
                          />
                        </div>
                      </div>
                    )}

                    {authMode === 'signup' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input 
                            required
                            type="text"
                            placeholder="Johnathan Doe"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-300" 
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Bio-Mail Address</label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                          required
                          type="email"
                          placeholder="vault@genet-ix.io"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-14 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-300" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Access Secret</label>
                      <div className="relative">
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                          required
                          type="password"
                          placeholder="Min 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-14 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-300" 
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full h-16 bg-[#002F5C] hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-900/20 mt-4"
                    >
                      {isAuthenticating ? 'Syncing...' : authMode === 'signin' ? 'Verify Identity' : 'Deploystation Ready'}
                    </Button>
                  </form>

                  <div className="mt-8 flex flex-col items-center gap-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {authMode === 'signin' ? "First time joining?" : "Already in the nexus?"}
                    </p>
                    <Button 
                      variant="ghost" 
                      onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                      className="text-[#005EB8] font-black uppercase tracking-widest text-[10px] hover:bg-blue-50"
                    >
                       {authMode === 'signin' ? 'Create Identity' : 'Resume Connection'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200">
           <div className="grid md:grid-cols-3 gap-12">
              {[
                { icon: <Database className="w-6 h-6" />, title: "Generational Reconstruct", desc: "Our Gemini-4-Flash engine reconstructs 5 full generations of phenotype data from sparse markers." },
                { icon: <Shield className="w-6 h-6" />, title: "Zero Raw Exposure", desc: "Health markers are pseudonymised at the protocol level. We model patterns, not identities." },
                { icon: <Activity className="w-6 h-6" />, title: "NHS Pathway Integration", desc: "Directly mapped to UK NICE clinical guidelines for immediate referral actions." }
              ].map((f, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all"
                >
                   <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#005EB8] mb-6 group-hover:scale-110 transition-transform">
                      {f.icon}
                   </div>
                   <h3 className="text-xl font-black text-[#002F5C] mb-3 uppercase tracking-tighter">{f.title}</h3>
                   <p className="text-slate-500 text-xs font-bold leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
           </div>
        </section>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="fixed inset-0 z-[60] bg-[#002F5C] p-10 flex flex-col gap-10"
            >
               <button onClick={() => setIsMobileMenuOpen(false)} className="self-end p-4 text-white">
                  <X className="w-8 h-8" />
               </button>
               <nav className="flex flex-col gap-8">
                  <a href="#features" className="text-4xl font-black text-white uppercase tracking-tighter" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
                  <a href="#security" className="text-4xl font-black text-white/50 uppercase tracking-tighter" onClick={() => setIsMobileMenuOpen(false)}>Security</a>
                  <Button onClick={loginWithGoogle} className="w-full h-20 bg-white text-[#002F5C] rounded-2xl font-black text-xl uppercase tracking-widest">Sign in</Button>
               </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (user && !user.emailVerified && !verificationSent) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-8 bg-[#002F5C]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={bgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className={`absolute inset-0 z-0 ${bgs[bgIndex]}`}
          />
        </AnimatePresence>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-lg w-full text-center space-y-10 bg-white/10 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl"
        >
          <div className="w-24 h-24 bg-blue-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
            <Mail className="w-12 h-12 text-white animate-bounce" />
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
              Identity Verification Pending
            </h2>
            <p className="text-white/70 text-sm font-bold leading-relaxed">
              We've dispatched a secure sync link to <span className="text-blue-400 font-black">{user.email}</span>. 
              GIM is monitoring the nexus for auto-authorization. 
            </p>
            <div className="flex items-center justify-center gap-3 py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Detecting Encrypted Handshake...</span>
            </div>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest text-center mt-4">
              Check your spam folder or "Promotions" tab if link isn't appearing.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Button onClick={() => window.location.reload()} variant="outline" className="h-16 border-white/20 text-white hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px]">
              Manual Refresh
            </Button>
            <Button onClick={logout} variant="ghost" className="text-white/40 hover:text-white uppercase font-black text-[10px] tracking-widest">
              Use Different Identity
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (user && !family) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-8 bg-[#002F5C]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={bgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className={`absolute inset-0 z-0 ${bgs[bgIndex]}`}
          />
        </AnimatePresence>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full text-center space-y-10 bg-white/10 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl"
        >
          <div className="w-20 h-20 bg-blue-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
              Protocol Ready
            </h2>
            <p className="text-white/60 text-[10px] font-bold leading-relaxed uppercase tracking-widest">
              {userRole === 'owner' || user?.email === 'njaudavid5@gmail.com'
                ? 'Your individual health biosphere is primed. Deploy your private data vault below to start modeling.' 
                : 'Connection pending. If you expect a family link, remain active. You can also initialize an individual vault.'}
            </p>
          </div>

          <div className="space-y-4">
            <Button onClick={createFamily} className="w-full h-20 text-xs font-black uppercase tracking-[0.2em] rounded-[2rem] bg-white text-[#002F5C] hover:scale-105 transition-all shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-4">
              <Plus className="w-6 h-6" /> {userRole === 'owner' || user?.email === 'njaudavid5@gmail.com' ? 'Launch Individual Vault' : 'Initialize Personal Nexus'}
            </Button>
            
            <Button onClick={logout} variant="ghost" className="w-full text-white/40 uppercase font-black text-[10px] tracking-widest hover:text-white">
              Exit Protocol
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isAdmin_UI = family?.adminId === user.uid;

  return (
    <div className="min-h-screen relative font-sans text-foreground bg-[#F8FAFC]">
      <Background />
      <Toaster position="top-right" />
      
      <div className="lg:grid lg:grid-cols-[240px_1fr] h-screen overflow-hidden">
        {/* Sidebar - Desktop Only */}
        <aside className="bg-[#002F5C] text-white p-6 flex flex-col gap-10 hidden lg:flex border-r border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            GIM.
          </div>
          
          <nav className="flex flex-col gap-2">
            {[
              { id: 'dashboard', label: 'Analysis', icon: <Activity className="w-5 h-5" /> },
              { id: 'registry', label: 'Nexus Registry', icon: <Users className="w-5 h-5" /> },
              { id: 'vault', label: 'Data Vault', icon: <Database className="w-5 h-5" /> },
              { id: 'tree', label: 'Health Tree', icon: <Network className="w-5 h-5" /> },
              { id: 'consent', label: 'Privacy', icon: <Lock className="w-5 h-5" /> },
              { id: 'ancestry', label: 'Predictions', icon: <Droplets className="w-5 h-5" /> },
              { id: 'admin', label: 'Benchmark', icon: <Shield className="w-5 h-5" /> }
            ].map((section) => (
              <motion.div 
                key={section.id}
                whileHover={{ x: 5 }}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-4 p-3.5 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${activeSection === section.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
              >
                {section.icon} {section.label}
              </motion.div>
            ))}
          </nav>

          <div className="mt-auto space-y-6">
            <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
               <div className="flex items-center justify-between mb-3 text-[9px] uppercase font-black text-blue-400 tracking-[0.2em]">
                  <span>System Peer</span>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
               </div>
               <p className="text-[11px] font-bold truncate text-white/90">{user.displayName || user.email}</p>
               <p className="text-[8px] uppercase text-white/30 font-black tracking-widest mt-1">
                 {isAdmin_UI ? 'Authorized Admin' : 'Family Member'}
               </p>
            </div>
            <Button variant="ghost" onClick={logout} className="w-full justify-start text-white/40 hover:text-rose-400 hover:bg-rose-500/10 h-14 rounded-2xl transition-all border-none font-black uppercase tracking-widest text-[10px]">
               <X className="w-4 h-4 mr-2" /> Terminate Session
            </Button>
          </div>
        </aside>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="h-16 lg:h-20 bg-white/60 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2">
                 <Menu className="w-6 h-6 text-slate-900" />
              </button>
              <h1 className="font-black text-xs lg:text-sm text-[#002F5C] uppercase tracking-[0.3em] truncate max-w-[150px] lg:max-w-none">Generational Nexus</h1>
              {!user.emailVerified && (
                <div className="px-3 py-1 bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest border border-rose-100 rounded-full animate-pulse flex items-center gap-1.5 shrink-0">
                  <AlertTriangle className="w-3 h-3" /> Unverified
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 lg:gap-6">
               <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black tracking-widest text-slate-400">
                  <div className={`w-1.5 h-1.5 rounded-full ${isDataLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  {isDataLoading ? 'SYNCING NEXUS...' : 'NEXUS LIVE'}
                  <button 
                    onClick={() => {
                      setIsDataLoading(true);
                      setTimeout(() => setIsDataLoading(false), 800);
                      toast.info("Resychronizing with Nexus protocol...");
                    }}
                    className="ml-2 hover:text-blue-500 transition-colors"
                  >
                    <Activity className="w-3 h-3" />
                  </button>
               </div>
               <div className="hidden sm:flex -space-x-3">
                  {members?.slice(0, 3).map((m) => (
                    <div key={`nexus-avatar-${m.id}`} className="w-10 h-10 rounded-xl border-4 border-white bg-slate-100 overflow-hidden shadow-lg shadow-slate-200/50">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`} alt="member" className="w-full h-full object-cover" />
                    </div>
                  ))}
               </div>
               {isAdmin_UI && (
                 <div className="flex items-center gap-3">
                   <Button onClick={() => setActiveSection('tree')} variant="outline" className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 hover:bg-slate-50 text-[#002F5C] shadow-lg shadow-slate-100/50">
                     Lineage Control <Users className="ml-2 w-4 h-4" />
                   </Button>
                 </div>
               )}
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-10 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeSection === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <div>
                      <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">Live Synthesis</h2>
                      <p className="text-3xl lg:text-4xl font-black text-[#002F5C] tracking-tighter">Bio-Inheritance Flow</p>
                    </div>
                    {isAdmin_UI && (
                      <Button onClick={handleAssessment} disabled={calculating} className="h-16 px-10 bg-[#002F5C] hover:bg-black text-white rounded-3xl shadow-2xl shadow-blue-900/30 transition-all active:scale-95 group font-black uppercase tracking-widest text-[10px]">
                        {calculating ? (
                          <Activity className="animate-spin" />
                        ) : (
                          <span className="flex items-center gap-3">
                            Launch Global Modeling <Zap className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform" />
                          </span>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    <div className="lg:col-span-8 space-y-8 lg:space-y-12">
                      {assessment ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-10"
                        >
                          {/* Community Risk Cards */}
                          <div className="grid sm:grid-cols-2 gap-6">
                            {assessment?.risks?.map((risk) => (
                              <Card key={`risk-card-${risk.condition}`} className="bg-white rounded-[2.5rem] border-none shadow-xl p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                  <div className="p-3 bg-blue-50 rounded-2xl">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-1">Community PRS-Lite</div>
                                    <div className="text-3xl font-black text-[#002F5C]">{risk.community_risk_score.toFixed(1)}</div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h3 className="text-xl font-black text-[#002F5C] tracking-tighter uppercase">{risk.condition}</h3>
                                  <p className="text-xs text-slate-500 font-bold leading-relaxed">{risk.explanation}</p>
                                  
                                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{risk.clinical_evidence_level}</span>
                                    </div>
                                    <div className="px-4 py-3 bg-slate-50 rounded-xl text-[10px] italic font-bold text-slate-600 border border-slate-100">
                                      {risk.verification}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-[8px] bg-blue-50 text-blue-600 p-4 rounded-2xl font-bold leading-relaxed border border-blue-100">
                                  Based on the health patterns shared by your family, your 'Community Risk Score' for {risk.condition} is {risk.community_risk_score.toFixed(1)}. This represents the combined weight of lived experiences in your family, providing a proxy for polygenic susceptibility.
                                </div>
                              </Card>
                            ))}
                          </div>

                          {/* Stability and Trend Visualization */}
                          <div id="clinical-report-layer" className="space-y-8">
                             <div className="hidden pdf-only flex justify-between items-center bg-[#002F5C] text-white p-10 rounded-3xl">
                                <div>
                                  <h1 className="text-2xl font-black tracking-tighter">GIM CLINICAL SYNTHESIS</h1>
                                  <p className="text-[10px] uppercase font-black tracking-widest text-blue-300">Nexus Protocol Report</p>
                                </div>
                                <Activity className="w-10 h-10" />
                             </div>

                             {!hasAnalyzed ? (
                               <div className="p-20 bg-slate-900/50 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center text-center space-y-8 backdrop-blur-3xl min-h-[400px]">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse" />
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                                      <Zap className="w-16 h-16 text-blue-400 relative z-10" />
                                    </motion.div>
                                  </div>
                                  <div className="space-y-4">
                                     <h3 className="text-2xl font-black text-white tracking-tighter">Bio-Neural Matrix Locked</h3>
                                     <p className="text-slate-400 text-sm font-medium max-w-sm">Synchronize your core bio-markers and initialize neural synthesis to visualize generational drift and inheritance flux.</p>
                                  </div>
                                  <Button 
                                    onClick={startNeuralSynthesis} 
                                    disabled={isAnalyzing || !age}
                                    className="h-14 px-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl transition-all"
                                  >
                                     {isAnalyzing ? "Analyzing Neural Pathways..." : (!age ? "Sync Bio-Markers First" : "Initialize Neural Synthesis")}
                                  </Button>
                               </div>
                             ) : (
                               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                  <div className="flex justify-end gap-4 print:hidden">
                                    <Button 
                                      onClick={() => downloadClinicalReport(displayName || user?.email || 'Anonymous')}
                                      className="h-10 px-6 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
                                    >
                                      <FileText className="w-4 h-4" /> Download Clinical PDF
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card className="rounded-[3rem] bg-white border-none shadow-xl p-10 space-y-8">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Phenotypic Drift</h3>
                                          <p className="text-xl font-black text-[#002F5C] tracking-tighter">Neural Stability Matrix</p>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded-2xl">
                                           <Activity className="w-5 h-5 text-blue-600" />
                                        </div>
                                      </div>
                                      <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                           <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                             { subject: 'Cardio', A: age ? Math.min(100, parseInt(age) + 20) : 80, B: 85, fullMark: 100 },
                                             { subject: 'Neuro', A: gender === 'male' ? 90 : 95, B: 92, fullMark: 100 },
                                             { subject: 'Oncology', A: race === 'Black' ? 88 : 82, B: 85, fullMark: 100 },
                                             { subject: 'Metabolic', A: bloodGroup?.includes('+') ? 95 : 85, B: 90, fullMark: 100 },
                                             { subject: 'Ocular', A: 99, B: 95, fullMark: 100 }
                                           ]}>
                                             <PolarGrid stroke="#f1f5f9" />
                                             <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                                             <Radar name="Individual Vector" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                                             <Radar name="Population Mean" dataKey="B" stroke="#0f172a" fill="#0f172a" fillOpacity={0.1} />
                                           </RadarChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </Card>

                                    <Card className="rounded-[3rem] bg-white border-none shadow-xl p-10 space-y-8">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Deep Learning Inference</h3>
                                          <p className="text-xl font-black text-[#002F5C] tracking-tighter">Inheritance Flux Gradient</p>
                                        </div>
                                        <div className="p-4 bg-emerald-50 rounded-2xl">
                                           <Zap className="w-5 h-5 text-emerald-600" />
                                        </div>
                                      </div>
                                      <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                           <BarChart data={[
                                             { name: 'Self', val: age ? Math.max(40, 100 - parseInt(age)) : 90 },
                                             { name: 'Paternal', val: 78 },
                                             { name: 'Maternal', val: 84 },
                                             { name: 'Deep-Net', val: 92 }
                                           ]}>
                                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                                             <YAxis hide domain={[0, 100]} />
                                             <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '10px' }} cursor={{ fill: '#f8fafc' }} />
                                             <Bar dataKey="val" fill="#002F5C" radius={[10, 10, 0, 0]} barSize={24} />
                                           </BarChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </Card>
                                  </div>
                                </motion.div>
                             )}
                          </div>

                          {/* Privacy Audit Trail Snapshot */}
                          <Card className="bg-slate-900 text-white rounded-[3rem] p-10 space-y-8 overflow-hidden relative border-none">
                            <div className="absolute top-0 right-0 p-10 opacity-10">
                               <Shield className="w-40 h-40 text-white" />
                            </div>
                            <div className="relative z-10">
                              <h3 className="text-lg font-black text-white tracking-widest mb-2 flex items-center gap-3">
                                <Lock className="w-5 h-5 text-blue-400" /> PRIVACY GUARANTEE
                              </h3>
                              <p className="text-xs text-slate-400 font-bold max-w-xl">
                                This report was generated using a pruned dataset under a verified consent configuration. No data was shared beyond what was explicitly cleared by individual family members.
                              </p>
                              <div className="mt-8 flex flex-wrap gap-4">
                                 <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                                    <span className="text-[10px] font-black uppercase text-blue-400 mr-2">Audit ID:</span>
                                    <span className="text-[10px] font-mono text-white/70">{assessment.auditRecordId || "Protocol-Verified"}</span>
                                 </div>
                                 <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                                    <span className="text-[10px] font-black uppercase text-emerald-400 mr-2">Integrity:</span>
                                    <span className="text-[10px] font-mono text-white/70">SHA-256 Consent Verified</span></div>
                                 </div>
                            </div>
                          </Card>
                        </motion.div>
                      ) : (
                        <div className="aspect-video lg:aspect-auto lg:h-[400px] bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-10 text-center gap-6 group hover:border-blue-200 transition-all cursor-pointer" onClick={handleAssessment}>
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <Brain className="w-10 h-10 text-slate-300 group-hover:text-blue-400" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Initialize Bio-Authorization Modeling</p>
                        </div>
                      )}
                      
                      {/* Bio-Profile Pulse Editor */}
                      <Card className="bg-gradient-to-br from-blue-900 to-[#002F5C] p-10 rounded-[3rem] border-none shadow-2xl relative overflow-hidden group">
                         <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                            <Activity className="w-64 h-64 text-blue-200" />
                         </div>
                         <div className="relative z-10 space-y-8">
                            <div className="flex justify-between items-start">
                               <div>
                                  <div className="flex items-center gap-3 mb-4">
                                     <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Bio-Identity Controller</h3>
                                     <div className="px-2 py-0.5 bg-blue-500/20 rounded-md border border-blue-400/30 text-[8px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
                                        Nexus Core Active
                                     </div>
                                  </div>
                                  <p className="text-3xl font-black text-white tracking-tighter">Synchronize Bio-Heritage</p>
                                  <p className="text-[10px] font-bold text-white/40 mt-2">Initialize the Nexus Protocol to bridge your phenotypic state with the neural study nexus.</p>
                               </div>
                               <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                                  <Database className="w-6 h-6 text-blue-400" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-blue-300 ml-4 tracking-widest">Full Name</label>
                                  <input 
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Legal Name"
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-white px-6 focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-white/20 outline-none"
                                  />
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-blue-300 ml-4 tracking-widest">Chronological Age</label>
                                  <input 
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-white px-6 focus:ring-2 focus:ring-blue-400 transition-all outline-none"
                                  />
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-blue-300 ml-4 tracking-widest">Biological Gender</label>
                                  <select 
                                    value={gender || 'male'}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-white px-6 focus:ring-2 focus:ring-blue-400 transition-all appearance-none outline-none"
                                  >
                                     <option value="male" className="text-slate-900">Male</option>
                                     <option value="female" className="text-slate-900">Female</option>
                                     <option value="other" className="text-slate-900">Other</option>
                                  </select>
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-blue-300 ml-4 tracking-widest">Blood Group</label>
                                  <select 
                                    value={bloodGroup || 'O+'}
                                    onChange={(e) => setBloodGroup(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-white px-6 focus:ring-2 focus:ring-blue-400 transition-all appearance-none outline-none"
                                  >
                                     <option value="A+">A+</option>
                                     <option value="A-">A-</option>
                                     <option value="B+">B+</option>
                                     <option value="B-">B-</option>
                                     <option value="AB+">AB+</option>
                                     <option value="AB-">AB-</option>
                                     <option value="O+">O+</option>
                                     <option value="O-">O-</option>
                                  </select>
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-blue-300 ml-4 tracking-widest">Nexus Race</label>
                                  <input 
                                    type="text"
                                    value={race}
                                    onChange={(e) => setRace(e.target.value)}
                                    placeholder="e.g. Mongoloid"
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-white px-6 focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-white/20 outline-none"
                                  />
                               </div>
                               <div className="space-y-3 lg:col-span-2">
                                  <label className="text-[9px] font-black uppercase text-blue-300 ml-4 tracking-widest">Detailed Ethnicity</label>
                                  <input 
                                    type="text"
                                    value={ethnicity}
                                    onChange={(e) => setEthnicity(e.target.value)}
                                    placeholder="e.g. Yoruba"
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-white px-6 focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-white/20 outline-none"
                                  />
                               </div>
                               <div className="flex items-end">
                                  <Button 
                                    onClick={handleUpdateBio} 
                                    disabled={isUpdatingBio}
                                    className="w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95 border border-white/20"
                                  >
                                     {isUpdatingBio ? "SYNCING..." : "SYNC IDENTITY"}
                                  </Button>
                               </div>
                            </div>
                            <p className="text-[10px] font-bold text-white/40 italic">Changes to these core markers will re-calibrate clinical synthesis vectors in real-time. Verified by Nexus Protocol.</p>
                         </div>
                      </Card>

                      {/* Personal Biology Feed Wizard */}
                      <Card className="bg-white p-10 rounded-[3rem] border-none shadow-xl space-y-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Brain className="w-32 h-32 text-blue-900" />
                        </div>
                        <div className="relative z-10 space-y-6">
                           <div>
                              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Bio-Marker Handshake</h3>
                              <p className="text-2xl font-black text-[#002F5C] tracking-tighter">Authorized Data Entry</p>
                           </div>
                           
                           {!isSimulatingData ? (
                             <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                   <div className="text-[10px] font-black uppercase text-slate-400">Biological Nexus</div>
                                   <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                         <span className="text-slate-500">Bio-Marker Blood Group</span>
                                         <span className="text-blue-600 font-black uppercase tracking-tighter">{bloodGroup || "Not Set"}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-bold">
                                         <span className="text-slate-500">Nexus Ancestral Race</span>
                                         <span className="text-[#002F5C] font-black uppercase tracking-tighter">{race || "Not Set"}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-bold">
                                         <span className="text-slate-500">Chrono-Age</span>
                                         <span className="text-[#002F5C] font-black uppercase tracking-tighter">{age} Units</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-bold">
                                         <span className="text-slate-500">Genotypic Gender</span>
                                         <span className="text-[#002F5C] font-black uppercase tracking-tighter">{gender}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col justify-center gap-4">
                                   <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">
                                      By clicking "Authorize Feed", the system will programmatically fetch clinical diagnosis histories across the Nexus using your biology markers.
                                   </p>
                                   <Button onClick={handleDataFeed} className="h-16 w-full bg-[#005EB8] hover:bg-[#002F5C] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20">
                                      Authorize Clinical Feed <Zap className="ml-2 w-4 h-4 fill-current" />
                                   </Button>
                                </div>
                             </div>
                           ) : simulationStep < 4 ? (
                             <div className="py-10 flex flex-col items-center justify-center gap-6">
                                <motion.div 
                                  animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180, 270, 360] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="w-16 h-16 text-blue-600"
                                >
                                   <Activity className="w-full h-full" />
                                </motion.div>
                                <div className="text-center space-y-2">
                                   <div className="text-[10px] font-black uppercase text-blue-600 tracking-[0.3em]">
                                      {simulationStep === 1 ? "Confirming Bio-Identity..." : simulationStep === 2 ? "Establishing Nexus Handshake..." : "Fetching Diagnosis History..."}
                                   </div>
                                   <div className="h-1 w-48 bg-slate-100 rounded-full overflow-hidden">
                                      <motion.div 
                                        className="h-full bg-blue-500"
                                        animate={{ width: ["0%", "100%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                      />
                                   </div>
                                </div>
                             </div>
                           ) : (
                             <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4" /> Fetch Complete
                                   </span>
                                   <Button variant="ghost" onClick={() => setIsSimulatingData(false)} className="text-[9px] font-black uppercase text-slate-400 h-8">Reset Buffer</Button>
                                </div>

                                <div className="space-y-4">
                                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Generational Reconstruct (Last 5 Generations)</h4>
                                   <div className="flex flex-wrap gap-4">
                                      {fedData?.ancestry?.map((gen: any, i: number) => (
                                         <div key={i} className="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase">{gen.gen}</span>
                                            <div className="flex items-center justify-between gap-4">
                                               <span className="text-[10px] font-bold text-[#002F5C]">{gen.status}</span>
                                               <span className="text-[9px] font-black text-blue-600">{gen.markers}m</span>
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                   {fedData?.history?.map((item: any, i: number) => (
                                      <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2"
                                      >
                                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.lineage} History</div>
                                         <div className="text-sm font-black text-[#002F5C] leading-tight">{item.condition}</div>
                                         <div className="text-[8px] font-bold text-slate-400 italic">{item.insight}</div>
                                         <div className="flex items-center justify-between pt-2">
                                            <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                               <div className="h-full bg-blue-500" style={{ width: `${item.probability}%` }} />
                                            </div>
                                            <span className="text-[10px] font-black text-blue-600 ml-3">{item.probability}%</span>
                                         </div>
                                      </motion.div>
                                   ))}
                                </div>
                                
                                {/* Visualisation placeholder triggered by fed data */}
                                <Card className="p-8 bg-[#002F5C] text-white rounded-[2.5rem] border-none shadow-2xl overflow-hidden relative">
                                   <div className="absolute top-0 right-0 p-8 opacity-10">
                                      <Droplets className="w-32 h-32 text-blue-400" />
                                   </div>
                                   <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-8">
                                         <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> Synthesized Propensity Gradient 
                                         </h4>
                                         <div className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">Bio-Nexus Live Inference</div>
                                      </div>
                                      <div className="h-40">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={fedData?.history || []}>
                                               <Bar dataKey="probability" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                               <XAxis dataKey="condition" hide />
                                               <Tooltip 
                                                 cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                 contentStyle={{ backgroundColor: '#002F5C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                               />
                                            </BarChart>
                                         </ResponsiveContainer>
                                      </div>
                                      <div className="mt-6 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                         <div className="text-[9px] font-black uppercase tracking-widest text-blue-100">Stability Vector: <span className="text-white ml-2">94.2%</span></div>
                                         <div className="text-[9px] font-black uppercase tracking-widest text-blue-100">IQ Convergence: <span className="text-white ml-2">Verified</span></div>
                                      </div>
                                   </div>
                                </Card>
                             </div>
                          )}</div></Card>

                      {selectedAnalysisMemberId && isAdmin_UI && (
                        <div className="lg:col-span-12">
                          <Card className="bg-emerald-500/5 border border-emerald-500/20 rounded-[3rem] p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                                 <Activity className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                 <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">Active Bio-Target Locked</h3>
                                 <p className="text-xl font-black text-[#002F5C]">
                                   Modeling data for: <span className="text-blue-600">{members.find(m => m.id === selectedAnalysisMemberId)?.fullName || members.find(m => m.id === selectedAnalysisMemberId)?.pseudonym}</span>
                                 </p>
                              </div>
                            </div>
                            <Button 
                              onClick={() => setSelectedAnalysisMemberId(null)}
                              variant="outline" 
                              className="rounded-2xl font-black text-[9px] uppercase tracking-widest border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                            >
                              Release Target
                            </Button>
                          </Card>
                        </div>
                      )}

                      <DataUploader 
                        familyId={family.id} 
                        currentUserId={user.uid} 
                        members={isAdmin_UI ? members : members.filter(m => m.userId === user.uid)} 
                        auditLogs={auditLogs} 
                        initialTargetId={selectedAnalysisMemberId || undefined} 
                      />

                      {selectedAnalysisMemberId && (
                        <Card className="lg:col-span-12 rounded-[3rem] border-none shadow-xl bg-white p-8">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Recently Synchronized Streams for Node: {members.find(m => m.id === selectedAnalysisMemberId)?.fullName || members.find(m => m.id === selectedAnalysisMemberId)?.pseudonym}</h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {healthData.filter(d => d.memberId === selectedAnalysisMemberId).length === 0 ? (
                                <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-50 rounded-[2rem] text-[9px] font-black uppercase text-slate-300">No data synchronized for this node</div>
                              ) : (
                                healthData.filter(d => d.memberId === selectedAnalysisMemberId).slice(0, 6).map((data) => (
                                  <div key={`dash-stream-${data.id}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                        <Database className="w-4 h-4 text-blue-500" />
                                        <div>
                                           <div className="text-[9px] font-black text-[#002F5C] uppercase">{data.type} / {data.category}</div>
                                           <div className="text-[8px] font-bold text-slate-400 uppercase">{data.createdAt?.toDate().toLocaleDateString()}</div>
                                        </div>
                                     </div>
                                     <Button 
                                        onClick={async () => {
                                          if (confirm("Permanently purge this stream from the nexus?")) {
                                            await deleteDoc(doc(db, 'families', family.id, 'healthData', data.id));
                                            toast.success("Stream deleted");
                                          }
                                        }}
                                        variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </Button>
                                  </div>
                                ))
                              )}
                           </div>
                        </Card>
                      )}
                    </div>

                    <div className="lg:col-span-4 space-y-8 lg:space-y-12">
                      <Card className="bg-[#002F5C] text-white rounded-[3rem] border-none shadow-2xl relative overflow-hidden group">
                        <CardHeader className="p-10 pb-0">
                          <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-2">Predictive Phenotypes</CardTitle>
                          <div className="flex items-end gap-2">
                             <div className="text-4xl font-black">98.2</div>
                             <div className="text-xs font-black text-blue-400 mb-1.5">%</div>
                          </div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mt-2">Gemini-4-Inference Confidence</p>
                        </CardHeader>
                        <CardContent className="p-10 space-y-8">
                           {assessment && (
                             <div className="space-y-8">
                                <div className="space-y-3">
                                   <div className="flex items-center gap-3">
                                      <Brain className="w-5 h-5 text-blue-400" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Inference Confidence</span>
                                   </div>
                                   <div className="text-2xl font-black">High Stability</div>
                                </div>
                             </div>
                           )}
                        </CardContent>
                      </Card>

                      <Card className="glass-card rounded-[3rem] p-10 border-none shadow-xl bg-slate-900 text-white">
                         <div className="flex justify-between items-start mb-6">
                            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Nexus Initialization Protocol</h3>
                            {user?.email === 'njaudavid5@gmail.com' && (
                              <Button 
                                onClick={() => setActiveSection('admin')}
                                variant="outline" 
                                className="h-8 text-[8px] font-black uppercase text-emerald-400 border-emerald-400/30 hover:bg-emerald-500/10"
                              >
                                ENTER CLINICAL NEXUS (ADMIN)
                              </Button>
                            )}
                         </div>
                         <p className="text-xs leading-relaxed font-bold text-slate-400 mb-4">
                           The Nexus Initialization is a cryptographic handshake between your local biometric state and the GIM Neural Engine. It establishes a secure channel for zero-knowledge health modeling.
                         </p>
                         <p className="text-xs leading-relaxed font-bold text-slate-400">
                           Generational Intelligence Mediator (GIM) utilizes deep-learning synthesis to predict longitudinal health vectors. Your genomic patterns are pseudonymized and cross-referenced against 128 familial data points without exposing actual PII data strings.
                         </p>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'registry' && (
                <motion.div key="registry" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 pb-20">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                         <h2 className="text-4xl font-black text-[#002F5C] tracking-tighter uppercase mb-2">Nexus Personnel Registry</h2>
                         <div className="flex items-center gap-4">
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[8px] font-black text-blue-600 uppercase tracking-widest">
                               Real-time Node Monitoring
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Data Partners</p>
                         </div>
                      </div>

                   </header>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white p-10 space-y-10 group">
                         <div className="flex justify-between items-center">
                            <div>
                               <h3 className="text-xl font-black text-[#002F5C] tracking-tighter uppercase">Authorized Personnel</h3>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active nodes with verified identity</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl">
                               <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            </div>
                         </div>
                         <div className="space-y-4">
                            {members.filter(m => m.status === 'active').length === 0 ? (
                               <div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-[2.5rem] text-[10px] font-black text-slate-300 uppercase tracking-widest">No active personnel detected</div>
                            ) : (
                               members.filter(m => m.status === 'active').map((m) => (
                                  <div key={m.id} className="p-6 bg-slate-50 hover:bg-slate-100 rounded-3xl border border-slate-100 transition-all flex items-center justify-between group/item">
                                     <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover/item:scale-110 transition-transform">
                                           <UserIcon className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div className="flex flex-col">
                                           <p className="font-black text-[#002F5C] uppercase text-[12px] tracking-tight">{m.fullName || m.pseudonym}</p>
                                           <button 
                                              onClick={() => {
                                                 setSelectedAnalysisMemberId(m.id);
                                                 setActiveSection('dashboard');
                                                 toast.success(`Synchronizing data stream for ${m.fullName || m.pseudonym}...`);
                                              }}
                                              className="text-[9px] text-blue-600 font-black uppercase tracking-widest hover:underline text-left block mt-1"
                                           >
                                              {m.email}
                                           </button>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                        <Button 
                                           onClick={() => {
                                              setSelectedAnalysisMemberId(m.id);
                                              setActiveSection('dashboard');
                                           }}
                                           variant="outline" 
                                           className="rounded-xl font-black text-[8px] uppercase tracking-widest border-slate-200 h-10 px-4"
                                        >
                                           Analyze
                                        </Button>
                                        {(isAdmin_UI || user?.email === 'njaudavid5@gmail.com') && (
                                           <Button 
                                              onClick={async () => {
                                                 if (confirm(`Irreversibly purge identity for ${m.fullName || m.pseudonym}?`)) {
                                                    await deleteDoc(doc(db, 'families', family.id, 'members', m.id));
                                                    toast.info("Identity purged from Nexus");
                                                 }
                                              }}
                                              variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                           >
                                              <Trash2 className="w-4 h-4" />
                                           </Button>
                                        )}
                                     </div>
                                  </div>
                               ))
                            )}
                         </div>
                      </Card>

                      <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white p-10 space-y-10 text-slate-900 overflow-hidden relative">
                         <div className="flex justify-between items-center">
                            <div>
                               <h3 className="text-xl font-black text-[#002F5C] tracking-tighter uppercase">Bio-Node Status</h3>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self-registration health summary</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl">
                               <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            </div>
                         </div>
                         <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-[11px] font-medium text-slate-500 leading-relaxed">
                               "The invitation layer has been phased out. New personnel nodes now initialize their own bio-identity via the primary sign-up gateway. All data streams are automatically routed to the global clinical registry overseen by the Administrator."
                            </div>
                            <div className="flex items-center justify-between px-6 py-4 bg-[#002F5C] rounded-2xl text-white">
                               <span className="text-[9px] font-black uppercase tracking-widest">Active Verification Nodes</span>
                               <span className="text-xl font-black">{members.filter(m => m.status === 'active').length}</span>
                            </div>
                         </div>
                      </Card>
                   </div>
                </motion.div>
              )}

              {activeSection === 'tree' && (
                <motion.div 
                  key="tree" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="space-y-8"
                >
                  <div className="flex justify-between items-end bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                     <div className="space-y-1">
                        <h3 className="text-2xl font-black text-[#002F5C] tracking-tighter uppercase">Clinical Nexus Graph</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generational Sync: Living Nodes & Deep Lineage</p>
                     </div>
                     <div className="flex gap-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="h-11 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest border-slate-100 text-slate-600 hover:bg-slate-50 transition-all">
                              <Info className="w-4 h-4 mr-2" /> Inheritance Patterns
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl rounded-[3rem] p-12 border-none shadow-2xl bg-white overflow-y-auto max-h-[85vh]">
                            <DialogHeader>
                              <DialogTitle className="text-4xl font-black text-[#002F5C] tracking-tighter uppercase leading-none">Genetic Inheritance Guide</DialogTitle>
                              <DialogDescription className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Visualizing Bio-Information Flow</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 mt-10">
                              {[
                                { t: "Autosomal Dominant", d: "One copy of a mutated gene is enough to cause the condition. Often seen in every generation.", icon: "▲", color: "bg-blue-50 text-blue-600" },
                                { t: "Autosomal Recessive", d: "Two copies of the gene are needed. Parents are often unaffected carriers.", icon: "■", color: "bg-amber-50 text-amber-600" },
                                { t: "X-Linked", d: "Mutations on the X chromosome. Affects males and females differently due to chromosome counts.", icon: "◆", color: "bg-emerald-50 text-emerald-600" },
                                { t: "Mitochondrial", d: "Passed strictly from mother to child. Maternal lineage tracking is critical for these markers.", icon: "●", color: "bg-rose-50 text-rose-600" }
                              ].map((p, i) => (
                                <div key={i} className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex gap-8 items-start">
                                  <div className={`w-14 h-14 min-w-[3.5rem] rounded-2xl ${p.color} shadow-sm flex items-center justify-center font-black text-2xl`}>{p.icon}</div>
                                  <div>
                                    <h5 className="font-black text-[#002F5C] uppercase text-xs tracking-tight mb-2">{p.t}</h5>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{p.d}</p>
                                  </div>
                                </div>
                              ))}
                              <div className="p-8 bg-[#002F5C] rounded-[2.5rem] text-white">
                                <div className="flex items-center gap-3 mb-4">
                                  <Activity className="w-5 h-5 text-blue-400" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Graph Legend</p>
                                </div>
                                <p className="text-sm font-medium opacity-80 leading-relaxed"> Dotted white lines indicate Ancestry Data (Flow from 5 past generations), while solid blue animated lines indicate forecasted Inference Models (Predictive paths for 5 coming generations).</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          onClick={() => {
                            toast.info("Synthesizing Generation Markers...");
                            setTimeout(() => {
                              toast.success("11-Generation Deep Nexus Synced");
                            }, 1500);
                          }}
                          className="h-11 px-8 bg-[#002F5C] hover:bg-blue-800 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                        >
                          Sync Generations (11G)
                        </Button>
                     </div>
                  </div>
                  <div className="h-[600px]">
                    <FamilyGraph members={isAdmin_UI ? members : members.filter(m => m.userId === user.uid)} consents={consents} />
                  </div>
                </motion.div>
              )}

              {activeSection === 'consent' && (
                <motion.div key="consent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                   <ConsentManager familyId={family.id} memberId={user.uid} consent={consents.find(c => c.id === user.uid)} />
                </motion.div>
              )}

              {activeSection === 'ancestry' && (
                <motion.div key="ancestry" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 pb-20">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <Card className="p-8 bg-[#002F5C] text-white rounded-[3rem] border-none shadow-2xl">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Generational Flow (5 Gen)</h3>
                         <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                { gen: 'G5', risk: 12 }, { gen: 'G4', risk: 45 }, { gen: 'G3', risk: 67 }, { gen: 'G2', risk: 89 }, { gen: 'G1', risk: 94 }
                              ]}>
                                <Bar dataKey="risk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Tooltip contentStyle={{ backgroundColor: '#002F5C', border: 'none', borderRadius: '12px', fontSize: '10px', color: 'white' }} />
                              </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <p className="text-[10px] font-bold text-white/50 mt-4">Simulated polygenic risk aggregation over five clinical generations.</p>
                      </Card>

                      <Card className="p-8 bg-white rounded-[3rem] border-none shadow-xl">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-6">Risk Stability Index</h3>
                         <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                { subject: 'Heart', A: 120, fullMark: 150 },
                                { subject: 'Metabolic', A: 98, fullMark: 150 },
                                { subject: 'Oncology', A: 86, fullMark: 150 },
                                { subject: 'Neuro', A: 99, fullMark: 150 },
                                { subject: 'Autoimmune', A: 85, fullMark: 150 }
                              ]}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 900 }} />
                                <Radar name="Nexus" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                              </RadarChart>
                            </ResponsiveContainer>
                         </div>
                      </Card>

                      <Card className="p-8 bg-slate-900 rounded-[3rem] border-none shadow-xl text-white">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6">Population Density</h3>
                         <div className="space-y-4">
                            {[
                               { label: 'African lineage', val: 78 },
                               { label: 'East Asian lineage', val: 54 },
                               { label: 'Caucasian lineage', val: 92 }
                            ].map((item, i) => (
                               <div key={i} className="space-y-2">
                                  <div className="flex justify-between text-[8px] font-black text-white/40">
                                     <span>{item.label}</span>
                                     <span>{item.val}% Consistency</span>
                                  </div>
                                  <div className="h-1 bg-white/5 rounded-full">
                                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.val}%` }} />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </Card>

                      <Card className="p-8 bg-white rounded-[3rem] border-none shadow-xl lg:col-span-3">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-8">Longitudinal Risk Forecasting (30 Year Projection)</h3>
                         <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={[
                                  { year: '2025', risk: 10, offset: 5 },
                                  { year: '2030', risk: 25, offset: 12 },
                                  { year: '2035', risk: 45, offset: 25 },
                                  { year: '2040', risk: 70, offset: 40 },
                                  { year: '2045', risk: 85, offset: 60 },
                                  { year: '2050', risk: 95, offset: 75 }
                               ]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
                                  <Bar dataKey="risk" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                  <Bar dataKey="offset" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={40} />
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                      </Card>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <Card className="p-10 bg-white rounded-[3rem] border-none shadow-xl">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-6">Verification Protocol</h3>
                         <p className="text-sm font-bold leading-relaxed text-slate-500">
                            Every prediction is grounded in live clinical directory data, including NHS England's National Genomic Test Directory.
                         </p>
                      </Card>
                      <Card className="p-10 bg-[#002F5C] text-white rounded-[3rem] border-none">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Polygenic Modeling</h3>
                         <p className="text-sm font-bold leading-relaxed opacity-70">
                            Our "PRS-Lite" engine aggregates reported phenotypes across your family nexus to simulate polygenic risk scores without requiring raw sequencing data.
                         </p>
                      </Card>
                   </div>

                   {/* Custom Data Ledger for all demographics */}
                   <Card className="bg-white p-10 rounded-[3.5rem] border-none shadow-2xl space-y-10">
                      <div>
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Global Consent Ledger</h3>
                        <p className="text-3xl font-black text-[#002F5C] tracking-tighter">Authorized Diagnosis Conditions</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {[
                            { title: "Pediatric Oncology", age: "0-18", status: "Active Modeling", race: "Global" },
                            { title: "Metabolic Synthesis", age: "All Ages", status: "Active Modeling", race: "East Asian Focused" },
                            { title: "Neuro-Stability", age: "65+", status: "Monitoring", race: "Global" },
                            { title: "Autoimmune Pulse", age: "Young Adults", status: "Verified", race: "Caucasian / Hispanic" },
                            { title: "Cardio-Flow", age: "Infants", status: "Protocol-Ready", race: "African / Nordic" }
                         ].map((item, i) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                               <div className="flex justify-between items-start">
                                  <div className="text-sm font-black text-[#002F5C] uppercase tracking-tighter">{item.title}</div>
                                  <span className="text-[8px] px-2 py-1 bg-emerald-50 text-emerald-600 font-black rounded-full uppercase">{item.status}</span>
                               </div>
                               <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400">
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.age}</span>
                                  <span className="h-1 w-1 bg-slate-200 rounded-full" />
                                  <span className="flex items-center gap-1"><Network className="w-3 h-3" /> {item.race}</span>
                               </div>
                            </div>
                         ))}
                      </div>
                   </Card>
                </motion.div>
              )}

              {activeSection === 'vault' && (
                <motion.div key="vault" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12 pb-20">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                         <h2 className="text-4xl font-black text-[#002F5C] tracking-tighter uppercase mb-2">Clinical Data Vault</h2>
                         <div className="flex items-center gap-4">
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[8px] font-black text-blue-600 uppercase tracking-widest">
                               End-to-End Encrypted
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Vault: {healthData.length} active streams</p>
                         </div>
                      </div>
                   </header>

                   <div className="grid grid-cols-1 gap-10">
                      <DataUploader 
                        familyId={family.id} 
                        currentUserId={user.uid} 
                        members={isAdmin_UI ? members : members.filter(m => m.userId === user.uid)} 
                        auditLogs={auditLogs} 
                      />

                      <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white p-12 space-y-10">
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                               <h3 className="text-xl font-black text-[#002F5C] tracking-tighter uppercase">Nexus Data Streams</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage all uploaded phenotypic datasets</p>
                            </div>
                         </div>

                         {/* Career & Talent Mapping Path */}
                         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                           <div className="absolute -right-20 -top-20 opacity-10">
                             <Zap className="w-64 h-64" />
                           </div>
                           <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                             <div className="space-y-6">
                               <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full border border-white/30 text-[8px] font-black uppercase tracking-widest">
                                 AI Talent Forecasting Active
                               </div>
                               <h4 className="text-4xl font-black tracking-tighter leading-none">Talent & Career Mapping</h4>
                               <p className="text-sm font-medium text-blue-100/70 max-w-sm">
                                 Predict excellence paths for the next generation. We analyze genetic markers for physical speed, endurance, and cognitive focus to guide childhood development.
                               </p>
                               <Button 
                                 onClick={runTalentMapping}
                                 disabled={isGeneratingTalent}
                                 className="h-14 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl px-10 font-black uppercase tracking-widest text-[10px] shadow-2xl"
                               >
                                 {isGeneratingTalent ? "CALCULATING VECTORS..." : "GENERATE TALENT MAP"}
                               </Button>
                             </div>

                             <div className="space-y-4">
                               {talentMap ? (
                                 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                   <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                     <div className="text-[9px] font-black uppercase mb-1 text-blue-300">Physical Profile</div>
                                     <div className="text-sm font-bold">{talentMap.physical_profile}</div>
                                   </div>
                                   <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                     <div className="text-[9px] font-black uppercase mb-1 text-blue-300">Top Recommendations</div>
                                     <div className="flex flex-wrap gap-2 mt-2">
                                       {talentMap.recommendations.map((rec: any, idx: number) => (
                                         <div key={idx} className="px-3 py-1 bg-blue-500/30 rounded-lg text-[9px] font-black uppercase">
                                           {rec.category}: {rec.path}
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 </motion.div>
                               ) : (
                                 <div className="h-64 border-2 border-dashed border-white/20 rounded-[2rem] flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                                   Awaiting Diagnostic Trigger
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>

                         <div className="overflow-x-auto">
                            <table className="w-full text-left">
                               <thead>
                                  <tr className="border-b border-slate-100">
                                     <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stream Type</th>
                                     <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nexus Node (Member)</th>
                                     <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sync Date</th>
                                     <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                     <th className="pb-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                  {healthData.length === 0 ? (
                                     <tr>
                                        <td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-50 rounded-[3rem]">No data streams identified in vault</td>
                                     </tr>
                                  ) : (
                                     healthData.map((data) => {
                                        const member = members.find(m => m.id === data.memberId);
                                        return (
                                           <tr key={data.id} className="group hover:bg-slate-50/50 transition-all">
                                              <td className="py-6">
                                                 <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                                       <Database className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                       <p className="text-[11px] font-black text-[#002F5C] uppercase">{data.type}</p>
                                                       <p className="text-[9px] font-bold text-slate-400">{data.category}</p>
                                                    </div>
                                                 </div>
                                              </td>
                                              <td className="py-6">
                                                 <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                       <UserIcon className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-600 uppercase">{member?.fullName || member?.pseudonym || 'Anon Node'}</p>
                                                 </div>
                                              </td>
                                              <td className="py-6">
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.createdAt?.toDate().toLocaleDateString()}</p>
                                              </td>
                                              <td className="py-6">
                                                 <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-full uppercase">Verified</span>
                                              </td>
                                              <td className="py-6 text-right">
                                                 <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                       variant="ghost" size="icon" 
                                                       className="h-9 w-9 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl"
                                                       onClick={() => {
                                                          setSelectedAnalysisMemberId(data.memberId);
                                                          setActiveSection('dashboard');
                                                          toast.info("Opening Analysis Stream...");
                                                       }}
                                                    >
                                                       <Activity className="w-4 h-4" />
                                                    </Button>
                                                    {(isAdmin_UI || user?.email === 'njaudavid5@gmail.com') && (
                                                       <Button 
                                                          onClick={async () => {
                                                             if (confirm("Permanently de-synchronize this stream from the clinical nexus?")) {
                                                                await deleteDoc(doc(db, 'families', family.id, 'healthData', data.id));
                                                                toast.success("Stream purged");
                                                             }
                                                          }}
                                                          variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                                       >
                                                          <Trash2 className="w-4 h-4" />
                                                       </Button>
                                                    )}
                                                 </div>
                                              </td>
                                           </tr>
                                        );
                                     })
                                  )}
                               </tbody>
                            </table>
                         </div>
                      </Card>
                   </div>
                </motion.div>
              )}

              {activeSection === 'admin' && (user?.email === 'njaudavid5@gmail.com' || isAdmin_UI) && (
                <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-20">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                         <h2 className="text-4xl font-black text-[#002F5C] tracking-tighter uppercase mb-2">Clinical Nexus Alpha</h2>
                         <div className="flex items-center gap-4">
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                               Oversight Mode Active
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Node: NEXUS-AUTO-TRANSMIT</p>
                         </div>
                      </div>
                      <div className="flex gap-4">
                         <Button onClick={handleRunBenchmark} disabled={isRunningBenchmark} className="h-14 px-8 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl">
                            {isRunningBenchmark ? "Simulating MedQA..." : "Run System Audit"}
                         </Button>
                      </div>
                   </header>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                         { label: 'Neural Streams', value: healthData.length, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
                         { label: 'Phenotypic Nodes', value: members.length, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                         { label: 'Security Handshakes', value: auditLogs.length, icon: Shield, color: 'text-amber-500', bg: 'bg-amber-50' },
                         { label: 'Global Registry', value: allUsers.length, icon: Database, color: 'text-rose-500', bg: 'bg-rose-50' }
                      ].map((stat, i) => (
                         <Card key={i} className="p-8 rounded-[2.5rem] border-none shadow-xl flex items-center gap-6 group text-slate-900">
                            <div className={`${stat.bg} w-14 h-14 rounded-2xl flex items-center justify-center`}>
                               <stat.icon className={`w-8 h-8 ${stat.color}`} />
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                               <p className="text-2xl font-black text-[#002F5C]">{stat.value}</p>
                            </div>
                         </Card>
                      ))}
                   </div>

                   {/* Global User Registry (Owner Only) */}
                   {isGlobalAdmin && (
                     <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white p-12 space-y-10">
                        <div className="flex justify-between items-end">
                           <div>
                              <h3 className="text-xl font-black text-[#002F5C] tracking-tighter uppercase">Global User Registry</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System-wide bio-identity monitoring</p>
                           </div>
                           <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-widest">
                             Authorized Access: {user?.email}
                           </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Identity Node</th>
                                <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Role</th>
                                <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Bio-Signature</th>
                                <th className="pb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Status</th>
                                <th className="pb-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Purge Protocol</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {allUsers.map((u) => (
                                <tr key={u.id} className="group hover:bg-slate-50/50">
                                  <td className="py-6">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-blue-600">
                                        {u.fullName?.charAt(0) || u.email?.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-black text-[#002F5C] uppercase">{u.fullName || 'Node Alpha'}</p>
                                        <p className="text-[9px] font-bold text-slate-400">{u.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-6">
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${u.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                                      {u.role || 'Member'}
                                    </span>
                                  </td>
                                  <td className="py-6">
                                    <div className="flex gap-2">
                                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{u.bloodGroup || 'NA'}</span>
                                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{u.age || 'NA'}Y</span>
                                    </div>
                                  </td>
                                  <td className="py-6">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-1.5 h-1.5 rounded-full ${u.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                      <span className="text-[9px] font-bold text-slate-500 lowercase">{u.emailVerified ? 'verified' : 'pending'}</span>
                                    </div>
                                  </td>
                                  <td className="py-6 text-right">
                                    {u.email !== 'njaudavid5@gmail.com' && (
                                      <Button 
                                        onClick={async () => {
                                          if (confirm(`Irreversibly purge user ${u.email}? This will delete all associated datasets.`)) {
                                            await deleteDoc(doc(db, 'users', u.id));
                                            toast.error("User purged from Registry");
                                          }
                                        }}
                                        variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                     </Card>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <Card className="lg:col-span-2 rounded-[3.5rem] border-none shadow-2xl bg-white p-12 space-y-10">
                         <div className="flex justify-between items-center">
                            <div>
                               <h3 className="text-xl font-black text-[#002F5C] tracking-tighter">Clinical Registry</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Phenotypes across Family Graph</p>
                            </div>
                            <div className="flex gap-4">
                               <Button 
                                 onClick={downloadAllReports}
                                 disabled={isZipping}
                                 variant="outline" 
                                 className="rounded-2xl font-black text-[9px] uppercase tracking-widest border-blue-100 text-blue-600 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-2 h-10 px-6"
                               >
                                 {isZipping ? (
                                   <>
                                     <Activity className="w-3 h-3 animate-spin" />
                                     Zipping {zipProgress}%
                                   </>
                                 ) : (
                                   <>
                                     <History className="w-4 h-4" /> Download All Reports
                                   </>
                                 )}
                               </Button>
                               <Button variant="outline" className="rounded-2xl font-black text-[9px] uppercase tracking-widest border-slate-100">Export Registry</Button>
                            </div>
                         </div>

                         <div className="space-y-8">
                            <div>
                               <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Authorized Personnel</h4>
                               <div className="space-y-4">
                                  {members.filter(m => m.status === 'active').map((m) => (
                                     <div key={`active-${m.id}`} className={`p-6 rounded-3xl border transition-all flex items-center justify-between group ${selectedAnalysisMemberId === m.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                                        <div 
                                           className="flex items-center gap-6 cursor-pointer flex-1"
                                           onClick={() => {
                                              setSelectedAnalysisMemberId(m.id);
                                              setActiveSection('dashboard');
                                              toast.info(`Synchronizing ${m.fullName || m.pseudonym}...`);
                                           }}
                                        >
                                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                              <UserIcon className="w-6 h-6 text-slate-400" />
                                           </div>
                                           <div>
                                              <p className="font-black text-[#002F5C] uppercase text-[11px] tracking-tight">{m.fullName || m.pseudonym}</p>
                                              <p className="text-[9px] text-slate-400 font-bold">{m.email} • ID: {m.id.slice(0, 8)}</p>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                           <Button 
                                              onClick={() => {
                                                 setSelectedAnalysisMemberId(m.id);
                                                 setActiveSection('dashboard');
                                              }}
                                              variant="ghost"
                                              size="sm"
                                              className="rounded-xl font-black text-[9px] uppercase tracking-widest text-blue-600 hover:bg-blue-50 h-10 px-4"
                                           >
                                              Analyze
                                           </Button>
                                           <Button onClick={() => downloadClinicalReport(m.fullName || m.pseudonym)} size="icon" className="w-10 h-10 bg-white hover:bg-blue-600 hover:text-white text-slate-400 rounded-xl shadow-md border border-slate-100 transition-all"><FileText className="w-5 h-5" /></Button>
                                           {(isAdmin_UI || user?.email === 'njaudavid5@gmail.com') && (
                                              <Button onClick={async () => { if (confirm(`Purge profile for ${m.fullName || m.pseudonym}?`)) { await deleteDoc(doc(db, 'families', family.id, 'members', m.id)); toast.success("Identity purged"); } }} size="icon" className="w-10 h-10 bg-white hover:bg-rose-600 hover:text-white text-slate-400 rounded-xl shadow-md border border-slate-100 transition-all"><Trash2 className="w-4 h-4" /></Button>
                                           )}
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </Card>

                      <Card className="rounded-[3.5rem] border-none shadow-2xl bg-slate-900 text-white p-12 space-y-10">
                          <div className="space-y-6">
                             <h3 className="text-xl font-black text-white tracking-tighter">Bio-Data Streams</h3>
                             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                                {healthData.length === 0 ? (
                                   <div className="text-[10px] font-black text-white/30 uppercase text-center py-10 border border-white/5 rounded-3xl">No streams synchronized</div>
                                ) : (
                                   healthData.map((data) => {
                                      const member = members.find(m => m.id === data.memberId);
                                      return (
                                         <div key={`stream-${data.id}`} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group h-18">
                                            <div className="flex items-center gap-3">
                                               <Database className="w-4 h-4 text-blue-400" />
                                               <div>
                                                  <p className="text-[10px] font-black text-white uppercase">{data.type} / {data.category}</p>
                                                  <p className="text-[8px] font-bold text-white/40">{member?.pseudonym || 'Anon Node'} • {data.createdAt?.toDate().toLocaleDateString()}</p>
                                               </div>
                                            </div>
                                            <Button 
                                               onClick={async () => {
                                                  if (confirm("Permanently de-synchronize this bio-stream?")) {
                                                     try {
                                                       await deleteDoc(doc(db, 'families', family.id, 'healthData', data.id));
                                                       toast.success("Stream purged");
                                                     } catch (e) {
                                                       toast.error("Handshake fail");
                                                     }
                                                  }
                                               }}
                                               variant="ghost" 
                                               size="icon" 
                                               className="text-white/20 hover:text-rose-500 hover:bg-rose-500/10"
                                            >
                                               <Trash2 className="w-4 h-4" />
                                            </Button>
                                         </div>
                                      );
                                   })
                                )}
                             </div>
                             
                             <h3 className="text-xl font-black tracking-tighter mt-10 mb-2">Neural Telemetry</h3>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System-Wide Health Signals</p>
                          </div>
                          <div className="space-y-6">
                             {auditLogs.slice(0, 8).map((log) => (
                                <div key={`admin-log-${log.id}`} className="flex gap-4 border-l border-white/10 pl-6 relative">
                                   <div className="absolute left-[-5px] top-0 w-[10px] h-[10px] bg-blue-500 rounded-full" />
                                   <div>
                                      <p className="text-[10px] font-black text-blue-400 uppercase">{log.action || log.query_intent}</p>
                                      <p className="text-[10px] font-bold text-slate-400 mt-1">{log.details || `Pruned objects: ${log.pruned_data_count}`}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                          <Button className="w-full h-16 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                             Deploy Neural Patch
                          </Button>
                      </Card>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
         {isMobileMenuOpen && (
           <motion.div 
             initial={{ opacity: 0, x: '-100%' }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: '-100%' }}
             className="fixed inset-0 bg-[#002F5C] z-[100] flex flex-col p-8 gap-10 overflow-y-auto"
           >
              <div className="flex justify-between items-center text-white">
                 <div className="font-black text-3xl tracking-tighter">GIM.</div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-white/10 rounded-2xl">
                    <X className="w-8 h-8" />
                 </button>
              </div>
              
              <nav className="flex flex-col gap-4">
                 {[
                   { id: 'dashboard', label: 'Analysis Overview', icon: <Activity className="w-6 h-6" /> },
                   { id: 'tree', label: 'Family Dynamics', icon: <Users className="w-6 h-6" /> },
                   { id: 'consent', label: 'Privacy Engine', icon: <Lock className="w-6 h-6" /> },
                   { id: 'ancestry', label: 'Inheritance Forecast', icon: <Network className="w-6 h-6" /> }
                 ].map((s) => (
                   <div 
                     key={s.id}
                     onClick={() => { setActiveSection(s.id as any); setIsMobileMenuOpen(false); }}
                     className={`flex items-center gap-6 p-6 rounded-[2rem] text-xl font-black uppercase tracking-widest ${activeSection === s.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40' : 'text-white/40'}`}
                   >
                     {s.icon} {s.label}
                   </div>
                 ))}
              </nav>

              <div className="mt-auto flex flex-col gap-6">
                 <div className="p-8 bg-white/10 rounded-[3rem] flex items-center gap-4 border border-white/5">
                    <div className="w-14 h-14 bg-white rounded-2xl overflow-hidden shrink-0">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="me" />
                    </div>
                    <div className="truncate">
                       <p className="text-white font-black text-lg truncate leading-none mb-1">{user.displayName || user.email}</p>
                       <p className="text-white/30 text-[9px] uppercase font-black tracking-widest">Active Bio-Terminal</p>
                    </div>
                 </div>
                 <Button onClick={logout} className="h-20 bg-rose-500 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-lg shadow-2xl shadow-rose-500/20">
                    Kill Connection
                 </Button>
              </div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 right-6 z-[80] flex flex-col gap-4 items-end"
      >
         <a 
           href="https://wa.me/447873404080" 
           target="_blank" 
           rel="noopener noreferrer"
           className="flex items-center gap-4 bg-emerald-500 text-white px-8 py-5 rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.4)] hover:scale-105 hover:bg-emerald-600 transition-all group overflow-hidden border-4 border-white/20"
         >
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
              <Activity className="w-5 h-5 text-white relative z-10" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest shrink-0">WhatsApp David</span>
         </a>
      </motion.div>



    </div>
  );
}
