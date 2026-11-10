// PR-10K.6M.4 — pure reader geometry; no storage or network operations.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 12;

const valid = (n) => Number.isFinite(n) && n > 0;
export function boundedZoom(value) {
  if (!Number.isFinite(value)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
export function panBounds(viewWidth, viewHeight, imageWidth, imageHeight, zoom) {
  if (![viewWidth, viewHeight, imageWidth, imageHeight].every(valid)) return {x: 0, y: 0};
  const fit = Math.min(viewWidth / imageWidth, viewHeight / imageHeight);
  const z = boundedZoom(zoom);
  return {
    x: Math.max(0, (imageWidth * fit * z - viewWidth) / 2),
    y: Math.max(0, (imageHeight * fit * z - viewHeight) / 2),
  };
}
export function clampPan(point, bounds) {
  const x = Number.isFinite(point?.x) ? point.x : 0;
  const y = Number.isFinite(point?.y) ? point.y : 0;
  return {
    x: Math.min(bounds.x, Math.max(-bounds.x, x)),
    y: Math.min(bounds.y, Math.max(-bounds.y, y)),
  };
}
export function zoomAt(current, nextZoom, anchor, view, image) {
  const before = boundedZoom(current.zoom);
  const zoom = boundedZoom(nextZoom);
  const ax = Number.isFinite(anchor?.x) ? anchor.x : view.width / 2;
  const ay = Number.isFinite(anchor?.y) ? anchor.y : view.height / 2;
  const px = Number.isFinite(current.x) ? current.x : 0;
  const py = Number.isFinite(current.y) ? current.y : 0;
  const ratio = zoom / before;
  const candidate = {
    x: px + (1 - ratio) * (ax - view.width / 2 - px),
    y: py + (1 - ratio) * (ay - view.height / 2 - py),
  };
  return {zoom, ...clampPan(candidate, panBounds(view.width, view.height, image.width, image.height, zoom))};
}
export function movedPan(current, dx, dy, view, image) {
  return {
    zoom: boundedZoom(current.zoom),
    ...clampPan({x: current.x + dx, y: current.y + dy}, panBounds(view.width, view.height, image.width, image.height, current.zoom)),
  };
}
