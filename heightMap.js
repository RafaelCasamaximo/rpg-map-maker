
class HeightMap {
    constructor(array = []) {
        this.heightMap = array
        /*
            [
                ...,
                {
                    min: x,
                    max: y,
                    color: 'color'
                },
                ...
            ]
        */
    }

    createNewHeightMap(min, max, color) {
        return {
            min: min,
            max: max,
            color: color
        }
    }

    addHeightRange(heightRangeObj) {
        this.heightMap.push(heightRangeObj)
    }

    getColorFromHeight(height) {
        let color = undefined
        this.heightMap.forEach((element) => {
            if (height >= element['min'] && height < element['max']) {
                color = element['color']
            }
        })
        return (color === undefined) ? '#000000' : color
    }
}
