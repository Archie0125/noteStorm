import React from 'react';
import { X, Copy, Bot, CheckCircle2 } from 'lucide-react';
import { AIComment, AIPersona } from '../types';
import { useI18n } from '../i18n';

interface AICommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (comment: AIComment) => void;
  comments: AIComment[];
  personas: AIPersona[];
}

export const AICommentsModal: React.FC<AICommentsModalProps> = ({ isOpen, onClose, onAdopt, comments, personas }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const getPersonaColor = (name: string) => {
    const persona = personas.find(p => p.name === name);
    return persona?.color || '#6b7280';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('aiFeedback')}</h2>
              <p className="text-xs text-gray-500">{t('aiFeedbackDesc')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50">
          {comments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {t('noCommentsYet')}
            </div>
          ) : (
            comments.map((comment, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative group">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-2 h-8 rounded-full" 
                    style={{ backgroundColor: getPersonaColor(comment.personaName) }}
                  />
                  <span 
                    className="font-bold text-sm uppercase tracking-wider"
                    style={{ color: getPersonaColor(comment.personaName) }}
                  >
                    {comment.personaName}
                  </span>
                </div>
                
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                  {comment.content}
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(comment.content)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('copy')}
                  >
                    <Copy size={14} />
                    {t('copy')}
                  </button>
                  
                  <button
                    onClick={() => onAdopt(comment)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                    title={t('adopt')}
                  >
                    <CheckCircle2 size={14} />
                    {t('adopt')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
