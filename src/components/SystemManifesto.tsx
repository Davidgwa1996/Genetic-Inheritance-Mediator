import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, TreeDeciduous, Heart, UserPlus, Info } from 'lucide-react';

export const SystemManifesto: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.3em] mb-4">The System Manifesto</h2>
            <p className="text-5xl font-black text-[#002F5C] tracking-tighter leading-tight">
              A Family Health Tree That <br />
              <span className="text-blue-500">Thinks and Remembers.</span>
            </p>
          </div>

          <div className="grid md:grid-cols-1 gap-12">
            
            {/* The Flow */}
            <div className="space-y-8">
              <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
                <h3 className="text-xl font-black text-[#002F5C] mb-6 flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                  1. Simple Flow: Your Health "Bank Account"
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  We treat your health data like money in a bank. You open your private vault (Sign Up), 
                  put in your family stories (Data Input), and the system uses its "Digital Brain" (AI) 
                  to tell you how to keep your health "wealth" safe for years to come. It’s a simple 
                  system built so that everyone—from students to grandparents—can protect their future.
                </p>
              </div>

              <div className="p-8 bg-blue-50 rounded-[3rem] border border-blue-100">
                <h3 className="text-xl font-black text-[#002F5C] mb-6 flex items-center gap-3">
                  <Heart className="w-6 h-6 text-red-500" />
                  2. Essential Data: The Magic Ingredients
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium mb-4">
                  Think of the system like a chef. To give you the best meal (Health Report), it needs the best ingredients:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "Known family illnesses (Heart, Sugar, Blood)",
                    "Bio-Markers (Age, Blood Group, Gender)",
                    "Ancestry (Where your family originated)",
                    "Lifestyle (Daily habits and environment)"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 bg-[#002F5C] rounded-[3rem] text-white shadow-2xl">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  3. The Technical Blueprint (For Recruiters)
                </h3>
                <div className="space-y-6">
                  <p className="opacity-80 leading-relaxed font-medium">
                    Gen-Nexus is a high-performance, full-stack application built for the intersection of Biometric Data and AI.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Frontend Stack</h4>
                      <p className="text-xs opacity-70">React 18 + Vite, TypeScript, Tailwind CSS, Framer Motion for high-fidelity interactive state management.</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Backend & AI</h4>
                      <p className="text-xs opacity-70">Firebase (Firestore + Auth) with custom Security Rules. Neural Synthesis powered by Gemini 1.5 Pro API.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
                <h3 className="text-xl font-black text-[#002F5C] mb-6 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-amber-500" />
                  4. The Benefit: Closing the "Knowledge Gap"
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  We often don't know what our great-grandparents suffered from until it happens to us. 
                  This is the **Ancestral Knowledge Gap**. Gen-Nexus preserves this history forever in a secure, digital format. 
                  It allows you to warn your children about risks 20 years in advance, changing "I wish we knew" into "We know exactly what to do."
                </p>
              </div>
            </div>

          </div>
          
          <div className="mt-16 p-8 bg-blue-600 rounded-[2.5rem] text-center text-white">
             <p className="text-sm font-bold uppercase tracking-[0.2em] mb-2 opacity-70 italic">Recruiter Dispatch</p>
             <p className="text-lg font-bold">A full-stack architecture combining Biometric Analysis with Genetic Graphing. Built with React, Tailwind, and Firebase Security Pillars.</p>
          </div>

        </div>
      </div>
    </section>
  );
};
