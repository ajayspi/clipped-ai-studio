import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export function StoryboardNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-purple-500 rounded-md p-4 w-64 shadow-md">
      <Handle type="target" position={Position.Left} id="target" />
      <div className="font-bold text-sm mb-2 text-purple-700">Storyboard Shot</div>
      <textarea 
        className="nodrag w-full h-24 p-2 text-xs border rounded resize-none mb-2"
        placeholder="Shot description / prompt..."
        defaultValue={data.prompt as string}
        onChange={(e) => {
          if (data.onChange) {
            (data.onChange as (val: string) => void)(e.target.value);
          }
        }}
      />
      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded text-center border border-dashed border-gray-300">
        Generated Image Preview
      </div>
      <Handle type="source" position={Position.Right} id="source" />
    </div>
  );
}
