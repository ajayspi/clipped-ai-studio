import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export function ScreenplayNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-indigo-500 rounded-md p-4 w-64 shadow-md">
      <div className="font-bold text-sm mb-2 text-indigo-700">Screenplay</div>
      <textarea 
        className="nodrag w-full h-32 p-2 text-xs border rounded resize-none"
        placeholder="Paste screenplay snippet here..."
        defaultValue={data.snippet as string}
        onChange={(e) => {
          if (data.onChange) {
            (data.onChange as (val: string) => void)(e.target.value);
          }
        }}
      />
      <Handle type="source" position={Position.Right} id="source" />
    </div>
  );
}
