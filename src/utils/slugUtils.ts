export const offensiveWords = [
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'bastard', 'crap', 'piss',
  'sex', 'porn', 'nude', 'naked', 'xxx', 'adult', 'escort', 'prostitute',
  'nazi', 'hitler', 'terrorist', 'bomb', 'kill', 'murder', 'death', 'suicide',
  'drug', 'cocaine', 'heroin', 'weed', 'marijuana', 'meth', 'crack',
  'hate', 'racist', 'nigger', 'faggot', 'retard', 'stupid', 'idiot',
  'scam', 'fraud', 'fake', 'spam', 'virus', 'hack', 'illegal',
  'admin', 'root', 'system', 'api', 'www', 'mail', 'email', 'support',
  'test', 'demo', 'sample', 'example', 'null', 'undefined', 'error'
];

export const isSlugOffensive = (slug: string): boolean => {
  const cleanSlug = slug.toLowerCase().replace(/[-_0-9]/g, '');
  return offensiveWords.some(word =>
    cleanSlug.includes(word) ||
    cleanSlug === word ||
    cleanSlug.startsWith(word) ||
    cleanSlug.endsWith(word)
  );
};
