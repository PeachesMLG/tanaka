export const mapEmojiToTier = (emoji: string) => {
  if (emoji.includes('1342202221558763571')) return 'C';
  if (emoji.includes('1342202219574857788')) return 'R';
  if (emoji.includes('1342202597389373530')) return 'SR';
  if (emoji.includes('1342202212948115510')) return 'SSR';
  console.warn('Could not find any match for ' + emoji);
  return emoji;
};

export const mapTierToEmoji = (tier: string) => {
  if (tier.toLowerCase() === 'c') return '<:CT:1314375112304099349>';
  if (tier.toLowerCase() === 'r') return '<:RT:1314375183339094068>';
  if (tier.toLowerCase() === 'sr') return '<:SRT:1314375153332785213>';
  if (tier.toLowerCase() === 'ssr') return '<:SSRT:1314375535446462525>';
  if (tier.toLowerCase() === 'ur') return '<:URT:1314375493348491284>';
  console.warn('Could not find any match for ' + tier);
  return '';
};
