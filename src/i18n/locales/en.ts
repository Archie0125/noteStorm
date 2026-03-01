export const en = {
  // PersonaSettingsModal
  personaSettings: 'AI Persona Settings',
  personaSettingsDesc: 'Customize the AI voices and configure your API Key',
  geminiApiKey: 'Gemini API Key',
  geminiApiKeyDesc: 'Enter your own Gemini API key to use the AI features. Your key is stored locally in your browser.',
  modelSelection: 'Model Selection',
  modelSelectionDesc: 'Select the Gemini model to use. Different models vary in speed and quality.',
  loadModels: 'Load Models',
  loadingModels: 'Loading...',
  enterApiKeyToLoadModels: 'Enter API key above to load models',
  personas: 'Personas',
  name: 'Name',
  role: 'Role',
  toneAndInstructions: 'Tone & Instructions',
  addNewPersona: 'Add New Persona',
  cancel: 'Cancel',
  savePersonas: 'Save Personas',

  // Whiteboard
  aiWhiteboard: 'NoteStorm',
  shortcuts: 'Left Click: Add Note • Right Drag: Draw • Shift+Drag: Select',
  setApiKeyPrompt: 'Set Gemini API Key to use AI features',
  goToSettings: 'Go to Settings',
  newProject: 'New',
  saveProject: 'Save',
  loadProject: 'Load',
  aiPersonas: 'AI Personas',
  createGroup: 'Create Group',
  aiGenerating: 'AI Generating Feedback...',
  layers: 'Layers',
  addLayer: 'Add Layer',

  // AICommentsModal
  aiFeedback: 'AI Feedback',
  aiFeedbackDesc: 'Suggestions from multiple personas',
  noCommentsYet: 'No comments generated yet.',
  copy: 'Copy',
  adopt: 'Adopt',
  close: 'Close',

  // StickyNote
  draft: 'Draft',
  completed: 'Completed',
  disabled: 'Disabled',
  viewAiSuggestions: 'View AI Suggestions',

  // Dialogs
  confirmNewProject: 'Are you sure you want to create a new project? Unsaved changes will be lost.',
  enterGroupName: 'Enter group name:',
  newGroup: 'New Group',

  // AI
  pleaseSetApiKey: 'Please set Gemini API Key in settings to use AI feedback.',
  errorGeneratingComments: 'Error generating comments. Please try again.',
} as const;

export type LocaleKey = keyof typeof en;
