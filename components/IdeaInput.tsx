import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { AIModel } from '../types';
import { analyzeImageIdea } from '../services/geminiService';

interface IdeaInputProps {
  onGenerate: (idea: string, shotCount: number, model: AIModel) => void;
  isLoading: boolean;
}

const IdeaInput: React.FC<IdeaInputProps> = ({ onGenerate, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'media'>('text');
  const [ideaText, setIdeaText] = useState('');
  const [shotCount, setShotCount] = useState(8);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3-pro-preview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        const analysis = await analyzeImageIdea(base64String, mimeType);
        setIdeaText(prev => prev ? `${prev}\n\n[Visual Analysis]: ${analysis}` : analysis);
        setActiveTab('text'); // Switch back to text to show result
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          AI Video Director Agent
        </h1>
        <p className="text-textMuted">Transform your raw ideas into professional storyboards and prompts.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-1 overflow-hidden flex shadow-lg">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 px-6 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'text' ? 'bg-surfaceHighlight text-white shadow-sm' : 'text-textMuted hover:text-white'
          }`}
        >
          <FileText size={18} /> Text Idea
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 px-6 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'media' ? 'bg-surfaceHighlight text-white shadow-sm' : 'text-textMuted hover:text-white'
          }`}
        >
          <ImageIcon size={18} /> Analyze Media
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-lg min-h-[400px] flex flex-col">
        {activeTab === 'text' ? (
          <div className="flex-1 flex flex-col gap-4">
             <label className="text-sm font-medium text-textMuted">Describe your video idea, plot, or visual style</label>
            <textarea
              className="flex-1 w-full bg-background border border-border rounded-lg p-4 text-textMain placeholder-textMuted focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-all"
              placeholder="E.g., A cyberpunk detective story set in Neo-Tokyo, following a robot searching for its creator..."
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-background/50 gap-4 p-8 hover:border-primary/50 transition-colors">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 className="animate-spin" size={32} />
                <p>Analyzing visual content with Gemini Vision...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center text-primary mb-2">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-medium">Upload Image or Video Frame</h3>
                <p className="text-textMuted text-center max-w-sm">
                  Upload a reference image to extract style, composition, and narrative elements automatically.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-6 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-colors"
                >
                  Select File
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 grid grid-cols-2 gap-4 w-full">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-textMuted tracking-wider">Shot Count</label>
              <select
                value={shotCount}
                onChange={(e) => setShotCount(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-textMain focus:ring-1 focus:ring-primary outline-none"
              >
                {[4, 8, 12, 16, 20, 24].map(n => (
                  <option key={n} value={n}>{n} Shots</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-textMuted tracking-wider">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-textMain focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="gemini-3-flash-preview">Gemini 3.0 Flash (Fast)</option>
                <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Smart)</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => onGenerate(ideaText, shotCount, selectedModel)}
            disabled={!ideaText || isLoading || isAnalyzing}
            className={`px-8 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-primary/20 ${
              !ideaText || isLoading ? 'bg-zinc-700 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-primary to-purple-600 hover:scale-[1.02]'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate Script
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdeaInput;
