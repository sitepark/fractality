import type { DocPayload, TreePayload } from '@fractality/web/contract';
import { renderMarkdown } from './markdown.js';
import { StatusTag } from './Status.js';

interface DocProps {
    doc: DocPayload;
    statuses: TreePayload['status'];
}

/** Mirrors `views/layouts/doc.nunj`. */
export function Doc({ doc, statuses }: DocProps) {
    return (
        <div className="Document">
            <div className="Document-header">
                <h1 className="Document-title">{doc.title}</h1>
                <StatusTag status={doc.status ? statuses[doc.status] : undefined} />
            </div>
            <div
                className="Prose"
                // The source is the project's own documentation, authored in the
                // same repository as the components — the same trust boundary as
                // the templates the Preview already executes.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
            />
        </div>
    );
}
