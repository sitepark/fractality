import type { AssetPayload } from '@fractality/web/contract';
import { renderMarkdown } from './markdown.js';

/** Mirrors `views/pages/assets.nunj`. */
export function Asset({ asset }: { asset: AssetPayload }) {
    return (
        <div className="Document">
            <div className="Document-header">
                <h1 className="Document-title">{asset.title}</h1>
            </div>

            {asset.notes ? (
                <div className="Prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(asset.notes) }} />
            ) : null}

            <ul className="AssetList">
                {asset.files.map((file) => (
                    <li className="AssetList-asset" key={file.path}>
                        {/*
                            A real link, not an in-Frame route: these are the
                            project's own static files, served directly.
                        */}
                        <a className="AssetList-link" href={file.url}>
                            <span className="AssetList-name">
                                {file.path.slice(0, -file.name.length)}
                                <strong>{file.name}</strong>
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
