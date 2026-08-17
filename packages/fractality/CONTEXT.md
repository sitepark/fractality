# fractality

The concrete library API and the command-line tool. Gives `core`'s abstract entity tree the types a
component library actually has.

## Language

**Component**:
One reusable piece of the user's UI, backed by a template file and optional configuration. The unit
a library is made of.
_Avoid_: pattern, module, widget, element

**Variant**:
One rendering of a Component with a particular set of context data. Every Component has at least one
— the default — whether or not the user declares it.
_Avoid_: state, modifier, example, instance

**Collated component**:
A Component whose variants are displayed together on one page rather than as separate entries.
_Avoid_: grouped, combined

**Context**:
The data a Variant is rendered with. Authored in the component's configuration, not derived from
anything.
_Avoid_: props, data, fixtures, params

**Doc**:
A standalone documentation page in the library, written in Markdown and not attached to any
Component.
_Avoid_: page, article, guide

**Asset**:
A static file the library serves alongside its components, such as a compiled stylesheet.
_Avoid_: resource, static, file

**Resource**:
A file that belongs _to_ a Component — a stylesheet, a script, a README sitting in its directory.
Distinct from an Asset, which belongs to the library as a whole.
_Avoid_: attachment, sibling file

**Reference**:
A link from one Component to another, declared by naming its Handle. Tracked in both directions.
_Avoid_: dependency, usage, include
