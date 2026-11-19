// Lints the word bank: run with `npm run words`. Exits non-zero on a problem.
//   - no line twice in a pool, or in both a mood pool and the shared one
//   - shouts in capitals, whispers in lower case
//   - lines short enough to letter: long ones wrap into tall, crowded balloons
import { POOLS } from '@/words/bank';

const MAX_LEN: Record<string, number> = { sfx: 16, shout: 26, whisper: 40, bubble: 48, thought: 44, caption: 48 };

const problems: string[] = [];
const { shared, moods, titleStandalone } = POOLS;

const check = (where: string, kind: string, lines: string[]) => {
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line)) problems.push(`${where}.${kind}: twice: "${line}"`);
    seen.add(line);
    if (line.length > MAX_LEN[kind]) problems.push(`${where}.${kind}: ${line.length} chars, max ${MAX_LEN[kind]}: "${line}"`);
    if (kind === 'shout' && line !== line.toUpperCase()) problems.push(`${where}.shout: not in capitals: "${line}"`);
    if (kind === 'whisper' && line !== line.toLowerCase()) problems.push(`${where}.whisper: not in lower case: "${line}"`);
  }
};

for (const [kind, lines] of Object.entries(shared)) check('shared', kind, lines);
for (const [mood, pool] of Object.entries(moods)) {
  for (const [kind, lines] of Object.entries(pool)) {
    check(mood, kind, lines);
    const common = new Set(shared[kind as keyof typeof shared]);
    for (const line of lines) if (common.has(line)) problems.push(`${mood}.${kind}: also in shared: "${line}"`);
  }
}
for (const [mood, titles] of Object.entries(titleStandalone)) {
  if (new Set(titles).size !== titles.length) problems.push(`titles.${mood}: a title twice`);
}

let total = Object.values(shared).flat().length;
for (const pool of Object.values(moods)) total += Object.values(pool).flat().length;

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`word bank ok: ${total} lines in ${Object.keys(moods).length} moods`);
