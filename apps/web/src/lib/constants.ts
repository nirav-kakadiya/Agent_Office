export const GRID_COLS = 16;
export const GRID_ROWS = 12;
export const CELL_SIZE = 50;
export const CANVAS_W = GRID_COLS * CELL_SIZE; // 800
export const CANVAS_H = GRID_ROWS * CELL_SIZE; // 600

export interface RoomDef {
  name: string;
  label: string;
  agent: string;
  color: number;
  x: number;
  y: number;
  w: number;
  h: number;
  floorColor: number;
  wallColor: number;
}

export const ROOMS: RoomDef[] = [
  { name: 'workshop',   label: 'Workshop',    agent: 'minion',   color: 0xff8c00, floorColor: 0xd4c4a0, wallColor: 0xe8dcc4, x: 0, y: 0, w: 5, h: 4 },
  { name: 'library',    label: 'Library',     agent: 'sage',     color: 0x4488ff, floorColor: 0xc8b898, wallColor: 0xddd0b8, x: 5, y: 0, w: 5, h: 4 },
  { name: 'watchtower', label: 'Watchtower',  agent: 'observer', color: 0xcccc00, floorColor: 0xc0c0c8, wallColor: 0xd8d8e0, x: 10, y: 0, w: 6, h: 4 },
  { name: 'studio',     label: 'Studio',      agent: 'quill',    color: 0x9944cc, floorColor: 0xd0c0d0, wallColor: 0xe0d4e0, x: 0, y: 4, w: 5, h: 4 },
  { name: 'meeting',    label: 'Meeting Room', agent: '',        color: 0x888888, floorColor: 0xc4c0b8, wallColor: 0xd8d4cc, x: 5, y: 4, w: 6, h: 4 },
  { name: 'lab',        label: 'Lab',          agent: 'xalt',    color: 0x00cccc, floorColor: 0xb8d0d0, wallColor: 0xd0e4e4, x: 11, y: 4, w: 5, h: 4 },
  { name: 'field',      label: 'Field',        agent: 'scout',   color: 0x44aa44, floorColor: 0xb8c8a8, wallColor: 0xd0dcc0, x: 0, y: 8, w: 6, h: 4 },
  { name: 'coffee',     label: 'Coffee Area',  agent: '',        color: 0x8b6914, floorColor: 0xd0c0a8, wallColor: 0xe0d4bc, x: 6, y: 8, w: 5, h: 4 },
  { name: 'server',     label: 'Server Room',  agent: '',        color: 0x556677, floorColor: 0x707880, wallColor: 0x8890a0, x: 11, y: 8, w: 5, h: 4 },
];

export const AGENT_COLORS: Record<string, number> = {
  minion: 0xff8c00,
  sage: 0x4488ff,
  scout: 0x44aa44,
  quill: 0x9944cc,
  xalt: 0x00cccc,
  observer: 0xcccc00,
};
