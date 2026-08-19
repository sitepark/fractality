/**
 * What the site root shows when a project has no index page.
 *
 * The home page is a documentation page — a project's `docs/index.md` — and most
 * projects have one. This is the other case, and it needs to say something: a
 * brand-new library's first URL answering with an error, or with nothing, reads
 * as a broken install rather than as an empty documentation directory.
 *
 * Deliberately not a component browser or a status table. 0.x listed the
 * project's component statuses here with their descriptions, and `description` is
 * not part of the data contract, so a table built from what the tree carries
 * would be a legend of colours with nothing to explain them.
 */
export function Welcome() {
    return (
        <div className="Document">
            <div className="Document-header">
                <h1 className="Document-title">Welcome to your component library</h1>
            </div>
            <div className="Prose">
                <p>You can browse the component library using the navigation.</p>
                <p>
                    To replace this page with one of your own, add <code>index.md</code> to your documentation
                    directory.
                </p>
            </div>
        </div>
    );
}
