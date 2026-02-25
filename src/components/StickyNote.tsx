import React, { useState, useRef, useEffect } from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import { Html } from 'react-konva-utils';
import { Check, X, Copy, Bot } from 'lucide-react';
import { Note, NoteStatus, HEADER_HEIGHT } from '../types';

interface StickyNoteProps {
  note: Note;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onSelect: (id: string, multi: boolean) => void;
  onDragStart: (e: any) => void;
  onDragEnd: (e: any) => void;
  onShowAI: (noteId: string) => void; // New prop
  scale: number;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isSelected,
  onUpdate,
  onSelect,
  onDragStart,
  onDragEnd,
  onShowAI,
  scale,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external text changes (e.g., from AI or other users)
  // This prevents IME composition bugs (duplicate characters) in React controlled textareas
  useEffect(() => {
    if (textAreaRef.current && textAreaRef.current.value !== note.text) {
      textAreaRef.current.value = note.text;
    }
  }, [note.text]);

  const handleStatusChange = (status: NoteStatus) => {
    if (status === 'disabled' && note.text.trim() === '') {
      // If disabling an empty note, delete it instead
      onUpdate(note.id, { status: 'deleted' } as any); // We'll handle 'deleted' in Whiteboard
    } else {
      onUpdate(note.id, { status });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(note.text);
  };

  const isEditable = note.status === 'active';
  const isDisabled = note.status === 'disabled';
  const isCompleted = note.status === 'completed';
  const hasAIComments = note.aiComments && note.aiComments.length > 0;

  // Colors based on status
  const headerColor = isDisabled 
      ? '#e5e7eb' // Gray-200
      : isCompleted 
        ? '#dcfce7' // Green-100
        : '#fef3c7'; // Amber-100 (Default)

  const bodyColor = isDisabled
      ? '#f3f4f6' // Gray-100
      : '#ffffff';

  const borderColor = isSelected ? '#3b82f6' : '#d1d5db';
  const borderWidth = isSelected ? 3 : 1;

  return (
    <Group
      id={note.id}
      x={note.position.x}
      y={note.position.y}
      draggable
      zIndex={note.zIndex}
      onDragStart={(e) => {
        setIsDragging(true);
        onSelect(note.id, e.evt.shiftKey);
        onDragStart(e);
      }}
      onDragEnd={(e) => {
        setIsDragging(false);
        onDragEnd(e);
        onUpdate(note.id, {
          position: { x: e.target.x(), y: e.target.y() }
        });
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(note.id, e.evt.shiftKey || e.evt.ctrlKey);
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
      }}
    >
      {/* Shadow */}
      <Rect
        width={note.size.width}
        height={note.size.height + HEADER_HEIGHT}
        fill="black"
        opacity={0.1}
        offsetX={-4}
        offsetY={-4}
        cornerRadius={4}
        listening={false}
      />

      {/* Main Container Background */}
      <Rect
        width={note.size.width}
        height={note.size.height + HEADER_HEIGHT}
        fill={bodyColor}
        stroke={borderColor}
        strokeWidth={borderWidth}
        cornerRadius={4}
        // Prevent drag when clicking body
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
      />

      {/* Header (Action Area) - The Drag Handle */}
      <Group
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grabbing';
        }}
        onMouseUp={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grab';
        }}
      >
        <Rect
          width={note.size.width}
          height={HEADER_HEIGHT}
          fill={headerColor}
          cornerRadius={[4, 4, 0, 0]}
        />
        
        {/* Drag Handle Visuals */}
        <Group x={note.size.width / 2 - 12} y={8} listening={false}>
           <Rect width={24} height={4} fill="#9ca3af" cornerRadius={2} />
           <Rect width={24} height={4} y={6} fill="#9ca3af" cornerRadius={2} />
        </Group>

        {/* Status Text */}
        <KonvaText
          x={10}
          y={12}
          text={`#${note.order || 1} - ${isCompleted ? 'Completed' : isDisabled ? 'Disabled' : 'Draft'}`}
          fontSize={12}
          fontStyle="bold"
          fill="#6b7280"
          fontFamily="Inter, sans-serif"
          listening={false}
        />

        {/* Actions - HTML Overlay for Buttons */}
        <Html divProps={{ style: { pointerEvents: 'none' } }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${note.size.width}px`,
              height: `${HEADER_HEIGHT}px`,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingRight: '8px',
              gap: '4px',
              pointerEvents: 'none', // Changed to none so it doesn't block drag
              opacity: isDragging ? 0 : 1, // Hide during drag for performance
              transition: 'opacity 0.2s',
            }}
          >
            {/* AI Comments Button */}
            {hasAIComments && (
              <button
                onClick={() => onShowAI(note.id)}
                className="p-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors pointer-events-auto"
                title="View AI Suggestions"
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
              >
                <Bot size={16} />
              </button>
            )}

            {/* Copy Button */}
            {(isCompleted || isDisabled) && (
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-black/10 rounded text-gray-600 transition-colors pointer-events-auto"
                title="Copy Text"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Copy size={16} />
              </button>
            )}

            {/* Status Toggles */}
            <button
              onClick={() => handleStatusChange('completed')}
              className={`p-1 rounded transition-colors pointer-events-auto ${isCompleted ? 'bg-green-500 text-white' : 'hover:bg-green-200 text-green-700'}`}
              title="Complete & Generate AI Comments"
              disabled={isDisabled}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => handleStatusChange('disabled')}
              className={`p-1 rounded transition-colors pointer-events-auto ${isDisabled ? 'bg-gray-500 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
              title="Disable Note"
              disabled={isCompleted}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X size={16} />
            </button>
          </div>
        </Html>
      </Group>

      {/* Body (Text Area) */}
      <Group y={HEADER_HEIGHT}>
        {/* Placeholder Text for Dragging (Canvas-based) */}
        {isDragging && (
           <KonvaText
             text={note.text}
             width={note.size.width}
             height={note.size.height}
             padding={12}
             fontFamily="Inter, sans-serif"
             fontSize={14}
             fill={isDisabled ? '#9ca3af' : '#1f2937'}
             wrap="word"
             ellipsis={true}
           />
        )}

        {/* Real Text Area (HTML) - Hidden during drag */}
        <Html
          divProps={{
            style: {
              opacity: isDragging ? 0 : 1,
              pointerEvents: 'none',
            },
          }}
        >
          <div
            style={{
              width: `${note.size.width}px`,
              height: `${note.size.height}px`,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => {
               e.stopPropagation();
            }}
          >
            <textarea
              ref={textAreaRef}
              defaultValue={note.text}
              onChange={(e) => onUpdate(note.id, { text: e.target.value })}
              readOnly={!isEditable}
              placeholder="Write your thoughts here..."
              style={{
                width: '100%',
                height: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                padding: '12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                color: isDisabled ? '#9ca3af' : '#1f2937',
                overflowY: 'auto',
                cursor: isEditable ? 'text' : 'default',
              }}
            />
          </div>
        </Html>
      </Group>
    </Group>
  );
};
