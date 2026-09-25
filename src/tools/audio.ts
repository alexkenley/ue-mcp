import { z } from "zod";
import { categoryTool, bp, type ToolDef } from "../types.js";
import { PAGINATION_SCHEMA } from "../pagination.js";
import { specBp, schema as specSchema } from "./specs/audio.generated.js";

/**
 * Element schemas for the declarative graph-authoring arrays (#936).
 *
 * These were `z.array(z.any())`, which serialises to an array schema with no
 * `items`. VS Code refuses to load any tool carrying one ("tool parameters
 * array type must have items"), which took the whole audio category out of
 * service there. Each shape below mirrors what the C++ handler actually reads,
 * and every object stays open (`.passthrough()`) so a key the handler grew
 * before the schema did still reaches the bridge.
 */

/** metasound_author: a graph input pin. */
const MetaSoundGraphInput = z.object({
  name: z.string().describe("Graph input name"),
  dataType: z.string().describe("MetaSound data type: Float, Int32, Bool, String, Trigger, Audio, Time, ..."),
  default: z.any().optional().describe("Literal default for the input"),
}).passthrough();

/** metasound_author: a graph output pin. */
const MetaSoundGraphOutput = z.object({
  name: z.string().describe("Graph output name"),
  dataType: z.string().describe("MetaSound data type"),
}).passthrough();

/** metasound_author: one node, addressed by a caller-chosen local id. */
const MetaSoundAuthorNode = z.object({
  id: z.string().describe("Local id used by 'connections' to address this node"),
  class: z.string().describe("MetaSound node class name, e.g. 'Sine'"),
  namespace: z.string().optional().describe("Node class namespace (default 'UE')"),
  variant: z.string().optional().describe("Node class variant"),
  majorVersion: z.number().optional().describe("Node class major version (default 1)"),
  inputs: z.record(z.any()).optional().describe("Per-node input defaults, keyed by input name"),
}).passthrough();

/** cue_author: one SoundCue node, addressed by a caller-chosen local id. */
const SoundCueAuthorNode = z.object({
  id: z.string().describe("Local id used by 'connections' to address this node"),
  type: z.string().describe("SoundCue node type: wave_player, mixer, random, modulator, ..."),
  soundWavePath: z.string().optional().describe("wave_player: SoundWave asset to play"),
}).passthrough();

/** metasound_author: 'from'/'to' endpoints, each 'nodeId.pin', 'input.Name', 'output.Name' or 'audioOut.N'. */
const MetaSoundAuthorConnection = z.object({
  from: z.string().describe("Source endpoint: 'nodeId.OutputPin' or 'input.GraphInputName'"),
  to: z.string().describe("Destination endpoint: 'nodeId.InputPin', 'output.GraphOutputName' or 'audioOut.0'"),
}).passthrough();

/** cue_author: parent/child wiring, an omitted or 'root' parent meaning the cue root. */
const SoundCueAuthorConnection = z.object({
  child: z.string().describe("Local id of the child node"),
  parent: z.string().optional().describe("Local id of the parent node; omitted or 'root' wires the cue root"),
  index: z.number().optional().describe("Child slot on the parent (default: append)"),
}).passthrough();

/** create_sound_mix: one per-SoundClass adjustment. */
const SoundClassAdjuster = z.object({
  soundClassPath: z.string().describe("SoundClass asset the adjustment applies to"),
  volumeAdjuster: z.number().optional().describe("Volume multiplier (default 1)"),
  pitchAdjuster: z.number().optional().describe("Pitch multiplier (default 1)"),
  applyToChildren: z.boolean().optional().describe("Apply to child sound classes (default false)"),
}).passthrough();

/**
 * Audio: the full UE5 audio stack, authored end-to-end through the bridge.
 *
 *  - Assets + playback (import, cue/metasound creation, play, ambient).
 *  - MetaSound graph authoring (nodes, inputs/outputs, connections, defaults) via
 *    the MetaSound Builder subsystem - the modern UE5 audio graph.
 *  - SoundCue graph authoring (wave player, mixer, random, modulator, ...).
 *  - Mixing + routing: submixes and submix effect chains, sound classes, sound
 *    mixes, concurrency.
 *  - Spatialization: attenuation assets, and assigning submix/class/attenuation/
 *    concurrency onto sounds.
 *
 * Nothing here creates an empty placeholder: every asset is authorable to a
 * working state through these actions.
 */
export const audioTool: ToolDef = categoryTool(
  "audio",
  "Audio: sound assets, playback, MetaSound + SoundCue graph authoring, submixes/effects, sound classes/mixes, attenuation, concurrency, spatialization.",
  {
    // ── Assets + playback ──────────────────────────────────────────────
    list:              specBp("read", "List sound assets (SoundWave, SoundCue, MetaSoundSource) under a directory, cursor-paginated (#730). Every page carries count, total, hasMore and a nextCursor to pass back. The row offset this used to page with is refused, because a row number cannot report that the library changed underneath it. maxResults is a deprecated spelling of limit and sizes the page when limit is omitted.", "list_sound_assets"),
    extract_pcm:       specBp("read", "Decode a USoundWave's imported audio to in-memory PCM (no intermediate file, no reliance on the original source path) for semantic sound search / analysis (#729). Returns sampleRate, numChannels, numFrames, durationSeconds, and 16-bit PCM samples base64-encoded (interleaved).", "extract_sound_wave_pcm"),
    import_audio:      bp("mutate", "Import a WAV/OGG/FLAC file as a USoundWave. Returns durationSeconds, numChannels, looping. Params: filePath, name?, packagePath? (default /Game/Audio), looping?, replaceExisting? (default true)", "import_audio", (p) => ({ filePath: p.filePath, name: p.name, packagePath: p.packagePath, looping: p.looping, replaceExisting: p.replaceExisting })),
    play_at_location:  specBp("mutate", "Play a sound in the editor world.", "play_sound_at_location"),
    spawn_ambient:     specBp("mutate", "Place an AmbientSound actor playing a sound. A sound that does not load is refused rather than placing a silent actor.", "spawn_ambient_sound"),

    // ── MetaSound ──────────────────────────────────────────────────────
    metasound_author:  bp("mutate", "PREFERRED: stamp a whole MetaSound graph in ONE call from a declarative spec (avoids dozens of add_node/connect round-trips). Creates the asset through UMetaSoundSourceFactory, which is the only route that produces a document with interfaces and a graph page, then writes every element straight into that asset's own document and saves at the end. Params: name, packagePath?, format? ('mono'|'stereo'), oneShot?, onConflict?, inputs? [{name,dataType,default?}], outputs? [{name,dataType}], nodes? [{id,class,namespace?,variant?,majorVersion?,inputs?:{vertex:value}}], connections? [{from,to}]. Endpoints are 'nodeId:vertex', or special heads 'input:<name>', 'output:<name>', 'audioOut:<channel>'. Each element reports its own ok/error. Read the result back with metasound_read_document.", "metasound_author", (p) => ({ name: p.name, packagePath: p.packagePath, format: p.format, oneShot: p.oneShot, onConflict: p.onConflict, inputs: p.inputs, outputs: p.outputs, nodes: p.nodes, connections: p.connections })),
    create_metasound:  bp("mutate", "Create a MetaSoundSource through its own asset factory (which installs the UE.Source, one-shot and output-format interfaces and mints the default graph page) ready for INCREMENTAL authoring with add_node/connect/... For a whole graph at once prefer metasound_author. The incremental actions do NOT depend on this call: they attach a builder to whatever asset they are pointed at, so a MetaSound already on disk, or one from an earlier editor run, is editable without it. Params: name, packagePath? (default /Game/Audio/MetaSounds), format? ('mono'|'stereo'), oneShot?. Returns assetPath.", "create_metasound_source", (p) => ({ name: p.name, packagePath: p.packagePath, format: p.format, oneShot: p.oneShot, onConflict: p.onConflict })),
    metasound_list_node_classes: specBp("read", "List common MetaSound node classes to add (name, namespace, variant, notes).", "metasound_list_node_classes"),
    metasound_get_graph:         specBp("read", "SUPERSEDED for graph contents by metasound_read_document; kept for the one fact it still answers plainly: whether a builder is attached to this asset's document right now (hasActiveBuilder), plus audioOutputs and oneShot when this editor run has created or written to the asset. An attached builder does not mean unsaved work: the write actions edit the asset's own document and save it, and they attach a builder on demand, so this reports whether one is open rather than whether anything is pending. Asks only, and never attaches one itself. For nodes, pins, connections, variables, defaults and problems use metasound_read_document / metasound_list_connections / metasound_inspect_node / metasound_list_node_pins / metasound_search_nodes / metasound_list_variables / metasound_validate. Errors when assetPath names nothing, or names something that is not a MetaSoundSource.", "metasound_get_graph"),
    metasound_add_node:          specBp("mutate", "Add a node to a MetaSound graph by registered class name. Works on any MetaSound asset on disk: a builder is attached to the asset's own document on demand, so create_metasound is not a prerequisite and an asset from an earlier editor run is editable. Returns nodeId (+ input/output counts).", "metasound_add_node"),
    metasound_add_input:         specBp("mutate", "Add a graph input to a MetaSound.", "metasound_add_graph_input"),
    metasound_add_output:        specBp("mutate", "Add a graph output to a MetaSound.", "metasound_add_graph_output"),
    metasound_connect:           specBp("mutate", "Connect one node's output vertex to another node's input vertex.", "metasound_connect"),
    metasound_connect_input:     specBp("mutate", "Connect a graph input to a node input vertex.", "metasound_connect_graph_input"),
    metasound_connect_output:    specBp("mutate", "Connect a node output vertex to a graph output.", "metasound_connect_graph_output"),
    metasound_connect_audio_out: specBp("mutate", "Connect a node output vertex to the source's audio output.", "metasound_connect_audio_out"),
    metasound_set_default:       specBp("mutate", "Set a default value on a node input vertex (nodeId + inputName), or on a graph input (graphInput).", "metasound_set_input_default"),
    metasound_read_document: specBp("read", "Read a MetaSound graph back: document version, declared interfaces, graph inputs and outputs with their defaults, variables, every node and every connection. This is the verification counterpart to metasound_author, and the reason it matters is that the bridge could BUILD a graph and never read it, so it could write but not verify or iterate. Reads the asset's own document, which is the same one the write actions edit, so there is no second unflushed copy that could disagree with it; source and hasActiveBuilder report whether a builder is attached to that document. Reports pageId and readDefaultPage, falling back to the first page the document holds when it declares none under the default page id. Node ids match what metasound_add_node returned.", "metasound_read_document"),
    metasound_list_connections: specBp("read", "List every edge in the graph, each reported using the exact field names metasound_connect takes (fromNodeId, fromOutput, toNodeId, toInput), so a listed connection can be echoed straight back as a call payload. Use it to see what is already wired before adding more. Malformed edges are counted separately rather than silently dropped.", "metasound_list_connections"),
    metasound_list_variables: specBp("read", "List the graph's variables with data type, initial value, the node that sets each one and the node ids that read it, so a variable can be followed to the wiring that consumes it. Most graphs declare none, which is normal rather than a fault.", "metasound_list_variables"),
    metasound_search_nodes: specBp("read", "Find node INSTANCES inside one existing graph, by name, class, namespace, variant, data type or class type. This is the step between reading a document and acting on a node. Distinct from metasound_list_node_classes, which lists classes you could add rather than nodes already present.", "metasound_search_nodes"),
    metasound_inspect_node: specBp("read", "Inspect one node in full: its class identity in metasound_add_node's own parameter names, every input and output vertex with data type, default and connection state, and the incoming and outgoing edges named by node. A wrong nodeId comes back with the valid ones rather than a bare failure.", "metasound_inspect_node"),
    metasound_list_node_pins: specBp("read", "List just a node's input and output vertices with their types, connection state and set defaults, plus a count of unconnected inputs. The lean way to get the exact vertex names metasound_connect and metasound_set_input_default require, without reading the whole document.", "metasound_list_node_pins"),
    metasound_validate: specBp("read", "Diagnose a MetaSound graph and report actionable problems: undriven graph outputs, orphaned nodes, dead-end nodes, unconnected Trigger and Audio inputs, cross-type edges, dangling edges, and unread or unwritten variables. Returns problems[] naming the node and the call that fixes it, plus runnable. This is what catches the graph that builds successfully and then plays silence.", "metasound_validate"),
    metasound_build:             specBp("mutate", "SAVE the MetaSound asset to disk. Despite the name this compiles nothing and flushes nothing: every authoring action writes straight into the asset's own document, so what this adds is persistence, and it is what makes edits survive an editor restart. A read does not need it, since the reads see the same document.", "metasound_build"),
    metasound_remove_node:       specBp("mutate", "Remove a node from a MetaSound graph, with every edge that touched it. Attaches a builder to the asset's own document the way the MetaSound editor does, so a MetaSound already on disk, from any editor run, can be edited with no create call first. The edit lands in that document and is saved, so pendingBuild comes back false and metasound_build is not needed after it; source says whether a builder was already attached when the call arrived. Idempotent: alreadyDeleted=true when the id is not in the graph, and the miss lists the ids that are.", "metasound_remove_node"),
    metasound_disconnect:        specBp("mutate", "Cut MetaSound edges: the inverse of all four connect actions in one call, because they all reduce to the same two builder handles. Four addressing forms - all of fromNodeId, fromOutput, toNodeId and toInput drops that one edge and is the only form with an exact rollback; toNodeId plus toInput alone clears whatever drives that input; fromNodeId plus fromOutput alone clears every edge leaving that output; graphOutput clears what drives a graph output, which is also how an audio output is cleared since the audio outs are graph outputs named 'Out Mono', 'Out Left' and 'Out Right'. metasound_list_connections reports edges in these exact field names. Works on any MetaSound asset on disk, with no create call first, and saves the document it edited. Idempotent: alreadyDisconnected=true when nothing was connected there.", "metasound_disconnect"),
    metasound_remove_member:     specBp("mutate", "Remove a graph input, graph output or variable: the inverse of metasound_add_input and metasound_add_output, and the only removal path for a variable. Works on any MetaSound asset on disk, with no create call first, and saves the document it edited. The miss lists the members that do exist, and the result carries the removed member's dataType so the rollback can restore it. Note that every edge the member drove is cut with it, so read them with metasound_list_connections first if they matter. Idempotent: alreadyDeleted=true when the member is absent.", "metasound_remove_member"),
    metasound_rename_member:     specBp("mutate", "Rename a graph input or output on any MetaSound asset on disk, with no create call first, saving the document it edited. Not a property write: the rename rewires the template nodes that stand in for the member inside the graph, which a direct document write would leave dangling. Both names are checked first, so renaming onto an existing name is refused with the list rather than colliding, and a replay where the new name is already present reports unchanged=true. The inverse is the same call with the names swapped.", "metasound_rename_member"),

    // ── SoundCue graph ─────────────────────────────────────────────────
    cue_author:        bp("mutate", "PREFERRED: create a SoundCue and stamp its whole node tree in ONE call. Params: name, packagePath?, onConflict?, nodes [{id,type,soundWavePath?,properties?}], connections [{parent,child,index?}] (omit parent => root), root? (nodeId). Each element reports ok/error; links + saves at the end.", "soundcue_author", (p) => ({ name: p.name, packagePath: p.packagePath, onConflict: p.onConflict, nodes: p.nodes, connections: p.connections, root: p.root })),
    create_cue:        bp("mutate", "Create a SoundCue, optionally seeded from a wave. For a whole graph prefer cue_author. Params: name, packagePath?, soundWavePath?.", "create_sound_cue"),
    cue_add_node:      specBp("mutate", "Add a node to a SoundCue graph. Returns nodeId.", "soundcue_add_node"),
    cue_connect:       specBp("mutate", "Connect a SoundCue node as a child of another (or as the cue root).", "soundcue_connect"),
    cue_get_graph:     specBp("read", "Read a SoundCue node graph: nodes (id, type, children) and root.", "soundcue_get_graph"),
    cue_remove_node:   specBp("mutate", "Remove a node from a SoundCue: detach it from every parent, drop its paired editor graph node, and clear the cue root if it was the root. Its own children are ORPHANED rather than deleted, because they are separate nodes the caller may still want and an unasked-for cascade is the harder failure to recover from; they come back in orphanedChildren. Warns when the cue is left with no root, since the cue then plays nothing. Idempotent: alreadyDeleted=true when the id is not in the cue, and the miss lists the ids that are.", "soundcue_remove_node"),
    cue_disconnect:    specBp("mutate", "Detach a SoundCue child from its parent: the inverse of cue_connect. With parentNodeId it removes that one link; without, it removes the child from every parent. clearRoot=true unsets the cue root instead, which is the inverse of a cue_connect that named no parent. Idempotent: alreadyDisconnected=true when the link was not there.", "soundcue_disconnect"),

    // ── Mixing + routing ───────────────────────────────────────────────
    create_submix:     bp("mutate", "Create a USoundSubmix, optionally parented. Params: name, packagePath? (default /Game/Audio/Submixes), parentPath?, outputVolume?, wetLevel?, dryLevel?.", "create_submix", (p) => ({ name: p.name, packagePath: p.packagePath, parentPath: p.parentPath, outputVolume: p.outputVolume, wetLevel: p.wetLevel, dryLevel: p.dryLevel, onConflict: p.onConflict })),
    set_submix_parent: specBp("mutate", "Reparent a submix (sets ParentSubmix, updating both ends).", "set_submix_parent"),
    add_submix_effect: specBp("mutate", "Append a submix effect preset to a submix's effect chain (creates the preset asset).", "add_submix_effect"),
    create_sound_class: bp("mutate", "Create a USoundClass, optionally parented, with properties. Params: name, packagePath? (default /Game/Audio/SoundClasses), parentPath?, properties? (FSoundClassProperties JSON: Volume, Pitch, bIsUISound, ...).", "create_sound_class", (p) => ({ name: p.name, packagePath: p.packagePath, parentPath: p.parentPath, properties: p.properties, onConflict: p.onConflict })),
    set_sound_class_parent: specBp("mutate", "Reparent a sound class through USoundClass::SetParentClass, which is the call that keeps all three sides consistent: ParentClass on the child, ChildClasses on the new parent, and the removal from the old parent's list. Writing ParentClass with a property setter produces a class the audio engine walks up from and the mixer never walks down to, which is why this is a handler. An empty parentPath detaches to the root, and a parent already below this class is refused as a cycle. Reports listedOnParent, read back from the other end.", "set_sound_class_parent"),
    read_sound_routing: specBp("read", "Read where a sound actually goes: its sound class chain up to the root and its submix chain up to the master, each entry with its objectPath, plus submix sends, attenuation, concurrency, and problems[] naming the calls that fix them. This is the verification half of set_sound_submix, add_sound_submix_send, set_sound_class, set_sound_attenuation and set_sound_concurrency, which could all assign routing and none of which could read it back. Catches the cases that make a correctly authored mix silent anyway: a sound class at volume 0, a send at level 0, a duplicate send (add_sound_submix_send appends without checking), an attenuation with a falloff distance and bAttenuate off, a concurrency with MaxCount 0, and a cycle in either chain.", "read_sound_routing"),
    create_sound_mix:   bp("mutate", "Create a USoundMix with sound-class adjusters. Params: name, packagePath? (default /Game/Audio/SoundMixes), adjusters? ([{soundClassPath, volumeAdjuster?, pitchAdjuster?, applyToChildren?}]), fadeInTime?, fadeOutTime?.", "create_sound_mix", (p) => ({ name: p.name, packagePath: p.packagePath, adjusters: p.adjusters, fadeInTime: p.fadeInTime, fadeOutTime: p.fadeOutTime, onConflict: p.onConflict })),
    create_concurrency: bp("mutate", "Create a USoundConcurrency asset. Params: name, packagePath? (default /Game/Audio/Concurrency), maxCount?, limitToOwner?, resolutionRule? (e.g. 'StopFarthestThenOldest'), volumeScale?.", "create_concurrency", (p) => ({ name: p.name, packagePath: p.packagePath, maxCount: p.maxCount, limitToOwner: p.limitToOwner, resolutionRule: p.resolutionRule, volumeScale: p.volumeScale, onConflict: p.onConflict })),

    // ── Spatialization ─────────────────────────────────────────────────
    create_attenuation: bp("mutate", "Create a USoundAttenuation asset. Params: name, packagePath? (default /Game/Audio/Attenuation), settings? (FSoundAttenuationSettings JSON), plus shortcuts: falloffDistance?, spatialize?, enableOcclusion?.", "create_attenuation", (p) => ({ name: p.name, packagePath: p.packagePath, settings: p.settings, falloffDistance: p.falloffDistance, spatialize: p.spatialize, enableOcclusion: p.enableOcclusion, onConflict: p.onConflict })),

    // ── Assign routing onto a sound ────────────────────────────────────
    set_sound_submix:      specBp("mutate", "Set a sound's base submix (routing target).", "set_sound_submix"),
    add_sound_submix_send: specBp("mutate", "Add a submix send to a sound.", "add_sound_submix_send"),
    set_sound_class:       specBp("mutate", "Assign a sound class to a sound.", "set_sound_class"),
    set_sound_attenuation: specBp("mutate", "Attach an attenuation asset to a sound.", "set_sound_attenuation"),
    set_sound_concurrency: specBp("mutate", "Attach a concurrency asset to a sound.", "set_sound_concurrency"),

    // ── Generic property set (any audio asset) ─────────────────────────
    set_property:      specBp("mutate", "Set any UPROPERTY on an audio asset by (dotted) name, value as JSON. Handles nested structs, arrays, object refs.", "set_audio_property"),
  },
  undefined,
  {
    // #1057: every key a spec'd handler declares, generated from its C++
    // registration. A key listed again below is shared with hand-written
    // actions, and tests/unit/handler-specs.test.ts holds the two to one type.
    ...specSchema,
    // The shared cursor and limit. Every paged action here is spec'd; these
    // keep the fuller descriptions and match the generated types.
    ...PAGINATION_SCHEMA,
    name: z.string().optional(),
    packagePath: z.string().optional(),
    onConflict: z.string().optional().describe("skip|replace|rename when the asset name exists"),
    soundWavePath: z.string().optional(),
    filePath: z.string().optional().describe("import_audio: path to a WAV/OGG/FLAC file"),
    looping: z.boolean().optional().describe("import_audio: set SoundWave bLooping"),
    replaceExisting: z.boolean().optional().describe("import_audio: replace an existing asset (default true)"),

    // metasound
    format: z.string().optional().describe("create_metasound: 'mono' | 'stereo'"),
    oneShot: z.boolean().optional(),

    // one-shot declarative graph authoring (metasound_author / cue_author)
    inputs: z.array(MetaSoundGraphInput).optional().describe("metasound_author: [{name,dataType,default?}]"),
    outputs: z.array(MetaSoundGraphOutput).optional().describe("metasound_author: [{name,dataType}]"),
    nodes: z.array(z.union([MetaSoundAuthorNode, SoundCueAuthorNode])).optional().describe("author: node specs. metasound_author: [{id,class,namespace?,variant?,majorVersion?,inputs?}]. cue_author: [{id,type,soundWavePath?,...props}]"),
    connections: z.array(z.union([MetaSoundAuthorConnection, SoundCueAuthorConnection])).optional().describe("author: connection specs. metasound_author: [{from,to}]. cue_author: [{child,parent?,index?}]"),
    root: z.string().optional().describe("cue_author: explicit root nodeId"),

    // creation of mixing / routing / spatialization assets
    properties: z.record(z.any()).optional(),
    parentPath: z.string().optional(),
    outputVolume: z.number().optional(),
    wetLevel: z.number().optional(),
    dryLevel: z.number().optional(),
    settings: z.record(z.any()).optional(),
    adjusters: z.array(SoundClassAdjuster).optional().describe("create_sound_mix: [{soundClassPath,volumeAdjuster?,pitchAdjuster?,applyToChildren?}]"),
    fadeInTime: z.number().optional(),
    fadeOutTime: z.number().optional(),
    maxCount: z.number().optional(),
    limitToOwner: z.boolean().optional(),
    resolutionRule: z.string().optional(),
    volumeScale: z.number().optional(),
    falloffDistance: z.number().optional(),
    spatialize: z.boolean().optional(),
    enableOcclusion: z.boolean().optional(),
  },
);
