export function snapToViewport(ratio: number, vw: number, vh: number) {
  if(vw / ratio > vh) vw = vh * ratio
  else vh = vw / ratio

  return [vw, vh]
}

export function getSnappedViewportsScale(ratio: number, vw1: number, vh1: number, vw2: number, vh2: number) {
  [vw1, vh1] = snapToViewport(ratio, vw1, vh1);
  [vw2, vh2] = snapToViewport(ratio, vw2, vh2)

  return Math.max(vw1 / vw2, vh1 / vh2)
}
