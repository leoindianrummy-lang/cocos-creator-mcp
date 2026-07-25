"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const tool_base_1 = require("../tool-base");
const utils_1 = require("../utils");
const node_resolve_1 = require("../node-resolve");
const screenshot_1 = require("../screenshot");
const EXT_NAME = "cocos-creator-mcp";
/**
 * v2.0.0: 値型プロパティの簡易オブジェクト形式 → Editor dump 形式への変換テーブル。
 *
 * これらは cc.Vec3 等のクラスインスタンスを使わずに `{x, y, z}` のような
 * プレーンオブジェクトで設定できるようにするためのもの。
 *
 * Color は 0-255 / 0-1 のいずれかで来る可能性があるが、Cocos Editor の
 * dump 形式が期待する単位 (0-255) で渡す前提。入力が 0-1 の場合は呼び出し側で
 * 変換すること。
 */
const VALUE_TYPE_BUILDERS = {
    "cc.Vec2": (v) => ({
        value: { x: Number(v.x) || 0, y: Number(v.y) || 0 },
        type: "cc.Vec2",
    }),
    "cc.Vec3": (v) => ({
        value: { x: Number(v.x) || 0, y: Number(v.y) || 0, z: Number(v.z) || 0 },
        type: "cc.Vec3",
    }),
    "cc.Vec4": (v) => ({
        value: { x: Number(v.x) || 0, y: Number(v.y) || 0, z: Number(v.z) || 0, w: Number(v.w) || 0 },
        type: "cc.Vec4",
    }),
    "cc.Color": (v) => {
        var _a, _b, _c, _d;
        return ({
            value: {
                r: Number((_a = v.r) !== null && _a !== void 0 ? _a : 0),
                g: Number((_b = v.g) !== null && _b !== void 0 ? _b : 0),
                b: Number((_c = v.b) !== null && _c !== void 0 ? _c : 0),
                a: Number((_d = v.a) !== null && _d !== void 0 ? _d : 255),
            },
            type: "cc.Color",
        });
    },
    "cc.Size": (v) => {
        var _a, _b, _c, _d;
        return ({
            value: {
                // width/height でも x/y でも受け付ける
                width: Number((_b = (_a = v.width) !== null && _a !== void 0 ? _a : v.x) !== null && _b !== void 0 ? _b : 0),
                height: Number((_d = (_c = v.height) !== null && _c !== void 0 ? _c : v.y) !== null && _d !== void 0 ? _d : 0),
            },
            type: "cc.Size",
        });
    },
};
class ComponentTools {
    constructor() {
        this.categoryName = "component";
    }
    getTools() {
        return [
            {
                name: "component_manage",
                description: "Component lifecycle and class queries. Actions: 'add' (uuid, componentType), 'remove' (uuid, componentType), 'available' (list all component classes), 'enum' (uuid, componentType, property — list enum values for a component property like Layout.type).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'add' | 'remove' | 'available' | 'enum'" },
                        uuid: { type: "string", description: "Node UUID (action=add|remove|enum)" },
                        componentType: { type: "string", description: "Component class name (e.g. 'cc.Label', action=add|remove|enum)" },
                        property: { type: "string", description: "Property name (action=enum)" },
                    },
                    required: ["action"],
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
            case "component_manage":
                return this.handleManage(args);
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
            case "component_auto_bind":
                return this.autoBind(args.uuid, compType, (_a = args.force) !== null && _a !== void 0 ? _a : false, (_b = args.mode) !== null && _b !== void 0 ? _b : "fuzzy");
            default:
                return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
        }
    }
    /** component_manage dispatcher (v2.0.0). */
    async handleManage(args) {
        const compType = args.componentType || args.component;
        switch (args.action) {
            case "add":
                if (!args.uuid)
                    return (0, tool_base_1.err)("component_manage(add): 'uuid' is required");
                if (!compType)
                    return (0, tool_base_1.err)("component_manage(add): 'componentType' is required");
                return this.addComponent(args.uuid, compType);
            case "remove":
                if (!args.uuid)
                    return (0, tool_base_1.err)("component_manage(remove): 'uuid' is required");
                if (!compType)
                    return (0, tool_base_1.err)("component_manage(remove): 'componentType' is required");
                return this.removeComponent(args.uuid, compType);
            case "available": {
                try {
                    const classes = await Editor.Message.request("scene", "query-classes");
                    return (0, tool_base_1.ok)({ success: true, action: args.action, classes });
                }
                catch (e) {
                    return (0, tool_base_1.err)(e.message || String(e));
                }
            }
            case "enum":
                if (!args.uuid)
                    return (0, tool_base_1.err)("component_manage(enum): 'uuid' is required");
                if (!compType)
                    return (0, tool_base_1.err)("component_manage(enum): 'componentType' is required");
                if (!args.property)
                    return (0, tool_base_1.err)("component_manage(enum): 'property' is required");
                return this.queryEnum(args.uuid, compType, args.property);
            default:
                return (0, tool_base_1.err)(`Unknown component_manage action: ${args.action}. Expected add / remove / available / enum.`);
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
        // v2.0.0: cc.Vec2/Vec3/Vec4/Color/Size の値型を簡易オブジェクトから dump 生成
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            try {
                const nodeDump = await Editor.Message.request("scene", "query-node", nodeUuid);
                if (nodeDump) {
                    const propDump = this.resolveDumpPath(nodeDump, path);
                    const propType = propDump === null || propDump === void 0 ? void 0 : propDump.type;
                    const builder = VALUE_TYPE_BUILDERS[propType !== null && propType !== void 0 ? propType : ""];
                    if (builder)
                        return builder(value);
                }
            }
            catch (_e) { /* fallthrough */ }
            // 既存挙動: プロパティ型が解決できない場合は各キーを {value: v} で wrap
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBdUM7QUFDdkMsb0NBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRCw4Q0FBcUQ7QUFFckQsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUM7QUFFckM7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBb0M7SUFDekQsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2YsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNuRCxJQUFJLEVBQUUsU0FBUztLQUNsQixDQUFDO0lBQ0YsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2YsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDeEUsSUFBSSxFQUFFLFNBQVM7S0FDbEIsQ0FBQztJQUNGLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNmLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFD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QU8sSUFBSSxDQUFDO1lBQ25FLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQztZQUM1RSxPQUFPLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUksS0FBSSxJQUFJLENBQUM7UUFDOUIsQ0FBQztRQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDVixPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYyxFQUFFLElBQVc7UUFDakQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxNQUFNO1lBQ04sSUFBSTtTQUNQLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQTFyQkQsd0NBMHJCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgb2ssIGVyciB9IGZyb20gXCIuLi90b29sLWJhc2VcIjtcclxuaW1wb3J0IHsgcGFyc2VNYXliZUpzb24gfSBmcm9tIFwiLi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZU5vZGVVdWlkIH0gZnJvbSBcIi4uL25vZGUtcmVzb2x2ZVwiO1xyXG5pbXBvcnQgeyB0YWtlRWRpdG9yU2NyZWVuc2hvdCB9IGZyb20gXCIuLi9zY3JlZW5zaG90XCI7XHJcblxyXG5jb25zdCBFWFRfTkFNRSA9IFwiY29jb3MtY3JlYXRvci1tY3BcIjtcclxuXHJcbi8qKlxyXG4gKiB2Mi4wLjA6IOWApOWei+ODl+ODreODkeODhuOCo+OBruewoeaYk+OCquODluOCuOOCp+OCr+ODiOW9ouW8jyDihpIgRWRpdG9yIGR1bXAg5b2i5byP44G444Gu5aSJ5o+b44OG44O844OW44Or44CCXHJcbiAqXHJcbiAqIOOBk+OCjOOCieOBryBjYy5WZWMzIOetieOBruOCr+ODqeOCueOCpOODs+OCueOCv+ODs+OCueOCkuS9v+OCj+OBmuOBqyBge3gsIHksIHp9YCDjga7jgojjgYbjgapcclxuICog44OX44Os44O844Oz44Kq44OW44K444Kn44Kv44OI44Gn6Kit5a6a44Gn44GN44KL44KI44GG44Gr44GZ44KL44Gf44KB44Gu44KC44Gu44CCXHJcbiAqXHJcbiAqIENvbG9yIOOBryAwLTI1NSAvIDAtMSDjga7jgYTjgZrjgozjgYvjgafmnaXjgovlj6/og73mgKfjgYzjgYLjgovjgYzjgIFDb2NvcyBFZGl0b3Ig44GuXHJcbiAqIGR1bXAg5b2i5byP44GM5pyf5b6F44GZ44KL5Y2Y5L2NICgwLTI1NSkg44Gn5rih44GZ5YmN5o+Q44CC5YWl5Yqb44GMIDAtMSDjga7loLTlkIjjga/lkbzjgbPlh7rjgZflgbTjgadcclxuICog5aSJ5o+b44GZ44KL44GT44Go44CCXHJcbiAqL1xyXG5jb25zdCBWQUxVRV9UWVBFX0JVSUxERVJTOiBSZWNvcmQ8c3RyaW5nLCAodjogYW55KSA9PiBhbnk+ID0ge1xyXG4gICAgXCJjYy5WZWMyXCI6ICh2KSA9PiAoe1xyXG4gICAgICAgIHZhbHVlOiB7IHg6IE51bWJlcih2LngpIHx8IDAsIHk6IE51bWJlcih2LnkpIHx8IDAgfSxcclxuICAgICAgICB0eXBlOiBcImNjLlZlYzJcIixcclxuICAgIH0pLFxyXG4gICAgXCJjYy5WZWMzXCI6ICh2KSA9PiAoe1xyXG4gICAgICAgIHZhbHVlOiB7IHg6IE51bWJlcih2LngpIHx8IDAsIHk6IE51bWJlcih2LnkpIHx8IDAsIHo6IE51bWJlcih2LnopIHx8IDAgfSxcclxuICAgICAgICB0eXBlOiBcImNjLlZlYzNcIixcclxuICAgIH0pLFxyXG4gICAgXCJjYy5WZWM0XCI6ICh2KSA9PiAoe1xyXG4gICAgICAgIHZhbHVlOiB7IHg6IE51bWJlcih2LngpIHx8IDAsIHk6IE51bWJlcih2LnkpIHx8IDAsIHo6IE51bWJlcih2LnopIHx8IDAsIHc6IE51bWJlcih2LncpIHx8IDAgfSxcclxuICAgICAgICB0eXBlOiBcImNjLlZlYzRcIixcclxuICAgIH0pLFxyXG4gICAgXCJjYy5Db2xvclwiOiAodikgPT4gKHtcclxuICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICByOiBOdW1iZXIodi5yID8/IDApLFxyXG4gICAgICAgICAgICBnOiBOdW1iZXIodi5nID8/IDApLFxyXG4gICAgICAgICAgICBiOiBOdW1iZXIodi5iID8/IDApLFxyXG4gICAgICAgICAgICBhOiBOdW1iZXIodi5hID8/IDI1NSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0eXBlOiBcImNjLkNvbG9yXCIsXHJcbiAgICB9KSxcclxuICAgIFwiY2MuU2l6ZVwiOiAodikgPT4gKHtcclxuICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAvLyB3aWR0aC9oZWlnaHQg44Gn44KCIHgveSDjgafjgoLlj5fjgZHku5jjgZHjgotcclxuICAgICAgICAgICAgd2lkdGg6IE51bWJlcih2LndpZHRoID8/IHYueCA/PyAwKSxcclxuICAgICAgICAgICAgaGVpZ2h0OiBOdW1iZXIodi5oZWlnaHQgPz8gdi55ID8/IDApLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdHlwZTogXCJjYy5TaXplXCIsXHJcbiAgICB9KSxcclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRUb29scyBpbXBsZW1lbnRzIFRvb2xDYXRlZ29yeSB7XHJcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcImNvbXBvbmVudFwiO1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X21hbmFnZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGxpZmVjeWNsZSBhbmQgY2xhc3MgcXVlcmllcy4gQWN0aW9uczogJ2FkZCcgKHV1aWQsIGNvbXBvbmVudFR5cGUpLCAncmVtb3ZlJyAodXVpZCwgY29tcG9uZW50VHlwZSksICdhdmFpbGFibGUnIChsaXN0IGFsbCBjb21wb25lbnQgY2xhc3NlcyksICdlbnVtJyAodXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHkg4oCUIGxpc3QgZW51bSB2YWx1ZXMgZm9yIGEgY29tcG9uZW50IHByb3BlcnR5IGxpa2UgTGF5b3V0LnR5cGUpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidhZGQnIHwgJ3JlbW92ZScgfCAnYXZhaWxhYmxlJyB8ICdlbnVtJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEIChhY3Rpb249YWRkfHJlbW92ZXxlbnVtKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGNsYXNzIG5hbWUgKGUuZy4gJ2NjLkxhYmVsJywgYWN0aW9uPWFkZHxyZW1vdmV8ZW51bSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSBuYW1lIChhY3Rpb249ZW51bSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiY29tcG9uZW50X3NldF9wcm9wZXJ0eVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2V0IG9uZSBvciBtb3JlIHByb3BlcnRpZXMgb24gYSBjb21wb25lbnQuIEZvciBzaW5nbGU6IHVzZSBwcm9wZXJ0eSt2YWx1ZS4gRm9yIGJhdGNoOiB1c2UgcHJvcGVydGllcyBhcnJheS4gVXNlIG5vZGVOYW1lIGluc3RlYWQgb2YgdXVpZCB0byBmaW5kIG5vZGUgYnkgbmFtZS4gU2V0IHNjcmVlbnNob3Q9dHJ1ZSB0byBjYXB0dXJlIGVkaXRvciBzY3JlZW5zaG90IGFmdGVyIGNoYW5nZXMuIEV4YW1wbGVzOiBMYWJlbC5zdHJpbmcsIExhYmVsLmZvbnRTaXplLCBTcHJpdGUuY29sb3IsIFVJVHJhbnNmb3JtLmNvbnRlbnRTaXplLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQgKGVpdGhlciB1dWlkIG9yIG5vZGVOYW1lIHJlcXVpcmVkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgbmFtZSB0byBmaW5kIChhbHRlcm5hdGl2ZSB0byB1dWlkIOKAlCBhdm9pZHMgVVVJRCBsb29rdXApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wb25lbnQgY2xhc3MgbmFtZSAoZS5nLiAnY2MuTGFiZWwnKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByb3BlcnR5IG5hbWUgKHNpbmdsZSBtb2RlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiBcIlZhbHVlIHRvIHNldCAoc2luZ2xlIG1vZGUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQmF0Y2ggbW9kZTogYXJyYXkgb2Yge3Byb3BlcnR5LCB2YWx1ZX0gb2JqZWN0cyB0byBzZXQgbXVsdGlwbGUgcHJvcGVydGllcyBhdCBvbmNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSBuYW1lXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246IFwiVmFsdWUgdG8gc2V0XCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJwcm9wZXJ0eVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuc2hvdDogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgY2FwdHVyZSBlZGl0b3Igc2NyZWVuc2hvdCBhZnRlciBzZXR0aW5nIHByb3BlcnRpZXMgYW5kIHJldHVybiB0aGUgZmlsZSBwYXRoIChkZWZhdWx0OiBmYWxzZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImNvbXBvbmVudFR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbXBvbmVudF9hdXRvX2JpbmRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkF1dG9tYXRpY2FsbHkgYmluZCBAcHJvcGVydHkgcmVmZXJlbmNlcyBieSBtYXRjaGluZyBwcm9wZXJ0eSBuYW1lcyB0byBkZXNjZW5kYW50IG5vZGUgbmFtZXMuIFNlYXJjaGVzIG9ubHkgZGVzY2VuZGFudHMgb2YgdGhlIHRhcmdldCBub2RlLiBWYWxpZGF0ZXMgY29tcG9uZW50IHR5cGUgZXhpc3RlbmNlLiBTdXBwb3J0cyBhcnJheSBwcm9wZXJ0aWVzIChTbG90XzAsIFNsb3RfMS4uLikuIE1vZGU6ICdmdXp6eScgKGRlZmF1bHQpIHRyaWVzIGV4YWN0IG1hdGNoIGZpcnN0LCB0aGVuIGNhc2UtaW5zZW5zaXRpdmU7ICdzdHJpY3QnIHJlcXVpcmVzIGV4YWN0IG1hdGNoIG9ubHkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRCAoZWl0aGVyIHV1aWQgb3Igbm9kZU5hbWUgcmVxdWlyZWQpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBuYW1lIHRvIGZpbmQgKGFsdGVybmF0aXZlIHRvIHV1aWQpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTY3JpcHQgY29tcG9uZW50IGNsYXNzIG5hbWUgKGUuZy4gJ1F1ZXN0UmVhZHlQYWdlVmlldycpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yY2U6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIHJlYmluZCBldmVuIGFscmVhZHktYm91bmQgcHJvcGVydGllcyAoZGVmYXVsdDogZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogeyB0eXBlOiBcInN0cmluZ1wiLCBlbnVtOiBbXCJmdXp6eVwiLCBcInN0cmljdFwiXSwgZGVzY3JpcHRpb246IFwiTWF0Y2hpbmcgbW9kZTogJ2Z1enp5JyAoZGVmYXVsdCkgb3IgJ3N0cmljdCdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImNvbXBvbmVudFR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgLy8g44OR44Op44Oh44O844K/44Ko44Kk44Oq44Ki44K5OiBjb21wb25lbnQg4oaSIGNvbXBvbmVudFR5cGVcclxuICAgICAgICBjb25zdCBjb21wVHlwZSA9IGFyZ3MuY29tcG9uZW50VHlwZSB8fCBhcmdzLmNvbXBvbmVudDtcclxuXHJcbiAgICAgICAgLy8gbm9kZU5hbWUg4oaSIHV1aWQg6Kej5rG677yI5a++5b+c44OE44O844Or44Gu44G/77yJXHJcbiAgICAgICAgY29uc3QgbmVlZHNSZXNvbHZlID0gW1wiY29tcG9uZW50X3NldF9wcm9wZXJ0eVwiLCBcImNvbXBvbmVudF9nZXRfY29tcG9uZW50c1wiLCBcImNvbXBvbmVudF9hdXRvX2JpbmRcIl07XHJcbiAgICAgICAgaWYgKG5lZWRzUmVzb2x2ZS5pbmNsdWRlcyh0b29sTmFtZSkgJiYgIWFyZ3MudXVpZCAmJiBhcmdzLm5vZGVOYW1lKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IHJlc29sdmVOb2RlVXVpZCh7IG5vZGVOYW1lOiBhcmdzLm5vZGVOYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgYXJncy51dWlkID0gcmVzb2x2ZWQudXVpZDtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfbWFuYWdlXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVNYW5hZ2UoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRfc2V0X3Byb3BlcnR5XCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBwYXJzZU1heWJlSnNvbihhcmdzLnByb3BlcnRpZXMpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogVG9vbFJlc3VsdDtcclxuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzICYmIEFycmF5LmlzQXJyYXkocHJvcGVydGllcykpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBwcm9wZXJ0aWVzLm1hcCgocDogYW55KSA9PiAoeyAuLi5wLCB2YWx1ZTogcGFyc2VNYXliZUpzb24ocC52YWx1ZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuc2V0UHJvcGVydGllcyhhcmdzLnV1aWQsIGNvbXBUeXBlLCBwYXJzZWQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnNldFByb3BlcnR5KGFyZ3MudXVpZCwgY29tcFR5cGUsIGFyZ3MucHJvcGVydHksIHBhcnNlTWF5YmVKc29uKGFyZ3MudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIHNjcmVlbnNob3Qg44Kq44OX44K344On44OzXHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5zY3JlZW5zaG90KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3MgPSBhd2FpdCB0YWtlRWRpdG9yU2NyZWVuc2hvdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXN1bHQuY29udGVudFswXS50ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5zY3JlZW5zaG90ID0geyBwYXRoOiBzcy5wYXRoLCBzaXplOiBzcy5zYXZlZFNpemUgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHNzRXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g44K544Kv44K344On5aSx5pWX44GX44Gm44KC44OX44Ot44OR44OG44Kj6Kit5a6a57WQ5p6c44Gv6L+U44GZXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJlc3VsdC5jb250ZW50WzBdLnRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnNjcmVlbnNob3RFcnJvciA9IHNzRXJyLm1lc3NhZ2UgfHwgU3RyaW5nKHNzRXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9hdXRvX2JpbmRcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmF1dG9CaW5kKGFyZ3MudXVpZCwgY29tcFR5cGUsIGFyZ3MuZm9yY2UgPz8gZmFsc2UsIGFyZ3MubW9kZSA/PyBcImZ1enp5XCIpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogY29tcG9uZW50X21hbmFnZSBkaXNwYXRjaGVyICh2Mi4wLjApLiAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNYW5hZ2UoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGNvbXBUeXBlID0gYXJncy5jb21wb25lbnRUeXBlIHx8IGFyZ3MuY29tcG9uZW50O1xyXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSBcImFkZFwiOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLnV1aWQpIHJldHVybiBlcnIoXCJjb21wb25lbnRfbWFuYWdlKGFkZCk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIGlmICghY29tcFR5cGUpIHJldHVybiBlcnIoXCJjb21wb25lbnRfbWFuYWdlKGFkZCk6ICdjb21wb25lbnRUeXBlJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZENvbXBvbmVudChhcmdzLnV1aWQsIGNvbXBUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSBcInJlbW92ZVwiOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLnV1aWQpIHJldHVybiBlcnIoXCJjb21wb25lbnRfbWFuYWdlKHJlbW92ZSk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIGlmICghY29tcFR5cGUpIHJldHVybiBlcnIoXCJjb21wb25lbnRfbWFuYWdlKHJlbW92ZSk6ICdjb21wb25lbnRUeXBlJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUNvbXBvbmVudChhcmdzLnV1aWQsIGNvbXBUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSBcImF2YWlsYWJsZVwiOiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsYXNzZXMgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1jbGFzc2VzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIGNsYXNzZXMgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHsgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTsgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJlbnVtXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MudXVpZCkgcmV0dXJuIGVycihcImNvbXBvbmVudF9tYW5hZ2UoZW51bSk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIGlmICghY29tcFR5cGUpIHJldHVybiBlcnIoXCJjb21wb25lbnRfbWFuYWdlKGVudW0pOiAnY29tcG9uZW50VHlwZScgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MucHJvcGVydHkpIHJldHVybiBlcnIoXCJjb21wb25lbnRfbWFuYWdlKGVudW0pOiAncHJvcGVydHknIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlFbnVtKGFyZ3MudXVpZCwgY29tcFR5cGUsIGFyZ3MucHJvcGVydHkpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBjb21wb25lbnRfbWFuYWdlIGFjdGlvbjogJHthcmdzLmFjdGlvbn0uIEV4cGVjdGVkIGFkZCAvIHJlbW92ZSAvIGF2YWlsYWJsZSAvIGVudW0uYCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYWRkQ29tcG9uZW50KHV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImFkZENvbXBvbmVudFRvTm9kZVwiLCBbdXVpZCwgY29tcG9uZW50VHlwZV0pO1xyXG4gICAgICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUVudW0obm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUR1bXAgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ub2RlXCIsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRHVtcCkgcmV0dXJuIGVycihcIk5vZGUgbm90IGZvdW5kXCIpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcHMgPSBub2RlRHVtcC5fX2NvbXBzX18gfHwgW107XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLnR5cGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBUeXBlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIC8vIE1hdGNoIGJ5IGNjLlhYWCBmb3JtYXRcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRUeXBlID0gY29tcG9uZW50VHlwZS5zdGFydHNXaXRoKFwiY2MuXCIpID8gY29tcG9uZW50VHlwZS5zdWJzdHJpbmcoMykgOiBjb21wb25lbnRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBUeXBlICE9PSBgY2MuJHtub3JtYWxpemVkVHlwZX1gICYmIGNvbXBUeXBlICE9PSBjb21wb25lbnRUeXBlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wRHVtcCA9IGNvbXAudmFsdWU/Lltwcm9wZXJ0eV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIXByb3BEdW1wKSByZXR1cm4gZXJyKGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG5vdCBmb3VuZCBvbiAke2NvbXBvbmVudFR5cGV9YCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvcER1bXAudHlwZSAhPT0gXCJFbnVtXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBwcm9wZXJ0eSwgdHlwZTogcHJvcER1bXAudHlwZSwgbm90ZTogXCJOb3QgYW4gZW51bSBwcm9wZXJ0eVwiLCBjdXJyZW50VmFsdWU6IHByb3BEdW1wLnZhbHVlIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5LFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogcHJvcER1bXAudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bUxpc3Q6IHByb3BEdW1wLmVudW1MaXN0LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVycihgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgKTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZW1vdmVDb21wb25lbnQodXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwicmVtb3ZlQ29tcG9uZW50RnJvbU5vZGVcIiwgW3V1aWQsIGNvbXBvbmVudFR5cGVdKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50cyh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW3V1aWRdKTtcclxuICAgICAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXVpZCxcclxuICAgICAgICAgICAgICAgIG5hbWU6IHJlc3VsdC5kYXRhPy5uYW1lLFxyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50czogcmVzdWx0LmRhdGE/LmNvbXBvbmVudHMgfHwgW10sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwcm9wZXJ0eSDlkI3jgajjg47jg7zjg4nlkI3jgpLoh6rli5Xjg57jg4Pjg4Hjg7PjgrDjgZfjgabjg5DjgqTjg7Pjg4njgZnjgovjgIJcclxuICAgICAqXHJcbiAgICAgKiAtIOaknOe0ouOCueOCs+ODvOODlzog5a++6LGh44OO44O844OJ44Gu5a2Q5a2r44Gu44G/XHJcbiAgICAgKiAtIOikh+aVsOODkuODg+ODiOaZgjog6ZqO5bGk44Gu5rWF44GE44OO44O844OJ77yI55u05o6l44Gu5a2Q77yJ44KS5YSq5YWIXHJcbiAgICAgKiAtIOWei+aknOiovDogQ29tcG9uZW50IOWPgueFp+Wei+OBruWgtOWQiOOAgeipsuW9k+OCs+ODs+ODneODvOODjeODs+ODiOOBruWtmOWcqOOCkueiuuiqjVxyXG4gICAgICogLSDphY3liJflr77lv5w6IEBwcm9wZXJ0eShbTm9kZV0pIOKGkiDpgKPnlarjg47jg7zjg4nlkI0gKFNsb3RzXzAsIFNsb3RzXzEuLi4pXHJcbiAgICAgKiAtIG1vZGU6XHJcbiAgICAgKiAgIC0gXCJmdXp6eVwiIChkZWZhdWx0KTog5a6M5YWo5LiA6Ie0IOKGkiBjYXNlLWluc2Vuc2l0aXZlIOKGkiBub3RfZm91bmQr5YCZ6KOcXHJcbiAgICAgKiAgIC0gXCJzdHJpY3RcIjog5a6M5YWo5LiA6Ie044Gu44G/IOKGkiBub3RfZm91bmQr5YCZ6KOcXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYXV0b0JpbmQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBmb3JjZTogYm9vbGVhbiwgbW9kZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUR1bXAgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ub2RlXCIsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRHVtcCkgcmV0dXJuIGVycihcIk5vZGUgbm90IGZvdW5kXCIpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcHMgPSBub2RlRHVtcC5fX2NvbXBzX18gfHwgW107XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBOYW1lID0gY29tcG9uZW50VHlwZS5yZXBsYWNlKFwiY2MuXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBjb21wcy5maW5kSW5kZXgoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IGMudHlwZSB8fCBcIlwiO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHQgPT09IGNvbXBOYW1lIHx8IHQgPT09IGBjYy4ke2NvbXBOYW1lfWA7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAoY29tcEluZGV4IDwgMCkgcmV0dXJuIGVycihgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOWtkOWtq+ODjuODvOODieS4gOimp+OCkuS4gOaLrOWPluW+l++8iOaknOe0ouWKueeOh+WMlu+8iVxyXG4gICAgICAgICAgICBjb25zdCBhbGxEZXNjZW5kYW50cyA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXRBbGxEZXNjZW5kYW50c1wiLCBbbm9kZVV1aWRdKTtcclxuICAgICAgICAgICAgY29uc3QgZGVzY2VuZGFudExpc3Q6IEFycmF5PHt1dWlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGVwdGg6IG51bWJlcn0+ID1cclxuICAgICAgICAgICAgICAgIGFsbERlc2NlbmRhbnRzPy5zdWNjZXNzID8gYWxsRGVzY2VuZGFudHMuZGF0YSA6IFtdO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcER1bXAgPSBjb21wc1tjb21wSW5kZXhdO1xyXG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gY29tcER1bXAudmFsdWUgfHwge307XHJcbiAgICAgICAgICAgIGNvbnN0IHNraXBLZXlzID0gbmV3IFNldChbXCJ1dWlkXCIsIFwibmFtZVwiLCBcImVuYWJsZWRcIiwgXCJub2RlXCIsIFwiX19zY3JpcHRBc3NldFwiLCBcIl9fcHJlZmFiXCIsIFwiX25hbWVcIiwgXCJfb2JqRmxhZ3NcIiwgXCJfZW5hYmxlZFwiXSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcE5hbWUsIHByb3BEdW1wUmF3XSBvZiBPYmplY3QuZW50cmllcyhwcm9wZXJ0aWVzKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNraXBLZXlzLmhhcyhwcm9wTmFtZSkgfHwgcHJvcE5hbWUuc3RhcnRzV2l0aChcIl9cIikpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BEdW1wID0gcHJvcER1bXBSYXcgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcFR5cGUgPSBwcm9wRHVtcC50eXBlIGFzIHN0cmluZztcclxuICAgICAgICAgICAgICAgIGlmICghcHJvcFR5cGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuZHNBcnIgPSAocHJvcER1bXAuZXh0ZW5kcyB8fCBbXSkgYXMgc3RyaW5nW107XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g6YWN5YiX5Z6L44Gu5Yik5a6aXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc0FycmF5ID0gcHJvcFR5cGUgPT09IFwiQXJyYXlcIiB8fCBBcnJheS5pc0FycmF5KHByb3BEdW1wLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJyYXlSZXN1bHQgPSBhd2FpdCB0aGlzLmF1dG9CaW5kQXJyYXkobm9kZVV1aWQsIGNvbXBJbmRleCwgcHJvcE5hbWUsIHByb3BEdW1wLCBkZXNjZW5kYW50TGlzdCwgbW9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGFycmF5UmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc05vZGVSZWYgPSBwcm9wVHlwZSA9PT0gXCJjYy5Ob2RlXCI7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NvbXBvbmVudFJlZiA9IGV4dGVuZHNBcnIuaW5jbHVkZXMoXCJjYy5Db21wb25lbnRcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzTm9kZVJlZiAmJiAhaXNDb21wb25lbnRSZWYpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIOaXouOBq+ODkOOCpOODs+ODiea4iOOBv+OBquOCieOCueOCreODg+ODl1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gcHJvcER1bXAudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZvcmNlICYmIGN1cnJlbnRWYWx1ZT8udXVpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBwcm9wTmFtZSwgc3RhdHVzOiBcImFscmVhZHlfYm91bmRcIiB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyDlkI3liY3jg57jg4Pjg4E6IOWujOWFqOS4gOiHtCDihpIgZnV6ennmmYLjga8gY2FzZS1pbnNlbnNpdGl2ZVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2hSZXN1bHQgPSB0aGlzLmZpbmRNYXRjaGluZ05vZGUocHJvcE5hbWUsIGRlc2NlbmRhbnRMaXN0LCBtb2RlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hSZXN1bHQgJiYgaXNDb21wb25lbnRSZWYpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlnovmpJzoqLw6IOOCs+ODs+ODneODvOODjeODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc0NvbXAgPSBhd2FpdCB0aGlzLm5vZGVIYXNDb21wb25lbnQobWF0Y2hSZXN1bHQudXVpZCwgcHJvcFR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eTogcHJvcE5hbWUsIHR5cGU6IHByb3BUeXBlLCBzdGF0dXM6IFwidHlwZV9taXNtYXRjaFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG1hdGNoUmVzdWx0Lm5hbWUsIG1lc3NhZ2U6IGBOb2RlIFwiJHttYXRjaFJlc3VsdC5uYW1lfVwiIGhhcyBubyAke3Byb3BUeXBlfSBjb21wb25lbnRgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaFJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWAmeijnOOCteOCuOOCp+OCueODiFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zID0gdGhpcy5nZXRTdWdnZXN0aW9ucyhwcm9wTmFtZSwgZGVzY2VuZGFudExpc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBwcm9wTmFtZSwgdHlwZTogcHJvcFR5cGUsIHN0YXR1czogXCJub3RfZm91bmRcIiwgc3VnZ2VzdGlvbnMgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LiR7cHJvcE5hbWV9YDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGR1bXAgPSBhd2FpdCB0aGlzLmJ1aWxkRHVtcFdpdGhUeXBlSW5mbyhub2RlVXVpZCwgcGF0aCwgbWF0Y2hSZXN1bHQudXVpZCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXRSZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW25vZGVVdWlkLCBwYXRoLCBkdW1wXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBtYXRjaFJlc3VsdC5leGFjdCA/IFwiYm91bmRcIiA6IFwiZnV6enlfYm91bmRcIjtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBwcm9wTmFtZSwgc3RhdHVzLCBub2RlTmFtZTogbWF0Y2hSZXN1bHQubmFtZSwgc3VjY2Vzczogc2V0UmVzdWx0Py5zdWNjZXNzICE9PSBmYWxzZSB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYm91bmRDb3VudCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09IFwiYm91bmRcIiB8fCByLnN0YXR1cyA9PT0gXCJmdXp6eV9ib3VuZFwiKS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGZ1enp5Q291bnQgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSBcImZ1enp5X2JvdW5kXCIpLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgbm90Rm91bmRDb3VudCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09IFwibm90X2ZvdW5kXCIpLmxlbmd0aDtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYm91bmRDb3VudCwgZnV6enlDb3VudCwgbm90Rm91bmRDb3VudCwgcmVzdWx0cyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDlrZDlravjg6rjgrnjg4jjgYvjgonjg5fjg63jg5Hjg4bjgqPlkI3jgavjg57jg4Pjg4HjgZnjgovjg47jg7zjg4njgpLmpJzntKLjgIJcclxuICAgICAqIOWujOWFqOS4gOiHtOOCkuWEquWFiOOAgWZ1enp5IOODouODvOODieOBp+OBryBjYXNlLWluc2Vuc2l0aXZlIOOCguODleOCqeODvOODq+ODkOODg+OCr+OAglxyXG4gICAgICog6KSH5pWw44OS44OD44OI5pmC44Gv6ZqO5bGk44Gu5rWF44GE77yIZGVwdGgg44GM5bCP44GV44GE77yJ44KC44Gu44KS5YSq5YWI44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgZmluZE1hdGNoaW5nTm9kZShcclxuICAgICAgICBwcm9wTmFtZTogc3RyaW5nLCBkZXNjZW5kYW50czogQXJyYXk8e3V1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkZXB0aDogbnVtYmVyfT4sIG1vZGU6IHN0cmluZ1xyXG4gICAgKTogeyB1dWlkOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZXhhY3Q6IGJvb2xlYW4gfSB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLnByb3BlcnR5TmFtZVRvTm9kZU5hbWVzKHByb3BOYW1lKTtcclxuXHJcbiAgICAgICAgLy8gMS4g5a6M5YWo5LiA6Ie0XHJcbiAgICAgICAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gZGVzY2VuZGFudHNcclxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZCA9PiBkLm5hbWUgPT09IGNhbmRpZGF0ZSlcclxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmRlcHRoIC0gYi5kZXB0aCk7XHJcbiAgICAgICAgICAgIGlmIChtYXRjaGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IG1hdGNoZXNbMF0udXVpZCwgbmFtZTogbWF0Y2hlc1swXS5uYW1lLCBleGFjdDogdHJ1ZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAyLiBmdXp6eTogY2FzZS1pbnNlbnNpdGl2ZVxyXG4gICAgICAgIGlmIChtb2RlID09PSBcImZ1enp5XCIpIHtcclxuICAgICAgICAgICAgY29uc3QgbG93ZXJDYW5kaWRhdGVzID0gY2FuZGlkYXRlcy5tYXAoYyA9PiBjLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gZGVzY2VuZGFudHNcclxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZCA9PiBsb3dlckNhbmRpZGF0ZXMuaW5jbHVkZXMoZC5uYW1lLnRvTG93ZXJDYXNlKCkpKVxyXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEuZGVwdGggLSBiLmRlcHRoKTtcclxuICAgICAgICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogbWF0Y2hlc1swXS51dWlkLCBuYW1lOiBtYXRjaGVzWzBdLm5hbWUsIGV4YWN0OiBmYWxzZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIG5vdF9mb3VuZCDmmYLjgavkvLzjgZ/lkI3liY3jga7jg47jg7zjg4njgpLjgrXjgrjjgqfjgrnjg4jjgZnjgovjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBnZXRTdWdnZXN0aW9ucyhwcm9wTmFtZTogc3RyaW5nLCBkZXNjZW5kYW50czogQXJyYXk8e3V1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkZXB0aDogbnVtYmVyfT4pOiBzdHJpbmdbXSB7XHJcbiAgICAgICAgY29uc3QgbG93ZXIgPSBwcm9wTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIHJldHVybiBkZXNjZW5kYW50c1xyXG4gICAgICAgICAgICAuZmlsdGVyKGQgPT4gZC5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXIpIHx8IGxvd2VyLmluY2x1ZGVzKGQubmFtZS50b0xvd2VyQ2FzZSgpKSlcclxuICAgICAgICAgICAgLm1hcChkID0+IGQubmFtZSlcclxuICAgICAgICAgICAgLnNsaWNlKDAsIDUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog44OO44O844OJ44Gr5oyH5a6a5Z6L44Gu44Kz44Oz44Od44O844ON44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL56K66KqN44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgbm9kZUhhc0NvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBwcm9wVHlwZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgY29uc3QgdHlwZU5hbWUgPSBwcm9wVHlwZS5yZXBsYWNlKFwiY2MuXCIsIFwiXCIpO1xyXG4gICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW25vZGVVdWlkXSk7XHJcbiAgICAgICAgaWYgKCFpbmZvPy5zdWNjZXNzIHx8ICFpbmZvPy5kYXRhPy5jb21wb25lbnRzKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIGluZm8uZGF0YS5jb21wb25lbnRzLnNvbWUoKGM6IGFueSkgPT4gYy50eXBlID09PSB0eXBlTmFtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDphY3liJcgQHByb3BlcnR5IOOBruiHquWLleODkOOCpOODs+ODieOAglxyXG4gICAgICog44OX44Ot44OR44OG44Kj5ZCNIFwic2xvdHNcIiDihpIgXCJTbG90c18wXCIsIFwiU2xvdHNfMVwiLCAuLi4g44Gu6YCj55Wq44OO44O844OJ44KS5qSc57Si44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYXV0b0JpbmRBcnJheShcclxuICAgICAgICBub2RlVXVpZDogc3RyaW5nLCBjb21wSW5kZXg6IG51bWJlciwgcHJvcE5hbWU6IHN0cmluZywgcHJvcER1bXA6IGFueSxcclxuICAgICAgICBkZXNjZW5kYW50czogQXJyYXk8e3V1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkZXB0aDogbnVtYmVyfT4sIG1vZGU6IHN0cmluZ1xyXG4gICAgKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICBjb25zdCBlbGVtZW50VHlwZSA9IHByb3BEdW1wLnZhbHVlPy5bMF0/LnR5cGUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgICAgIGlmICghZWxlbWVudFR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgcHJvcGVydHk6IHByb3BOYW1lLCBzdGF0dXM6IFwic2tpcFwiLCByZWFzb246IFwiZW1wdHkgYXJyYXkgb3IgdW5rbm93biBlbGVtZW50IHR5cGVcIiB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcGFzY2FsID0gcHJvcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwcm9wTmFtZS5zbGljZSgxKTtcclxuICAgICAgICBjb25zdCBmb3VuZEVsZW1lbnRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGxldCBpbmRleCA9IDA7XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNhbmRpZGF0ZU5hbWUgPSBgJHtwYXNjYWx9XyR7aW5kZXh9YDtcclxuICAgICAgICAgICAgLy8g5a6M5YWo5LiA6Ie0IG9yIGNhc2UtaW5zZW5zaXRpdmVcclxuICAgICAgICAgICAgbGV0IG1hdGNoID0gZGVzY2VuZGFudHMuZmluZChkID0+IGQubmFtZSA9PT0gY2FuZGlkYXRlTmFtZSk7XHJcbiAgICAgICAgICAgIGlmICghbWF0Y2ggJiYgbW9kZSA9PT0gXCJmdXp6eVwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb3dlciA9IGNhbmRpZGF0ZU5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgIG1hdGNoID0gZGVzY2VuZGFudHMuZmluZChkID0+IGQubmFtZS50b0xvd2VyQ2FzZSgpID09PSBsb3dlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFtYXRjaCkgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBlbGVtZW50UGF0aCA9IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LiR7cHJvcE5hbWV9LiR7aW5kZXh9YDtcclxuICAgICAgICAgICAgY29uc3QgZHVtcCA9IGF3YWl0IHRoaXMuYnVpbGREdW1wV2l0aFR5cGVJbmZvKG5vZGVVdWlkLCBlbGVtZW50UGF0aCwgbWF0Y2gudXVpZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNldFJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXRQcm9wZXJ0eVZpYUVkaXRvclwiLCBbbm9kZVV1aWQsIGVsZW1lbnRQYXRoLCBkdW1wXSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGV4YWN0ID0gbWF0Y2gubmFtZSA9PT0gY2FuZGlkYXRlTmFtZTtcclxuICAgICAgICAgICAgZm91bmRFbGVtZW50cy5wdXNoKHsgaW5kZXgsIG5vZGVOYW1lOiBtYXRjaC5uYW1lLCBleGFjdCwgc3VjY2Vzczogc2V0UmVzdWx0Py5zdWNjZXNzICE9PSBmYWxzZSB9KTtcclxuICAgICAgICAgICAgaW5kZXgrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChmb3VuZEVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBwcm9wZXJ0eTogcHJvcE5hbWUsIHN0YXR1czogXCJub3RfZm91bmRcIiwgdHlwZTogXCJBcnJheVwiLCBjYW5kaWRhdGVzOiBbYCR7cGFzY2FsfV8wYCwgYCR7cGFzY2FsfV8xYCwgXCIuLi5cIl0gfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaGFzRnV6enkgPSBmb3VuZEVsZW1lbnRzLnNvbWUoZSA9PiAhZS5leGFjdCk7XHJcbiAgICAgICAgcmV0dXJuIHsgcHJvcGVydHk6IHByb3BOYW1lLCBzdGF0dXM6IGhhc0Z1enp5ID8gXCJmdXp6eV9ib3VuZFwiIDogXCJib3VuZFwiLCB0eXBlOiBcIkFycmF5XCIsIGNvdW50OiBmb3VuZEVsZW1lbnRzLmxlbmd0aCwgZWxlbWVudHM6IGZvdW5kRWxlbWVudHMgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNhbWVsQ2FzZSDjg5fjg63jg5Hjg4bjgqPlkI3jgYvjgonjg47jg7zjg4nlkI3jga7lgJnoo5zjgpLnlJ/miJDjgIJcclxuICAgICAqIGNsb3NlQnV0dG9uIOKGkiBbXCJDbG9zZUJ1dHRvblwiLCBcImNsb3NlQnV0dG9uXCJdXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcHJvcGVydHlOYW1lVG9Ob2RlTmFtZXMocHJvcE5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgICAgICBjb25zdCBwYXNjYWwgPSBwcm9wTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHByb3BOYW1lLnNsaWNlKDEpO1xyXG4gICAgICAgIGNvbnN0IG5hbWVzID0gW3Bhc2NhbF07XHJcbiAgICAgICAgaWYgKHBhc2NhbCAhPT0gcHJvcE5hbWUpIG5hbWVzLnB1c2gocHJvcE5hbWUpO1xyXG4gICAgICAgIHJldHVybiBuYW1lcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5KHV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g44Kz44Oz44Od44O844ON44Oz44OI44Gu44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6XXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFt1dWlkXSk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUluZm8/LnN1Y2Nlc3MgfHwgIW5vZGVJbmZvPy5kYXRhPy5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBOb2RlICR7dXVpZH0gbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgY29tcE5hbWUgPSBjb21wb25lbnRUeXBlLnJlcGxhY2UoXCJjYy5cIiwgXCJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IG5vZGVJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kSW5kZXgoKGM6IGFueSkgPT4gYy50eXBlID09PSBjb21wTmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChjb21wSW5kZXggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZSAke3V1aWR9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHNjZW5lOnNldC1wcm9wZXJ0eSDjgafjg5fjg63jg5Hjg4bjgqPlpInmm7TvvIhQcmVmYWLkv53lrZjmmYLjgavjgoLlj43mmKDjgZXjgozjgovvvIlcclxuICAgICAgICAgICAgLy8g44OR44K55b2i5byPOiBfX2NvbXBzX18ue2luZGV4fS57cHJvcGVydHl9XHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BlcnR5fWA7XHJcblxyXG4gICAgICAgICAgICAvLyDjg5fjg63jg5Hjg4bjgqPjga7lnovmg4XloLHjgpJxdWVyeS1ub2Rl44GL44KJ5Y+W5b6X44GX44Gm44CB6YGp5YiH44GqZHVtcOW9ouW8j+OCkuani+eviVxyXG4gICAgICAgICAgICBjb25zdCBkdW1wID0gYXdhaXQgdGhpcy5idWlsZER1bXBXaXRoVHlwZUluZm8odXVpZCwgcGF0aCwgdmFsdWUpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFt1dWlkLCBwYXRoLCBkdW1wXSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjYy5XaWRnZXQg44GuIGlzQWxpZ24qIOioreWumuW+jOOBryBfYWxpZ25GbGFncyDjgpLlho3oqIjnrpfjgZnjgotcclxuICAgICAgICAgICAgLy8gKEVkaXRvciDjgYwgaXNBbGlnbiog5aSJ5pu05pmC44GrIF9hbGlnbkZsYWdzIOOCkuiHquWLleabtOaWsOOBl+OBquOBhOODkOOCsOOBruWvvuWHpilcclxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgPT09IFwiY2MuV2lkZ2V0XCIgJiYgcHJvcGVydHkuc3RhcnRzV2l0aChcImlzQWxpZ25cIikpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVjYWxjV2lkZ2V0QWxpZ25GbGFncyh1dWlkLCBjb21wSW5kZXgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBwYXRoLCBkdW1wLCByZXN1bHQgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydGllcyh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydGllczogQXJyYXk8e3Byb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnl9Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50VHlwZSkgcmV0dXJuIGVycihcImNvbXBvbmVudFR5cGUgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgIGlmICghcHJvcGVydGllcy5sZW5ndGgpIHJldHVybiBlcnIoXCJwcm9wZXJ0aWVzIGFycmF5IGlzIGVtcHR5XCIpO1xyXG5cclxuICAgICAgICAgICAgLy8g44Kz44Oz44Od44O844ON44Oz44OI44Gu44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6X77yIMeWbnuOBoOOBke+8iVxyXG4gICAgICAgICAgICBjb25zdCBub2RlSW5mbyA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXROb2RlSW5mb1wiLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVJbmZvPy5zdWNjZXNzIHx8ICFub2RlSW5mbz8uZGF0YT8uY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgTm9kZSAke3V1aWR9IG5vdCBmb3VuZCBvciBoYXMgbm8gY29tcG9uZW50c2ApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBOYW1lID0gY29tcG9uZW50VHlwZS5yZXBsYWNlKFwiY2MuXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBub2RlSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZEluZGV4KChjOiBhbnkpID0+IGMudHlwZSA9PT0gY29tcE5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoY29tcEluZGV4IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGUgJHt1dWlkfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHsgcHJvcGVydHksIHZhbHVlIH0gb2YgcHJvcGVydGllcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LiR7cHJvcGVydHl9YDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGR1bXAgPSBhd2FpdCB0aGlzLmJ1aWxkRHVtcFdpdGhUeXBlSW5mbyh1dWlkLCBwYXRoLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIHBhdGgsIGR1bXBdKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5LCBzdWNjZXNzOiByZXN1bHQ/LnN1Y2Nlc3MgIT09IGZhbHNlLCBwYXRoIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbGxPayA9IHJlc3VsdHMuZXZlcnkociA9PiByLnN1Y2Nlc3MpO1xyXG5cclxuICAgICAgICAgICAgLy8gY2MuV2lkZ2V0IOOBriBpc0FsaWduKiDoqK3lrprlvozjga8gX2FsaWduRmxhZ3Mg44KS5YaN6KiI566X44GZ44KLXHJcbiAgICAgICAgICAgIC8vIChFZGl0b3Ig44GMIGlzQWxpZ24qIOWkieabtOaZguOBqyBfYWxpZ25GbGFncyDjgpLoh6rli5Xmm7TmlrDjgZfjgarjgYTjg5DjgrDjga7lr77lh6YpXHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRUeXBlID09PSBcImNjLldpZGdldFwiICYmIHByb3BlcnRpZXMuc29tZShwID0+IHAucHJvcGVydHkuc3RhcnRzV2l0aChcImlzQWxpZ25cIikpKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlY2FsY1dpZGdldEFsaWduRmxhZ3ModXVpZCwgY29tcEluZGV4KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogYWxsT2ssIHJlc3VsdHMgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2MuV2lkZ2V0IOOBriBpc0FsaWduKiDjg5fjg63jg5Hjg4bjgqPnj77lnKjlgKTjgYvjgokgX2FsaWduRmxhZ3Mg44OT44OD44OI44Oe44K544Kv44KS5YaN6KiI566X44GX44Gm6Kit5a6a44GZ44KL44CCXHJcbiAgICAgKlxyXG4gICAgICogQ29jb3NDcmVhdG9yIEVkaXRvciDjga8gaXNBbGlnbiog44KSIHNldFByb3BlcnR5VmlhRWRpdG9yIOOBp+WkieabtOOBl+OBpuOCglxyXG4gICAgICogX2FsaWduRmxhZ3Mg44KS6Ieq5YuV5pu05paw44GX44Gq44GE44OQ44Kw44GM44GC44KL44CC44GT44Gu44OY44Or44OR44O844Gn5piO56S655qE44Gr5ZCM5pyf44GZ44KL44CCXHJcbiAgICAgKlxyXG4gICAgICogX2FsaWduRmxhZ3Mg44OT44OD44OI5a6a576pOlxyXG4gICAgICogICBpc0FsaWduTGVmdD0xLCBpc0FsaWduUmlnaHQ9MiwgaXNBbGlnblRvcD00LCBpc0FsaWduQm90dG9tPTgsXHJcbiAgICAgKiAgIGlzQWxpZ25Ib3Jpem9udGFsQ2VudGVyPTE2LCBpc0FsaWduVmVydGljYWxDZW50ZXI9MzJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyByZWNhbGNXaWRnZXRBbGlnbkZsYWdzKHV1aWQ6IHN0cmluZywgd0lkeDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgY29uc3QgQUxJR05fQklUUzogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuICAgICAgICAgICAgaXNBbGlnbkxlZnQ6IDEsIGlzQWxpZ25SaWdodDogMiwgaXNBbGlnblRvcDogNCwgaXNBbGlnbkJvdHRvbTogOCxcclxuICAgICAgICAgICAgaXNBbGlnbkhvcml6b250YWxDZW50ZXI6IDE2LCBpc0FsaWduVmVydGljYWxDZW50ZXI6IDMyLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUR1bXAgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ub2RlXCIsIHV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEdW1wKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IHdDb21wRHVtcCA9IG5vZGVEdW1wLl9fY29tcHNfXz8uW3dJZHhdO1xyXG4gICAgICAgICAgICBpZiAoIXdDb21wRHVtcCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBsZXQgYWxpZ25GbGFncyA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgYml0XSBvZiBPYmplY3QuZW50cmllcyhBTElHTl9CSVRTKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHdDb21wRHVtcC52YWx1ZT8uW2tleV0/LnZhbHVlID09PSB0cnVlKSBhbGlnbkZsYWdzIHw9IGJpdDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke3dJZHh9Ll9hbGlnbkZsYWdzYDtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFt1dWlkLCBwYXRoLCB7IHZhbHVlOiBhbGlnbkZsYWdzLCB0eXBlOiBcIk51bWJlclwiIH1dKTtcclxuICAgICAgICB9IGNhdGNoIChfZSkge1xyXG4gICAgICAgICAgICAvLyBfYWxpZ25GbGFncyDlho3oqIjnrpfjga7lpLHmlZfjga/oh7Tlkb3nmoTjgafjgarjgYTjgZ/jgoHnhKHoppZcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDjg5fjg63jg5Hjg4bjgqPjga7lnovmg4XloLHjgpJFZGl0b3IgQVBJ44GL44KJ5Y+W5b6X44GX44CB6YGp5YiH44GqZHVtcOW9ouW8j+OCkuani+evieOBmeOCi+OAglxyXG4gICAgICpcclxuICAgICAqIFVVSUTmloflrZfliJfjgYzmuKHjgZXjgozjgZ/loLTlkIjjgIHjg5fjg63jg5Hjg4bjgqPjga7lnovjgavlv5zjgZjjgaY6XHJcbiAgICAgKiAtIE5vZGUvQ29tcG9uZW505Y+C54Wn5Z6LIOKGkiB7dHlwZTogcHJvcFR5cGUsIHZhbHVlOiB7dXVpZDogbm9kZVV1aWR9fVxyXG4gICAgICogLSBBc3NldOWPgueFp+Wei++8iGNjLlByZWZhYuetie+8iSDihpIge3R5cGU6IHByb3BUeXBlLCB2YWx1ZToge3V1aWQ6IGFzc2V0VXVpZH19XHJcbiAgICAgKiAtIFN0cmluZ+WeiyDihpIge3ZhbHVlLCB0eXBlOiBcIlN0cmluZ1wifVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkRHVtcFdpdGhUeXBlSW5mbyhub2RlVXVpZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIC8vIOODl+ODquODn+ODhuOCo+ODluWei+OBr+OBneOBruOBvuOBvlxyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHJldHVybiB7IHZhbHVlLCB0eXBlOiBcIk51bWJlclwiIH07XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIpIHJldHVybiB7IHZhbHVlLCB0eXBlOiBcIkJvb2xlYW5cIiB9O1xyXG5cclxuICAgICAgICAvLyB2Mi4wLjA6IHtwYXRoOiBcImRiOi8vLi4uXCJ9IC8ge2d1aWQ6IFwiLi4uXCJ9IOOCquODluOCuOOCp+OCr+ODiOW9ouW8jyDigJQgQXNzZXQg5Y+C54Wn44KSIHBhdGgvZ3VpZCDjgafmuKHjgZnmlrnms5VcclxuICAgICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlLnBhdGggPT09IFwic3RyaW5nXCIgJiYgdmFsdWUucGF0aC5zdGFydHNXaXRoKFwiZGI6Ly9cIikpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkVXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZEJ5UGF0aCh2YWx1ZS5wYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzb2x2ZWRVdWlkKSB0aHJvdyBuZXcgRXJyb3IoYEFzc2V0IG5vdCBmb3VuZCBhdCBwYXRoOiAke3ZhbHVlLnBhdGh9YCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlLnR5cGUgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiB2YWx1ZS50eXBlLCB2YWx1ZTogeyB1dWlkOiByZXNvbHZlZFV1aWQgfSB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSByZXNvbHZlZFV1aWQ7IC8vIOS7pemZjeOAgeaWh+Wtl+WIl+OBqOOBl+OBpuWei+ino+axuue1jOi3r+OBuFxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS5ndWlkID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlLnR5cGUgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiB2YWx1ZS50eXBlLCB2YWx1ZTogeyB1dWlkOiB2YWx1ZS5ndWlkIH0gfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuZ3VpZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g44Kq44OW44K444Kn44Kv44OI5b2i5byPIHt1dWlkOiBcInh4eFwiLCB0eXBlOiBcImNjLk5vZGVcIn0g44Gv44Gd44Gu44G+44G+XHJcbiAgICAgICAgLy8gdHlwZSDmjIflrprjgarjgZfjga4ge3V1aWQ6IFwieHh4XCJ9IOOBr+ODl+ODreODkeODhuOCo+OBruWun+mam+OBruWei+OCkuino+axuuOBmeOCi+OBn+OCgeaWh+Wtl+WIl+aJseOBhOOBq+WkieaPm+OBmeOCi1xyXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlLnV1aWQgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZS50eXBlID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiB2YWx1ZS50eXBlLCB2YWx1ZTogeyB1dWlkOiB2YWx1ZS51dWlkIH0gfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyB0eXBlIOacquaMh+Wumjog5paH5a2X5YiX44Go44GX44Gm5Yem55CG44GX44Gm44OX44Ot44OR44OG44Kj5Z6L44GL44KJ6Kej5rG6XHJcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudXVpZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEBwYXRoOiDjg5fjg6zjg5XjgqPjg4Pjgq/jgrnjga7loLTlkIg6IOODkeOCueOBi+OCieODjuODvOODiVVVSUTjgpLop6PmsbpcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlLnN0YXJ0c1dpdGgoXCJAcGF0aDpcIikpIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZVBhdGggPSB2YWx1ZS5zbGljZSg2KTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImZpbmROb2RlQnlQYXRoXCIsIFtub2RlUGF0aF0pO1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0Py5zdWNjZXNzICYmIHJlc3VsdC5kYXRhPy51dWlkKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHJlc3VsdC5kYXRhLnV1aWQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vZGUgbm90IGZvdW5kIGF0IHBhdGg6ICR7bm9kZVBhdGh9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHYyLjAuMDogZGI6Ly8g5aeL44G+44KK44Gu5paH5a2X5YiX44GvIEFzc2V0IHBhdGgg44Go44GX44GmIFVVSUQg44Gr6Ieq5YuV6Kej5rG6XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZS5zdGFydHNXaXRoKFwiZGI6Ly9cIikpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkQnlQYXRoKHZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKCFyZXNvbHZlZFV1aWQpIHRocm93IG5ldyBFcnJvcihgQXNzZXQgbm90IGZvdW5kIGF0IHBhdGg6ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgICAgIHZhbHVlID0gcmVzb2x2ZWRVdWlkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g5paH5a2X5YiX44Gu5aC05ZCIOiDjg5fjg63jg5Hjg4bjgqPjga7lnovmg4XloLHjgpLlj5blvpfjgZfjgabliKTlrppcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGVcIiwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGVEdW1wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcER1bXAgPSB0aGlzLnJlc29sdmVEdW1wUGF0aChub2RlRHVtcCwgcGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BEdW1wPy50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BUeXBlID0gcHJvcER1bXAudHlwZSBhcyBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuZHNBcnIgPSAocHJvcER1bXAuZXh0ZW5kcyB8fCBbXSkgYXMgc3RyaW5nW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29tcG9uZW50UmVmID0gZXh0ZW5kc0Fyci5pbmNsdWRlcyhcImNjLkNvbXBvbmVudFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNOb2RlUmVmID0gcHJvcFR5cGUgPT09IFwiY2MuTm9kZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0Fzc2V0UmVmID0gZXh0ZW5kc0Fyci5pbmNsdWRlcyhcImNjLkFzc2V0XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcG9uZW50UmVmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDjgrPjg7Pjg53jg7zjg43jg7Pjg4jlj4Lnhac6IOODjuODvOODiVVVSUTjgYvjgonjgrPjg7Pjg53jg7zjg43jg7Pjg4hVVUlE44KS6Kej5rG6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUNvbXBvbmVudFV1aWQodmFsdWUsIHByb3BUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHByb3BUeXBlLCB2YWx1ZTogeyB1dWlkOiBjb21wVXVpZCB8fCB2YWx1ZSB9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZVJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcHJvcFR5cGUsIHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBc3NldFJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcHJvcFR5cGUsIHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB2Mi4wLjA6IEVudW0g5ZCNIOKGkiDmlbDlgKTlpInmj5sgKExheW91dC50eXBlPVwiSE9SSVpPTlRBTFwiIOetiSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BUeXBlID09PSBcIkVudW1cIiAmJiBBcnJheS5pc0FycmF5KHByb3BEdW1wLmVudW1MaXN0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHByb3BEdW1wLmVudW1MaXN0LmZpbmQoKGU6IGFueSkgPT4gZT8ubmFtZSA9PT0gdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgdHlwZW9mIGl0ZW0udmFsdWUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogaXRlbS52YWx1ZSwgdHlwZTogXCJFbnVtXCIgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWQjeWJjeOBp+imi+OBpOOBi+OCieOBquOBhOWgtOWQiOOBr+aVsOWApOOBqOOBl+OBpuino+mHiOOCkuippuOBv+OCiyAo5b6M5pa55LqS5o+bKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNOdW0gPSBOdW1iZXIodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFOdW1iZXIuaXNOYU4oYXNOdW0pKSByZXR1cm4geyB2YWx1ZTogYXNOdW0sIHR5cGU6IFwiRW51bVwiIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVudW0gdmFsdWUgXCIke3ZhbHVlfVwiIG5vdCBmb3VuZCBpbiBlbnVtTGlzdDogJHtwcm9wRHVtcC5lbnVtTGlzdC5tYXAoKGU6IGFueSkgPT4gZT8ubmFtZSkuam9pbihcIiwgXCIpfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIC8vIEVudW0g44Gn5ZCN5YmN5LiN5LiA6Ie044Gv5piO56S655qE44GrIHRocm93IOOBmeOCiyAo5LiK44GnIHRocm93IOOBl+OBn+WgtOWQiClcclxuICAgICAgICAgICAgICAgIGlmIChlPy5tZXNzYWdlPy5zdGFydHNXaXRoKFwiRW51bSB2YWx1ZSBcIikpIHRocm93IGU7XHJcbiAgICAgICAgICAgICAgICAvLyBxdWVyeS1ub2Rl5aSx5pWX5pmC44Gv44OV44Kp44O844Or44OQ44OD44KvXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUsIHR5cGU6IFwiU3RyaW5nXCIgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHYyLjAuMDogY2MuVmVjMi9WZWMzL1ZlYzQvQ29sb3IvU2l6ZSDjga7lgKTlnovjgpLnsKHmmJPjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgZHVtcCDnlJ/miJBcclxuICAgICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZUR1bXAgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ub2RlXCIsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlRHVtcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BEdW1wID0gdGhpcy5yZXNvbHZlRHVtcFBhdGgobm9kZUR1bXAsIHBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BUeXBlID0gcHJvcER1bXA/LnR5cGUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1aWxkZXIgPSBWQUxVRV9UWVBFX0JVSUxERVJTW3Byb3BUeXBlID8/IFwiXCJdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWlsZGVyKSByZXR1cm4gYnVpbGRlcih2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7IC8qIGZhbGx0aHJvdWdoICovIH1cclxuXHJcbiAgICAgICAgICAgIC8vIOaXouWtmOaMmeWLlTog44OX44Ot44OR44OG44Kj5Z6L44GM6Kej5rG644Gn44GN44Gq44GE5aC05ZCI44Gv5ZCE44Kt44O844KSIHt2YWx1ZTogdn0g44GnIHdyYXBcclxuICAgICAgICAgICAgY29uc3Qgd3JhcHBlZDogYW55ID0ge307XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgd3JhcHBlZFtrXSA9IHsgdmFsdWU6IHYgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogd3JhcHBlZCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdmFsdWUgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHF1ZXJ5LW5vZGXjga5kdW1w44GL44KJ44OJ44OD44OI44OR44K544Gn44OX44Ot44OR44OG44Kj44KS6Kej5rG644GZ44KL44CCXHJcbiAgICAgKiDkvos6IFwiX19jb21wc19fLjIuc2Nyb2xsVmlld1wiIOKGkiBub2RlRHVtcC5fX2NvbXBzX19bMl0udmFsdWUuc2Nyb2xsVmlld1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHJlc29sdmVEdW1wUGF0aChub2RlRHVtcDogYW55LCBwYXRoOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IHBhcnRzID0gcGF0aC5zcGxpdChcIi5cIik7XHJcbiAgICAgICAgbGV0IGN1cnJlbnQgPSBub2RlRHVtcDtcclxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcclxuICAgICAgICAgICAgaWYgKCFjdXJyZW50KSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHBhcnQgPT09IFwiX19jb21wc19fXCIpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50Ll9fY29tcHNfXztcclxuICAgICAgICAgICAgfSBlbHNlIGlmICgvXlxcZCskLy50ZXN0KHBhcnQpKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudFtwYXJzZUludChwYXJ0KV0/LnZhbHVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQ/LltwYXJ0XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY3VycmVudDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2V0IHBhdGggKGRiOi8vLi4uKSDjgYvjgokgYXNzZXQgVVVJRCDjgpLop6PmsbrjgZnjgovjgILjgrXjg5bjgqLjgrvjg4Pjg4jmjIflrpogKEBzcHJpdGVGcmFtZSDnrYkpXHJcbiAgICAgKiDjgoLjgZ3jga7jgb7jgb4gcXVlcnktdXVpZCDjgavmipXjgZLjgovjgILlpLHmlZfmmYLjga8gbnVsbCDjgpLov5TjgZnjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNvbHZlQXNzZXRVdWlkQnlQYXRoKGFzc2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdXVpZCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInF1ZXJ5LXV1aWRcIiwgYXNzZXRQYXRoKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB1dWlkID09PSBcInN0cmluZ1wiICYmIHV1aWQubGVuZ3RoID4gMCkgcmV0dXJuIHV1aWQ7XHJcbiAgICAgICAgfSBjYXRjaCAoX2UpIHsgLyogZmFsbHRocm91Z2ggKi8gfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog44OO44O844OJVVVJROOBi+OCieOCs+ODs+ODneODvOODjeODs+ODiFVVSUTjgpLop6PmsbrjgZnjgovjgIJcclxuICAgICAqIHByb3BUeXBl77yI5L6LOiBcImNjLlNjcm9sbFZpZXdcIiwgXCJNaXNzaW9uTGlzdFBhbmVsXCLvvInjgavkuIDoh7TjgZnjgovjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgpLmjqLjgZnjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNvbHZlQ29tcG9uZW50VXVpZChub2RlVXVpZDogc3RyaW5nLCBwcm9wVHlwZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW25vZGVVdWlkXSk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUluZm8/LnN1Y2Nlc3MgfHwgIW5vZGVJbmZvPy5kYXRhPy5jb21wb25lbnRzKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgY29uc3QgdHlwZU5hbWUgPSBwcm9wVHlwZS5yZXBsYWNlKFwiY2MuXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZUluZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGM6IGFueSkgPT4gYy50eXBlID09PSB0eXBlTmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb21wPy51dWlkIHx8IG51bGw7XHJcbiAgICAgICAgfSBjYXRjaCAoX2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTY3JpcHQobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBFWFRfTkFNRSxcclxuICAgICAgICAgICAgbWV0aG9kLFxyXG4gICAgICAgICAgICBhcmdzLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==