# mandelbrot

The default theme — the interface a user actually looks at when browsing a library.

## Language

**Frame**:
The tool's own chrome: header, sidebar navigation, and main panel. Everything on screen that is
Fractality rather than the user's component.
_Avoid_: shell, chrome, layout, app

**Pen**:
The component workbench inside the Frame — the Preview together with the Browser beneath it.
_Avoid_: workbench, detail view, inspector

**Preview**:
The iframe showing a rendered Variant. Isolated from the Frame on purpose, so the user's CSS and
JavaScript cannot reach the tool's own interface.
_Avoid_: iframe, viewport, canvas, sandbox

**Browser**:
The tabbed panel beneath the Preview showing a Component's source, context, notes and resources.
_Avoid_: inspector, sidebar, drawer, tabs

**Panel**:
One tab of the Browser. Themes may add their own alongside the built-in ones.
_Avoid_: tab, section, pane

**Plugin**:
A module loaded at runtime that contributes a Panel or nav section to the Frame. Receives React and
the Frame's component surface from the Frame rather than importing them.
_Avoid_: extension, addon, module

**Tree**:
The navigable hierarchy in the sidebar. One per root — components, docs, assets.
_Avoid_: nav, menu, sidebar, explorer

**Skin**:
~~A named colour scheme for the Frame.~~ **Retired** — named skins are being removed. The Frame's
appearance is adjusted through CSS custom properties instead, and there is no successor noun: say
"theming" for the activity and name the properties directly.
_Avoid_: skin, palette, colour scheme
