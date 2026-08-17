# web

Turns a loaded library into a browsable site — a dev server and a static builder — and owns the
public data contract that a theme renders from.

> The payload terms below name the contract being designed for the next major and are **not yet in
> the code**. See `.scratch/client-rendered-frame/` for the effort that mints them.

## Language

**Theme**:
The interface a library is browsed through. `mandelbrot` is the default one; third-party themes are
peers of it, not special cases.
_Avoid_: skin, template, UI, frontend

**Route table**:
The set of URL patterns the site answers, each paired with a resolver that enumerates its
parameters. Drives both the dev server's routing and the static build's walk.
_Avoid_: routes config, sitemap, manifest

**Shell HTML**:
The static, contentless HTML document a client-rendered theme boots from. Distinct from the Frame,
which is the running interface; the Shell HTML is only the empty document it starts in.
_Avoid_: shell, index, template, skeleton

**Tree payload**:
The serialised navigation tree — every addressable entity, carrying only what the navigation needs
to draw and order it. One payload for the whole library, fetched once.
_Avoid_: nav data, index, sitemap, manifest

**Entity payload**:
The data describing one Component, carrying what its page needs on arrival: identity, its variants,
and where their previews live.
_Avoid_: detail data, component JSON, model

**Panel payload**:
Data backing a single panel of the Browser, fetched only when that panel is opened. Notes, context
and view source are each one.
_Avoid_: tab data, lazy chunk, fragment

**Contract version**:
The integer a payload declares and a theme checks, identifying which shape of the data contract it
was produced against.
_Avoid_: schema version, API version, revision

**Ext slot**:
The namespaced region of a payload a theme fills with its own data. Outside the contract's
compatibility guarantee by definition.
_Avoid_: extras, custom, meta, extensions
