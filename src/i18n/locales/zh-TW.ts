import type { LocaleKey } from './en';

export const zhTW: Record<LocaleKey, string> = {
  // PersonaSettingsModal
  personaSettings: 'AI 人設',
  personaSettingsDesc: '自訂 AI 角色與 API 設定',
  geminiApiKey: 'Gemini API Key',
  geminiApiKeyDesc: '輸入你的 Gemini API Key 以使用 AI 功能。Key 僅儲存於本機瀏覽器。',
  modelSelection: '模型選擇',
  modelSelectionDesc: '選擇要使用的 Gemini 模型，不同模型在速度與品質上有所差異。',
  loadModels: '載入模型',
  loadingModels: '載入中...',
  enterApiKeyToLoadModels: '請先輸入 API Key 以載入模型列表',
  personas: '角色',
  name: '名稱',
  role: '角色',
  toneAndInstructions: '語氣與指示',
  addNewPersona: '新增角色',
  cancel: '取消',
  savePersonas: '儲存',

  // Whiteboard
  aiWhiteboard: 'NoteStorm',
  shortcuts: '左鍵：新增筆記 • 右鍵拖曳：繪圖 • Shift+拖曳：選取',
  setApiKeyPrompt: '請設定 Gemini API Key 以使用 AI 功能',
  goToSettings: '前往設定',
  newProject: '新增',
  saveProject: '儲存',
  loadProject: '載入',
  aiPersonas: 'AI 人設',
  createGroup: '建立群組',
  aiGenerating: 'AI 生成中...',
  layers: '圖層',
  addLayer: '新增圖層',

  // AICommentsModal
  aiFeedback: 'AI 回饋',
  aiFeedbackDesc: '多位角色的建議',
  noCommentsYet: '尚無 AI 回饋。',
  copy: '複製',
  adopt: '採用',
  close: '關閉',

  // StickyNote
  draft: '草稿',
  completed: '完成',
  disabled: '停用',
  viewAiSuggestions: '檢視 AI 建議',

  // Dialogs
  confirmNewProject: '確定要建立新專案嗎？未儲存的變更將會遺失。',
  enterGroupName: '輸入群組名稱：',
  newGroup: '新群組',

  // AI
  pleaseSetApiKey: '請在設定中輸入 Gemini API Key 以使用 AI 點評功能。',
  errorGeneratingComments: '生成回饋時發生錯誤，請重試。',
};
