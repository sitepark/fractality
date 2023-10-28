import { context } from "@frctl/adapter-tests";

import fractal from "../../fractal.config.js";

describe('tree', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    context(fractal);
});
