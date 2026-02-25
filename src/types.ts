export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type NoteStatus = 'active' | 'completed' | 'disabled';

export interface AIComment {
  personaId: string;
  personaName: string;
  content: string;
}

export interface Note {
  id: string;
  type: 'note'; // Removed 'ai-comment' as they are now embedded
  text: string;
  position: Position;
  size: Size;
  status: NoteStatus;
  aiComments?: AIComment[];
  zIndex: number;
  order: number;
}

export interface Line {
  id: string;
  points: number[];
  type: 'freehand' | 'straight' | 'connection';
  color: string;
  strokeWidth: number;
}

export interface Group {
  id: string;
  name: string;
  itemIds: string[]; // IDs of notes/comments in this group
  rect: { x: number; y: number; width: number; height: number };
}

export interface AIPersona {
  id: string;
  name: string;
  role: string;
  tone: string;
  color: string;
}

export const DEFAULT_NOTE_SIZE = { width: 300, height: 300 };
export const HEADER_HEIGHT = 40;
