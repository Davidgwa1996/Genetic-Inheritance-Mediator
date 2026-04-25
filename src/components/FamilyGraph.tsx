import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

interface FamilyGraphProps {
  members: any[];
  consents: any[];
}

export const FamilyGraph: React.FC<FamilyGraphProps> = ({ members, consents }) => {
  const nodes: Node[] = useMemo(() => {
    return members.map((m, i) => {
      const consent = consents.find(c => c.id === m.userId);
      const sharedCount = consent ? Object.values(consent).filter(v => v === true).length : 0;
      
      return {
        id: m.userId,
        data: { label: `${m.pseudonym} (${m.role})\nShared: ${sharedCount} flags` },
        position: { x: 250, y: i * 100 },
        style: { 
          background: m.role === 'admin' ? '#f0f9ff' : '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '10px',
          width: 200,
          textAlign: 'center',
          fontSize: '12px'
        }
      };
    });
  }, [members, consents]);

  const edges: Edge[] = useMemo(() => {
    // Basic vertical lines for now to show connectivity in the graph
    const e: Edge[] = [];
    for (let i = 0; i < members.length - 1; i++) {
      e.push({
        id: `e${i}-${i+1}`,
        source: members[i].userId,
        target: members[i+1].userId,
        animated: true,
        style: { stroke: '#94a3b8' }
      });
    }
    return e;
  }, [members]);

  return (
    <div style={{ width: '100%', height: '400px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#f1f5f9" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
