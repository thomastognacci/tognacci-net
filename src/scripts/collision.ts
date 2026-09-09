export interface Point2 {
  x: number;
  y: number;
}

export interface CollisionBody extends Point2 {
  hull: Point2[];
}

// The rounded boxes are convex, so this outline follows their visible silhouette.
export function convexHull(points: Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Point2, b: Point2, c: Point2) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const lower: Point2[] = [];
  const upper: Point2[] = [];
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    )
      lower.pop();
    lower.push(point);
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    )
      upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Separating-axis test: overlapping HTML targets or bounding boxes aren't contacts.
export function getContact(a: CollisionBody, b: CollisionBody) {
  if (a.hull.length < 3 || b.hull.length < 3) return null;
  let depth = Infinity;
  let nx = 0;
  let ny = 0;
  for (const hull of [a.hull, b.hull]) {
    for (let i = 0; i < hull.length; i++) {
      const next = hull[(i + 1) % hull.length];
      const edgeX = next.x - hull[i].x;
      const edgeY = next.y - hull[i].y;
      const length = Math.hypot(edgeX, edgeY);
      if (length < 1e-8) continue;
      const axisX = -edgeY / length;
      const axisY = edgeX / length;
      let minA = Infinity,
        maxA = -Infinity;
      let minB = Infinity,
        maxB = -Infinity;
      for (const point of a.hull) {
        const projection = (point.x + a.x) * axisX + (point.y + a.y) * axisY;
        minA = Math.min(minA, projection);
        maxA = Math.max(maxA, projection);
      }
      for (const point of b.hull) {
        const projection = (point.x + b.x) * axisX + (point.y + b.y) * axisY;
        minB = Math.min(minB, projection);
        maxB = Math.max(maxB, projection);
      }
      const forward = maxA - minB;
      const backward = maxB - minA;
      if (forward <= 0 || backward <= 0) return null;
      const overlap = Math.min(forward, backward);
      if (overlap < depth) {
        depth = overlap;
        const direction = forward < backward ? 1 : -1;
        nx = axisX * direction;
        ny = axisY * direction;
      }
    }
  }
  return Number.isFinite(depth) ? { depth, nx, ny } : null;
}
