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
    return members?.map((m, i) => {
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
                  ? 'bg-blue-900 border-blue-400 text-white shadow-blue-200' 
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
                     <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{m.pseudonym}</p>
                     <p className={`text-[8px] uppercase font-bold opacity-60`}>{m.role}</p>
                  </div>
               </div>
               <div className="h-px bg-current opacity-10 my-2" />
               <div className="flex justify-between items-center text-[8px] font-mono">
                  <span className="flex items-center gap-1 opacity-70"><Heart className="w-2 h-2 text-rose-500" /> SYNC</span>
                  <span className={`${isRevoked ? 'text-rose-600 font-black' : 'text-emerald-500'} flex items-center gap-1`}>
                    <Lock className="w-2 h-2" /> {isRevoked ? 'REVOKED' : 'LIVE'}
                  </span>
               </div>
            </div>
          )
        },
        position: { x: 250, y: i * 140 },
        style: { padding: 0, border: 'none', background: 'transparent', width: 220 }
      };
    });
  }, [members, consents]);

  const edges: Edge[] = useMemo(() => {
    const e: Edge[] = [];
    for (let i = 0; i < members.length - 1; i++) {
      const sourceId = members[i].id;
      const targetId = members[i+1].id;
      e.push({
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        animated: true,
        style: { stroke: '#002F5C', strokeWidth: 3, opacity: 0.2 },
        label: "Inheritance Link",
        labelStyle: { fill: '#002F5C', fontWeight: 900, fontSize: 8, textTransform: 'uppercase' }
      });
    }
    return e;
  }, [members]);

  return (
    <div className="w-full h-full bg-slate-50/50 rounded-[3rem] overflow-hidden border border-slate-200">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#cbd5e1" gap={20} />
        <Controls className="fill-blue-900 border-none shadow-xl" />
        <MiniMap nodeColor={(n) => n.id === members[0]?.userId ? '#3b82f6' : '#cbd5e1'} />
      </ReactFlow>
    </div>
  );
};
