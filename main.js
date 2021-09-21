

class MapEditor {
    constructor(divId, width, height) {

        //Atributos gerais
        this.divId = divId
        this.width = width
        this.height = height
        this.layers = []

        //Inicialização do Stage
        this.stage = null
        this.stage = new Konva.Stage({
            container: divId,   // id of container <div>
            width: width,
            height: height,
            draggable: true,
        });
    }

    createNewLayer(name) {
        let newLayer = new Konva.Layer();
        this.layers.push({ name: name, layer: newLayer })
    }

    addLayersToStage() {
        this.layers.forEach((layerObj) => {
            this.stage.add(layerObj['layer'])
        })
    }

    addInLayerByName(name, other) {
        this.layers.forEach((layerObj) => {
            if (layerObj['name'] === name) {
                layerObj['layer'].add(other)
            }
        })
    }

    drawAllLayers() {
        this.layers.forEach((layerObj) => {
            layerObj['layer'].draw()
        })
    }

    drawPoints(layerName, points) {
        let selectedLayer = undefined
        this.layers.forEach((layerObj) => {
            if (layerObj['name'] === layerName) {
                selectedLayer = layerObj['layer']
            }
        })

        if (selectedLayer === undefined) {
            return
        }

        points.forEach((point) => {
            let circle = new Konva.Circle({
                x: point.x,
                y: point.y,
                radius: 2,
                fill: 'red',
                stroke: 'black',
                strokeWidth: 1
            });

            selectedLayer.add(circle)
        })
    }

    orientation(p, q, r) {
        let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
        if (val == 0) {
            return 0
        }
        return (val > 0) ? 1 : 2
    }

    convexHull(points, n) {
        if (n < 3) {
            return
        }

        let hull = []

        let l = 0
        for (let i = 1; i < n; i++) {
            if (points[i].x < points[l].x) {
                l = i
            }
        }

        let p = l
        let q

        do {
            hull.push(points[p])
            q = (p + 1) % n
            for (let i = 0; i < n; i++) {
                if (this.orientation(points[p], points[i], points[q]) == 2) {
                    q = i
                }
            }
            p = q

        } while (p != l)

        return hull
    }

    convertVertexArrayToArray(vertexArray) {
        let array = []
        vertexArray.forEach((vertex) => {
            array.push(vertex.x)
            array.push(vertex.y)
        })
        return array
    }

    drawPolygons(layerName, polygons, mapGenerator) {
        let selectedLayer = undefined
        this.layers.forEach((layerObj) => {
            if (layerObj['name'] === layerName) {
                selectedLayer = layerObj['layer']
            }
        })

        if (selectedLayer === undefined) {
            return
        }

        let generatedPolygons = []

        polygons.forEach((polygon) => {
            let convHull = this.convexHull(polygon, polygon.length)
            if (polygon.length > 2) {
                let aux = this.convertVertexArrayToArray(convHull)
                let kPolygon = new Konva.Line({
                    points: aux,
                    fill: '#003C5F',
                    opacity: 0.95,
                    stroke: '#00304d',
                    strokeWidth: 1,
                    closed: true,
                    perfectDrawEnabled: false,
                })

                kPolygon.on('mouseover', function () {
                    this.opacity(1);
                });

                kPolygon.on('mouseout', function () {
                    this.opacity(0.95);
                });

                Object.defineProperty(kPolygon['attrs'], 'cp', {
                    value: polygon[0].cp
                })

                generatedPolygons.push(kPolygon)
                selectedLayer.add(kPolygon)
            }
        })

        mapGenerator.assignGeneratedPolygons(generatedPolygons)

    }

    enableMouseScale() {
        let scaleBy = 1.05
        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();
            let oldScale = this.stage.scaleX();
            let pointer = this.stage.getPointerPosition();

            let mousePointTo = {
                x: (pointer.x - this.stage.x()) / oldScale,
                y: (pointer.y - this.stage.y()) / oldScale,
            };

            let newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
            this.stage.scale({ x: newScale, y: newScale });

            let newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            };
            this.stage.position(newPos);
        })
    }

    main() {
        this.createNewLayer('base')
        this.enableMouseScale()

        let mapGenerator = new MapGenerator(100, 50, this.width, this.height)
        mapGenerator.generatePoints()
        this.drawPoints('base', mapGenerator.points)

        mapGenerator.generateVoronoi()
        mapGenerator.generatePolygonsFromVoronoiCells()

        this.drawPolygons('base', mapGenerator.polygons, mapGenerator)
        mapGenerator.createPerlinNoiseMap()

        let toolBox = new ToolBox()
        // toolBox.addButton('newFile', , 'toggle')
        // toolBox.addButton('panTool', , 'toggle')
        // toolBox.addButton('generateLandscape', , 'toggle')
        // toolBox.addButton('increase', , 'toggle')
        // toolBox.addButton('decrease', , 'toggle')
        // toolBox.addButton('save', , 'toggle')

        this.addLayersToStage()
        this.drawAllLayers()
    }

}


class MapGenerator {
    constructor(gridsize, jitter, width, height) {
        this.gridsize = gridsize
        this.jitter = jitter
        this.width = width
        this.height = height
        this.points = []
        this.widthRatio = width / gridsize
        this.heightRatio = height / gridsize
        this.voronoi = undefined
        this.voronoiDiagram = undefined
        this.polygons = undefined
        this.generatedPolygons = undefined
        this.perlinMap = undefined
    }

    generatePoints() {
        for (let x = 0; x <= this.width; x += this.gridsize) {
            for (let y = 0; y <= this.height; y += this.gridsize) {
                this.points.push({
                    x: x + this.jitter * (Math.random() - Math.random()),
                    y: y + this.jitter * (Math.random() - Math.random())
                })
            }
        }
    }

    generateVoronoi() {
        this.voronoi = new Voronoi()
        let bbox = { xl: 0, xr: this.width, yt: 0, yb: this.height }
        this.diagram = this.voronoi.compute(this.points, bbox)
    }

    getUnique(arr, comp) {

        // store the comparison  values in array
        const unique = arr.map(e => e[comp])

            // store the indexes of the unique objects
            .map((e, i, final) => final.indexOf(e) === i && i)

            // eliminate the false indexes & return unique objects
            .filter((e) => arr[e]).map(e => arr[e]);

        return unique;
    }


    generatePolygonsFromVoronoiCells() {

        if (this.diagram === undefined) {
            return
        }

        let polygons = []

        this.diagram.cells.forEach((cell) => {
            let polygonVertices = []
            cell['halfedges'].forEach((halfedge) => {
                let vertexAux1 = {
                    x: halfedge['edge']['va'].x,
                    y: halfedge['edge']['va'].y,
                    prod: halfedge['edge']['va'].x * halfedge['edge']['va'].y,
                    cp: cell['site'],
                }
                let vertexAux2 = {
                    x: halfedge['edge']['vb'].x,
                    y: halfedge['edge']['vb'].y,
                    prod: halfedge['edge']['vb'].x * halfedge['edge']['vb'].y,
                    cp: cell['site']
                }

                polygonVertices.push(vertexAux1)
                polygonVertices.push(vertexAux2)

            })
            polygonVertices = this.getUnique(polygonVertices, 'prod')

            polygons.push(polygonVertices)
        })
        this.polygons = polygons
        return polygons
    }

    assignGeneratedPolygons(generatedPolygons) {
        this.generatedPolygons = generatedPolygons
    }

    map(value, x1, y1, x2, y2) {
        return (value - x1) * (y2 - x2) / (y1 - x1) + x2;
    }

    rgbToHex(r, g, b) {
        var red = rgbToHex(r);
        var green = rgbToHex(g);
        var blue = rgbToHex(b);
        return red + green + blue;
    }

    createPerlinNoiseMap() {
        perlin.seed(Math.random())
        //console.log(this.generatedPolygons)

        this.generatedPolygons.forEach((polygon) => {
            let perlinPoint = perlin.get(polygon['attrs']['cp'].x, polygon['attrs']['cp'].y)
            //Math.trunc(this.map(perlinPoint, -1, 1, 0, 255))
            let truncPerlin = Math.trunc(this.map(perlinPoint, -1, 1, 0, 255))

        })
    }

}

class ToolBox {
    constructor() {
        this.buttons = []
    }

    addButton(divId, execFunction, type = 'click') {
        let button = {
            div: document.getElementById(divId),
            execFunction: execFunction,
            type: type,
            enabled: false,
        }

        button['div'].onclick = function () {
            if (button['type'] === 'toggle') {
                this.buttons.forEach((buttonAux) => {
                    if (buttonAux['type'] === 'toggle') {
                        buttonAux['enabled'] = false
                    }
                })

                button['enabled'] = true
            }

            execFunction()
        }

        this.buttons.push(button)
    }
}

let mapEditor = new MapEditor('container', 2000, 2000)
mapEditor.main()


//https://github.com/gorhill/Javascript-Voronoi