export const mapEmoji = (tier: string) => {
  if (tier.toLowerCase() === 'c') return '<:CT:1314375112304099349>';
  if (tier.toLowerCase() === 'r') return '<:RT:1314375183339094068>';
  if (tier.toLowerCase() === 'sr') return '<:SRT:1314375153332785213>';
  if (tier.toLowerCase() === 'ssr') return '<:SSRT:1314375535446462525>';
  if (tier.toLowerCase() === 'ur') return '<:URT:1314375493348491284>';
  return tier;
};
