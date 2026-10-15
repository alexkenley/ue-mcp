// Stage the changed declarations without starting an editor. A live spec
// recording after compilation must verify this provisional contract.
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const snapshotPath = new URL("tests/golden/handler-specs.json", root);
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const groups = {
  asset: ["edit_collection_entry", "clone_datatable_rows", "remove_datatable_row"],
  gameplay: ["set_player_mappable_settings"],
};
for (const [category, methods] of Object.entries(groups)) {
  const folder = category[0].toUpperCase() + category.slice(1);
  const source = fs.readFileSync(new URL(`plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/Private/Handlers/${folder}/${folder}Handlers.cpp`, root), "utf8");
  for (const method of methods) {
    const start = source.indexOf(`Registry.RegisterHandler(TEXT("${method}")`);
    if (start < 0) throw new Error(`Missing registration: ${method}`);
    const end = source.indexOf("Registry.RegisterHandler", start + 1);
    const block = source.slice(start, end < 0 ? undefined : end);
    const params = [];
    let parent;
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/MCPParam::(Required|Optional)(Field)?\(TEXT\("([^"]+)"\), EType::(\w+), TEXT\("([^"]*)"\)\)/);
      if (match) {
        const [, requirement, field, name, type, description] = match;
        const param = { name, type: type.toLowerCase(), required: requirement === "Required", description };
        const alias = line.match(/\.Alias\(TEXT\("([^"]+)"\)\)/);
        if (alias) param.aliases = [alias[1]];
        const items = line.match(/\.Items\(EType::(\w+)\)/);
        if (items) param.items = items[1].toLowerCase();
        const enumeration = line.match(/\.Enum\(\{(.*?)\}\)/);
        if (enumeration) param.enum = [...enumeration[1].matchAll(/TEXT\("([^"]+)"\)/g)].map(match => match[1]);
        if (line.includes(".Nullable()")) param.nullable = true;
        if (field) (parent.fields ??= []).push(param);
        else { params.push(param); parent = param; }
      } else if (line.includes("SaveFlag()")) {
        params.push(snapshot.handlers[method].params.find(p => p.name === "save"));
      }
    }
    const spec = { category, params };
    if (method === "set_player_mappable_settings") spec.choices = [{ mode: "exactlyOne", branches: [["inputActionPath"], ["imcPath", "mappingIndex"]] }];
    if (method === "remove_datatable_row") spec.choices = [{ mode: "exactlyOne", branches: [["rowName"], ["rowNames"]] }];
    snapshot.handlers[method] = spec;
  }
}
const editor = fs.readFileSync(new URL("plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/Private/Handlers/Editor/EditorHandlers.cpp", root), "utf8");
const staticBlock = editor.slice(editor.indexOf('Registry.RegisterHandler(TEXT("invoke_static_function")'));
for (const name of ["className", "functionName"]) {
  const line = staticBlock.split(/\r?\n/).find(line => line.includes(`MCPParam::Required(TEXT("${name}")`));
  const description = line?.match(/EType::String, TEXT\("([^"]+)"\)\)/)?.[1];
  if (!description) throw new Error(`Missing static invocation ${name} description`);
  snapshot.handlers.invoke_static_function.params.find(p => p.name === name).description = description;
}
snapshot.handlers = Object.fromEntries(Object.entries(snapshot.handlers).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
snapshot.handlerCount = Object.keys(snapshot.handlers).length;
fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
