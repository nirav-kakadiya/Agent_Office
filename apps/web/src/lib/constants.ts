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
}

export const ROOMS: RoomDef[] = [
  { name: 'workshop',   label: 'Workshop',   agent: 'minion',   color: 0xff8c00, x: 0, y: 0, w: 5, h: 4 },
  { name: 'library',    label: 'Library',     agent: 'sage',     color: 0x4488ff, x: 5, y: 0, w: 5, h: 4 },
  { name: 'watchtower', label: 'Watchtower',  agent: 'observer', color: 0xcccc00, x: 10, y: 0, w: 6, h: 4 },
  { name: 'studio',     label: 'Studio',      agent: 'quill',    color: 0x9944cc, x: 0, y: 4, w: 5, h: 4 },
  { name: 'meeting',    label: 'Meeting Room', agent: '',        color: 0x666666, x: 5, y: 4, w: 6, h: 4 },
  { name: 'lab',        label: 'Lab',          agent: 'xalt',    color: 0x00cccc, x: 11, y: 4, w: 5, h: 4 },
  { name: 'field',      label: 'Field',        agent: 'scout',   color: 0x44aa44, x: 0, y: 8, w: 6, h: 4 },
  { name: 'coffee',     label: 'Coffee Area',  agent: '',        color: 0x8b6914, x: 6, y: 8, w: 5, h: 4 },
  { name: 'server',     label: 'Server Room',  agent: '',        color: 0x333344, x: 11, y: 8, w: 5, h: 4 },
];

export const AGENT_COLORS: Record<string, number> = {
  minion: 0xff8c00,
  sage: 0x4488ff,
  scout: 0x44aa44,
  quill: 0x9944cc,
  xalt: 0x00cccc,
  observer: 0xcccc00,
};
