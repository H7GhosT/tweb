// https://paulbourke.net/geometry/pointlineplane/
// https://paulbourke.net/geometry/pointlineplane/javascript.txt
export function linesIntersection(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  // Check if none of the lines are of length 0
  if((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false
  }

  const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

  // Lines are parallel
  if(denominator === 0) {
    return false
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

  // is the intersection along the segments
  if(ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x1 + ua * (x2 - x1)
  const y = y1 + ua * (y2 - y1)

  return [x, y]
}
