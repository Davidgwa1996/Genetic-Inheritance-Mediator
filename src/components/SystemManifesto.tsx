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
                  1. How It Works (The Connection)
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Imagine if your family had a secret book where everyone wrote down how they stayed healthy or when they got sick. 
                  This system is like that, but smarter. You join, add your parents, grandparents, and children, and tell the system a little bit about their health. 
                  It then uses advanced technology to "connect the dots," creating a digital map of your family’s life.
                </p>
              </div>

              <div className="p-8 bg-blue-50 rounded-[3rem] border border-blue-100">
                <h3 className="text-xl font-black text-[#002F5C] mb-6 flex items-center gap-3">
                  <Heart className="w-6 h-6 text-red-500" />
                  2. What to Feed It (The Best Results)
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium mb-4">
                  To get the best "crystal ball" view of your health, the system needs simple but essential ingredients:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "Known family illnesses (Heart, Sugar, Blood)",
                    "Basic Bio-Markers (Age, Blood Group)",
                    "Lifestyle Habits (Smoking, Fitness)",
                    "Ancestral Origins (Where your people come from)"
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
                  <Zap className="w-6 h-6 text-amber-400" />
                  3. The Gap It Closes (The Great Benefit)
                </h3>
                <p className="opacity-80 leading-relaxed font-medium mb-6">
                  Most of us don't know exactly what our great-grandparents struggled with. We live in a "Knowledge Gap." 
                  This system closes that gap by preserving history. It helps you see a problem 10 years before it happens, 
                  giving you and your doctors a head start to prevent it. It’s like having a lighthouse for your health journey.
                </p>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">Benefit A</h4>
                    <p className="text-xs font-bold leading-tight">Early warning signs for the next generation.</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">Benefit B</h4>
                    <p className="text-xs font-bold leading-tight">Secure, private vault that never forgets.</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
                <h3 className="text-xl font-black text-[#002F5C] mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-emerald-500" />
                  4. How to Access (The Doorway)
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  You can access your family portal from any phone or computer. You own your data. 
                  You choose who sees it. It is built for ease of use—no complex science degrees required. 
                  Just sign in with your Google account or email, and start building your family's health legacy today.
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
