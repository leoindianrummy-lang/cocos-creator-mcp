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
        var _a, _b;
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
                        // v2.0.0: Enum 名 → 数値変換 (Layout.type="HORIZONTAL" 等)
                        if (propType === "Enum" && Array.isArray(propDump.enumList)) {
                            const item = propDump.enumList.find((e) => (e === null || e === void 0 ? void 0 : e.name) === value);
                            if (item && typeof item.value === "number") {
                                return { value: item.value, type: "Enum" };
                            }
                            // 名前で見つからない場合は数値として解釈を試みる (後方互換)
                            const asNum = Number(value);
                            if (!Number.isNaN(asNum))
                                return { value: asNum, type: "Enum" };
                            throw new Error(`Enum value "${value}" not found in enumList: ${propDump.enumList.map((e) => e === null || e === void 0 ? void 0 : e.name).join(", ")}`);
                        }
                    }
                }
            }
            catch (e) {
                // Enum で名前不一致は明示的に throw する (上で throw した場合)
                if ((_b = e === null || e === void 0 ? void 0 : e.message) === null || _b === void 0 ? void 0 : _b.startsWith("Enum value "))
                    throw e;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBdUM7QUFDdkMsb0NBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRCw4Q0FBcUQ7QUFFckQsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUM7QUFFckMsTUFBYSxjQUFjO0lBQTNCO1FBQ2EsaUJBQVksR0FBRyxXQUFXLENBQUM7SUFzdEJ4QyxDQUFDO0lBcHRCRyxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxlQUFlO2dCQUNyQixXQUFXLEVBQUUsMkZBQTJGO2dCQUN4RyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRTt3QkFDbEQsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0NBQXdDLEVBQUU7cUJBQzNGO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7aUJBQ3RDO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsaUNBQWlDO2dCQUM5QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRTt3QkFDbEQsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0NBQWdDLEVBQUU7cUJBQ25GO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7aUJBQ3RDO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVB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Q0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQWMsRUFBRSxJQUFXO1FBQ2pELE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFO1lBQzNELElBQUksRUFBRSxRQUFRO1lBQ2QsTUFBTTtZQUNOLElBQUk7U0FDUCxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUF2dEJELHdDQXV0QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sQ2F0ZWdvcnksIFRvb2xEZWZpbml0aW9uLCBUb29sUmVzdWx0IH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IG9rLCBlcnIgfSBmcm9tIFwiLi4vdG9vbC1iYXNlXCI7XHJcbmltcG9ydCB7IHBhcnNlTWF5YmVKc29uIH0gZnJvbSBcIi4uL3V0aWxzXCI7XHJcbmltcG9ydCB7IHJlc29sdmVOb2RlVXVpZCB9IGZyb20gXCIuLi9ub2RlLXJlc29sdmVcIjtcclxuaW1wb3J0IHsgdGFrZUVkaXRvclNjcmVlbnNob3QgfSBmcm9tIFwiLi4vc2NyZWVuc2hvdFwiO1xyXG5cclxuY29uc3QgRVhUX05BTUUgPSBcImNvY29zLWNyZWF0b3ItbWNwXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50VG9vbHMgaW1wbGVtZW50cyBUb29sQ2F0ZWdvcnkge1xyXG4gICAgcmVhZG9ubHkgY2F0ZWdvcnlOYW1lID0gXCJjb21wb25lbnRcIjtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9hZGRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkFkZCBhIGNvbXBvbmVudCB0byBhIG5vZGUuIFVzZSBjYy5YWFggZm9ybWF0IChlLmcuICdjYy5MYWJlbCcsICdjYy5TcHJpdGUnLCAnY2MuQnV0dG9uJykuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGNsYXNzIG5hbWUgKGUuZy4gJ2NjLkxhYmVsJylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInV1aWRcIiwgXCJjb21wb25lbnRUeXBlXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJjb21wb25lbnRfcmVtb3ZlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZW1vdmUgYSBjb21wb25lbnQgZnJvbSBhIG5vZGUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGNsYXNzIG5hbWUgdG8gcmVtb3ZlXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1dWlkXCIsIFwiY29tcG9uZW50VHlwZVwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X2dldF9jb21wb25lbnRzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgYWxsIGNvbXBvbmVudHMgb24gYSBub2RlIHdpdGggdGhlaXIgcHJvcGVydGllcy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEIChlaXRoZXIgdXVpZCBvciBub2RlTmFtZSByZXF1aXJlZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIG5hbWUgdG8gZmluZCAoYWx0ZXJuYXRpdmUgdG8gdXVpZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9zZXRfcHJvcGVydHlcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNldCBvbmUgb3IgbW9yZSBwcm9wZXJ0aWVzIG9uIGEgY29tcG9uZW50LiBGb3Igc2luZ2xlOiB1c2UgcHJvcGVydHkrdmFsdWUuIEZvciBiYXRjaDogdXNlIHByb3BlcnRpZXMgYXJyYXkuIFVzZSBub2RlTmFtZSBpbnN0ZWFkIG9mIHV1aWQgdG8gZmluZCBub2RlIGJ5IG5hbWUuIFNldCBzY3JlZW5zaG90PXRydWUgdG8gY2FwdHVyZSBlZGl0b3Igc2NyZWVuc2hvdCBhZnRlciBjaGFuZ2VzLiBFeGFtcGxlczogTGFiZWwuc3RyaW5nLCBMYWJlbC5mb250U2l6ZSwgU3ByaXRlLmNvbG9yLCBVSVRyYW5zZm9ybS5jb250ZW50U2l6ZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEIChlaXRoZXIgdXVpZCBvciBub2RlTmFtZSByZXF1aXJlZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIG5hbWUgdG8gZmluZCAoYWx0ZXJuYXRpdmUgdG8gdXVpZCDigJQgYXZvaWRzIFVVSUQgbG9va3VwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGNsYXNzIG5hbWUgKGUuZy4gJ2NjLkxhYmVsJylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSBuYW1lIChzaW5nbGUgbW9kZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogXCJWYWx1ZSB0byBzZXQgKHNpbmdsZSBtb2RlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkJhdGNoIG1vZGU6IGFycmF5IG9mIHtwcm9wZXJ0eSwgdmFsdWV9IG9iamVjdHMgdG8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXMgYXQgb25jZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiUHJvcGVydHkgbmFtZVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiBcIlZhbHVlIHRvIHNldFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wicHJvcGVydHlcIiwgXCJ2YWx1ZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbnNob3Q6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIGNhcHR1cmUgZWRpdG9yIHNjcmVlbnNob3QgYWZ0ZXIgc2V0dGluZyBwcm9wZXJ0aWVzIGFuZCByZXR1cm4gdGhlIGZpbGUgcGF0aCAoZGVmYXVsdDogZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJjb21wb25lbnRUeXBlXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJjb21wb25lbnRfZ2V0X2luZm9cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBkZXRhaWxlZCBkdW1wIG9mIGEgc3BlY2lmaWMgY29tcG9uZW50IGJ5IGl0cyBVVUlELlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wb25lbnQgVVVJRCAobm90IG5vZGUgVVVJRClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImNvbXBvbmVudFV1aWRcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9nZXRfYXZhaWxhYmxlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMaXN0IGFsbCBhdmFpbGFibGUgY29tcG9uZW50IGNsYXNzZXMgdGhhdCBjYW4gYmUgYWRkZWQgdG8gbm9kZXMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9hdXRvX2JpbmRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkF1dG9tYXRpY2FsbHkgYmluZCBAcHJvcGVydHkgcmVmZXJlbmNlcyBieSBtYXRjaGluZyBwcm9wZXJ0eSBuYW1lcyB0byBkZXNjZW5kYW50IG5vZGUgbmFtZXMuIFNlYXJjaGVzIG9ubHkgZGVzY2VuZGFudHMgb2YgdGhlIHRhcmdldCBub2RlLiBWYWxpZGF0ZXMgY29tcG9uZW50IHR5cGUgZXhpc3RlbmNlLiBTdXBwb3J0cyBhcnJheSBwcm9wZXJ0aWVzIChTbG90XzAsIFNsb3RfMS4uLikuIE1vZGU6ICdmdXp6eScgKGRlZmF1bHQpIHRyaWVzIGV4YWN0IG1hdGNoIGZpcnN0LCB0aGVuIGNhc2UtaW5zZW5zaXRpdmU7ICdzdHJpY3QnIHJlcXVpcmVzIGV4YWN0IG1hdGNoIG9ubHkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRCAoZWl0aGVyIHV1aWQgb3Igbm9kZU5hbWUgcmVxdWlyZWQpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBuYW1lIHRvIGZpbmQgKGFsdGVybmF0aXZlIHRvIHV1aWQpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTY3JpcHQgY29tcG9uZW50IGNsYXNzIG5hbWUgKGUuZy4gJ1F1ZXN0UmVhZHlQYWdlVmlldycpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yY2U6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIHJlYmluZCBldmVuIGFscmVhZHktYm91bmQgcHJvcGVydGllcyAoZGVmYXVsdDogZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogeyB0eXBlOiBcInN0cmluZ1wiLCBlbnVtOiBbXCJmdXp6eVwiLCBcInN0cmljdFwiXSwgZGVzY3JpcHRpb246IFwiTWF0Y2hpbmcgbW9kZTogJ2Z1enp5JyAoZGVmYXVsdCkgb3IgJ3N0cmljdCdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImNvbXBvbmVudFR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9xdWVyeV9lbnVtXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgZW51bSB2YWx1ZXMgZm9yIGEgY29tcG9uZW50IHByb3BlcnR5LiBVc2VmdWwgZm9yIGtub3dpbmcgd2hhdCB2YWx1ZXMgTGF5b3V0LnR5cGUsIExheW91dC5yZXNpemVNb2RlLCBldGMuIGFjY2VwdC5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wb25lbnQgY2xhc3MgKGUuZy4gJ2NjLkxheW91dCcpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiUHJvcGVydHkgbmFtZSAoZS5nLiAndHlwZScsICdyZXNpemVNb2RlJylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInV1aWRcIiwgXCJjb21wb25lbnRUeXBlXCIsIFwicHJvcGVydHlcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgLy8g44OR44Op44Oh44O844K/44Ko44Kk44Oq44Ki44K5OiBjb21wb25lbnQg4oaSIGNvbXBvbmVudFR5cGVcclxuICAgICAgICBjb25zdCBjb21wVHlwZSA9IGFyZ3MuY29tcG9uZW50VHlwZSB8fCBhcmdzLmNvbXBvbmVudDtcclxuXHJcbiAgICAgICAgLy8gbm9kZU5hbWUg4oaSIHV1aWQg6Kej5rG677yI5a++5b+c44OE44O844Or44Gu44G/77yJXHJcbiAgICAgICAgY29uc3QgbmVlZHNSZXNvbHZlID0gW1wiY29tcG9uZW50X3NldF9wcm9wZXJ0eVwiLCBcImNvbXBvbmVudF9nZXRfY29tcG9uZW50c1wiLCBcImNvbXBvbmVudF9hdXRvX2JpbmRcIl07XHJcbiAgICAgICAgaWYgKG5lZWRzUmVzb2x2ZS5pbmNsdWRlcyh0b29sTmFtZSkgJiYgIWFyZ3MudXVpZCAmJiBhcmdzLm5vZGVOYW1lKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IHJlc29sdmVOb2RlVXVpZCh7IG5vZGVOYW1lOiBhcmdzLm5vZGVOYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgYXJncy51dWlkID0gcmVzb2x2ZWQudXVpZDtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfYWRkXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hZGRDb21wb25lbnQoYXJncy51dWlkLCBjb21wVHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfcmVtb3ZlXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVDb21wb25lbnQoYXJncy51dWlkLCBjb21wVHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfZ2V0X2NvbXBvbmVudHNcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbXBvbmVudHMoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9zZXRfcHJvcGVydHlcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHBhcnNlTWF5YmVKc29uKGFyZ3MucHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0OiBUb29sUmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMgJiYgQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHByb3BlcnRpZXMubWFwKChwOiBhbnkpID0+ICh7IC4uLnAsIHZhbHVlOiBwYXJzZU1heWJlSnNvbihwLnZhbHVlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5zZXRQcm9wZXJ0aWVzKGFyZ3MudXVpZCwgY29tcFR5cGUsIHBhcnNlZCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuc2V0UHJvcGVydHkoYXJncy51dWlkLCBjb21wVHlwZSwgYXJncy5wcm9wZXJ0eSwgcGFyc2VNYXliZUpzb24oYXJncy52YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gc2NyZWVuc2hvdCDjgqrjg5fjgrfjg6fjg7NcclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLnNjcmVlbnNob3QpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcyA9IGF3YWl0IHRha2VFZGl0b3JTY3JlZW5zaG90KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJlc3VsdC5jb250ZW50WzBdLnRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnNjcmVlbnNob3QgPSB7IHBhdGg6IHNzLnBhdGgsIHNpemU6IHNzLnNhdmVkU2l6ZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoc3NFcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDjgrnjgq/jgrfjg6flpLHmlZfjgZfjgabjgoLjg5fjg63jg5Hjg4bjgqPoqK3lrprntZDmnpzjga/ov5TjgZlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuc2NyZWVuc2hvdEVycm9yID0gc3NFcnIubWVzc2FnZSB8fCBTdHJpbmcoc3NFcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwiY29tcG9uZW50X2dldF9pbmZvXCI6IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWNvbXBvbmVudFwiLCBhcmdzLmNvbXBvbmVudFV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGNvbXBvbmVudDogZHVtcCB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkgeyByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpOyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9nZXRfYXZhaWxhYmxlXCI6IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xhc3NlcyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWNsYXNzZXNcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY2xhc3NlcyB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkgeyByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpOyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9hdXRvX2JpbmRcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmF1dG9CaW5kKGFyZ3MudXVpZCwgY29tcFR5cGUsIGFyZ3MuZm9yY2UgPz8gZmFsc2UsIGFyZ3MubW9kZSA/PyBcImZ1enp5XCIpO1xyXG4gICAgICAgICAgICBjYXNlIFwiY29tcG9uZW50X3F1ZXJ5X2VudW1cIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5RW51bShhcmdzLnV1aWQsIGNvbXBUeXBlLCBhcmdzLnByb3BlcnR5KTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDb21wb25lbnQodXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiYWRkQ29tcG9uZW50VG9Ob2RlXCIsIFt1dWlkLCBjb21wb25lbnRUeXBlXSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RW51bShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGVcIiwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEdW1wKSByZXR1cm4gZXJyKFwiTm9kZSBub3QgZm91bmRcIik7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEdW1wLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGNvbXAudHlwZTtcclxuICAgICAgICAgICAgICAgIGlmICghY29tcFR5cGUpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggYnkgY2MuWFhYIGZvcm1hdFxyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFR5cGUgPSBjb21wb25lbnRUeXBlLnN0YXJ0c1dpdGgoXCJjYy5cIikgPyBjb21wb25lbnRUeXBlLnN1YnN0cmluZygzKSA6IGNvbXBvbmVudFR5cGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoY29tcFR5cGUgIT09IGBjYy4ke25vcm1hbGl6ZWRUeXBlfWAgJiYgY29tcFR5cGUgIT09IGNvbXBvbmVudFR5cGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BEdW1wID0gY29tcC52YWx1ZT8uW3Byb3BlcnR5XTtcclxuICAgICAgICAgICAgICAgIGlmICghcHJvcER1bXApIHJldHVybiBlcnIoYFByb3BlcnR5ICcke3Byb3BlcnR5fScgbm90IGZvdW5kIG9uICR7Y29tcG9uZW50VHlwZX1gKTtcclxuICAgICAgICAgICAgICAgIGlmIChwcm9wRHVtcC50eXBlICE9PSBcIkVudW1cIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHByb3BlcnR5LCB0eXBlOiBwcm9wRHVtcC50eXBlLCBub3RlOiBcIk5vdCBhbiBlbnVtIHByb3BlcnR5XCIsIGN1cnJlbnRWYWx1ZTogcHJvcER1bXAudmFsdWUgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHksXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFZhbHVlOiBwcm9wRHVtcC52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBlbnVtTGlzdDogcHJvcER1bXAuZW51bUxpc3QsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudCh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJyZW1vdmVDb21wb25lbnRGcm9tTm9kZVwiLCBbdXVpZCwgY29tcG9uZW50VHlwZV0pO1xyXG4gICAgICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnRzKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXROb2RlSW5mb1wiLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgbmFtZTogcmVzdWx0LmRhdGE/Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzOiByZXN1bHQuZGF0YT8uY29tcG9uZW50cyB8fCBbXSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHByb3BlcnR5IOWQjeOBqOODjuODvOODieWQjeOCkuiHquWLleODnuODg+ODgeODs+OCsOOBl+OBpuODkOOCpOODs+ODieOBmeOCi+OAglxyXG4gICAgICpcclxuICAgICAqIC0g5qSc57Si44K544Kz44O844OXOiDlr77osaHjg47jg7zjg4njga7lrZDlravjga7jgb9cclxuICAgICAqIC0g6KSH5pWw44OS44OD44OI5pmCOiDpmo7lsaTjga7mtYXjgYTjg47jg7zjg4nvvIjnm7TmjqXjga7lrZDvvInjgpLlhKrlhYhcclxuICAgICAqIC0g5Z6L5qSc6Ki8OiBDb21wb25lbnQg5Y+C54Wn5Z6L44Gu5aC05ZCI44CB6Kmy5b2T44Kz44Oz44Od44O844ON44Oz44OI44Gu5a2Y5Zyo44KS56K66KqNXHJcbiAgICAgKiAtIOmFjeWIl+WvvuW/nDogQHByb3BlcnR5KFtOb2RlXSkg4oaSIOmAo+eVquODjuODvOODieWQjSAoU2xvdHNfMCwgU2xvdHNfMS4uLilcclxuICAgICAqIC0gbW9kZTpcclxuICAgICAqICAgLSBcImZ1enp5XCIgKGRlZmF1bHQpOiDlrozlhajkuIDoh7Qg4oaSIGNhc2UtaW5zZW5zaXRpdmUg4oaSIG5vdF9mb3VuZCvlgJnoo5xcclxuICAgICAqICAgLSBcInN0cmljdFwiOiDlrozlhajkuIDoh7Tjga7jgb8g4oaSIG5vdF9mb3VuZCvlgJnoo5xcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBhdXRvQmluZChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIGZvcmNlOiBib29sZWFuLCBtb2RlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGVcIiwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEdW1wKSByZXR1cm4gZXJyKFwiTm9kZSBub3QgZm91bmRcIik7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEdW1wLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICAgICAgY29uc3QgY29tcE5hbWUgPSBjb21wb25lbnRUeXBlLnJlcGxhY2UoXCJjYy5cIiwgXCJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IGNvbXBzLmZpbmRJbmRleCgoYzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gYy50eXBlIHx8IFwiXCI7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdCA9PT0gY29tcE5hbWUgfHwgdCA9PT0gYGNjLiR7Y29tcE5hbWV9YDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmIChjb21wSW5kZXggPCAwKSByZXR1cm4gZXJyKGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWApO1xyXG5cclxuICAgICAgICAgICAgLy8g5a2Q5a2r44OO44O844OJ5LiA6Kan44KS5LiA5ous5Y+W5b6X77yI5qSc57Si5Yq5546H5YyW77yJXHJcbiAgICAgICAgICAgIGNvbnN0IGFsbERlc2NlbmRhbnRzID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldEFsbERlc2NlbmRhbnRzXCIsIFtub2RlVXVpZF0pO1xyXG4gICAgICAgICAgICBjb25zdCBkZXNjZW5kYW50TGlzdDogQXJyYXk8e3V1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkZXB0aDogbnVtYmVyfT4gPVxyXG4gICAgICAgICAgICAgICAgYWxsRGVzY2VuZGFudHM/LnN1Y2Nlc3MgPyBhbGxEZXNjZW5kYW50cy5kYXRhIDogW107XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wRHVtcCA9IGNvbXBzW2NvbXBJbmRleF07XHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBjb21wRHVtcC52YWx1ZSB8fCB7fTtcclxuICAgICAgICAgICAgY29uc3Qgc2tpcEtleXMgPSBuZXcgU2V0KFtcInV1aWRcIiwgXCJuYW1lXCIsIFwiZW5hYmxlZFwiLCBcIm5vZGVcIiwgXCJfX3NjcmlwdEFzc2V0XCIsIFwiX19wcmVmYWJcIiwgXCJfbmFtZVwiLCBcIl9vYmpGbGFnc1wiLCBcIl9lbmFibGVkXCJdKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtwcm9wTmFtZSwgcHJvcER1bXBSYXddIG9mIE9iamVjdC5lbnRyaWVzKHByb3BlcnRpZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2tpcEtleXMuaGFzKHByb3BOYW1lKSB8fCBwcm9wTmFtZS5zdGFydHNXaXRoKFwiX1wiKSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcER1bXAgPSBwcm9wRHVtcFJhdyBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wVHlwZSA9IHByb3BEdW1wLnR5cGUgYXMgc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9wVHlwZSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5kc0FyciA9IChwcm9wRHVtcC5leHRlbmRzIHx8IFtdKSBhcyBzdHJpbmdbXTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDphY3liJflnovjga7liKTlrppcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlzQXJyYXkgPSBwcm9wVHlwZSA9PT0gXCJBcnJheVwiIHx8IEFycmF5LmlzQXJyYXkocHJvcER1bXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnJheVJlc3VsdCA9IGF3YWl0IHRoaXMuYXV0b0JpbmRBcnJheShub2RlVXVpZCwgY29tcEluZGV4LCBwcm9wTmFtZSwgcHJvcER1bXAsIGRlc2NlbmRhbnRMaXN0LCBtb2RlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goYXJyYXlSZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGlzTm9kZVJlZiA9IHByb3BUeXBlID09PSBcImNjLk5vZGVcIjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29tcG9uZW50UmVmID0gZXh0ZW5kc0Fyci5pbmNsdWRlcyhcImNjLkNvbXBvbmVudFwiKTtcclxuICAgICAgICAgICAgICAgIGlmICghaXNOb2RlUmVmICYmICFpc0NvbXBvbmVudFJlZikgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g5pei44Gr44OQ44Kk44Oz44OJ5riI44G/44Gq44KJ44K544Kt44OD44OXXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBwcm9wRHVtcC52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmICghZm9yY2UgJiYgY3VycmVudFZhbHVlPy51dWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IHByb3BOYW1lLCBzdGF0dXM6IFwiYWxyZWFkeV9ib3VuZFwiIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIOWQjeWJjeODnuODg+ODgTog5a6M5YWo5LiA6Ie0IOKGkiBmdXp6eeaZguOBryBjYXNlLWluc2Vuc2l0aXZlXHJcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHRoaXMuZmluZE1hdGNoaW5nTm9kZShwcm9wTmFtZSwgZGVzY2VuZGFudExpc3QsIG1vZGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtYXRjaFJlc3VsdCAmJiBpc0NvbXBvbmVudFJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWei+aknOiovDog44Kz44Oz44Od44O844ON44Oz44OI44GM5a2Y5Zyo44GZ44KL44GLXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzQ29tcCA9IGF3YWl0IHRoaXMubm9kZUhhc0NvbXBvbmVudChtYXRjaFJlc3VsdC51dWlkLCBwcm9wVHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNDb21wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBwcm9wTmFtZSwgdHlwZTogcHJvcFR5cGUsIHN0YXR1czogXCJ0eXBlX21pc21hdGNoXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogbWF0Y2hSZXN1bHQubmFtZSwgbWVzc2FnZTogYE5vZGUgXCIke21hdGNoUmVzdWx0Lm5hbWV9XCIgaGFzIG5vICR7cHJvcFR5cGV9IGNvbXBvbmVudGAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5YCZ6KOc44K144K444Kn44K544OIXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VnZ2VzdGlvbnMgPSB0aGlzLmdldFN1Z2dlc3Rpb25zKHByb3BOYW1lLCBkZXNjZW5kYW50TGlzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IHByb3BOYW1lLCB0eXBlOiBwcm9wVHlwZSwgc3RhdHVzOiBcIm5vdF9mb3VuZFwiLCBzdWdnZXN0aW9ucyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtwcm9wTmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IGF3YWl0IHRoaXMuYnVpbGREdW1wV2l0aFR5cGVJbmZvKG5vZGVVdWlkLCBwYXRoLCBtYXRjaFJlc3VsdC51dWlkKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNldFJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXRQcm9wZXJ0eVZpYUVkaXRvclwiLCBbbm9kZVV1aWQsIHBhdGgsIGR1bXBdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IG1hdGNoUmVzdWx0LmV4YWN0ID8gXCJib3VuZFwiIDogXCJmdXp6eV9ib3VuZFwiO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IHByb3BOYW1lLCBzdGF0dXMsIG5vZGVOYW1lOiBtYXRjaFJlc3VsdC5uYW1lLCBzdWNjZXNzOiBzZXRSZXN1bHQ/LnN1Y2Nlc3MgIT09IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBib3VuZENvdW50ID0gcmVzdWx0cy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gXCJib3VuZFwiIHx8IHIuc3RhdHVzID09PSBcImZ1enp5X2JvdW5kXCIpLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgZnV6enlDb3VudCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09IFwiZnV6enlfYm91bmRcIikubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBub3RGb3VuZENvdW50ID0gcmVzdWx0cy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gXCJub3RfZm91bmRcIikubGVuZ3RoO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBib3VuZENvdW50LCBmdXp6eUNvdW50LCBub3RGb3VuZENvdW50LCByZXN1bHRzIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWtkOWtq+ODquOCueODiOOBi+OCieODl+ODreODkeODhuOCo+WQjeOBq+ODnuODg+ODgeOBmeOCi+ODjuODvOODieOCkuaknOe0ouOAglxyXG4gICAgICog5a6M5YWo5LiA6Ie044KS5YSq5YWI44CBZnV6enkg44Oi44O844OJ44Gn44GvIGNhc2UtaW5zZW5zaXRpdmUg44KC44OV44Kp44O844Or44OQ44OD44Kv44CCXHJcbiAgICAgKiDopIfmlbDjg5Ljg4Pjg4jmmYLjga/pmo7lsaTjga7mtYXjgYTvvIhkZXB0aCDjgYzlsI/jgZXjgYTvvInjgoLjga7jgpLlhKrlhYjjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBmaW5kTWF0Y2hpbmdOb2RlKFxyXG4gICAgICAgIHByb3BOYW1lOiBzdHJpbmcsIGRlc2NlbmRhbnRzOiBBcnJheTx7dXVpZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRlcHRoOiBudW1iZXJ9PiwgbW9kZTogc3RyaW5nXHJcbiAgICApOiB7IHV1aWQ6IHN0cmluZzsgbmFtZTogc3RyaW5nOyBleGFjdDogYm9vbGVhbiB9IHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMucHJvcGVydHlOYW1lVG9Ob2RlTmFtZXMocHJvcE5hbWUpO1xyXG5cclxuICAgICAgICAvLyAxLiDlrozlhajkuIDoh7RcclxuICAgICAgICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBkZXNjZW5kYW50c1xyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihkID0+IGQubmFtZSA9PT0gY2FuZGlkYXRlKVxyXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEuZGVwdGggLSBiLmRlcHRoKTtcclxuICAgICAgICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogbWF0Y2hlc1swXS51dWlkLCBuYW1lOiBtYXRjaGVzWzBdLm5hbWUsIGV4YWN0OiB0cnVlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDIuIGZ1enp5OiBjYXNlLWluc2Vuc2l0aXZlXHJcbiAgICAgICAgaWYgKG1vZGUgPT09IFwiZnV6enlcIikge1xyXG4gICAgICAgICAgICBjb25zdCBsb3dlckNhbmRpZGF0ZXMgPSBjYW5kaWRhdGVzLm1hcChjID0+IGMudG9Mb3dlckNhc2UoKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBkZXNjZW5kYW50c1xyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihkID0+IGxvd2VyQ2FuZGlkYXRlcy5pbmNsdWRlcyhkLm5hbWUudG9Mb3dlckNhc2UoKSkpXHJcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5kZXB0aCAtIGIuZGVwdGgpO1xyXG4gICAgICAgICAgICBpZiAobWF0Y2hlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBtYXRjaGVzWzBdLnV1aWQsIG5hbWU6IG1hdGNoZXNbMF0ubmFtZSwgZXhhY3Q6IGZhbHNlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogbm90X2ZvdW5kIOaZguOBq+S8vOOBn+WQjeWJjeOBruODjuODvOODieOCkuOCteOCuOOCp+OCueODiOOBmeOCi+OAglxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldFN1Z2dlc3Rpb25zKHByb3BOYW1lOiBzdHJpbmcsIGRlc2NlbmRhbnRzOiBBcnJheTx7dXVpZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRlcHRoOiBudW1iZXJ9Pik6IHN0cmluZ1tdIHtcclxuICAgICAgICBjb25zdCBsb3dlciA9IHByb3BOYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgcmV0dXJuIGRlc2NlbmRhbnRzXHJcbiAgICAgICAgICAgIC5maWx0ZXIoZCA9PiBkLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlcikgfHwgbG93ZXIuaW5jbHVkZXMoZC5uYW1lLnRvTG93ZXJDYXNlKCkpKVxyXG4gICAgICAgICAgICAubWFwKGQgPT4gZC5uYW1lKVxyXG4gICAgICAgICAgICAuc2xpY2UoMCwgNSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDjg47jg7zjg4njgavmjIflrprlnovjga7jgrPjg7Pjg53jg7zjg43jg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvnorroqo3jgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBub2RlSGFzQ29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIHByb3BUeXBlOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICBjb25zdCB0eXBlTmFtZSA9IHByb3BUeXBlLnJlcGxhY2UoXCJjYy5cIiwgXCJcIik7XHJcbiAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXROb2RlSW5mb1wiLCBbbm9kZVV1aWRdKTtcclxuICAgICAgICBpZiAoIWluZm8/LnN1Y2Nlc3MgfHwgIWluZm8/LmRhdGE/LmNvbXBvbmVudHMpIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4gaW5mby5kYXRhLmNvbXBvbmVudHMuc29tZSgoYzogYW55KSA9PiBjLnR5cGUgPT09IHR5cGVOYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOmFjeWIlyBAcHJvcGVydHkg44Gu6Ieq5YuV44OQ44Kk44Oz44OJ44CCXHJcbiAgICAgKiDjg5fjg63jg5Hjg4bjgqPlkI0gXCJzbG90c1wiIOKGkiBcIlNsb3RzXzBcIiwgXCJTbG90c18xXCIsIC4uLiDjga7pgKPnlarjg47jg7zjg4njgpLmpJzntKLjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBhdXRvQmluZEFycmF5KFxyXG4gICAgICAgIG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBJbmRleDogbnVtYmVyLCBwcm9wTmFtZTogc3RyaW5nLCBwcm9wRHVtcDogYW55LFxyXG4gICAgICAgIGRlc2NlbmRhbnRzOiBBcnJheTx7dXVpZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRlcHRoOiBudW1iZXJ9PiwgbW9kZTogc3RyaW5nXHJcbiAgICApOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIGNvbnN0IGVsZW1lbnRUeXBlID0gcHJvcER1bXAudmFsdWU/LlswXT8udHlwZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKCFlbGVtZW50VHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBwcm9wZXJ0eTogcHJvcE5hbWUsIHN0YXR1czogXCJza2lwXCIsIHJlYXNvbjogXCJlbXB0eSBhcnJheSBvciB1bmtub3duIGVsZW1lbnQgdHlwZVwiIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwYXNjYWwgPSBwcm9wTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHByb3BOYW1lLnNsaWNlKDEpO1xyXG4gICAgICAgIGNvbnN0IGZvdW5kRWxlbWVudHM6IGFueVtdID0gW107XHJcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcclxuXHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY29uc3QgY2FuZGlkYXRlTmFtZSA9IGAke3Bhc2NhbH1fJHtpbmRleH1gO1xyXG4gICAgICAgICAgICAvLyDlrozlhajkuIDoh7Qgb3IgY2FzZS1pbnNlbnNpdGl2ZVxyXG4gICAgICAgICAgICBsZXQgbWF0Y2ggPSBkZXNjZW5kYW50cy5maW5kKGQgPT4gZC5uYW1lID09PSBjYW5kaWRhdGVOYW1lKTtcclxuICAgICAgICAgICAgaWYgKCFtYXRjaCAmJiBtb2RlID09PSBcImZ1enp5XCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvd2VyID0gY2FuZGlkYXRlTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgbWF0Y2ggPSBkZXNjZW5kYW50cy5maW5kKGQgPT4gZC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IGxvd2VyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIW1hdGNoKSBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRQYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtwcm9wTmFtZX0uJHtpbmRleH1gO1xyXG4gICAgICAgICAgICBjb25zdCBkdW1wID0gYXdhaXQgdGhpcy5idWlsZER1bXBXaXRoVHlwZUluZm8obm9kZVV1aWQsIGVsZW1lbnRQYXRoLCBtYXRjaC51dWlkKTtcclxuICAgICAgICAgICAgY29uc3Qgc2V0UmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFtub2RlVXVpZCwgZWxlbWVudFBhdGgsIGR1bXBdKTtcclxuICAgICAgICAgICAgY29uc3QgZXhhY3QgPSBtYXRjaC5uYW1lID09PSBjYW5kaWRhdGVOYW1lO1xyXG4gICAgICAgICAgICBmb3VuZEVsZW1lbnRzLnB1c2goeyBpbmRleCwgbm9kZU5hbWU6IG1hdGNoLm5hbWUsIGV4YWN0LCBzdWNjZXNzOiBzZXRSZXN1bHQ/LnN1Y2Nlc3MgIT09IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICBpbmRleCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGZvdW5kRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHByb3BlcnR5OiBwcm9wTmFtZSwgc3RhdHVzOiBcIm5vdF9mb3VuZFwiLCB0eXBlOiBcIkFycmF5XCIsIGNhbmRpZGF0ZXM6IFtgJHtwYXNjYWx9XzBgLCBgJHtwYXNjYWx9XzFgLCBcIi4uLlwiXSB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBoYXNGdXp6eSA9IGZvdW5kRWxlbWVudHMuc29tZShlID0+ICFlLmV4YWN0KTtcclxuICAgICAgICByZXR1cm4geyBwcm9wZXJ0eTogcHJvcE5hbWUsIHN0YXR1czogaGFzRnV6enkgPyBcImZ1enp5X2JvdW5kXCIgOiBcImJvdW5kXCIsIHR5cGU6IFwiQXJyYXlcIiwgY291bnQ6IGZvdW5kRWxlbWVudHMubGVuZ3RoLCBlbGVtZW50czogZm91bmRFbGVtZW50cyB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2FtZWxDYXNlIOODl+ODreODkeODhuOCo+WQjeOBi+OCieODjuODvOODieWQjeOBruWAmeijnOOCkueUn+aIkOOAglxyXG4gICAgICogY2xvc2VCdXR0b24g4oaSIFtcIkNsb3NlQnV0dG9uXCIsIFwiY2xvc2VCdXR0b25cIl1cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBwcm9wZXJ0eU5hbWVUb05vZGVOYW1lcyhwcm9wTmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgICAgIGNvbnN0IHBhc2NhbCA9IHByb3BOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvcE5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgY29uc3QgbmFtZXMgPSBbcGFzY2FsXTtcclxuICAgICAgICBpZiAocGFzY2FsICE9PSBwcm9wTmFtZSkgbmFtZXMucHVzaChwcm9wTmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIG5hbWVzO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHkodXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLlj5blvpdcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW3V1aWRdKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlSW5mbz8uc3VjY2VzcyB8fCAhbm9kZUluZm8/LmRhdGE/LmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYE5vZGUgJHt1dWlkfSBub3QgZm91bmQgb3IgaGFzIG5vIGNvbXBvbmVudHNgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBjb21wTmFtZSA9IGNvbXBvbmVudFR5cGUucmVwbGFjZShcImNjLlwiLCBcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgY29tcEluZGV4ID0gbm9kZUluZm8uZGF0YS5jb21wb25lbnRzLmZpbmRJbmRleCgoYzogYW55KSA9PiBjLnR5cGUgPT09IGNvbXBOYW1lKTtcclxuICAgICAgICAgICAgaWYgKGNvbXBJbmRleCA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlICR7dXVpZH1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gc2NlbmU6c2V0LXByb3BlcnR5IOOBp+ODl+ODreODkeODhuOCo+WkieabtO+8iFByZWZhYuS/neWtmOaZguOBq+OCguWPjeaYoOOBleOCjOOCi++8iVxyXG4gICAgICAgICAgICAvLyDjg5HjgrnlvaLlvI86IF9fY29tcHNfXy57aW5kZXh9Lntwcm9wZXJ0eX1cclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LiR7cHJvcGVydHl9YDtcclxuXHJcbiAgICAgICAgICAgIC8vIOODl+ODreODkeODhuOCo+OBruWei+aDheWgseOCknF1ZXJ5LW5vZGXjgYvjgonlj5blvpfjgZfjgabjgIHpganliIfjgapkdW1w5b2i5byP44KS5qeL56+JXHJcbiAgICAgICAgICAgIGNvbnN0IGR1bXAgPSBhd2FpdCB0aGlzLmJ1aWxkRHVtcFdpdGhUeXBlSW5mbyh1dWlkLCBwYXRoLCB2YWx1ZSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIHBhdGgsIGR1bXBdKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNjLldpZGdldCDjga4gaXNBbGlnbiog6Kit5a6a5b6M44GvIF9hbGlnbkZsYWdzIOOCkuWGjeioiOeul+OBmeOCi1xyXG4gICAgICAgICAgICAvLyAoRWRpdG9yIOOBjCBpc0FsaWduKiDlpInmm7TmmYLjgasgX2FsaWduRmxhZ3Mg44KS6Ieq5YuV5pu05paw44GX44Gq44GE44OQ44Kw44Gu5a++5YemKVxyXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50VHlwZSA9PT0gXCJjYy5XaWRnZXRcIiAmJiBwcm9wZXJ0eS5zdGFydHNXaXRoKFwiaXNBbGlnblwiKSkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWNhbGNXaWRnZXRBbGlnbkZsYWdzKHV1aWQsIGNvbXBJbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHBhdGgsIGR1bXAsIHJlc3VsdCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wZXJ0aWVzKHV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0aWVzOiBBcnJheTx7cHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueX0+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRUeXBlKSByZXR1cm4gZXJyKFwiY29tcG9uZW50VHlwZSBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgaWYgKCFwcm9wZXJ0aWVzLmxlbmd0aCkgcmV0dXJuIGVycihcInByb3BlcnRpZXMgYXJyYXkgaXMgZW1wdHlcIik7XHJcblxyXG4gICAgICAgICAgICAvLyDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLlj5blvpfvvIgx5Zue44Gg44GR77yJXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFt1dWlkXSk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUluZm8/LnN1Y2Nlc3MgfHwgIW5vZGVJbmZvPy5kYXRhPy5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBOb2RlICR7dXVpZH0gbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgY29tcE5hbWUgPSBjb21wb25lbnRUeXBlLnJlcGxhY2UoXCJjYy5cIiwgXCJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IG5vZGVJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kSW5kZXgoKGM6IGFueSkgPT4gYy50eXBlID09PSBjb21wTmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChjb21wSW5kZXggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZSAke3V1aWR9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgeyBwcm9wZXJ0eSwgdmFsdWUgfSBvZiBwcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtwcm9wZXJ0eX1gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IGF3YWl0IHRoaXMuYnVpbGREdW1wV2l0aFR5cGVJbmZvKHV1aWQsIHBhdGgsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXRQcm9wZXJ0eVZpYUVkaXRvclwiLCBbdXVpZCwgcGF0aCwgZHVtcF0pO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHksIHN1Y2Nlc3M6IHJlc3VsdD8uc3VjY2VzcyAhPT0gZmFsc2UsIHBhdGggfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFsbE9rID0gcmVzdWx0cy5ldmVyeShyID0+IHIuc3VjY2Vzcyk7XHJcblxyXG4gICAgICAgICAgICAvLyBjYy5XaWRnZXQg44GuIGlzQWxpZ24qIOioreWumuW+jOOBryBfYWxpZ25GbGFncyDjgpLlho3oqIjnrpfjgZnjgotcclxuICAgICAgICAgICAgLy8gKEVkaXRvciDjgYwgaXNBbGlnbiog5aSJ5pu05pmC44GrIF9hbGlnbkZsYWdzIOOCkuiHquWLleabtOaWsOOBl+OBquOBhOODkOOCsOOBruWvvuWHpilcclxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgPT09IFwiY2MuV2lkZ2V0XCIgJiYgcHJvcGVydGllcy5zb21lKHAgPT4gcC5wcm9wZXJ0eS5zdGFydHNXaXRoKFwiaXNBbGlnblwiKSkpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVjYWxjV2lkZ2V0QWxpZ25GbGFncyh1dWlkLCBjb21wSW5kZXgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiBhbGxPaywgcmVzdWx0cyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjYy5XaWRnZXQg44GuIGlzQWxpZ24qIOODl+ODreODkeODhuOCo+ePvuWcqOWApOOBi+OCiSBfYWxpZ25GbGFncyDjg5Pjg4Pjg4jjg57jgrnjgq/jgpLlho3oqIjnrpfjgZfjgaboqK3lrprjgZnjgovjgIJcclxuICAgICAqXHJcbiAgICAgKiBDb2Nvc0NyZWF0b3IgRWRpdG9yIOOBryBpc0FsaWduKiDjgpIgc2V0UHJvcGVydHlWaWFFZGl0b3Ig44Gn5aSJ5pu044GX44Gm44KCXHJcbiAgICAgKiBfYWxpZ25GbGFncyDjgpLoh6rli5Xmm7TmlrDjgZfjgarjgYTjg5DjgrDjgYzjgYLjgovjgILjgZPjga7jg5jjg6vjg5Hjg7zjgafmmI7npLrnmoTjgavlkIzmnJ/jgZnjgovjgIJcclxuICAgICAqXHJcbiAgICAgKiBfYWxpZ25GbGFncyDjg5Pjg4Pjg4jlrprnvqk6XHJcbiAgICAgKiAgIGlzQWxpZ25MZWZ0PTEsIGlzQWxpZ25SaWdodD0yLCBpc0FsaWduVG9wPTQsIGlzQWxpZ25Cb3R0b209OCxcclxuICAgICAqICAgaXNBbGlnbkhvcml6b250YWxDZW50ZXI9MTYsIGlzQWxpZ25WZXJ0aWNhbENlbnRlcj0zMlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlY2FsY1dpZGdldEFsaWduRmxhZ3ModXVpZDogc3RyaW5nLCB3SWR4OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBjb25zdCBBTElHTl9CSVRTOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xyXG4gICAgICAgICAgICBpc0FsaWduTGVmdDogMSwgaXNBbGlnblJpZ2h0OiAyLCBpc0FsaWduVG9wOiA0LCBpc0FsaWduQm90dG9tOiA4LFxyXG4gICAgICAgICAgICBpc0FsaWduSG9yaXpvbnRhbENlbnRlcjogMTYsIGlzQWxpZ25WZXJ0aWNhbENlbnRlcjogMzIsXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGVcIiwgdXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUR1bXApIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgd0NvbXBEdW1wID0gbm9kZUR1bXAuX19jb21wc19fPy5bd0lkeF07XHJcbiAgICAgICAgICAgIGlmICghd0NvbXBEdW1wKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxldCBhbGlnbkZsYWdzID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBiaXRdIG9mIE9iamVjdC5lbnRyaWVzKEFMSUdOX0JJVFMpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAod0NvbXBEdW1wLnZhbHVlPy5ba2V5XT8udmFsdWUgPT09IHRydWUpIGFsaWduRmxhZ3MgfD0gYml0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7d0lkeH0uX2FsaWduRmxhZ3NgO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIHBhdGgsIHsgdmFsdWU6IGFsaWduRmxhZ3MsIHR5cGU6IFwiTnVtYmVyXCIgfV0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKF9lKSB7XHJcbiAgICAgICAgICAgIC8vIF9hbGlnbkZsYWdzIOWGjeioiOeul+OBruWkseaVl+OBr+iHtOWRveeahOOBp+OBquOBhOOBn+OCgeeEoeimllxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOODl+ODreODkeODhuOCo+OBruWei+aDheWgseOCkkVkaXRvciBBUEnjgYvjgonlj5blvpfjgZfjgIHpganliIfjgapkdW1w5b2i5byP44KS5qeL56+J44GZ44KL44CCXHJcbiAgICAgKlxyXG4gICAgICogVVVJROaWh+Wtl+WIl+OBjOa4oeOBleOCjOOBn+WgtOWQiOOAgeODl+ODreODkeODhuOCo+OBruWei+OBq+W/nOOBmOOBpjpcclxuICAgICAqIC0gTm9kZS9Db21wb25lbnTlj4Lnhaflnosg4oaSIHt0eXBlOiBwcm9wVHlwZSwgdmFsdWU6IHt1dWlkOiBub2RlVXVpZH19XHJcbiAgICAgKiAtIEFzc2V05Y+C54Wn5Z6L77yIY2MuUHJlZmFi562J77yJIOKGkiB7dHlwZTogcHJvcFR5cGUsIHZhbHVlOiB7dXVpZDogYXNzZXRVdWlkfX1cclxuICAgICAqIC0gU3RyaW5n5Z6LIOKGkiB7dmFsdWUsIHR5cGU6IFwiU3RyaW5nXCJ9XHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGREdW1wV2l0aFR5cGVJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgLy8g44OX44Oq44Of44OG44Kj44OW5Z6L44Gv44Gd44Gu44G+44G+XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHsgdmFsdWUsIHR5cGU6IFwiTnVtYmVyXCIgfTtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImJvb2xlYW5cIikgcmV0dXJuIHsgdmFsdWUsIHR5cGU6IFwiQm9vbGVhblwiIH07XHJcblxyXG4gICAgICAgIC8vIHYyLjAuMDoge3BhdGg6IFwiZGI6Ly8uLi5cIn0gLyB7Z3VpZDogXCIuLi5cIn0g44Kq44OW44K444Kn44Kv44OI5b2i5byPIOKAlCBBc3NldCDlj4LnhafjgpIgcGF0aC9ndWlkIOOBp+a4oeOBmeaWueazlVxyXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUucGF0aCA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZS5wYXRoLnN0YXJ0c1dpdGgoXCJkYjovL1wiKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkQnlQYXRoKHZhbHVlLnBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZFV1aWQpIHRocm93IG5ldyBFcnJvcihgQXNzZXQgbm90IGZvdW5kIGF0IHBhdGg6ICR7dmFsdWUucGF0aH1gKTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUudHlwZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHZhbHVlLnR5cGUsIHZhbHVlOiB7IHV1aWQ6IHJlc29sdmVkVXVpZCB9IH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHJlc29sdmVkVXVpZDsgLy8g5Lul6ZmN44CB5paH5a2X5YiX44Go44GX44Gm5Z6L6Kej5rG657WM6Lev44G4XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlLmd1aWQgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUudHlwZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHZhbHVlLnR5cGUsIHZhbHVlOiB7IHV1aWQ6IHZhbHVlLmd1aWQgfSB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5ndWlkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDjgqrjg5bjgrjjgqfjgq/jg4jlvaLlvI8ge3V1aWQ6IFwieHh4XCIsIHR5cGU6IFwiY2MuTm9kZVwifSDjga/jgZ3jga7jgb7jgb5cclxuICAgICAgICAvLyB0eXBlIOaMh+WumuOBquOBl+OBriB7dXVpZDogXCJ4eHhcIn0g44Gv44OX44Ot44OR44OG44Kj44Gu5a6f6Zqb44Gu5Z6L44KS6Kej5rG644GZ44KL44Gf44KB5paH5a2X5YiX5omx44GE44Gr5aSJ5o+b44GZ44KLXHJcbiAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUudXVpZCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlLnR5cGUgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHZhbHVlLnR5cGUsIHZhbHVlOiB7IHV1aWQ6IHZhbHVlLnV1aWQgfSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHR5cGUg5pyq5oyH5a6aOiDmloflrZfliJfjgajjgZfjgablh6bnkIbjgZfjgabjg5fjg63jg5Hjg4bjgqPlnovjgYvjgonop6PmsbpcclxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS51dWlkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQHBhdGg6IOODl+ODrOODleOCo+ODg+OCr+OCueOBruWgtOWQiDog44OR44K544GL44KJ44OO44O844OJVVVJROOCkuino+axulxyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgdmFsdWUuc3RhcnRzV2l0aChcIkBwYXRoOlwiKSkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlUGF0aCA9IHZhbHVlLnNsaWNlKDYpO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZmluZE5vZGVCeVBhdGhcIiwgW25vZGVQYXRoXSk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQ/LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGE/LnV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0LmRhdGEudXVpZDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9kZSBub3QgZm91bmQgYXQgcGF0aDogJHtub2RlUGF0aH1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdjIuMC4wOiBkYjovLyDlp4vjgb7jgorjga7mloflrZfliJfjga8gQXNzZXQgcGF0aCDjgajjgZfjgaYgVVVJRCDjgavoh6rli5Xop6PmsbpcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlLnN0YXJ0c1dpdGgoXCJkYjovL1wiKSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZFV1aWQgPSBhd2FpdCB0aGlzLnJlc29sdmVBc3NldFV1aWRCeVBhdGgodmFsdWUpO1xyXG4gICAgICAgICAgICBpZiAoIXJlc29sdmVkVXVpZCkgdGhyb3cgbmV3IEVycm9yKGBBc3NldCBub3QgZm91bmQgYXQgcGF0aDogJHt2YWx1ZX1gKTtcclxuICAgICAgICAgICAgdmFsdWUgPSByZXNvbHZlZFV1aWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDmloflrZfliJfjga7loLTlkIg6IOODl+ODreODkeODhuOCo+OBruWei+aDheWgseOCkuWPluW+l+OBl+OBpuWIpOWumlxyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEdW1wID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktbm9kZVwiLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZUR1bXApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wRHVtcCA9IHRoaXMucmVzb2x2ZUR1bXBQYXRoKG5vZGVEdW1wLCBwYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcER1bXA/LnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcFR5cGUgPSBwcm9wRHVtcC50eXBlIGFzIHN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5kc0FyciA9IChwcm9wRHVtcC5leHRlbmRzIHx8IFtdKSBhcyBzdHJpbmdbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDb21wb25lbnRSZWYgPSBleHRlbmRzQXJyLmluY2x1ZGVzKFwiY2MuQ29tcG9uZW50XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc05vZGVSZWYgPSBwcm9wVHlwZSA9PT0gXCJjYy5Ob2RlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQXNzZXRSZWYgPSBleHRlbmRzQXJyLmluY2x1ZGVzKFwiY2MuQXNzZXRcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wb25lbnRSZWYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOOCs+ODs+ODneODvOODjeODs+ODiOWPgueFpzog44OO44O844OJVVVJROOBi+OCieOCs+ODs+ODneODvOODjeODs+ODiFVVSUTjgpLop6PmsbpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQ29tcG9uZW50VXVpZCh2YWx1ZSwgcHJvcFR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcHJvcFR5cGUsIHZhbHVlOiB7IHV1aWQ6IGNvbXBVdWlkIHx8IHZhbHVlIH0gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlUmVmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBwcm9wVHlwZSwgdmFsdWU6IHsgdXVpZDogdmFsdWUgfSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0Fzc2V0UmVmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBwcm9wVHlwZSwgdmFsdWU6IHsgdXVpZDogdmFsdWUgfSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHYyLjAuMDogRW51bSDlkI0g4oaSIOaVsOWApOWkieaPmyAoTGF5b3V0LnR5cGU9XCJIT1JJWk9OVEFMXCIg562JKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcFR5cGUgPT09IFwiRW51bVwiICYmIEFycmF5LmlzQXJyYXkocHJvcER1bXAuZW51bUxpc3QpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gcHJvcER1bXAuZW51bUxpc3QuZmluZCgoZTogYW55KSA9PiBlPy5uYW1lID09PSB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiB0eXBlb2YgaXRlbS52YWx1ZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBpdGVtLnZhbHVlLCB0eXBlOiBcIkVudW1cIiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZCN5YmN44Gn6KaL44Gk44GL44KJ44Gq44GE5aC05ZCI44Gv5pWw5YCk44Go44GX44Gm6Kej6YeI44KS6Kmm44G/44KLICjlvozmlrnkupLmj5spXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhc051bSA9IE51bWJlcih2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIU51bWJlci5pc05hTihhc051bSkpIHJldHVybiB7IHZhbHVlOiBhc051bSwgdHlwZTogXCJFbnVtXCIgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRW51bSB2YWx1ZSBcIiR7dmFsdWV9XCIgbm90IGZvdW5kIGluIGVudW1MaXN0OiAke3Byb3BEdW1wLmVudW1MaXN0Lm1hcCgoZTogYW55KSA9PiBlPy5uYW1lKS5qb2luKFwiLCBcIil9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgLy8gRW51bSDjgaflkI3liY3kuI3kuIDoh7Tjga/mmI7npLrnmoTjgasgdGhyb3cg44GZ44KLICjkuIrjgacgdGhyb3cg44GX44Gf5aC05ZCIKVxyXG4gICAgICAgICAgICAgICAgaWYgKGU/Lm1lc3NhZ2U/LnN0YXJ0c1dpdGgoXCJFbnVtIHZhbHVlIFwiKSkgdGhyb3cgZTtcclxuICAgICAgICAgICAgICAgIC8vIHF1ZXJ5LW5vZGXlpLHmlZfmmYLjga/jg5Xjgqnjg7zjg6vjg5Djg4Pjgq9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZSwgdHlwZTogXCJTdHJpbmdcIiB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g44Gd44Gu5LuW44Gu44Kq44OW44K444Kn44Kv44OI77yIY29udGVudFNpemUsIGNvbG9y562J44Gu5qeL6YCg5L2T77yJXHJcbiAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgY29uc3Qgd3JhcHBlZDogYW55ID0ge307XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgd3JhcHBlZFtrXSA9IHsgdmFsdWU6IHYgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogd3JhcHBlZCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdmFsdWUgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHF1ZXJ5LW5vZGXjga5kdW1w44GL44KJ44OJ44OD44OI44OR44K544Gn44OX44Ot44OR44OG44Kj44KS6Kej5rG644GZ44KL44CCXHJcbiAgICAgKiDkvos6IFwiX19jb21wc19fLjIuc2Nyb2xsVmlld1wiIOKGkiBub2RlRHVtcC5fX2NvbXBzX19bMl0udmFsdWUuc2Nyb2xsVmlld1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHJlc29sdmVEdW1wUGF0aChub2RlRHVtcDogYW55LCBwYXRoOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IHBhcnRzID0gcGF0aC5zcGxpdChcIi5cIik7XHJcbiAgICAgICAgbGV0IGN1cnJlbnQgPSBub2RlRHVtcDtcclxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcclxuICAgICAgICAgICAgaWYgKCFjdXJyZW50KSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHBhcnQgPT09IFwiX19jb21wc19fXCIpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50Ll9fY29tcHNfXztcclxuICAgICAgICAgICAgfSBlbHNlIGlmICgvXlxcZCskLy50ZXN0KHBhcnQpKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudFtwYXJzZUludChwYXJ0KV0/LnZhbHVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQ/LltwYXJ0XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY3VycmVudDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2V0IHBhdGggKGRiOi8vLi4uKSDjgYvjgokgYXNzZXQgVVVJRCDjgpLop6PmsbrjgZnjgovjgILjgrXjg5bjgqLjgrvjg4Pjg4jmjIflrpogKEBzcHJpdGVGcmFtZSDnrYkpXHJcbiAgICAgKiDjgoLjgZ3jga7jgb7jgb4gcXVlcnktdXVpZCDjgavmipXjgZLjgovjgILlpLHmlZfmmYLjga8gbnVsbCDjgpLov5TjgZnjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNvbHZlQXNzZXRVdWlkQnlQYXRoKGFzc2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdXVpZCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInF1ZXJ5LXV1aWRcIiwgYXNzZXRQYXRoKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB1dWlkID09PSBcInN0cmluZ1wiICYmIHV1aWQubGVuZ3RoID4gMCkgcmV0dXJuIHV1aWQ7XHJcbiAgICAgICAgfSBjYXRjaCAoX2UpIHsgLyogZmFsbHRocm91Z2ggKi8gfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog44OO44O844OJVVVJROOBi+OCieOCs+ODs+ODneODvOODjeODs+ODiFVVSUTjgpLop6PmsbrjgZnjgovjgIJcclxuICAgICAqIHByb3BUeXBl77yI5L6LOiBcImNjLlNjcm9sbFZpZXdcIiwgXCJNaXNzaW9uTGlzdFBhbmVsXCLvvInjgavkuIDoh7TjgZnjgovjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgpLmjqLjgZnjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNvbHZlQ29tcG9uZW50VXVpZChub2RlVXVpZDogc3RyaW5nLCBwcm9wVHlwZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW25vZGVVdWlkXSk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUluZm8/LnN1Y2Nlc3MgfHwgIW5vZGVJbmZvPy5kYXRhPy5jb21wb25lbnRzKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgY29uc3QgdHlwZU5hbWUgPSBwcm9wVHlwZS5yZXBsYWNlKFwiY2MuXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZUluZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGM6IGFueSkgPT4gYy50eXBlID09PSB0eXBlTmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb21wPy51dWlkIHx8IG51bGw7XHJcbiAgICAgICAgfSBjYXRjaCAoX2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTY3JpcHQobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBFWFRfTkFNRSxcclxuICAgICAgICAgICAgbWV0aG9kLFxyXG4gICAgICAgICAgICBhcmdzLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==