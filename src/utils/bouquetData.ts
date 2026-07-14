import { v4 as uuidv4 } from 'uuid';
import { getBouquetTranslations } from '../bouquetTranslations';

const FLOWER_IMAGE_MAP: Record<string, any> = {
  rose: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/rose.webp' },
  tulip: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/tulip.webp' },
  lily: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/lily.webp' },
  orchid: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/orchid.webp' },
  peony: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peony.webp' },
  daisy: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/daisy.webp' },
  carnation: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/carnation.webp' },
  chrysanthemum: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/chrysanthemum.webp' },
  lotus: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/lotus.webp' },
  camellia: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/camellia.webp' },
  sunflower: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/sunflower.webp' },
  alstroemeria: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/alstroemeria.webp' },
  anemone: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/anemone.webp' },
  buttercup: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/buttercup.webp' },
  coreopsis: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/coreopsis.webp' },
  cosmos: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/cosmos.webp' },
  freesia: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/freesia.webp' },
  gaillardia: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/gaillardia.webp' },
  'gerbera-daisy': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/gerbera%20daisy.webp' },
  hellebore: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/hellebore.webp' },
  zinnia: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/zinnia.webp' },
  'red-rose': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-rose.webp' },
  'purple-rose': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple-rose.webp' },
  'yellow-rose': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/yellow-rose.webp' },
  'ivory-rose': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/ivory-rose.webp' },
  'red-tulip': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-tulip.webp' },
  'purple-tulip': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple-tulip.webp' },
  'yellow-tulip': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/yellow-tulip.webp' },
  'orange-tulip': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/orange-tulip.webp' },
  'ivory-tulip': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/ivory-tulip.webp' },
  'pink-orchid': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink-orchid.webp' },
  'white-orchid': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white-orchid.webp' },
  'yellow-orchid': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/yellow-orchid.webp' },
  'red-peony': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-peony.webp' },
  'peach-peony': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peach-peony.webp' },
  'white-peony': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white-peony.webp' },
  'red-camellia': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-camellia.webp' },
  'peach-camellia': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peach-camellia.webp' },
  'white-camellia': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white-camellia.webp' },
  'pink-petals-daisy': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink-petals-daisy.webp' },
  'white-yellow-daisy': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white%20petals%20with%20yellow%20center%20daisy.webp' },
  // New Main Flowers & Tall Accents
  'pink-dahlia': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink_dahlia.webp' },
  'pink-hibiscus': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink_hibiscus.webp' },
  'cream-magnolia': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/cream_magnolia.webp' },
  'purple-delphinium': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple_delphinium.webp' },
  'pink-snapdragon': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink_snapdragon.webp' },
  'purple-wisteria': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple_wisteria.webp' },
  'peach-gladiolus': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peach_gladiolus.webp' },
  // Greenery Options
  'english-ivy': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/english_ivy.webp' },
  'maidenhair-fern': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/maidenhair_fern.webp' },
  'silver-dollar-eucalyptus': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/silver_dollar_eucalyptus.webp' },
  'sword-fern': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/sword_fern.webp' },
  'olive-branches': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/olive_branches.webp' },
  'baby-blue-eucalyptus': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/baby_blue_eucalyptus.webp' },
  'monstera-leaves': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/monstera_leaves.webp' },
  'ruscus-branches': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/ruscus_branches.webp' },
  // Filler Options
  'purple-blue-hydrangea': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple_blue_hydrangea.webp' },
  'white-hydrangea': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white_hydrangea.webp' },
  'light-blue-hydrangea': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/light_blue_hydrangea.webp' },
  'lilac-hydrangea': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/lilac_hydrangea.webp' },
  'bg-1': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/1.webp' },
  'bg-2': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/2.webp' },
  'bg-3': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/3.webp' },
  'bg-4': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/4.webp' },
  'bg-5': { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/5.webp' },
};

export const getFlowerImage = (id: string) => {
  return FLOWER_IMAGE_MAP[id] || null;
};

export const BG_IMAGES: any[] = [
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/1.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/2.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/3.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/4.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/5.webp' },
];

// BG images used in Greenery picker (isBg flag tells the screen to call setBackground instead)
export const GREENERY_OPTIONS: { id: string; label: string; isBg?: boolean; bgIndex?: number }[] = [
  { id: 'bg-1', label: '', isBg: true, bgIndex: 0 },
  { id: 'bg-2', label: '', isBg: true, bgIndex: 1 },
  { id: 'bg-3', label: '', isBg: true, bgIndex: 2 },
  { id: 'bg-4', label: '', isBg: true, bgIndex: 3 },
  { id: 'bg-5', label: '', isBg: true, bgIndex: 4 },
  { id: 'english-ivy', label: '' },
  { id: 'maidenhair-fern', label: '' },
  { id: 'silver-dollar-eucalyptus', label: '' },
  { id: 'sword-fern', label: '' },
  { id: 'olive-branches', label: '' },
  { id: 'baby-blue-eucalyptus', label: '' },
  { id: 'monstera-leaves', label: '' },
  { id: 'ruscus-branches', label: '' },
];

export const FILLER_OPTIONS: { id: string; label: string }[] = [
  { id: 'purple-blue-hydrangea', label: '' },
  { id: 'white-hydrangea', label: '' },
  { id: 'light-blue-hydrangea', label: '' },
  { id: 'lilac-hydrangea', label: '' },
  { id: 'purple-delphinium', label: '' },
  { id: 'pink-snapdragon', label: '' },
  { id: 'purple-wisteria', label: '' },
  { id: 'peach-gladiolus', label: '' },
];

export const FLOWER_GROUPS = [
  {
    id: 'rose', name: 'Rose', meaning: 'Love & Passion',
    purpose: 'Perfect for expressing deep romantic love.',
    bestFor: 'Partners, Spouses, Romantic Interests',
    colors: [
      { id: 'rose', name: 'Pink', hex: '#FFB6C1', meaning: 'Grace & Admiration', purpose: 'Expressing gratitude.', bestFor: 'Friends, Family' },
      { id: 'red-rose', name: 'Red', hex: '#DC143C', meaning: 'Deep Love & Romance', purpose: 'Passionate love.', bestFor: 'Partners, Spouses' },
      { id: 'purple-rose', name: 'Purple', hex: '#9370DB', meaning: 'Enchantment', purpose: 'New love.', bestFor: 'New Romance' },
      { id: 'yellow-rose', name: 'Yellow', hex: '#FFD700', meaning: 'Friendship & Joy', purpose: 'Celebrating friendship.', bestFor: 'Friends' },
      { id: 'ivory-rose', name: 'Ivory', hex: '#FFFFF0', meaning: 'Charm', purpose: 'Elegant care.', bestFor: 'Weddings' },
    ],
  },
  {
    id: 'tulip', name: 'Tulip', meaning: 'Perfect Love',
    purpose: 'Ideal for declaring new love.',
    bestFor: 'New Relationships, Friends',
    colors: [
      { id: 'tulip', name: 'Pink', hex: '#FFB6C1', meaning: 'Affection', purpose: 'Showing care.', bestFor: 'Family' },
      { id: 'red-tulip', name: 'Red', hex: '#DC143C', meaning: 'True Love', purpose: 'Eternal love.', bestFor: 'Partners' },
      { id: 'purple-tulip', name: 'Purple', hex: '#9370DB', meaning: 'Royalty', purpose: 'Special person.', bestFor: 'VIPs' },
      { id: 'yellow-tulip', name: 'Yellow', hex: '#FFD700', meaning: 'Cheerful', purpose: 'Sunshine.', bestFor: 'Happy Moments' },
      { id: 'orange-tulip', name: 'Orange', hex: '#FF8C00', meaning: 'Enthusiasm', purpose: 'Vibrant energy.', bestFor: 'Celebrations' },
      { id: 'ivory-tulip', name: 'Ivory', hex: '#FFFFF0', meaning: 'Forgiveness', purpose: 'Making amends.', bestFor: 'Apologies' },
    ],
  },
  {
    id: 'orchid', name: 'Orchid', meaning: 'Exotic Beauty & Strength',
    purpose: 'For someone unique and beautiful.',
    bestFor: 'Unique Individuals',
    colors: [
      { id: 'orchid', name: 'Purple', hex: '#9370DB', meaning: 'Royalty', purpose: 'Regal admiration.', bestFor: 'Distinguished' },
      { id: 'pink-orchid', name: 'Pink', hex: '#FFB6C1', meaning: 'Grace & Joy', purpose: 'Elegance.', bestFor: 'Graceful People' },
      { id: 'white-orchid', name: 'White', hex: '#FFFFFF', meaning: 'Purity', purpose: 'Refined beauty.', bestFor: 'Weddings' },
      { id: 'yellow-orchid', name: 'Yellow', hex: '#FFD700', meaning: 'New Beginnings', purpose: 'Fresh starts.', bestFor: 'New Friendships' },
    ],
  },
  {
    id: 'peony', name: 'Peony', meaning: 'Prosperity & Romance',
    purpose: 'Good luck and happy relationships.',
    bestFor: 'Weddings, Celebrations',
    colors: [
      { id: 'peony', name: 'Pink', hex: '#FFB6C1', meaning: 'Romance', purpose: 'Happiness.', bestFor: 'Weddings' },
      { id: 'red-peony', name: 'Red', hex: '#DC143C', meaning: 'Honor', purpose: 'Deep respect.', bestFor: 'Respect' },
      { id: 'peach-peony', name: 'Peach', hex: '#FFDAB9', meaning: 'Gratitude', purpose: 'Thankfulness.', bestFor: 'Thank You' },
      { id: 'white-peony', name: 'White', hex: '#FFFFFF', meaning: 'Compassion', purpose: 'Sincere affection.', bestFor: 'Sympathy' },
    ],
  },
  {
    id: 'daisy', name: 'Daisy', meaning: 'Innocence & New Beginnings',
    purpose: 'Cheer up a friend.',
    bestFor: 'Friends, New Beginnings',
    colors: [
      { id: 'daisy', name: 'White', hex: '#FFFFFF', meaning: 'Innocence', purpose: 'Pure joy.', bestFor: 'Children' },
      { id: 'pink-petals-daisy', name: 'Pink', hex: '#FFB6C1', meaning: 'Gentleness', purpose: 'Soft love.', bestFor: 'Gentle Souls' },
      { id: 'white-yellow-daisy', name: 'Classic', hex: '#FFFACD', meaning: 'True Love', purpose: 'Pure affection.', bestFor: 'Honest Love' },
      { id: 'gerbera-daisy', name: 'Gerbera', hex: '#FF6347', meaning: 'Cheerfulness', purpose: 'Joy.', bestFor: 'Happy Occasions' },
    ],
  },
  {
    id: 'camellia', name: 'Camellia', meaning: 'Adoration & Longing',
    purpose: 'Expressing deep feeling.',
    bestFor: 'Deep Affection',
    colors: [
      { id: 'camellia', name: 'Pink', hex: '#FFB6C1', meaning: 'Longing', purpose: 'Missing someone.', bestFor: 'Long Distance' },
      { id: 'red-camellia', name: 'Red', hex: '#DC143C', meaning: 'Passionate Love', purpose: 'Intense love.', bestFor: 'Desire' },
      { id: 'peach-camellia', name: 'Peach', hex: '#FFDAB9', meaning: 'Yearning', purpose: 'Longing.', bestFor: 'Distant Love' },
      { id: 'white-camellia', name: 'White', hex: '#FFFFFF', meaning: "You're Adorable", purpose: 'Sweet affection.', bestFor: 'Cute Gestures' },
    ],
  },
  { id: 'lily', name: 'Lily', meaning: 'Purity & Refined Beauty', purpose: 'Great for weddings.', bestFor: 'Weddings', colors: [{ id: 'lily', name: 'White', hex: '#FFFFFF', meaning: 'Purity', purpose: 'Pure intentions.', bestFor: 'Weddings' }] },
  { id: 'carnation', name: 'Carnation', meaning: 'Fascination & Love', purpose: 'Versatile flower.', bestFor: 'Friends, Family', colors: [{ id: 'carnation', name: 'Pink', hex: '#FFB6C1', meaning: 'Gratitude', purpose: 'Appreciation.', bestFor: 'Mothers' }] },
  { id: 'chrysanthemum', name: 'Chrysanthemum', meaning: 'Joy & Optimism', purpose: 'Bring happiness.', bestFor: 'Cheerful Occasions', colors: [{ id: 'chrysanthemum', name: 'Yellow', hex: '#FFD700', meaning: 'Joy', purpose: 'Cheerfulness.', bestFor: 'Happy Moments' }] },
  { id: 'lotus', name: 'Lotus', meaning: 'Purity & Enlightenment', purpose: 'Spiritual growth.', bestFor: 'Spiritual Moments', colors: [{ id: 'lotus', name: 'Pink', hex: '#FFB6C1', meaning: 'Spiritual Awakening', purpose: 'Rising above challenges.', bestFor: 'Spiritual Growth' }] },
  { id: 'sunflower', name: 'Sunflower', meaning: 'Adoration & Loyalty', purpose: 'Unwavering devotion.', bestFor: 'Friends, Family', colors: [{ id: 'sunflower', name: 'Yellow', hex: '#FFD700', meaning: 'Loyalty', purpose: 'Devotion.', bestFor: 'Loyal Friends' }] },
  { id: 'alstroemeria', name: 'Alstroemeria', meaning: 'Friendship & Devotion', purpose: 'Lasting friendships.', bestFor: 'Best Friends', colors: [{ id: 'alstroemeria', name: 'Mixed', hex: '#FF69B4', meaning: 'Lasting Friendship', purpose: 'Enduring bonds.', bestFor: 'Best Friends' }] },
  { id: 'anemone', name: 'Anemone', meaning: 'Anticipation', purpose: 'Looking forward.', bestFor: 'New Beginnings', colors: [{ id: 'anemone', name: 'Purple', hex: '#9370DB', meaning: 'Anticipation', purpose: 'Excited expectations.', bestFor: 'Upcoming Events' }] },
  { id: 'buttercup', name: 'Buttercup', meaning: 'Childishness & Joy', purpose: 'Playful moments.', bestFor: 'Children', colors: [{ id: 'buttercup', name: 'Yellow', hex: '#FFD700', meaning: 'Childlike Joy', purpose: 'Playful happiness.', bestFor: 'Playful Moments' }] },
  { id: 'coreopsis', name: 'Coreopsis', meaning: 'Always Cheerful', purpose: 'Constant happiness.', bestFor: 'Optimists', colors: [{ id: 'coreopsis', name: 'Yellow', hex: '#FFD700', meaning: 'Always Cheerful', purpose: 'Perpetual happiness.', bestFor: 'Optimists' }] },
  { id: 'cosmos', name: 'Cosmos', meaning: 'Order & Harmony', purpose: 'Peace.', bestFor: 'Peaceful Moments', colors: [{ id: 'cosmos', name: 'Pink', hex: '#FFB6C1', meaning: 'Harmony', purpose: 'Tranquility.', bestFor: 'Peace Seekers' }] },
  { id: 'freesia', name: 'Freesia', meaning: 'Trust', purpose: 'Building trust.', bestFor: 'New Friendships', colors: [{ id: 'freesia', name: 'White', hex: '#FFFFFF', meaning: 'Trust', purpose: 'Building trust.', bestFor: 'New Friends' }] },
  { id: 'gaillardia', name: 'Gaillardia', meaning: 'Strength', purpose: 'Inner strength.', bestFor: 'Encouragement', colors: [{ id: 'gaillardia', name: 'Red-Yellow', hex: '#FF6347', meaning: 'Strength', purpose: 'Resilience.', bestFor: 'Encouragement' }] },
  { id: 'hellebore', name: 'Hellebore', meaning: 'Serenity', purpose: 'Calm feelings.', bestFor: 'Relaxation', colors: [{ id: 'hellebore', name: 'Purple', hex: '#9370DB', meaning: 'Serenity', purpose: 'Tranquility.', bestFor: 'Calm Moments' }] },
  { id: 'zinnia', name: 'Zinnia', meaning: 'Remembrance', purpose: 'Thinking of someone.', bestFor: 'Missing Someone', colors: [{ id: 'zinnia', name: 'Mixed', hex: '#FF69B4', meaning: 'Remembrance', purpose: 'Thinking of you.', bestFor: 'Absent Friends' }] },
  {
    id: 'dahlia', name: 'Dahlia', meaning: 'Elegance & Inner Strength',
    purpose: 'Beautiful hero bloom with distinct petals.',
    bestFor: 'birthday, congratulations',
    colors: [
      { id: 'pink-dahlia', name: 'Pink Dahlia', hex: '#FF69B4', meaning: 'Grace and kindness', purpose: 'Grace', bestFor: 'Friends' }
    ]
  },
  {
    id: 'hibiscus', name: 'Hibiscus', meaning: 'Delicate Beauty',
    purpose: 'Tropical flair for vibrant bouquets.',
    bestFor: 'celebration, summer',
    colors: [
      { id: 'pink-hibiscus', name: 'Pink Hibiscus', hex: '#FF1493', meaning: 'Rare beauty', purpose: 'Rare', bestFor: 'Spouses' }
    ]
  },
  {
    id: 'magnolia', name: 'Magnolia', meaning: 'Nobility & Perseverance',
    purpose: 'Large elegant blossom.',
    bestFor: 'wedding, sympathy',
    colors: [
      { id: 'cream-magnolia', name: 'Cream Magnolia', hex: '#FFFDD0', meaning: 'Perseverance', purpose: 'Nobility', bestFor: 'Partners' }
    ]
  },
];

export const PRESETS: Record<string, { name: string; flowers: string[]; message: string; recipient: string; background?: number; greeneryBg?: string }> = {
  romantic_love: { name: 'Romantic Love', flowers: ['red-rose','red-peony','red-camellia','pink-orchid','red-tulip','peony'], message: 'You are my everything. Every moment with you is a treasure I hold close to my heart.', recipient: 'My Love', greeneryBg: 'english-ivy' },
  sweet_boyfriend: { name: 'Sweet Boyfriend', flowers: ['purple-rose','orchid','sunflower','yellow-tulip','gerbera-daisy','cosmos'], message: 'To my sweet boyfriend, you make every day brighter with your smile. I love you so much!', recipient: 'My Sweet Love', background: 1 },
  caring_girlfriend: { name: 'Caring Girlfriend', flowers: ['pink-orchid','rose','peach-peony','cosmos','freesia','alstroemeria'], message: 'To my amazing girlfriend, thank you for your love and care. You mean the world to me!', recipient: 'My Beautiful Love', greeneryBg: 'silver-dollar-eucalyptus' },
  mom: { name: 'Mom', flowers: ['rose','carnation','white-peony','pink-petals-daisy','lily','peach-camellia'], message: 'Dear Mom, thank you for your endless love and support. You are my inspiration!', recipient: 'Mom', background: 2 },
  best_friend: { name: 'Best Friend', flowers: ['alstroemeria','sunflower','gerbera-daisy','yellow-tulip','cosmos','zinnia'], message: 'To my best friend, thank you for always being there. Our friendship means everything to me!', recipient: 'My Best Friend', greeneryBg: 'maidenhair-fern' },
  wife: { name: 'Wife', flowers: ['red-rose','white-orchid','lily','white-camellia','white-peony','ivory-rose'], message: 'My wonderful wife, you are my everything. Thank you for being my partner in life.', recipient: 'My Wife', greeneryBg: 'olive-branches' },
  husband: { name: 'Husband', flowers: ['purple-rose','sunflower','gaillardia','orange-tulip','chrysanthemum','coreopsis'], message: 'My amazing husband, you make my life complete. Thank you for everything you do.', recipient: 'My Husband', greeneryBg: 'monstera-leaves' },
  sister: { name: 'Sister', flowers: ['pink-orchid','cosmos','pink-petals-daisy','rose','peach-peony','freesia'], message: "To my amazing sister, thank you for always being there. You're the best!", recipient: 'Sister', greeneryBg: 'sword-fern' },
  brother: { name: 'Brother', flowers: ['sunflower','gaillardia','orange-tulip','yellow-orchid','coreopsis','buttercup'], message: "Hey bro, thanks for always having my back. You're the best brother anyone could ask for!", recipient: 'Brother', greeneryBg: 'ruscus-branches' },
  get_well: { name: 'Get Well Soon', flowers: ['white-yellow-daisy','sunflower','freesia','yellow-tulip','cosmos','lily'], message: 'Wishing you a speedy recovery! Sending you lots of love and positive thoughts.', recipient: 'Dear Friend', greeneryBg: 'baby-blue-eucalyptus' },
  birthday: { name: 'Birthday', flowers: ['gerbera-daisy','red-rose','yellow-tulip','pink-orchid','sunflower','zinnia'], message: 'Happy Birthday! May your special day be filled with joy, laughter, and beautiful moments!', recipient: 'Birthday Star', background: 3 },
  anniversary: { name: 'Anniversary', flowers: ['red-rose','red-camellia','white-orchid','red-peony','ivory-rose','lily'], message: 'Happy Anniversary! Every year with you is more beautiful than the last.', recipient: 'My Love', greeneryBg: 'olive-branches' },
  thank_you: { name: 'Thank You', flowers: ['pink-petals-daisy','freesia','alstroemeria','cosmos','peach-peony','carnation'], message: 'Thank you so much for your kindness and support. It means the world to me!', recipient: 'Dear Friend', background: 4 },
  congratulations: { name: 'Congratulations', flowers: ['sunflower','yellow-tulip','gerbera-daisy','yellow-orchid','coreopsis','buttercup'], message: 'Congratulations on your amazing achievement! You deserve all the success!', recipient: 'Congratulations!', greeneryBg: 'silver-dollar-eucalyptus' },
  sympathy: { name: 'Sympathy', flowers: ['lily','white-orchid','white-peony','freesia','hellebore','lotus'], message: 'Thinking of you during this difficult time. Sending you comfort and strength.', recipient: 'With Sympathy', background: 1 },
  apology: { name: 'Apology', flowers: ['white-orchid','white-peony','lily','freesia','ivory-rose','white-camellia'], message: "I'm truly sorry. Please forgive me. You mean so much to me.", recipient: 'Dear One', greeneryBg: 'maidenhair-fern' },
  new_beginnings: { name: 'New Beginnings', flowers: ['white-yellow-daisy','anemone','freesia','cosmos','buttercup','yellow-tulip'], message: "Here's to new beginnings and exciting adventures ahead! Wishing you all the best!", recipient: 'Dear Friend', greeneryBg: 'baby-blue-eucalyptus' },
  peaceful_thoughts: { name: 'Peaceful Thoughts', flowers: ['lotus','hellebore','cosmos','white-orchid','freesia','lily'], message: 'Sending you peaceful thoughts and calming energy. May you find serenity.', recipient: 'Dear Friend', background: 0 },
  cheerful_vibes: { name: 'Cheerful Vibes', flowers: ['sunflower','gerbera-daisy','buttercup','coreopsis','yellow-tulip','zinnia'], message: 'Sending you sunshine and smiles! Hope this brightens your day!', recipient: 'Dear Friend', greeneryBg: 'english-ivy' },
};

export const MESSAGE_SUGGESTIONS = [
  { category: 'Romantic', messages: ['You are my everything. Every moment with you is a treasure.', 'My love for you grows stronger with each passing day.', 'You are the reason I smile, dream, and believe in love.', 'Every love story is beautiful, but ours is my favourite.'] },
  { category: 'Birthday', messages: ['Happy Birthday! May your day be filled with joy and laughter!', 'Wishing you a day as wonderful as you are!', 'Another year older, another year more amazing! Happy Birthday!', 'May your birthday be as special as you are to me!'] },
  { category: 'Thank You', messages: ['Thank you so much for your kindness. It means the world to me!', 'I am so grateful for everything you do. Thank you!', 'Your thoughtfulness never ceases to amaze me. Thank you!'] },
  { category: 'Friendship', messages: ['To my best friend, thank you for always being there!', 'Friends like you are rare and precious. Thank you!', 'Through thick and thin, you have been by my side.'] },
  { category: 'Get Well', messages: ['Wishing you a speedy recovery! Sending love and positive thoughts.', 'Get well soon! Take care and know I am thinking of you.', 'Sending healing thoughts your way!'] },
  { category: 'Anniversary', messages: ['Happy Anniversary! Every year with you is more beautiful.', 'Thank you for another year of love and laughter.', 'Our love story continues to be my favourite adventure.'] },
  { category: 'Congratulations', messages: ['Congratulations on your amazing achievement!', 'Your hard work and dedication have paid off. So proud of you!', 'This is just the beginning of great things to come!'] },
  { category: 'Sympathy', messages: ['Thinking of you during this difficult time. Sending comfort.', 'May these flowers bring you some peace.', 'Words cannot express how sorry I am for your loss.'] },
];

// Helper functions to get translated data
export const getTranslatedPreset = (presetKey: string, language: string = 'en') => {
  const translations = getBouquetTranslations(language);
  const preset = PRESETS[presetKey];
  const translatedPreset = translations.presets[presetKey];
  
  if (!preset) return null;
  
  return {
    name: translatedPreset?.name || preset.name,
    flowers: preset.flowers,
    message: translatedPreset?.message || preset.message,
    recipient: translatedPreset?.recipient || preset.recipient,
    background: preset.background,
    greeneryBg: preset.greeneryBg,
  };
};

export const getTranslatedMessageSuggestions = (language: string = 'en') => {
  const translations = getBouquetTranslations(language);
  return Object.values(translations.messageSuggestions);
};


