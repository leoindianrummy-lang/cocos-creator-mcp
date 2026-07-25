"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTools = void 0;
const tool_base_1 = require("../tool-base");
const utils_1 = require("../utils");
const node_resolve_1 = require("../node-resolve");
const screenshot_1 = require("../screenshot");
const EXT_NAME = "cocos-creator-mcp";
class NodeTools {
    constructor() {
        this.categoryName = "node";
    }
    getTools() {
        return [
            {
                name: "node_manage",
                description: "Node lifecycle operations. Actions: 'create' (name [+ parent + components[]]), 'delete' (uuid), 'duplicate' (uuid), 'move' (uuid, parent). For property edits use node_set_property / node_set_transform / node_set_active / node_set_layout. For node-tree construction use node_create_tree.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'create' | 'delete' | 'duplicate' | 'move'" },
                        name: { type: "string", description: "Node name (action=create)" },
                        parent: { type: "string", description: "Parent node UUID (action=create [optional] | action=move [required])" },
                        components: {
                            type: "array",
                            items: { type: "string" },
                            description: "Component class names to add on create (e.g. ['cc.Label', 'cc.Sprite'])",
                        },
                        uuid: { type: "string", description: "Target node UUID (action=delete|duplicate|move)" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "node_get_info",
                description: "Get detailed information about a node by UUID, including components.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                    },
                    required: ["uuid"],
                },
            },
            {
                name: "node_find_by_name",
                description: "Find all nodes matching a given name.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Node name to search" },
                    },
                    required: ["name"],
                },
            },
            {
                name: "node_set_property",
                description: "Set a property on a node (name, active, position, rotation, scale, etc.).",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                        property: { type: "string", description: "Property name (e.g. 'name', 'active', 'position')" },
                        value: { description: "Value to set. For position/rotation/scale use {x,y,z}." },
                    },
                    required: ["uuid", "property", "value"],
                },
            },
            {
                name: "node_set_transform",
                description: "Set position, rotation, and/or scale of a node at once.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                        position: {
                            type: "object",
                            properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } },
                            description: "Position {x,y,z}",
                        },
                        rotation: {
                            type: "object",
                            properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } },
                            description: "Euler rotation {x,y,z}",
                        },
                        scale: {
                            type: "object",
                            properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } },
                            description: "Scale {x,y,z}",
                        },
                    },
                    required: ["uuid"],
                },
            },
            {
                name: "node_get_all",
                description: "Get a flat list of all nodes in the current scene.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "node_set_active",
                description: "Set a node's active (visible) state.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                        active: { type: "boolean", description: "Whether the node is active" },
                    },
                    required: ["uuid", "active"],
                },
            },
            {
                name: "node_detect_type",
                description: "Detect node type (2D, 3D, or regular Node) based on its components.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID" },
                    },
                    required: ["uuid"],
                },
            },
            {
                name: "node_create_tree",
                description: "Create a full node tree from a JSON spec in one call. Much faster than creating nodes one by one. Spec format: { name, components?: ['cc.UITransform'], properties?: {'cc.UITransform.contentSize': {width:720,height:1280}}, widget?: {top:0, bottom:0, left:0, right:0}, active?: bool, position?: {x,y,z}, children?: [...] }",
                inputSchema: {
                    type: "object",
                    properties: {
                        parent: { type: "string", description: "Parent node UUID" },
                        spec: { description: "Node tree specification (JSON object with name, components, properties, children)" },
                    },
                    required: ["parent", "spec"],
                },
            },
            {
                name: "node_set_layout",
                description: "Set UITransform (contentSize, anchorPoint) and Widget (margins) on a node in one call. Much faster than calling component_set_property multiple times for layout adjustments. Set screenshot=true to capture the editor after changes.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID (either uuid or nodeName required)" },
                        nodeName: { type: "string", description: "Node name to find (alternative to uuid)" },
                        contentSize: {
                            type: "object",
                            properties: { width: { type: "number" }, height: { type: "number" } },
                            description: "UITransform contentSize {width, height}",
                        },
                        anchorPoint: {
                            type: "object",
                            properties: { x: { type: "number" }, y: { type: "number" } },
                            description: "UITransform anchorPoint {x, y} (0-1)",
                        },
                        widget: {
                            type: "object",
                            properties: {
                                top: { type: "number" }, bottom: { type: "number" },
                                left: { type: "number" }, right: { type: "number" },
                                horizontalCenter: { type: "number" }, verticalCenter: { type: "number" },
                                isAlignTop: { type: "boolean" }, isAlignBottom: { type: "boolean" },
                                isAlignLeft: { type: "boolean" }, isAlignRight: { type: "boolean" },
                                isAlignHorizontalCenter: { type: "boolean" }, isAlignVerticalCenter: { type: "boolean" },
                            },
                            description: "Widget alignment margins. Setting a value (e.g. top:0) automatically enables the corresponding alignment (isAlignTop:true).",
                        },
                        color: {
                            type: "object",
                            properties: { r: { type: "number" }, g: { type: "number" }, b: { type: "number" }, a: { type: "number" } },
                            description: "Node color {r,g,b,a} (0-255)",
                        },
                        opacity: { type: "number", description: "Node opacity (0-255)" },
                        screenshot: { type: "boolean", description: "If true, capture editor screenshot after changes (default: false)" },
                    },
                },
            },
        ];
    }
    async execute(toolName, args) {
        var _a;
        const rejected = await this.rejectIfPreviewRunning(toolName);
        if (rejected)
            return rejected;
        switch (toolName) {
            case "node_manage":
                return this.handleManage(args);
            case "node_get_info":
                return this.getNodeInfo(args.uuid);
            case "node_find_by_name":
                return this.findByName(args.name);
            case "node_set_property":
                return this.setProperty(args.uuid, args.property, (0, utils_1.parseMaybeJson)(args.value));
            case "node_set_transform":
                return this.setTransform(args.uuid, args.position, args.rotation, args.scale);
            case "node_get_all":
                return this.getAllNodes();
            case "node_set_active":
                return this.setProperty(args.uuid, "active", args.active);
            case "node_create_tree":
                return this.createNodeTree(args.parent, (0, utils_1.parseMaybeJson)(args.spec));
            case "node_set_layout":
                return this.setLayout(args);
            case "node_detect_type": {
                try {
                    const info = await this.sceneScript("getNodeInfo", [args.uuid]);
                    if (!info.success)
                        return (0, tool_base_1.ok)(info);
                    const comps = ((_a = info.data) === null || _a === void 0 ? void 0 : _a.components) || [];
                    const compTypes = comps.map((c) => c.type);
                    let nodeType = "Node";
                    if (compTypes.includes("UITransform"))
                        nodeType = "2D";
                    else if (compTypes.includes("MeshRenderer") || compTypes.includes("Camera"))
                        nodeType = "3D";
                    return (0, tool_base_1.ok)({ success: true, uuid: args.uuid, nodeType, components: compTypes });
                }
                catch (e) {
                    return (0, tool_base_1.err)(e.message || String(e));
                }
            }
            default:
                return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
        }
    }
    /** node_manage dispatcher (v2.0.0). */
    async handleManage(args) {
        switch (args.action) {
            case "create":
                if (!args.name)
                    return (0, tool_base_1.err)("node_manage(create): 'name' is required");
                return this.createNode(args.name, args.parent, args.components);
            case "delete":
                if (!args.uuid)
                    return (0, tool_base_1.err)("node_manage(delete): 'uuid' is required");
                return this.deleteNode(args.uuid);
            case "duplicate":
                if (!args.uuid)
                    return (0, tool_base_1.err)("node_manage(duplicate): 'uuid' is required");
                return this.duplicateNode(args.uuid);
            case "move":
                if (!args.uuid)
                    return (0, tool_base_1.err)("node_manage(move): 'uuid' is required");
                if (!args.parent)
                    return (0, tool_base_1.err)("node_manage(move): 'parent' is required");
                return this.moveNode(args.uuid, args.parent);
            default:
                return (0, tool_base_1.err)(`Unknown node_manage action: ${args.action}. Expected create / delete / duplicate / move.`);
        }
    }
    async rejectIfPreviewRunning(toolName) {
        if (!NodeTools.SCENE_EDIT_TOOLS.has(toolName))
            return null;
        try {
            const state = await Editor.Message.request("preview", "query-info");
            if (state && state.running) {
                return (0, tool_base_1.err)(`"${toolName}" はプレビュー中に実行できません。先にプレビューを停止してください。`);
            }
        }
        catch ( /* query failed — allow execution */_a) { /* query failed — allow execution */ }
        return null;
    }
    async createNode(name, parent, components) {
        try {
            // Use Editor API to create node
            const uuid = await Editor.Message.request("scene", "create-node", {
                parent: parent || undefined,
                name,
                assetUuid: undefined,
            });
            // Wait until the node is queryable in the scene process
            await this.waitForNode(uuid);
            // Add components if specified
            if (components && components.length > 0) {
                for (const comp of components) {
                    await this.sceneScript("addComponentToNode", [uuid, comp]);
                    // Wait until the component is reflected in query-node
                    await this.waitForComponent(uuid, comp);
                }
            }
            return (0, tool_base_1.ok)({ success: true, uuid, name });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * Wait until a node becomes queryable in the scene process.
     * Editor.Message.request("scene", "create-node") returns before the node
     * is fully registered in the scene hierarchy, so subsequent scene script
     * calls (findNode) may fail without this wait.
     */
    async waitForNode(uuid, maxRetries = 10, intervalMs = 100) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await this.sceneScript("getNodeInfo", [uuid]);
                if (result === null || result === void 0 ? void 0 : result.success)
                    return;
            }
            catch ( /* not ready yet */_a) { /* not ready yet */ }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        // Don't throw — let the caller proceed and get a more specific error if needed
    }
    /**
     * Wait until a component added via addComponentToNode is reflected in query-node.
     * sceneScript returns before the Editor API (query-node) reflects the change,
     * so polling is needed to avoid race conditions in subsequent tool calls.
     */
    async waitForComponent(nodeUuid, componentType, maxRetries = 10, intervalMs = 100) {
        const normalizedType = componentType.startsWith("cc.") ? componentType.substring(3) : componentType;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const nodeDump = await Editor.Message.request("scene", "query-node", nodeUuid);
                const comps = (nodeDump === null || nodeDump === void 0 ? void 0 : nodeDump.__comps__) || [];
                const found = comps.some((c) => c.type === componentType || c.type === `cc.${normalizedType}` || c.type === normalizedType);
                if (found)
                    return;
            }
            catch ( /* not ready yet */_a) { /* not ready yet */ }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        // Don't throw — component may still work; let caller get a specific error if needed
    }
    async createNodeTree(parentUuid, spec) {
        try {
            const result = await this.sceneScript("buildNodeTree", [parentUuid, spec]);
            if (!(result === null || result === void 0 ? void 0 : result.success))
                return (0, tool_base_1.err)((result === null || result === void 0 ? void 0 : result.error) || "buildNodeTree failed");
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getNodeInfo(uuid) {
        try {
            const result = await this.sceneScript("getNodeInfo", [uuid]);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async findByName(name) {
        try {
            const result = await this.sceneScript("findNodesByName", [name]);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async setProperty(uuid, property, value) {
        try {
            const result = await this.sceneScript("setNodeProperty", [uuid, property, value]);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async setTransform(uuid, position, rotation, scale) {
        try {
            const results = [];
            if (position) {
                results.push(await this.sceneScript("setNodeProperty", [uuid, "position", position]));
            }
            if (rotation) {
                results.push(await this.sceneScript("setNodeProperty", [uuid, "rotation", rotation]));
            }
            if (scale) {
                results.push(await this.sceneScript("setNodeProperty", [uuid, "scale", scale]));
            }
            const anyFailed = results.find((r) => !r.success);
            if (anyFailed)
                return (0, tool_base_1.ok)(anyFailed);
            return (0, tool_base_1.ok)({ success: true, uuid });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async deleteNode(uuid) {
        try {
            await Editor.Message.request("scene", "remove-node", { uuid });
            return (0, tool_base_1.ok)({ success: true, uuid });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async moveNode(uuid, parentUuid) {
        try {
            await Editor.Message.request("scene", "set-property", {
                uuid,
                path: "parent",
                dump: { type: "cc.Node", value: { uuid: parentUuid } },
            });
            return (0, tool_base_1.ok)({ success: true, uuid, parentUuid });
        }
        catch (e) {
            // Fallback: try scene script
            try {
                const result = await this.sceneScript("moveNode", [uuid, parentUuid]);
                return (0, tool_base_1.ok)(result);
            }
            catch (e2) {
                return (0, tool_base_1.err)(e.message || String(e));
            }
        }
    }
    async duplicateNode(uuid) {
        try {
            const result = await Editor.Message.request("scene", "duplicate-node", uuid);
            // duplicate-node returns an array of UUIDs
            const newUuid = Array.isArray(result) ? result[0] : result;
            return (0, tool_base_1.ok)({ success: true, sourceUuid: uuid, newUuid });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getAllNodes() {
        try {
            const result = await this.sceneScript("getAllNodes", []);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * UITransform + Widget + color/opacity をまとめて設定する。
     * Widget の値を指定すると、対応する isAlign* フラグを自動で true にする。
     */
    async setLayout(args) {
        var _a, _b, _c, _d, _f, _g, _h, _j;
        try {
            // nodeName → uuid 解決
            let uuid = args.uuid;
            if (!uuid && args.nodeName) {
                const resolved = await (0, node_resolve_1.resolveNodeUuid)({ nodeName: args.nodeName });
                uuid = resolved.uuid;
            }
            if (!uuid)
                return (0, tool_base_1.err)("Either 'uuid' or 'nodeName' is required");
            const results = [];
            // UITransform の設定
            const contentSize = (0, utils_1.parseMaybeJson)(args.contentSize);
            const anchorPoint = (0, utils_1.parseMaybeJson)(args.anchorPoint);
            if (contentSize || anchorPoint) {
                const nodeInfo = await this.sceneScript("getNodeInfo", [uuid]);
                if (!(nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.success))
                    return (0, tool_base_1.err)(`Node ${uuid} not found`);
                const comps = ((_a = nodeInfo.data) === null || _a === void 0 ? void 0 : _a.components) || [];
                const utIdx = comps.findIndex((c) => c.type === "UITransform");
                if (utIdx < 0)
                    return (0, tool_base_1.err)("Node has no UITransform component");
                if (contentSize) {
                    const path = `__comps__.${utIdx}.contentSize`;
                    const dump = { value: { width: { value: contentSize.width }, height: { value: contentSize.height } } };
                    const r = await this.sceneScript("setPropertyViaEditor", [uuid, path, dump]);
                    results.push({ property: "contentSize", success: (r === null || r === void 0 ? void 0 : r.success) !== false });
                }
                if (anchorPoint) {
                    const path = `__comps__.${utIdx}.anchorPoint`;
                    const dump = { value: { x: { value: anchorPoint.x }, y: { value: anchorPoint.y } } };
                    const r = await this.sceneScript("setPropertyViaEditor", [uuid, path, dump]);
                    results.push({ property: "anchorPoint", success: (r === null || r === void 0 ? void 0 : r.success) !== false });
                }
            }
            // Widget の設定
            const widget = (0, utils_1.parseMaybeJson)(args.widget);
            if (widget) {
                // Widget コンポーネントを探す（なければ追加）
                let nodeInfo = await this.sceneScript("getNodeInfo", [uuid]);
                if (!(nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.success))
                    return (0, tool_base_1.err)(`Node ${uuid} not found`);
                let comps = ((_b = nodeInfo.data) === null || _b === void 0 ? void 0 : _b.components) || [];
                let wIdx = comps.findIndex((c) => c.type === "Widget");
                if (wIdx < 0) {
                    await this.sceneScript("addComponentToNode", [uuid, "cc.Widget"]);
                    // 再取得
                    nodeInfo = await this.sceneScript("getNodeInfo", [uuid]);
                    comps = ((_c = nodeInfo.data) === null || _c === void 0 ? void 0 : _c.components) || [];
                    wIdx = comps.findIndex((c) => c.type === "Widget");
                    if (wIdx < 0)
                        return (0, tool_base_1.err)("Failed to add Widget component");
                    results.push({ property: "Widget", action: "added" });
                }
                // isAlign* を自動設定（値があれば true にする）
                const alignMap = {
                    top: "isAlignTop", bottom: "isAlignBottom",
                    left: "isAlignLeft", right: "isAlignRight",
                    horizontalCenter: "isAlignHorizontalCenter",
                    verticalCenter: "isAlignVerticalCenter",
                };
                for (const [key, value] of Object.entries(widget)) {
                    // isAlign* を明示指定した場合はそのまま設定
                    const path = `__comps__.${wIdx}.${key}`;
                    if (typeof value === "boolean") {
                        const dump = { value, type: "Boolean" };
                        await this.sceneScript("setPropertyViaEditor", [uuid, path, dump]);
                        results.push({ property: `Widget.${key}`, success: true });
                    }
                    else if (typeof value === "number") {
                        // まず対応する isAlign* を true にする
                        const alignKey = alignMap[key];
                        if (alignKey && widget[alignKey] === undefined) {
                            const alignPath = `__comps__.${wIdx}.${alignKey}`;
                            await this.sceneScript("setPropertyViaEditor", [uuid, alignPath, { value: true, type: "Boolean" }]);
                        }
                        const dump = { value, type: "Number" };
                        await this.sceneScript("setPropertyViaEditor", [uuid, path, dump]);
                        results.push({ property: `Widget.${key}`, success: true });
                    }
                }
                // _alignFlags を isAlign* 現在値から再計算して設定
                // (Editor が isAlign* 変更時に _alignFlags を自動更新しないバグの対処)
                try {
                    const ALIGN_BITS = {
                        isAlignLeft: 1, isAlignRight: 2, isAlignTop: 4, isAlignBottom: 8,
                        isAlignHorizontalCenter: 16, isAlignVerticalCenter: 32,
                    };
                    const nodeDump = await Editor.Message.request("scene", "query-node", uuid);
                    if (nodeDump) {
                        const wCompDump = (_d = nodeDump.__comps__) === null || _d === void 0 ? void 0 : _d[wIdx];
                        if (wCompDump) {
                            let alignFlags = 0;
                            for (const [key, bit] of Object.entries(ALIGN_BITS)) {
                                if (((_g = (_f = wCompDump.value) === null || _f === void 0 ? void 0 : _f[key]) === null || _g === void 0 ? void 0 : _g.value) === true)
                                    alignFlags |= bit;
                            }
                            const flagPath = `__comps__.${wIdx}._alignFlags`;
                            await this.sceneScript("setPropertyViaEditor", [uuid, flagPath, { value: alignFlags, type: "Number" }]);
                            results.push({ property: "Widget._alignFlags", value: alignFlags });
                        }
                    }
                }
                catch (_e) {
                    // _alignFlags 再計算の失敗は致命的でないため無視
                }
            }
            // color
            const color = (0, utils_1.parseMaybeJson)(args.color);
            if (color) {
                const r = await this.sceneScript("setNodeProperty", [uuid, "color", color]);
                results.push({ property: "color", success: (r === null || r === void 0 ? void 0 : r.success) !== false });
            }
            // opacity
            if (args.opacity !== undefined) {
                // cc.UIOpacity を使う（なければ color.a で設定）
                const nodeInfo = await this.sceneScript("getNodeInfo", [uuid]);
                const comps = ((_h = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.data) === null || _h === void 0 ? void 0 : _h.components) || [];
                const opIdx = comps.findIndex((c) => c.type === "UIOpacity");
                if (opIdx >= 0) {
                    const path = `__comps__.${opIdx}.opacity`;
                    await this.sceneScript("setPropertyViaEditor", [uuid, path, { value: args.opacity, type: "Number" }]);
                    results.push({ property: "UIOpacity.opacity", success: true });
                }
                else {
                    // UIOpacity がない場合は color.a を直接設定
                    const currentColor = ((_j = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.data) === null || _j === void 0 ? void 0 : _j.color) || { r: 255, g: 255, b: 255, a: 255 };
                    currentColor.a = args.opacity;
                    const r = await this.sceneScript("setNodeProperty", [uuid, "color", currentColor]);
                    results.push({ property: "color.a", success: (r === null || r === void 0 ? void 0 : r.success) !== false });
                }
            }
            const allOk = results.every(r => r.success !== false);
            let response = { success: allOk, uuid, results };
            // screenshot
            if (args.screenshot) {
                try {
                    const ss = await (0, screenshot_1.takeEditorScreenshot)();
                    response.screenshot = { path: ss.path, size: ss.savedSize };
                }
                catch (ssErr) {
                    response.screenshotError = ssErr.message || String(ssErr);
                }
            }
            return (0, tool_base_1.ok)(response);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /** Call a scene script method */
    async sceneScript(method, args) {
        return Editor.Message.request("scene", "execute-scene-script", {
            name: EXT_NAME,
            method,
            args,
        });
    }
}
exports.NodeTools = NodeTools;
/** Scene editing tools that must not run during preview */
NodeTools.SCENE_EDIT_TOOLS = new Set([
    "node_manage",
    "node_set_property", "node_set_transform", "node_set_active",
    "node_create_tree", "node_set_layout",
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRDQUF1QztBQUN2QyxvQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xELDhDQUFxRDtBQUVyRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQztBQUVyQyxNQUFhLFNBQVM7SUFBdEI7UUFDYSxpQkFBWSxHQUFHLE1BQU0sQ0FBQztJQXVrQm5DLENBQUM7SUFya0JHLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLFdBQVcsRUFBRSxnU0FBZ1M7Z0JBQzdTLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNENBQTRDLEVBQUU7d0JBQ3JGLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJCQUEyQixFQUFFO3dCQUNsRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxzRUFBc0UsRUFBRTt3QkFDL0csVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ3pCLFdBQVcsRUFBRSx5RUFBeUU7eUJBQ3pGO3dCQUNELElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGlEQUFpRCxFQUFFO3FCQUMzRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLHNFQUFzRTtnQkFDbkYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29C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QUFDO1FBQ3hCLENBQUM7UUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFBLGVBQUcsRUFBQyxDQUFDLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7SUFDTCxDQUFDO0lBRUQsaUNBQWlDO0lBQ3pCLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYyxFQUFFLElBQVc7UUFDakQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxNQUFNO1lBQ04sSUFBSTtTQUNQLENBQUMsQ0FBQztJQUNQLENBQUM7O0FBdmtCTCw4QkF3a0JDO0FBclhHLDJEQUEyRDtBQUNuQywwQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUMvQyxhQUFhO0lBQ2IsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCO0lBQzVELGtCQUFrQixFQUFFLGlCQUFpQjtDQUN4QyxDQUFDLEFBSnNDLENBSXJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbENhdGVnb3J5LCBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3VsdCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBvaywgZXJyIH0gZnJvbSBcIi4uL3Rvb2wtYmFzZVwiO1xyXG5pbXBvcnQgeyBwYXJzZU1heWJlSnNvbiB9IGZyb20gXCIuLi91dGlsc1wiO1xyXG5pbXBvcnQgeyByZXNvbHZlTm9kZVV1aWQgfSBmcm9tIFwiLi4vbm9kZS1yZXNvbHZlXCI7XHJcbmltcG9ydCB7IHRha2VFZGl0b3JTY3JlZW5zaG90IH0gZnJvbSBcIi4uL3NjcmVlbnNob3RcIjtcclxuXHJcbmNvbnN0IEVYVF9OQU1FID0gXCJjb2Nvcy1jcmVhdG9yLW1jcFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE5vZGVUb29scyBpbXBsZW1lbnRzIFRvb2xDYXRlZ29yeSB7XHJcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcIm5vZGVcIjtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5vZGVfbWFuYWdlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb2RlIGxpZmVjeWNsZSBvcGVyYXRpb25zLiBBY3Rpb25zOiAnY3JlYXRlJyAobmFtZSBbKyBwYXJlbnQgKyBjb21wb25lbnRzW11dKSwgJ2RlbGV0ZScgKHV1aWQpLCAnZHVwbGljYXRlJyAodXVpZCksICdtb3ZlJyAodXVpZCwgcGFyZW50KS4gRm9yIHByb3BlcnR5IGVkaXRzIHVzZSBub2RlX3NldF9wcm9wZXJ0eSAvIG5vZGVfc2V0X3RyYW5zZm9ybSAvIG5vZGVfc2V0X2FjdGl2ZSAvIG5vZGVfc2V0X2xheW91dC4gRm9yIG5vZGUtdHJlZSBjb25zdHJ1Y3Rpb24gdXNlIG5vZGVfY3JlYXRlX3RyZWUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2NyZWF0ZScgfCAnZGVsZXRlJyB8ICdkdXBsaWNhdGUnIHwgJ21vdmUnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIG5hbWUgKGFjdGlvbj1jcmVhdGUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlBhcmVudCBub2RlIFVVSUQgKGFjdGlvbj1jcmVhdGUgW29wdGlvbmFsXSB8IGFjdGlvbj1tb3ZlIFtyZXF1aXJlZF0pXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGNsYXNzIG5hbWVzIHRvIGFkZCBvbiBjcmVhdGUgKGUuZy4gWydjYy5MYWJlbCcsICdjYy5TcHJpdGUnXSlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJUYXJnZXQgbm9kZSBVVUlEIChhY3Rpb249ZGVsZXRlfGR1cGxpY2F0ZXxtb3ZlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJub2RlX2dldF9pbmZvXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgZGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgYSBub2RlIGJ5IFVVSUQsIGluY2x1ZGluZyBjb21wb25lbnRzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSURcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInV1aWRcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5vZGVfZmluZF9ieV9uYW1lXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGaW5kIGFsbCBub2RlcyBtYXRjaGluZyBhIGdpdmVuIG5hbWUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgbmFtZSB0byBzZWFyY2hcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcIm5hbWVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5vZGVfc2V0X3Byb3BlcnR5XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTZXQgYSBwcm9wZXJ0eSBvbiBhIG5vZGUgKG5hbWUsIGFjdGl2ZSwgcG9zaXRpb24sIHJvdGF0aW9uLCBzY2FsZSwgZXRjLikuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByb3BlcnR5IG5hbWUgKGUuZy4gJ25hbWUnLCAnYWN0aXZlJywgJ3Bvc2l0aW9uJylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogXCJWYWx1ZSB0byBzZXQuIEZvciBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSB1c2Uge3gseSx6fS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInV1aWRcIiwgXCJwcm9wZXJ0eVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJub2RlX3NldF90cmFuc2Zvcm1cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNldCBwb3NpdGlvbiwgcm90YXRpb24sIGFuZC9vciBzY2FsZSBvZiBhIG5vZGUgYXQgb25jZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHg6IHsgdHlwZTogXCJudW1iZXJcIiB9LCB5OiB7IHR5cGU6IFwibnVtYmVyXCIgfSwgejogeyB0eXBlOiBcIm51bWJlclwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlBvc2l0aW9uIHt4LHksen1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHg6IHsgdHlwZTogXCJudW1iZXJcIiB9LCB5OiB7IHR5cGU6IFwibnVtYmVyXCIgfSwgejogeyB0eXBlOiBcIm51bWJlclwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkV1bGVyIHJvdGF0aW9uIHt4LHksen1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHg6IHsgdHlwZTogXCJudW1iZXJcIiB9LCB5OiB7IHR5cGU6IFwibnVtYmVyXCIgfSwgejogeyB0eXBlOiBcIm51bWJlclwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNjYWxlIHt4LHksen1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1dWlkXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJub2RlX2dldF9hbGxcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBhIGZsYXQgbGlzdCBvZiBhbGwgbm9kZXMgaW4gdGhlIGN1cnJlbnQgc2NlbmUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge30sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5vZGVfc2V0X2FjdGl2ZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2V0IGEgbm9kZSdzIGFjdGl2ZSAodmlzaWJsZSkgc3RhdGUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiV2hldGhlciB0aGUgbm9kZSBpcyBhY3RpdmVcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInV1aWRcIiwgXCJhY3RpdmVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5vZGVfZGV0ZWN0X3R5cGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkRldGVjdCBub2RlIHR5cGUgKDJELCAzRCwgb3IgcmVndWxhciBOb2RlKSBiYXNlZCBvbiBpdHMgY29tcG9uZW50cy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1dWlkXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJub2RlX2NyZWF0ZV90cmVlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDcmVhdGUgYSBmdWxsIG5vZGUgdHJlZSBmcm9tIGEgSlNPTiBzcGVjIGluIG9uZSBjYWxsLiBNdWNoIGZhc3RlciB0aGFuIGNyZWF0aW5nIG5vZGVzIG9uZSBieSBvbmUuIFNwZWMgZm9ybWF0OiB7IG5hbWUsIGNvbXBvbmVudHM/OiBbJ2NjLlVJVHJhbnNmb3JtJ10sIHByb3BlcnRpZXM/OiB7J2NjLlVJVHJhbnNmb3JtLmNvbnRlbnRTaXplJzoge3dpZHRoOjcyMCxoZWlnaHQ6MTI4MH19LCB3aWRnZXQ/OiB7dG9wOjAsIGJvdHRvbTowLCBsZWZ0OjAsIHJpZ2h0OjB9LCBhY3RpdmU/OiBib29sLCBwb3NpdGlvbj86IHt4LHksen0sIGNoaWxkcmVuPzogWy4uLl0gfVwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlBhcmVudCBub2RlIFVVSURcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGVjOiB7IGRlc2NyaXB0aW9uOiBcIk5vZGUgdHJlZSBzcGVjaWZpY2F0aW9uIChKU09OIG9iamVjdCB3aXRoIG5hbWUsIGNvbXBvbmVudHMsIHByb3BlcnRpZXMsIGNoaWxkcmVuKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wicGFyZW50XCIsIFwic3BlY1wiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwibm9kZV9zZXRfbGF5b3V0XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTZXQgVUlUcmFuc2Zvcm0gKGNvbnRlbnRTaXplLCBhbmNob3JQb2ludCkgYW5kIFdpZGdldCAobWFyZ2lucykgb24gYSBub2RlIGluIG9uZSBjYWxsLiBNdWNoIGZhc3RlciB0aGFuIGNhbGxpbmcgY29tcG9uZW50X3NldF9wcm9wZXJ0eSBtdWx0aXBsZSB0aW1lcyBmb3IgbGF5b3V0IGFkanVzdG1lbnRzLiBTZXQgc2NyZWVuc2hvdD10cnVlIHRvIGNhcHR1cmUgdGhlIGVkaXRvciBhZnRlciBjaGFuZ2VzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQgKGVpdGhlciB1dWlkIG9yIG5vZGVOYW1lIHJlcXVpcmVkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgbmFtZSB0byBmaW5kIChhbHRlcm5hdGl2ZSB0byB1dWlkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRTaXplOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogeyB3aWR0aDogeyB0eXBlOiBcIm51bWJlclwiIH0sIGhlaWdodDogeyB0eXBlOiBcIm51bWJlclwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlVJVHJhbnNmb3JtIGNvbnRlbnRTaXplIHt3aWR0aCwgaGVpZ2h0fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmNob3JQb2ludDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgeDogeyB0eXBlOiBcIm51bWJlclwiIH0sIHk6IHsgdHlwZTogXCJudW1iZXJcIiB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJVSVRyYW5zZm9ybSBhbmNob3JQb2ludCB7eCwgeX0gKDAtMSlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkZ2V0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogeyB0eXBlOiBcIm51bWJlclwiIH0sIGJvdHRvbTogeyB0eXBlOiBcIm51bWJlclwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogeyB0eXBlOiBcIm51bWJlclwiIH0sIHJpZ2h0OiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsQ2VudGVyOiB7IHR5cGU6IFwibnVtYmVyXCIgfSwgdmVydGljYWxDZW50ZXI6IHsgdHlwZTogXCJudW1iZXJcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQWxpZ25Ub3A6IHsgdHlwZTogXCJib29sZWFuXCIgfSwgaXNBbGlnbkJvdHRvbTogeyB0eXBlOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQWxpZ25MZWZ0OiB7IHR5cGU6IFwiYm9vbGVhblwiIH0sIGlzQWxpZ25SaWdodDogeyB0eXBlOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQWxpZ25Ib3Jpem9udGFsQ2VudGVyOiB7IHR5cGU6IFwiYm9vbGVhblwiIH0sIGlzQWxpZ25WZXJ0aWNhbENlbnRlcjogeyB0eXBlOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIldpZGdldCBhbGlnbm1lbnQgbWFyZ2lucy4gU2V0dGluZyBhIHZhbHVlIChlLmcuIHRvcDowKSBhdXRvbWF0aWNhbGx5IGVuYWJsZXMgdGhlIGNvcnJlc3BvbmRpbmcgYWxpZ25tZW50IChpc0FsaWduVG9wOnRydWUpLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgcjogeyB0eXBlOiBcIm51bWJlclwiIH0sIGc6IHsgdHlwZTogXCJudW1iZXJcIiB9LCBiOiB7IHR5cGU6IFwibnVtYmVyXCIgfSwgYTogeyB0eXBlOiBcIm51bWJlclwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgY29sb3Ige3IsZyxiLGF9ICgwLTI1NSlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJOb2RlIG9wYWNpdHkgKDAtMjU1KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbnNob3Q6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIGNhcHR1cmUgZWRpdG9yIHNjcmVlbnNob3QgYWZ0ZXIgY2hhbmdlcyAoZGVmYXVsdDogZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IHJlamVjdGVkID0gYXdhaXQgdGhpcy5yZWplY3RJZlByZXZpZXdSdW5uaW5nKHRvb2xOYW1lKTtcclxuICAgICAgICBpZiAocmVqZWN0ZWQpIHJldHVybiByZWplY3RlZDtcclxuXHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwibm9kZV9tYW5hZ2VcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZU1hbmFnZShhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSBcIm5vZGVfZ2V0X2luZm9cIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vZGVJbmZvKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJub2RlX2ZpbmRfYnlfbmFtZVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmluZEJ5TmFtZShhcmdzLm5hbWUpO1xyXG4gICAgICAgICAgICBjYXNlIFwibm9kZV9zZXRfcHJvcGVydHlcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNldFByb3BlcnR5KGFyZ3MudXVpZCwgYXJncy5wcm9wZXJ0eSwgcGFyc2VNYXliZUpzb24oYXJncy52YWx1ZSkpO1xyXG4gICAgICAgICAgICBjYXNlIFwibm9kZV9zZXRfdHJhbnNmb3JtXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRUcmFuc2Zvcm0oYXJncy51dWlkLCBhcmdzLnBvc2l0aW9uLCBhcmdzLnJvdGF0aW9uLCBhcmdzLnNjYWxlKTtcclxuICAgICAgICAgICAgY2FzZSBcIm5vZGVfZ2V0X2FsbFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QWxsTm9kZXMoKTtcclxuICAgICAgICAgICAgY2FzZSBcIm5vZGVfc2V0X2FjdGl2ZVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoYXJncy51dWlkLCBcImFjdGl2ZVwiLCBhcmdzLmFjdGl2ZSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJub2RlX2NyZWF0ZV90cmVlXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVOb2RlVHJlZShhcmdzLnBhcmVudCwgcGFyc2VNYXliZUpzb24oYXJncy5zcGVjKSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJub2RlX3NldF9sYXlvdXRcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNldExheW91dChhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSBcIm5vZGVfZGV0ZWN0X3R5cGVcIjoge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFthcmdzLnV1aWRdKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWluZm8uc3VjY2VzcykgcmV0dXJuIG9rKGluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gaW5mby5kYXRhPy5jb21wb25lbnRzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlcyA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBub2RlVHlwZSA9IFwiTm9kZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wVHlwZXMuaW5jbHVkZXMoXCJVSVRyYW5zZm9ybVwiKSkgbm9kZVR5cGUgPSBcIjJEXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29tcFR5cGVzLmluY2x1ZGVzKFwiTWVzaFJlbmRlcmVyXCIpIHx8IGNvbXBUeXBlcy5pbmNsdWRlcyhcIkNhbWVyYVwiKSkgbm9kZVR5cGUgPSBcIjNEXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXVpZDogYXJncy51dWlkLCBub2RlVHlwZSwgY29tcG9uZW50czogY29tcFR5cGVzIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7IHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7IH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogU2NlbmUgZWRpdGluZyB0b29scyB0aGF0IG11c3Qgbm90IHJ1biBkdXJpbmcgcHJldmlldyAqL1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgU0NFTkVfRURJVF9UT09MUyA9IG5ldyBTZXQoW1xyXG4gICAgICAgIFwibm9kZV9tYW5hZ2VcIixcclxuICAgICAgICBcIm5vZGVfc2V0X3Byb3BlcnR5XCIsIFwibm9kZV9zZXRfdHJhbnNmb3JtXCIsIFwibm9kZV9zZXRfYWN0aXZlXCIsXHJcbiAgICAgICAgXCJub2RlX2NyZWF0ZV90cmVlXCIsIFwibm9kZV9zZXRfbGF5b3V0XCIsXHJcbiAgICBdKTtcclxuXHJcbiAgICAvKiogbm9kZV9tYW5hZ2UgZGlzcGF0Y2hlciAodjIuMC4wKS4gKi9cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWFuYWdlKGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjcmVhdGVcIjpcclxuICAgICAgICAgICAgICAgIGlmICghYXJncy5uYW1lKSByZXR1cm4gZXJyKFwibm9kZV9tYW5hZ2UoY3JlYXRlKTogJ25hbWUnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlTm9kZShhcmdzLm5hbWUsIGFyZ3MucGFyZW50LCBhcmdzLmNvbXBvbmVudHMpO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MudXVpZCkgcmV0dXJuIGVycihcIm5vZGVfbWFuYWdlKGRlbGV0ZSk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlbGV0ZU5vZGUoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSBcImR1cGxpY2F0ZVwiOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLnV1aWQpIHJldHVybiBlcnIoXCJub2RlX21hbmFnZShkdXBsaWNhdGUpOiAndXVpZCcgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kdXBsaWNhdGVOb2RlKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJtb3ZlXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MudXVpZCkgcmV0dXJuIGVycihcIm5vZGVfbWFuYWdlKG1vdmUpOiAndXVpZCcgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MucGFyZW50KSByZXR1cm4gZXJyKFwibm9kZV9tYW5hZ2UobW92ZSk6ICdwYXJlbnQnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZU5vZGUoYXJncy51dWlkLCBhcmdzLnBhcmVudCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIG5vZGVfbWFuYWdlIGFjdGlvbjogJHthcmdzLmFjdGlvbn0uIEV4cGVjdGVkIGNyZWF0ZSAvIGRlbGV0ZSAvIGR1cGxpY2F0ZSAvIG1vdmUuYCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVqZWN0SWZQcmV2aWV3UnVubmluZyh0b29sTmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0IHwgbnVsbD4ge1xyXG4gICAgICAgIGlmICghTm9kZVRvb2xzLlNDRU5FX0VESVRfVE9PTFMuaGFzKHRvb2xOYW1lKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwicHJldmlld1wiLCBcInF1ZXJ5LWluZm9cIik7XHJcbiAgICAgICAgICAgIGlmIChzdGF0ZSAmJiAoc3RhdGUgYXMgYW55KS5ydW5uaW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBcIiR7dG9vbE5hbWV9XCIg44Gv44OX44Os44OT44Ol44O85Lit44Gr5a6f6KGM44Gn44GN44G+44Gb44KT44CC5YWI44Gr44OX44Os44OT44Ol44O844KS5YGc5q2i44GX44Gm44GP44Gg44GV44GE44CCYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIHsgLyogcXVlcnkgZmFpbGVkIOKAlCBhbGxvdyBleGVjdXRpb24gKi8gfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlTm9kZShuYW1lOiBzdHJpbmcsIHBhcmVudD86IHN0cmluZywgY29tcG9uZW50cz86IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gVXNlIEVkaXRvciBBUEkgdG8gY3JlYXRlIG5vZGVcclxuICAgICAgICAgICAgY29uc3QgdXVpZCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImNyZWF0ZS1ub2RlXCIsIHtcclxuICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50IHx8IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIG5hbWUsXHJcbiAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXYWl0IHVudGlsIHRoZSBub2RlIGlzIHF1ZXJ5YWJsZSBpbiB0aGUgc2NlbmUgcHJvY2Vzc1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGb3JOb2RlKHV1aWQpO1xyXG5cclxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudHMgaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRzICYmIGNvbXBvbmVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiYWRkQ29tcG9uZW50VG9Ob2RlXCIsIFt1dWlkLCBjb21wXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gV2FpdCB1bnRpbCB0aGUgY29tcG9uZW50IGlzIHJlZmxlY3RlZCBpbiBxdWVyeS1ub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy53YWl0Rm9yQ29tcG9uZW50KHV1aWQsIGNvbXApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB1dWlkLCBuYW1lIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFdhaXQgdW50aWwgYSBub2RlIGJlY29tZXMgcXVlcnlhYmxlIGluIHRoZSBzY2VuZSBwcm9jZXNzLlxyXG4gICAgICogRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiY3JlYXRlLW5vZGVcIikgcmV0dXJucyBiZWZvcmUgdGhlIG5vZGVcclxuICAgICAqIGlzIGZ1bGx5IHJlZ2lzdGVyZWQgaW4gdGhlIHNjZW5lIGhpZXJhcmNoeSwgc28gc3Vic2VxdWVudCBzY2VuZSBzY3JpcHRcclxuICAgICAqIGNhbGxzIChmaW5kTm9kZSkgbWF5IGZhaWwgd2l0aG91dCB0aGlzIHdhaXQuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgd2FpdEZvck5vZGUodXVpZDogc3RyaW5nLCBtYXhSZXRyaWVzID0gMTAsIGludGVydmFsTXMgPSAxMDApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1heFJldHJpZXM7IGkrKykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldE5vZGVJbmZvXCIsIFt1dWlkXSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0Py5zdWNjZXNzKSByZXR1cm47XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBub3QgcmVhZHkgeWV0ICovIH1cclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGludGVydmFsTXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gRG9uJ3QgdGhyb3cg4oCUIGxldCB0aGUgY2FsbGVyIHByb2NlZWQgYW5kIGdldCBhIG1vcmUgc3BlY2lmaWMgZXJyb3IgaWYgbmVlZGVkXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXYWl0IHVudGlsIGEgY29tcG9uZW50IGFkZGVkIHZpYSBhZGRDb21wb25lbnRUb05vZGUgaXMgcmVmbGVjdGVkIGluIHF1ZXJ5LW5vZGUuXHJcbiAgICAgKiBzY2VuZVNjcmlwdCByZXR1cm5zIGJlZm9yZSB0aGUgRWRpdG9yIEFQSSAocXVlcnktbm9kZSkgcmVmbGVjdHMgdGhlIGNoYW5nZSxcclxuICAgICAqIHNvIHBvbGxpbmcgaXMgbmVlZGVkIHRvIGF2b2lkIHJhY2UgY29uZGl0aW9ucyBpbiBzdWJzZXF1ZW50IHRvb2wgY2FsbHMuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgd2FpdEZvckNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIG1heFJldHJpZXMgPSAxMCwgaW50ZXJ2YWxNcyA9IDEwMCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRUeXBlID0gY29tcG9uZW50VHlwZS5zdGFydHNXaXRoKFwiY2MuXCIpID8gY29tcG9uZW50VHlwZS5zdWJzdHJpbmcoMykgOiBjb21wb25lbnRUeXBlO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWF4UmV0cmllczsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGVcIiwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcHM6IGFueVtdID0gbm9kZUR1bXA/Ll9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gY29tcHMuc29tZSgoYykgPT5cclxuICAgICAgICAgICAgICAgICAgICBjLnR5cGUgPT09IGNvbXBvbmVudFR5cGUgfHwgYy50eXBlID09PSBgY2MuJHtub3JtYWxpemVkVHlwZX1gIHx8IGMudHlwZSA9PT0gbm9ybWFsaXplZFR5cGVcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHJldHVybjtcclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIG5vdCByZWFkeSB5ZXQgKi8gfVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgaW50ZXJ2YWxNcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBEb24ndCB0aHJvdyDigJQgY29tcG9uZW50IG1heSBzdGlsbCB3b3JrOyBsZXQgY2FsbGVyIGdldCBhIHNwZWNpZmljIGVycm9yIGlmIG5lZWRlZFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlTm9kZVRyZWUocGFyZW50VXVpZDogc3RyaW5nLCBzcGVjOiBhbnkpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiYnVpbGROb2RlVHJlZVwiLCBbcGFyZW50VXVpZCwgc3BlY10pO1xyXG4gICAgICAgICAgICBpZiAoIXJlc3VsdD8uc3VjY2VzcykgcmV0dXJuIGVycihyZXN1bHQ/LmVycm9yIHx8IFwiYnVpbGROb2RlVHJlZSBmYWlsZWRcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldE5vZGVJbmZvKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXROb2RlSW5mb1wiLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQnlOYW1lKG5hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJmaW5kTm9kZXNCeU5hbWVcIiwgW25hbWVdKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHkodXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldE5vZGVQcm9wZXJ0eVwiLCBbdXVpZCwgcHJvcGVydHksIHZhbHVlXSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFRyYW5zZm9ybSh1dWlkOiBzdHJpbmcsIHBvc2l0aW9uPzogYW55LCByb3RhdGlvbj86IGFueSwgc2NhbGU/OiBhbnkpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0Tm9kZVByb3BlcnR5XCIsIFt1dWlkLCBcInBvc2l0aW9uXCIsIHBvc2l0aW9uXSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb3RhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXROb2RlUHJvcGVydHlcIiwgW3V1aWQsIFwicm90YXRpb25cIiwgcm90YXRpb25dKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNjYWxlKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldE5vZGVQcm9wZXJ0eVwiLCBbdXVpZCwgXCJzY2FsZVwiLCBzY2FsZV0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBhbnlGYWlsZWQgPSByZXN1bHRzLmZpbmQoKHIpID0+ICFyLnN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICBpZiAoYW55RmFpbGVkKSByZXR1cm4gb2soYW55RmFpbGVkKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXVpZCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkZWxldGVOb2RlKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcInJlbW92ZS1ub2RlXCIsIHsgdXVpZCB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXVpZCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBtb3ZlTm9kZSh1dWlkOiBzdHJpbmcsIHBhcmVudFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNldC1wcm9wZXJ0eVwiLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogXCJwYXJlbnRcIixcclxuICAgICAgICAgICAgICAgIGR1bXA6IHsgdHlwZTogXCJjYy5Ob2RlXCIsIHZhbHVlOiB7IHV1aWQ6IHBhcmVudFV1aWQgfSB9LFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXVpZCwgcGFyZW50VXVpZCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHRyeSBzY2VuZSBzY3JpcHRcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJtb3ZlTm9kZVwiLCBbdXVpZCwgcGFyZW50VXVpZF0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkdXBsaWNhdGVOb2RlKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImR1cGxpY2F0ZS1ub2RlXCIsIHV1aWQpO1xyXG4gICAgICAgICAgICAvLyBkdXBsaWNhdGUtbm9kZSByZXR1cm5zIGFuIGFycmF5IG9mIFVVSURzXHJcbiAgICAgICAgICAgIGNvbnN0IG5ld1V1aWQgPSBBcnJheS5pc0FycmF5KHJlc3VsdCkgPyByZXN1bHRbMF0gOiByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHNvdXJjZVV1aWQ6IHV1aWQsIG5ld1V1aWQgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QWxsTm9kZXMoKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldEFsbE5vZGVzXCIsIFtdKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVUlUcmFuc2Zvcm0gKyBXaWRnZXQgKyBjb2xvci9vcGFjaXR5IOOCkuOBvuOBqOOCgeOBpuioreWumuOBmeOCi+OAglxyXG4gICAgICogV2lkZ2V0IOOBruWApOOCkuaMh+WumuOBmeOCi+OBqOOAgeWvvuW/nOOBmeOCiyBpc0FsaWduKiDjg5Xjg6njgrDjgpLoh6rli5XjgacgdHJ1ZSDjgavjgZnjgovjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRMYXlvdXQoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIG5vZGVOYW1lIOKGkiB1dWlkIOino+axulxyXG4gICAgICAgICAgICBsZXQgdXVpZCA9IGFyZ3MudXVpZDtcclxuICAgICAgICAgICAgaWYgKCF1dWlkICYmIGFyZ3Mubm9kZU5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgcmVzb2x2ZU5vZGVVdWlkKHsgbm9kZU5hbWU6IGFyZ3Mubm9kZU5hbWUgfSk7XHJcbiAgICAgICAgICAgICAgICB1dWlkID0gcmVzb2x2ZWQudXVpZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXV1aWQpIHJldHVybiBlcnIoXCJFaXRoZXIgJ3V1aWQnIG9yICdub2RlTmFtZScgaXMgcmVxdWlyZWRcIik7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgLy8gVUlUcmFuc2Zvcm0g44Gu6Kit5a6aXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRTaXplID0gcGFyc2VNYXliZUpzb24oYXJncy5jb250ZW50U2l6ZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGFuY2hvclBvaW50ID0gcGFyc2VNYXliZUpzb24oYXJncy5hbmNob3JQb2ludCk7XHJcbiAgICAgICAgICAgIGlmIChjb250ZW50U2l6ZSB8fCBhbmNob3JQb2ludCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW3V1aWRdKTtcclxuICAgICAgICAgICAgICAgIGlmICghbm9kZUluZm8/LnN1Y2Nlc3MpIHJldHVybiBlcnIoYE5vZGUgJHt1dWlkfSBub3QgZm91bmRgKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZUluZm8uZGF0YT8uY29tcG9uZW50cyB8fCBbXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHV0SWR4ID0gY29tcHMuZmluZEluZGV4KChjOiBhbnkpID0+IGMudHlwZSA9PT0gXCJVSVRyYW5zZm9ybVwiKTtcclxuICAgICAgICAgICAgICAgIGlmICh1dElkeCA8IDApIHJldHVybiBlcnIoXCJOb2RlIGhhcyBubyBVSVRyYW5zZm9ybSBjb21wb25lbnRcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnRlbnRTaXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHt1dElkeH0uY29udGVudFNpemVgO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1bXAgPSB7IHZhbHVlOiB7IHdpZHRoOiB7IHZhbHVlOiBjb250ZW50U2l6ZS53aWR0aCB9LCBoZWlnaHQ6IHsgdmFsdWU6IGNvbnRlbnRTaXplLmhlaWdodCB9IH0gfTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFt1dWlkLCBwYXRoLCBkdW1wXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IFwiY29udGVudFNpemVcIiwgc3VjY2Vzczogcj8uc3VjY2VzcyAhPT0gZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYW5jaG9yUG9pbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke3V0SWR4fS5hbmNob3JQb2ludGA7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IHsgdmFsdWU6IHsgeDogeyB2YWx1ZTogYW5jaG9yUG9pbnQueCB9LCB5OiB7IHZhbHVlOiBhbmNob3JQb2ludC55IH0gfSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIHBhdGgsIGR1bXBdKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eTogXCJhbmNob3JQb2ludFwiLCBzdWNjZXNzOiByPy5zdWNjZXNzICE9PSBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gV2lkZ2V0IOOBruioreWumlxyXG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBwYXJzZU1heWJlSnNvbihhcmdzLndpZGdldCk7XHJcbiAgICAgICAgICAgIGlmICh3aWRnZXQpIHtcclxuICAgICAgICAgICAgICAgIC8vIFdpZGdldCDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgpLmjqLjgZnvvIjjgarjgZHjgozjgbDov73liqDvvIlcclxuICAgICAgICAgICAgICAgIGxldCBub2RlSW5mbyA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJnZXROb2RlSW5mb1wiLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlSW5mbz8uc3VjY2VzcykgcmV0dXJuIGVycihgTm9kZSAke3V1aWR9IG5vdCBmb3VuZGApO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbXBzID0gbm9kZUluZm8uZGF0YT8uY29tcG9uZW50cyB8fCBbXTtcclxuICAgICAgICAgICAgICAgIGxldCB3SWR4ID0gY29tcHMuZmluZEluZGV4KChjOiBhbnkpID0+IGMudHlwZSA9PT0gXCJXaWRnZXRcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAod0lkeCA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiYWRkQ29tcG9uZW50VG9Ob2RlXCIsIFt1dWlkLCBcImNjLldpZGdldFwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5YaN5Y+W5b6XXHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW3V1aWRdKTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wcyA9IG5vZGVJbmZvLmRhdGE/LmNvbXBvbmVudHMgfHwgW107XHJcbiAgICAgICAgICAgICAgICAgICAgd0lkeCA9IGNvbXBzLmZpbmRJbmRleCgoYzogYW55KSA9PiBjLnR5cGUgPT09IFwiV2lkZ2V0XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh3SWR4IDwgMCkgcmV0dXJuIGVycihcIkZhaWxlZCB0byBhZGQgV2lkZ2V0IGNvbXBvbmVudFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwcm9wZXJ0eTogXCJXaWRnZXRcIiwgYWN0aW9uOiBcImFkZGVkXCIgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaXNBbGlnbiog44KS6Ieq5YuV6Kit5a6a77yI5YCk44GM44GC44KM44GwIHRydWUg44Gr44GZ44KL77yJXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGlnbk1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IFwiaXNBbGlnblRvcFwiLCBib3R0b206IFwiaXNBbGlnbkJvdHRvbVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IFwiaXNBbGlnbkxlZnRcIiwgcmlnaHQ6IFwiaXNBbGlnblJpZ2h0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbENlbnRlcjogXCJpc0FsaWduSG9yaXpvbnRhbENlbnRlclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsQ2VudGVyOiBcImlzQWxpZ25WZXJ0aWNhbENlbnRlclwiLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh3aWRnZXQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaXNBbGlnbiog44KS5piO56S65oyH5a6a44GX44Gf5aC05ZCI44Gv44Gd44Gu44G+44G+6Kit5a6aXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHt3SWR4fS4ke2tleX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1bXAgPSB7IHZhbHVlLCB0eXBlOiBcIkJvb2xlYW5cIiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIHBhdGgsIGR1bXBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IGBXaWRnZXQuJHtrZXl9YCwgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDjgb7jgZrlr77lv5zjgZnjgosgaXNBbGlnbiog44KSIHRydWUg44Gr44GZ44KLXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsaWduS2V5ID0gYWxpZ25NYXBba2V5XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsaWduS2V5ICYmIHdpZGdldFthbGlnbktleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxpZ25QYXRoID0gYF9fY29tcHNfXy4ke3dJZHh9LiR7YWxpZ25LZXl9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXRQcm9wZXJ0eVZpYUVkaXRvclwiLCBbdXVpZCwgYWxpZ25QYXRoLCB7IHZhbHVlOiB0cnVlLCB0eXBlOiBcIkJvb2xlYW5cIiB9XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IHsgdmFsdWUsIHR5cGU6IFwiTnVtYmVyXCIgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldFByb3BlcnR5VmlhRWRpdG9yXCIsIFt1dWlkLCBwYXRoLCBkdW1wXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBgV2lkZ2V0LiR7a2V5fWAsIHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIF9hbGlnbkZsYWdzIOOCkiBpc0FsaWduKiDnj77lnKjlgKTjgYvjgonlho3oqIjnrpfjgZfjgaboqK3lrppcclxuICAgICAgICAgICAgICAgIC8vIChFZGl0b3Ig44GMIGlzQWxpZ24qIOWkieabtOaZguOBqyBfYWxpZ25GbGFncyDjgpLoh6rli5Xmm7TmlrDjgZfjgarjgYTjg5DjgrDjga7lr77lh6YpXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IEFMSUdOX0JJVFM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQWxpZ25MZWZ0OiAxLCBpc0FsaWduUmlnaHQ6IDIsIGlzQWxpZ25Ub3A6IDQsIGlzQWxpZ25Cb3R0b206IDgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQWxpZ25Ib3Jpem9udGFsQ2VudGVyOiAxNiwgaXNBbGlnblZlcnRpY2FsQ2VudGVyOiAzMixcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEdW1wID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktbm9kZVwiLCB1dWlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZUR1bXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd0NvbXBEdW1wID0gbm9kZUR1bXAuX19jb21wc19fPy5bd0lkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3Q29tcER1bXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhbGlnbkZsYWdzID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgYml0XSBvZiBPYmplY3QuZW50cmllcyhBTElHTl9CSVRTKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3Q29tcER1bXAudmFsdWU/LltrZXldPy52YWx1ZSA9PT0gdHJ1ZSkgYWxpZ25GbGFncyB8PSBiaXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmbGFnUGF0aCA9IGBfX2NvbXBzX18uJHt3SWR4fS5fYWxpZ25GbGFnc2A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIGZsYWdQYXRoLCB7IHZhbHVlOiBhbGlnbkZsYWdzLCB0eXBlOiBcIk51bWJlclwiIH1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBcIldpZGdldC5fYWxpZ25GbGFnc1wiLCB2YWx1ZTogYWxpZ25GbGFncyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gX2FsaWduRmxhZ3Mg5YaN6KiI566X44Gu5aSx5pWX44Gv6Ie05ZG955qE44Gn44Gq44GE44Gf44KB54Sh6KaWXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGNvbG9yXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gcGFyc2VNYXliZUpzb24oYXJncy5jb2xvcik7XHJcbiAgICAgICAgICAgIGlmIChjb2xvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXROb2RlUHJvcGVydHlcIiwgW3V1aWQsIFwiY29sb3JcIiwgY29sb3JdKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBcImNvbG9yXCIsIHN1Y2Nlc3M6IHI/LnN1Y2Nlc3MgIT09IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBvcGFjaXR5XHJcbiAgICAgICAgICAgIGlmIChhcmdzLm9wYWNpdHkgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2MuVUlPcGFjaXR5IOOCkuS9v+OBhu+8iOOBquOBkeOCjOOBsCBjb2xvci5hIOOBp+ioreWumu+8iVxyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW3V1aWRdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZUluZm8/LmRhdGE/LmNvbXBvbmVudHMgfHwgW107XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcElkeCA9IGNvbXBzLmZpbmRJbmRleCgoYzogYW55KSA9PiBjLnR5cGUgPT09IFwiVUlPcGFjaXR5XCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wSWR4ID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke29wSWR4fS5vcGFjaXR5YDtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0UHJvcGVydHlWaWFFZGl0b3JcIiwgW3V1aWQsIHBhdGgsIHsgdmFsdWU6IGFyZ3Mub3BhY2l0eSwgdHlwZTogXCJOdW1iZXJcIiB9XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgcHJvcGVydHk6IFwiVUlPcGFjaXR5Lm9wYWNpdHlcIiwgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVUlPcGFjaXR5IOOBjOOBquOBhOWgtOWQiOOBryBjb2xvci5hIOOCkuebtOaOpeioreWumlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb2xvciA9IG5vZGVJbmZvPy5kYXRhPy5jb2xvciB8fCB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRDb2xvci5hID0gYXJncy5vcGFjaXR5O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0Tm9kZVByb3BlcnR5XCIsIFt1dWlkLCBcImNvbG9yXCIsIGN1cnJlbnRDb2xvcl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHByb3BlcnR5OiBcImNvbG9yLmFcIiwgc3VjY2Vzczogcj8uc3VjY2VzcyAhPT0gZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFsbE9rID0gcmVzdWx0cy5ldmVyeShyID0+IHIuc3VjY2VzcyAhPT0gZmFsc2UpO1xyXG4gICAgICAgICAgICBsZXQgcmVzcG9uc2U6IGFueSA9IHsgc3VjY2VzczogYWxsT2ssIHV1aWQsIHJlc3VsdHMgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIHNjcmVlbnNob3RcclxuICAgICAgICAgICAgaWYgKGFyZ3Muc2NyZWVuc2hvdCkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcyA9IGF3YWl0IHRha2VFZGl0b3JTY3JlZW5zaG90KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2Uuc2NyZWVuc2hvdCA9IHsgcGF0aDogc3MucGF0aCwgc2l6ZTogc3Muc2F2ZWRTaXplIH07XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChzc0VycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2Uuc2NyZWVuc2hvdEVycm9yID0gc3NFcnIubWVzc2FnZSB8fCBTdHJpbmcoc3NFcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2socmVzcG9uc2UpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogQ2FsbCBhIHNjZW5lIHNjcmlwdCBtZXRob2QgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTY3JpcHQobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBFWFRfTkFNRSxcclxuICAgICAgICAgICAgbWV0aG9kLFxyXG4gICAgICAgICAgICBhcmdzLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==