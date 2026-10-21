// @ts-nocheck
"use client"

import React, { useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function CameraAnimator() {
  useFrame(({ camera, clock }: any) => {
    const t = clock.getElapsedTime()
    // slow pan
    camera.position.x = Math.sin(t * 0.5) * 5
    camera.position.z = Math.cos(t * 0.5) * 5 + 10
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function PrevisPage() {
  const [script, setScript] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/workflows/previs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, aspectRatio }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }
      setMessage('Job queued successfully! ID: ' + data.jobId)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage('Error: ' + err.message)
      } else {
        setMessage('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex p-4 gap-4 flex-col lg:flex-row">
        {/* Form section */}
        <div className="w-full lg:w-1/3 p-4 bg-zinc-900 rounded-lg">
          <h1 className="text-2xl font-bold mb-4 text-white">3D Previs Engine</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2 text-sm text-zinc-300">Script / Prompt</label>
              <textarea 
                className="w-full p-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:outline-none focus:border-zinc-500 min-h-[150px]"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Describe your scene..."
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm text-zinc-300">Aspect Ratio</label>
              <select 
                className="w-full p-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:outline-none focus:border-zinc-500"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded mt-2 disabled:opacity-50"
            >
              {loading ? 'Queuing...' : 'Send to Queue'}
            </button>
            {message && <div className="mt-4 p-2 bg-zinc-800 rounded text-sm text-zinc-300">{message}</div>}
          </form>
        </div>
        
        {/* WebGL section */}
        <div className="w-full lg:w-2/3 min-h-[400px] bg-black rounded-lg overflow-hidden relative">
          <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <CameraAnimator />
            
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#444" />
            </mesh>

            {/* Stand-in actor cubes */}
            <mesh position={[-2, 1, 0]}>
              <boxGeometry args={[1, 2, 1]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>
            <mesh position={[2, 1, 0]}>
              <boxGeometry args={[1, 2, 1]} />
              <meshStandardMaterial color="cyan" />
            </mesh>
          </Canvas>
        </div>
      </div>
    </div>
  )
}
