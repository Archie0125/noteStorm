import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { AIPersona } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { fetchModelsFromGoogle, FALLBACK_MODELS, DEFAULT_MODEL, type GeminiModelInfo } from '../services/ai';
import { useI18n } from '../i18n';

interface PersonaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: AIPersona[];
  apiKey: string;
  model: string;
  onSave: (personas: AIPersona[], apiKey: string, model: string) => void;
}

export const PersonaSettingsModal: React.FC<PersonaSettingsModalProps> = ({
  isOpen,
  onClose,
  personas: initialPersonas,
  apiKey: initialApiKey,
  model: initialModel,
  onSave,
}) => {
  const { t } = useI18n();
  const [personas, setPersonas] = useState<AIPersona[]>(initialPersonas);
  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [model, setModel] = useState<string>(initialModel || DEFAULT_MODEL);
  const [models, setModels] = useState<GeminiModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPersonas(initialPersonas);
      setApiKey(initialApiKey);
      setModel(initialModel || DEFAULT_MODEL);
    }
  }, [isOpen, initialPersonas, initialApiKey, initialModel]);

  const loadModels = useCallback(async (key?: string) => {
    const k = key ?? apiKey;
    if (!k?.trim()) return;
    setLoadingModels(true);
    try {
      const list = await fetchModelsFromGoogle(k);
      setModels(list.length > 0 ? list : FALLBACK_MODELS.map((m) => ({ id: m.id, name: m.name })));
      setModel((prev) => {
        const nextList = list.length > 0 ? list : FALLBACK_MODELS.map((m) => ({ id: m.id, name: m.name }));
        return nextList.some((m) => m.id === prev) ? prev : nextList[0]?.id ?? prev;
      });
    } finally {
      setLoadingModels(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialApiKey?.trim()) {
      loadModels(initialApiKey);
    } else {
      setModels(FALLBACK_MODELS.map((m) => ({ id: m.id, name: m.name })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddPersona = () => {
    const newPersona: AIPersona = {
      id: uuidv4(),
      name: 'New Persona',
      role: 'Advisor',
      tone: 'Helpful and direct.',
      color: '#6b7280',
    };
    setPersonas([...personas, newPersona]);
  };

  const handleUpdatePersona = (id: string, updates: Partial<AIPersona>) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeletePersona = (id: string) => {
    setPersonas(personas.filter(p => p.id !== id));
  };

  const handleSave = () => {
    onSave(personas, apiKey, model);
    onClose();
  };

  const displayModels = models.length > 0 ? models : FALLBACK_MODELS.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-900">{t('personaSettings')}</h2>
            <p className="text-xs text-gray-500">{t('personaSettingsDesc')}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50 flex-1">
          {/* API Key + Model Section (merged) */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">{t('geminiApiKey')}</label>
              <p className="text-xs text-gray-500 mb-3">{t('geminiApiKeyDesc')}</p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="AIzaSy..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">{t('modelSelection')}</label>
              <p className="text-xs text-gray-500 mb-3">{t('modelSelectionDesc')}</p>
              <div className="flex gap-2">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  disabled={loadingModels}
                >
                  {displayModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => loadModels()}
                  disabled={!apiKey?.trim() || loadingModels}
                  className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title={t('loadModels')}
                >
                  <RefreshCw size={16} className={loadingModels ? 'animate-spin' : ''} />
                  {loadingModels ? t('loadingModels') : t('loadModels')}
                </button>
              </div>
              {!apiKey?.trim() && (
                <p className="text-xs text-amber-600 mt-2">{t('enterApiKeyToLoadModels')}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('personas')}</h3>
            {personas.map((persona) => (
            <div key={persona.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex gap-4 items-start">
              <div className="flex flex-col gap-2 pt-1">
                <input 
                  type="color" 
                  value={persona.color}
                  onChange={(e) => handleUpdatePersona(persona.id, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  title="Persona Color"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('name')}</label>
                    <input
                      type="text"
                      value={persona.name}
                      onChange={(e) => handleUpdatePersona(persona.id, { name: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., The Skeptic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('role')}</label>
                    <input
                      type="text"
                      value={persona.role}
                      onChange={(e) => handleUpdatePersona(persona.id, { role: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Devil's Advocate"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('toneAndInstructions')}</label>
                  <textarea
                    value={persona.tone}
                    onChange={(e) => handleUpdatePersona(persona.id, { tone: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20"
                    placeholder="Describe how this persona should respond..."
                  />
                </div>
              </div>
              <button
                onClick={() => handleDeletePersona(persona.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"
                title="Delete Persona"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <button
            onClick={handleAddPersona}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            {t('addNewPersona')}
          </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save size={16} />
            {t('savePersonas')}
          </button>
        </div>
      </div>
    </div>
  );
};
