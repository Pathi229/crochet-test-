function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const n = parseInt(hex.slice(start, start + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function yarnText(hex: string) {
  if (contrast(hex, "#252821") >= 4.5) return "#252821";
  return contrast(hex, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
}
