import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export function CharacterNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-green-500 rounded-md p-4 w-64 shadow-md">
      <div className="font-bold text-sm mb-2 text-green-700">Character Reference</div>
      <input 
        type="text"
        className="nodrag w-full p-2 text-xs border rounded mb-2"
        placeholder="Image URL or character description..."
        defaultValue={data.imageUrl as string}
        onChange={(e) => {
          if (data.onChange) {
            (data.onChange as (val: string) => void)(e.target.value);
          }
        }}
      />
      {typeof data.imageUrl === 'string' && data.imageUrl.startsWith('http') ? (
        <img src={data.imageUrl} alt="Character" className="w-full h-32 object-cover rounded mt-2" />
      ) : null}
      <Handle type="source" position={Position.Right} id="source" />
    </div>
  );
}
