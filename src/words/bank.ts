import type { Mood, TextKind } from '@/page/types';

// Everything the page can say. Per mood, per kind, plus a shared pool so
// shuffles never feel repetitive. Keep lines short: they live in bubbles.
// Shouts are written in capitals and whispers in lower case, as lettered.

type Pool = Record<TextKind, string[]>;

const shared: Pool = {
  sfx: [
    'BAM!', 'THUD', 'WHAM!', 'SNAP', 'CLICK', 'TAP TAP', 'KRAK!', 'WHOOSH', 'SWISH', 'FWIP', 'GULP', 'SIGH...', 'HUFF', 'GASP!', 'SHFF', 'DING!', 'BZZT', 'CREAK', 'DRIP', 'SPLASH!',
    'RUSTLE', 'STOMP', 'ZING!', 'POP!', 'RUMBLE', 'THUMP', 'FWOOSH', 'TICK TOCK', 'KNOCK KNOCK', 'BEEP BEEP',
    'CLATTER', 'SQUISH', 'THWIP', 'WHIRR', 'CLACK', 'SHAKE SHAKE', 'PING!', 'GRRR',
  ],
  bubble: [
    'Wait... what?', 'No way.', 'Seriously?!', 'Huh?', 'Not again...', 'Here we go.', 'Hold on.',
    'You saw that, right?', 'This changes everything.', 'I knew it!', 'Okay. Okay okay okay.',
    'Is this real?', 'Let\'s do this.', 'Too late now.', 'Why is it always me?',
    'Don\'t look at me like that.', 'That\'s... actually amazing.', 'Five more minutes.', 'Just one more.',
    'Trust me.', 'We don\'t talk about this.', 'Nobody saw that.', 'Act natural.', 'I can explain.',
    'Who did this?!', 'So... now what?', 'You first.', 'Same as always.',
    'I\'ve got a bad feeling about this.', 'Did you hear that?', 'It\'s fine. I\'m fine.',
    'That\'s not how I remember it.', 'Give me a second.', 'Wait for it...', 'You\'re kidding.',
    'How long have you been there?', 'I was here first.', 'We need to talk.', 'Is it just me, or...?',
    'Let me guess.',
  ],
  shout: [
    'WHAT?!', 'NO WAY!!', 'HEY!!', 'STOP!!', 'WAIT!!', 'SERIOUSLY?!', 'NOT AGAIN!!', 'LOOK OUT!!',
    'OVER HERE!!', 'WHY ME?!', 'HOLD IT!!', 'ARE YOU KIDDING ME?!',
  ],
  whisper: [
    'psst...', 'did you hear that?', 'don\'t tell anyone...', 'over here...', 'shh... they\'ll hear us',
    'just between us...', 'is it gone?', 'quiet...', 'look, over there...', 'i think so...',
  ],
  thought: [
    'Stay calm...', 'Don\'t panic.', 'Why am I like this?', 'Is it just me?', 'Focus...', 'This is fine.',
    'They can\'t know.', 'Not today.', 'Remember this moment.', 'Breathe.', 'Just a little longer...',
    'Did I lock the door?', 'I should have stayed in bed.', 'Worth it.', 'What was I doing again?',
    'Say something. Anything.', 'Here goes nothing.', 'Don\'t overthink it.', 'Did that really just happen?',
    'I\'ll pretend I didn\'t see that.',
  ],
  caption: [
    'Meanwhile...', 'Later that day...', 'And so, it began.', 'Some time later...', 'That morning...',
    'Little did I know...', 'It was an ordinary day.', 'Or so I thought.', 'Then it happened.',
    'Nobody expected this.', 'To be continued...', 'The next morning...', 'Back at home...',
    'Five minutes earlier...', 'One hour later...', 'At that very moment...', 'Elsewhere...',
    'That night...', 'A week later...', 'Earlier that day...', 'Just around the corner...',
    'The end. Or is it?',
  ],
};

const moods: Record<Mood, Pool> = {
  action: {
    sfx: [
      'BOOM!', 'KABOOM!', 'KRAKOOM!', 'SLASH!', 'CLANG!', 'DOOM', 'ZOOOM', 'VRRRM', 'SHING!', 'KA-CHUNK',
      'SMASH!', 'CRASH!', 'POW!', 'WHAAM!', 'FWOOM', 'GOGOGOGO', 'ZWOOSH', 'THWACK!', 'SKREEE', 'KRZZT',
      'BLAM!', 'ZAAAP', 'SHRAAK!', 'DADADADA', 'VWOOM', 'KRSSH', 'SHOOM', 'BWOOM', 'CHK-CHK', 'HAAA!',
      'KRAK-THOOM', 'SCREEECH', 'BRRRAP', 'ZING-ZING', 'KLANG!', 'FSSHHH', 'DRRRRR', 'THOOM', 'WHOMP',
      'SHAAAA',
    ],
    bubble: [
      'Is that all you\'ve got?!', 'Not yet... I\'m not done yet!', 'Stand back!', 'Leave this to me.',
      'Now it\'s my turn.', 'You\'re too slow!', 'I won\'t lose. Not here.', 'This ends now!', 'Get down!',
      'I\'ve been waiting for this.', 'Let\'s settle this.', 'Watch closely.', 'Again!',
      'Hit me with everything.', 'I never back down.', 'Run!!', 'We go together. Now!',
      'This is my true power!', 'One more round.', 'Don\'t you dare give up!', 'I\'m just getting started.',
      'Move!', 'Follow my lead.', 'That was a warm-up.', 'Nobody touches my coffee.', 'Cover me!',
      'You\'ll have to go through me.', 'I saw that coming.', 'Last one there buys lunch!', 'Hold the line!',
      'That\'s my signature move.', 'Not bad... for a beginner.', 'Get ready. Here it comes!',
      'I\'ll handle the big one.', 'We finish this together.', 'You picked the wrong day.',
      'Is that a challenge?', 'Three seconds. That\'s all I need.', 'They\'re everywhere!',
      'Brace yourself!',
    ],
    shout: [
      'RUUUN!!', 'NOW!!', 'GET DOWN!!', 'TAKE THIS!!', 'I WON\'T LOSE!!', 'BEHIND YOU!!', 'FULL POWER!!',
      'CHAAARGE!!', 'ONE MORE TIME!!', 'MOVE IT!!', 'THIS ENDS NOW!!', 'DON\'T STOP!!', 'GO GO GO!!',
      'NOT ON MY WATCH!!', 'HAAAAA!!',
    ],
    whisper: [
      'on my signal...', 'stay low.', 'they\'re close...', 'three... two...', 'not a sound.',
      'wait for it...', 'we only get one chance.', 'cover the left.', 'nobody moves.', 'i see it.',
    ],
    thought: [
      'Faster... I need to be faster!', 'There\'s an opening!', 'My body moved on its own.',
      'One shot. That\'s all I get.', 'Don\'t blink.', 'This power...!', 'Not like this...',
      'Every second counts.', 'I can see it now.', 'Now or never.', 'Keep going!',
      'My legs won\'t stop shaking.', 'Stronger than I thought...', 'I have to protect them.',
      'Read the move. Counter.', 'Not yet... hold it...', 'The crowd is roaring.', 'Is this my limit? No.',
      'Just one more step!',
    ],
    caption: [
      'The battle had only just begun.', 'In that instant, everything changed.',
      'There was no turning back.', 'A storm was coming.', 'Round two.', 'The final stage.',
      'The clock was ticking.', 'Victory was within reach.', 'And then — chaos.', 'No one moved.',
      'The rival appeared.', 'Ten seconds left.', 'The crowd went silent.', 'It came from nowhere.',
      'Both sides were exhausted.', 'This was the decisive moment.', 'The ground began to shake.',
      'The last lap.',
    ],
  },
  drama: {
    sfx: [
      'DOKUN', 'BA-DUMP', 'ZAWA ZAWA', 'GOGOGO', '...', '!?', '!!', 'KA-THUNK', 'THRUM', 'SHIVER',
      'PITTER PATTER', 'HUSH', 'CRACK', 'TREMBLE', 'SWAY', 'FLICKER', 'WHISPER', 'TOLL', 'RING...',
      'DRIP... DRIP', 'CREEEAK', 'SHATTER', 'THUD...', 'SLAM', 'TICK... TICK...', 'RUMBLE...', 'FLUTTER',
      'SNIFF', 'CLICK.', 'WHOOO...',
    ],
    bubble: [
      'Why didn\'t you tell me?', 'I\'m sorry.', 'I never forgot.', 'You came back.', 'It\'s too late.',
      'I\'ll wait. However long it takes.', 'Promise me.', 'You don\'t understand.', 'Don\'t go.',
      'This is goodbye, isn\'t it?', 'I was always here.', 'Look at me.', 'It was never about winning.',
      'This coffee... was my last hope.', 'Everything I did, I did for this.', 'I remember everything.',
      'We were happy once.', 'You changed.', 'I don\'t regret it.', 'Say something.', 'It\'s not over.',
      'Just this once... stay.', 'I wanted to tell you.', 'Some things can\'t be fixed.',
      'You knew. All this time, you knew.', 'I\'m not the person I used to be.', 'Then why are you crying?',
      'Tell me it isn\'t true.', 'I can\'t do this anymore.', 'We\'ll meet again. I know it.',
      'You were the only one.', 'It should have been me.', 'Forgive me.', 'I kept my promise. Did you?',
      'Don\'t you remember?',
    ],
    shout: [
      'WHY?!', 'DON\'T GO!!', 'YOU LIED TO ME!!', 'COME BACK!!', 'IT WASN\'T MY FAULT!!', 'ANSWER ME!!',
      'I TRUSTED YOU!!', 'ENOUGH!!', 'WAIT, PLEASE!!', 'TELL ME WHY!!',
    ],
    whisper: [
      'i\'m sorry...', 'please... stay.', 'i never stopped waiting.', 'it\'s okay now.', 'thank you...',
      'goodbye.', 'i\'m still here.', 'don\'t forget me.', 'it\'s alright...', 'i understand now.',
    ],
    thought: [
      'If only I had said it then.', 'Why does it hurt so much?', 'I can\'t cry here.',
      'This feeling... what is it?', 'Maybe it was always meant to be.', 'I\'m not ready.',
      'The silence was louder than words.', 'Was it all a lie?', 'I\'ll carry this forever.',
      'Don\'t turn around.', 'I should have stopped them.', 'Am I the one who changed?',
      'Just a little longer together...', 'I can\'t take it back now.', 'Why now, of all times?',
      'Their hands were shaking.',
    ],
    caption: [
      'That day, something broke.', 'And the rain kept falling.', 'Some promises are heavier than others.',
      'It was the last time we spoke.', 'The truth was closer than I thought.',
      'Years later, I still remember.', 'Neither of us said a word.', 'Fate had other plans.',
      'The light was fading.', 'Everything went quiet.', 'It was the beginning of the end.',
      'Nothing would ever be the same.', 'The letter was never sent.', 'No one came to the station.',
      'The answer had been there all along.', 'Three years had passed.', 'It was too late to say it.',
    ],
  },
  calm: {
    sfx: [
      'SIP', 'CLINK', 'PURR', 'TWEET', 'FLUTTER', 'HUM', 'SHHH', 'PAT PAT', 'NOM NOM', 'MUNCH',
      'SLURP', 'FWAH', 'YAWN', 'TIP TAP', 'PLIP', 'CHIRP', 'KOTO', 'POKA POKA', 'SIZZLE', 'BLOOP',
      'SNIP', 'SCRITCH', 'SWAY', 'PITTER PAT', 'FWUMP', 'CRUNCH', 'MEW',
    ],
    bubble: [
      'Nice weather today.', 'Let\'s take the long way home.', 'This is the good stuff.', 'Mmm. Perfect.',
      'I could stay here forever.', 'No plans. Just this.', 'Want some?', 'Smells like summer.',
      'Same time tomorrow?', 'Thanks for coming.', 'It\'s nice, isn\'t it?', 'Let\'s rest a bit.',
      'I like days like this.', 'Look at the sky.', 'Tea or coffee?', 'Slow mornings are the best.',
      'Let\'s not rush.', 'Hey, look at this.', 'We should come here more.', 'You look happy.',
      'The bread\'s still warm.', 'Did you hear the birds this morning?', 'Let\'s sit by the window.',
      'I made too much. Help me eat it?', 'It\'s raining. Good.', 'Let\'s walk a bit more.',
      'Remember this place?', 'I brought snacks.', 'The cat found the sunny spot again.',
      'Nowhere to be. Nothing to do.',
    ],
    shout: [
      'DINNER\'S READY!', 'OVER HERE!', 'LOOK, A RAINBOW!', 'GOOD MORNING!', 'WAIT FOR ME!', 'WE\'RE HOME!',
      'THE TEA\'S READY!', 'COME SEE THIS!',
    ],
    whisper: [
      'it\'s sleeping...', 'listen... the rain.', 'let\'s stay a bit longer.', 'so warm...', 'goodnight.',
      'don\'t wake it up.', 'the stars are out.', 'this is nice.',
    ],
    thought: [
      'Small things matter.', 'This is enough.', 'I want to remember today.', 'Peaceful...',
      'Time moves slower here.', 'Warm.', 'What a nice day.', 'I\'m glad I came.',
      'Happiness tastes like this.', 'Maybe I\'ll read a little.', 'The light is so soft today.',
      'No need to hurry.', 'I\'ll call them later.', 'Just five more minutes of this.',
    ],
    caption: [
      'A quiet afternoon.', 'Nothing special happened. And that was perfect.', 'The city was still asleep.',
      'Sunday, again.', 'Somewhere, a kettle whistled.', 'The light came in sideways.',
      'Just another ordinary, wonderful day.', 'Spring, finally.', 'The season was changing.',
      'Some moments ask for nothing.', 'An evening like any other.', 'The first snow of the year.',
      'The bakery opened at seven.', 'The laundry dried in the sun.', 'A breeze came through the window.',
    ],
  },
  comedy: {
    sfx: [
      'BONK!', 'SPLAT!', 'BOING!', 'DERP', 'PFFT', 'HONK!', 'SQUEAK', 'FLOP', 'WOBBLE', 'BLEP', 'KYAAA!',
      'GYAAH!', 'BWAHAHA', 'SNRK', 'TWITCH', 'SWEATDROP', 'FACEPALM', 'KERPLUNK', 'BOOP', 'SPROING!', 'WHAT',
      'NANI?!', 'DUN DUN DUN', 'TA-DAA!', 'CRICKETS', 'PLOP', 'TOOT', 'SKRRT', 'BAKA!', 'OOF', 'SQUONK',
      'BLORP', 'THWOMP', 'GIGGLE', 'YOINK!', 'BRB', 'WHEEZE', 'SPLORT',
    ],
    bubble: [
      'I meant to do that.', 'That went... well?', 'Nobody saw that. NOBODY.',
      'Ten out of ten. Would trip again.', 'I am a genius.', 'Don\'t tell mom.', 'Okay, plan B.',
      'There was no plan A.', 'Can we start over?', 'It\'s not a bug, it\'s a feature.', 'I regret nothing.',
      'Wait, that\'s mine!', 'My dignity...', 'Who put that there?!', 'Totally under control.',
      'I\'m on a diet. Starting tomorrow.', 'This is fine. Everything is fine.', 'Why is it sticky?',
      'I swear it was here a second ago.', 'Five-second rule!', 'Respect the snack.',
      'I\'m not lost. I\'m exploring.', 'Zero regrets. Some regrets.', 'Cat did it.',
      'Was that... my phone?', 'I read the instructions. Mostly.', 'Hold my snack.',
      'That\'s a problem for future me.', 'I\'m a professional.', 'In my defense, I was left unsupervised.',
      'It looked easier on the video.', 'Can we pretend this never happened?',
      'Okay, who brought the goose?', 'I have a plan. It\'s terrible.', 'Of course it\'s raining.',
    ],
    shout: [
      'MY SNACK!!', 'WHO ATE IT?!', 'THAT\'S NOT A CAT!!', 'I\'M FINE!!', 'NOT THE FACE!!', 'IT\'S STUCK!!',
      'WHY IS IT ON FIRE?!', 'I DIDN\'T TOUCH IT!!', 'DON\'T PRESS THAT!!', 'MOOOM!!', 'THAT WAS MY LUNCH!!',
    ],
    whisper: [
      'act natural...', 'i think it saw us.', 'nobody panic.', 'is it still looking?', 'blame the cat.',
      'don\'t make eye contact.', 'walk away slowly...', 'did it work?', 'i ate the last one.',
    ],
    thought: [
      'Abort. ABORT.', 'Why did I say that?!', 'Smooth. Very smooth.', 'Nailed it. Probably.',
      'Don\'t laugh. Don\'t laugh.', 'Is it too late to pretend I\'m asleep?', 'Oh no.',
      'My brain has left the chat.', 'Act cool...', 'Who designed this door?',
      'I am the main character. Right?', 'Should not have worn socks.', 'I can still save this. I cannot.',
      'Was that out loud?', 'Okay, but the snack was worth it.',
    ],
    caption: [
      'Spoiler: it did not go well.', 'It got worse.', 'The cat had seen everything.',
      'Narrator: they did not.', 'Three minutes later.', 'Somehow, this was a good idea.',
      'Plan A had failed.', 'And yet, no lessons were learned.', 'This was not on the schedule.',
      'The snack was never seen again.', 'Everyone pretended it didn\'t happen.',
      'Meanwhile, the goose was plotting.', 'It was, in fact, not fine.', 'Moments before disaster.',
      'They would talk about this for years.',
    ],
  },
  romance: {
    sfx: [
      'DOKI DOKI', 'BA-DUMP', 'THUMP THUMP', 'FLUTTER', 'KYUN', 'BLUSH', 'FWAH', 'SPARKLE', 'SHIMMER',
      'GLOW', 'TWINKLE', 'PITTER PATTER', 'HUSH', 'TOUCH', 'GIGGLE', 'SWOON', 'PAT', 'FLOAT',
      'CHIME',
    ],
    bubble: [
      'Do you want to walk home together?', 'I saved you a seat.', 'You remembered!', 'It suits you.',
      'I\'m glad it was you.', 'Is this... a date?', 'Your hands are cold. Here.',
      'I\'ll walk you to the station.', 'I was hoping you\'d come.', 'Can I tell you something?',
      'You always notice the little things.', 'Let\'s stay a little longer.', 'I made this for you.',
      'You have something on your face. ...There.', 'You\'re staring.', 'Same umbrella?',
      'It\'s not like I was waiting for you or anything.', 'I like it when you laugh.',
      'Thank you for today.', 'Next time, let\'s go together.', 'Did you mean what you said?', 'Hold still.',
      'You\'re the first person I wanted to tell.', 'Stay. Just for a bit.',
    ],
    shout: [
      'I LIKE YOU!!', 'WAIT FOR ME!!', 'IT\'S NOT LIKE THAT!!', 'DON\'T SAY IT SO LOUD!!',
      'SEE YOU TOMORROW!!', 'I\'LL BE THERE!!',
    ],
    whisper: [
      'i\'m glad you\'re here.', 'don\'t let go.', 'just a little closer...', 'you\'re warm.',
      'is my face red?', 'thank you... for everything.', 'stay with me.', 'i\'ve liked you for a long time.',
    ],
    thought: [
      'Why is my heart racing?', 'Did they just smile at me?', 'Say it. Just say it.',
      'I want this moment to last.', 'Their voice is so gentle.', 'Calm down, calm down...',
      'Is my hair okay?!', 'They remembered my name.', 'I can\'t look them in the eye.',
      'I think I\'m in trouble.', 'Maybe... just maybe.', 'Today felt different.',
    ],
    caption: [
      'That was the day I noticed.', 'The cherry blossoms were falling.', 'We shared one umbrella.',
      'It started with a borrowed pen.', 'Neither of us said goodbye.',
      'The train was late. Neither of us minded.', 'Summer festival night.', 'The fireworks began.',
      'Just the two of us.', 'Their seat was empty for the first time.',
      'A letter was waiting in my locker.', 'And then, they smiled.',
    ],
  },
  spooky: {
    sfx: [
      'CREEEAK', 'DRIP... DRIP', 'SCRITCH', 'THUMP...', 'WHOOOO', 'KNOCK... KNOCK', 'SKREEE', 'FLICKER',
      'HISS', 'TAP... TAP...', 'RATTLE', 'CRACK', 'SHHHH', 'GURGLE', 'SLAM!', 'TICK... TICK...', 'SCRAAAPE', 'ZZZT',
    ],
    bubble: [
      'That door was closed a minute ago.', 'Who\'s there?', 'Don\'t go in there.',
      'We shouldn\'t be here.', 'It\'s just the wind... right?', 'The lights were on when we left.',
      'Why is it so cold all of a sudden?', 'Something\'s watching us.', 'Let\'s go back. Now.',
      'That wasn\'t there before.', 'You saw it too, didn\'t you?', 'Stay close.',
      'Whose footsteps are those?', 'The phone has no signal.', 'Don\'t look behind you.',
      'It knows our names.', 'I counted five of us. Now there are six.', 'This place is on no map.',
      'Why is the music box playing?',
    ],
    shout: [
      'RUN!!', 'GET OUT!!', 'DON\'T OPEN IT!!', 'IT\'S BEHIND YOU!!', 'WHO\'S THERE?!',
      'THE DOOR WON\'T OPEN!!', 'DON\'T LOOK!!',
    ],
    whisper: [
      'did you hear that...?', 'it\'s under the bed.', 'don\'t breathe.', 'it\'s coming closer...',
      'we\'re not alone.', 'don\'t turn around.', 'it\'s listening.', 'leave... now...',
    ],
    thought: [
      'Just my imagination. Just my imagination.', 'I should never have opened it.',
      'Why is the hallway longer than before?', 'Don\'t scream.', 'Something\'s wrong with the mirror.',
      'I\'m sure I locked that door.', 'Where did everyone go?', 'That voice... it sounded like mine.',
      'Don\'t look up.', 'It\'s too quiet.',
    ],
    caption: [
      'The clock struck midnight.', 'The house had been empty for years.',
      'No one ever came back from the woods.', 'The candle went out.', 'The last bus never arrived.',
      'Something moved in the dark.', 'That was the first night.', 'The footsteps stopped right outside.',
      'The phone rang. No one was there.', 'In the morning, the room was empty.',
      'The basement light was on.', 'They found the diary in the attic.',
    ],
  },
};

// ---- titles --------------------------------------------------------------

const titleAdjectives = [
  'Last', 'Quiet', 'Forbidden', 'Unexpected', 'Final', 'Secret', 'Lost', 'Eternal', 'Broken', 'Silent',
  'Midnight', 'Golden', 'Endless', 'Hidden', 'Reckless', 'Crimson', 'Lazy', 'Legendary', 'Accidental',
  'Ordinary', 'Stolen', 'Borrowed', 'Rainy', 'Haunted', 'Tiny', 'Second', 'Strange', 'Forgotten', 'Electric',
  'Sleepy',
];
const titleNouns = [
  'Morning', 'Promise', 'Coffee', 'Rival', 'Bus Stop', 'Snack', 'Weekend', 'Rain', 'Battle', 'Shortcut',
  'Train', 'Deadline', 'Sky', 'Friend', 'Encounter', 'Departure', 'Lunch', 'Summer', 'Window', 'Return',
  'Umbrella', 'Rooftop', 'Festival', 'Letter', 'Station', 'Cat', 'Kitchen', 'Bicycle', 'Notebook',
  'Afternoon',
];
const titleEvents = [
  'Incident', 'Mystery', 'Showdown', 'Gamble', 'Awakening', 'Escape', 'Trial', 'Detour', 'Confession',
  'Disaster', 'Reunion', 'Prophecy', 'Experiment', 'Heist', 'Misunderstanding',
];

const titleStandalone: Record<Mood, string[]> = {
  action: [
    'Power Unleashed', 'No Turning Back', 'Rise Again', 'The Rival Appears', 'Full Speed', 'One Last Fight',
    'Break the Limit', 'Ten Seconds Left', 'Into the Storm', 'The Final Round', 'Unstoppable',
    'Faster Than Light',
  ],
  drama: [
    'Words Left Unsaid', 'Where the Rain Falls', 'Before the Light Fades', 'Goodbye, For Now',
    'The Weight of Today', 'A Promise Kept', 'The Letter Never Sent', 'What Remains', 'After the Silence',
    'Still Waiting', 'The Last Train', 'Echoes of Yesterday',
  ],
  calm: [
    'A Slow Sunday', 'Steam and Sunlight', 'Nothing Much, Really', 'The Long Way Home', 'Little Things',
    'Tea for Two', 'Window Seat', 'Morning Bread', 'A Day Off', 'The Quiet Hours', 'Fresh Laundry',
    'Under the Same Sky',
  ],
  comedy: [
    'Totally Under Control', 'Plan B (There Is No Plan B)', 'The Snack Wars', 'It Was the Cat', 'Mild Chaos',
    'Nobody Saw That', 'The Goose Incident', 'Assembly Required', 'Five-Second Rule',
    'Instructions Not Included', 'A Series of Bad Ideas', 'Who Ate My Lunch?',
  ],
  romance: [
    'Shared Umbrella', 'The Seat Beside You', 'Cherry Blossom Season', 'A Borrowed Pen', 'Heartbeat',
    'Walk Me Home', 'Summer Festival', 'Just the Two of Us', 'Love Letter', 'The First Snow, Together',
    'Red Thread', 'Say It Again',
  ],
  spooky: [
    'Don\'t Look Behind You', 'The Empty House', 'Midnight Visitor', 'Footsteps in the Hall',
    'The Sixth Guest', 'Lights Out', 'The Locked Room', 'Whispers in the Walls', 'Last Bus Home',
    'Something in the Attic', 'No Signal', 'The Mirror Lies',
  ],
};

// ---- picking -------------------------------------------------------------

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// `avoid` holds lines already on the page, so a shuffle does not repeat itself
export function randomLine(kind: TextKind, mood: Mood, avoid?: string | Set<string>): string {
  const taken = (line: string) => (typeof avoid === 'string' ? line === avoid : !!avoid?.has(line));
  // 70% from the mood, 30% from the shared pool
  for (let i = 0; i < 12; i++) {
    const pool = Math.random() < 0.7 ? moods[mood][kind] : shared[kind];
    const line = pick(pool);
    if (!taken(line)) return line;
  }
  return pick(moods[mood][kind]);
}

export function randomTitle(mood: Mood, avoid?: string): string {
  for (let i = 0; i < 6; i++) {
    const r = Math.random();
    const t =
      r < 0.4
        ? pick(titleStandalone[mood])
        : r < 0.75
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
  { id: 'romance', label: 'Romance' },
  { id: 'spooky', label: 'Spooky' },
];

export const KIND_LABEL: Record<TextKind, string> = {
  bubble: 'Speech',
  shout: 'Shout',
  whisper: 'Whisper',
  thought: 'Thought',
  caption: 'Caption',
  sfx: 'Sound',
};

// for tools/word-check.ts
export const POOLS = { shared, moods, titleStandalone };
