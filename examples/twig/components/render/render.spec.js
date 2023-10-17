import { render } from "@frctl/adapter-tests";

import fractal from "../../fractal.config.js";

describe('render', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    render(fractal);
});
