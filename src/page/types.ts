import type { InkParams } from '@/manga/tones';

export type Mood = 'action' | 'drama' | 'calm' | 'comedy';

export type TextKind = 'bubble' | 'thought' | 'caption' | 'sfx';

export type TextItem = {
  id: string;
  kind: TextKind;
  text: string;
  // centre of the item in page units (PAGE_W x PAGE_H)
  x: number;
  y: number;
  // sfx only: degrees
  rotate?: number;
};

export type Panel = {
  photo: string; // file name inside the page folder
  ink: InkParams;
  // how the photo sits in the panel: 0..1 focus point for crop-to-fill
  focus: [number, number];
  zoom: number; // 1 = cover
};

export type Page = {
  id: string;
  createdAt: number;
  updatedAt: number;
  chapter: number;
  title: string;
  mood: Mood;
  layout: string; // layout id, see layouts.ts
  panels: Panel[];
  items: TextItem[];
};

export const PAGE_W = 1000;
export const PAGE_H = 1414; // ~ B5 / A-series ratio
