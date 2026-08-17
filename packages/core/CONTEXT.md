# core

The entity model. Watches directories of source files and maintains them as a live tree of
addressable things, without knowing what any of those things mean.

## Language

**Entity**:
Anything in the library that can be addressed and displayed. The base type every concrete thing in
`fractality` extends.
_Avoid_: node, item, object

**Handle**:
An entity's unique name within the library, used to address it everywhere — URLs, references
between entities, and configuration. Written with a leading `@` when referring to one from inside
component config or documentation.
_Avoid_: id, slug, key, name

**Collection**:
An entity that contains other entities. What a directory becomes.
_Avoid_: group, folder, category

**Source**:
A watched root directory, and the tree it produces. A library has one Source per kind of content.
_Avoid_: root, provider, loader

**Adapter**:
Renders the _user's_ patterns in one template language. Distinct from any rendering the tool does
for its own interface.
_Avoid_: engine, renderer, plugin

**Status**:
A named stage in a component's lifecycle, chosen from a small project-wide set. A label and colour,
not free text.
_Avoid_: state, stage, tag
