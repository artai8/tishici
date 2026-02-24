import React, { useState, useEffect } from 'react';
import IdeaInput from './components/IdeaInput';
import StoryboardEditor from './components/StoryboardEditor';
import PromptWorkbench from './components/PromptWorkbench';
import { ProjectData, AIModel } from './types';
import { generateScriptFromIdea, generatePromptsForShots, setApiKey } from './services/geminiService';
import { AlertCircle, Key } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<'idea' | 'editor' | 'prompts'>('idea');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState('');

  const apiKey = process.env.API_KEY;

  useEffect(() => {
    if ((!apiKey || apiKey === '__GEMINI_API_KEY_RUNTIME__') && !manualApiKey) {
      setError("Missing API Key. Please set GEMINI_API_KEY in your environment or enter it below.");
    }
  }, [apiKey, manualApiKey]);

  const handleManualApiKeySubmit = () => {
    if (manualApiKey.trim()) {
      setApiKey(manualApiKey.trim());
      setError(null);
    }
  };

  const handleGenerateScript = async (idea: string, shotCount: number, model: AIModel) => {
    setLoading(true);
    setError(null);
    try {
      const partialData = await generateScriptFromIdea(idea, shotCount, model);
      
      const initialProjectData: ProjectData = {
        title: partialData.title || "Untitled Project",
        settings: partialData.settings || { overview: "", style: "" },
        characters: partialData.characters || [],
        scenes: partialData.scenes || [],
        script: partialData.script || [],
        imagePrompts: {},
        videoPrompts: {}
      };

      setProjectData(initialProjectData);
      setStep('editor');
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate script. Please try again. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    if (!projectData) return;
    setLoading(true);
    setError(null);
    try {
      const prompts = await generatePromptsForShots(projectData.script, projectData.settings, 'gemini-3-flash-preview');
      
      setProjectData(prev => prev ? ({
        ...prev,
        imagePrompts: prompts.imagePrompts,
        videoPrompts: prompts.videoPrompts
      }) : null);

      setStep('prompts');
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate prompts. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  if (error && !projectData) {
     return (
        <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-surface border border-red-900/50 p-6 rounded-xl flex flex-col gap-4">
               <div className="flex items-start gap-4 text-red-200">
                 <AlertCircle className="shrink-0" />
                 <div>
                   <h3 className="font-bold mb-1">Error</h3>
                   <p className="text-sm">{error}</p>
                 </div>
               </div>
               
               {(error.includes("API Key") || error.includes("Missing API Key")) && (
                  <div className="mt-2 space-y-2">
                    <label className="text-xs font-bold uppercase text-textMuted">Enter Gemini API Key Manually</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-2 top-1/2 -translate-y-1/2 text-textMuted" size={14} />
                        <input 
                          type="password" 
                          placeholder="AIzaSy..." 
                          className="w-full bg-background border border-border rounded px-8 py-2 text-sm text-textMain focus:ring-1 focus:ring-primary outline-none"
                          value={manualApiKey}
                          onChange={(e) => setManualApiKey(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={handleManualApiKeySubmit}
                        className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded text-sm font-bold transition-colors"
                      >
                        Set Key
                      </button>
                    </div>
                    <p className="text-xs text-textMuted">Your key is stored in memory only and not saved.</p>
                  </div>
               )}

               {!error.includes("API Key") && (
                 <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-900/50 rounded hover:bg-red-900 transition text-red-100 self-start">Retry</button>
               )}
            </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-background text-textMain font-sans selection:bg-primary selection:text-white">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10">
        {step === 'idea' && (
          <div className="min-h-screen flex items-center justify-center">
            <IdeaInput onGenerate={handleGenerateScript} isLoading={loading} />
          </div>
        )}

        {step === 'editor' && projectData && (
          <StoryboardEditor 
            projectData={projectData} 
            setProjectData={setProjectData} 
            onNext={handleGeneratePrompts}
            isGeneratingPrompts={loading}
          />
        )}

        {step === 'prompts' && projectData && (
          <PromptWorkbench 
            projectData={projectData}
            setProjectData={setProjectData}
          />
        )}
      </div>

      {loading && step === 'editor' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
           <div className="bg-surface border border-border p-8 rounded-2xl shadow-2xl text-center max-w-sm">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Crafting Prompts</h3>
              <p className="text-textMuted">Translating your storyboard into high-fidelity AI instructions...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
