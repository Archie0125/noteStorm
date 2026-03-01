import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line as KonvaLine, Rect, Group, Text as KonvaText } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote } from './StickyNote';
import { Note, Line, Position, DEFAULT_NOTE_SIZE, Group as NoteGroup, AIComment, AIPersona, NoteStatus, HEADER_HEIGHT, BoardLayer } from '../types';
import { generateAIComments, DEFAULT_PERSONAS, DEFAULT_MODEL } from '../services/ai';
import { Loader2, GripHorizontal, Settings, FilePlus, Download, Upload, Plus, X as XIcon, Layers, Languages } from 'lucide-react';
import { AICommentsModal } from './AICommentsModal';
import { PersonaSettingsModal } from './PersonaSettingsModal';
import { useI18n } from '../i18n';

interface ProjectData {
  version: string;
  layers: BoardLayer[];
  activeLayerId: string;
  personas: AIPersona[];
}

const AUTOSAVE_KEY = 'noteStorm_autosave';

const createDefaultLayer = (id: string, name: string): BoardLayer => ({
  id,
  name,
  notes: [],
  lines: [],
  groups: [],
  stagePos: { x: 0, y: 0 },
  stageScale: 1,
});

function loadSavedProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ProjectData;
    if (data.version === '2.0' && data.layers && Array.isArray(data.layers)) return data;
    return null;
  } catch {
    return null;
  }
}

export const Whiteboard: React.FC = () => {
  const { t, locale, setLocale } = useI18n();

  // --- Layer State (load from localStorage on mount) ---
  const [layers, setLayers] = useState<BoardLayer[]>(() => {
    const s = loadSavedProject();
    return s?.layers ?? [createDefaultLayer('layer-1', 'Layer 1')];
  });
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    const s = loadSavedProject();
    if (!s?.layers?.length) return 'layer-1';
    const exists = s.layers.some((l) => l.id === s.activeLayerId);
    return exists ? s.activeLayerId : s.layers[0].id;
  });

  // Derived state for the active layer
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];
  const notes = activeLayer.notes;
  const lines = activeLayer.lines;
  const groups = activeLayer.groups;
  const stagePos = activeLayer.stagePos;
  const stageScale = activeLayer.stageScale;

  // Custom setters to update the active layer
  const setNotes = (updater: React.SetStateAction<Note[]>) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, notes: typeof updater === 'function' ? updater(l.notes) : updater } : l));
  };
  const setLines = (updater: React.SetStateAction<Line[]>) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lines: typeof updater === 'function' ? updater(l.lines) : updater } : l));
  };
  const setGroups = (updater: React.SetStateAction<NoteGroup[]>) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, groups: typeof updater === 'function' ? updater(l.groups) : updater } : l));
  };
  const setStagePos = (updater: React.SetStateAction<Position>) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, stagePos: typeof updater === 'function' ? updater(l.stagePos) : updater } : l));
  };
  const setStageScale = (updater: React.SetStateAction<number>) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, stageScale: typeof updater === 'function' ? updater(l.stageScale) : updater } : l));
  };

  // --- UI State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'none' | 'freehand' | 'straight'>('none');
  const [currentLine, setCurrentLine] = useState<Line | null>(null);
  
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [connectingNoteId, setConnectingNoteId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: Position, end: Position } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // AI Modal State
  const [activeModalNoteId, setActiveModalNoteId] = useState<string | null>(null);
  
  // Persona Settings State
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [activePersonas, setActivePersonas] = useState<AIPersona[]>(() => {
    const s = loadSavedProject();
    return s?.personas ?? DEFAULT_PERSONAS;
  });
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [model, setModel] = useState<string>(() => localStorage.getItem('gemini_model') || DEFAULT_MODEL);

  const stageRef = useRef<any>(null);
  const isRightClickRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Auto-save to localStorage ---
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const projectData: ProjectData = {
        version: '2.0',
        layers,
        activeLayerId,
        personas: activePersonas,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(projectData));
      saveTimeoutRef.current = null;
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [layers, activeLayerId, activePersonas]);

  // --- Project Management ---
  const handleNewProject = () => {
    if (window.confirm(t('confirmNewProject'))) {
      const newLayer = createDefaultLayer('layer-1', 'Layer 1');
      setLayers([newLayer]);
      setActiveLayerId(newLayer.id);
      setSelectedIds(new Set());
    }
  };

  const handleSaveProject = () => {
    const projectData: ProjectData = {
      version: '2.0',
      layers,
      activeLayerId,
      personas: activePersonas,
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.wbd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as any;
        
        // Handle legacy v1.0 format
        if (data.version === '1.0' || data.notes) {
          const legacyLayer = createDefaultLayer('layer-1', 'Layer 1');
          legacyLayer.notes = data.notes || [];
          legacyLayer.lines = data.lines || [];
          legacyLayer.groups = data.groups || [];
          legacyLayer.stagePos = data.stagePos || { x: 0, y: 0 };
          legacyLayer.stageScale = data.stageScale || 1;
          
          setLayers([legacyLayer]);
          setActiveLayerId(legacyLayer.id);
          if (data.personas) setActivePersonas(data.personas);
        } else if (data.version === '2.0' && data.layers) {
          setLayers(data.layers);
          setActiveLayerId(data.activeLayerId || data.layers[0].id);
          if (data.personas) setActivePersonas(data.personas);
        }
        
        setSelectedIds(new Set());
      } catch (error) {
        console.error('Failed to parse project file:', error);
        alert('Invalid project file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be loaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Layer Management ---
  const handleAddLayer = () => {
    const newLayer = createDefaultLayer(uuidv4(), `Layer ${layers.length + 1}`);
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    setSelectedIds(new Set());
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) {
      alert('You must have at least one layer.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this layer?')) {
      setLayers(prev => {
        const next = prev.filter(l => l.id !== id);
        if (activeLayerId === id) {
          setActiveLayerId(next[0].id);
          setSelectedIds(new Set());
        }
        return next;
      });
    }
  };

  // --- Helpers ---
  const GAP = 20;
  const getFullHeight = (size: { width: number; height: number }) => size.height + HEADER_HEIGHT;

  const findNonOverlappingPosition = (
    startPos: Position,
    size: { width: number; height: number },
    existingNotes: Note[],
    ignoreId?: string
  ): Position => {
    let pos = { ...startPos };
    let hasOverlap = true;
    let iterations = 0;
    const maxIterations = 50;

    while (hasOverlap && iterations < maxIterations) {
      hasOverlap = false;
      for (const other of existingNotes) {
        if (other.id === ignoreId) continue;

        const otherFullHeight = getFullHeight(other.size);
        const thisFullHeight = getFullHeight(size);

        // Check intersection (AABB)
        if (
          pos.x < other.position.x + other.size.width + GAP &&
          pos.x + size.width + GAP > other.position.x &&
          pos.y < other.position.y + otherFullHeight + GAP &&
          pos.y + thisFullHeight + GAP > other.position.y
        ) {
          hasOverlap = true;
          // Push down below the overlapping note
          pos.y = other.position.y + otherFullHeight + GAP;
          break; // Restart check with new position
        }
      }
      iterations++;
    }
    return pos;
  };

  // --- Actions ---

  const addNote = (pos: Position) => {
    const newOrder = notes.length > 0 ? Math.max(...notes.map(n => n.order || 0)) + 1 : 1;
    const newZIndex = notes.length > 0 ? Math.max(...notes.map(n => n.zIndex || 0)) + 1 : 1;
    
    const initialPos = { x: pos.x - DEFAULT_NOTE_SIZE.width / 2, y: pos.y - DEFAULT_NOTE_SIZE.height / 2 };
    const resolvedPos = findNonOverlappingPosition(initialPos, DEFAULT_NOTE_SIZE, notes);

    const newNote: Note = {
      id: uuidv4(),
      type: 'note',
      text: '',
      position: resolvedPos,
      size: DEFAULT_NOTE_SIZE,
      status: 'active',
      zIndex: newZIndex,
      order: newOrder,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedIds(new Set([newNote.id]));
  };

  const updateNote = (id: string, updates: Partial<Note> & { status?: NoteStatus | 'deleted' }) => {
    if ((updates.status as string) === 'deleted') {
      setNotes(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    setNotes((prev) => {
      let updatedNotes = prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, ...updates } as Note;
          if (n.status !== 'completed' && (updates.status as string) === 'completed') {
            triggerAI(updated);
          }
          return updated;
        }
        return n;
      });

      // Collision Resolution (Only if position changed)
      if (updates.position) {
        const movedNote = updatedNotes.find(n => n.id === id);
        if (movedNote) {
           const resolvedPos = findNonOverlappingPosition(movedNote.position, movedNote.size, updatedNotes, id);
           
           // Update the position if changed
           if (resolvedPos.x !== movedNote.position.x || resolvedPos.y !== movedNote.position.y) {
             updatedNotes = updatedNotes.map(n => n.id === id ? { ...n, position: resolvedPos } : n);
           }
        }
      }

      return updatedNotes;
    });
  };

  const triggerAI = async (sourceNote: Note) => {
    const effectiveKey = apiKey?.trim() || process.env.GEMINI_API_KEY;
    setIsProcessingAI(true);
    try {
      const comments = await generateAIComments(sourceNote.text, activePersonas, effectiveKey, model);
      
      const aiComments = comments.map(comment => {
        const persona = activePersonas.find(p => p.id === comment.personaId);
        return {
          personaId: comment.personaId,
          personaName: persona?.name || 'AI',
          content: comment.content
        };
      });

      // Update the note with the new comments
      setNotes(prev => prev.map(n => {
        if (n.id === sourceNote.id) {
          return { ...n, aiComments: aiComments };
        }
        return n;
      }));

    } catch (error) {
      console.error("AI Trigger Failed", error);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleConnect = (targetId: string) => {
    if (!connectingNoteId) {
      setConnectingNoteId(targetId);
    } else {
      if (connectingNoteId === targetId) {
        setConnectingNoteId(null);
        return;
      }
      
      const startNote = notes.find(n => n.id === connectingNoteId);
      const endNote = notes.find(n => n.id === targetId);
      
      if (startNote && endNote) {
        const newLine: Line = {
          id: uuidv4(),
          points: [
            startNote.position.x + startNote.size.width / 2,
            startNote.position.y + startNote.size.height / 2,
            endNote.position.x + endNote.size.width / 2,
            endNote.position.y + endNote.size.height / 2
          ],
          type: 'connection',
          color: '#000000',
          strokeWidth: 2
        };
        setLines(prev => [...prev, newLine]);
      }
      setConnectingNoteId(null);
    }
  };

  // ... (createGroup, updateGroupPosition, handleSelect remain same)
  const createGroup = () => {
    if (selectedIds.size < 2) return;

    const selectedNotes = notes.filter(n => selectedIds.has(n.id));
    if (selectedNotes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedNotes.forEach(n => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.size.width);
      maxY = Math.max(maxY, n.position.y + n.size.height);
    });

    const padding = 20;
    const groupName = window.prompt(t('enterGroupName'), t('newGroup'));
    if (groupName === null) return;

    const newGroup: NoteGroup = {
      id: uuidv4(),
      name: groupName || t('newGroup'),
      itemIds: Array.from(selectedIds),
      rect: {
        x: minX - padding,
        y: minY - padding,
        width: (maxX - minX) + padding * 2,
        height: (maxY - minY) + padding * 2
      }
    };

    setGroups(prev => [...prev, newGroup]);
    setSelectedIds(new Set());
  };

  const updateGroupPosition = (groupId: string, newPos: Position) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const dx = newPos.x - g.rect.x;
        const dy = newPos.y - g.rect.y;

        setNotes(prevNotes => prevNotes.map(n => {
          if (g.itemIds.includes(n.id)) {
            return {
              ...n,
              position: {
                x: n.position.x + dx,
                y: n.position.y + dy
              }
            };
          }
          return n;
        }));

        return { ...g, rect: { ...g.rect, x: newPos.x, y: newPos.y } };
      }
      return g;
    }));
  };

  const handleSelect = (id: string, multi: boolean) => {
    if (multi) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
    
    // Bring to front
    setNotes(prev => {
      const maxZ = Math.max(0, ...prev.map(n => n.zIndex || 0));
      return prev.map(n => n.id === id ? { ...n, zIndex: maxZ + 1 } : n);
    });
  };

  // --- Stage Events ---
  // ... (handleStageClick, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel remain same)
  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      if (e.evt.button === 2) return; 

      if (!isDrawing && !isSelecting && e.evt.button === 0 && !e.evt.shiftKey) {
        const stage = e.target.getStage();
        const pointer = stage.getRelativePointerPosition();
        addNote(pointer);
        setSelectedIds(new Set());
        setConnectingNoteId(null);
      } else if (!e.evt.shiftKey) {
        setSelectedIds(new Set());
        setConnectingNoteId(null);
      }
    }
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    if (e.evt.button === 2) {
      isRightClickRef.current = true;
      const clickedShape = e.target;
      const noteGroup = clickedShape.findAncestor('Group');
      
      if (noteGroup && noteGroup.id()) {
        handleConnect(noteGroup.id());
        return;
      }

      setIsDrawing(true);
      setDrawingMode('freehand');
      
      const newLine: Line = {
        id: uuidv4(),
        points: [pos.x, pos.y],
        type: 'freehand',
        color: '#000000',
        strokeWidth: 3,
      };
      setCurrentLine(newLine);
      return;
    }

    if (e.evt.shiftKey && e.evt.button === 0) {
      setIsSelecting(true);
      setSelectionBox({ start: pos, end: pos });
      return;
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    if (isDrawing && currentLine) {
      if (drawingMode === 'freehand') {
        const newPoints = currentLine.points.concat([pos.x, pos.y]);
        setCurrentLine({ ...currentLine, points: newPoints });
      }
    } else if (isSelecting && selectionBox) {
      setSelectionBox({ ...selectionBox, end: pos });
    }
  };

  const handleMouseUp = (e: any) => {
    if (isDrawing && currentLine) {
      setLines(prev => [...prev, currentLine]);
      setCurrentLine(null);
      setIsDrawing(false);
      setDrawingMode('none');
    }

    if (isSelecting && selectionBox) {
      const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
      const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
      const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);

      const newSelected = new Set<string>();
      notes.forEach(note => {
        if (
          note.position.x < x2 &&
          note.position.x + note.size.width > x1 &&
          note.position.y < y2 &&
          note.position.y + note.size.height > y1
        ) {
          newSelected.add(note.id);
        }
      });
      
      if (e.evt.shiftKey) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          newSelected.forEach(id => next.add(id));
          return next;
        });
      } else {
        setSelectedIds(newSelected);
      }

      setIsSelecting(false);
      setSelectionBox(null);
    }

    isRightClickRef.current = false;
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    newScale = Math.max(0.1, Math.min(newScale, 5));

    setStageScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStagePos(newPos);
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleAdoptComment = (comment: AIComment) => {
    if (!activeModalNoteId) return;
    
    const sourceNote = notes.find(n => n.id === activeModalNoteId);
    if (!sourceNote) return;

    setActiveModalNoteId(null);

    setNotes(prev => {
      const newOrder = prev.length > 0 ? Math.max(...prev.map(n => n.order || 0)) + 1 : 1;
      const newZIndex = prev.length > 0 ? Math.max(...prev.map(n => n.zIndex || 0)) + 1 : 1;
      
      const initialPos = { 
        x: sourceNote.position.x, 
        y: sourceNote.position.y + getFullHeight(sourceNote.size) + GAP 
      };
      
      const resolvedPos = findNonOverlappingPosition(initialPos, DEFAULT_NOTE_SIZE, prev);

      const newNote: Note = {
        id: uuidv4(),
        type: 'note',
        text: comment.content,
        position: resolvedPos,
        size: DEFAULT_NOTE_SIZE,
        status: 'active',
        zIndex: newZIndex,
        order: newOrder,
      };

      return [...prev, newNote];
    });
  };

  const activeNote = activeModalNoteId ? notes.find(n => n.id === activeModalNoteId) : null;

  const hasApiKey = !!(apiKey?.trim() || process.env.GEMINI_API_KEY);

  return (
    <div className="w-full h-screen bg-gray-50 overflow-hidden relative">
      {/* No API Key Banner */}
      {!hasApiKey && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-3 shadow-sm">
          <span className="text-sm text-amber-800">{t('setApiKeyPrompt')}</span>
          <button
            onClick={() => setIsPersonaModalOpen(true)}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            {t('goToSettings')}
          </button>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <div className="bg-white p-2 rounded-lg shadow-md border border-gray-200 flex items-center gap-2">
          <div className="text-sm font-semibold text-gray-700 px-2">{t('aiWhiteboard')}</div>
          <div className="h-4 w-px bg-gray-300 mx-1" />
          <div className="text-xs text-gray-500">
            {t('shortcuts')}
          </div>
        </div>
        
        {selectedIds.size > 1 && (
          <button
            onClick={createGroup}
            className="bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
          >
            <GripHorizontal size={16} />
            {t('createGroup')} ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Settings Button (Top Right) */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handleNewProject}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors flex items-center gap-2"
          title={t('newProject')}
        >
          <FilePlus size={20} />
          <span className="text-sm font-medium hidden sm:inline">{t('newProject')}</span>
        </button>
        <button
          onClick={handleSaveProject}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-green-600 transition-colors flex items-center gap-2"
          title={t('saveProject')}
        >
          <Download size={20} />
          <span className="text-sm font-medium hidden sm:inline">{t('saveProject')}</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-2"
          title={t('loadProject')}
        >
          <Upload size={20} />
          <span className="text-sm font-medium hidden sm:inline">{t('loadProject')}</span>
        </button>
        <input
          type="file"
          accept=".wbd"
          ref={fileInputRef}
          onChange={handleLoadProject}
          className="hidden"
        />
        <div className="w-px bg-gray-300 mx-1 my-1" />
        <button
          onClick={() => setIsPersonaModalOpen(true)}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
          title={t('aiPersonas')}
        >
          <Settings size={20} />
          <span className="text-sm font-medium hidden sm:inline">{t('aiPersonas')}</span>
        </button>
      </div>

      {/* Persona Settings Modal */}
      <PersonaSettingsModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        personas={activePersonas}
        apiKey={apiKey}
        model={model}
        onSave={(newPersonas, newApiKey, newModel) => {
          setActivePersonas(newPersonas);
          setApiKey(newApiKey);
          setModel(newModel);
          localStorage.setItem('gemini_api_key', newApiKey);
          localStorage.setItem('gemini_model', newModel);
        }}
      />

      {/* AI Comments Modal */}
      <AICommentsModal 
        isOpen={!!activeModalNoteId}
        onClose={() => setActiveModalNoteId(null)}
        onAdopt={handleAdoptComment}
        comments={activeNote?.aiComments || []}
        personas={activePersonas}
      />

      {/* AI Notification + Language Switcher (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2">
        {isProcessingAI && (
          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg shadow-sm border border-blue-200 flex items-center gap-2 animate-pulse">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-sm font-medium">{t('aiGenerating')}</span>
          </div>
        )}
        <button
          onClick={() => setLocale(locale === 'en' ? 'zh-TW' : 'en')}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
          title={locale === 'en' ? '繁體中文' : 'English'}
        >
          <Languages size={20} />
          <span className="text-sm font-medium">{locale === 'en' ? 'EN' : '繁中'}</span>
        </button>
      </div>

      {/* Layers Panel (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200 flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
            <Layers size={16} />
            <span>{t('layers')}</span>
          </div>
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
            {layers.map(layer => (
              <div 
                key={layer.id} 
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${layer.id === activeLayerId ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                onClick={() => {
                  setActiveLayerId(layer.id);
                  setSelectedIds(new Set());
                }}
              >
                <span className="truncate max-w-[120px]">{layer.name}</span>
                {layers.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id); }}
                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                    title="Delete Layer"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button 
            onClick={handleAddLayer}
            className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:bg-blue-50 border border-blue-100 rounded px-2 py-1.5 mt-1 transition-colors font-medium"
          >
            <Plus size={14} /> {t('addLayer')}
          </button>
        </div>
      </div>

      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={!isDrawing && !isSelecting}
        onWheel={handleWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        ref={stageRef}
        style={{ cursor: isDrawing ? 'crosshair' : isSelecting ? 'crosshair' : 'grab' }}
      >
        <Layer>
          {groups.map(group => (
            <Group
              key={group.id}
              draggable
              x={group.rect.x}
              y={group.rect.y}
              onDragEnd={(e) => {
                updateGroupPosition(group.id, { x: e.target.x(), y: e.target.y() });
              }}
            >
              <Rect
                width={group.rect.width}
                height={group.rect.height}
                stroke="#9ca3af"
                strokeWidth={2}
                dash={[10, 5]}
                cornerRadius={8}
                fill="rgba(0,0,0,0.02)"
              />
              <KonvaText
                text={group.name}
                x={10}
                y={-25}
                fontSize={14}
                fontStyle="bold"
                fill="#6b7280"
              />
            </Group>
          ))}

          {lines.map((line) => (
            <KonvaLine
              key={line.id}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              tension={line.type === 'freehand' ? 0.5 : 0}
              lineCap="round"
              lineJoin="round"
            />
          ))}
          {currentLine && (
            <KonvaLine
              points={currentLine.points}
              stroke={currentLine.color}
              strokeWidth={currentLine.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.start.x, selectionBox.end.x)}
              y={Math.min(selectionBox.start.y, selectionBox.end.y)}
              width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}

          {notes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              isSelected={selectedIds.has(note.id)}
              onUpdate={updateNote}
              onSelect={handleSelect}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onShowAI={(id) => setActiveModalNoteId(id)}
              scale={stageScale}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
