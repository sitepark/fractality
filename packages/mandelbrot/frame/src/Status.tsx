import type { StatusDefinition } from '@fractality/web/contract';

/**
 * The status indicator, in the two shapes the stylesheet knows about.
 *
 * Markup mirrors `views/macros/status.nunj` so the existing CSS applies
 * unchanged — reproducing the old structure is what lets a rewritten Frame
 * inherit a stylesheet written for the templates it replaces.
 */
export function StatusDot({ status }: { status: StatusDefinition | undefined }) {
    if (!status) return null;
    return (
        <div className="Status Status--unlabelled">
            <div className="Status-dots">
                <span className="Status-dot" style={{ borderColor: status.color }} title={status.label} />
            </div>
        </div>
    );
}

export function StatusTag({ status }: { status: StatusDefinition | undefined }) {
    if (!status) return null;
    return (
        <div className="Status Status--tag">
            <label className="Status-label" style={{ backgroundColor: status.color, borderColor: status.color }}>
                {status.label}
            </label>
        </div>
    );
}
