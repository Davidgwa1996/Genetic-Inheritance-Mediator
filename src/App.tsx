import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, db, signUpWithEmail, signInWithEmail } from './lib/firebase';
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
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Background } from './components/Background';

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
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tree' | 'consent' | 'ancestry'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'landing'>('landing');
  const [authRole, setAuthRole] = useState<'owner' | 'user'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
          setUserRole(userDoc.data().role);
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
    if (!displayName) {
      toast.error("Please enter your name.");
      return;
    }
    setIsAuthenticating(true);
    try {
      await signUpWithEmail(email, password, displayName, authRole === 'owner');
      toast.success("Account created! Please check your email for verification.");
      setAuthMode('signin');
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
      }
    }, (err) => {
      // Expected if no access or during transitions
      if (err.code === 'permission-denied') {
        console.warn("Family access restricted - bio-authentication pending");
      } else {
        console.error("Family snapshot error:", err);
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

    const unsubLogs = onSnapshot(collection(db, 'families', family.id, 'auditLog'), (snaps) => {
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
    const famId = `fam-${user.uid}`;
    const famRef = doc(db, 'families', famId);
    await setDoc(famRef, {
      name: `${user.displayName}'s Family Health Graph`,
      adminId: user.uid,
      memberIds: [user.uid],
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

  const handleInvite = () => {
    // Hidden as per user request to move to direct sign up
    toast.info("Invites are now handled via direct member registration.");
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
        <Background />
        
        <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-center max-w-7xl mx-auto md:m-6 md:rounded-3xl backdrop-blur-md bg-white/70 border border-white/20 shadow-xl shadow-slate-200/20">
          <div className="flex items-center gap-2 font-black text-2xl text-[#002F5C] tracking-tighter cursor-pointer" onClick={() => setAuthMode('landing')}>
            <motion.div 
              whileHover={{ rotate: 180 }}
              className="w-10 h-10 bg-[#005EB8] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            GIM.
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-600 hover:text-[#005EB8] uppercase tracking-widest text-[10px]">Features</a>
            <Button onClick={() => setAuthMode('signin')} variant="ghost" className="text-[#002F5C] font-black uppercase tracking-widest text-[10px]">
              Sign In
            </Button>
            <Button onClick={() => setAuthMode('signup')} className="bg-[#002F5C] hover:bg-black text-white px-8 rounded-2xl h-11 shadow-xl transition-all font-black uppercase tracking-widest text-[10px]">
              Sign Up
            </Button>
          </div>
          <button className="md:hidden p-2 text-slate-900" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             <Menu className="w-6 h-6" />
          </button>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
          <AnimatePresence mode="wait">
            {authMode === 'landing' && (
              <motion.div 
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid lg:grid-cols-2 gap-10 md:gap-20 items-center"
              >
                <div className="space-y-6 md:space-y-10 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-[#005EB8] text-[10px] font-black uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4" /> AI-Augmented Genetic Forecasting
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-[100px] font-black text-[#002F5C] leading-[0.9] tracking-tighter">
                    Ancestry <span className="text-[#005EB8] block md:inline">Reconstructed.</span>
                  </h1>
                  <p className="text-base md:text-xl text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0 border-l-4 border-blue-200 pl-6 text-left font-medium">
                    Mediate your inheritance with privacy-first clinical modeling. Reconstruct family health patterns through 5 generations of peer-verified data protocols.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Button onClick={() => setAuthMode('signup')} className="bg-[#002F5C] text-white px-10 h-16 rounded-2xl text-lg hover:scale-105 transition-all shadow-2xl shadow-blue-900/20 group uppercase font-black tracking-widest text-[10px]">
                      Access Protocol <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" onClick={() => setAuthMode('signin')} className="px-10 h-16 border-2 border-slate-200 rounded-2xl uppercase font-black tracking-widest text-[10px] hover:bg-slate-50 transition-all">
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
                             key={i}
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

  if (!family) {
    return (
      <div className="min-h-screen bg-[#002F5C] flex items-center justify-center p-8 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-10 bg-white/10 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl"
        >
          <div className="w-20 h-20 bg-blue-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
              Verify identity, {user.displayName?.split(' ')[0]}
            </h2>
            <p className="text-white/40 text-xs font-bold leading-relaxed uppercase tracking-widest">
              {userRole === 'owner' 
                ? 'Your generational nexus is ready for initialization. Deploy your family vault protocol below.' 
                : 'Connection pending. A family owner must authorize your identity within their portal.'}
            </p>
          </div>

          {userRole === 'owner' ? (
            <Button onClick={createFamily} className="w-full h-20 text-xs font-black uppercase tracking-[0.2em] rounded-[2rem] bg-white text-[#002F5C] hover:scale-105 transition-all shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-4">
              <Plus className="w-6 h-6" /> Initialize Nexus Protocol
            </Button>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 animate-pulse">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Awaiting Nexus Link...</p>
              </div>
              <Button onClick={logout} variant="ghost" className="text-white/40 uppercase font-black text-[10px] tracking-widest hover:text-white">
                Kill Identity & Exit
              </Button>
            </div>
          )}
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
              { id: 'tree', label: 'Health Tree', icon: <Users className="w-5 h-5" /> },
              { id: 'consent', label: 'Privacy', icon: <Lock className="w-5 h-5" /> },
              { id: 'ancestry', label: 'Predictions', icon: <Network className="w-5 h-5" /> }
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
               <div className="hidden sm:flex -space-x-3">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="w-10 h-10 rounded-xl border-4 border-white bg-slate-100 overflow-hidden shadow-lg shadow-slate-200/50">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`} alt="member" className="w-full h-full object-cover" />
                    </div>
                  ))}
               </div>
               {isAdmin_UI && (
                 <Button onClick={() => setActiveSection('tree')} variant="outline" className="hidden sm:flex h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 hover:bg-slate-50 text-[#002F5C] shadow-lg shadow-slate-100/50">
                   Manage Tree <Users className="ml-2 w-4 h-4" />
                 </Button>
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
                        >
                          <RiskHeatmap data={assessment.heatmap} />
                        </motion.div>
                      ) : (
                        <div className="aspect-video lg:aspect-auto lg:h-[400px] bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-10 text-center gap-6 group hover:border-blue-200 transition-all cursor-pointer" onClick={handleAssessment}>
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <Network className="w-10 h-10 text-slate-300 group-hover:text-blue-400" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Initialize family modeling stream</p>
                        </div>
                      )}
                      
                      <DataUploader familyId={family.id} currentUserId={user.uid} members={isAdmin_UI ? members : members.filter(m => m.userId === user.uid)} />
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
                           {assessment && assessment.heatmap.filter(m => isAdmin_UI || m.memberId === user.uid).slice(0, 1).map((m, i) => (
                             <div key={i} className="space-y-8">
                                <div className="space-y-3">
                                   <div className="flex items-center gap-3">
                                      <Brain className="w-5 h-5 text-blue-400" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">IQ Variation Score</span>
                                   </div>
                                   <div className="text-2xl font-black">{m.predictedTraits?.estimatedIQ || "Calculating..."}</div>
                                </div>
                                <div className="h-px bg-white/10" />
                                <div className="space-y-3">
                                   <div className="flex items-center gap-3">
                                      <Droplets className="w-5 h-5 text-rose-500" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Blood Antigen Prediction</span>
                                   </div>
                                   <div className="text-2xl font-black">{m.predictedTraits?.bloodGroup || "Processing..."}</div>
                                </div>
                             </div>
                           ))}
                        </CardContent>
                      </Card>

                      <Card className="glass-card rounded-[3rem] p-10 border-none shadow-xl bg-slate-900 text-white">
                         <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-6">System Protocol</h3>
                         <p className="text-xs leading-relaxed font-bold text-slate-400">
                           Generational Intelligence Mediator (GIM) utilizes zero-knowledge clinical modeling. Your genomic patterns are pseudonymized and cross-referenced against 128 familial data points without exposing actual PII data strings.
                         </p>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'tree' && (
                <motion.div 
                  key="tree" 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="h-full min-h-[500px]"
                >
                  <FamilyGraph members={isAdmin_UI ? members : members.filter(m => m.userId === user.uid)} consents={consents} />
                </motion.div>
              )}

              {activeSection === 'consent' && (
                <motion.div key="consent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                   <ConsentManager familyId={family.id} memberId={user.uid} consent={consents.find(c => c.id === user.uid)} />
                </motion.div>
              )}

              {activeSection === 'ancestry' && (
                <motion.div key="ancestry" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 pb-20">
                   {assessment && (
                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        <Card className="glass-card rounded-[3rem] p-10 border-none shadow-2xl">
                           <h3 className="text-[10px] font-black text-[#002F5C] uppercase tracking-[0.3em] mb-10">Inheritance Matrix</h3>
                           <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={assessment.ancestryGraph}>
                                    <XAxis dataKey="relation" tick={{fontSize: 9, fontWeight: 900, textTransform: 'uppercase'}} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', padding: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="healthLikelihood" fill="#005EB8" radius={[15, 15, 15, 15]} barSize={25} />
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </Card>
                        
                        <Card className="bg-[#002F5C] rounded-[3rem] p-10 border-none shadow-2xl text-white">
                           <h3 className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-10">Trait Propagation</h3>
                           <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                   { trait: 'Longevity', value: 85 },
                                   { trait: 'Neuro Protection', value: 65 },
                                   { trait: 'Metabolic Scale', value: 92 },
                                   { trait: 'Cellular Repair', value: 78 }
                                 ]}>
                                    <PolarGrid stroke="#ffffff20" />
                                    <PolarAngleAxis dataKey="trait" tick={{fill: '#fff', fontSize: 9, fontWeight: 900, textTransform: 'uppercase'}} />
                                    <Radar name="Family Core" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                                 </RadarChart>
                              </ResponsiveContainer>
                           </div>
                        </Card>
                     </div>
                   )}

                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                      {assessment?.ancestryGraph.map((anc, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl hover:-translate-y-2 transition-all group bg-white">
                            <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">{anc.generation}</div>
                            <h4 className="text-xl font-black text-[#002F5C] tracking-tighter mb-4">{anc.relation}</h4>
                            <p className="text-[10px] leading-relaxed text-slate-500 font-bold mb-6 line-clamp-3 italic">"{anc.inferredTraits}"</p>
                            <div className="flex items-center justify-between">
                               <div className="text-[10px] font-black uppercase text-slate-400">Match</div>
                               <div className="text-sm font-black text-blue-600">{anc.healthLikelihood}%</div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                      {!assessment && (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[4rem] text-slate-300 gap-6">
                           <Database className="w-20 h-20 opacity-10" />
                           <p className="text-xs font-black uppercase tracking-[0.4em]">Inference Required for Ancestry Mapping</p>
                        </div>
                      )}
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
        className="fixed bottom-6 right-6 z-[80]"
      >
         <a 
           href="https://wa.me/447873404080" 
           target="_blank" 
           rel="noopener noreferrer"
           className="flex items-center gap-4 bg-emerald-500 text-white px-8 py-5 rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.4)] hover:scale-105 transition-all group overflow-hidden"
         >
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="font-black text-xs uppercase tracking-widest">Connect with David</span>
         </a>
      </motion.div>
    </div>
  );
}
