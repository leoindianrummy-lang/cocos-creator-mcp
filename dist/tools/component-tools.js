"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const tool_base_1 = require("../tool-base");
const utils_1 = require("../utils");
const node_resolve_1 = require("../node-resolve");
const screenshot_1 = require("../screenshot");
const EXT_NAME = "cocos-creator-mcp";
class ComponentTools {
    constructor() {
        this.categoryName = "component";
    }
    getTools() {
        return [
            {
                name: "component_add",
                description: "Add a component to a node. Use cc.XXX format (e.g. 'cc.Label', 'cc.Sprite', 'cc.Button').",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                        componentType: { type: "string", description: "Component class name (e.g. 'cc.Label')" },
                    },
                    required: ["uuid", "componentType"],
                },
            },
            {
                name: "component_remove",
                description: "Remove a component from a node.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                        componentType: { type: "string", description: "Component class name to remove" },
                    },
                    required: ["uuid", "componentType"],
                },
            },
            {
                name: "component_get_components",
                description: "Get all components on a node with their properties.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID (either uuid or nodeName required)" },
                        nodeName: { type: "string", description: "Node name to find (alternative to uuid)" },
                    },
                },
            },
            {
                name: "component_set_property",
                description: "Set one or more properties on a component. For single: use property+value. For batch: use properties array. Use nodeName instead of uuid to find node by name. Set screenshot=true to capture editor screenshot after changes. Examples: Label.string, Label.fontSize, Sprite.color, UITransform.contentSize.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID (either uuid or nodeName required)" },
                        nodeName: { type: "string", description: "Node name to find (alternative to uuid — avoids UUID lookup)" },
                        componentType: { type: "string", description: "Component class name (e.g. 'cc.Label')" },
                        property: { type: "string", description: "Property name (single mode)" },
                        value: { description: "Value to set (single mode)" },
                        properties: {
                            type: "array",
                            description: "Batch mode: array of {property, value} objects to set multiple properties at once",
                            items: {
                                type: "object",
                                properties: {
                                    property: { type: "string", description: "Property name" },
                                    value: { description: "Value to set" },
                                },
                                required: ["property", "value"],
                            },
                        },
                        screenshot: { type: "boolean", description: "If true, capture editor screenshot after setting properties and return the file path (default: false)" },
                    },
                    required: ["componentType"],
                },
            },
            {
                name: "component_get_info",
                description: "Get detailed dump of a specific component by its UUID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        componentUuid: { type: "string", description: "Component UUID (not node UUID)" },
                    },
                    required: ["componentUuid"],
                },
            },
            {
                name: "component_get_available",
                description: "List all available component classes that can be added to nodes.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "component_auto_bind",
                description: "Automatically bind @property references by matching property names to descendant node names. Searches only descendants of the target node. Validates component type existence. Supports array properties (Slot_0, Slot_1...). Mode: 'fuzzy' (default) tries exact match first, then case-insensitive; 'strict' requires exact match only.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID (either uuid or nodeName required)" },
                        nodeName: { type: "string", description: "Node name to find (alternative to uuid)" },
                        componentType: { type: "string", description: "Script component class name (e.g. 'QuestReadyPageView')" },
                        force: { type: "boolean", description: "If true, rebind even already-bound properties (default: false)" },
                        mode: { type: "string", enum: ["fuzzy", "strict"], description: "Matching mode: 'fuzzy' (default) or 'strict'" },
                    },
                    required: ["componentType"],
                },
            },
            {
                name: "component_query_enum",
                description: "Get enum values for a component property. Useful for knowing what values Layout.type, Layout.resizeMode, etc. accept.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                        componentType: { type: "string", description: "Component class (e.g. 'cc.Layout')" },
                        property: { type: "string", description: "Property name (e.g. 'type', 'resizeMode')" },
                    },
                    required: ["uuid", "componentType", "property"],
                },
            },
        ];
    }
    async execute(toolName, args) {
        var _a, _b;
        // パラメータエイリアス: component → componentType
        const compType = args.componentType || args.component;
        // nodeName → uuid 解決（対応ツールのみ）
        const needsResolve = ["component_set_property", "component_get_components", "component_auto_bind"];
        if (needsResolve.includes(toolName) && !args.uuid && args.nodeName) {
            try {
                const resolved = await (0, node_resolve_1.resolveNodeUuid)({ nodeName: args.nodeName });
                args.uuid = resolved.uuid;
            }
            catch (e) {
                return (0, tool_base_1.err)(e.message || String(e));
            }
        }
        switch (toolName) {
            case "component_add":
                return this.addComponent(args.uuid, compType);
            case "component_remove":
                return this.removeComponent(args.uuid, compType);
            case "component_get_components":
                return this.getComponents(args.uuid);
            case "component_set_property": {
                const properties = (0, utils_1.parseMaybeJson)(args.properties);
                let result;
                if (properties && Array.isArray(properties)) {
                    const parsed = properties.map((p) => (Object.assign(Object.assign({}, p), { value: (0, utils_1.parseMaybeJson)(p.value) })));
                    result = await this.setProperties(args.uuid, compType, parsed);
                }
                else {
                    result = await this.setProperty(args.uuid, compType, args.property, (0, utils_1.parseMaybeJson)(args.value));
                }
                // screenshot オプション
                if (args.screenshot) {
                    try {
                        const ss = await (0, screenshot_1.takeEditorScreenshot)();
                        const data = JSON.parse(result.content[0].text);
                        data.screenshot = { path: ss.path, size: ss.savedSize };
                        return (0, tool_base_1.ok)(data);
                    }
                    catch (ssErr) {
                        // スクショ失敗してもプロパティ設定結果は返す
                        const data = JSON.parse(result.content[0].text);
                        data.screenshotError = ssErr.message || String(ssErr);
                        return (0, tool_base_1.ok)(data);
                    }
                }
                return result;
            }
            case "component_get_info": {
                try {
                    const dump = await Editor.Message.request("scene", "query-component", args.componentUuid);
                    return (0, tool_base_1.ok)({ success: true, component: dump });
                }
                catch (e) {
                    return (0, tool_base_1.err)(e.message || String(e));
                }
            }
            case "component_get_available": {
                try {
                    const classes = await Editor.Message.request("scene", "query-classes");
                    return (0, tool_base_1.ok)({ success: true, classes });
                }
                catch (e) {
                    return (0, tool_base_1.err)(e.message || String(e));
                }
            }
            case "component_auto_bind":
                return this.autoBind(args.uuid, compType, (_a = args.force) !== null && _a !== void 0 ? _a : false, (_b = args.mode) !== null && _b !== void 0 ? _b : "fuzzy");
            case "component_query_enum":
                return this.queryEnum(args.uuid, compType, args.property);
            default:
                return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
        }
    }
    async addComponent(uuid, componentType) {
        try {
            const result = await this.sceneScript("addComponentToNode", [uuid, componentType]);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async queryEnum(nodeUuid, componentType, property) {
        var _a;
        try {
            const nodeDump = await Editor.Message.request("scene", "query-node", nodeUuid);
            if (!nodeDump)
                return (0, tool_base_1.err)("Node not found");
            const comps = nodeDump.__comps__ || [];
            for (const comp of comps) {
                const compType = comp.type;
                if (!compType)
                    continue;
                // Match by cc.XXX format
                const normalizedType = componentType.startsWith("cc.") ? componentType.substring(3) : componentType;
                if (compType !== `cc.${normalizedType}` && compType !== componentType)
                    continue;
                const propDump = (_a = comp.value) === null || _a === void 0 ? void 0 : _a[property];
                if (!propDump)
                    return (0, tool_base_1.err)(`Property '${property}' not found on ${componentType}`);
                if (propDump.type !== "Enum") {
                    return (0, tool_base_1.ok)({ success: true, property, type: propDump.type, note: "Not an enum property", currentValue: propDump.value });
                }
                return (0, tool_base_1.ok)({
                    success: true,
                    property,
                    currentValue: propDump.value,
                    enumList: propDump.enumList,
                });
            }
            return (0, tool_base_1.err)(`Component ${componentType} not found on node`);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async removeComponent(uuid, componentType) {
        try {
            const result = await this.sceneScript("removeComponentFromNode", [uuid, componentType]);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getComponents(uuid) {
        var _a, _b;
        try {
            const result = await this.sceneScript("getNodeInfo", [uuid]);
            if (!result.success)
                return (0, tool_base_1.ok)(result);
            return (0, tool_base_1.ok)({
                success: true,
                uuid,
                name: (_a = result.data) === null || _a === void 0 ? void 0 : _a.name,
                components: ((_b = result.data) === null || _b === void 0 ? void 0 : _b.components) || [],
            });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * @property 名とノード名を自動マッチングしてバインドする。
     *
     * - 検索スコープ: 対象ノードの子孫のみ
     * - 複数ヒット時: 階層の浅いノード（直接の子）を優先
     * - 型検証: Component 参照型の場合、該当コンポーネントの存在を確認
     * - 配列対応: @property([Node]) → 連番ノード名 (Slots_0, Slots_1...)
     * - mode:
     *   - "fuzzy" (default): 完全一致 → case-insensitive → not_found+候補
     *   - "strict": 完全一致のみ → not_found+候補
     */
    async autoBind(nodeUuid, componentType, force, mode) {
        try {
            const nodeDump = await Editor.Message.request("scene", "query-node", nodeUuid);
            if (!nodeDump)
                return (0, tool_base_1.err)("Node not found");
            const comps = nodeDump.__comps__ || [];
            const compName = componentType.replace("cc.", "");
            const compIndex = comps.findIndex((c) => {
                const t = c.type || "";
                return t === compName || t === `cc.${compName}`;
            });
            if (compIndex < 0)
                return (0, tool_base_1.err)(`Component ${componentType} not found on node`);
            // 子孫ノード一覧を一括取得（検索効率化）
            const allDescendants = await this.sceneScript("getAllDescendants", [nodeUuid]);
            const descendantList = (allDescendants === null || allDescendants === void 0 ? void 0 : allDescendants.success) ? allDescendants.data : [];
            const compDump = comps[compIndex];
            const properties = compDump.value || {};
            const skipKeys = new Set(["uuid", "name", "enabled", "node", "__scriptAsset", "__prefab", "_name", "_objFlags", "_enabled"]);
            const results = [];
            for (const [propName, propDumpRaw] of Object.entries(properties)) {
                if (skipKeys.has(propName) || propName.startsWith("_"))
                    continue;
                const propDump = propDumpRaw;
                const propType = propDump.type;
                if (!propType)
                    continue;
                const extendsArr = (propDump.extends || []);
                // 配列型の判定
                const isArray = propType === "Array" || Array.isArray(propDump.value);
                if (isArray) {
                    const arrayResult = await this.autoBindArray(nodeUuid, compIndex, propName, propDump, descendantList, mode);
                    results.push(arrayResult);
                    continue;
                }
                const isNodeRef = propType === "cc.Node";
                const isComponentRef = extendsArr.includes("cc.Component");
                if (!isNodeRef && !isComponentRef)
                    continue;
                // 既にバインド済みならスキップ
                const currentValue = propDump.value;
                if (!force && (currentValue === null || currentValue === void 0 ? void 0 : currentValue.uuid)) {
                    results.push({ property: propName, status: "already_bound" });
                    continue;
                }
                // 名前マッチ: 完全一致 → fuzzy時は case-insensitive
                const matchResult = this.findMatchingNode(propName, descendantList, mode);
                if (matchResult && isComponentRef) {
                    // 型検証: コンポーネントが存在するか
                    const hasComp = await this.nodeHasComponent(matchResult.uuid, propType);
                    if (!hasComp) {
                        results.push({ property: propName, type: propType, status: "type_mismatch",
                            nodeName: matchResult.name, message: `Node "${matchResult.name}" has no ${propType} component` });
                        continue;
                    }
                }
                if (!matchResult) {
                    // 候補サジェスト
                    const suggestions = this.getSuggestions(propName, descendantList);
                    results.push({ property: propName, type: propType, status: "not_found", suggestions });
                    continue;
                }
                const path = `__comps__.${compIndex}.${propName}`;
                const dump = await this.buildDumpWithTypeInfo(nodeUuid, path, matchResult.uuid);
                const setResult = await this.sceneScript("setPropertyViaEditor", [nodeUuid, path, dump]);
                const status = matchResult.exact ? "bound" : "fuzzy_bound";
                results.push({ property: propName, status, nodeName: matchResult.name, success: (setResult === null || setResult === void 0 ? void 0 : setResult.success) !== false });
            }
            const boundCount = results.filter(r => r.status === "bound" || r.status === "fuzzy_bound").length;
            const fuzzyCount = results.filter(r => r.status === "fuzzy_bound").length;
            const notFoundCount = results.filter(r => r.status === "not_found").length;
            return (0, tool_base_1.ok)({ success: true, boundCount, fuzzyCount, notFoundCount, results });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * 子孫リストからプロパティ名にマッチするノードを検索。
     * 完全一致を優先、fuzzy モードでは case-insensitive もフォールバック。
     * 複数ヒット時は階層の浅い（depth が小さい）ものを優先。
     */
    findMatchingNode(propName, descendants, mode) {
        const candidates = this.propertyNameToNodeNames(propName);
        // 1. 完全一致
        for (const candidate of candidates) {
            const matches = descendants
                .filter(d => d.name === candidate)
                .sort((a, b) => a.depth - b.depth);
            if (matches.length > 0) {
                return { uuid: matches[0].uuid, name: matches[0].name, exact: true };
            }
        }
        // 2. fuzzy: case-insensitive
        if (mode === "fuzzy") {
            const lowerCandidates = candidates.map(c => c.toLowerCase());
            const matches = descendants
                .filter(d => lowerCandidates.includes(d.name.toLowerCase()))
                .sort((a, b) => a.depth - b.depth);
            if (matches.length > 0) {
                return { uuid: matches[0].uuid, name: matches[0].name, exact: false };
            }
        }
        return null;
    }
    /**
     * not_found 時に似た名前のノードをサジェストする。
     */
    getSuggestions(propName, descendants) {
        const lower = propName.toLowerCase();
        return descendants
            .filter(d => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase()))
            .map(d => d.name)
            .slice(0, 5);
    }
    /**
     * ノードに指定型のコンポーネントが存在するか確認。
     */
    async nodeHasComponent(nodeUuid, propType) {
        var _a;
        const typeName = propType.replace("cc.", "");
        const info = await this.sceneScript("getNodeInfo", [nodeUuid]);
        if (!(info === null || info === void 0 ? void 0 : info.success) || !((_a = info === null || info === void 0 ? void 0 : info.data) === null || _a === void 0 ? void 0 : _a.components))
            return false;
        return info.data.components.some((c) => c.type === typeName);
    }
    /**
     * 配列 @property の自動バインド。
     * プロパティ名 "slots" → "Slots_0", "Slots_1", ... の連番ノードを検索。
     */
    async autoBindArray(nodeUuid, compIndex, propName, propDump, descendants, mode) {
        var _a, _b;
        const elementType = (_b = (_a = propDump.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.type;
        if (!elementType) {
            return { property: propName, status: "skip", reason: "empty array or unknown element type" };
        }
        const pascal = propName.charAt(0).toUpperCase() + propName.slice(1);
        const foundElements = [];
        let index = 0;
        while (true) {
            const candidateName = `${pascal}_${index}`;
            // 完全一致 or case-insensitive
            let match = descendants.find(d => d.name === candidateName);
            if (!match && mode === "fuzzy") {
                const lower = candidateName.toLowerCase();
                match = descendants.find(d => d.name.toLowerCase() === lower);
            }
            if (!match)
                break;
            const elementPath = `__comps__.${compIndex}.${propName}.${index}`;
            const dump = await this.buildDumpWithTypeInfo(nodeUuid, elementPath, match.uuid);
            const setResult = await this.sceneScript("setPropertyViaEditor", [nodeUuid, elementPath, dump]);
            const exact = match.name === candidateName;
            foundElements.push({ index, nodeName: match.name, exact, success: (setResult === null || setResult === void 0 ? void 0 : setResult.success) !== false });
            index++;
        }
        if (foundElements.length === 0) {
            return { property: propName, status: "not_found", type: "Array", candidates: [`${pascal}_0`, `${pascal}_1`, "..."] };
        }
        const hasFuzzy = foundElements.some(e => !e.exact);
        return { property: propName, status: hasFuzzy ? "fuzzy_bound" : "bound", type: "Array", count: foundElements.length, elements: foundElements };
    }
    /**
     * camelCase プロパティ名からノード名の候補を生成。
     * closeButton → ["CloseButton", "closeButton"]
     */
    propertyNameToNodeNames(propName) {
        const pascal = propName.charAt(0).toUpperCase() + propName.slice(1);
        const names = [pascal];
        if (pascal !== propName)
            names.push(propName);
        return names;
    }
    async setProperty(uuid, componentType, property, value) {
        var _a;
        try {
            // コンポーネントのインデックスを取得
            const nodeInfo = await this.sceneScript("getNodeInfo", [uuid]);
            if (!(nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.success) || !((_a = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                return (0, tool_base_1.err)(`Node ${uuid} not found or has no components`);
            }
            const compName = componentType.replace("cc.", "");
            const compIndex = nodeInfo.data.components.findIndex((c) => c.type === compName);
            if (compIndex < 0) {
                return (0, tool_base_1.err)(`Component ${componentType} not found on node ${uuid}`);
            }
            // scene:set-property でプロパティ変更（Prefab保存時にも反映される）
            // パス形式: __comps__.{index}.{property}
            const path = `__comps__.${compIndex}.${property}`;
            // プロパティの型情報をquery-nodeから取得して、適切なdump形式を構築
            const dump = await this.buildDumpWithTypeInfo(uuid, path, value);
            const result = await this.sceneScript("setPropertyViaEditor", [uuid, path, dump]);
            // cc.Widget の isAlign* 設定後は _alignFlags を再計算する
            // (Editor が isAlign* 変更時に _alignFlags を自動更新しないバグの対処)
            if (componentType === "cc.Widget" && property.startsWith("isAlign")) {
                await this.recalcWidgetAlignFlags(uuid, compIndex);
            }
            return (0, tool_base_1.ok)({ success: true, path, dump, result });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async setProperties(uuid, componentType, properties) {
        var _a;
        try {
            if (!componentType)
                return (0, tool_base_1.err)("componentType is required");
            if (!properties.length)
                return (0, tool_base_1.err)("properties array is empty");
            // コンポーネントのインデックスを取得（1回だけ）
            const nodeInfo = await this.sceneScript("getNodeInfo", [uuid]);
            if (!(nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.success) || !((_a = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                return (0, tool_base_1.err)(`Node ${uuid} not found or has no components`);
            }
            const compName = componentType.replace("cc.", "");
            const compIndex = nodeInfo.data.components.findIndex((c) => c.type === compName);
            if (compIndex < 0) {
                return (0, tool_base_1.err)(`Component ${componentType} not found on node ${uuid}`);
            }
            const results = [];
            for (const { property, value } of properties) {
                const path = `__comps__.${compIndex}.${property}`;
                const dump = await this.buildDumpWithTypeInfo(uuid, path, value);
                const result = await this.sceneScript("setPropertyViaEditor", [uuid, path, dump]);
                results.push({ property, success: (result === null || result === void 0 ? void 0 : result.success) !== false, path });
            }
            const allOk = results.every(r => r.success);
            // cc.Widget の isAlign* 設定後は _alignFlags を再計算する
            // (Editor が isAlign* 変更時に _alignFlags を自動更新しないバグの対処)
            if (componentType === "cc.Widget" && properties.some(p => p.property.startsWith("isAlign"))) {
                await this.recalcWidgetAlignFlags(uuid, compIndex);
            }
            return (0, tool_base_1.ok)({ success: allOk, results });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * cc.Widget の isAlign* プロパティ現在値から _alignFlags ビットマスクを再計算して設定する。
     *
     * CocosCreator Editor は isAlign* を setPropertyViaEditor で変更しても
     * _alignFlags を自動更新しないバグがある。このヘルパーで明示的に同期する。
     *
     * _alignFlags ビット定義:
     *   isAlignLeft=1, isAlignRight=2, isAlignTop=4, isAlignBottom=8,
     *   isAlignHorizontalCenter=16, isAlignVerticalCenter=32
     */
    async recalcWidgetAlignFlags(uuid, wIdx) {
        var _a, _b, _c;
        const ALIGN_BITS = {
            isAlignLeft: 1, isAlignRight: 2, isAlignTop: 4, isAlignBottom: 8,
            isAlignHorizontalCenter: 16, isAlignVerticalCenter: 32,
        };
        try {
            const nodeDump = await Editor.Message.request("scene", "query-node", uuid);
            if (!nodeDump)
                return;
            const wCompDump = (_a = nodeDump.__comps__) === null || _a === void 0 ? void 0 : _a[wIdx];
            if (!wCompDump)
                return;
            let alignFlags = 0;
            for (const [key, bit] of Object.entries(ALIGN_BITS)) {
                if (((_c = (_b = wCompDump.value) === null || _b === void 0 ? void 0 : _b[key]) === null || _c === void 0 ? void 0 : _c.value) === true)
                    alignFlags |= bit;
            }
            const path = `__comps__.${wIdx}._alignFlags`;
            await this.sceneScript("setPropertyViaEditor", [uuid, path, { value: alignFlags, type: "Number" }]);
        }
        catch (_e) {
            // _alignFlags 再計算の失敗は致命的でないため無視
        }
    }
    /**
     * プロパティの型情報をEditor APIから取得し、適切なdump形式を構築する。
     *
     * UUID文字列が渡された場合、プロパティの型に応じて:
     * - Node/Component参照型 → {type: propType, value: {uuid: nodeUuid}}
     * - Asset参照型（cc.Prefab等） → {type: propType, value: {uuid: assetUuid}}
     * - String型 → {value, type: "String"}
     */
    async buildDumpWithTypeInfo(nodeUuid, path, value) {
        var _a;
        // プリミティブ型はそのまま
        if (typeof value === "number")
            return { value, type: "Number" };
        if (typeof value === "boolean")
            return { value, type: "Boolean" };
        // v2.0.0: {path: "db://..."} / {guid: "..."} オブジェクト形式 — Asset 参照を path/guid で渡す方法
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            if (typeof value.path === "string" && value.path.startsWith("db://")) {
                const resolvedUuid = await this.resolveAssetUuidByPath(value.path);
                if (!resolvedUuid)
                    throw new Error(`Asset not found at path: ${value.path}`);
                if (typeof value.type === "string") {
                    return { type: value.type, value: { uuid: resolvedUuid } };
                }
                value = resolvedUuid; // 以降、文字列として型解決経路へ
            }
            else if (typeof value.guid === "string") {
                if (typeof value.type === "string") {
                    return { type: value.type, value: { uuid: value.guid } };
                }
                value = value.guid;
            }
        }
        // オブジェクト形式 {uuid: "xxx", type: "cc.Node"} はそのまま
        // type 指定なしの {uuid: "xxx"} はプロパティの実際の型を解決するため文字列扱いに変換する
        if (value !== null && typeof value === "object" && typeof value.uuid === "string") {
            if (typeof value.type === "string") {
                return { type: value.type, value: { uuid: value.uuid } };
            }
            // type 未指定: 文字列として処理してプロパティ型から解決
            value = value.uuid;
        }
        // @path: プレフィックスの場合: パスからノードUUIDを解決
        if (typeof value === "string" && value.startsWith("@path:")) {
            const nodePath = value.slice(6);
            const result = await this.sceneScript("findNodeByPath", [nodePath]);
            if ((result === null || result === void 0 ? void 0 : result.success) && ((_a = result.data) === null || _a === void 0 ? void 0 : _a.uuid)) {
                value = result.data.uuid;
            }
            else {
                throw new Error(`Node not found at path: ${nodePath}`);
            }
        }
        // v2.0.0: db:// 始まりの文字列は Asset path として UUID に自動解決
        if (typeof value === "string" && value.startsWith("db://")) {
            const resolvedUuid = await this.resolveAssetUuidByPath(value);
            if (!resolvedUuid)
                throw new Error(`Asset not found at path: ${value}`);
            value = resolvedUuid;
        }
        // 文字列の場合: プロパティの型情報を取得して判定
        if (typeof value === "string") {
            try {
                const nodeDump = await Editor.Message.request("scene", "query-node", nodeUuid);
                if (nodeDump) {
                    const propDump = this.resolveDumpPath(nodeDump, path);
                    if (propDump === null || propDump === void 0 ? void 0 : propDump.type) {
                        const propType = propDump.type;
                        const extendsArr = (propDump.extends || []);
                        const isComponentRef = extendsArr.includes("cc.Component");
                        const isNodeRef = propType === "cc.Node";
                        const isAssetRef = extendsArr.includes("cc.Asset");
                        if (isComponentRef) {
                            // コンポーネント参照: ノードUUIDからコンポーネントUUIDを解決
                            const compUuid = await this.resolveComponentUuid(value, propType);
                            return { type: propType, value: { uuid: compUuid || value } };
                        }
                        if (isNodeRef) {
                            return { type: propType, value: { uuid: value } };
                        }
                        if (isAssetRef) {
                            return { type: propType, value: { uuid: value } };
                        }
                    }
                }
            }
            catch (_e) {
                // query-node失敗時はフォールバック
            }
            return { value, type: "String" };
        }
        // その他のオブジェクト（contentSize, color等の構造体）
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            const wrapped = {};
            for (const [k, v] of Object.entries(value)) {
                wrapped[k] = { value: v };
            }
            return { value: wrapped };
        }
        return { value };
    }
    /**
     * query-nodeのdumpからドットパスでプロパティを解決する。
     * 例: "__comps__.2.scrollView" → nodeDump.__comps__[2].value.scrollView
     */
    resolveDumpPath(nodeDump, path) {
        var _a;
        const parts = path.split(".");
        let current = nodeDump;
        for (const part of parts) {
            if (!current)
                return null;
            if (part === "__comps__") {
                current = current.__comps__;
            }
            else if (/^\d+$/.test(part)) {
                current = (_a = current[parseInt(part)]) === null || _a === void 0 ? void 0 : _a.value;
            }
            else {
                current = current === null || current === void 0 ? void 0 : current[part];
            }
        }
        return current;
    }
    /**
     * Asset path (db://...) から asset UUID を解決する。サブアセット指定 (@spriteFrame 等)
     * もそのまま query-uuid に投げる。失敗時は null を返す。
     */
    async resolveAssetUuidByPath(assetPath) {
        try {
            const uuid = await Editor.Message.request("asset-db", "query-uuid", assetPath);
            if (typeof uuid === "string" && uuid.length > 0)
                return uuid;
        }
        catch (_e) { /* fallthrough */ }
        return null;
    }
    /**
     * ノードUUIDからコンポーネントUUIDを解決する。
     * propType（例: "cc.ScrollView", "MissionListPanel"）に一致するコンポーネントを探す。
     */
    async resolveComponentUuid(nodeUuid, propType) {
        var _a;
        try {
            const nodeInfo = await this.sceneScript("getNodeInfo", [nodeUuid]);
            if (!(nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.success) || !((_a = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.data) === null || _a === void 0 ? void 0 : _a.components))
                return null;
            const typeName = propType.replace("cc.", "");
            const comp = nodeInfo.data.components.find((c) => c.type === typeName);
            return (comp === null || comp === void 0 ? void 0 : comp.uuid) || null;
        }
        catch (_e) {
            return null;
        }
    }
    async sceneScript(method, args) {
        return Editor.Message.request("scene", "execute-scene-script", {
            name: EXT_NAME,
            method,
            args,
        });
    }
}
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBdUM7QUFDdkMsb0NBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRCw4Q0FBcUQ7QUFFckQsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUM7QUFFckMsTUFBYSxjQUFjO0lBQTNCO1FBQ2EsaUJBQVksR0FBRyxXQUFXLENBQUM7SUF5c0J4QyxDQUFDO0lBdnNCRyxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxlQUFlO2dCQUNyQixXQUFXLEVBQUUsMkZBQTJGO2dCQUN4RyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRTt3QkFDbEQsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0NBQXdDLEVBQUU7cUJBQzNGO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7aUJBQ3RDO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsaUNBQWlDO2dCQUM5QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRTt3QkFDbEQsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0NBQWdDLEVBQUU7cUJBQ25GO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7aUJBQ3RDO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVB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LE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDVixPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYyxFQUFFLElBQVc7UUFDakQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxNQUFNO1lBQ04sSUFBSTtTQUNQLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQTFzQkQsd0NBMHNCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgb2ssIGVyciB9IGZyb20gXCIuLi90b29sLWJhc2VcIjtcclxuaW1wb3J0IHsgcGFyc2VNYXliZUpzb24gfSBmcm9tIFwiLi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZU5vZGVVdWlkIH0gZnJvbSBcIi4uL25vZGUtcmVzb2x2ZVwiO1xyXG5pbXBvcnQgeyB0YWtlRWRpdG9yU2NyZWVuc2hvdCB9IGZyb20gXCIuLi9zY3JlZW5zaG90XCI7XHJcblxyXG5jb25zdCBFWFRfTkFNRSA9IFwiY29jb3MtY3JlYXRvci1tY3BcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRUb29scyBpbXBsZW1lbnRzIFRvb2xDYXRlZ29yeSB7XHJcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcImNvbXBvbmVudFwiO1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X2FkZFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQWRkIGEgY29tcG9uZW50IHRvIGEgbm9kZS4gVXNlIGNjLlhYWCBmb3JtYXQgKGUuZy4gJ2NjLkxhYmVsJywgJ2NjLlNwcml0ZScsICdjYy5CdXR0b24nKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wb25lbnQgY2xhc3MgbmFtZSAoZS5nLiAnY2MuTGFiZWwnKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widXVpZFwiLCBcImNvbXBvbmVudFR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9yZW1vdmVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlbW92ZSBhIGNvbXBvbmVudCBmcm9tIGEgbm9kZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wb25lbnQgY2xhc3MgbmFtZSB0byByZW1vdmVcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInV1aWRcIiwgXCJjb21wb25lbnRUeXBlXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJjb21wb25lbnRfZ2V0X2NvbXBvbmVudHNcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBhbGwgY29tcG9uZW50cyBvbiBhIG5vZGUgd2l0aCB0aGVpciBwcm9wZXJ0aWVzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQgKGVpdGhlciB1dWlkIG9yIG5vZGVOYW1lIHJlcXVpcmVkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgbmFtZSB0byBmaW5kIChhbHRlcm5hdGl2ZSB0byB1dWlkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X3NldF9wcm9wZXJ0eVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2V0IG9uZSBvciBtb3JlIHByb3BlcnRpZXMgb24gYSBjb21wb25lbnQuIEZvciBzaW5nbGU6IHVzZSBwcm9wZXJ0eSt2YWx1ZS4gRm9yIGJhdGNoOiB1c2UgcHJvcGVydGllcyBhcnJheS4gVXNlIG5vZGVOYW1lIGluc3RlYWQgb2YgdXVpZCB0byBmaW5kIG5vZGUgYnkgbmFtZS4gU2V0IHNjcmVlbnNob3Q9dHJ1ZSB0byBjYXB0dXJlIGVkaXRvciBzY3JlZW5zaG90IGFmdGVyIGNoYW5nZXMuIEV4YW1wbGVzOiBMYWJlbC5zdHJpbmcsIExhYmVsLmZvbnRTaXplLCBTcHJpdGUuY29sb3IsIFVJVHJhbnNmb3JtLmNvbnRlbnRTaXplLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQgKGVpdGhlciB1dWlkIG9yIG5vZGVOYW1lIHJlcXVpcmVkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgbmFtZSB0byBmaW5kIChhbHRlcm5hdGl2ZSB0byB1dWlkIOKAlCBhdm9pZHMgVVVJRCBsb29rdXApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wb25lbnQgY2xhc3MgbmFtZSAoZS5nLiAnY2MuTGFiZWwnKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByb3BlcnR5IG5hbWUgKHNpbmdsZSBtb2RlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiBcIlZhbHVlIHRvIHNldCAoc2luZ2xlIG1vZGUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQmF0Y2ggbW9kZTogYXJyYXkgb2Yge3Byb3BlcnR5LCB2YWx1ZX0gb2JqZWN0cyB0byBzZXQgbXVsdGlwbGUgcHJvcGVydGllcyBhdCBvbmNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSBuYW1lXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246IFwiVmFsdWUgdG8gc2V0XCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJwcm9wZXJ0eVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuc2hvdDogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgY2FwdHVyZSBlZGl0b3Igc2NyZWVuc2hvdCBhZnRlciBzZXR0aW5nIHByb3BlcnRpZXMgYW5kIHJldHVybiB0aGUgZmlsZSBwYXRoIChkZWZhdWx0OiBmYWxzZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImNvbXBvbmVudFR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9nZXRfaW5mb1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2V0IGRldGFpbGVkIGR1bXAgb2YgYSBzcGVjaWZpYyBjb21wb25lbnQgYnkgaXRzIFVVSUQuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRVdWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkNvbXBvbmVudCBVVUlEIChub3Qgbm9kZSBVVUlEKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiY29tcG9uZW50VXVpZFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X2dldF9hdmFpbGFibGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxpc3QgYWxsIGF2YWlsYWJsZSBjb21wb25lbnQgY2xhc3NlcyB0aGF0IGNhbiBiZSBhZGRlZCB0byBub2Rlcy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X2F1dG9fYmluZFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQXV0b21hdGljYWxseSBiaW5kIEBwcm9wZXJ0eSByZWZlcmVuY2VzIGJ5IG1hdGNoaW5nIHByb3BlcnR5IG5hbWVzIHRvIGRlc2NlbmRhbnQgbm9kZSBuYW1lcy4gU2VhcmNoZXMgb25seSBkZXNjZW5kYW50cyBvZiB0aGUgdGFyZ2V0IG5vZGUuIFZhbGlkYXRlcyBjb21wb25lbnQgdHlwZSBleGlzdGVuY2UuIFN1cHBvcnRzIGFycmF5IHByb3BlcnRpZXMgKFNsb3RfMCwgU2xvdF8xLi4uKS4gTW9kZTogJ2Z1enp5JyAoZGVmYXVsdCkgdHJpZXMgZXhhY3QgbWF0Y2ggZmlyc3QsIHRoZW4gY2FzZS1pbnNlbnNpdGl2ZTsgJ3N0cmljdCcgcmVxdWlyZXMgZXhhY3QgbWF0Y2ggb25seS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEIChlaXRoZXIgdXVpZCBvciBub2RlTmFtZSByZXF1aXJlZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIG5hbWUgdG8gZmluZCAoYWx0ZXJuYXRpdmUgdG8gdXVpZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlNjcmlwdCBjb21wb25lbnQgY2xhc3MgbmFtZSAoZS5nLiAnUXVlc3RSZWFkeVBhZ2VWaWV3JylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JjZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgcmViaW5kIGV2ZW4gYWxyZWFkeS1ib3VuZCBwcm9wZXJ0aWVzIChkZWZhdWx0OiBmYWxzZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGVudW06IFtcImZ1enp5XCIsIFwic3RyaWN0XCJdLCBkZXNjcmlwdGlvbjogXCJNYXRjaGluZyBtb2RlOiAnZnV6enknIChkZWZhdWx0KSBvciAnc3RyaWN0J1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiY29tcG9uZW50VHlwZVwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X3F1ZXJ5X2VudW1cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBlbnVtIHZhbHVlcyBmb3IgYSBjb21wb25lbnQgcHJvcGVydHkuIFVzZWZ1bCBmb3Iga25vd2luZyB3aGF0IHZhbHVlcyBMYXlvdXQudHlwZSwgTGF5b3V0LnJlc2l6ZU1vZGUsIGV0Yy4gYWNjZXB0LlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSURcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkNvbXBvbmVudCBjbGFzcyAoZS5nLiAnY2MuTGF5b3V0JylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSBuYW1lIChlLmcuICd0eXBlJywgJ3Jlc2l6ZU1vZGUnKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widXVpZFwiLCBcImNvbXBvbmVudFR5cGVcIiwgXCJwcm9wZXJ0eVwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICAvLyDjg5Hjg6njg6Hjg7zjgr/jgqjjgqTjg6rjgqLjgrk6IGNvbXBvbmVudCDihpIgY29tcG9uZW50VHlwZVxyXG4gICAgICAgIGNvbnN0IGNvbXBUeXBlID0gYXJncy5jb21wb25lbnRUeXBlIHx8IGFyZ3MuY29tcG9uZW50O1xyXG5cclxuICAgICAgICAvLyBub2RlTmFtZSDihpIgdXVpZCDop6PmsbrvvIjlr77lv5zjg4Tjg7zjg6vjga7jgb/vvIlcclxuICAgICAgICBjb25zdCBuZWVkc1Jlc29sdmUgPSBbXCJjb21wb25lbnRfc2V0X3Byb3BlcnR5XCIsIFwiY29tcG9uZW50X2dldF9jb21wb25lbnRzXCIsIFwiY29tcG9uZW50X2F1dG9fYmluZFwiXTtcclxuICAgICAgICBpZiAobmVlZHNSZXNvbHZlLmluY2x1ZGVzKHRvb2xOYW1lKSAmJiAhYXJncy51dWlkICYmIGFyZ3Mubm9kZU5hbWUpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgcmVzb2x2ZU5vZGVVdWlkKHsgbm9kZU5hbWU6IGFyZ3Mubm9kZU5hbWUgfSk7XHJcbiAgICAgICAgICAgICAgICBhcmdzLnV1aWQgPSByZXNvbHZlZC51dWlkO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9hZGRcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZENvbXBvbmVudChhcmdzLnV1aWQsIGNvbXBUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9yZW1vdmVcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUNvbXBvbmVudChhcmdzLnV1aWQsIGNvbXBUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9nZXRfY29tcG9uZW50c1wiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29tcG9uZW50cyhhcmdzLnV1aWQpO1xyXG4gICAgICAgICAgICBjYXNlIFwiY29tcG9uZW50X3NldF9wcm9wZXJ0eVwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gcGFyc2VNYXliZUpzb24oYXJncy5wcm9wZXJ0aWVzKTtcclxuICAgICAgICAgICAgICAgIGxldCByZXN1bHQ6IFRvb2xSZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcyAmJiBBcnJheS5pc0FycmF5KHByb3BlcnRpZXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gcHJvcGVydGllcy5tYXAoKHA6IGFueSkgPT4gKHsgLi4ucCwgdmFsdWU6IHBhcnNlTWF5YmVKc29uKHAudmFsdWUpIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnNldFByb3BlcnRpZXMoYXJncy51dWlkLCBjb21wVHlwZSwgcGFyc2VkKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5zZXRQcm9wZXJ0eShhcmdzLnV1aWQsIGNvbXBUeXBlLCBhcmdzLnByb3BlcnR5LCBwYXJzZU1heWJlSnNvbihhcmdzLnZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBzY3JlZW5zaG90IOOCquODl+OCt+ODp+ODs1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3Muc2NyZWVuc2hvdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNzID0gYXdhaXQgdGFrZUVkaXRvclNjcmVlbnNob3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuc2NyZWVuc2hvdCA9IHsgcGF0aDogc3MucGF0aCwgc2l6ZTogc3Muc2F2ZWRTaXplIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvayhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChzc0VycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOOCueOCr+OCt+ODp+WkseaVl+OBl+OBpuOCguODl+ODreODkeODhuOCo+ioreWumue1kOaenOOBr+i/lOOBmVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXN1bHQuY29udGVudFswXS50ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5zY3JlZW5zaG90RXJyb3IgPSBzc0Vyci5tZXNzYWdlIHx8IFN0cmluZyhzc0Vycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvayhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfZ2V0X2luZm9cIjoge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktY29tcG9uZW50XCIsIGFyZ3MuY29tcG9uZW50VXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcG9uZW50OiBkdW1wIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7IHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7IH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwiY29tcG9uZW50X2dldF9hdmFpbGFibGVcIjoge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGFzc2VzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktY2xhc3Nlc1wiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBjbGFzc2VzIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7IHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7IH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwiY29tcG9uZW50X2F1dG9fYmluZFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXV0b0JpbmQoYXJncy51dWlkLCBjb21wVHlwZSwgYXJncy5mb3JjZSA/PyBmYWxzZSwgYXJncy5tb2RlID8/IFwiZnV6enlcIik7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfcXVlcnlfZW51bVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlFbnVtKGFyZ3MudXVpZCwgY29tcFR5cGUsIGFyZ3MucHJvcGVydHkpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudCh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJhZGRDb21wb25lbnRUb05vZGVcIiwgW3V1aWQsIGNvbXBvbmVudFR5cGVdKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlFbnVtKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEdW1wID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktbm9kZVwiLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUR1bXApIHJldHVybiBlcnIoXCJOb2RlIG5vdCBmb3VuZFwiKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZUR1bXAuX19jb21wc19fIHx8IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgY29tcHMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcC50eXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFjb21wVHlwZSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAvLyBNYXRjaCBieSBjYy5YWFggZm9ybWF0XHJcbiAgICAgICAgICAgICAgICBjb25zdCBub3JtYWxpemVkVHlwZSA9IGNvbXBvbmVudFR5cGUuc3RhcnRzV2l0aChcImNjLlwiKSA/IGNvbXBvbmVudFR5cGUuc3Vic3RyaW5nKDMpIDogY29tcG9uZW50VHlwZTtcclxuICAgICAgICAgICAgICAgIGlmIChjb21wVHlwZSAhPT0gYGNjLiR7bm9ybWFsaXplZFR5cGV9YCAmJiBjb21wVHlwZSAhPT0gY29tcG9uZW50VHlwZSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcER1bXAgPSBjb21wLnZhbHVlPy5bcHJvcGVydHldO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9wRHVtcCkgcmV0dXJuIGVycihgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBub3QgZm91bmQgb24gJHtjb21wb25lbnRUeXBlfWApO1xyXG4gICAgICAgICAgICAgICAgaWYgKHByb3BEdW1wLnR5cGUgIT09IFwiRW51bVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgcHJvcGVydHksIHR5cGU6IHByb3BEdW1wLnR5cGUsIG5vdGU6IFwiTm90IGFuIGVudW0gcHJvcGVydHlcIiwgY3VycmVudFZhbHVlOiBwcm9wRHVtcC52YWx1ZSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSxcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWU6IHByb3BEdW1wLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1MaXN0OiBwcm9wRHVtcC5lbnVtTGlzdCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVtb3ZlQ29tcG9uZW50KHV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInJlbW92ZUNvbXBvbmVudEZyb21Ob2RlXCIsIFt1dWlkLCBjb21wb25lbnRUeXBlXSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldENvbXBvbmVudHModXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFt1dWlkXSk7XHJcbiAgICAgICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiByZXN1bHQuZGF0YT8ubmFtZSxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IHJlc3VsdC5kYXRhPy5jb21wb25lbnRzIHx8IFtdLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcHJvcGVydHkg5ZCN44Go44OO44O844OJ5ZCN44KS6Ieq5YuV44Oe44OD44OB44Oz44Kw44GX44Gm44OQ44Kk44Oz44OJ44GZ44KL44CCXHJcbiAgICAgKlxyXG4gICAgICogLSDmpJzntKLjgrnjgrPjg7zjg5c6IOWvvuixoeODjuODvOODieOBruWtkOWtq+OBruOBv1xyXG4gICAgICogLSDopIfmlbDjg5Ljg4Pjg4jmmYI6IOmajuWxpOOBrua1heOBhOODjuODvOODie+8iOebtOaOpeOBruWtkO+8ieOCkuWEquWFiFxyXG4gICAgICogLSDlnovmpJzoqLw6IENvbXBvbmVudCDlj4Lnhaflnovjga7loLTlkIjjgIHoqbLlvZPjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7lrZjlnKjjgpLnorroqo1cclxuICAgICAqIC0g6YWN5YiX5a++5b+cOiBAcHJvcGVydHkoW05vZGVdKSDihpIg6YCj55Wq44OO44O844OJ5ZCNIChTbG90c18wLCBTbG90c18xLi4uKVxyXG4gICAgICogLSBtb2RlOlxyXG4gICAgICogICAtIFwiZnV6enlcIiAoZGVmYXVsdCk6IOWujOWFqOS4gOiHtCDihpIgY2FzZS1pbnNlbnNpdGl2ZSDihpIgbm90X2ZvdW5kK+WAmeijnFxyXG4gICAgICogICAtIFwic3RyaWN0XCI6IOWujOWFqOS4gOiHtOOBruOBvyDihpIgbm90X2ZvdW5kK+WAmeijnFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGF1dG9CaW5kKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgZm9yY2U6IGJvb2xlYW4sIG1vZGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEdW1wID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktbm9kZVwiLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUR1bXApIHJldHVybiBlcnIoXCJOb2RlIG5vdCBmb3VuZFwiKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZUR1bXAuX19jb21wc19fIHx8IFtdO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wTmFtZSA9IGNvbXBvbmVudFR5cGUucmVwbGFjZShcImNjLlwiLCBcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgY29tcEluZGV4ID0gY29tcHMuZmluZEluZGV4KChjOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBjLnR5cGUgfHwgXCJcIjtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wTmFtZSB8fCB0ID09PSBgY2MuJHtjb21wTmFtZX1gO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKGNvbXBJbmRleCA8IDApIHJldHVybiBlcnIoYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCk7XHJcblxyXG4gICAgICAgICAgICAvLyDlrZDlravjg47jg7zjg4nkuIDopqfjgpLkuIDmi6zlj5blvpfvvIjmpJzntKLlirnnjofljJbvvIlcclxuICAgICAgICAgICAgY29uc3QgYWxsRGVzY2VuZGFudHMgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0QWxsRGVzY2VuZGFudHNcIiwgW25vZGVVdWlkXSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc2NlbmRhbnRMaXN0OiBBcnJheTx7dXVpZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRlcHRoOiBudW1iZXJ9PiA9XHJcbiAgICAgICAgICAgICAgICBhbGxEZXNjZW5kYW50cz8uc3VjY2VzcyA/IGFsbERlc2NlbmRhbnRzLmRhdGEgOiBbXTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBEdW1wID0gY29tcHNbY29tcEluZGV4XTtcclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IGNvbXBEdW1wLnZhbHVlIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25zdCBza2lwS2V5cyA9IG5ldyBTZXQoW1widXVpZFwiLCBcIm5hbWVcIiwgXCJlbmFibGVkXCIsIFwibm9kZVwiLCBcIl9fc2NyaXB0QXNzZXRcIiwgXCJfX3ByZWZhYlwiLCBcIl9uYW1lXCIsIFwiX29iakZsYWdzXCIsIFwiX2VuYWJsZWRcIl0pO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3Byb3BOYW1lLCBwcm9wRHVtcFJhd10gb2YgT2JqZWN0LmVudHJpZXMocHJvcGVydGllcykpIHtcclxuICAgICAgICAgICAgICAgIGlmIChza2lwS2V5cy5oYXMocHJvcE5hbWUpIHx8IHByb3BOYW1lLnN0YXJ0c1dpdGgoXCJfXCIpKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wRHVtcCA9IHByb3BEdW1wUmF3IGFzIGFueTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BUeXBlID0gcHJvcER1bXAudHlwZSBhcyBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXByb3BUeXBlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBleHRlbmRzQXJyID0gKHByb3BEdW1wLmV4dGVuZHMgfHwgW10pIGFzIHN0cmluZ1tdO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIOmFjeWIl+Wei+OBruWIpOWumlxyXG4gICAgICAgICAgICAgICAgY29uc3QgaXNBcnJheSA9IHByb3BUeXBlID09PSBcIkFycmF5XCIgfHwgQXJyYXkuaXNBcnJheShwcm9wRHVtcC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5UmVzdWx0ID0gYXdhaXQgdGhpcy5hdXRvQmluZEFycmF5KG5vZGVVdWlkLCBjb21wSW5kZXgsIHByb3BOYW1lLCBwcm9wRHVtcCwgZGVzY2VuZGFudExpc3QsIG1vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChhcnJheVJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgaXNOb2RlUmVmID0gcHJvcFR5cGUgPT09IFwiY2MuTm9kZVwiO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXNDb21wb25lbnRSZWYgPSBleHRlbmRzQXJyLmluY2x1ZGVzKFwiY2MuQ29tcG9uZW50XCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpc05vZGVSZWYgJiYgIWlzQ29tcG9uZW50UmVmKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDml6Ljgavjg5DjgqTjg7Pjg4nmuIjjgb/jgarjgonjgrnjgq3jg4Pjg5dcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IHByb3BEdW1wLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFmb3JjZSAmJiBjdXJyZW50VmFsdWU/LnV1aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eTogcHJvcE5hbWUsIHN0YXR1czogXCJhbHJlYWR5X2JvdW5kXCIgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g5ZCN5YmN44Oe44OD44OBOiDlrozlhajkuIDoh7Qg4oaSIGZ1enp55pmC44GvIGNhc2UtaW5zZW5zaXRpdmVcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5maW5kTWF0Y2hpbmdOb2RlKHByb3BOYW1lLCBkZXNjZW5kYW50TGlzdCwgbW9kZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoUmVzdWx0ICYmIGlzQ29tcG9uZW50UmVmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5Z6L5qSc6Ki8OiDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNDb21wID0gYXdhaXQgdGhpcy5ub2RlSGFzQ29tcG9uZW50KG1hdGNoUmVzdWx0LnV1aWQsIHByb3BUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc0NvbXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IHByb3BOYW1lLCB0eXBlOiBwcm9wVHlwZSwgc3RhdHVzOiBcInR5cGVfbWlzbWF0Y2hcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBtYXRjaFJlc3VsdC5uYW1lLCBtZXNzYWdlOiBgTm9kZSBcIiR7bWF0Y2hSZXN1bHQubmFtZX1cIiBoYXMgbm8gJHtwcm9wVHlwZX0gY29tcG9uZW50YCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2hSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlgJnoo5zjgrXjgrjjgqfjgrnjg4hcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWdnZXN0aW9ucyA9IHRoaXMuZ2V0U3VnZ2VzdGlvbnMocHJvcE5hbWUsIGRlc2NlbmRhbnRMaXN0KTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eTogcHJvcE5hbWUsIHR5cGU6IHByb3BUeXBlLCBzdGF0dXM6IFwibm90X2ZvdW5kXCIsIHN1Z2dlc3Rpb25zIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BOYW1lfWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gYXdhaXQgdGhpcy5idWlsZER1bXBXaXRoVHlwZUluZm8obm9kZVV1aWQsIHBhdGgsIG1hdGNoUmVzdWx0LnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0UmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFtub2RlVXVpZCwgcGF0aCwgZHVtcF0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gbWF0Y2hSZXN1bHQuZXhhY3QgPyBcImJvdW5kXCIgOiBcImZ1enp5X2JvdW5kXCI7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eTogcHJvcE5hbWUsIHN0YXR1cywgbm9kZU5hbWU6IG1hdGNoUmVzdWx0Lm5hbWUsIHN1Y2Nlc3M6IHNldFJlc3VsdD8uc3VjY2VzcyAhPT0gZmFsc2UgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJvdW5kQ291bnQgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSBcImJvdW5kXCIgfHwgci5zdGF0dXMgPT09IFwiZnV6enlfYm91bmRcIikubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBmdXp6eUNvdW50ID0gcmVzdWx0cy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gXCJmdXp6eV9ib3VuZFwiKS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vdEZvdW5kQ291bnQgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSBcIm5vdF9mb3VuZFwiKS5sZW5ndGg7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGJvdW5kQ291bnQsIGZ1enp5Q291bnQsIG5vdEZvdW5kQ291bnQsIHJlc3VsdHMgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5a2Q5a2r44Oq44K544OI44GL44KJ44OX44Ot44OR44OG44Kj5ZCN44Gr44Oe44OD44OB44GZ44KL44OO44O844OJ44KS5qSc57Si44CCXHJcbiAgICAgKiDlrozlhajkuIDoh7TjgpLlhKrlhYjjgIFmdXp6eSDjg6Ljg7zjg4njgafjga8gY2FzZS1pbnNlbnNpdGl2ZSDjgoLjg5Xjgqnjg7zjg6vjg5Djg4Pjgq/jgIJcclxuICAgICAqIOikh+aVsOODkuODg+ODiOaZguOBr+majuWxpOOBrua1heOBhO+8iGRlcHRoIOOBjOWwj+OBleOBhO+8ieOCguOBruOCkuWEquWFiOOAglxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGZpbmRNYXRjaGluZ05vZGUoXHJcbiAgICAgICAgcHJvcE5hbWU6IHN0cmluZywgZGVzY2VuZGFudHM6IEFycmF5PHt1dWlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGVwdGg6IG51bWJlcn0+LCBtb2RlOiBzdHJpbmdcclxuICAgICk6IHsgdXVpZDogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IGV4YWN0OiBib29sZWFuIH0gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gdGhpcy5wcm9wZXJ0eU5hbWVUb05vZGVOYW1lcyhwcm9wTmFtZSk7XHJcblxyXG4gICAgICAgIC8vIDEuIOWujOWFqOS4gOiHtFxyXG4gICAgICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGRlc2NlbmRhbnRzXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGQgPT4gZC5uYW1lID09PSBjYW5kaWRhdGUpXHJcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5kZXB0aCAtIGIuZGVwdGgpO1xyXG4gICAgICAgICAgICBpZiAobWF0Y2hlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBtYXRjaGVzWzBdLnV1aWQsIG5hbWU6IG1hdGNoZXNbMF0ubmFtZSwgZXhhY3Q6IHRydWUgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gZnV6enk6IGNhc2UtaW5zZW5zaXRpdmVcclxuICAgICAgICBpZiAobW9kZSA9PT0gXCJmdXp6eVwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvd2VyQ2FuZGlkYXRlcyA9IGNhbmRpZGF0ZXMubWFwKGMgPT4gYy50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGRlc2NlbmRhbnRzXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGQgPT4gbG93ZXJDYW5kaWRhdGVzLmluY2x1ZGVzKGQubmFtZS50b0xvd2VyQ2FzZSgpKSlcclxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmRlcHRoIC0gYi5kZXB0aCk7XHJcbiAgICAgICAgICAgIGlmIChtYXRjaGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IG1hdGNoZXNbMF0udXVpZCwgbmFtZTogbWF0Y2hlc1swXS5uYW1lLCBleGFjdDogZmFsc2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBub3RfZm91bmQg5pmC44Gr5Ly844Gf5ZCN5YmN44Gu44OO44O844OJ44KS44K144K444Kn44K544OI44GZ44KL44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgZ2V0U3VnZ2VzdGlvbnMocHJvcE5hbWU6IHN0cmluZywgZGVzY2VuZGFudHM6IEFycmF5PHt1dWlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGVwdGg6IG51bWJlcn0+KTogc3RyaW5nW10ge1xyXG4gICAgICAgIGNvbnN0IGxvd2VyID0gcHJvcE5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICByZXR1cm4gZGVzY2VuZGFudHNcclxuICAgICAgICAgICAgLmZpbHRlcihkID0+IGQubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyKSB8fCBsb3dlci5pbmNsdWRlcyhkLm5hbWUudG9Mb3dlckNhc2UoKSkpXHJcbiAgICAgICAgICAgIC5tYXAoZCA9PiBkLm5hbWUpXHJcbiAgICAgICAgICAgIC5zbGljZSgwLCA1KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOODjuODvOODieOBq+aMh+WumuWei+OBruOCs+ODs+ODneODvOODjeODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+eiuuiqjeOAglxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIG5vZGVIYXNDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgcHJvcFR5cGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIGNvbnN0IHR5cGVOYW1lID0gcHJvcFR5cGUucmVwbGFjZShcImNjLlwiLCBcIlwiKTtcclxuICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFtub2RlVXVpZF0pO1xyXG4gICAgICAgIGlmICghaW5mbz8uc3VjY2VzcyB8fCAhaW5mbz8uZGF0YT8uY29tcG9uZW50cykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBpbmZvLmRhdGEuY29tcG9uZW50cy5zb21lKChjOiBhbnkpID0+IGMudHlwZSA9PT0gdHlwZU5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog6YWN5YiXIEBwcm9wZXJ0eSDjga7oh6rli5Xjg5DjgqTjg7Pjg4njgIJcclxuICAgICAqIOODl+ODreODkeODhuOCo+WQjSBcInNsb3RzXCIg4oaSIFwiU2xvdHNfMFwiLCBcIlNsb3RzXzFcIiwgLi4uIOOBrumAo+eVquODjuODvOODieOCkuaknOe0ouOAglxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGF1dG9CaW5kQXJyYXkoXHJcbiAgICAgICAgbm9kZVV1aWQ6IHN0cmluZywgY29tcEluZGV4OiBudW1iZXIsIHByb3BOYW1lOiBzdHJpbmcsIHByb3BEdW1wOiBhbnksXHJcbiAgICAgICAgZGVzY2VuZGFudHM6IEFycmF5PHt1dWlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGVwdGg6IG51bWJlcn0+LCBtb2RlOiBzdHJpbmdcclxuICAgICk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgY29uc3QgZWxlbWVudFR5cGUgPSBwcm9wRHVtcC52YWx1ZT8uWzBdPy50eXBlIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoIWVsZW1lbnRUeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHByb3BlcnR5OiBwcm9wTmFtZSwgc3RhdHVzOiBcInNraXBcIiwgcmVhc29uOiBcImVtcHR5IGFycmF5IG9yIHVua25vd24gZWxlbWVudCB0eXBlXCIgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhc2NhbCA9IHByb3BOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvcE5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgY29uc3QgZm91bmRFbGVtZW50czogYW55W10gPSBbXTtcclxuICAgICAgICBsZXQgaW5kZXggPSAwO1xyXG5cclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBjYW5kaWRhdGVOYW1lID0gYCR7cGFzY2FsfV8ke2luZGV4fWA7XHJcbiAgICAgICAgICAgIC8vIOWujOWFqOS4gOiHtCBvciBjYXNlLWluc2Vuc2l0aXZlXHJcbiAgICAgICAgICAgIGxldCBtYXRjaCA9IGRlc2NlbmRhbnRzLmZpbmQoZCA9PiBkLm5hbWUgPT09IGNhbmRpZGF0ZU5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoIW1hdGNoICYmIG1vZGUgPT09IFwiZnV6enlcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbG93ZXIgPSBjYW5kaWRhdGVOYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICBtYXRjaCA9IGRlc2NlbmRhbnRzLmZpbmQoZCA9PiBkLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbG93ZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZWxlbWVudFBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BOYW1lfS4ke2luZGV4fWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGR1bXAgPSBhd2FpdCB0aGlzLmJ1aWxkRHVtcFdpdGhUeXBlSW5mbyhub2RlVXVpZCwgZWxlbWVudFBhdGgsIG1hdGNoLnV1aWQpO1xyXG4gICAgICAgICAgICBjb25zdCBzZXRSZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW25vZGVVdWlkLCBlbGVtZW50UGF0aCwgZHVtcF0pO1xyXG4gICAgICAgICAgICBjb25zdCBleGFjdCA9IG1hdGNoLm5hbWUgPT09IGNhbmRpZGF0ZU5hbWU7XHJcbiAgICAgICAgICAgIGZvdW5kRWxlbWVudHMucHVzaCh7IGluZGV4LCBub2RlTmFtZTogbWF0Y2gubmFtZSwgZXhhY3QsIHN1Y2Nlc3M6IHNldFJlc3VsdD8uc3VjY2VzcyAhPT0gZmFsc2UgfSk7XHJcbiAgICAgICAgICAgIGluZGV4Kys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZm91bmRFbGVtZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgcHJvcGVydHk6IHByb3BOYW1lLCBzdGF0dXM6IFwibm90X2ZvdW5kXCIsIHR5cGU6IFwiQXJyYXlcIiwgY2FuZGlkYXRlczogW2Ake3Bhc2NhbH1fMGAsIGAke3Bhc2NhbH1fMWAsIFwiLi4uXCJdIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGhhc0Z1enp5ID0gZm91bmRFbGVtZW50cy5zb21lKGUgPT4gIWUuZXhhY3QpO1xyXG4gICAgICAgIHJldHVybiB7IHByb3BlcnR5OiBwcm9wTmFtZSwgc3RhdHVzOiBoYXNGdXp6eSA/IFwiZnV6enlfYm91bmRcIiA6IFwiYm91bmRcIiwgdHlwZTogXCJBcnJheVwiLCBjb3VudDogZm91bmRFbGVtZW50cy5sZW5ndGgsIGVsZW1lbnRzOiBmb3VuZEVsZW1lbnRzIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjYW1lbENhc2Ug44OX44Ot44OR44OG44Kj5ZCN44GL44KJ44OO44O844OJ5ZCN44Gu5YCZ6KOc44KS55Sf5oiQ44CCXHJcbiAgICAgKiBjbG9zZUJ1dHRvbiDihpIgW1wiQ2xvc2VCdXR0b25cIiwgXCJjbG9zZUJ1dHRvblwiXVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHByb3BlcnR5TmFtZVRvTm9kZU5hbWVzKHByb3BOYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICAgICAgY29uc3QgcGFzY2FsID0gcHJvcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwcm9wTmFtZS5zbGljZSgxKTtcclxuICAgICAgICBjb25zdCBuYW1lcyA9IFtwYXNjYWxdO1xyXG4gICAgICAgIGlmIChwYXNjYWwgIT09IHByb3BOYW1lKSBuYW1lcy5wdXNoKHByb3BOYW1lKTtcclxuICAgICAgICByZXR1cm4gbmFtZXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wZXJ0eSh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIOOCs+ODs+ODneODvOODjeODs+ODiOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuWPluW+l1xyXG4gICAgICAgICAgICBjb25zdCBub2RlSW5mbyA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXROb2RlSW5mb1wiLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVJbmZvPy5zdWNjZXNzIHx8ICFub2RlSW5mbz8uZGF0YT8uY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgTm9kZSAke3V1aWR9IG5vdCBmb3VuZCBvciBoYXMgbm8gY29tcG9uZW50c2ApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBOYW1lID0gY29tcG9uZW50VHlwZS5yZXBsYWNlKFwiY2MuXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBub2RlSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZEluZGV4KChjOiBhbnkpID0+IGMudHlwZSA9PT0gY29tcE5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoY29tcEluZGV4IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGUgJHt1dWlkfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBzY2VuZTpzZXQtcHJvcGVydHkg44Gn44OX44Ot44OR44OG44Kj5aSJ5pu077yIUHJlZmFi5L+d5a2Y5pmC44Gr44KC5Y+N5pig44GV44KM44KL77yJXHJcbiAgICAgICAgICAgIC8vIOODkeOCueW9ouW8jzogX19jb21wc19fLntpbmRleH0ue3Byb3BlcnR5fVxyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtwcm9wZXJ0eX1gO1xyXG5cclxuICAgICAgICAgICAgLy8g44OX44Ot44OR44OG44Kj44Gu5Z6L5oOF5aCx44KScXVlcnktbm9kZeOBi+OCieWPluW+l+OBl+OBpuOAgemBqeWIh+OBqmR1bXDlvaLlvI/jgpLmp4vnr4lcclxuICAgICAgICAgICAgY29uc3QgZHVtcCA9IGF3YWl0IHRoaXMuYnVpbGREdW1wV2l0aFR5cGVJbmZvKHV1aWQsIHBhdGgsIHZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXRQcm9wZXJ0eVZpYUVkaXRvclwiLCBbdXVpZCwgcGF0aCwgZHVtcF0pO1xyXG5cclxuICAgICAgICAgICAgLy8gY2MuV2lkZ2V0IOOBriBpc0FsaWduKiDoqK3lrprlvozjga8gX2FsaWduRmxhZ3Mg44KS5YaN6KiI566X44GZ44KLXHJcbiAgICAgICAgICAgIC8vIChFZGl0b3Ig44GMIGlzQWxpZ24qIOWkieabtOaZguOBqyBfYWxpZ25GbGFncyDjgpLoh6rli5Xmm7TmlrDjgZfjgarjgYTjg5DjgrDjga7lr77lh6YpXHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRUeXBlID09PSBcImNjLldpZGdldFwiICYmIHByb3BlcnR5LnN0YXJ0c1dpdGgoXCJpc0FsaWduXCIpKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlY2FsY1dpZGdldEFsaWduRmxhZ3ModXVpZCwgY29tcEluZGV4KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgcGF0aCwgZHVtcCwgcmVzdWx0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnRpZXModXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IEFycmF5PHtwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55fT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFR5cGUpIHJldHVybiBlcnIoXCJjb21wb25lbnRUeXBlIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICBpZiAoIXByb3BlcnRpZXMubGVuZ3RoKSByZXR1cm4gZXJyKFwicHJvcGVydGllcyBhcnJheSBpcyBlbXB0eVwiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOOCs+ODs+ODneODvOODjeODs+ODiOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuWPluW+l++8iDHlm57jgaDjgZHvvIlcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW3V1aWRdKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlSW5mbz8uc3VjY2VzcyB8fCAhbm9kZUluZm8/LmRhdGE/LmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYE5vZGUgJHt1dWlkfSBub3QgZm91bmQgb3IgaGFzIG5vIGNvbXBvbmVudHNgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBjb21wTmFtZSA9IGNvbXBvbmVudFR5cGUucmVwbGFjZShcImNjLlwiLCBcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgY29tcEluZGV4ID0gbm9kZUluZm8uZGF0YS5jb21wb25lbnRzLmZpbmRJbmRleCgoYzogYW55KSA9PiBjLnR5cGUgPT09IGNvbXBOYW1lKTtcclxuICAgICAgICAgICAgaWYgKGNvbXBJbmRleCA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlICR7dXVpZH1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCB7IHByb3BlcnR5LCB2YWx1ZSB9IG9mIHByb3BlcnRpZXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BlcnR5fWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gYXdhaXQgdGhpcy5idWlsZER1bXBXaXRoVHlwZUluZm8odXVpZCwgcGF0aCwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFt1dWlkLCBwYXRoLCBkdW1wXSk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eSwgc3VjY2VzczogcmVzdWx0Py5zdWNjZXNzICE9PSBmYWxzZSwgcGF0aCB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYWxsT2sgPSByZXN1bHRzLmV2ZXJ5KHIgPT4gci5zdWNjZXNzKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNjLldpZGdldCDjga4gaXNBbGlnbiog6Kit5a6a5b6M44GvIF9hbGlnbkZsYWdzIOOCkuWGjeioiOeul+OBmeOCi1xyXG4gICAgICAgICAgICAvLyAoRWRpdG9yIOOBjCBpc0FsaWduKiDlpInmm7TmmYLjgasgX2FsaWduRmxhZ3Mg44KS6Ieq5YuV5pu05paw44GX44Gq44GE44OQ44Kw44Gu5a++5YemKVxyXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50VHlwZSA9PT0gXCJjYy5XaWRnZXRcIiAmJiBwcm9wZXJ0aWVzLnNvbWUocCA9PiBwLnByb3BlcnR5LnN0YXJ0c1dpdGgoXCJpc0FsaWduXCIpKSkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWNhbGNXaWRnZXRBbGlnbkZsYWdzKHV1aWQsIGNvbXBJbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IGFsbE9rLCByZXN1bHRzIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNjLldpZGdldCDjga4gaXNBbGlnbiog44OX44Ot44OR44OG44Kj54++5Zyo5YCk44GL44KJIF9hbGlnbkZsYWdzIOODk+ODg+ODiOODnuOCueOCr+OCkuWGjeioiOeul+OBl+OBpuioreWumuOBmeOCi+OAglxyXG4gICAgICpcclxuICAgICAqIENvY29zQ3JlYXRvciBFZGl0b3Ig44GvIGlzQWxpZ24qIOOCkiBzZXRQcm9wZXJ0eVZpYUVkaXRvciDjgaflpInmm7TjgZfjgabjgoJcclxuICAgICAqIF9hbGlnbkZsYWdzIOOCkuiHquWLleabtOaWsOOBl+OBquOBhOODkOOCsOOBjOOBguOCi+OAguOBk+OBruODmOODq+ODkeODvOOBp+aYjuekuueahOOBq+WQjOacn+OBmeOCi+OAglxyXG4gICAgICpcclxuICAgICAqIF9hbGlnbkZsYWdzIOODk+ODg+ODiOWumue+qTpcclxuICAgICAqICAgaXNBbGlnbkxlZnQ9MSwgaXNBbGlnblJpZ2h0PTIsIGlzQWxpZ25Ub3A9NCwgaXNBbGlnbkJvdHRvbT04LFxyXG4gICAgICogICBpc0FsaWduSG9yaXpvbnRhbENlbnRlcj0xNiwgaXNBbGlnblZlcnRpY2FsQ2VudGVyPTMyXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgcmVjYWxjV2lkZ2V0QWxpZ25GbGFncyh1dWlkOiBzdHJpbmcsIHdJZHg6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGNvbnN0IEFMSUdOX0JJVFM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgICAgICAgICAgIGlzQWxpZ25MZWZ0OiAxLCBpc0FsaWduUmlnaHQ6IDIsIGlzQWxpZ25Ub3A6IDQsIGlzQWxpZ25Cb3R0b206IDgsXHJcbiAgICAgICAgICAgIGlzQWxpZ25Ib3Jpem9udGFsQ2VudGVyOiAxNiwgaXNBbGlnblZlcnRpY2FsQ2VudGVyOiAzMixcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEdW1wID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktbm9kZVwiLCB1dWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRHVtcCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCB3Q29tcER1bXAgPSBub2RlRHVtcC5fX2NvbXBzX18/Llt3SWR4XTtcclxuICAgICAgICAgICAgaWYgKCF3Q29tcER1bXApIHJldHVybjtcclxuICAgICAgICAgICAgbGV0IGFsaWduRmxhZ3MgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIGJpdF0gb2YgT2JqZWN0LmVudHJpZXMoQUxJR05fQklUUykpIHtcclxuICAgICAgICAgICAgICAgIGlmICh3Q29tcER1bXAudmFsdWU/LltrZXldPy52YWx1ZSA9PT0gdHJ1ZSkgYWxpZ25GbGFncyB8PSBiaXQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHt3SWR4fS5fYWxpZ25GbGFnc2A7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXRQcm9wZXJ0eVZpYUVkaXRvclwiLCBbdXVpZCwgcGF0aCwgeyB2YWx1ZTogYWxpZ25GbGFncywgdHlwZTogXCJOdW1iZXJcIiB9XSk7XHJcbiAgICAgICAgfSBjYXRjaCAoX2UpIHtcclxuICAgICAgICAgICAgLy8gX2FsaWduRmxhZ3Mg5YaN6KiI566X44Gu5aSx5pWX44Gv6Ie05ZG955qE44Gn44Gq44GE44Gf44KB54Sh6KaWXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog44OX44Ot44OR44OG44Kj44Gu5Z6L5oOF5aCx44KSRWRpdG9yIEFQSeOBi+OCieWPluW+l+OBl+OAgemBqeWIh+OBqmR1bXDlvaLlvI/jgpLmp4vnr4njgZnjgovjgIJcclxuICAgICAqXHJcbiAgICAgKiBVVUlE5paH5a2X5YiX44GM5rih44GV44KM44Gf5aC05ZCI44CB44OX44Ot44OR44OG44Kj44Gu5Z6L44Gr5b+c44GY44GmOlxyXG4gICAgICogLSBOb2RlL0NvbXBvbmVudOWPgueFp+WeiyDihpIge3R5cGU6IHByb3BUeXBlLCB2YWx1ZToge3V1aWQ6IG5vZGVVdWlkfX1cclxuICAgICAqIC0gQXNzZXTlj4LnhaflnovvvIhjYy5QcmVmYWLnrYnvvIkg4oaSIHt0eXBlOiBwcm9wVHlwZSwgdmFsdWU6IHt1dWlkOiBhc3NldFV1aWR9fVxyXG4gICAgICogLSBTdHJpbmflnosg4oaSIHt2YWx1ZSwgdHlwZTogXCJTdHJpbmdcIn1cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZER1bXBXaXRoVHlwZUluZm8obm9kZVV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICAvLyDjg5fjg6rjg5/jg4bjgqPjg5blnovjga/jgZ3jga7jgb7jgb5cclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4geyB2YWx1ZSwgdHlwZTogXCJOdW1iZXJcIiB9O1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiKSByZXR1cm4geyB2YWx1ZSwgdHlwZTogXCJCb29sZWFuXCIgfTtcclxuXHJcbiAgICAgICAgLy8gdjIuMC4wOiB7cGF0aDogXCJkYjovLy4uLlwifSAvIHtndWlkOiBcIi4uLlwifSDjgqrjg5bjgrjjgqfjgq/jg4jlvaLlvI8g4oCUIEFzc2V0IOWPgueFp+OCkiBwYXRoL2d1aWQg44Gn5rih44GZ5pa55rOVXHJcbiAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZS5wYXRoID09PSBcInN0cmluZ1wiICYmIHZhbHVlLnBhdGguc3RhcnRzV2l0aChcImRiOi8vXCIpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZFV1aWQgPSBhd2FpdCB0aGlzLnJlc29sdmVBc3NldFV1aWRCeVBhdGgodmFsdWUucGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc29sdmVkVXVpZCkgdGhyb3cgbmV3IEVycm9yKGBBc3NldCBub3QgZm91bmQgYXQgcGF0aDogJHt2YWx1ZS5wYXRofWApO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZS50eXBlID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdmFsdWUudHlwZSwgdmFsdWU6IHsgdXVpZDogcmVzb2x2ZWRVdWlkIH0gfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzb2x2ZWRVdWlkOyAvLyDku6XpmY3jgIHmloflrZfliJfjgajjgZfjgablnovop6PmsbrntYzot6/jgbhcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUuZ3VpZCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZS50eXBlID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdmFsdWUudHlwZSwgdmFsdWU6IHsgdXVpZDogdmFsdWUuZ3VpZCB9IH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmd1aWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOOCquODluOCuOOCp+OCr+ODiOW9ouW8jyB7dXVpZDogXCJ4eHhcIiwgdHlwZTogXCJjYy5Ob2RlXCJ9IOOBr+OBneOBruOBvuOBvlxyXG4gICAgICAgIC8vIHR5cGUg5oyH5a6a44Gq44GX44GuIHt1dWlkOiBcInh4eFwifSDjga/jg5fjg63jg5Hjg4bjgqPjga7lrp/pmpvjga7lnovjgpLop6PmsbrjgZnjgovjgZ/jgoHmloflrZfliJfmibHjgYTjgavlpInmj5vjgZnjgotcclxuICAgICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZS51dWlkID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUudHlwZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdmFsdWUudHlwZSwgdmFsdWU6IHsgdXVpZDogdmFsdWUudXVpZCB9IH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gdHlwZSDmnKrmjIflrpo6IOaWh+Wtl+WIl+OBqOOBl+OBpuWHpueQhuOBl+OBpuODl+ODreODkeODhuOCo+Wei+OBi+OCieino+axulxyXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnV1aWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBAcGF0aDog44OX44Os44OV44Kj44OD44Kv44K544Gu5aC05ZCIOiDjg5HjgrnjgYvjgonjg47jg7zjg4lVVUlE44KS6Kej5rG6XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZS5zdGFydHNXaXRoKFwiQHBhdGg6XCIpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVQYXRoID0gdmFsdWUuc2xpY2UoNik7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJmaW5kTm9kZUJ5UGF0aFwiLCBbbm9kZVBhdGhdKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdD8uc3VjY2VzcyAmJiByZXN1bHQuZGF0YT8udXVpZCkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSByZXN1bHQuZGF0YS51dWlkO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb2RlIG5vdCBmb3VuZCBhdCBwYXRoOiAke25vZGVQYXRofWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB2Mi4wLjA6IGRiOi8vIOWni+OBvuOCiuOBruaWh+Wtl+WIl+OBryBBc3NldCBwYXRoIOOBqOOBl+OBpiBVVUlEIOOBq+iHquWLleino+axulxyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgdmFsdWUuc3RhcnRzV2l0aChcImRiOi8vXCIpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkVXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZEJ5UGF0aCh2YWx1ZSk7XHJcbiAgICAgICAgICAgIGlmICghcmVzb2x2ZWRVdWlkKSB0aHJvdyBuZXcgRXJyb3IoYEFzc2V0IG5vdCBmb3VuZCBhdCBwYXRoOiAke3ZhbHVlfWApO1xyXG4gICAgICAgICAgICB2YWx1ZSA9IHJlc29sdmVkVXVpZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOaWh+Wtl+WIl+OBruWgtOWQiDog44OX44Ot44OR44OG44Kj44Gu5Z6L5oOF5aCx44KS5Y+W5b6X44GX44Gm5Yik5a6aXHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZUR1bXAgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ub2RlXCIsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlRHVtcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BEdW1wID0gdGhpcy5yZXNvbHZlRHVtcFBhdGgobm9kZUR1bXAsIHBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wRHVtcD8udHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wVHlwZSA9IHByb3BEdW1wLnR5cGUgYXMgc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRlbmRzQXJyID0gKHByb3BEdW1wLmV4dGVuZHMgfHwgW10pIGFzIHN0cmluZ1tdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NvbXBvbmVudFJlZiA9IGV4dGVuZHNBcnIuaW5jbHVkZXMoXCJjYy5Db21wb25lbnRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzTm9kZVJlZiA9IHByb3BUeXBlID09PSBcImNjLk5vZGVcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNBc3NldFJlZiA9IGV4dGVuZHNBcnIuaW5jbHVkZXMoXCJjYy5Bc3NldFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbXBvbmVudFJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g44Kz44Oz44Od44O844ON44Oz44OI5Y+C54WnOiDjg47jg7zjg4lVVUlE44GL44KJ44Kz44Oz44Od44O844ON44Oz44OIVVVJROOCkuino+axulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFV1aWQgPSBhd2FpdCB0aGlzLnJlc29sdmVDb21wb25lbnRVdWlkKHZhbHVlLCBwcm9wVHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBwcm9wVHlwZSwgdmFsdWU6IHsgdXVpZDogY29tcFV1aWQgfHwgdmFsdWUgfSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVSZWYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHByb3BUeXBlLCB2YWx1ZTogeyB1dWlkOiB2YWx1ZSB9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXNzZXRSZWYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHByb3BUeXBlLCB2YWx1ZTogeyB1dWlkOiB2YWx1ZSB9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBxdWVyeS1ub2Rl5aSx5pWX5pmC44Gv44OV44Kp44O844Or44OQ44OD44KvXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUsIHR5cGU6IFwiU3RyaW5nXCIgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOOBneOBruS7luOBruOCquODluOCuOOCp+OCr+ODiO+8iGNvbnRlbnRTaXplLCBjb2xvcuetieOBruani+mAoOS9k++8iVxyXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdyYXBwZWQ6IGFueSA9IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHdyYXBwZWRba10gPSB7IHZhbHVlOiB2IH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHdyYXBwZWQgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHZhbHVlIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBxdWVyeS1ub2Rl44GuZHVtcOOBi+OCieODieODg+ODiOODkeOCueOBp+ODl+ODreODkeODhuOCo+OCkuino+axuuOBmeOCi+OAglxyXG4gICAgICog5L6LOiBcIl9fY29tcHNfXy4yLnNjcm9sbFZpZXdcIiDihpIgbm9kZUR1bXAuX19jb21wc19fWzJdLnZhbHVlLnNjcm9sbFZpZXdcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSByZXNvbHZlRHVtcFBhdGgobm9kZUR1bXA6IGFueSwgcGF0aDogc3RyaW5nKTogYW55IHtcclxuICAgICAgICBjb25zdCBwYXJ0cyA9IHBhdGguc3BsaXQoXCIuXCIpO1xyXG4gICAgICAgIGxldCBjdXJyZW50ID0gbm9kZUR1bXA7XHJcbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRzKSB7XHJcbiAgICAgICAgICAgIGlmICghY3VycmVudCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChwYXJ0ID09PSBcIl9fY29tcHNfX1wiKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5fX2NvbXBzX187XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoL15cXGQrJC8udGVzdChwYXJ0KSkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFyc2VJbnQocGFydCldPy52YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50Py5bcGFydF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBc3NldCBwYXRoIChkYjovLy4uLikg44GL44KJIGFzc2V0IFVVSUQg44KS6Kej5rG644GZ44KL44CC44K144OW44Ki44K744OD44OI5oyH5a6aIChAc3ByaXRlRnJhbWUg562JKVxyXG4gICAgICog44KC44Gd44Gu44G+44G+IHF1ZXJ5LXV1aWQg44Gr5oqV44GS44KL44CC5aSx5pWX5pmC44GvIG51bGwg44KS6L+U44GZ44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUFzc2V0VXVpZEJ5UGF0aChhc3NldFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYXNzZXQtZGJcIiwgXCJxdWVyeS11dWlkXCIsIGFzc2V0UGF0aCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdXVpZCA9PT0gXCJzdHJpbmdcIiAmJiB1dWlkLmxlbmd0aCA+IDApIHJldHVybiB1dWlkO1xyXG4gICAgICAgIH0gY2F0Y2ggKF9lKSB7IC8qIGZhbGx0aHJvdWdoICovIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOODjuODvOODiVVVSUTjgYvjgonjgrPjg7Pjg53jg7zjg43jg7Pjg4hVVUlE44KS6Kej5rG644GZ44KL44CCXHJcbiAgICAgKiBwcm9wVHlwZe+8iOS+izogXCJjYy5TY3JvbGxWaWV3XCIsIFwiTWlzc2lvbkxpc3RQYW5lbFwi77yJ44Gr5LiA6Ie044GZ44KL44Kz44Oz44Od44O844ON44Oz44OI44KS5o6i44GZ44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUNvbXBvbmVudFV1aWQobm9kZVV1aWQ6IHN0cmluZywgcHJvcFR5cGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFtub2RlVXVpZF0pO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVJbmZvPy5zdWNjZXNzIHx8ICFub2RlSW5mbz8uZGF0YT8uY29tcG9uZW50cykgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IHR5cGVOYW1lID0gcHJvcFR5cGUucmVwbGFjZShcImNjLlwiLCBcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGVJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjOiBhbnkpID0+IGMudHlwZSA9PT0gdHlwZU5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gY29tcD8udXVpZCB8fCBudWxsO1xyXG4gICAgICAgIH0gY2F0Y2ggKF9lKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNjZW5lU2NyaXB0KG1ldGhvZDogc3RyaW5nLCBhcmdzOiBhbnlbXSk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgcmV0dXJuIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgbmFtZTogRVhUX05BTUUsXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgYXJncyxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=