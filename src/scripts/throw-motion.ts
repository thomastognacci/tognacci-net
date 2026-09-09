export function angularVelocityFromThrow(
  offsetX: number,
  offsetY: number,
  velocityX: number,
  velocityY: number,
) {
  const radiusSquared = Math.max(offsetX * offsetX + offsetY * offsetY, 2500);
  // Screen Y points down, while Three's world Y points up.
  const angularVelocity =
    (0.22 * (offsetY * velocityX - offsetX * velocityY)) / radiusSquared;
  return Math.max(-1.4, Math.min(1.4, angularVelocity));
}
