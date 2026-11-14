import type { Mood, TextKind } from '@/page/types';

// Everything the page can say. Per mood, per kind, plus a shared pool so
// shuffles never feel repetitive. Keep lines short: they live in bubbles.

type Pool = Record<TextKind, string[]>;

const shared: Pool = {
  sfx: [
    'BAM!', 'THUD', 'WHAM!', 'SNAP', 'CLICK', 'TAP TAP', 'KRAK!', 'WHOOSH', 'SWISH', 'FWIP',
    'DOKI DOKI', 'BA-DUMP', 'GULP', 'SIGH...', 'HUFF', 'GASP!', 'SHFF', 'DING!', 'BZZT', 'CREAK',
    'DRIP', 'SPLASH!', 'RUSTLE', 'STOMP', 'ZING!', 'POP!', 'RUMBLE', 'THUMP', 'FWOOSH', 'TICK TOCK',
  ],
  bubble: [
    'Wait... what?', 'No way.', 'Seriously?!', 'Huh?', 'Not again...', 'Here we go.', 'Hold on.',
    'You saw that, right?', 'This changes everything.', 'I knew it!', 'Okay. Okay okay okay.',
    'Is this real?', 'Let\'s do this.', 'Too late now.', 'Why is it always me?', 'Don\'t look at me like that.',
    'That\'s... actually amazing.', 'Five more minutes.', 'Just one more.', 'Trust me.',
    'We don\'t talk about this.', 'Nobody saw that.', 'Act natural.', 'I can explain.', 'Who did this?!',
  ],
  thought: [
    'Stay calm...', 'Don\'t panic.', 'Why am I like this?', 'Is it just me?', 'Focus...',
    'This is fine.', 'They can\'t know.', 'Not today.', 'Remember this moment.', 'Breathe.',
    'Just a little longer...', 'Did I lock the door?', 'I should have stayed in bed.', 'Worth it.',
  ],
  caption: [
    'Meanwhile...', 'Later that day...', 'And so, it began.', 'Some time later...', 'That morning...',
    'Little did I know...', 'It was an ordinary day.', 'Or so I thought.', 'Then it happened.',
    'Nobody expected this.', 'To be continued...', 'The next morning...', 'Back at home...',
    'Five minutes earlier...', 'One hour later...', 'At that very moment...', 'Elsewhere...',
  ],
};

const moods: Record<Mood, Pool> = {
  action: {
    sfx: [
      'BOOM!', 'KABOOM!', 'KRAKOOM!', 'SLASH!', 'CLANG!', 'DOOM', 'ZOOOM', 'VRRRM', 'SHING!', 'KA-CHUNK',
      'SMASH!', 'CRASH!', 'POW!', 'WHAAM!', 'FWOOM', 'GOGOGOGO', 'ZWOOSH', 'THWACK!', 'SKREEE', 'KRZZT',
      'BLAM!', 'ZAAAP', 'SHRAAK!', 'DADADADA', 'VWOOM', 'KRSSH', 'SHOOM', 'BWOOM', 'CHK-CHK', 'HAAA!',
    ],
    bubble: [
      'Is that all you\'ve got?!', 'Not yet... I\'m not done yet!', 'Stand back!', 'Leave this to me.',
      'Now it\'s my turn.', 'You\'re too slow!', 'I won\'t lose. Not here.', 'This ends now!',
      'Get down!', 'I\'ve been waiting for this.', 'Let\'s settle this.', 'Watch closely.',
      'Again!', 'Hit me with everything.', 'I never back down.', 'Run!!', 'We go together. Now!',
      'This is my true power!', 'One more round.', 'Don\'t you dare give up!', 'I\'m just getting started.',
      'Move!', 'Follow my lead.', 'That was a warm-up.', 'Nobody touches my coffee.',
    ],
    thought: [
      'Faster... I need to be faster!', 'There\'s an opening!', 'My body moved on its own.',
      'One shot. That\'s all I get.', 'Don\'t blink.', 'This power...!', 'Not like this...',
      'Every second counts.', 'I can see it now.', 'Now or never.', 'Keep going!',
    ],
    caption: [
      'The battle had only just begun.', 'In that instant, everything changed.', 'There was no turning back.',
      'A storm was coming.', 'Round two.', 'The final stage.', 'The clock was ticking.',
      'Victory was within reach.', 'And then — chaos.', 'No one moved.', 'The rival appeared.',
    ],
  },
  drama: {
    sfx: [
      'DOKUN', 'BA-DUMP', 'ZAWA ZAWA', 'GOGOGO', '...', '!?', '!!', 'KA-THUNK', 'THRUM', 'SHIVER',
      'PITTER PATTER', 'HUSH', 'CRACK', 'TREMBLE', 'SWAY', 'FLICKER', 'WHISPER', 'TOLL', 'RING...', 'DRIP... DRIP',
    ],
    bubble: [
      'Why didn\'t you tell me?', 'I\'m sorry.', 'I never forgot.', 'You came back.', 'It\'s too late.',
      'I\'ll wait. However long it takes.', 'Promise me.', 'You don\'t understand.', 'Don\'t go.',
      'This is goodbye, isn\'t it?', 'I was always here.', 'Look at me.', 'It was never about winning.',
      'This coffee... was my last hope.', 'Everything I did, I did for this.', 'I remember everything.',
      'We were happy once.', 'You changed.', 'I don\'t regret it.', 'Say something.', 'It\'s not over.',
      'Just this once... stay.', 'I wanted to tell you.', 'Some things can\'t be fixed.',
    ],
    thought: [
      'If only I had said it then.', 'Why does it hurt so much?', 'I can\'t cry here.',
      'This feeling... what is it?', 'Maybe it was always meant to be.', 'I\'m not ready.',
      'The silence was louder than words.', 'Was it all a lie?', 'I\'ll carry this forever.',
    ],
    caption: [
      'That day, something broke.', 'And the rain kept falling.', 'Some promises are heavier than others.',
      'It was the last time we spoke.', 'The truth was closer than I thought.', 'Years later, I still remember.',
      'Neither of us said a word.', 'Fate had other plans.', 'The light was fading.', 'Everything went quiet.',
      'It was the beginning of the end.', 'Nothing would ever be the same.',
    ],
  },
  calm: {
    sfx: [
      'SIP', 'CLINK', 'PURR', 'TWEET', 'RUSTLE', 'FLUTTER', 'HUM', 'SHHH', 'PAT PAT', 'NOM NOM',
      'MUNCH', 'SLURP', 'FWAH', 'YAWN', 'TIP TAP', 'PLIP', 'CHIRP', 'WHIRR', 'KOTO', 'POKA POKA',
    ],
    bubble: [
      'Nice weather today.', 'Let\'s take the long way home.', 'This is the good stuff.', 'Mmm. Perfect.',
      'I could stay here forever.', 'No plans. Just this.', 'Want some?', 'Smells like summer.',
      'Same time tomorrow?', 'Thanks for coming.', 'It\'s nice, isn\'t it?', 'Let\'s rest a bit.',
      'I like days like this.', 'Look at the sky.', 'Tea or coffee?', 'Slow mornings are the best.',
      'Let\'s not rush.', 'Hey, look at this.', 'We should come here more.', 'You look happy.',
    ],
    thought: [
      'Small things matter.', 'This is enough.', 'I want to remember today.', 'Peaceful...',
      'Time moves slower here.', 'Warm.', 'What a nice day.', 'I\'m glad I came.', 'Happiness tastes like this.',
    ],
    caption: [
      'A quiet afternoon.', 'Nothing special happened. And that was perfect.', 'The city was still asleep.',
      'Sunday, again.', 'Somewhere, a kettle whistled.', 'The light came in sideways.',
      'Just another ordinary, wonderful day.', 'Spring, finally.', 'The season was changing.',
      'Some moments ask for nothing.', 'An evening like any other.',
    ],
  },
  comedy: {
    sfx: [
      'BONK!', 'SPLAT!', 'BOING!', 'DERP', 'PFFT', 'HONK!', 'SQUEAK', 'FLOP', 'WOBBLE', 'BLEP',
      'KYAAA!', 'GYAAH!', 'BWAHAHA', 'SNRK', 'TWITCH', 'SWEATDROP', 'FACEPALM', 'KERPLUNK', 'BOOP', 'SPROING!',
      'WHAT', 'NANI?!', 'DUN DUN DUN', 'TA-DAA!', 'CRICKETS', 'PLOP', 'TOOT', 'SKRRT', 'BAKA!', 'OOF',
    ],
    bubble: [
      'I meant to do that.', 'That went... well?', 'Nobody saw that. NOBODY.', 'Ten out of ten. Would trip again.',
      'I am a genius.', 'Don\'t tell mom.', 'Okay, plan B.', 'There was no plan A.', 'Can we start over?',
      'It\'s not a bug, it\'s a feature.', 'I regret nothing.', 'Wait, that\'s mine!', 'My dignity...',
      'Who put that there?!', 'Totally under control.', 'I\'m on a diet. Starting tomorrow.',
      'This is fine. Everything is fine.', 'Why is it sticky?', 'I swear it was here a second ago.',
      'Five-second rule!', 'Respect the snack.', 'I\'m not lost. I\'m exploring.', 'Zero regrets. Some regrets.',
      'Cat did it.', 'Was that... my phone?',
    ],
    thought: [
      'Abort. ABORT.', 'Why did I say that?!', 'Smooth. Very smooth.', 'Nailed it. Probably.',
      'Don\'t laugh. Don\'t laugh.', 'Is it too late to pretend I\'m asleep?', 'Oh no.',
      'My brain has left the chat.', 'Act cool...', 'Who designed this door?', 'I am the main character. Right?',
    ],
    caption: [
      'Spoiler: it did not go well.', 'It got worse.', 'The cat had seen everything.', 'Narrator: they did not.',
      'Three minutes later.', 'Somehow, this was a good idea.', 'Plan A had failed.', 'And yet, no lessons were learned.',
      'This was not on the schedule.', 'The snack was never seen again.', 'Everyone pretended it didn\'t happen.',
    ],
  },
};

// ---- titles --------------------------------------------------------------

const titleAdjectives = [
  'Last', 'Quiet', 'Forbidden', 'Unexpected', 'Final', 'Secret', 'Lost', 'Eternal', 'Broken', 'Silent',
  'Midnight', 'Golden', 'Endless', 'Hidden', 'Reckless', 'Crimson', 'Lazy', 'Legendary', 'Accidental', 'Ordinary',
];
const titleNouns = [
  'Morning', 'Promise', 'Coffee', 'Rival', 'Bus Stop', 'Snack', 'Weekend', 'Rain', 'Battle', 'Shortcut',
  'Train', 'Deadline', 'Sky', 'Friend', 'Encounter', 'Departure', 'Lunch', 'Summer', 'Window', 'Return',
];
const titleEvents = ['Incident', 'Mystery', 'Showdown', 'Gamble', 'Awakening', 'Escape', 'Trial', 'Detour', 'Confession', 'Disaster'];

const titleStandalone: Record<Mood, string[]> = {
  action: ['Power Unleashed', 'No Turning Back', 'Rise Again', 'The Rival Appears', 'Full Speed', 'One Last Fight', 'Break the Limit'],
  drama: ['Words Left Unsaid', 'Where the Rain Falls', 'Before the Light Fades', 'Goodbye, For Now', 'The Weight of Today', 'A Promise Kept'],
  calm: ['A Slow Sunday', 'Steam and Sunlight', 'Nothing Much, Really', 'The Long Way Home', 'Little Things', 'Tea for Two'],
  comedy: ['Totally Under Control', 'Plan B (There Is No Plan B)', 'The Snack Wars', 'It Was the Cat', 'Mild Chaos', 'Nobody Saw That'],
};

// ---- picking -------------------------------------------------------------

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function randomLine(kind: TextKind, mood: Mood, avoid?: string): string {
  // 70% from the mood, 30% from the shared pool
  for (let i = 0; i < 6; i++) {
    const pool = Math.random() < 0.7 ? moods[mood][kind] : shared[kind];
    const line = pick(pool);
    if (line !== avoid) return line;
  }
  return pick(moods[mood][kind]);
}

export function randomTitle(mood: Mood, avoid?: string): string {
  for (let i = 0; i < 6; i++) {
    const r = Math.random();
    const t =
      r < 0.35
        ? pick(titleStandalone[mood])
        : r < 0.7
          ? `The ${pick(titleAdjectives)} ${pick(titleNouns)}`
          : `The ${pick(titleNouns)} ${pick(titleEvents)}`;
    if (t !== avoid) return t;
  }
  return pick(titleStandalone[mood]);
}

export const MOODS: { id: Mood; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'drama', label: 'Drama' },
  { id: 'calm', label: 'Calm' },
  { id: 'comedy', label: 'Comedy' },
];

export const KIND_LABEL: Record<TextKind, string> = {
  bubble: 'Speech',
  thought: 'Thought',
  caption: 'Caption',
  sfx: 'Sound',
};
