export interface Point {
  x: number;
  y: number;
}

export const SQRT3 = Math.sqrt(3);

/**
 * Calculates vertices of a regular hexagon.
 * Orientation: Pointy top (angles: 30, 90, 150, 210, 270, 330) or Flat top?
 * Prompt says "dragging left/right controls pitch". A square listening area is mentioned.
 * "The app visually renders a hexagon".
 * Let's assume Flat Top for easier left/right pitch mapping visually, or Pointy Top.
 * Actually, standard hex inputs often use Pointy Top.
 * Let's stick to Pointy Top (vertices at 30, 90, 150...) so side 0 is right-ish.
 * Wait, Pointy Top means top vertex is at 270 (-90). Flat top means flat side on top.
 * Let's use Pointy Top: Vertices at angles 30, 90, 150, 210, 270, 330 (degrees).
 * Wait, 0 degrees is usually East (Right).
 * Pointy Top: Vertex at -90 (Top). Angles: -90, -30, 30, 90, 150, 210.
 * Let's just use standard: `angle = i * 60 - 30` (degrees) for Pointy Top?
 * Or `i * 60` for Flat Top.
 * Visual preference: Flat top usually looks nice for wide screens.
 * Let's go with Pointy Top (Vertical orientation dominant).
 * Vertices: 0, 60, 120, 180, 240, 300 (degrees) is Flat Top (Vertex at Right).
 * Vertices: 30, 90, 150, 210, 270, 330 is Pointy Top (Vertex at Bottom Right?).
 * Let's just use `i * 60` relative to a start angle.
 * I will use Flat Top (Parallel vertical sides) if user wants Left/Right Pitch to be perfectly aligned with width.
 * Flat Top implies the hexagon is wider than tall.
 * Let's use **Flat Top** (vertices at 0, 60, 120, 180, 240, 300).
 * Side 0 is between 0 and 60.
 */
export function getHexagonVertices(center: Point, radius: number): Point[] {
  const vertices: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i;
    const angle_rad = (Math.PI / 180) * angle_deg;
    vertices.push({
      x: center.x + radius * Math.cos(angle_rad),
      y: center.y + radius * Math.sin(angle_rad),
    });
  }
  return vertices;
}

export function distToSegment(p: Point, v1: Point, v2: Point): number {
  const x = p.x;
  const y = p.y;
  const x1 = v1.x;
  const y1 = v1.y;
  const x2 = v2.x;
  const y2 = v2.y;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Returns normalized distances (0 to 1) to each of the 6 sides.
 * 1 = close to side (or on it), 0 = center? 
 * Prompt: "distance to any one side... dictates strength".
 * Usually closer = stronger effect.
 * Max distance is roughly radius * sqrt(3)/2 (center to midpoint).
 */
export function getDistancesToSides(p: Point, vertices: Point[]): number[] {
  const distances: number[] = [];
  for (let i = 0; i < 6; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % 6];
    const d = distToSegment(p, v1, v2);
    distances.push(d);
  }
  return distances;
}

export function isPointInHexagon(p: Point, vertices: Point[]): boolean {
  // Ray casting algorithm or just sum of angles, or simple cross product check if convex
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    const intersect = ((yi > p.y) !== (yj > p.y))
        && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
