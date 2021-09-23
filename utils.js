function pointInsideCircle(p, c) {
    return (quadraticDistance(p.x, p.y, c.x, c.y) <= c.r * c.r) ? 1 : 0
}

function quadraticDistance(x1, y1, x2, y2) {
    return ((x1 - x2) * (x1 - x2)) + ((y1 - y2) * (y1 - y2))
}