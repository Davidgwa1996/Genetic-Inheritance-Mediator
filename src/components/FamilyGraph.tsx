import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Shield, User, Heart, Lock } from 'lucide-react';

interface FamilyGraphProps {
  members: any[];
  consents: any[];
}

export const FamilyGraph: React.FC<FamilyGraphProps> = ({ members, consents }) => {
  const nodes: Node[] = useMemo(() => {
    const realNodes = (members || []).map((m, i) => {
      const consent = consents?.find(c => c.id === m.userId);
      const isRevoked = consent?.isRevoked;
      
      return {
        id: m.id,
        data: { 
          label: (
            <div className={`p-4 rounded-2xl shadow-xl border-2 transition-all ${
              isRevoked 
                ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100' 
                : m.role === 'admin' 
                  ? 'bg-[#002F5C] border-blue-400 text-white shadow-blue-200' 
                  : 'bg-white border-slate-100 text-slate-900 shadow-slate-200'
            }`}>
               <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isRevoked 
                      ? 'bg-rose-500' 
                      : m.role === 'admin' 
                        ? 'bg-blue-500' 
                        : 'bg-slate-100'
                  }`}>
                     {isRevoked ? <Lock className="w-4 h-4 text-white" /> : m.role === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="text-left">
                     <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{m.fullName || m.pseudonym}</p>
                     <p className={`text-[8px] uppercase font-bold opacity-60`}>{m.role}</p>
                  </div>
               </div>
               <div className="h-px bg-current opacity-10 my-2" />
               <div className="flex justify-between items-center text-[8px] font-mono">
                  <span className="flex items-center gap-1 opacity-70"><Heart className="w-2 h-2 text-rose-500" /> PROBAND</span>
                  <span className={`${isRevoked ? 'text-rose-600 font-black' : 'text-emerald-500'} flex items-center gap-1`}>
                    <Lock className="w-2 h-2" /> {isRevoked ? 'REVOKED' : 'LIVE'}
                  </span>
               </div>
            </div>
          )
        },
        position: { x: 500, y: 1000 + (i * 180) },
        style: { padding: 0, border: 'none', background: 'transparent', width: 220 }
      };
    });

    const pastNodes = Array.from({ length: 5 }).map((_, i) => ({
      id: `past-${i}`,
      data: {
        label: (
          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300 opacity-50">
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-center font-mono">Ancestor G-{5 - i}</p>
            <div className="h-0.5 bg-slate-200 w-full mb-2" />
            <p className="text-[8px] font-bold text-center italic uppercase leading-none">Archived Records</p>
          </div>
        )
      },
      position: { x: 500, y: i * 140 },
      style: { padding: 0, border: 'none', background: 'transparent', width: 200 }
    }));

    const futureNodes = Array.from({ length: 5 }).map((_, i) => ({
      id: `future-${i}`,
      data: {
        label: (
          <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 text-blue-300">
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-center font-mono">Descendant G+{i + 1}</p>
            <div className="h-0.5 bg-blue-200 w-full mb-2" />
            <p className="text-[8px] font-bold text-center italic uppercase leading-none">Inference Model</p>
          </div>
        )
      },
      position: { x: 500, y: 2000 + (i * 140) },
      style: { padding: 0, border: 'none', background: 'transparent', width: 200 }
    }));

    return [...pastNodes, ...realNodes, ...futureNodes];
  }, [members, consents]);

  const edges: Edge[] = useMemo(() => {
    const e: Edge[] = [];
    const allIds = nodes.map(n => n.id);
    
    for (let i = 0; i < allIds.length - 1; i++) {
      e.push({
        id: `e-${allIds[i]}-${allIds[i+1]}`,
        source: allIds[i],
        target: allIds[i+1],
        animated: true,
        style: { stroke: i < 5 ? '#e2e8f0' : i >= (nodes.length - 6) ? '#3b82f6' : '#002F5C', strokeWidth: 2, opacity: 0.3 },
        label: i < 5 ? "Ancestry Flow" : i >= (nodes.length - 6) ? "Inference Flow" : "Live Nexus",
        labelStyle: { fill: '#64748b', fontWeight: 900, fontSize: 7, textTransform: 'uppercase' }
      });
    }
    return e;
  }, [nodes]);

  return (
    <div className="w-full h-full bg-slate-50/50 rounded-[3rem] overflow-hidden border border-slate-200 flex flex-col lg:flex-row relative">
      <div className="flex-1 h-full min-h-[600px] relative">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#cbd5e1" gap={20} />
          <Controls className="fill-blue-900 border-none shadow-xl" />
          <MiniMap nodeColor={(n) => n.id === members[0]?.userId ? '#3b82f6' : '#cbd5e1'} />
        </ReactFlow>
        
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
          <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl max-w-xs">
            <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Nexus Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#002F5C] border border-blue-400" />
                <span className="text-[9px] font-bold text-slate-600 uppercase">Proband (You)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-50 border-2 border-dashed border-slate-300" />
                <span className="text-[9px] font-bold text-slate-600 uppercase">Ancestral Node (Deep Fetch)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-50 border-2 border-dashed border-blue-300" />
                <span className="text-[9px] font-bold text-slate-600 uppercase">Inference Node (NextGen)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:w-80 b bg-white/80 backdrop-blur-xl border-l border-slate-100 p-8 overflow-y-auto max-h-[800px]">
        <div className="space-y-8">
           <div>
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Genetic Inheritance Guide</h3>
              <p className="text-xl font-black text-[#002F5C] tracking-tighter mb-4">Reading the Nexus</p>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Autosomal Dominant</p>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                       Passed directly from one parent. Visualized as a continuous vertical flow in the Nexus.
                    </p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Autosomal Recessive</p>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                       Skips generations. In the Nexus, these appear as "Ghost Connections" where markers reappear after a gap.
                    </p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">X-Linked</p>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                       Linked to biological sex chromosomes (X). Often follows a staggered lateral pattern.
                    </p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Mitochondrial</p>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                       Exclusively maternal. Represented by the central mitochondrial "Life-Line" in deep-fetch models.
                    </p>
                 </div>
              </div>
           </div>

           <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Linage Control</h4>
              <p className="text-sm font-bold mb-4">Reconstruct 5 more generations?</p>
              <button className="w-full h-12 bg-[#002F5C] hover:bg-black text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all">
                Deep Fetch Generations
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
