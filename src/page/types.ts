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
  // drawn size relative to the default, 1 when missing
  size?: number;
  // bubble and thought: tail on the right instead of the left
  flip?: boolean;
};

export type Panel = {
  photo: string; // file name inside the page folder
  ink: InkParams;
  // how the photo sits in the panel: 0..1 focus point for crop-to-fill
  focus: [number, number];
  zoom: number; // 1 = cover
};

export type Gutter = 'tight' | 'normal' | 'wide';
export type Border = 'none' | 'thin' | 'normal' | 'bold';

// How the panels sit on the sheet
export type Frame = {
  gutter: Gutter;
  border: Border;
  // black paper, as for flashbacks; borders and title turn white
  dark: boolean;
  // panels run to the edge of the paper, no outer margin
  bleed: boolean;
};

export const DEFAULT_FRAME: Frame = { gutter: 'normal', border: 'normal', dark: false, bleed: false };

// One drawn page of a chapter. The first sheet carries the chapter title.
export type Sheet = {
  layout: string; // layout id, see layouts.ts
  panels: Panel[];
  items: TextItem[];
  frame?: Frame; // DEFAULT_FRAME when missing
};

// A chapter: what the library lists and what lives in pages/<id>/.
// Called Page for history: chapters used to be a single page.
export type Page = {
  id: string;
  createdAt: number;
  updatedAt: number;
  chapter: number;
  title: string;
  mood: Mood;
  sheets: Sheet[];
};

export const PAGE_W = 1000;
export const PAGE_H = 1414; // ~ B5 / A-series ratio
