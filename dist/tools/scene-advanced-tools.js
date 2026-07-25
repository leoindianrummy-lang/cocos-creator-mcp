"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneAdvancedTools = void 0;
const tool_base_1 = require("../tool-base");
const scene_tools_1 = require("./scene-tools");
const EXT_NAME = "cocos-creator-mcp";
class SceneAdvancedTools {
    constructor() {
        this.categoryName = "sceneAdvanced";
    }
    getTools() {
        return [
            {
                name: "scene_execute_script",
                description: "Execute a scene script method by name with arguments.",
                inputSchema: {
                    type: "object",
                    properties: {
                        method: { type: "string", description: "Scene script method name" },
                        args: { type: "array", description: "Arguments to pass", items: {} },
                    },
                    required: ["method"],
                },
            },
            {
                name: "scene_clipboard",
                description: "Clipboard ops on scene nodes. Actions: 'copy' (uuid), 'cut' (uuid), 'paste' (parentUuid).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'copy' | 'cut' | 'paste'" },
                        uuid: { type: "string", description: "Source node UUID (action=copy|cut)" },
                        parentUuid: { type: "string", description: "Destination parent UUID (action=paste)" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "scene_undo",
                description: "Undo / snapshot recording. Actions: 'snapshot' (one-shot undo snapshot), 'snapshot_abort' (cancel current snapshot), 'begin' (begin-recording for a multi-step undo group), 'end' (end-recording = commit), 'cancel' (cancel-recording = discard).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'snapshot' | 'snapshot_abort' | 'begin' | 'end' | 'cancel'" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "scene_array",
                description: "Array property element ops. Actions: 'move' (uuid, path, target, offset — reorder by index delta) and 'remove' (uuid, path, index).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'move' | 'remove'" },
                        uuid: { type: "string", description: "Node or component UUID" },
                        path: { type: "string", description: "Array property path" },
                        target: { type: "number", description: "Current index (action=move)" },
                        offset: { type: "number", description: "Move offset (action=move): +1 = down, -1 = up" },
                        index: { type: "number", description: "Index to remove (action=remove)" },
                    },
                    required: ["action", "uuid", "path"],
                },
            },
            {
                name: "scene_reset",
                description: "Reset a node, component, or property to defaults. Actions: 'transform' (uuid — node position/rotation/scale to identity), 'property' (uuid, path — single property), 'component' (uuid — component to defaults), 'restore_prefab' (uuid — revert prefab instance to original).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'transform' | 'property' | 'component' | 'restore_prefab'" },
                        uuid: { type: "string", description: "Target UUID (node for transform/restore_prefab, component for component, either for property)" },
                        path: { type: "string", description: "Property path (action=property)" },
                    },
                    required: ["action", "uuid"],
                },
            },
            {
                name: "scene_query",
                description: "Query scene state. Actions: 'dirty' (has unsaved changes?), 'ready' (scene fully loaded?), 'classes' (all component classes), 'components' (available components for a node — uuid required), 'component_has_script' (does a component class have a script file — name required), 'nodes_by_asset' (nodes referencing an asset — assetUuid required), 'scene_bounds' (current scene bounding rect). For full node/component dumps use cocos://node/{uuid} / cocos://component/{uuid} resources.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'dirty' | 'ready' | 'classes' | 'components' | 'component_has_script' | 'nodes_by_asset' | 'scene_bounds'" },
                        uuid: { type: "string", description: "Node UUID (action=components)" },
                        name: { type: "string", description: "Component class name (action=component_has_script)" },
                        assetUuid: { type: "string", description: "Asset UUID (action=nodes_by_asset)" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "scene_soft_reload",
                description: "Soft reload the current scene without losing state.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "scene_create",
                description: "Create a new empty 2D scene. If path is omitted, uses the editor's built-in new-scene command (may not work on CC 3.8.x). If path is specified, creates a .scene file via asset-db as a fallback. Returns an error if the current scene is dirty and untitled (to avoid modal save dialog); pass force=true to bypass.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string", description: "Scene asset path (e.g. 'db://assets/scenes/NewScene.scene'). If omitted, uses editor's new-scene command." },
                        force: { type: "boolean", description: "Skip dirty-scene preflight check (may trigger modal save dialog)" },
                    },
                },
            },
            {
                name: "scene_execute_component_method",
                description: "Call a method on a component at edit-time.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Component UUID" },
                        method: { type: "string", description: "Method name" },
                        args: { type: "array", description: "Method arguments", items: {} },
                    },
                    required: ["uuid", "method"],
                },
            },
            {
                name: "scene_save_as",
                description: "Save the current scene to a new file (shows save dialog).",
                inputSchema: { type: "object", properties: {} },
            },
            // ── 以下、既存MCP未対応のEditor API ──
            {
                name: "scene_set_parent",
                description: "Reparent node(s) using the official Editor API (alternative to node_move).",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuids: { type: "array", items: { type: "string" }, description: "Node UUID(s) to move" },
                        parent: { type: "string", description: "New parent node UUID" },
                        keepWorldTransform: { type: "boolean", description: "Keep world position (default false)" },
                    },
                    required: ["uuids", "parent"],
                },
            },
        ];
    }
    async execute(toolName, args) {
        try {
            switch (toolName) {
                case "scene_execute_script":
                    return (0, tool_base_1.ok)(await this.sceneScript(args.method, args.args || []));
                case "scene_snapshot":
                    return (0, tool_base_1.ok)(await Editor.Message.request("scene", "snapshot"));
                case "scene_query":
                    return this.handleQuery(args);
                case "scene_soft_reload":
                    await Editor.Message.request("scene", "soft-reload");
                    return (0, tool_base_1.ok)({ success: true });
                case "scene_clipboard":
                    return this.handleClipboard(args);
                case "scene_undo":
                    return this.handleUndo(args);
                case "scene_array":
                    return this.handleArray(args);
                case "scene_reset":
                    return this.handleReset(args);
                case "scene_create":
                    return this.createScene(args.path, !!args.force);
                case "scene_execute_component_method": {
                    const result = await Editor.Message.request("scene", "execute-component-method", { uuid: args.uuid, name: args.method, args: args.args || [] });
                    return (0, tool_base_1.ok)({ success: true, result });
                }
                case "scene_save_as": {
                    const result = await Editor.Message.request("scene", "save-as-scene");
                    return (0, tool_base_1.ok)({ success: true, result });
                }
                case "scene_set_parent":
                    await Editor.Message.request("scene", "set-parent", {
                        parent: args.parent,
                        uuids: args.uuids,
                        keepWorldTransform: args.keepWorldTransform || false,
                    });
                    return (0, tool_base_1.ok)({ success: true });
                default:
                    return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
            }
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /** scene_query (v2.0.0) — 旧 scene_query_dirty/ready/classes/components/component_has_script/nodes_by_asset/scene_bounds を統合 */
    async handleQuery(args) {
        switch (args.action) {
            case "dirty": {
                const dirty = await Editor.Message.request("scene", "query-dirty");
                return (0, tool_base_1.ok)({ success: true, action: args.action, dirty });
            }
            case "ready": {
                const ready = await Editor.Message.request("scene", "query-is-ready");
                return (0, tool_base_1.ok)({ success: true, action: args.action, ready });
            }
            case "classes": {
                const classes = await Editor.Message.request("scene", "query-classes");
                return (0, tool_base_1.ok)({ success: true, action: args.action, classes });
            }
            case "components": {
                if (!args.uuid)
                    return (0, tool_base_1.err)("scene_query(components): 'uuid' is required");
                const comps = await Editor.Message.request("scene", "query-components", args.uuid);
                return (0, tool_base_1.ok)({ success: true, action: args.action, components: comps });
            }
            case "component_has_script": {
                if (!args.name)
                    return (0, tool_base_1.err)("scene_query(component_has_script): 'name' is required");
                const hasScript = await Editor.Message.request("scene", "query-component-has-script", args.name);
                return (0, tool_base_1.ok)({ success: true, action: args.action, name: args.name, hasScript });
            }
            case "nodes_by_asset": {
                if (!args.assetUuid)
                    return (0, tool_base_1.err)("scene_query(nodes_by_asset): 'assetUuid' is required");
                const nodes = await Editor.Message.request("scene", "query-nodes-by-asset-uuid", args.assetUuid);
                return (0, tool_base_1.ok)({ success: true, action: args.action, nodes });
            }
            case "scene_bounds": {
                const bounds = await Editor.Message.request("scene", "query-scene-bounds");
                return (0, tool_base_1.ok)({ success: true, action: args.action, bounds });
            }
            default:
                return (0, tool_base_1.err)(`Unknown scene_query action: ${args.action}. Expected dirty / ready / classes / components / component_has_script / nodes_by_asset / scene_bounds.`);
        }
    }
    /** scene_clipboard (v2.0.0) */
    async handleClipboard(args) {
        switch (args.action) {
            case "copy":
                if (!args.uuid)
                    return (0, tool_base_1.err)("scene_clipboard(copy): 'uuid' is required");
                await Editor.Message.request("scene", "copy-node", args.uuid);
                return (0, tool_base_1.ok)({ success: true, action: args.action, uuid: args.uuid });
            case "cut":
                if (!args.uuid)
                    return (0, tool_base_1.err)("scene_clipboard(cut): 'uuid' is required");
                await Editor.Message.request("scene", "cut-node", args.uuid);
                return (0, tool_base_1.ok)({ success: true, action: args.action, uuid: args.uuid });
            case "paste":
                if (!args.parentUuid)
                    return (0, tool_base_1.err)("scene_clipboard(paste): 'parentUuid' is required");
                const r = await Editor.Message.request("scene", "paste-node", args.parentUuid);
                return (0, tool_base_1.ok)({ success: true, action: args.action, result: r });
            default:
                return (0, tool_base_1.err)(`Unknown scene_clipboard action: ${args.action}`);
        }
    }
    /** scene_undo (v2.0.0) */
    async handleUndo(args) {
        switch (args.action) {
            case "snapshot":
                await Editor.Message.request("scene", "snapshot");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "snapshot_abort":
                await Editor.Message.request("scene", "snapshot-abort");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "begin":
                await Editor.Message.request("scene", "begin-recording");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "end":
                await Editor.Message.request("scene", "end-recording");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "cancel":
                await Editor.Message.request("scene", "cancel-recording");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            default:
                return (0, tool_base_1.err)(`Unknown scene_undo action: ${args.action}`);
        }
    }
    /** scene_array (v2.0.0) */
    async handleArray(args) {
        switch (args.action) {
            case "move":
                await Editor.Message.request("scene", "move-array-element", { uuid: args.uuid, path: args.path, target: args.target, offset: args.offset });
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "remove":
                await Editor.Message.request("scene", "remove-array-element", { uuid: args.uuid, path: args.path, index: args.index });
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            default:
                return (0, tool_base_1.err)(`Unknown scene_array action: ${args.action}`);
        }
    }
    /** scene_reset (v2.0.0) */
    async handleReset(args) {
        switch (args.action) {
            case "transform":
                return this.resetTransform(args.uuid);
            case "property":
                if (!args.path)
                    return (0, tool_base_1.err)("scene_reset(property): 'path' is required");
                await Editor.Message.request("scene", "reset-property", { uuid: args.uuid, path: args.path });
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "component":
                await Editor.Message.request("scene", "reset-component", { uuid: args.uuid });
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "restore_prefab":
                await Editor.Message.request("scene", "restore-prefab", { uuid: args.uuid });
                return (0, tool_base_1.ok)({ success: true, action: args.action, uuid: args.uuid });
            default:
                return (0, tool_base_1.err)(`Unknown scene_reset action: ${args.action}`);
        }
    }
    async resetTransform(uuid) {
        const result = await this.sceneScript("setNodeProperty", [uuid, "position", { x: 0, y: 0, z: 0 }]);
        await this.sceneScript("setNodeProperty", [uuid, "rotation", { x: 0, y: 0, z: 0 }]);
        await this.sceneScript("setNodeProperty", [uuid, "scale", { x: 1, y: 1, z: 1 }]);
        return (0, tool_base_1.ok)({ success: true, uuid });
    }
    async createScene(path, force = false) {
        // ダイアログ割り込み防止: 現在シーンが dirty かつ untitled の場合は事前エラー
        try {
            await (0, scene_tools_1.ensureSceneSafeToSwitch)(force);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
        // まず scene:new-scene を試行（path 未指定時のみ）
        if (!path) {
            try {
                await Editor.Message.request("scene", "new-scene");
                return (0, tool_base_1.ok)({ success: true });
            }
            catch (e) {
                const msg = (e === null || e === void 0 ? void 0 : e.message) || String(e);
                if (msg.includes("Message does not exist") || msg.includes("scene - new-scene")) {
                    // CC 3.8.x → asset-db fallback にフォール
                    const fallbackPath = await this.generateAvailableScenePath();
                    return this.createSceneViaAssetDb(fallbackPath);
                }
                return (0, tool_base_1.err)(msg);
            }
        }
        // path 指定 → asset-db fallback
        return this.createSceneViaAssetDb(path);
    }
    async generateAvailableScenePath() {
        const basePath = "db://assets/NewScene.scene";
        try {
            const result = await Editor.Message.request("asset-db", "generate-available-url", basePath);
            if (result)
                return result;
        }
        catch ( /* fallback */_a) { /* fallback */ }
        return `db://assets/NewScene_${Date.now()}.scene`;
    }
    async createSceneViaAssetDb(path) {
        try {
            if (!path.endsWith(".scene"))
                path += ".scene";
            const sceneName = path.split("/").pop().replace(".scene", "");
            const uid = () => { var _a, _b; return (_b = (_a = crypto.randomUUID) === null || _a === void 0 ? void 0 : _a.call(crypto)) !== null && _b !== void 0 ? _b : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; };
            const sid = () => {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                let s = "";
                for (let i = 0; i < 21; i++)
                    s += chars[Math.floor(Math.random() * chars.length)];
                return s;
            };
            const sceneJson = this.buildMinimalSceneJson(sceneName, uid, sid);
            const content = JSON.stringify(sceneJson, null, 2);
            await Editor.Message.request("asset-db", "create-asset", path, content);
            // シーンを開く
            try {
                // ensureSceneSafeToSwitch は createScene 入口で既に通過済みなのでここでは再チェックしない
                const queryResult = await Editor.Message.request("asset-db", "query-uuid", path);
                if (queryResult) {
                    await Editor.Message.request("scene", "open-scene", queryResult);
                }
            }
            catch ( /* open failure is not critical */_a) { /* open failure is not critical */ }
            return (0, tool_base_1.ok)({ success: true, path, method: "asset-db-fallback" });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    buildMinimalSceneJson(name, uid, sid) {
        const sceneId = uid();
        const canvasNodeId = sid();
        const cameraNodeId = sid();
        const vec3 = (x, y, z) => ({ __type__: "cc.Vec3", x, y, z });
        const quat = () => ({ __type__: "cc.Quat", x: 0, y: 0, z: 0, w: 1 });
        return [
            // [0] SceneAsset
            {
                __type__: "cc.SceneAsset",
                _name: name,
                _objFlags: 0,
                __editorExtras__: {},
                _native: "",
                scene: { __id__: 1 },
            },
            // [1] Scene
            {
                __type__: "cc.Scene",
                _name: name,
                _objFlags: 0,
                __editorExtras__: {},
                _parent: null,
                _children: [{ __id__: 2 }],
                _active: true,
                _components: [],
                _prefab: null,
                _lpos: vec3(0, 0, 0),
                _lrot: quat(),
                _lscale: vec3(1, 1, 1),
                _mobility: 0,
                _layer: 1073741824,
                _euler: vec3(0, 0, 0),
                autoReleaseAssets: false,
                _globals: { __id__: 10 },
                _id: sceneId,
            },
            // [2] Canvas node
            {
                __type__: "cc.Node",
                _name: "Canvas",
                _objFlags: 0,
                __editorExtras__: {},
                _parent: { __id__: 1 },
                _children: [{ __id__: 3 }],
                _active: true,
                _components: [{ __id__: 5 }, { __id__: 6 }, { __id__: 7 }],
                _prefab: null,
                _lpos: vec3(0, 0, 0),
                _lrot: quat(),
                _lscale: vec3(1, 1, 1),
                _mobility: 0,
                _layer: 33554432,
                _euler: vec3(0, 0, 0),
                _id: canvasNodeId,
            },
            // [3] Camera node
            {
                __type__: "cc.Node",
                _name: "Camera",
                _objFlags: 0,
                __editorExtras__: {},
                _parent: { __id__: 2 },
                _children: [],
                _active: true,
                _components: [{ __id__: 4 }],
                _prefab: null,
                _lpos: vec3(0, 0, 1000),
                _lrot: quat(),
                _lscale: vec3(1, 1, 1),
                _mobility: 0,
                _layer: 1073741824,
                _euler: vec3(0, 0, 0),
                _id: cameraNodeId,
            },
            // [4] Camera component
            {
                __type__: "cc.Camera",
                _name: "",
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 3 },
                _enabled: true,
                _projection: 1,
                _priority: 0,
                _fov: 45,
                _fovAxis: 0,
                _orthoHeight: 10,
                _near: 1,
                _far: 2000,
                _color: { __type__: "cc.Color", r: 0, g: 0, b: 0, a: 255 },
                _depth: 1,
                _stencil: 0,
                _clearFlags: 6,
                _rect: { __type__: "cc.Rect", x: 0, y: 0, width: 1, height: 1 },
                _visibility: 1108344832,
                _id: "",
            },
            // [5] UITransform on Canvas
            {
                __type__: "cc.UITransform",
                _name: "",
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 2 },
                _enabled: true,
                _contentSize: { __type__: "cc.Size", width: 720, height: 1280 },
                _anchorPoint: { __type__: "cc.Vec2", x: 0.5, y: 0.5 },
                _id: "",
            },
            // [6] Canvas component
            {
                __type__: "cc.Canvas",
                _name: "",
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 2 },
                _enabled: true,
                _cameraComponent: { __id__: 4 },
                _alignCanvasWithScreen: true,
                _id: "",
            },
            // [7] Widget on Canvas (fullscreen)
            {
                __type__: "cc.Widget",
                _name: "",
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 2 },
                _enabled: true,
                _alignFlags: 15,
                _target: null,
                _left: 0,
                _right: 0,
                _top: 0,
                _bottom: 0,
                _isAbsLeft: true,
                _isAbsRight: true,
                _isAbsTop: true,
                _isAbsBottom: true,
                _originalWidth: 0,
                _originalHeight: 0,
                _id: "",
            },
            // [8] cc.PrefabInfo for scene
            // [9] (reserved)
            // [10] SceneGlobals
            {
                __type__: "cc.SceneGlobals",
                ambient: { __id__: 11 },
                shadows: { __id__: 12 },
                _skybox: { __id__: 13 },
                fog: { __id__: 14 },
            },
            // [11] AmbientInfo
            { __type__: "cc.AmbientInfo", _skyLightingColor: { __type__: "cc.Vec4", x: 0.2, y: 0.2, z: 0.2, w: 1 } },
            // [12] ShadowsInfo
            { __type__: "cc.ShadowsInfo" },
            // [13] SkyboxInfo
            { __type__: "cc.SkyboxInfo" },
            // [14] FogInfo
            { __type__: "cc.FogInfo" },
        ];
    }
    async sceneScript(method, args) {
        return Editor.Message.request("scene", "execute-scene-script", {
            name: EXT_NAME,
            method,
            args,
        });
    }
}
exports.SceneAdvancedTools = SceneAdvancedTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNENBQXVDO0FBQ3ZDLCtDQUF3RDtBQUV4RCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQztBQUVyQyxNQUFhLGtCQUFrQjtJQUEvQjtRQUNhLGlCQUFZLEdBQUcsZUFBZSxDQUFDO0lBaWlCNUMsQ0FBQztJQS9oQkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsdURBQXVEO2dCQUNwRSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDBCQUEwQixFQUFFO3dCQUNuRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO3FCQUN2RTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixXQUFXLEVBQUUsMkZBQTJGO2dCQUN4RyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDBCQUEwQixFQUFFO3dCQUNuRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxvQ0FBb0MsRUFBRTt3QkFDM0UsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0NBQXdDLEVBQUU7cUJBQ3hGO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxZQUFZO2dCQUNsQixXQUFXLEVBQUUsb1BBQW9QO2dCQUNqUSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDREQUE0RCxFQUFFO3FCQUN4RztvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVyxFQUFFLHFJQUFxSTtnQkFDbEosV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRTt3QkFDNUQsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0JBQXdCLEVBQUU7d0JBQy9ELElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFO3dCQUM1RCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw2QkFBNkIsRUFBRTt3QkFDdEUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsK0NBQStDLEVBQUU7d0JBQ3hGLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGlDQUFpQyxFQUFFO3FCQUM1RTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztpQkFDdkM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxhQUFhO2dCQUNuQixXQUFXLEVBQUUsZ1JBQWdSO2dCQUM3UixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJEQUEyRCxFQUFFO3dCQUNwRyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwrRkFBK0YsRUFBRTt3QkFDdEksSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsaUNBQWlDLEVBQUU7cUJBQzNFO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7aUJBQy9CO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVyxFQUFFLGllQUFpZTtnQkFDOWUsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwyR0FBMkcsRUFBRTt3QkFDcEosSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsK0JBQStCLEVBQUU7d0JBQ3RFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLG9EQUFvRCxFQUFFO3dCQUMzRixTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxvQ0FBb0MsRUFBRTtxQkFDbkY7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsV0FBVyxFQUFFLHFEQUFxRDtnQkFDbEUsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLFdBQVcsRUFBRSx3VEFBd1Q7Z0JBQ3JVLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsMkdBQTJHLEVBQUU7d0JBQ2xKLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLGtFQUFrRSxFQUFFO3FCQUM5RztpQkFDSjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGdDQUFnQztnQkFDdEMsV0FBVyxFQUFFLDRDQUE0QztnQkFDekQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRTt3QkFDdkQsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFO3dCQUN0RCxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO3FCQUN0RTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO2lCQUMvQjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSwyREFBMkQ7Z0JBQ3hFLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTthQUNsRDtZQUNELCtCQUErQjtZQUMvQjtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsNEVBQTRFO2dCQUN6RixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsRUFBRTt3QkFDeEYsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsc0JBQXNCLEVBQUU7d0JBQy9ELGtCQUFrQixFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUscUNBQXFDLEVBQUU7cUJBQzlGO29CQUNELFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7aUJBQ2hDO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBZ0IsRUFBRSxJQUF5QjtRQUNyRCxJQUFJLENBQUM7WUFDRCxRQUFRLFFBQVEsRUFBRSxDQUFDO2dCQUNmLEtBQUssc0JBQXNCO29CQUN2QixPQUFPLElBQUEsY0FBRSxFQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEUsS0FBSyxnQkFBZ0I7b0JBQ2pCLE9BQU8sSUFBQSxjQUFFLEVBQUMsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDMUUsS0FBSyxhQUFhO29CQUNkLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEMsS0FBSyxtQkFBbUI7b0JBQ3BCLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUM5RCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ2pDLEtBQUssaUJBQWlCO29CQUNsQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RDLEtBQUssWUFBWTtvQkFDYixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pDLEtBQUssYUFBYTtvQkFDZCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xDLEtBQUssYUFBYTtvQkFDZCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xDLEtBQUssY0FBYztvQkFDZixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNyRCxLQUFLLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN6SixPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDO2dCQUNELEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQztvQkFDbkIsTUFBTSxNQUFNLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7b0JBQy9FLE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7Z0JBQ0QsS0FBSyxrQkFBa0I7b0JBQ25CLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRTt3QkFDekQsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO3dCQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7d0JBQ2pCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxLQUFLO3FCQUN2RCxDQUFDLENBQUM7b0JBQ0gsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQztvQkFDSSxPQUFPLElBQUEsZUFBRyxFQUFDLGlCQUFpQixRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztJQUVELCtIQUErSDtJQUN2SCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQXlCO1FBQy9DLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWCxNQUFNLEtBQUssR0FBRyxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDNUUsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM3RCxDQUFDO1lBQ0QsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNYLE1BQU0sS0FBSyxHQUFHLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQy9FLE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDN0QsQ0FBQztZQUNELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDYixNQUFNLE9BQU8sR0FBRyxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFDaEYsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUMvRCxDQUFDO1lBQ0QsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7b0JBQUUsT0FBTyxJQUFBLGVBQUcsRUFBQyw2Q0FBNkMsQ0FBQyxDQUFDO2dCQUMxRSxNQUFNLEtBQUssR0FBRyxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVGLE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7WUFDRCxLQUFLLHNCQUFzQixDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO29CQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsdURBQXVELENBQUMsQ0FBQztnQkFDcEYsTUFBTSxTQUFTLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxRyxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7WUFDRCxLQUFLLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTO29CQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsc0RBQXNELENBQUMsQ0FBQztnQkFDeEYsTUFBTSxLQUFLLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMxRyxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFDRCxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLE1BQU0sTUFBTSxHQUFHLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3BGLE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDOUQsQ0FBQztZQUNEO2dCQUNJLE9BQU8sSUFBQSxlQUFHLEVBQUMsK0JBQStCLElBQUksQ0FBQyxNQUFNLHlHQUF5RyxDQUFDLENBQUM7UUFDeEssQ0FBQztJQUNMLENBQUM7SUFFRCwrQkFBK0I7SUFDdkIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUF5QjtRQUNuRCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixLQUFLLE1BQU07Z0JBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO29CQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsMkNBQTJDLENBQUMsQ0FBQztnQkFDeEUsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkUsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZFLEtBQUssS0FBSztnQkFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7b0JBQUUsT0FBTyxJQUFBLGVBQUcsRUFBQywwQ0FBMEMsQ0FBQyxDQUFDO2dCQUN2RSxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RSxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDdkUsS0FBSyxPQUFPO2dCQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVTtvQkFBRSxPQUFPLElBQUEsZUFBRyxFQUFDLGtEQUFrRCxDQUFDLENBQUM7Z0JBQ3JGLE1BQU0sQ0FBQyxHQUFHLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hGLE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFO2dCQUNJLE9BQU8sSUFBQSxlQUFHLEVBQUMsbUNBQW1DLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7SUFDTCxDQUFDO0lBRUQsMEJBQTBCO0lBQ2xCLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBeUI7UUFDOUMsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsS0FBSyxVQUFVO2dCQUNYLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMzRCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEQsS0FBSyxnQkFBZ0I7Z0JBQ2pCLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQ2pFLE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUN0RCxLQUFLLE9BQU87Z0JBQ1IsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDbEUsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELEtBQUssS0FBSztnQkFDTixNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFDaEUsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELEtBQUssUUFBUTtnQkFDVCxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNuRSxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEQ7Z0JBQ0ksT0FBTyxJQUFBLGVBQUcsRUFBQyw4QkFBOEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDaEUsQ0FBQztJQUNMLENBQUM7SUFFRCwyQkFBMkI7SUFDbkIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUF5QjtRQUMvQyxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixLQUFLLE1BQU07Z0JBQ1AsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQy9ELEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRixPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEQsS0FBSyxRQUFRO2dCQUNULE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLHNCQUFzQixFQUNqRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDN0QsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3REO2dCQUNJLE9BQU8sSUFBQSxlQUFHLEVBQUMsK0JBQStCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7SUFDTCxDQUFDO0lBRUQsMkJBQTJCO0lBQ25CLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBeUI7UUFDL0MsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsS0FBSyxXQUFXO2dCQUNaLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsS0FBSyxVQUFVO2dCQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtvQkFBRSxPQUFPLElBQUEsZUFBRyxFQUFDLDJDQUEyQyxDQUFDLENBQUM7Z0JBQ3hFLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RyxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEQsS0FBSyxXQUFXO2dCQUNaLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RixPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEQsS0FBSyxnQkFBZ0I7Z0JBQ2pCLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RixPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDdkU7Z0JBQ0ksT0FBTyxJQUFBLGVBQUcsRUFBQywrQkFBK0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDakUsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQVk7UUFDckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25HLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakYsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFhLEVBQUUsUUFBaUIsS0FBSztRQUMzRCxrREFBa0Q7UUFDbEQsSUFBSSxDQUFDO1lBQUMsTUFBTSxJQUFBLHFDQUF1QixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUM3QyxPQUFPLENBQU0sRUFBRSxDQUFDO1lBQUMsT0FBTyxJQUFBLGVBQUcsRUFBQyxDQUFDLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUV0RCxzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDO2dCQUNELE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUM1RCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxHQUFHLEdBQUcsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxLQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7b0JBQzlFLHFDQUFxQztvQkFDckMsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztvQkFDN0QsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3BELENBQUM7Z0JBQ0QsT0FBTyxJQUFBLGVBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0wsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRU8sS0FBSyxDQUFDLDBCQUEwQjtRQUNwQyxNQUFNLFFBQVEsR0FBRyw0QkFBNEIsQ0FBQztRQUM5QyxJQUFJLENBQUM7WUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLFVBQVUsRUFBRSx3QkFBd0IsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNyRyxJQUFJLE1BQU07Z0JBQUUsT0FBTyxNQUFNLENBQUM7UUFDOUIsQ0FBQztRQUFDLFFBQVEsY0FBYyxJQUFoQixDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUIsT0FBTyx3QkFBd0IsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7SUFDdEQsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFZO1FBQzVDLElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztnQkFBRSxJQUFJLElBQUksUUFBUSxDQUFDO1lBRS9DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMvRCxNQUFNLEdBQUcsR0FBRyxHQUFHLEVBQUUsZUFBQyxPQUFBLE1BQUEsTUFBQSxNQUFNLENBQUMsVUFBVSxzREFBSSxtQ0FBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQSxFQUFBLENBQUM7WUFDdEcsTUFBTSxHQUFHLEdBQUcsR0FBRyxFQUFFO2dCQUNiLE1BQU0sS0FBSyxHQUFHLGdFQUFnRSxDQUFDO2dCQUMvRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7b0JBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDbEYsT0FBTyxDQUFDLENBQUM7WUFDYixDQUFDLENBQUM7WUFFRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbkQsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVqRixTQUFTO1lBQ1QsSUFBSSxDQUFDO2dCQUNELGlFQUFpRTtnQkFDakUsTUFBTSxXQUFXLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxRixJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNkLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDOUUsQ0FBQztZQUNMLENBQUM7WUFBQyxRQUFRLGtDQUFrQyxJQUFwQyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUU5QyxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztJQUVPLHFCQUFxQixDQUFDLElBQVksRUFBRSxHQUFpQixFQUFFLEdBQWlCO1FBQzVFLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBRTNCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyRixNQUFNLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVyRSxPQUFPO1lBQ0gsaUJBQWlCO1lBQ2pCO2dCQUNJLFFBQVEsRUFBRSxlQUFlO2dCQUN6QixLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixPQUFPLEVBQUUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2FBQ3ZCO1lBQ0QsWUFBWTtZQUNaO2dCQUNJLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixPQUFPLEVBQUUsSUFBSTtnQkFDYixTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLEVBQUU7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEIsS0FBSyxFQUFFLElBQUksRUFBRTtnQkFDYixPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN0QixTQUFTLEVBQUUsQ0FBQztnQkFDWixNQUFNLEVBQUUsVUFBVTtnQkFDbEIsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDckIsaUJBQWlCLEVBQUUsS0FBSztnQkFDeEIsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDeEIsR0FBRyxFQUFFLE9BQU87YUFDZjtZQUNELGtCQUFrQjtZQUNsQjtnQkFDSSxRQUFRLEVBQUUsU0FBUztnQkFDbkIsS0FBSyxFQUFFLFFBQVE7Z0JBQ2YsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDdEIsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQixLQUFLLEVBQUUsSUFBSSxFQUFFO2dCQUNiLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RCLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sRUFBRSxRQUFRO2dCQUNoQixNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNyQixHQUFHLEVBQUUsWUFBWTthQUNwQjtZQUNELGtCQUFrQjtZQUNsQjtnQkFDSSxRQUFRLEVBQUUsU0FBUztnQkFDbkIsS0FBSyxFQUFFLFFBQVE7Z0JBQ2YsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDdEIsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUM7Z0JBQ3ZCLEtBQUssRUFBRSxJQUFJLEVBQUU7Z0JBQ2IsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDdEIsU0FBUyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxFQUFFLFVBQVU7Z0JBQ2xCLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3JCLEdBQUcsRUFBRSxZQUFZO2FBQ3BCO1lBQ0QsdUJBQXVCO1lBQ3ZCO2dCQUNJLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUNuQixRQUFRLEVBQUUsSUFBSTtnQkFDZCxXQUFXLEVBQUUsQ0FBQztnQkFDZCxTQUFTLEVBQUUsQ0FBQztnQkFDWixJQUFJLEVBQUUsRUFBRTtnQkFDUixRQUFRLEVBQUUsQ0FBQztnQkFDWCxZQUFZLEVBQUUsRUFBRTtnQkFDaEIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO2dCQUMxRCxNQUFNLEVBQUUsQ0FBQztnQkFDVCxRQUFRLEVBQUUsQ0FBQztnQkFDWCxXQUFXLEVBQUUsQ0FBQztnQkFDZCxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQy9ELFdBQVcsRUFBRSxVQUFVO2dCQUN2QixHQUFHLEVBQUUsRUFBRTthQUNWO1lBQ0QsNEJBQTRCO1lBQzVCO2dCQUNJLFFBQVEsRUFBRSxnQkFBZ0I7Z0JBQzFCLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ25CLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2dCQUMvRCxZQUFZLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDckQsR0FBRyxFQUFFLEVBQUU7YUFDVjtZQUNELHVCQUF1QjtZQUN2QjtnQkFDSSxRQUFRLEVBQUUsV0FBVztnQkFDckIsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDbkIsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsZ0JBQWdCLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUMvQixzQkFBc0IsRUFBRSxJQUFJO2dCQUM1QixHQUFHLEVBQUUsRUFBRTthQUNWO1lBQ0Qsb0NBQW9DO1lBQ3BDO2dCQUNJLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUNuQixRQUFRLEVBQUUsSUFBSTtnQkFDZCxXQUFXLEVBQUUsRUFBRTtnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLEVBQUUsQ0FBQztnQkFDUixNQUFNLEVBQUUsQ0FBQztnQkFDVCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsQ0FBQztnQkFDVixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFlBQVksRUFBRSxJQUFJO2dCQUNsQixjQUFjLEVBQUUsQ0FBQztnQkFDakIsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLEdBQUcsRUFBRSxFQUFFO2FBQ1Y7WUFDRCw4QkFBOEI7WUFDOUIsaUJBQWlCO1lBQ2pCLG9CQUFvQjtZQUNwQjtnQkFDSSxRQUFRLEVBQUUsaUJBQWlCO2dCQUMzQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN2QixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN2QixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN2QixHQUFHLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2FBQ3RCO1lBQ0QsbUJBQW1CO1lBQ25CLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDeEcsbUJBQW1CO1lBQ25CLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFO1lBQzlCLGtCQUFrQjtZQUNsQixFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUU7WUFDN0IsZUFBZTtZQUNmLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRTtTQUM3QixDQUFDO0lBQ04sQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYyxFQUFFLElBQVc7UUFDakQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxNQUFNO1lBQ04sSUFBSTtTQUNQLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQWxpQkQsZ0RBa2lCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgb2ssIGVyciB9IGZyb20gXCIuLi90b29sLWJhc2VcIjtcclxuaW1wb3J0IHsgZW5zdXJlU2NlbmVTYWZlVG9Td2l0Y2ggfSBmcm9tIFwiLi9zY2VuZS10b29sc1wiO1xyXG5cclxuY29uc3QgRVhUX05BTUUgPSBcImNvY29zLWNyZWF0b3ItbWNwXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU2NlbmVBZHZhbmNlZFRvb2xzIGltcGxlbWVudHMgVG9vbENhdGVnb3J5IHtcclxuICAgIHJlYWRvbmx5IGNhdGVnb3J5TmFtZSA9IFwic2NlbmVBZHZhbmNlZFwiO1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwic2NlbmVfZXhlY3V0ZV9zY3JpcHRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkV4ZWN1dGUgYSBzY2VuZSBzY3JpcHQgbWV0aG9kIGJ5IG5hbWUgd2l0aCBhcmd1bWVudHMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU2NlbmUgc2NyaXB0IG1ldGhvZCBuYW1lXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogeyB0eXBlOiBcImFycmF5XCIsIGRlc2NyaXB0aW9uOiBcIkFyZ3VtZW50cyB0byBwYXNzXCIsIGl0ZW1zOiB7fSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcIm1ldGhvZFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwic2NlbmVfY2xpcGJvYXJkXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDbGlwYm9hcmQgb3BzIG9uIHNjZW5lIG5vZGVzLiBBY3Rpb25zOiAnY29weScgKHV1aWQpLCAnY3V0JyAodXVpZCksICdwYXN0ZScgKHBhcmVudFV1aWQpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidjb3B5JyB8ICdjdXQnIHwgJ3Bhc3RlJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU291cmNlIG5vZGUgVVVJRCAoYWN0aW9uPWNvcHl8Y3V0KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRGVzdGluYXRpb24gcGFyZW50IFVVSUQgKGFjdGlvbj1wYXN0ZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwic2NlbmVfdW5kb1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVW5kbyAvIHNuYXBzaG90IHJlY29yZGluZy4gQWN0aW9uczogJ3NuYXBzaG90JyAob25lLXNob3QgdW5kbyBzbmFwc2hvdCksICdzbmFwc2hvdF9hYm9ydCcgKGNhbmNlbCBjdXJyZW50IHNuYXBzaG90KSwgJ2JlZ2luJyAoYmVnaW4tcmVjb3JkaW5nIGZvciBhIG11bHRpLXN0ZXAgdW5kbyBncm91cCksICdlbmQnIChlbmQtcmVjb3JkaW5nID0gY29tbWl0KSwgJ2NhbmNlbCcgKGNhbmNlbC1yZWNvcmRpbmcgPSBkaXNjYXJkKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInc25hcHNob3QnIHwgJ3NuYXBzaG90X2Fib3J0JyB8ICdiZWdpbicgfCAnZW5kJyB8ICdjYW5jZWwnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJhY3Rpb25cIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNjZW5lX2FycmF5XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBcnJheSBwcm9wZXJ0eSBlbGVtZW50IG9wcy4gQWN0aW9uczogJ21vdmUnICh1dWlkLCBwYXRoLCB0YXJnZXQsIG9mZnNldCDigJQgcmVvcmRlciBieSBpbmRleCBkZWx0YSkgYW5kICdyZW1vdmUnICh1dWlkLCBwYXRoLCBpbmRleCkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ21vdmUnIHwgJ3JlbW92ZSdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgb3IgY29tcG9uZW50IFVVSURcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkFycmF5IHByb3BlcnR5IHBhdGhcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiQ3VycmVudCBpbmRleCAoYWN0aW9uPW1vdmUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1vdmUgb2Zmc2V0IChhY3Rpb249bW92ZSk6ICsxID0gZG93biwgLTEgPSB1cFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIkluZGV4IHRvIHJlbW92ZSAoYWN0aW9uPXJlbW92ZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiLCBcInV1aWRcIiwgXCJwYXRoXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJzY2VuZV9yZXNldFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVzZXQgYSBub2RlLCBjb21wb25lbnQsIG9yIHByb3BlcnR5IHRvIGRlZmF1bHRzLiBBY3Rpb25zOiAndHJhbnNmb3JtJyAodXVpZCDigJQgbm9kZSBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSB0byBpZGVudGl0eSksICdwcm9wZXJ0eScgKHV1aWQsIHBhdGgg4oCUIHNpbmdsZSBwcm9wZXJ0eSksICdjb21wb25lbnQnICh1dWlkIOKAlCBjb21wb25lbnQgdG8gZGVmYXVsdHMpLCAncmVzdG9yZV9wcmVmYWInICh1dWlkIOKAlCByZXZlcnQgcHJlZmFiIGluc3RhbmNlIHRvIG9yaWdpbmFsKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCIndHJhbnNmb3JtJyB8ICdwcm9wZXJ0eScgfCAnY29tcG9uZW50JyB8ICdyZXN0b3JlX3ByZWZhYidcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlRhcmdldCBVVUlEIChub2RlIGZvciB0cmFuc2Zvcm0vcmVzdG9yZV9wcmVmYWIsIGNvbXBvbmVudCBmb3IgY29tcG9uZW50LCBlaXRoZXIgZm9yIHByb3BlcnR5KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiUHJvcGVydHkgcGF0aCAoYWN0aW9uPXByb3BlcnR5KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCIsIFwidXVpZFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwic2NlbmVfcXVlcnlcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlF1ZXJ5IHNjZW5lIHN0YXRlLiBBY3Rpb25zOiAnZGlydHknIChoYXMgdW5zYXZlZCBjaGFuZ2VzPyksICdyZWFkeScgKHNjZW5lIGZ1bGx5IGxvYWRlZD8pLCAnY2xhc3NlcycgKGFsbCBjb21wb25lbnQgY2xhc3NlcyksICdjb21wb25lbnRzJyAoYXZhaWxhYmxlIGNvbXBvbmVudHMgZm9yIGEgbm9kZSDigJQgdXVpZCByZXF1aXJlZCksICdjb21wb25lbnRfaGFzX3NjcmlwdCcgKGRvZXMgYSBjb21wb25lbnQgY2xhc3MgaGF2ZSBhIHNjcmlwdCBmaWxlIOKAlCBuYW1lIHJlcXVpcmVkKSwgJ25vZGVzX2J5X2Fzc2V0JyAobm9kZXMgcmVmZXJlbmNpbmcgYW4gYXNzZXQg4oCUIGFzc2V0VXVpZCByZXF1aXJlZCksICdzY2VuZV9ib3VuZHMnIChjdXJyZW50IHNjZW5lIGJvdW5kaW5nIHJlY3QpLiBGb3IgZnVsbCBub2RlL2NvbXBvbmVudCBkdW1wcyB1c2UgY29jb3M6Ly9ub2RlL3t1dWlkfSAvIGNvY29zOi8vY29tcG9uZW50L3t1dWlkfSByZXNvdXJjZXMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2RpcnR5JyB8ICdyZWFkeScgfCAnY2xhc3NlcycgfCAnY29tcG9uZW50cycgfCAnY29tcG9uZW50X2hhc19zY3JpcHQnIHwgJ25vZGVzX2J5X2Fzc2V0JyB8ICdzY2VuZV9ib3VuZHMnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQgKGFjdGlvbj1jb21wb25lbnRzKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IGNsYXNzIG5hbWUgKGFjdGlvbj1jb21wb25lbnRfaGFzX3NjcmlwdClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQXNzZXQgVVVJRCAoYWN0aW9uPW5vZGVzX2J5X2Fzc2V0KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJzY2VuZV9zb2Z0X3JlbG9hZFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU29mdCByZWxvYWQgdGhlIGN1cnJlbnQgc2NlbmUgd2l0aG91dCBsb3Npbmcgc3RhdGUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNjZW5lX2NyZWF0ZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ3JlYXRlIGEgbmV3IGVtcHR5IDJEIHNjZW5lLiBJZiBwYXRoIGlzIG9taXR0ZWQsIHVzZXMgdGhlIGVkaXRvcidzIGJ1aWx0LWluIG5ldy1zY2VuZSBjb21tYW5kIChtYXkgbm90IHdvcmsgb24gQ0MgMy44LngpLiBJZiBwYXRoIGlzIHNwZWNpZmllZCwgY3JlYXRlcyBhIC5zY2VuZSBmaWxlIHZpYSBhc3NldC1kYiBhcyBhIGZhbGxiYWNrLiBSZXR1cm5zIGFuIGVycm9yIGlmIHRoZSBjdXJyZW50IHNjZW5lIGlzIGRpcnR5IGFuZCB1bnRpdGxlZCAodG8gYXZvaWQgbW9kYWwgc2F2ZSBkaWFsb2cpOyBwYXNzIGZvcmNlPXRydWUgdG8gYnlwYXNzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTY2VuZSBhc3NldCBwYXRoIChlLmcuICdkYjovL2Fzc2V0cy9zY2VuZXMvTmV3U2NlbmUuc2NlbmUnKS4gSWYgb21pdHRlZCwgdXNlcyBlZGl0b3IncyBuZXctc2NlbmUgY29tbWFuZC5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JjZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiU2tpcCBkaXJ0eS1zY2VuZSBwcmVmbGlnaHQgY2hlY2sgKG1heSB0cmlnZ2VyIG1vZGFsIHNhdmUgZGlhbG9nKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwic2NlbmVfZXhlY3V0ZV9jb21wb25lbnRfbWV0aG9kXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDYWxsIGEgbWV0aG9kIG9uIGEgY29tcG9uZW50IGF0IGVkaXQtdGltZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IFVVSURcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTWV0aG9kIG5hbWVcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7IHR5cGU6IFwiYXJyYXlcIiwgZGVzY3JpcHRpb246IFwiTWV0aG9kIGFyZ3VtZW50c1wiLCBpdGVtczoge30gfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1dWlkXCIsIFwibWV0aG9kXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJzY2VuZV9zYXZlX2FzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTYXZlIHRoZSBjdXJyZW50IHNjZW5lIHRvIGEgbmV3IGZpbGUgKHNob3dzIHNhdmUgZGlhbG9nKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIOKUgOKUgCDku6XkuIvjgIHml6LlrZhNQ1DmnKrlr77lv5zjga5FZGl0b3IgQVBJIOKUgOKUgFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNjZW5lX3NldF9wYXJlbnRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlcGFyZW50IG5vZGUocykgdXNpbmcgdGhlIG9mZmljaWFsIEVkaXRvciBBUEkgKGFsdGVybmF0aXZlIHRvIG5vZGVfbW92ZSkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkczogeyB0eXBlOiBcImFycmF5XCIsIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEKHMpIHRvIG1vdmVcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTmV3IHBhcmVudCBub2RlIFVVSURcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZWVwV29ybGRUcmFuc2Zvcm06IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIktlZXAgd29ybGQgcG9zaXRpb24gKGRlZmF1bHQgZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1dWlkc1wiLCBcInBhcmVudFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwic2NlbmVfZXhlY3V0ZV9zY3JpcHRcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChhcmdzLm1ldGhvZCwgYXJncy5hcmdzIHx8IFtdKSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwic2NlbmVfc25hcHNob3RcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic25hcHNob3RcIikpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInNjZW5lX3F1ZXJ5XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlUXVlcnkoYXJncyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwic2NlbmVfc29mdF9yZWxvYWRcIjpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJzb2Z0LXJlbG9hZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInNjZW5lX2NsaXBib2FyZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUNsaXBib2FyZChhcmdzKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzY2VuZV91bmRvXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlVW5kbyhhcmdzKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzY2VuZV9hcnJheVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUFycmF5KGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInNjZW5lX3Jlc2V0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlUmVzZXQoYXJncyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwic2NlbmVfY3JlYXRlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlU2NlbmUoYXJncy5wYXRoLCAhIWFyZ3MuZm9yY2UpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInNjZW5lX2V4ZWN1dGVfY29tcG9uZW50X21ldGhvZFwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiZXhlY3V0ZS1jb21wb25lbnQtbWV0aG9kXCIsIHsgdXVpZDogYXJncy51dWlkLCBuYW1lOiBhcmdzLm1ldGhvZCwgYXJnczogYXJncy5hcmdzIHx8IFtdIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdCB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzY2VuZV9zYXZlX2FzXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJzYXZlLWFzLXNjZW5lXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdCB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzY2VuZV9zZXRfcGFyZW50XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic2V0LXBhcmVudFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogYXJncy5wYXJlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRzOiBhcmdzLnV1aWRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZWVwV29ybGRUcmFuc2Zvcm06IGFyZ3Mua2VlcFdvcmxkVHJhbnNmb3JtIHx8IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogc2NlbmVfcXVlcnkgKHYyLjAuMCkg4oCUIOaXpyBzY2VuZV9xdWVyeV9kaXJ0eS9yZWFkeS9jbGFzc2VzL2NvbXBvbmVudHMvY29tcG9uZW50X2hhc19zY3JpcHQvbm9kZXNfYnlfYXNzZXQvc2NlbmVfYm91bmRzIOOCkue1seWQiCAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVRdWVyeShhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICBjYXNlIFwiZGlydHlcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGlydHkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1kaXJ0eVwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIGRpcnR5IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJyZWFkeVwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWFkeSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWlzLXJlYWR5XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgcmVhZHkgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcImNsYXNzZXNcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2xhc3NlcyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWNsYXNzZXNcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBjbGFzc2VzIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRzXCI6IHtcclxuICAgICAgICAgICAgICAgIGlmICghYXJncy51dWlkKSByZXR1cm4gZXJyKFwic2NlbmVfcXVlcnkoY29tcG9uZW50cyk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktY29tcG9uZW50c1wiLCBhcmdzLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgY29tcG9uZW50czogY29tcHMgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcImNvbXBvbmVudF9oYXNfc2NyaXB0XCI6IHtcclxuICAgICAgICAgICAgICAgIGlmICghYXJncy5uYW1lKSByZXR1cm4gZXJyKFwic2NlbmVfcXVlcnkoY29tcG9uZW50X2hhc19zY3JpcHQpOiAnbmFtZScgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNTY3JpcHQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1jb21wb25lbnQtaGFzLXNjcmlwdFwiLCBhcmdzLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgbmFtZTogYXJncy5uYW1lLCBoYXNTY3JpcHQgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcIm5vZGVzX2J5X2Fzc2V0XCI6IHtcclxuICAgICAgICAgICAgICAgIGlmICghYXJncy5hc3NldFV1aWQpIHJldHVybiBlcnIoXCJzY2VuZV9xdWVyeShub2Rlc19ieV9hc3NldCk6ICdhc3NldFV1aWQnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZXMgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ub2Rlcy1ieS1hc3NldC11dWlkXCIsIGFyZ3MuYXNzZXRVdWlkKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIG5vZGVzIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJzY2VuZV9ib3VuZHNcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYm91bmRzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktc2NlbmUtYm91bmRzXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgYm91bmRzIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHNjZW5lX3F1ZXJ5IGFjdGlvbjogJHthcmdzLmFjdGlvbn0uIEV4cGVjdGVkIGRpcnR5IC8gcmVhZHkgLyBjbGFzc2VzIC8gY29tcG9uZW50cyAvIGNvbXBvbmVudF9oYXNfc2NyaXB0IC8gbm9kZXNfYnlfYXNzZXQgLyBzY2VuZV9ib3VuZHMuYCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBzY2VuZV9jbGlwYm9hcmQgKHYyLjAuMCkgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlQ2xpcGJvYXJkKGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb3B5XCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MudXVpZCkgcmV0dXJuIGVycihcInNjZW5lX2NsaXBib2FyZChjb3B5KTogJ3V1aWQnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiY29weS1ub2RlXCIsIGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCB1dWlkOiBhcmdzLnV1aWQgfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjdXRcIjpcclxuICAgICAgICAgICAgICAgIGlmICghYXJncy51dWlkKSByZXR1cm4gZXJyKFwic2NlbmVfY2xpcGJvYXJkKGN1dCk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcImN1dC1ub2RlXCIsIGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCB1dWlkOiBhcmdzLnV1aWQgfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJwYXN0ZVwiOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLnBhcmVudFV1aWQpIHJldHVybiBlcnIoXCJzY2VuZV9jbGlwYm9hcmQocGFzdGUpOiAncGFyZW50VXVpZCcgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicGFzdGUtbm9kZVwiLCBhcmdzLnBhcmVudFV1aWQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgcmVzdWx0OiByIH0pO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBzY2VuZV9jbGlwYm9hcmQgYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogc2NlbmVfdW5kbyAodjIuMC4wKSAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVVbmRvKGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzbmFwc2hvdFwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic25hcHNob3RcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uIH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwic25hcHNob3RfYWJvcnRcIjpcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNuYXBzaG90LWFib3J0XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiB9KTtcclxuICAgICAgICAgICAgY2FzZSBcImJlZ2luXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJiZWdpbi1yZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uIH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwiZW5kXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJlbmQtcmVjb3JkaW5nXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiB9KTtcclxuICAgICAgICAgICAgY2FzZSBcImNhbmNlbFwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiY2FuY2VsLXJlY29yZGluZ1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24gfSk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHNjZW5lX3VuZG8gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogc2NlbmVfYXJyYXkgKHYyLjAuMCkgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlQXJyYXkoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSBcIm1vdmVcIjpcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcIm1vdmUtYXJyYXktZWxlbWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHsgdXVpZDogYXJncy51dWlkLCBwYXRoOiBhcmdzLnBhdGgsIHRhcmdldDogYXJncy50YXJnZXQsIG9mZnNldDogYXJncy5vZmZzZXQgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uIH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwicmVtb3ZlXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJyZW1vdmUtYXJyYXktZWxlbWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHsgdXVpZDogYXJncy51dWlkLCBwYXRoOiBhcmdzLnBhdGgsIGluZGV4OiBhcmdzLmluZGV4IH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiB9KTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gc2NlbmVfYXJyYXkgYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogc2NlbmVfcmVzZXQgKHYyLjAuMCkgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUmVzZXQoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSBcInRyYW5zZm9ybVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXRUcmFuc2Zvcm0oYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSBcInByb3BlcnR5XCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MucGF0aCkgcmV0dXJuIGVycihcInNjZW5lX3Jlc2V0KHByb3BlcnR5KTogJ3BhdGgnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicmVzZXQtcHJvcGVydHlcIiwgeyB1dWlkOiBhcmdzLnV1aWQsIHBhdGg6IGFyZ3MucGF0aCB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24gfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21wb25lbnRcIjpcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInJlc2V0LWNvbXBvbmVudFwiLCB7IHV1aWQ6IGFyZ3MudXVpZCB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24gfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJyZXN0b3JlX3ByZWZhYlwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicmVzdG9yZS1wcmVmYWJcIiwgeyB1dWlkOiBhcmdzLnV1aWQgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCB1dWlkOiBhcmdzLnV1aWQgfSk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHNjZW5lX3Jlc2V0IGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldFRyYW5zZm9ybSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwic2V0Tm9kZVByb3BlcnR5XCIsIFt1dWlkLCBcInBvc2l0aW9uXCIsIHsgeDogMCwgeTogMCwgejogMCB9XSk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcInNldE5vZGVQcm9wZXJ0eVwiLCBbdXVpZCwgXCJyb3RhdGlvblwiLCB7IHg6IDAsIHk6IDAsIHo6IDAgfV0pO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2NlbmVTY3JpcHQoXCJzZXROb2RlUHJvcGVydHlcIiwgW3V1aWQsIFwic2NhbGVcIiwgeyB4OiAxLCB5OiAxLCB6OiAxIH1dKTtcclxuICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB1dWlkIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlU2NlbmUocGF0aD86IHN0cmluZywgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIC8vIOODgOOCpOOCouODreOCsOWJsuOCiui+vOOBv+mYsuatojog54++5Zyo44K344O844Oz44GMIGRpcnR5IOOBi+OBpCB1bnRpdGxlZCDjga7loLTlkIjjga/kuovliY3jgqjjg6njg7xcclxuICAgICAgICB0cnkgeyBhd2FpdCBlbnN1cmVTY2VuZVNhZmVUb1N3aXRjaChmb3JjZSk7IH1cclxuICAgICAgICBjYXRjaCAoZTogYW55KSB7IHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7IH1cclxuXHJcbiAgICAgICAgLy8g44G+44GaIHNjZW5lOm5ldy1zY2VuZSDjgpLoqabooYzvvIhwYXRoIOacquaMh+WumuaZguOBruOBv++8iVxyXG4gICAgICAgIGlmICghcGF0aCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwibmV3LXNjZW5lXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBlPy5tZXNzYWdlIHx8IFN0cmluZyhlKTtcclxuICAgICAgICAgICAgICAgIGlmIChtc2cuaW5jbHVkZXMoXCJNZXNzYWdlIGRvZXMgbm90IGV4aXN0XCIpIHx8IG1zZy5pbmNsdWRlcyhcInNjZW5lIC0gbmV3LXNjZW5lXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ0MgMy44Lngg4oaSIGFzc2V0LWRiIGZhbGxiYWNrIOOBq+ODleOCqeODvOODq1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrUGF0aCA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVBdmFpbGFibGVTY2VuZVBhdGgoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVTY2VuZVZpYUFzc2V0RGIoZmFsbGJhY2tQYXRoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIobXNnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gcGF0aCDmjIflrpog4oaSIGFzc2V0LWRiIGZhbGxiYWNrXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlU2NlbmVWaWFBc3NldERiKHBhdGgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVBdmFpbGFibGVTY2VuZVBhdGgoKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgICAgICBjb25zdCBiYXNlUGF0aCA9IFwiZGI6Ly9hc3NldHMvTmV3U2NlbmUuc2NlbmVcIjtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYXNzZXQtZGJcIiwgXCJnZW5lcmF0ZS1hdmFpbGFibGUtdXJsXCIsIGJhc2VQYXRoKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9IGNhdGNoIHsgLyogZmFsbGJhY2sgKi8gfVxyXG4gICAgICAgIHJldHVybiBgZGI6Ly9hc3NldHMvTmV3U2NlbmVfJHtEYXRlLm5vdygpfS5zY2VuZWA7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVTY2VuZVZpYUFzc2V0RGIocGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKCFwYXRoLmVuZHNXaXRoKFwiLnNjZW5lXCIpKSBwYXRoICs9IFwiLnNjZW5lXCI7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzY2VuZU5hbWUgPSBwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSEucmVwbGFjZShcIi5zY2VuZVwiLCBcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgdWlkID0gKCkgPT4gY3J5cHRvLnJhbmRvbVVVSUQ/LigpID8/IGAke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgMTApfWA7XHJcbiAgICAgICAgICAgIGNvbnN0IHNpZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNoYXJzID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OVwiO1xyXG4gICAgICAgICAgICAgICAgbGV0IHMgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyMTsgaSsrKSBzICs9IGNoYXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCldO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHM7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzY2VuZUpzb24gPSB0aGlzLmJ1aWxkTWluaW1hbFNjZW5lSnNvbihzY2VuZU5hbWUsIHVpZCwgc2lkKTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHNjZW5lSnNvbiwgbnVsbCwgMik7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYXNzZXQtZGJcIiwgXCJjcmVhdGUtYXNzZXRcIiwgcGF0aCwgY29udGVudCk7XHJcblxyXG4gICAgICAgICAgICAvLyDjgrfjg7zjg7PjgpLplovjgY9cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vIGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoIOOBryBjcmVhdGVTY2VuZSDlhaXlj6Pjgafml6LjgavpgJrpgY7muIjjgb/jgarjga7jgafjgZPjgZPjgafjga/lho3jg4Hjgqfjg4Pjgq/jgZfjgarjgYRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5UmVzdWx0ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImFzc2V0LWRiXCIsIFwicXVlcnktdXVpZFwiLCBwYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcIm9wZW4tc2NlbmVcIiwgcXVlcnlSZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogb3BlbiBmYWlsdXJlIGlzIG5vdCBjcml0aWNhbCAqLyB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBwYXRoLCBtZXRob2Q6IFwiYXNzZXQtZGItZmFsbGJhY2tcIiB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZE1pbmltYWxTY2VuZUpzb24obmFtZTogc3RyaW5nLCB1aWQ6ICgpID0+IHN0cmluZywgc2lkOiAoKSA9PiBzdHJpbmcpOiBhbnlbXSB7XHJcbiAgICAgICAgY29uc3Qgc2NlbmVJZCA9IHVpZCgpO1xyXG4gICAgICAgIGNvbnN0IGNhbnZhc05vZGVJZCA9IHNpZCgpO1xyXG4gICAgICAgIGNvbnN0IGNhbWVyYU5vZGVJZCA9IHNpZCgpO1xyXG5cclxuICAgICAgICBjb25zdCB2ZWMzID0gKHg6IG51bWJlciwgeTogbnVtYmVyLCB6OiBudW1iZXIpID0+ICh7IF9fdHlwZV9fOiBcImNjLlZlYzNcIiwgeCwgeSwgeiB9KTtcclxuICAgICAgICBjb25zdCBxdWF0ID0gKCkgPT4gKHsgX190eXBlX186IFwiY2MuUXVhdFwiLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAvLyBbMF0gU2NlbmVBc3NldFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogXCJjYy5TY2VuZUFzc2V0XCIsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX25hdGl2ZTogXCJcIixcclxuICAgICAgICAgICAgICAgIHNjZW5lOiB7IF9faWRfXzogMSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBbMV0gU2NlbmVcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186IFwiY2MuU2NlbmVcIixcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDIgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB2ZWMzKDAsIDAsIDApLFxyXG4gICAgICAgICAgICAgICAgX2xyb3Q6IHF1YXQoKSxcclxuICAgICAgICAgICAgICAgIF9sc2NhbGU6IHZlYzMoMSwgMSwgMSksXHJcbiAgICAgICAgICAgICAgICBfbW9iaWxpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfbGF5ZXI6IDEwNzM3NDE4MjQsXHJcbiAgICAgICAgICAgICAgICBfZXVsZXI6IHZlYzMoMCwgMCwgMCksXHJcbiAgICAgICAgICAgICAgICBhdXRvUmVsZWFzZUFzc2V0czogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBfZ2xvYmFsczogeyBfX2lkX186IDEwIH0sXHJcbiAgICAgICAgICAgICAgICBfaWQ6IHNjZW5lSWQsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIFsyXSBDYW52YXMgbm9kZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogXCJjYy5Ob2RlXCIsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogXCJDYW52YXNcIixcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX3BhcmVudDogeyBfX2lkX186IDEgfSxcclxuICAgICAgICAgICAgICAgIF9jaGlsZHJlbjogW3sgX19pZF9fOiAzIH1dLFxyXG4gICAgICAgICAgICAgICAgX2FjdGl2ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9jb21wb25lbnRzOiBbeyBfX2lkX186IDUgfSwgeyBfX2lkX186IDYgfSwgeyBfX2lkX186IDcgfV0sXHJcbiAgICAgICAgICAgICAgICBfcHJlZmFiOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2xwb3M6IHZlYzMoMCwgMCwgMCksXHJcbiAgICAgICAgICAgICAgICBfbHJvdDogcXVhdCgpLFxyXG4gICAgICAgICAgICAgICAgX2xzY2FsZTogdmVjMygxLCAxLCAxKSxcclxuICAgICAgICAgICAgICAgIF9tb2JpbGl0eTogMCxcclxuICAgICAgICAgICAgICAgIF9sYXllcjogMzM1NTQ0MzIsXHJcbiAgICAgICAgICAgICAgICBfZXVsZXI6IHZlYzMoMCwgMCwgMCksXHJcbiAgICAgICAgICAgICAgICBfaWQ6IGNhbnZhc05vZGVJZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gWzNdIENhbWVyYSBub2RlXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiBcImNjLk5vZGVcIixcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBcIkNhbWVyYVwiLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgIF9hY3RpdmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY29tcG9uZW50czogW3sgX19pZF9fOiA0IH1dLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB2ZWMzKDAsIDAsIDEwMDApLFxyXG4gICAgICAgICAgICAgICAgX2xyb3Q6IHF1YXQoKSxcclxuICAgICAgICAgICAgICAgIF9sc2NhbGU6IHZlYzMoMSwgMSwgMSksXHJcbiAgICAgICAgICAgICAgICBfbW9iaWxpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfbGF5ZXI6IDEwNzM3NDE4MjQsXHJcbiAgICAgICAgICAgICAgICBfZXVsZXI6IHZlYzMoMCwgMCwgMCksXHJcbiAgICAgICAgICAgICAgICBfaWQ6IGNhbWVyYU5vZGVJZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gWzRdIENhbWVyYSBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186IFwiY2MuQ2FtZXJhXCIsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogXCJcIixcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgbm9kZTogeyBfX2lkX186IDMgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX3Byb2plY3Rpb246IDEsXHJcbiAgICAgICAgICAgICAgICBfcHJpb3JpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfZm92OiA0NSxcclxuICAgICAgICAgICAgICAgIF9mb3ZBeGlzOiAwLFxyXG4gICAgICAgICAgICAgICAgX29ydGhvSGVpZ2h0OiAxMCxcclxuICAgICAgICAgICAgICAgIF9uZWFyOiAxLFxyXG4gICAgICAgICAgICAgICAgX2ZhcjogMjAwMCxcclxuICAgICAgICAgICAgICAgIF9jb2xvcjogeyBfX3R5cGVfXzogXCJjYy5Db2xvclwiLCByOiAwLCBnOiAwLCBiOiAwLCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9kZXB0aDogMSxcclxuICAgICAgICAgICAgICAgIF9zdGVuY2lsOiAwLFxyXG4gICAgICAgICAgICAgICAgX2NsZWFyRmxhZ3M6IDYsXHJcbiAgICAgICAgICAgICAgICBfcmVjdDogeyBfX3R5cGVfXzogXCJjYy5SZWN0XCIsIHg6IDAsIHk6IDAsIHdpZHRoOiAxLCBoZWlnaHQ6IDEgfSxcclxuICAgICAgICAgICAgICAgIF92aXNpYmlsaXR5OiAxMTA4MzQ0ODMyLFxyXG4gICAgICAgICAgICAgICAgX2lkOiBcIlwiLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBbNV0gVUlUcmFuc2Zvcm0gb24gQ2FudmFzXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiBcImNjLlVJVHJhbnNmb3JtXCIsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogXCJcIixcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgbm9kZTogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbnRlbnRTaXplOiB7IF9fdHlwZV9fOiBcImNjLlNpemVcIiwgd2lkdGg6IDcyMCwgaGVpZ2h0OiAxMjgwIH0sXHJcbiAgICAgICAgICAgICAgICBfYW5jaG9yUG9pbnQ6IHsgX190eXBlX186IFwiY2MuVmVjMlwiLCB4OiAwLjUsIHk6IDAuNSB9LFxyXG4gICAgICAgICAgICAgICAgX2lkOiBcIlwiLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBbNl0gQ2FudmFzIGNvbXBvbmVudFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogXCJjYy5DYW52YXNcIixcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY2FtZXJhQ29tcG9uZW50OiB7IF9faWRfXzogNCB9LFxyXG4gICAgICAgICAgICAgICAgX2FsaWduQ2FudmFzV2l0aFNjcmVlbjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9pZDogXCJcIixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gWzddIFdpZGdldCBvbiBDYW52YXMgKGZ1bGxzY3JlZW4pXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiBcImNjLldpZGdldFwiLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IHsgX19pZF9fOiAyIH0sXHJcbiAgICAgICAgICAgICAgICBfZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9hbGlnbkZsYWdzOiAxNSxcclxuICAgICAgICAgICAgICAgIF90YXJnZXQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbGVmdDogMCxcclxuICAgICAgICAgICAgICAgIF9yaWdodDogMCxcclxuICAgICAgICAgICAgICAgIF90b3A6IDAsXHJcbiAgICAgICAgICAgICAgICBfYm90dG9tOiAwLFxyXG4gICAgICAgICAgICAgICAgX2lzQWJzTGVmdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9pc0Fic1JpZ2h0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2lzQWJzVG9wOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2lzQWJzQm90dG9tOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX29yaWdpbmFsV2lkdGg6IDAsXHJcbiAgICAgICAgICAgICAgICBfb3JpZ2luYWxIZWlnaHQ6IDAsXHJcbiAgICAgICAgICAgICAgICBfaWQ6IFwiXCIsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIFs4XSBjYy5QcmVmYWJJbmZvIGZvciBzY2VuZVxyXG4gICAgICAgICAgICAvLyBbOV0gKHJlc2VydmVkKVxyXG4gICAgICAgICAgICAvLyBbMTBdIFNjZW5lR2xvYmFsc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogXCJjYy5TY2VuZUdsb2JhbHNcIixcclxuICAgICAgICAgICAgICAgIGFtYmllbnQ6IHsgX19pZF9fOiAxMSB9LFxyXG4gICAgICAgICAgICAgICAgc2hhZG93czogeyBfX2lkX186IDEyIH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5Ym94OiB7IF9faWRfXzogMTMgfSxcclxuICAgICAgICAgICAgICAgIGZvZzogeyBfX2lkX186IDE0IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIFsxMV0gQW1iaWVudEluZm9cclxuICAgICAgICAgICAgeyBfX3R5cGVfXzogXCJjYy5BbWJpZW50SW5mb1wiLCBfc2t5TGlnaHRpbmdDb2xvcjogeyBfX3R5cGVfXzogXCJjYy5WZWM0XCIsIHg6IDAuMiwgeTogMC4yLCB6OiAwLjIsIHc6IDEgfSB9LFxyXG4gICAgICAgICAgICAvLyBbMTJdIFNoYWRvd3NJbmZvXHJcbiAgICAgICAgICAgIHsgX190eXBlX186IFwiY2MuU2hhZG93c0luZm9cIiB9LFxyXG4gICAgICAgICAgICAvLyBbMTNdIFNreWJveEluZm9cclxuICAgICAgICAgICAgeyBfX3R5cGVfXzogXCJjYy5Ta3lib3hJbmZvXCIgfSxcclxuICAgICAgICAgICAgLy8gWzE0XSBGb2dJbmZvXHJcbiAgICAgICAgICAgIHsgX190eXBlX186IFwiY2MuRm9nSW5mb1wiIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNjZW5lU2NyaXB0KG1ldGhvZDogc3RyaW5nLCBhcmdzOiBhbnlbXSk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgcmV0dXJuIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgbmFtZTogRVhUX05BTUUsXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgYXJncyxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=