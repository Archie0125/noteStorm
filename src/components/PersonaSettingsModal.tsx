import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { AIPersona } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PersonaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: AIPersona[];
  onSave: (personas: AIPersona[]) => void;
}

export const PersonaSettingsModal: React.FC<PersonaSettingsModalProps> = ({
  isOpen,
  onClose,
  personas: initialPersonas,
  onSave,
}) => {
  const [personas, setPersonas] = useState<AIPersona[]>(initialPersonas);

  if (!isOpen) return null;

  const handleAddPersona = () => {
    const newPersona: AIPersona = {
      id: uuidv4(),
      name: 'New Persona',
      role: 'Advisor',
      tone: 'Helpful and direct.',
      color: '#6b7280', // Default gray
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
    onSave(personas);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-900">AI Persona Settings</h2>
            <p className="text-xs text-gray-500">Customize the AI voices that review your notes</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 bg-gray-50/50 flex-1">
          {personas.map((persona) => (
            <div key={persona.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex gap-4 items-start">
              {/* Color Picker (Simple) */}
              <div className="flex flex-col gap-2 pt-1">
                <input 
                  type="color" 
                  value={persona.color}
                  onChange={(e) => handleUpdatePersona(persona.id, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  title="Persona Color"
                />
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={persona.name}
                      onChange={(e) => handleUpdatePersona(persona.id, { name: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., The Skeptic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tone & Instructions</label>
                  <textarea
                    value={persona.tone}
                    onChange={(e) => handleUpdatePersona(persona.id, { tone: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20"
                    placeholder="Describe how this persona should respond..."
                  />
                </div>
              </div>

              {/* Delete */}
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
            Add New Persona
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save size={16} />
            Save Personas
          </button>
        </div>
      </div>
    </div>
  );
};
