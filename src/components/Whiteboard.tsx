import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line as KonvaLine, Rect, Group, Text as KonvaText } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote } from './StickyNote';
import { Note, Line, Position, DEFAULT_NOTE_SIZE, Group as NoteGroup, AIComment, AIPersona, NoteStatus, HEADER_HEIGHT } from '../types';
import { generateAIComments, DEFAULT_PERSONAS } from '../services/ai';
import { Loader2, GripHorizontal, Settings } from 'lucide-react';
import { AICommentsModal } from './AICommentsModal';
import { PersonaSettingsModal } from './PersonaSettingsModal';

export const Whiteboard: React.FC = () => {
  // --- State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [stagePos, setStagePos] = useState<Position>({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState<number>(1);
  
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
  const [activePersonas, setActivePersonas] = useState<AIPersona[]>(DEFAULT_PERSONAS);

  const stageRef = useRef<any>(null);
  const isRightClickRef = useRef(false);

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
    setIsProcessingAI(true);
    try {
      const comments = await generateAIComments(sourceNote.text, activePersonas);
      
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
    const groupName = window.prompt("Enter group name:", "New Group");
    if (groupName === null) return;

    const newGroup: NoteGroup = {
      id: uuidv4(),
      name: groupName || 'New Group',
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

  return (
    <div className="w-full h-screen bg-gray-50 overflow-hidden relative">
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <div className="bg-white p-2 rounded-lg shadow-md border border-gray-200 flex items-center gap-2">
          <div className="text-sm font-semibold text-gray-700 px-2">AI Whiteboard</div>
          <div className="h-4 w-px bg-gray-300 mx-1" />
          <div className="text-xs text-gray-500">
            Left Click: Add Note • Right Drag: Draw • Shift+Drag: Select
          </div>
        </div>
        
        {selectedIds.size > 1 && (
          <button
            onClick={createGroup}
            className="bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
          >
            <GripHorizontal size={16} />
            Create Group ({selectedIds.size})
          </button>
        )}

        {isProcessingAI && (
          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg shadow-sm border border-blue-200 flex items-center gap-2 animate-pulse">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-sm font-medium">AI Generating Feedback...</span>
          </div>
        )}
      </div>

      {/* Settings Button (Top Right) */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setIsPersonaModalOpen(true)}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
          title="AI Persona Settings"
        >
          <Settings size={20} />
          <span className="text-sm font-medium hidden sm:inline">AI Personas</span>
        </button>
      </div>

      {/* Persona Settings Modal */}
      <PersonaSettingsModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        personas={activePersonas}
        onSave={(newPersonas) => setActivePersonas(newPersonas)}
      />

      {/* AI Comments Modal */}
      <AICommentsModal 
        isOpen={!!activeModalNoteId}
        onClose={() => setActiveModalNoteId(null)}
        onAdopt={handleAdoptComment}
        comments={activeNote?.aiComments || []}
        personas={activePersonas}
      />

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
