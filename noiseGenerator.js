class NoiseGenerator {
    constructor(seed = Math.random()) {
        this.gen = new SimplexNoise(seed)
    }

    noise(nx, ny) {
        return this.gen.noise2D(nx, ny)
    }
}