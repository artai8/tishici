import React, { useState } from 'react';
import { ProjectData, ImagePrompt } from '../types';
import { Copy, Check, Video, Image as ImageIcon, Download } from 'lucide-react';

interface PromptWorkbenchProps {
  projectData: ProjectData;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
}

const PromptWorkbench: React.FC<PromptWorkbenchProps> = ({ projectData }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData.title.replace(/\s+/g, '_').toLowerCase()}_project.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTxtExport = () => {
    let content = `Project: ${projectData.title}\n\n`;
    projectData.script.forEach(shot => {
        const imgP = projectData.imagePrompts[shot.id];
        const vidP = projectData.videoPrompts[shot.id];
        content += `--- Shot ${shot.id} ---\n`;
        content += `Desc: ${shot.description}\n`;
        if (imgP) content += `Midjourney: ${imgP.fullPrompt}\n`;
        if (vidP) content += `Video Gen: ${vidP.prompt}\n`;
        content += `\n`;
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData.title.replace(/\s+/g, '_').toLowerCase()}_prompts.txt`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 h-screen flex flex-col">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-textMain">Prompt Workbench</h2>
          <p className="text-textMuted text-sm">Refine and export your generative AI prompts.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExport} className="px-4 py-2 bg-surface border border-border rounded text-sm hover:bg-surfaceHighlight transition-colors flex items-center gap-2">
                <Download size={14}/> JSON
            </button>
            <button onClick={handleTxtExport} className="px-4 py-2 bg-surface border border-border rounded text-sm hover:bg-surfaceHighlight transition-colors flex items-center gap-2">
                <Download size={14}/> TXT
            </button>
        </div>
      </header>

      <div className="bg-surface border border-border rounded-lg p-1 flex shrink-0 max-w-md">
         <button 
           onClick={() => setActiveTab('image')}
           className={`flex-1 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'image' ? 'bg-indigo-600 text-white shadow' : 'text-textMuted hover:text-white'}`}
         >
           <ImageIcon size={16}/> Midjourney (Images)
         </button>
         <button 
           onClick={() => setActiveTab('video')}
           className={`flex-1 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'video' ? 'bg-indigo-600 text-white shadow' : 'text-textMuted hover:text-white'}`}
         >
           <Video size={16}/> Runway/Kling (Video)
         </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {projectData.script.map((shot) => {
            const imgPrompt = projectData.imagePrompts[shot.id];
            const vidPrompt = projectData.videoPrompts[shot.id];

            if (!imgPrompt && !vidPrompt) return null;

            return (
                <div key={shot.id} className="bg-surface border border-border rounded-xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4">
                        <span className="bg-surfaceHighlight text-xs font-mono px-2 py-1 rounded text-textMuted mb-2 inline-block">Shot {shot.id}</span>
                        <p className="text-sm text-textMain mb-2 font-medium">{shot.description}</p>
                        <p className="text-xs text-textMuted italic">{shot.movement}</p>
                    </div>

                    <div className="md:col-span-9 space-y-4">
                        {activeTab === 'image' && imgPrompt && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <div className="bg-background p-2 rounded border border-border">
                                        <span className="text-zinc-500 block text-[10px] uppercase">Subject</span>
                                        <span className="text-zinc-300 truncate block" title={imgPrompt.subject}>{imgPrompt.subject}</span>
                                    </div>
                                    <div className="bg-background p-2 rounded border border-border">
                                        <span className="text-zinc-500 block text-[10px] uppercase">Environment</span>
                                        <span className="text-zinc-300 truncate block" title={imgPrompt.environment}>{imgPrompt.environment}</span>
                                    </div>
                                    <div className="bg-background p-2 rounded border border-border">
                                        <span className="text-zinc-500 block text-[10px] uppercase">Lighting</span>
                                        <span className="text-zinc-300 truncate block" title={imgPrompt.lighting}>{imgPrompt.lighting}</span>
                                    </div>
                                    <div className="bg-background p-2 rounded border border-border">
                                        <span className="text-zinc-500 block text-[10px] uppercase">Camera</span>
                                        <span className="text-zinc-300 truncate block" title={imgPrompt.camera}>{imgPrompt.camera}</span>
                                    </div>
                                </div>
                                <div className="bg-background border border-border rounded-lg p-3 relative group">
                                    <p className="text-sm text-indigo-300 font-mono break-all pr-8">{imgPrompt.fullPrompt}</p>
                                    <button 
                                      onClick={() => handleCopy(imgPrompt.fullPrompt, shot.id)}
                                      className="absolute top-2 right-2 p-2 bg-surfaceHighlight rounded hover:bg-white/10 transition-colors"
                                    >
                                        {copiedId === shot.id ? <Check size={14} className="text-green-500"/> : <Copy size={14} className="text-textMuted"/>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'video' && vidPrompt && (
                            <div className="bg-background border border-border rounded-lg p-4 relative">
                                <p className="text-sm text-emerald-300 font-mono pr-8 leading-relaxed">{vidPrompt.prompt}</p>
                                <button 
                                      onClick={() => handleCopy(vidPrompt.prompt, shot.id)}
                                      className="absolute top-2 right-2 p-2 bg-surfaceHighlight rounded hover:bg-white/10 transition-colors"
                                    >
                                        {copiedId === shot.id ? <Check size={14} className="text-green-500"/> : <Copy size={14} className="text-textMuted"/>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default PromptWorkbench;
