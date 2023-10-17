import { renderTag } from "@frctl/adapter-tests";

import fractal from "../../fractal.config.js";

describe('render-tag', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    renderTag(fractal);
});
