import React, { useState } from 'react';
import { ProjectData, Shot, Character, Scene, AIModel } from '../types';
import { Edit2, User, MapPin, Film, Save, RefreshCw, Wand2 } from 'lucide-react';
import { refineField } from '../services/geminiService';

interface StoryboardEditorProps {
  projectData: ProjectData;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  onNext: () => void;
  isGeneratingPrompts: boolean;
}

const StoryboardEditor: React.FC<StoryboardEditorProps> = ({ projectData, setProjectData, onNext, isGeneratingPrompts }) => {
  const [view, setView] = useState<'script' | 'details'>('script');
  const [editingField, setEditingField] = useState<{ id: number | string, field: string } | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Group shots into chunks of 4 for grid visualization logic
  const shotGroups = [];
  for (let i = 0; i < projectData.script.length; i += 4) {
    shotGroups.push(projectData.script.slice(i, i + 4));
  }

  const handleTextChange = (id: number, field: keyof Shot, value: string) => {
    setProjectData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        script: prev.script.map(s => s.id === id ? { ...s, [field]: value } : s)
      };
    });
  };

  const handleRefine = async (id: number, field: keyof Shot, currentValue: string) => {
    if (!refinementPrompt) return;
    setIsRefining(true);
    try {
      const refinedText = await refineField(
        currentValue, 
        refinementPrompt, 
        `Shot ID: ${id}. Global Style: ${projectData.settings.style}`,
        'gemini-3-flash-preview'
      );
      handleTextChange(id, field, refinedText);
      setEditingField(null);
      setRefinementPrompt('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefining(false);
    }
  };

  const RenderScriptView = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border p-4 rounded-xl">
            <h3 className="text-sm uppercase font-bold text-textMuted mb-2">Overview</h3>
            <textarea 
                className="w-full bg-background border border-border rounded p-2 text-sm text-textMain h-24 resize-none"
                value={projectData.settings.overview}
                onChange={(e) => setProjectData(prev => prev ? {...prev, settings: {...prev.settings, overview: e.target.value}} : null)}
            />
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl">
            <h3 className="text-sm uppercase font-bold text-textMuted mb-2">Visual Style</h3>
            <textarea 
                className="w-full bg-background border border-border rounded p-2 text-sm text-textMain h-24 resize-none"
                value={projectData.settings.style}
                onChange={(e) => setProjectData(prev => prev ? {...prev, settings: {...prev.settings, style: e.target.value}} : null)}
            />
        </div>
      </div>

      <div className="space-y-6">
        {shotGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-surfaceHighlight px-4 py-2 border-b border-border flex justify-between items-center">
              <span className="font-bold text-sm text-textMuted">Group {groupIndex + 1} (Shots {group[0].id}-{group[group.length-1].id})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {group.map((shot) => (
                <div key={shot.id} className="bg-background border border-border rounded-lg p-4 flex flex-col gap-3 relative group hover:border-primary/50 transition-colors">
                   <div className="flex justify-between items-start">
                     <span className="bg-surfaceHighlight text-xs font-mono px-2 py-1 rounded text-textMuted">#{shot.id}</span>
                     
                   </div>
                   
                   {/* Description Field */}
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs text-textMuted">
                        <span>Visual Description</span>
                        <button onClick={() => setEditingField({id: shot.id, field: 'description'})} className="opacity-0 group-hover:opacity-100 hover:text-primary"><Wand2 size={12}/></button>
                      </div>
                      {editingField?.id === shot.id && editingField?.field === 'description' ? (
                        <div className="space-y-2">
                           <textarea 
                              className="w-full bg-surface p-2 text-sm rounded border border-primary focus:outline-none"
                              rows={3}
                              value={shot.description}
                              onChange={(e) => handleTextChange(shot.id, 'description', e.target.value)}
                           />
                           <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="Refine instruction..." 
                                className="flex-1 bg-surface border border-border text-xs px-2 rounded"
                                value={refinementPrompt}
                                onChange={e => setRefinementPrompt(e.target.value)}
                              />
                             <button onClick={() => handleRefine(shot.id, 'description', shot.description)} className="text-xs bg-primary px-2 py-1 rounded text-white" disabled={isRefining}>
                               {isRefining ? '...' : 'AI Refine'}
                             </button>
                             <button onClick={() => setEditingField(null)} className="text-xs bg-surfaceHighlight px-2 py-1 rounded">Done</button>
                           </div>
                        </div>
                      ) : (
                        <p className="text-sm text-textMain leading-relaxed min-h-[3rem]">{shot.description}</p>
                      )}
                   </div>

                   {/* Movement Field */}
                   <div className="space-y-1">
                      <span className="text-xs text-textMuted block">Camera / Movement</span>
                      <input 
                        className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-xs text-blue-300 py-1"
                        value={shot.movement}
                        onChange={(e) => handleTextChange(shot.id, 'movement', e.target.value)}
                      />
                   </div>

                    {/* Voiceover Field */}
                   <div className="bg-surfaceHighlight/30 p-2 rounded text-xs text-textMuted italic border border-transparent focus-within:border-border">
                      <span className="not-italic text-[10px] uppercase text-zinc-500 block mb-1">Audio/VO</span>
                      <textarea
                        className="w-full bg-transparent outline-none resize-none h-auto"
                        rows={2}
                        value={shot.voiceover}
                        onChange={(e) => handleTextChange(shot.id, 'voiceover', e.target.value)}
                      />
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const RenderDetailsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
       {/* Characters */}
       <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><User size={20}/> Characters</h2>
          <div className="space-y-3">
            {projectData.characters.map((char) => (
              <div key={char.id} className="bg-surface border border-border p-4 rounded-xl flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {char.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <input 
                      className="bg-transparent font-bold text-textMain outline-none w-full mb-1" 
                      value={char.name} 
                      onChange={e => {
                        const newChars = projectData.characters.map(c => c.id === char.id ? {...c, name: e.target.value} : c);
                        setProjectData(prev => prev ? {...prev, characters: newChars} : null);
                      }}
                    />
                    <textarea 
                      className="bg-transparent text-sm text-textMuted outline-none w-full resize-none h-20"
                      value={char.description}
                      onChange={e => {
                        const newChars = projectData.characters.map(c => c.id === char.id ? {...c, description: e.target.value} : c);
                        setProjectData(prev => prev ? {...prev, characters: newChars} : null);
                      }}
                    />
                  </div>
              </div>
            ))}
          </div>
       </div>

       {/* Scenes */}
       <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin size={20}/> Scenes</h2>
          <div className="space-y-3">
            {projectData.scenes.map((scene) => (
              <div key={scene.id} className="bg-surface border border-border p-4 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <input 
                      className="bg-transparent font-bold text-textMain outline-none w-full" 
                      value={scene.name} 
                      onChange={e => {
                        const newScenes = projectData.scenes.map(s => s.id === scene.id ? {...s, name: e.target.value} : s);
                        setProjectData(prev => prev ? {...prev, scenes: newScenes} : null);
                      }}
                    />
                 </div>
                 <textarea 
                      className="bg-transparent text-sm text-textMuted outline-none w-full resize-none h-20 bg-background/30 p-2 rounded"
                      value={scene.description}
                      onChange={e => {
                        const newScenes = projectData.scenes.map(s => s.id === scene.id ? {...s, description: e.target.value} : s);
                        setProjectData(prev => prev ? {...prev, scenes: newScenes} : null);
                      }}
                  />
              </div>
            ))}
          </div>
       </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold text-textMain">{projectData.title}</h2>
          <p className="text-textMuted text-sm">Review and edit your storyboard before generating prompts.</p>
        </div>
        <div className="flex bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => setView('script')}
            className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 ${view === 'script' ? 'bg-surfaceHighlight text-white' : 'text-textMuted hover:text-white'}`}
          >
            <Film size={16} /> Script
          </button>
          <button
             onClick={() => setView('details')}
             className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 ${view === 'details' ? 'bg-surfaceHighlight text-white' : 'text-textMuted hover:text-white'}`}
          >
            <User size={16} /> Characters & Scenes
          </button>
        </div>
      </header>

      {view === 'script' ? <RenderScriptView /> : <RenderDetailsView />}

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surfaceHighlight/90 backdrop-blur-md border border-border/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50">
        <span className="text-sm font-medium text-textMuted hidden md:block">
          {projectData.script.length} shots ready
        </span>
        <div className="h-4 w-[1px] bg-border hidden md:block"></div>
        <button className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
           <Save size={16} /> Save Draft
        </button>
        <button 
          onClick={onNext}
          disabled={isGeneratingPrompts}
          className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all"
        >
          {isGeneratingPrompts ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
          Generate Prompts
        </button>
      </div>
    </div>
  );
};

export default StoryboardEditor;
