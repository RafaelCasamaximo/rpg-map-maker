
/*
    The MapEditor class is responsible for adding new elements to the canvas,
    managing the stage, layers and groups. It also has the main function which
    is the code base. It's important to keep this function clean and short.
*/
class MapEditor {
    constructor(divId, width, height) {

        //General Attributes
        this.divId = divId
        this.width = width
        this.height = height
        this.layers = []

        //Stage startup
        this.stage = null
        this.stage = new Konva.Stage({
            container: divId,   // id of container <div>
            width: width,
            height: height,
            draggable: true,
        });
    }

    /*
        Create a new layer with Konva
        Push the new layer to the layers array in a object {name, layer}
        Returns the layer
    */
    createNewLayer(name) {
        let newLayer = new Konva.Layer();
        this.layers.push({ name: name, layer: newLayer })
        return newLayer
    }

    /*
        Loop all layers and add them to the stage
    */
    addLayersToStage() {
        this.layers.forEach((layerObj) => {
            this.stage.add(layerObj['layer'])
        })
    }

    /*
        Add a shape to a layer using its name
        If the layer name is not found it does not add the shape
    */
    addInLayerByName(name, other) {
        this.layers.forEach((layerObj) => {
            if (layerObj['name'] === name) {
                layerObj['layer'].add(other)
            }
        })
    }

    /* 
        Loop all layers drawing them to the canvas
    */
    drawAllLayers() {
        this.layers.forEach((layerObj) => {
            layerObj['layer'].draw()
        })
    }

    /*
        Recieve a layerName and an array of points as input
        loop through all the points creating new little circles
        in the selected layer.
        If the layer is not found it does not add the points
        the points must be in the format {x,y}
    */
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

    /*
        An aux function to calculate the orientation of the next point
        when using the convexHull algorithm
    */
    orientation(p, q, r) {
        let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
        if (val == 0) {
            return 0
        }
        return (val > 0) ? 1 : 2
    }

    /*
        ConvexHull algorithm: convex hull of a shape is the smallest convex
        set that contains it. It takes a array of points and sort them in
        clockwise direction. It's used to avoid drawing polygons using
        points in the wrong order after calculating the Voronoi Diagram.
        The points array must have the format [..., {x, y, ...}, ...]
        And n must be the length of the array (number of points)
    */
    convexHull(points, n) {
        //If less then 3 vertices, return
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

    /*
        Aux function to convert a array in ter format
        [..., {x, y, ...}, ...] to an array of [x1, y1, x2, y2, ...]
        It's used in the konva polygon
    */
    convertVertexArrayToArray(vertexArray) {
        let array = []
        vertexArray.forEach((vertex) => {
            array.push(vertex.x)
            array.push(vertex.y)
        })
        return array
    }

    /*
        Draw all polygons generated by the Voronoi Diagram in
        a layer with layerName. Polygons must be a polygon array
        in a format [..., [..., {x,y, prod, cp}, ....], ...].
        This polygon array is an output from the MapGenerator.
        The mapGenerator object is also used to assign back to the object
        an array of generated polygons.
        It will be used to change the polygons colors later on
    */
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
                    closed: true,
                    perfectDrawEnabled: false,
                })

                Object.defineProperty(kPolygon['attrs'], 'cp', {
                    value: polygon[0].cp
                })

                generatedPolygons.push(kPolygon)
                selectedLayer.add(kPolygon)
            }
        })

        mapGenerator.assignGeneratedPolygons(generatedPolygons)

    }

    /*
        This function enables the mouse scrolling to zoom in and out
        It calculates the mouse position as the center of the zoom
        and change the canva position and scale using a event listener
    */
    enableMouseScale() {
        let scaleBy = 1.1
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

    changePolygonsColors(layerName, mapGenerator) {
        let selectedLayer = undefined
        this.layers.forEach((layerObj) => {
            if (layerObj['name'] === layerName) {
                selectedLayer = layerObj['layer']
            }
        })

        if (selectedLayer === undefined) {
            return
        }

        let children = selectedLayer['children']

        children.forEach((child, index) => {
            child.fill(mapGenerator.perlinPolygons[index])
        })
    }

    cleanLayer(layerName) {
        let selectedLayer = undefined
        this.layers.forEach((layerObj) => {
            if (layerObj['name'] === layerName) {
                selectedLayer = layerObj['layer']
            }
        })

        if (selectedLayer === undefined) {
            return
        }

        selectedLayer.destroyChildren()
    }

    regenerate() {
        // let { mapEditor, mapGenerator, layerName, heightMap } = mapObjects
        // mapEditor.cleanLayer(layerName)
        // mapGenerator.generatePoints()
        // mapGenerator.generateVoronoi()
        // mapGenerator.generatePolygonsFromVoronoiCells()
        // mapEditor.drawPolygons(layerName, mapGenerator.polygons, mapGenerator)
        // mapGenerator.createPerlinNoiseMap(heightMap)
        // mapEditor.changePolygonsColors(layerName, mapGenerator)
        /*
        Refatorar esse c??digo para rodar tudo de novo, mas sem atualizar a p??gina
        */
        if (window.confirm("Do you really want to refresh the page to generate a new terrain? You will lost all data!")) {
            window.location.reload();
        }
    }

    exportStage(infoObj) {
        let { stage, layers } = infoObj

        layers.forEach((layerObj) => {
            let children = layerObj['layer']['children']
            children.forEach((child) => {
                child.perfectDrawEnabled(true)
            })
        })


        let dataURL = stage.toDataURL({ pixelRatio: 3 })
        let name = 'rpgMap.png'

        let link = document.createElement('a')
        link.download = name
        link.href = dataURL
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        layers.forEach((layerObj) => {
            let children = layerObj['layer']['children']
            children.forEach((child) => {
                child.perfectDrawEnabled(false)
            })
        })
    }

    paintLand() {

    }

    paintWater(infoObj) {
        function createBrush(stage, layers, size) {
            let circle = new Konva.Circle({
                x: stage.getPointerPosition().x,
                y: stage.getPointerPosition().x,
                radius: size,
                fill: 'black',
                opacity: 0.3
            })

            let selectedLayer = undefined
            layers.forEach((layerObj) => {
                if (layerObj['name'] === 'aux') {
                    selectedLayer = layerObj['layer']
                }
            })

            stage.on('mousemove', function () {
                let mousePos = stage.getRelativePointerPosition()
                circle.position(mousePos)
            })
            selectedLayer.add(circle)

            return circle
        }
        /*
        Criar uma fun????o para criar um circulo na camada aux
        Fazer esse circulo me seguir durante todo o tempo
        */
        let { stage, layerName, layers, polygons } = infoObj
        let brush = createBrush(stage, layers, 70)

        brush.on('click', function () {
            let c = {
                x: brush.getAttr('x'),
                y: brush.getAttr('y'),
                r: brush.getAttr('radius'),
            }
            polygons.forEach((polygon) => {
                let p = polygon['attrs']['cp']
                if (pointInsideCircle(p, c)) {
                    polygon.fill('#0c6687')
                }
            })
        })
    }

    insertText(infoObj) {
        let { layerName, layers } = infoObj

        let selectedLayer = undefined
        layers.forEach((layerObj) => {
            if (layerObj['name'] === layerName) {
                selectedLayer = layerObj['layer']
            }
        })

        if (selectedLayer === undefined) {
            return
        }

        let textContent = prompt('Insert your text:')
        if (textContent == '') {
            return
        }

        let text = new Konva.Text({
            x: 100,
            y: 100,
            text: textContent,
            fontSize: 30,
            fontFamily: 'Calibri',
            fill: 'black',
            draggable: true
        });

        selectedLayer.add(text)
    }

    /*
        Main function: the base of the program
        It has object instances, value settings and
        function calls without any logic
    */
    main() {
        this.createNewLayer('base')
        this.createNewLayer('text')
        this.createNewLayer('aux')
        this.enableMouseScale()

        let mapGenerator = new MapGenerator(20, 20, this.width, this.height)
        mapGenerator.generatePoints()
        //this.drawPoints('base', mapGenerator.points)

        mapGenerator.generateVoronoi()
        mapGenerator.generatePolygonsFromVoronoiCells()

        this.drawPolygons('base', mapGenerator.polygons, mapGenerator)


        let heightMap = new HeightMap()
        let ocean = heightMap.createNewHeightMap(-1, -0.8, '#0c6687')
        let lowForest = heightMap.createNewHeightMap(-0.8, 0, '#6dc965')
        let forest = heightMap.createNewHeightMap(0, 0.8, '#569437')
        let snow = heightMap.createNewHeightMap(0.8, 1, '#3a6325')
        heightMap.addHeightRange(ocean)
        heightMap.addHeightRange(lowForest)
        heightMap.addHeightRange(forest)
        heightMap.addHeightRange(snow)

        mapGenerator.createPerlinNoiseMap(heightMap)
        this.changePolygonsColors('base', mapGenerator)

        let toolBox = new ToolBox()
        toolBox.addButton('newFile', this.regenerate, 'click')
        //toolBox.addButton('panTool', , 'toggle')
        // toolBox.addButton('increase', , 'toggle')
        toolBox.addButton('decrease', this.paintWater, 'click', { stage: this.stage, layerName: 'base', layers: this.layers, polygons: mapGenerator.generatedPolygons })
        toolBox.addButton('insertText', this.insertText, 'click', { layerName: 'text', layers: this.layers })
        toolBox.addButton('save', this.exportStage, 'click', { stage: this.stage, layers: this.layers })

        this.addLayersToStage()
        this.drawAllLayers()
    }

}

