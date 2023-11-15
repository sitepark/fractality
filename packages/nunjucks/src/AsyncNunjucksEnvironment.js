import { Environment } from "nunjucks";

export class AsyncNunjucksEnvironment extends Environment {

    render(path, context) {
        return new Promise((resolve, reject) => super.render(path, context, (err, res) => {
            if (err) {
                reject(err);
            }
            resolve(res)
        }))
    }

    renderString(path, context) {
        return new Promise((resolve, reject) => super.renderString(path, context, (err, res) => {
            if (err) {
                reject(err);
            }
            resolve(res)
        }))
    }

    renderAsync(path, context) {
        return this.render(path, context)
    }

    renderStringAsync(path, context) {
        return this.renderString(path, context)
    }
}
