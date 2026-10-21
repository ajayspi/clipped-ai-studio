"use client";

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ScreenplayNode } from './nodes/ScreenplayNode';
import { CharacterNode } from './nodes/CharacterNode';
import { StoryboardNode } from './nodes/StoryboardNode';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({
    screenplay: ScreenplayNode,
    character: CharacterNode,
    storyboard: StoryboardNode,
  }), []);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { 
        onChange: (val: string) => {
          setNodes((nds) => nds.map((n) => {
            if (n.id === `${type}-${Date.now()}`) {
              // Wait, in map we need the actual node ID. The closure over `newNode.id` would be better.
              // Actually, since we update data, let's keep it simple: we can update nodes array.
            }
            return n;
          }));
        }
      },
    };
    
    // Better onChange implementation
    newNode.data.onChange = (val: string) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === newNode.id) {
                if (type === 'screenplay') return { ...n, data: { ...n.data, snippet: val } };
                if (type === 'character') return { ...n, data: { ...n.data, imageUrl: val } };
                if (type === 'storyboard') return { ...n, data: { ...n.data, prompt: val } };
            }
            return n;
        }));
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleCompile = async () => {
    try {
      const response = await fetch('/api/workflows/canvas-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      if (!response.ok) {
        throw new Error('Failed to compile to job');
      }
      alert('Job successfully compiled and enqueued!');
    } catch (error) {
      console.error(error);
      alert('Error compiling job');
    }
  };

  return (
    <div style={{ width: '100%', height: '80vh', border: '1px solid #333', borderRadius: '12px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        <Panel position="top-right" className="flex flex-col gap-2 bg-white p-4 rounded shadow-md border border-gray-200">
          <div className="font-bold mb-2">Toolbar</div>
          <button 
            onClick={() => addNode('screenplay')} 
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-all font-medium text-sm"
          >
            + Screenplay Node
          </button>
          <button 
            onClick={() => addNode('character')} 
            className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-all font-medium text-sm"
          >
            + Character Node
          </button>
          <button 
            onClick={() => addNode('storyboard')} 
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-all font-medium text-sm"
          >
            + Storyboard Node
          </button>
          <hr className="my-2" />
          <button 
            onClick={handleCompile}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md transition-all font-bold text-sm"
          >
            Compile to Job
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
