import { Node, Edge } from '@xyflow/react';

export function compileCanvasToJob(nodes: Node[], edges: Edge[]) {
  // Find storyboard nodes
  const storyboardNodes = nodes.filter(n => n.type === 'storyboard');
  
  // Extract beats from storyboards to avoid 'plan-only' downgrade
  const beats = storyboardNodes.map(node => {
    // Find connected characters and screenplays
    const connectedEdges = edges.filter(e => e.target === node.id || e.source === node.id);
    const connectedNodeIds = connectedEdges.map(e => e.target === node.id ? e.source : e.target);
    const connectedNodes = nodes.filter(n => connectedNodeIds.includes(n.id));

    const screenplays = connectedNodes.filter(n => n.type === 'screenplay');
    const characters = connectedNodes.filter(n => n.type === 'character');

    return {
      id: node.id,
      prompt: node.data?.prompt || '',
      screenplays: screenplays.map(s => s.data?.snippet),
      characters: characters.map(c => c.data?.imageUrl)
    };
  });

  return {
    id: `canvas-${Date.now()}`,
    intent: 'render' as const,
    status: 'pending',
    progress: 0,
    logs: {
      canvas: { nodes, edges },
      beats
    }
  };
}
