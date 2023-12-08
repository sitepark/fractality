import { create } from '../../src/fractal';
import Cli from '../../src/cli';
import Console from '../../src/cli/console';

describe('Cli', () => {
    /** @type Cli */
    let cli;
    let app = create();

    beforeEach(() => {
        cli = new Cli(app);
        cli.console = new Console({
            log: () => {},
        });
    });

    it.todo('is configurable');

    describe('.console', () => {
        it('is an instance of Console', () => {
            expect(cli.console).toBeInstanceOf(Console);
        });
    });

    describe('.theme()', () => {
        it.todo('sets the CLI theme');
    });

    for (let method of ['log', 'error', 'warn', 'success', 'debug']) {
        describe(`.${method}()`, () => {
            it(`calls the console ${method} method`, () => {
                const spy = vi.spyOn(cli.console, method);
                cli[method]('Message');
                expect(spy).toHaveBeenCalled();
                expect(spy).toHaveBeenCalledWith('Message');
            });
        });
    }
});
