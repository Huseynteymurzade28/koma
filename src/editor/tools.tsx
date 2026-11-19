import { StyleSheet } from 'react-native';

import type { Background, InkParams } from '@/manga/tones';
import { MARK_LABEL, MARK_ROWS } from '@/page/marks';
import { itemSize } from '@/page/textLayout';
import { isBalloon, type Border, type Frame, type Gutter, type MarkKind, type Panel, type TextItem, type TextKind } from '@/page/types';
import { space, themed } from '@/theme';
import { Button, Field, Row, Segmented } from '@/ui/kit';
import { KIND_LABEL } from '@/words/bank';
import { MAX_ZOOM } from './touch';

// The editor's tool panels and the option lists they offer.

// ---- sheet tools ------------------------------------------------------------

const GUTTER_OPTIONS: { id: Gutter; label: string }[] = [
  { id: 'tight', label: 'Tight' },
  { id: 'normal', label: 'Normal' },
  { id: 'wide', label: 'Wide' },
];

const BORDER_OPTIONS: { id: Border; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'thin', label: 'Thin' },
  { id: 'normal', label: 'Normal' },
  { id: 'bold', label: 'Bold' },
];

export function SheetTools({
  frame,
  index,
  count,
  onFrame,
  onMove,
  onRemove,
  onDone,
}: {
  frame: Frame;
  index: number;
  count: number;
  onFrame: (patch: Partial<Frame>, all?: boolean) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const s = useStyles();
  return (
    <>
      <Field label="Gutter">
        <Segmented options={GUTTER_OPTIONS} value={frame.gutter} onChange={(gutter) => onFrame({ gutter })} />
      </Field>
      <Field label="Panel border">
        <Segmented options={BORDER_OPTIONS} value={frame.border} onChange={(border) => onFrame({ border })} />
      </Field>
      <Field label="Paper">
        <Segmented
          options={[{ id: 0, label: 'White' }, { id: 1, label: 'Black' }]}
          value={frame.dark ? 1 : 0}
          onChange={(v) => onFrame({ dark: v === 1 })}
        />
      </Field>
      <Field label="Edges">
        <Segmented
          options={[{ id: 0, label: 'Margin' }, { id: 1, label: 'Bleed' }]}
          value={frame.bleed ? 1 : 0}
          onChange={(v) => onFrame({ bleed: v === 1 })}
        />
      </Field>
      {count > 1 && (
        <>
          <Button label="Use this style on every page" onPress={() => onFrame({}, true)} />
          <Field label={`Page ${index + 1} of ${count}`}>
            <Row>
              <Button label="‹ Earlier" onPress={() => onMove(-1)} disabled={index === 0} style={s.flex} />
              <Button label="Later ›" onPress={() => onMove(1)} disabled={index === count - 1} style={s.flex} />
              <Button label="Delete" danger onPress={onRemove} style={s.flex} />
            </Row>
          </Field>
        </>
      )}
      <Done onPress={onDone} />
    </>
  );
}

// ---- panel tools ------------------------------------------------------------

const TONES = [
  { id: 0.2, label: 'Light' },
  { id: 0.5, label: 'Medium' },
  { id: 0.8, label: 'Heavy' },
];

const ZOOMS = [1, 1.5, 2, MAX_ZOOM].map((id) => ({ id, label: `${id}×` }));

const BACKGROUNDS: { id: Background; label: string }[] = [
  { id: 'keep', label: 'Keep' },
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
];

const SIZES = [
  { id: 0.75, label: 'Small' },
  { id: 1, label: 'Normal' },
  { id: 1.3, label: 'Large' },
  { id: 1.7, label: 'Huge' },
];

const TILTS = [-14, -7, 0, 7, 14].map((d) => ({ id: d, label: d === 0 ? '0°' : `${d > 0 ? '+' : ''}${d}°` }));

const nearest = (options: { id: number }[], v: number) =>
  options.reduce((a, b) => (Math.abs(b.id - v) < Math.abs(a.id - v) ? b : a)).id;

export function PanelTools({
  panel,
  canRemove,
  hasSubject,
  canMoveBack,
  canMoveOn,
  onMove,
  onInk,
  onZoom,
  onReplace,
  onRemove,
  onAdd,
  onDone,
}: {
  panel: Panel;
  canRemove: boolean;
  hasSubject: boolean;
  canMoveBack: boolean;
  canMoveOn: boolean;
  onMove: (by: -1 | 1) => void;
  onInk: (patch: Partial<InkParams>) => void;
  onZoom: (zoom: number) => void;
  onReplace: () => void;
  onRemove: () => void;
  onAdd: (k: TextKind | MarkKind, isMark?: boolean) => void;
  onDone: () => void;
}) {
  const s = useStyles();
  const tone = nearest(TONES, panel.ink.ink);
  const zoom = nearest(ZOOMS, panel.zoom || 1);
  return (
    <>
      <Field label="Tone">
        <Segmented options={TONES} value={tone} onChange={(ink) => onInk({ ink })} />
      </Field>
      <Field label="Lines">
        <Segmented
          options={[{ id: 0, label: 'None' }, { id: 0.6, label: 'Soft' }, { id: 1, label: 'Bold' }]}
          value={panel.ink.lines}
          onChange={(lines) => onInk({ lines })}
        />
      </Field>
      <Field label="Effect">
        <Segmented
          options={[{ id: 'none' as const, label: 'None' }, { id: 'focus' as const, label: 'Focus lines' }, { id: 'speed' as const, label: 'Speed lines' }]}
          value={panel.ink.fx}
          onChange={(fx) => onInk({ fx })}
        />
      </Field>
      {hasSubject && (
        <Field label="Background">
          <Segmented options={BACKGROUNDS} value={panel.ink.bg ?? 'keep'} onChange={(bg) => onInk({ bg })} />
        </Field>
      )}
      <Field label="Zoom">
        <Segmented options={ZOOMS} value={zoom} onChange={onZoom} />
      </Field>
      {(canMoveBack || canMoveOn) && (
        <Field label="Order">
          <Row>
            <Button label="‹ Move earlier" onPress={() => onMove(-1)} disabled={!canMoveBack} style={s.flex} />
            <Button label="Move later ›" onPress={() => onMove(1)} disabled={!canMoveOn} style={s.flex} />
          </Row>
        </Field>
      )}
      <Field label="Add to this panel">
        <AddKinds onAdd={onAdd} />
        <AddMarks onAdd={(m) => onAdd(m, true)} />
      </Field>
      <Row>
        <Button label="Replace photo" onPress={onReplace} style={s.flex} />
        {canRemove && <Button label="Remove" danger onPress={onRemove} style={s.flex} />}
        <Button label="Done" variant="solid" onPress={onDone} style={s.flex} />
      </Row>
    </>
  );
}

// every kind of text, three to a row so the labels fit a phone
const KIND_ROWS: TextKind[][] = [
  ['bubble', 'shout', 'whisper'],
  ['thought', 'caption', 'sfx'],
];

export function AddKinds({ onAdd }: { onAdd: (k: TextKind) => void }) {
  const s = useStyles();
  return KIND_ROWS.map((row, i) => (
    <Row key={i}>
      {row.map((k) => (
        <Button key={k} label={KIND_LABEL[k]} onPress={() => onAdd(k)} style={s.flex} />
      ))}
    </Row>
  ));
}

export function AddMarks({ onAdd }: { onAdd: (m: MarkKind) => void }) {
  const s = useStyles();
  return MARK_ROWS.map((row, i) => (
    <Row key={i}>
      {row.map((m) => (
        <Button key={m} label={MARK_LABEL[m]} onPress={() => onAdd(m)} style={s.flex} />
      ))}
    </Row>
  ));
}

// ---- item tools -------------------------------------------------------------

type ItemToolsProps = {
  item: TextItem;
  onChange: (patch: Partial<TextItem>) => void;
  onShuffle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRestack: (toFront: boolean) => void;
  canRestack: boolean;
  onNudge: (dx: number, dy: number) => void;
  onDone: () => void;
};

export function ItemTools(props: ItemToolsProps) {
  return props.item.kind === 'mark' ? <MarkTools {...props} /> : <TextTools {...props} />;
}

function MarkTools({ item, onChange, onDelete, onDuplicate, onRestack, canRestack, onNudge, onDone }: ItemToolsProps) {
  return (
    <>
      <Field label="Mark">
        {MARK_ROWS.map((row, i) => (
          <Segmented
            key={i}
            options={row.map((m) => ({ id: m, label: MARK_LABEL[m] }))}
            value={item.mark ?? 'sweat'}
            onChange={(mark) => onChange({ mark })}
          />
        ))}
      </Field>
      <Field label="Size">
        <Segmented options={SIZES} value={nearest(SIZES, itemSize(item))} onChange={(size) => onChange({ size })} />
      </Field>
      <Field label="Facing">
        <Segmented options={SIDES} value={item.flip ? 1 : 0} onChange={(v) => onChange({ flip: v === 1 })} />
      </Field>
      <Field label="Tilt">
        <Segmented options={TILTS} value={item.rotate ?? 0} onChange={(rotate) => onChange({ rotate })} />
      </Field>
      <Nudge onNudge={onNudge} />
      {canRestack && <Restack onRestack={onRestack} />}
      <ItemActions onDelete={onDelete} onDuplicate={onDuplicate} onDone={onDone} />
    </>
  );
}

function TextTools({ item, onChange, onShuffle, onEdit, onDelete, onDuplicate, onRestack, canRestack, onNudge, onDone }: ItemToolsProps) {
  const s = useStyles();
  const kind = item.kind as TextKind;
  return (
    <>
      <Field label={KIND_LABEL[kind]}>
        <Row>
          <Button label="Shuffle" onPress={onShuffle} style={s.flex} />
          <Button label="Edit" onPress={onEdit} style={s.flex} />
        </Row>
      </Field>
      <Field label="Style">
        {KIND_ROWS.map((row, i) => (
          <Segmented
            key={i}
            options={row.map((k) => ({ id: k, label: KIND_LABEL[k] }))}
            value={kind}
            onChange={(next) => onChange({ kind: next, rotate: next === 'sfx' ? (item.rotate ?? -8) : item.rotate })}
          />
        ))}
      </Field>
      <Field label="Size">
        <Segmented options={SIZES} value={nearest(SIZES, itemSize(item))} onChange={(size) => onChange({ size })} />
      </Field>
      {isBalloon(kind) && (
        <Field label="Tail">
          <Segmented options={SIDES} value={item.flip ? 1 : 0} onChange={(v) => onChange({ flip: v === 1 })} />
        </Field>
      )}
      {kind === 'sfx' && (
        <Field label="Letters">
          <Segmented
            options={[{ id: 0, label: 'Across' }, { id: 1, label: 'Down' }]}
            value={item.vertical ? 1 : 0}
            onChange={(v) => onChange({ vertical: v === 1, rotate: v === 1 ? 0 : (item.rotate ?? -8) })}
          />
        </Field>
      )}
      {kind === 'sfx' && (
        <Field label="Tilt">
          <Segmented options={TILTS} value={item.rotate ?? -8} onChange={(rotate) => onChange({ rotate })} />
        </Field>
      )}
      <Nudge onNudge={onNudge} />
      {canRestack && <Restack onRestack={onRestack} />}
      <ItemActions onDelete={onDelete} onDuplicate={onDuplicate} onDone={onDone} />
    </>
  );
}

// small steps for placing an item exactly, where a finger covers the spot
const NUDGE = 4; // page units
const NUDGES: { label: string; dx: number; dy: number }[] = [
  { label: '←', dx: -NUDGE, dy: 0 },
  { label: '↑', dx: 0, dy: -NUDGE },
  { label: '↓', dx: 0, dy: NUDGE },
  { label: '→', dx: NUDGE, dy: 0 },
];

function Nudge({ onNudge }: { onNudge: (dx: number, dy: number) => void }) {
  const s = useStyles();
  return (
    <Field label="Nudge">
      <Row>
        {NUDGES.map((n) => (
          <Button key={n.label} label={n.label} onPress={() => onNudge(n.dx, n.dy)} style={s.flex} />
        ))}
      </Row>
    </Field>
  );
}

// where the item sits among the others on the page
function Restack({ onRestack }: { onRestack: (toFront: boolean) => void }) {
  const s = useStyles();
  return (
    <Field label="Layer">
      <Row>
        <Button label="Send to back" onPress={() => onRestack(false)} style={s.flex} />
        <Button label="Bring to front" onPress={() => onRestack(true)} style={s.flex} />
      </Row>
    </Field>
  );
}

const SIDES = [{ id: 0, label: 'Left' }, { id: 1, label: 'Right' }];

function ItemActions({ onDelete, onDuplicate, onDone }: { onDelete: () => void; onDuplicate: () => void; onDone: () => void }) {
  const s = useStyles();
  return (
    <Row>
      <Button label="Delete" danger onPress={onDelete} style={s.flex} />
      <Button label="Duplicate" onPress={onDuplicate} style={s.flex} />
      <Button label="Done" variant="solid" onPress={onDone} style={s.flex} />
    </Row>
  );
}

export function Done({ onPress }: { onPress: () => void }) {
  return <Button label="Done" variant="solid" onPress={onPress} />;
}

const useStyles = themed(() => StyleSheet.create({
  flex: { flex: 1, paddingHorizontal: space(1) },
}));
