/** Word pools used to build default phone number nicknames. */
const ADJECTIVES = [
  'amber',
  'silver',
  'quiet',
  'bold',
  'swift',
  'crisp',
  'gentle',
  'vivid',
  'hollow',
  'bright',
  'dusty',
  'copper',
  'frozen',
  'lucky',
  'mellow',
  'north',
  'sunny',
  'wild',
  'calm',
  'rapid',
  'hidden',
  'golden',
  'misty',
  'sturdy',
] as const;

const NOUNS = [
  'harbor',
  'meadow',
  'signal',
  'lantern',
  'ridge',
  'compass',
  'echo',
  'summit',
  'drift',
  'anchor',
  'beacon',
  'canyon',
  'falcon',
  'garden',
  'island',
  'juniper',
  'kernel',
  'lagoon',
  'mirror',
  'orbit',
  'prairie',
  'quartz',
  'river',
  'spruce',
] as const;

const FLAVOR = [
  'line',
  'post',
  'relay',
  'node',
  'desk',
  'gate',
  'loop',
  'port',
  'route',
  'wave',
] as const;

function hashPhoneNumber(phoneNumber: string): number {
  const digits = phoneNumber.replace(/\D/g, '');
  let hash = 0;
  for (let i = 0; i < digits.length; i += 1) {
    hash = (hash * 31 + digits.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickWord<T extends readonly string[]>(words: T, hash: number, slot: number): string {
  return words[(hash + slot * 17) % words.length]!;
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Deterministic nickname from random word pools (same number → same default nickname). */
export function generateDefaultNickname(phoneNumber: string): string {
  const hash = hashPhoneNumber(phoneNumber);
  const useThreeWords = hash % 3 === 0;
  const parts = [
    titleCase(pickWord(ADJECTIVES, hash, 0)),
    titleCase(pickWord(NOUNS, hash, 1)),
  ];
  if (useThreeWords) {
    parts.push(titleCase(pickWord(FLAVOR, hash, 2)));
  }
  return parts.join(' ');
}
