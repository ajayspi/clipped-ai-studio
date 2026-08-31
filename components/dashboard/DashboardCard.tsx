"use client";

import { Video, Download, Share2, Trash2, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { PublishModal } from "./PublishModal";
import { motion } from "framer-motion";

export function DashboardCard({ video }: { video: any }) {
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -4 }}
        className="break-inside-avoid relative group rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg"
      >
        {/* Thumbnail Area */}
        <div className="relative aspect-[9/16] bg-zinc-900 w-full overflow-hidden">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-30">
              <Video className="w-16 h-16 text-white" />
            </div>
          )}
          
          {/* Status Overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-2 py-1 bg-black/70 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
              {video.workflowType}
            </span>
          </div>
          
          {video.status === 'pending' || video.status === 'processing' ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-6">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary w-[45%] animate-pulse" />
              </div>
              <p className="text-xs font-medium text-center">Rendering... ~2 mins left</p>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                <Play className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
        
        {/* Metadata Area */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-sm line-clamp-1 mb-1">{video.title}</h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
            <span>{video.clipCount} clips</span>
          </div>
          
          {/* Hover Quick Actions */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-xs font-medium flex items-center gap-1.5 hover:text-primary transition-colors">
              <Download className="w-3.5 h-3.5" /> HD
            </button>
            <button 
              onClick={() => setIsPublishOpen(true)}
              className="text-xs font-medium flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      <PublishModal 
        isOpen={isPublishOpen} 
        onClose={() => setIsPublishOpen(false)} 
        jobId={video.id} 
        videoTitle={video.title} 
      />
    </>
  );
}
