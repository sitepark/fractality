import { useEffect, useState } from 'react';
import type { EntityPayload, ResourceFile, ResourcesPayload } from '@fractality/web/contract';

import { fetchResources } from './api.js';
import { formatBytes } from './bytes.js';
import { frctl, resolveRouteUrl } from './frctl.js';
import { highlight } from './highlight.js';

const labels = (): Record<string, string> => {
    const components = frctl.labels?.components as Record<string, Record<string, string>> | undefined;
    return components?.resources ?? {};
};

/**
 * The file being looked at, as a Meta list.
 *
 * Markup mirrors `views/partials/browser/panel-resources.nunj`, because the
 * stylesheet it inherits keys off `.FileBrowser` and `.Meta` — and off `.Meta-key`
 * and `.Meta-value` specifically, which is why this is a `ul`/`li`/`strong`/`span`
 * structure rather than the `dl` that would otherwise be the honest markup.
 */
function FileDetail({ file }: { file: ResourceFile }) {
    const text = labels();
    const [code, setCode] = useState<string | null>(null);

    useEffect(() => {
        if (file.content === null) {
            setCode(null);
            return;
        }

        let cancelled = false;
        // Highlighted client-side, from source the payload carries — the same
        // path the View panel takes, and the same trust boundary: these are the
        // project's own files.
        highlight(file.content, file.lang).then(
            (next) => !cancelled && setCode(next),
            () => !cancelled && setCode(null),
        );

        return () => {
            cancelled = true;
        };
    }, [file.content, file.lang]);

    return (
        <ul className="Meta">
            <li className="Meta-item">
                <strong className="Meta-key">{text.content ?? 'Content'}:</strong>
                <span className="Meta-value">
                    <div className="FileBrowser-itemPreview">
                        {file.isImage ? (
                            <img src={resolveRouteUrl(file.url)} alt={file.name} />
                        ) : file.content !== null ? (
                            <code className={`Code Code--lang-${file.ext.replace('.', '')} FileBrowser-code hljs`}>
                                {code === null ? <pre /> : <pre dangerouslySetInnerHTML={{ __html: code }} />}
                            </code>
                        ) : (
                            <p>
                                <em>
                                    {text.previewUnavailable ??
                                        'Previews are currently not available for this file type.'}
                                </em>
                            </p>
                        )}
                    </div>
                </span>
            </li>
            <li className="Meta-item">
                <strong className="Meta-key">{text.url ?? 'URL'}:</strong>
                <span className="Meta-value">
                    {/* A real file, served at this url — not a Frame route. */}
                    <a href={file.url}>
                        <span>{file.url}</span>
                    </a>
                </span>
            </li>
            <li className="Meta-item">
                <strong className="Meta-key">{text.path ?? 'Filesystem Path'}:</strong>
                <span className="Meta-value">{file.path}</span>
            </li>
            <li className="Meta-item">
                <strong className="Meta-key">{text.size ?? 'Size'}:</strong>
                <span className="Meta-value">{formatBytes(file.size)}</span>
            </li>
        </ul>
    );
}

/**
 * The Resources panel: a component's own files, one at a time.
 *
 * Fetches and holds its own payload rather than going through the Browser's
 * shared body state, because it renders structure — a file chooser and a Meta
 * list — where the other panels render one block of highlighted text.
 *
 * A single chooser across every configured group, rather than the tab per group
 * the template layer produced. The tab strip is driven by the `panels` config, so
 * expanding one configured name into a variable number of tabs would make the
 * strip depend on library content; `optgroup` says the same thing in the place
 * the choice is actually made, and a project with the default single `assets`
 * group sees exactly what it saw before.
 */
export function Resources({ entity }: { entity: EntityPayload }) {
    const [payload, setPayload] = useState<ResourcesPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setPayload(null);
        setError(null);
        setSelected(null);

        fetchResources(entity.handle).then(
            (next) => !cancelled && setPayload(next),
            (e: unknown) => !cancelled && setError(String(e)),
        );

        return () => {
            cancelled = true;
        };
    }, [entity.handle]);

    const collections = payload?.collections ?? [];
    const files = collections.flatMap((collection) => collection.files);
    // Selection follows the payload when nothing has been chosen, so the panel
    // opens on a file rather than on an empty frame.
    const file = files.find((candidate) => candidate.url === selected) ?? files[0];

    if (error) {
        return (
            <div className="Browser-panel Browser-resources is-active" id="browser-panel-resources">
                <p className="Browser-isEmptyNote">{error}</p>
            </div>
        );
    }

    if (payload && !files.length) {
        return (
            <div className="Browser-panel Browser-resources is-active" id="browser-panel-resources">
                <p className="Browser-isEmptyNote">No resources.</p>
            </div>
        );
    }

    const text = labels();

    return (
        <div className="Browser-panel Browser-resources is-active" id="browser-panel-resources">
            <div className="FileBrowser">
                {files.length > 1 ? (
                    <div className="FileBrowser-selectWrapper">
                        <label className="FileBrowser-select-label" htmlFor="filebrowser-select">
                            {text.file ?? 'File'}:
                        </label>
                        <select
                            className="FileBrowser-select"
                            id="filebrowser-select"
                            value={file?.url ?? ''}
                            onChange={(event) => setSelected(event.target.value)}
                        >
                            {collections.length > 1
                                ? collections.map((collection) => (
                                      <optgroup label={collection.label} key={collection.name}>
                                          {collection.files.map((candidate) => (
                                              <option value={candidate.url} key={candidate.url}>
                                                  {candidate.name}
                                              </option>
                                          ))}
                                      </optgroup>
                                  ))
                                : files.map((candidate) => (
                                      <option value={candidate.url} key={candidate.url}>
                                          {candidate.name}
                                      </option>
                                  ))}
                        </select>
                    </div>
                ) : null}

                {file ? (
                    <div className="FileBrowser-item is-active">
                        <FileDetail file={file} key={file.url} />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
