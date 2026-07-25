"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefabTools = void 0;
const tool_base_1 = require("../tool-base");
const scene_tools_1 = require("./scene-tools");
const utils_1 = require("../utils");
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const EXT_NAME = "cocos-creator-mcp";
class PrefabTools {
    constructor(componentTools) {
        this.categoryName = "prefab";
        this._pendingNestedPrefabs = [];
        /** prefab_open で開いた Prefab アセット UUID */
        this._currentPrefabUuid = null;
        this._componentTools = componentTools !== null && componentTools !== void 0 ? componentTools : null;
    }
    getTools() {
        return [
            {
                name: "prefab_create",
                description: "Create a prefab. Modes: 'simple' (default — extract a node into a prefab, original node stays in scene; needs uuid + path), 'replace' (extract + replace original node with a prefab instance, recommended for nested prefabs; needs uuid + path), 'from_spec' (build node tree + auto-bind + create in one call from a JSON spec; needs path + spec [+ autoBindMode]).",
                inputSchema: {
                    type: "object",
                    properties: {
                        mode: { type: "string", description: "'simple' (default) | 'replace' | 'from_spec'" },
                        uuid: { type: "string", description: "Node UUID (mode=simple|replace)" },
                        path: { type: "string", description: "db:// path for the new prefab" },
                        spec: { description: "Node tree spec (mode=from_spec) — see node_create_tree format + optional autoBind field" },
                        autoBindMode: { type: "string", enum: ["fuzzy", "strict"], description: "Auto-bind matching mode (mode=from_spec, default fuzzy)" },
                    },
                    required: ["path"],
                },
            },
            {
                name: "prefab_instantiate",
                description: "Instantiate a prefab into the scene.",
                inputSchema: {
                    type: "object",
                    properties: {
                        prefabUuid: { type: "string", description: "Prefab asset UUID" },
                        parent: { type: "string", description: "Parent node UUID (optional, defaults to scene root)" },
                    },
                    required: ["prefabUuid"],
                },
            },
            {
                name: "prefab_update",
                description: "Update (re-save) a prefab from its instance node in the scene.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID of the prefab instance in the scene" },
                    },
                    required: ["uuid"],
                },
            },
            {
                name: "prefab_duplicate",
                description: "Duplicate a prefab asset to a new path.",
                inputSchema: {
                    type: "object",
                    properties: {
                        source: { type: "string", description: "Source prefab db:// path" },
                        destination: { type: "string", description: "Destination db:// path" },
                    },
                    required: ["source", "destination"],
                },
            },
            {
                name: "prefab_validate",
                description: "Validate a prefab for missing references or broken links.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Prefab asset UUID" },
                    },
                    required: ["uuid"],
                },
            },
            {
                name: "prefab_revert",
                description: "Revert a prefab instance node to its original prefab state.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uuid: { type: "string", description: "Node UUID of the prefab instance" },
                    },
                    required: ["uuid"],
                },
            },
            {
                name: "prefab_edit",
                description: "Enter / exit prefab editing mode. Actions: 'open' (uuid or path [+ force]) — equivalent to double-clicking the prefab; 'close' ([+ save] [+ sceneUuid] [+ force]) — save & exit edit mode and return to a scene. dirty-untitled preflight applies as with scene_manage.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'open' | 'close'" },
                        uuid: { type: "string", description: "Prefab asset UUID (action=open)" },
                        path: { type: "string", description: "Prefab db:// path (action=open, alternative to uuid)" },
                        save: { type: "boolean", description: "Save prefab before closing (action=close, default true)" },
                        sceneUuid: { type: "string", description: "Scene UUID to return to on close (default: start scene)" },
                        force: { type: "boolean", description: "Skip dirty-scene preflight" },
                    },
                    required: ["action"],
                },
            },
        ];
    }
    async execute(toolName, args) {
        var _a;
        switch (toolName) {
            case "prefab_create": {
                const mode = args.mode || "simple";
                if (mode === "simple") {
                    if (!args.uuid)
                        return (0, tool_base_1.err)("prefab_create(simple): 'uuid' is required");
                    return this.createPrefab(args.uuid, args.path);
                }
                if (mode === "replace") {
                    if (!args.uuid)
                        return (0, tool_base_1.err)("prefab_create(replace): 'uuid' is required");
                    return this.createAndReplace(args.uuid, args.path);
                }
                if (mode === "from_spec") {
                    if (!args.spec)
                        return (0, tool_base_1.err)("prefab_create(from_spec): 'spec' is required");
                    return this.createFromSpec(args.path, (0, utils_1.parseMaybeJson)(args.spec), (_a = args.autoBindMode) !== null && _a !== void 0 ? _a : "fuzzy");
                }
                return (0, tool_base_1.err)(`Unknown prefab_create mode: ${mode}. Expected simple / replace / from_spec.`);
            }
            case "prefab_instantiate":
                return this.instantiatePrefab(args.prefabUuid, args.parent);
            case "prefab_update":
                return this.updatePrefab(args.uuid);
            case "prefab_duplicate": {
                try {
                    await Editor.Message.request("asset-db", "copy-asset", args.source, args.destination);
                    return (0, tool_base_1.ok)({ success: true, source: args.source, destination: args.destination });
                }
                catch (e) {
                    return (0, tool_base_1.err)(e.message || String(e));
                }
            }
            case "prefab_validate": {
                try {
                    const info = await Editor.Message.request("asset-db", "query-asset-info", args.uuid);
                    const deps = await Editor.Message.request("asset-db", "query-depends", args.uuid).catch(() => []);
                    return (0, tool_base_1.ok)({ success: true, uuid: args.uuid, info, dependencies: deps, valid: !!info });
                }
                catch (e) {
                    return (0, tool_base_1.err)(e.message || String(e));
                }
            }
            case "prefab_revert":
                return this.revertPrefab(args.uuid);
            case "prefab_edit":
                if (args.action === "open")
                    return this.openPrefab(args.uuid, args.path, !!args.force);
                if (args.action === "close")
                    return this.closePrefab(args.save !== false, args.sceneUuid, !!args.force);
                return (0, tool_base_1.err)(`Unknown prefab_edit action: ${args.action}. Expected 'open' or 'close'.`);
            default:
                return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
        }
    }
    async listPrefabs() {
        try {
            const results = await Editor.Message.request("asset-db", "query-assets", {
                pattern: "db://assets/**/*.prefab",
            });
            const prefabs = (results || []).map((a) => ({
                uuid: a.uuid,
                path: a.path || a.url,
                name: a.name,
            }));
            return (0, tool_base_1.ok)({ success: true, prefabs });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async createPrefab(nodeUuid, path) {
        try {
            // 既存Prefabがある場合は警告を返す（上書きダイアログでタイムアウトするため）
            const existing = await this.assetExists(path);
            if (existing) {
                return (0, tool_base_1.err)(`Prefab already exists at "${path}". Use prefab_update instead to update an existing prefab. ` +
                    `Workflow: 1) prefab_instantiate to place in scene, 2) modify properties, 3) prefab_update to save.`);
            }
            const result = await Editor.Message.request("scene", "create-prefab", nodeUuid, path);
            return (0, tool_base_1.ok)({ success: true, nodeUuid, path, result });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async assetExists(path) {
        try {
            const pattern = path.replace(/\.prefab$/, "") + ".*";
            const results = await Editor.Message.request("asset-db", "query-assets", { pattern });
            return (results || []).length > 0;
        }
        catch (_a) {
            try {
                const info = await Editor.Message.request("asset-db", "query-asset-info", path);
                return !!info;
            }
            catch (_b) {
                return false;
            }
        }
    }
    async instantiatePrefab(prefabUuid, parent) {
        try {
            const nodeUuid = await Editor.Message.request("scene", "create-node", {
                parent: parent || undefined,
                assetUuid: prefabUuid,
            });
            // Prefab 編集モード中の場合、ネスト Prefab 情報を記憶
            // prefab_update 時に JSON 後処理で asset/instance/nestedPrefabInstanceRoots を設定
            if (parent) {
                this._pendingNestedPrefabs.push({
                    nodeUuid,
                    prefabAssetUuid: prefabUuid,
                    parentUuid: parent,
                });
            }
            return (0, tool_base_1.ok)({ success: true, nodeUuid, prefabUuid });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async updatePrefab(nodeUuid) {
        try {
            const result = await Editor.Message.request("scene", "apply-prefab", nodeUuid);
            // ネスト Prefab の JSON 後処理
            if (this._pendingNestedPrefabs.length > 0) {
                await this._fixNestedPrefabJson(nodeUuid);
            }
            return (0, tool_base_1.ok)({ success: true, nodeUuid, result });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * prefab_update 後に Prefab JSON を後処理して、ネスト Prefab 参照を正しく設定する.
     */
    async _fixNestedPrefabJson(_rootNodeUuid) {
        var _a, _b, _c, _d, _f, _g, _h, _j;
        if (this._pendingNestedPrefabs.length === 0)
            return;
        try {
            // シーンを保存して Prefab JSON を書き出す
            // 現在シーンが untitled (scene-2d) の場合、save-scene はダイアログを出すので
            // safeSaveScene でスキップする。untitled でシーンにインスタンスが居るケースは
            // 本来 prefab_open モードでのみ発生するので save が効く想定だが、
            // テスト等で直接呼ばれた場合の保護として skip する。
            const saved = await (0, scene_tools_1.safeSaveScene)();
            if (!saved) {
                console.warn("[PrefabTools] _fixNestedPrefabJson: save-scene skipped (untitled scene). " +
                    "Nested prefab JSON post-processing may be incomplete.");
                return;
            }
            await new Promise(r => setTimeout(r, 1500));
            // prefab_open で記憶した UUID からファイルパスを取得
            if (!this._currentPrefabUuid)
                return;
            const prefabPath = await Editor.Message.request("asset-db", "query-path", this._currentPrefabUuid);
            if (!prefabPath)
                return;
            if (!fs_1.default.existsSync(prefabPath))
                return;
            const data = JSON.parse(fs_1.default.readFileSync(prefabPath, "utf-8"));
            // 各ネスト Prefab エントリを処理
            for (const entry of this._pendingNestedPrefabs) {
                // fileId でノードを検索（nodeUuid はシーン内 UUID、Prefab JSON 内では fileId）
                let flpNodeIdx = -1;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].__type__ === "cc.PrefabInfo" && data[i].fileId === entry.nodeUuid) {
                        // この PrefabInfo を持つノードを探す
                        for (let j = 0; j < data.length; j++) {
                            if (((_a = data[j]._prefab) === null || _a === void 0 ? void 0 : _a.__id__) === i) {
                                flpNodeIdx = j;
                                break;
                            }
                        }
                        break;
                    }
                }
                // fileId で見つからない場合、ノード名で検索
                if (flpNodeIdx < 0) {
                    // Prefab アセット名を取得
                    const assetInfo = await Editor.Message.request("asset-db", "query-asset-info", entry.prefabAssetUuid);
                    const assetName = ((_b = assetInfo === null || assetInfo === void 0 ? void 0 : assetInfo.name) === null || _b === void 0 ? void 0 : _b.replace(".prefab", "")) || "";
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].__type__ === "cc.Node" && (data[i]._name === assetName || data[i]._name === undefined)) {
                            const prefabIdx = (_c = data[i]._prefab) === null || _c === void 0 ? void 0 : _c.__id__;
                            if (prefabIdx != null && ((_f = (_d = data[prefabIdx]) === null || _d === void 0 ? void 0 : _d.asset) === null || _f === void 0 ? void 0 : _f.__id__) === 0 && !((_g = data[prefabIdx]) === null || _g === void 0 ? void 0 : _g.instance)) {
                                flpNodeIdx = i;
                                break;
                            }
                        }
                    }
                }
                if (flpNodeIdx < 0)
                    continue;
                const prefabInfoIdx = (_h = data[flpNodeIdx]._prefab) === null || _h === void 0 ? void 0 : _h.__id__;
                if (prefabInfoIdx == null)
                    continue;
                // PrefabInfo を修正
                const prefabInfo = data[prefabInfoIdx];
                prefabInfo.root = { __id__: flpNodeIdx };
                prefabInfo.asset = {
                    __uuid__: entry.prefabAssetUuid,
                    __expectedType__: "cc.Prefab",
                };
                // PrefabInstance を追加
                if (!prefabInfo.instance) {
                    const instanceIdx = data.length;
                    data.push({
                        __type__: "cc.PrefabInstance",
                        fileId: crypto_1.default.randomBytes(16).toString("base64").replace(/[+/=]/g, "").substring(0, 22),
                        prefabRootNode: { __id__: 1 }, // Prefab 編集モードのルート
                        mountedChildren: [],
                        mountedComponents: [],
                        propertyOverrides: [],
                        removedComponents: [],
                    });
                    prefabInfo.instance = { __id__: instanceIdx };
                }
                // 子ノード・コンポーネントをクリア（Prefab アセットから復元される）
                data[flpNodeIdx]._children = [];
                data[flpNodeIdx]._components = [];
                // ルートの nestedPrefabInstanceRoots に追加
                const rootPrefabIdx = (_j = data[1]._prefab) === null || _j === void 0 ? void 0 : _j.__id__;
                if (rootPrefabIdx != null) {
                    const rootPrefab = data[rootPrefabIdx];
                    if (!rootPrefab.nestedPrefabInstanceRoots) {
                        rootPrefab.nestedPrefabInstanceRoots = [];
                    }
                    const alreadyNested = rootPrefab.nestedPrefabInstanceRoots.some((r) => (r === null || r === void 0 ? void 0 : r.__id__) === flpNodeIdx);
                    if (!alreadyNested) {
                        rootPrefab.nestedPrefabInstanceRoots.push({ __id__: flpNodeIdx });
                    }
                }
            }
            fs_1.default.writeFileSync(prefabPath, JSON.stringify(data, null, 2), "utf-8");
            this._pendingNestedPrefabs = [];
        }
        catch (e) {
            console.warn("[PrefabTools] _fixNestedPrefabJson failed:", e.message);
        }
    }
    async revertPrefab(nodeUuid) {
        try {
            const result = await Editor.Message.request("scene", "revert-prefab", nodeUuid);
            return (0, tool_base_1.ok)({ success: true, nodeUuid, result });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getPrefabInfo(uuid) {
        try {
            const info = await Editor.Message.request("asset-db", "query-asset-info", uuid);
            return (0, tool_base_1.ok)({ success: true, info });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async createAndReplace(nodeUuid, path) {
        var _a;
        try {
            // 1. Check if prefab already exists
            const existing = await this.assetExists(path);
            if (existing) {
                return (0, tool_base_1.err)(`Prefab already exists at "${path}". Delete it first or use a different path.`);
            }
            // 2. Get node info (parent, sibling index, transform) before creating prefab
            const nodeInfo = await this.sceneScript("getNodeInfo", [nodeUuid]);
            if (!(nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.success)) {
                return (0, tool_base_1.err)(`Node ${nodeUuid} not found`);
            }
            const parentUuid = (_a = nodeInfo.data) === null || _a === void 0 ? void 0 : _a.parent;
            // 3. Create prefab from the node
            const prefabAssetUuid = await Editor.Message.request("scene", "create-prefab", nodeUuid, path);
            if (!prefabAssetUuid) {
                return (0, tool_base_1.err)("create-prefab returned no asset UUID");
            }
            // 4. Delete the original node
            await Editor.Message.request("scene", "remove-node", { uuid: nodeUuid });
            // 5. Instantiate the prefab at the same parent
            const newNodeUuid = await Editor.Message.request("scene", "create-node", {
                parent: parentUuid || undefined,
                assetUuid: prefabAssetUuid,
            });
            return (0, tool_base_1.ok)({
                success: true,
                prefabAssetUuid,
                prefabPath: path,
                originalNodeUuid: nodeUuid,
                newInstanceUuid: newNodeUuid,
            });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async openPrefab(uuid, path, force = false) {
        try {
            // Prefab を開くときも内部的にシーン切替が発生するので dirty untitled チェック
            await (0, scene_tools_1.ensureSceneSafeToSwitch)(force);
            // Resolve UUID from path if needed
            let assetUuid = uuid;
            if (!assetUuid && path) {
                const info = await Editor.Message.request("asset-db", "query-asset-info", path);
                assetUuid = info === null || info === void 0 ? void 0 : info.uuid;
            }
            if (!assetUuid) {
                return (0, tool_base_1.err)("Either uuid or path is required");
            }
            // Open prefab in editing mode (equivalent to double-click)
            await Editor.Message.request("asset-db", "open-asset", assetUuid);
            // Wait for prefab editing mode to initialize
            await new Promise(r => setTimeout(r, 1000));
            this._currentPrefabUuid = assetUuid;
            this._pendingNestedPrefabs = [];
            return (0, tool_base_1.ok)({ success: true, uuid: assetUuid, mode: "prefab-edit" });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async closePrefab(save, sceneUuid, force = false) {
        try {
            // 1. Save prefab if requested.
            // In prefab-edit mode the "current scene" IS the prefab being edited, so a plain
            // `save-scene` persists the .prefab asset. Because it is backed by a real asset (not an
            // untitled scene) it does NOT raise the "Save changes?" modal.
            //
            // We must NOT route this through safeSaveScene(): the prefab-edit wrapper scene has an
            // empty name (""), which is listed in scene-tools' UNTITLED_SCENE_NAMES, so
            // safeSaveScene() classifies it as "untitled" and silently skips the save — which means
            // every edit made in prefab-edit mode is lost on close.
            if (save) {
                if (this._currentPrefabUuid) {
                    await Editor.Message.request("scene", "save-scene");
                }
                else {
                    // Not opened via prefab_edit (e.g. double-clicked externally): fall back to the
                    // guarded save so plain scenes keep their untitled-dialog protection.
                    await (0, scene_tools_1.safeSaveScene)();
                }
                await new Promise(r => setTimeout(r, 500));
            }
            // 2. Determine which scene to return to
            let targetScene = sceneUuid;
            if (!targetScene) {
                // Try project's start scene
                try {
                    targetScene = await Editor.Profile.getConfig("preview", "general.start_scene", "local");
                }
                catch ( /* ignore */_a) { /* ignore */ }
                // Fallback to first scene
                if (!targetScene || targetScene === "current_scene") {
                    const scenes = await Editor.Message.request("asset-db", "query-assets", {
                        ccType: "cc.SceneAsset",
                        pattern: "db://assets/**/*",
                    });
                    if (Array.isArray(scenes) && scenes.length > 0) {
                        targetScene = scenes[0].uuid;
                    }
                }
            }
            // 3. Open the scene
            if (targetScene) {
                // prefab edit モードから戻る遷移もダイアログが出うる
                await (0, scene_tools_1.ensureSceneSafeToSwitch)(force);
                await Editor.Message.request("scene", "open-scene", targetScene);
                await new Promise(r => setTimeout(r, 1000));
            }
            // Left prefab-edit mode: clear cached prefab state so a later non-prefab close does
            // not mistakenly take the direct-save path above.
            this._currentPrefabUuid = null;
            this._pendingNestedPrefabs = [];
            return (0, tool_base_1.ok)({ success: true, returnedToScene: targetScene });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async createFromSpec(prefabPath, spec, autoBindMode) {
        var _a;
        try {
            // 1. 既存 Prefab チェック
            const existing = await this.assetExists(prefabPath);
            if (existing) {
                return (0, tool_base_1.err)(`Prefab already exists at "${prefabPath}". Delete it first or use a different path.`);
            }
            // 2. シーンの最初の cc.Node UUID を取得（Scene UUID ではなく Canvas 等）
            const hier = await this.sceneScript("getSceneHierarchy", [false]);
            const hierarchy = (hier === null || hier === void 0 ? void 0 : hier.hierarchy) || [];
            const firstNode = hierarchy[0];
            if (!(firstNode === null || firstNode === void 0 ? void 0 : firstNode.uuid))
                return (0, tool_base_1.err)("Could not find a node in the current scene to use as parent");
            const parentUuid = firstNode.uuid;
            // 3. ノードツリーを構築
            const autoBind = spec.autoBind;
            const cleanSpec = Object.assign({}, spec);
            delete cleanSpec.autoBind;
            const treeResult = await this.sceneScript("buildNodeTree", [parentUuid, cleanSpec]);
            if (!(treeResult === null || treeResult === void 0 ? void 0 : treeResult.success))
                return (0, tool_base_1.err)((treeResult === null || treeResult === void 0 ? void 0 : treeResult.error) || "buildNodeTree failed");
            const nodeUuid = (_a = treeResult.data) === null || _a === void 0 ? void 0 : _a.uuid;
            if (!nodeUuid)
                return (0, tool_base_1.err)("buildNodeTree returned no root node UUID");
            // 4. フォント・SpriteFrame を Editor API 経由で設定（アセット依存追跡のため）
            await this._applyDefaultAssets(nodeUuid);
            // 4b. v2.0.0: spec.properties を Editor API 経由で再設定する
            //     buildNodeRecursive は scene-process 内で `comp[propName] = value` で代入するが、
            //     これだと asset ref (UUID 文字列) が raw 文字列のまま .prefab に書き出され、
            //     runtime で `{__uuid__, __expectedType__}` 形式に解決されないバグがある。
            //     component_set_property 経由で再設定することで Editor が正しい dump 形式で
            //     シリアライズしてくれる。値型 (Vec3/Color/Size) や enum 名なども透過的に解決される。
            await this._reapplyPropertiesViaEditor(treeResult.data, cleanSpec);
            // 5. autoBind 実行 (旧4)
            let autoBindResult = null;
            if (autoBind) {
                if (!this._componentTools) {
                    return (0, tool_base_1.err)("autoBind requires ComponentTools dependency (internal configuration error)");
                }
                const bindToolResult = await this._componentTools.execute("component_auto_bind", {
                    uuid: nodeUuid,
                    componentType: autoBind,
                    force: false,
                    mode: autoBindMode,
                });
                try {
                    autoBindResult = JSON.parse(bindToolResult.content[0].text);
                }
                catch (_b) {
                    autoBindResult = bindToolResult;
                }
            }
            // 6. Prefab 作成
            const prefabAssetUuid = await Editor.Message.request("scene", "create-prefab", nodeUuid, prefabPath);
            if (!prefabAssetUuid) {
                await Editor.Message.request("scene", "remove-node", { uuid: nodeUuid });
                return (0, tool_base_1.err)("create-prefab returned no asset UUID");
            }
            // 7. 一時ノードを削除
            await Editor.Message.request("scene", "remove-node", { uuid: nodeUuid });
            return (0, tool_base_1.ok)({
                success: true,
                prefabAssetUuid,
                path: prefabPath,
                nodeTree: treeResult.data,
                autoBind: autoBindResult,
            });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * buildNodeTree で作成したノードツリーの Label にプロジェクトフォントを設定する。
     * Editor API (scene:set-property) 経由で設定することでアセット依存が正しく追跡される。
     */
    async _applyDefaultAssets(rootUuid) {
        var _a, _b;
        // プロジェクトのデフォルトフォントを検索（resources/fonts/ 配下の TTFFont）
        let fontUuid = null;
        try {
            const assets = await Editor.Message.request("asset-db", "query-assets", {
                pattern: "db://assets/resources/fonts/**",
                ccType: "cc.TTFFont",
            });
            if (Array.isArray(assets) && assets.length > 0) {
                fontUuid = assets[0].uuid;
            }
        }
        catch ( /* ignore */_c) { /* ignore */ }
        if (!fontUuid)
            return;
        // 全子孫ノードを取得
        const descendants = await this.sceneScript("getAllDescendants", [rootUuid]);
        if (!(descendants === null || descendants === void 0 ? void 0 : descendants.success))
            return;
        const allNodes = [{ uuid: rootUuid, name: "root" }, ...descendants.data];
        for (const node of allNodes) {
            try {
                const nodeDump = await Editor.Message.request("scene", "query-node", node.uuid);
                if (!nodeDump)
                    continue;
                const comps = nodeDump.__comps__ || [];
                for (let i = 0; i < comps.length; i++) {
                    const compType = comps[i].type || "";
                    // Label にフォント設定
                    if (compType === "cc.Label") {
                        const fontDump = (_a = comps[i].value) === null || _a === void 0 ? void 0 : _a.font;
                        if (!((_b = fontDump === null || fontDump === void 0 ? void 0 : fontDump.value) === null || _b === void 0 ? void 0 : _b.uuid)) {
                            await Editor.Message.request("scene", "set-property", {
                                uuid: node.uuid,
                                path: `__comps__.${i}.font`,
                                dump: { type: "cc.TTFFont", value: { uuid: fontUuid } },
                            });
                        }
                    }
                }
            }
            catch ( /* skip nodes that can't be queried */_d) { /* skip nodes that can't be queried */ }
        }
    }
    /**
     * v2.0.0: spec.properties を Editor API (component_set_property) 経由で再設定する。
     *
     * buildNodeRecursive (scene.ts) は `comp[propName] = value` で代入するが、asset ref
     * を含むプロパティは Editor シリアライザを通らないため .prefab JSON に raw UUID
     * 文字列として書き出されてしまう (README Known Limitation 解消)。
     *
     * 本メソッドは nodeTree と spec を平行 walk して、各ノードの properties を再設定する。
     * ComponentTools の buildDumpWithTypeInfo が型解決を行うため、UUID/path/{path,guid}/
     * enum 名/Vec3/Color などをそのまま渡せる。
     */
    async _reapplyPropertiesViaEditor(nodeTree, spec) {
        if (!this._componentTools || !(nodeTree === null || nodeTree === void 0 ? void 0 : nodeTree.uuid) || !spec)
            return;
        if (spec.properties && typeof spec.properties === "object") {
            for (const [key, value] of Object.entries(spec.properties)) {
                const dotIdx = key.lastIndexOf(".");
                if (dotIdx < 0)
                    continue;
                const compType = key.substring(0, dotIdx);
                const propName = key.substring(dotIdx + 1);
                // contentSize は scene.ts 側で setContentSize() で適切に処理済みなのでスキップ
                // (Editor 経由で再設定しても害はないが冗長)
                if (propName === "contentSize")
                    continue;
                try {
                    await this._componentTools.execute("component_set_property", {
                        uuid: nodeTree.uuid,
                        componentType: compType,
                        property: propName,
                        value,
                    });
                }
                catch (_e) {
                    // 個別プロパティの失敗は無視して続行 (auto_bind 等で後から設定する場合あり)
                }
            }
        }
        const children = (nodeTree.children || []);
        const specChildren = (spec.children || []);
        for (let i = 0; i < Math.min(children.length, specChildren.length); i++) {
            await this._reapplyPropertiesViaEditor(children[i], specChildren[i]);
        }
    }
    async sceneScript(method, args) {
        return Editor.Message.request("scene", "execute-scene-script", {
            name: "cocos-creator-mcp",
            method,
            args,
        });
    }
}
exports.PrefabTools = PrefabTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSw0Q0FBdUM7QUFDdkMsK0NBQXVFO0FBQ3ZFLG9DQUEwQztBQUUxQyw0Q0FBb0I7QUFFcEIsb0RBQTRCO0FBRTVCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDO0FBU3JDLE1BQWEsV0FBVztJQU9wQixZQUFZLGNBQStCO1FBTmxDLGlCQUFZLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLDBCQUFxQixHQUF3QixFQUFFLENBQUM7UUFDeEQsd0NBQXdDO1FBQ2hDLHVCQUFrQixHQUFrQixJQUFJLENBQUM7UUFJN0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLGFBQWQsY0FBYyxjQUFkLGNBQWMsR0FBSSxJQUFJLENBQUM7SUFDbEQsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSx5V0FBeVc7Z0JBQ3RYLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsOENBQThDLEVBQUU7d0JBQ3JGLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGlDQUFpQyxFQUFFO3dCQUN4RSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwrQkFBK0IsRUFBRTt3QkFDdEUsSUFBSSxFQUFFLEVBQUUsV0FBVyxFQUFFLHlGQUF5RixFQUFFO3dCQUNoSCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUseURBQXlELEVBQUU7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LFFBQVE7d0JBQ3ZCLFFBQVEsRUFBRSxRQUFRO3dCQUNsQixLQUFLO3FCQUNSLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQ1YsOENBQThDO2dCQUNsRCxDQUFDO1lBQ0wsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFVLENBQUM7UUFDcEQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBVSxDQUFDO1FBQ3BELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEUsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFjLEVBQUUsSUFBVztRQUNqRCxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRTtZQUMzRCxJQUFJLEVBQUUsbUJBQW1CO1lBQ3pCLE1BQU07WUFDTixJQUFJO1NBQ1AsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBOXFCRCxrQ0E4cUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbENhdGVnb3J5LCBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3VsdCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBvaywgZXJyIH0gZnJvbSBcIi4uL3Rvb2wtYmFzZVwiO1xyXG5pbXBvcnQgeyBlbnN1cmVTY2VuZVNhZmVUb1N3aXRjaCwgc2FmZVNhdmVTY2VuZSB9IGZyb20gXCIuL3NjZW5lLXRvb2xzXCI7XHJcbmltcG9ydCB7IHBhcnNlTWF5YmVKc29uIH0gZnJvbSBcIi4uL3V0aWxzXCI7XHJcbmltcG9ydCB0eXBlIHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tIFwiLi9jb21wb25lbnQtdG9vbHNcIjtcclxuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcclxuXHJcbmNvbnN0IEVYVF9OQU1FID0gXCJjb2Nvcy1jcmVhdG9yLW1jcFwiO1xyXG5cclxuLyoqIHByZWZhYl9pbnN0YW50aWF0ZSDjgafphY3nva7jgZfjgZ/jg43jgrnjg4ggUHJlZmFiIOaDheWgseOCkuiomOaGtiAqL1xyXG5pbnRlcmZhY2UgTmVzdGVkUHJlZmFiRW50cnkge1xyXG4gICAgbm9kZVV1aWQ6IHN0cmluZztcclxuICAgIHByZWZhYkFzc2V0VXVpZDogc3RyaW5nO1xyXG4gICAgcGFyZW50VXVpZDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJlZmFiVG9vbHMgaW1wbGVtZW50cyBUb29sQ2F0ZWdvcnkge1xyXG4gICAgcmVhZG9ubHkgY2F0ZWdvcnlOYW1lID0gXCJwcmVmYWJcIjtcclxuICAgIHByaXZhdGUgX3BlbmRpbmdOZXN0ZWRQcmVmYWJzOiBOZXN0ZWRQcmVmYWJFbnRyeVtdID0gW107XHJcbiAgICAvKiogcHJlZmFiX29wZW4g44Gn6ZaL44GE44GfIFByZWZhYiDjgqLjgrvjg4Pjg4ggVVVJRCAqL1xyXG4gICAgcHJpdmF0ZSBfY3VycmVudFByZWZhYlV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBfY29tcG9uZW50VG9vbHM6IENvbXBvbmVudFRvb2xzIHwgbnVsbDtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihjb21wb25lbnRUb29scz86IENvbXBvbmVudFRvb2xzKSB7XHJcbiAgICAgICAgdGhpcy5fY29tcG9uZW50VG9vbHMgPSBjb21wb25lbnRUb29scyA/PyBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwicHJlZmFiX2NyZWF0ZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ3JlYXRlIGEgcHJlZmFiLiBNb2RlczogJ3NpbXBsZScgKGRlZmF1bHQg4oCUIGV4dHJhY3QgYSBub2RlIGludG8gYSBwcmVmYWIsIG9yaWdpbmFsIG5vZGUgc3RheXMgaW4gc2NlbmU7IG5lZWRzIHV1aWQgKyBwYXRoKSwgJ3JlcGxhY2UnIChleHRyYWN0ICsgcmVwbGFjZSBvcmlnaW5hbCBub2RlIHdpdGggYSBwcmVmYWIgaW5zdGFuY2UsIHJlY29tbWVuZGVkIGZvciBuZXN0ZWQgcHJlZmFiczsgbmVlZHMgdXVpZCArIHBhdGgpLCAnZnJvbV9zcGVjJyAoYnVpbGQgbm9kZSB0cmVlICsgYXV0by1iaW5kICsgY3JlYXRlIGluIG9uZSBjYWxsIGZyb20gYSBKU09OIHNwZWM7IG5lZWRzIHBhdGggKyBzcGVjIFsrIGF1dG9CaW5kTW9kZV0pLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInc2ltcGxlJyAoZGVmYXVsdCkgfCAncmVwbGFjZScgfCAnZnJvbV9zcGVjJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEIChtb2RlPXNpbXBsZXxyZXBsYWNlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiZGI6Ly8gcGF0aCBmb3IgdGhlIG5ldyBwcmVmYWJcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGVjOiB7IGRlc2NyaXB0aW9uOiBcIk5vZGUgdHJlZSBzcGVjIChtb2RlPWZyb21fc3BlYykg4oCUIHNlZSBub2RlX2NyZWF0ZV90cmVlIGZvcm1hdCArIG9wdGlvbmFsIGF1dG9CaW5kIGZpZWxkXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXV0b0JpbmRNb2RlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGVudW06IFtcImZ1enp5XCIsIFwic3RyaWN0XCJdLCBkZXNjcmlwdGlvbjogXCJBdXRvLWJpbmQgbWF0Y2hpbmcgbW9kZSAobW9kZT1mcm9tX3NwZWMsIGRlZmF1bHQgZnV6enkpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJwYXRoXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJwcmVmYWJfaW5zdGFudGlhdGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkluc3RhbnRpYXRlIGEgcHJlZmFiIGludG8gdGhlIHNjZW5lLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiVXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcmVmYWIgYXNzZXQgVVVJRFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQYXJlbnQgbm9kZSBVVUlEIChvcHRpb25hbCwgZGVmYXVsdHMgdG8gc2NlbmUgcm9vdClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInByZWZhYlV1aWRcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInByZWZhYl91cGRhdGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlVwZGF0ZSAocmUtc2F2ZSkgYSBwcmVmYWIgZnJvbSBpdHMgaW5zdGFuY2Ugbm9kZSBpbiB0aGUgc2NlbmUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRCBvZiB0aGUgcHJlZmFiIGluc3RhbmNlIGluIHRoZSBzY2VuZVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widXVpZFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwicHJlZmFiX2R1cGxpY2F0ZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRHVwbGljYXRlIGEgcHJlZmFiIGFzc2V0IHRvIGEgbmV3IHBhdGguXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU291cmNlIHByZWZhYiBkYjovLyBwYXRoXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRGVzdGluYXRpb24gZGI6Ly8gcGF0aFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wic291cmNlXCIsIFwiZGVzdGluYXRpb25cIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInByZWZhYl92YWxpZGF0ZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVmFsaWRhdGUgYSBwcmVmYWIgZm9yIG1pc3NpbmcgcmVmZXJlbmNlcyBvciBicm9rZW4gbGlua3MuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByZWZhYiBhc3NldCBVVUlEXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1dWlkXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJwcmVmYWJfcmV2ZXJ0XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZXZlcnQgYSBwcmVmYWIgaW5zdGFuY2Ugbm9kZSB0byBpdHMgb3JpZ2luYWwgcHJlZmFiIHN0YXRlLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQgb2YgdGhlIHByZWZhYiBpbnN0YW5jZVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widXVpZFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwicHJlZmFiX2VkaXRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkVudGVyIC8gZXhpdCBwcmVmYWIgZWRpdGluZyBtb2RlLiBBY3Rpb25zOiAnb3BlbicgKHV1aWQgb3IgcGF0aCBbKyBmb3JjZV0pIOKAlCBlcXVpdmFsZW50IHRvIGRvdWJsZS1jbGlja2luZyB0aGUgcHJlZmFiOyAnY2xvc2UnIChbKyBzYXZlXSBbKyBzY2VuZVV1aWRdIFsrIGZvcmNlXSkg4oCUIHNhdmUgJiBleGl0IGVkaXQgbW9kZSBhbmQgcmV0dXJuIHRvIGEgc2NlbmUuIGRpcnR5LXVudGl0bGVkIHByZWZsaWdodCBhcHBsaWVzIGFzIHdpdGggc2NlbmVfbWFuYWdlLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidvcGVuJyB8ICdjbG9zZSdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByZWZhYiBhc3NldCBVVUlEIChhY3Rpb249b3BlbilcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByZWZhYiBkYjovLyBwYXRoIChhY3Rpb249b3BlbiwgYWx0ZXJuYXRpdmUgdG8gdXVpZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJTYXZlIHByZWZhYiBiZWZvcmUgY2xvc2luZyAoYWN0aW9uPWNsb3NlLCBkZWZhdWx0IHRydWUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVVdWlkOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlNjZW5lIFVVSUQgdG8gcmV0dXJuIHRvIG9uIGNsb3NlIChkZWZhdWx0OiBzdGFydCBzY2VuZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JjZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiU2tpcCBkaXJ0eS1zY2VuZSBwcmVmbGlnaHRcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJwcmVmYWJfY3JlYXRlXCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSBhcmdzLm1vZGUgfHwgXCJzaW1wbGVcIjtcclxuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSBcInNpbXBsZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLnV1aWQpIHJldHVybiBlcnIoXCJwcmVmYWJfY3JlYXRlKHNpbXBsZSk6ICd1dWlkJyBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVQcmVmYWIoYXJncy51dWlkLCBhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09IFwicmVwbGFjZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLnV1aWQpIHJldHVybiBlcnIoXCJwcmVmYWJfY3JlYXRlKHJlcGxhY2UpOiAndXVpZCcgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQW5kUmVwbGFjZShhcmdzLnV1aWQsIGFyZ3MucGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gXCJmcm9tX3NwZWNcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJncy5zcGVjKSByZXR1cm4gZXJyKFwicHJlZmFiX2NyZWF0ZShmcm9tX3NwZWMpOiAnc3BlYycgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRnJvbVNwZWMoYXJncy5wYXRoLCBwYXJzZU1heWJlSnNvbihhcmdzLnNwZWMpLCBhcmdzLmF1dG9CaW5kTW9kZSA/PyBcImZ1enp5XCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBwcmVmYWJfY3JlYXRlIG1vZGU6ICR7bW9kZX0uIEV4cGVjdGVkIHNpbXBsZSAvIHJlcGxhY2UgLyBmcm9tX3NwZWMuYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcInByZWZhYl9pbnN0YW50aWF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFudGlhdGVQcmVmYWIoYXJncy5wcmVmYWJVdWlkLCBhcmdzLnBhcmVudCk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJwcmVmYWJfdXBkYXRlXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVQcmVmYWIoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSBcInByZWZhYl9kdXBsaWNhdGVcIjoge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYXNzZXQtZGJcIiwgXCJjb3B5LWFzc2V0XCIsIGFyZ3Muc291cmNlLCBhcmdzLmRlc3RpbmF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBzb3VyY2U6IGFyZ3Muc291cmNlLCBkZXN0aW5hdGlvbjogYXJncy5kZXN0aW5hdGlvbiB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkgeyByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpOyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcInByZWZhYl92YWxpZGF0ZVwiOiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYXNzZXQtZGJcIiwgXCJxdWVyeS1hc3NldC1pbmZvXCIsIGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVwcyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInF1ZXJ5LWRlcGVuZHNcIiwgYXJncy51dWlkKS5jYXRjaCgoKSA9PiBbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXVpZDogYXJncy51dWlkLCBpbmZvLCBkZXBlbmRlbmNpZXM6IGRlcHMsIHZhbGlkOiAhIWluZm8gfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHsgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTsgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJwcmVmYWJfcmV2ZXJ0XCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXZlcnRQcmVmYWIoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSBcInByZWZhYl9lZGl0XCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5hY3Rpb24gPT09IFwib3BlblwiKSByZXR1cm4gdGhpcy5vcGVuUHJlZmFiKGFyZ3MudXVpZCwgYXJncy5wYXRoLCAhIWFyZ3MuZm9yY2UpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuYWN0aW9uID09PSBcImNsb3NlXCIpIHJldHVybiB0aGlzLmNsb3NlUHJlZmFiKGFyZ3Muc2F2ZSAhPT0gZmFsc2UsIGFyZ3Muc2NlbmVVdWlkLCAhIWFyZ3MuZm9yY2UpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBwcmVmYWJfZWRpdCBhY3Rpb246ICR7YXJncy5hY3Rpb259LiBFeHBlY3RlZCAnb3Blbicgb3IgJ2Nsb3NlJy5gKTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0UHJlZmFicygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXRzXCIsIHtcclxuICAgICAgICAgICAgICAgIHBhdHRlcm46IFwiZGI6Ly9hc3NldHMvKiovKi5wcmVmYWJcIixcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZWZhYnMgPSAocmVzdWx0cyB8fCBbXSkubWFwKChhOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBhLnV1aWQsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBhLnBhdGggfHwgYS51cmwsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBhLm5hbWUsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgcHJlZmFicyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVQcmVmYWIobm9kZVV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g5pei5a2YUHJlZmFi44GM44GC44KL5aC05ZCI44Gv6K2m5ZGK44KS6L+U44GZ77yI5LiK5pu444GN44OA44Kk44Ki44Ot44Kw44Gn44K/44Kk44Og44Ki44Km44OI44GZ44KL44Gf44KB77yJXHJcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgdGhpcy5hc3NldEV4aXN0cyhwYXRoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKFxyXG4gICAgICAgICAgICAgICAgICAgIGBQcmVmYWIgYWxyZWFkeSBleGlzdHMgYXQgXCIke3BhdGh9XCIuIFVzZSBwcmVmYWJfdXBkYXRlIGluc3RlYWQgdG8gdXBkYXRlIGFuIGV4aXN0aW5nIHByZWZhYi4gYCArXHJcbiAgICAgICAgICAgICAgICAgICAgYFdvcmtmbG93OiAxKSBwcmVmYWJfaW5zdGFudGlhdGUgdG8gcGxhY2UgaW4gc2NlbmUsIDIpIG1vZGlmeSBwcm9wZXJ0aWVzLCAzKSBwcmVmYWJfdXBkYXRlIHRvIHNhdmUuYFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJjcmVhdGUtcHJlZmFiXCIsIG5vZGVVdWlkLCBwYXRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbm9kZVV1aWQsIHBhdGgsIHJlc3VsdCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhc3NldEV4aXN0cyhwYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBwYXR0ZXJuID0gcGF0aC5yZXBsYWNlKC9cXC5wcmVmYWIkLywgXCJcIikgKyBcIi4qXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwiYXNzZXQtZGJcIiwgXCJxdWVyeS1hc3NldHNcIiwgeyBwYXR0ZXJuIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gKHJlc3VsdHMgfHwgW10pLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXQtaW5mb1wiLCBwYXRoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIWluZm87XHJcbiAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaW5zdGFudGlhdGVQcmVmYWIocHJlZmFiVXVpZDogc3RyaW5nLCBwYXJlbnQ/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImNyZWF0ZS1ub2RlXCIsIHtcclxuICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50IHx8IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogcHJlZmFiVXVpZCxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBQcmVmYWIg57eo6ZuG44Oi44O844OJ5Lit44Gu5aC05ZCI44CB44ON44K544OIIFByZWZhYiDmg4XloLHjgpLoqJjmhrZcclxuICAgICAgICAgICAgLy8gcHJlZmFiX3VwZGF0ZSDmmYLjgasgSlNPTiDlvozlh6bnkIbjgacgYXNzZXQvaW5zdGFuY2UvbmVzdGVkUHJlZmFiSW5zdGFuY2VSb290cyDjgpLoqK3lrppcclxuICAgICAgICAgICAgaWYgKHBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ05lc3RlZFByZWZhYnMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlZmFiQXNzZXRVdWlkOiBwcmVmYWJVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHBhcmVudCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub2RlVXVpZCwgcHJlZmFiVXVpZCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlUHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJhcHBseS1wcmVmYWJcIiwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgLy8g44ON44K544OIIFByZWZhYiDjga4gSlNPTiDlvozlh6bnkIZcclxuICAgICAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdOZXN0ZWRQcmVmYWJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2ZpeE5lc3RlZFByZWZhYkpzb24obm9kZVV1aWQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub2RlVXVpZCwgcmVzdWx0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHByZWZhYl91cGRhdGUg5b6M44GrIFByZWZhYiBKU09OIOOCkuW+jOWHpueQhuOBl+OBpuOAgeODjeOCueODiCBQcmVmYWIg5Y+C54Wn44KS5q2j44GX44GP6Kit5a6a44GZ44KLLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIF9maXhOZXN0ZWRQcmVmYWJKc29uKF9yb290Tm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmICh0aGlzLl9wZW5kaW5nTmVzdGVkUHJlZmFicy5sZW5ndGggPT09IDApIHJldHVybjtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g44K344O844Oz44KS5L+d5a2Y44GX44GmIFByZWZhYiBKU09OIOOCkuabuOOBjeWHuuOBmVxyXG4gICAgICAgICAgICAvLyDnj77lnKjjgrfjg7zjg7PjgYwgdW50aXRsZWQgKHNjZW5lLTJkKSDjga7loLTlkIjjgIFzYXZlLXNjZW5lIOOBr+ODgOOCpOOCouODreOCsOOCkuWHuuOBmeOBruOBp1xyXG4gICAgICAgICAgICAvLyBzYWZlU2F2ZVNjZW5lIOOBp+OCueOCreODg+ODl+OBmeOCi+OAgnVudGl0bGVkIOOBp+OCt+ODvOODs+OBq+OCpOODs+OCueOCv+ODs+OCueOBjOWxheOCi+OCseODvOOCueOBr1xyXG4gICAgICAgICAgICAvLyDmnKzmnaUgcHJlZmFiX29wZW4g44Oi44O844OJ44Gn44Gu44G/55m655Sf44GZ44KL44Gu44GnIHNhdmUg44GM5Yq544GP5oOz5a6a44Gg44GM44CBXHJcbiAgICAgICAgICAgIC8vIOODhuOCueODiOetieOBp+ebtOaOpeWRvOOBsOOCjOOBn+WgtOWQiOOBruS/neitt+OBqOOBl+OBpiBza2lwIOOBmeOCi+OAglxyXG4gICAgICAgICAgICBjb25zdCBzYXZlZCA9IGF3YWl0IHNhZmVTYXZlU2NlbmUoKTtcclxuICAgICAgICAgICAgaWYgKCFzYXZlZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgICAgICAgICAgICAgIFwiW1ByZWZhYlRvb2xzXSBfZml4TmVzdGVkUHJlZmFiSnNvbjogc2F2ZS1zY2VuZSBza2lwcGVkICh1bnRpdGxlZCBzY2VuZSkuIFwiICtcclxuICAgICAgICAgICAgICAgICAgICBcIk5lc3RlZCBwcmVmYWIgSlNPTiBwb3N0LXByb2Nlc3NpbmcgbWF5IGJlIGluY29tcGxldGUuXCJcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDE1MDApKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHByZWZhYl9vcGVuIOOBp+iomOaGtuOBl+OBnyBVVUlEIOOBi+OCieODleOCoeOCpOODq+ODkeOCueOCkuWPluW+l1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2N1cnJlbnRQcmVmYWJVdWlkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJQYXRoID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcclxuICAgICAgICAgICAgICAgIFwiYXNzZXQtZGJcIiwgXCJxdWVyeS1wYXRoXCIsIHRoaXMuX2N1cnJlbnRQcmVmYWJVdWlkXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmICghcHJlZmFiUGF0aCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocHJlZmFiUGF0aCkpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwcmVmYWJQYXRoLCBcInV0Zi04XCIpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOWQhOODjeOCueODiCBQcmVmYWIg44Ko44Oz44OI44Oq44KS5Yem55CGXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgdGhpcy5fcGVuZGluZ05lc3RlZFByZWZhYnMpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZpbGVJZCDjgafjg47jg7zjg4njgpLmpJzntKLvvIhub2RlVXVpZCDjga/jgrfjg7zjg7PlhoUgVVVJROOAgVByZWZhYiBKU09OIOWGheOBp+OBryBmaWxlSWTvvIlcclxuICAgICAgICAgICAgICAgIGxldCBmbHBOb2RlSWR4ID0gLTE7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtpXS5fX3R5cGVfXyA9PT0gXCJjYy5QcmVmYWJJbmZvXCIgJiYgZGF0YVtpXS5maWxlSWQgPT09IGVudHJ5Lm5vZGVVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOOBk+OBriBQcmVmYWJJbmZvIOOCkuaMgeOBpOODjuODvOODieOCkuaOouOBmVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGRhdGEubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2pdLl9wcmVmYWI/Ll9faWRfXyA9PT0gaSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZscE5vZGVJZHggPSBqO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBmaWxlSWQg44Gn6KaL44Gk44GL44KJ44Gq44GE5aC05ZCI44CB44OO44O844OJ5ZCN44Gn5qSc57SiXHJcbiAgICAgICAgICAgICAgICBpZiAoZmxwTm9kZUlkeCA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBQcmVmYWIg44Ki44K744OD44OI5ZCN44KS5Y+W5b6XXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXQtaW5mb1wiLCBlbnRyeS5wcmVmYWJBc3NldFV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TmFtZSA9IGFzc2V0SW5mbz8ubmFtZT8ucmVwbGFjZShcIi5wcmVmYWJcIiwgXCJcIikgfHwgXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbaV0uX190eXBlX18gPT09IFwiY2MuTm9kZVwiICYmIChkYXRhW2ldLl9uYW1lID09PSBhc3NldE5hbWUgfHwgZGF0YVtpXS5fbmFtZSA9PT0gdW5kZWZpbmVkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiSWR4ID0gZGF0YVtpXS5fcHJlZmFiPy5fX2lkX187XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlZmFiSWR4ICE9IG51bGwgJiYgZGF0YVtwcmVmYWJJZHhdPy5hc3NldD8uX19pZF9fID09PSAwICYmICFkYXRhW3ByZWZhYklkeF0/Lmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxwTm9kZUlkeCA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGZscE5vZGVJZHggPCAwKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmYWJJbmZvSWR4ID0gZGF0YVtmbHBOb2RlSWR4XS5fcHJlZmFiPy5fX2lkX187XHJcbiAgICAgICAgICAgICAgICBpZiAocHJlZmFiSW5mb0lkeCA9PSBudWxsKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBQcmVmYWJJbmZvIOOCkuS/ruato1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiSW5mbyA9IGRhdGFbcHJlZmFiSW5mb0lkeF07XHJcbiAgICAgICAgICAgICAgICBwcmVmYWJJbmZvLnJvb3QgPSB7IF9faWRfXzogZmxwTm9kZUlkeCB9O1xyXG4gICAgICAgICAgICAgICAgcHJlZmFiSW5mby5hc3NldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBfX3V1aWRfXzogZW50cnkucHJlZmFiQXNzZXRVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIF9fZXhwZWN0ZWRUeXBlX186IFwiY2MuUHJlZmFiXCIsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFByZWZhYkluc3RhbmNlIOOCkui/veWKoFxyXG4gICAgICAgICAgICAgICAgaWYgKCFwcmVmYWJJbmZvLmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2VJZHggPSBkYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfX3R5cGVfXzogXCJjYy5QcmVmYWJJbnN0YW5jZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlSWQ6IGNyeXB0by5yYW5kb21CeXRlcygxNikudG9TdHJpbmcoXCJiYXNlNjRcIikucmVwbGFjZSgvWysvPV0vZywgXCJcIikuc3Vic3RyaW5nKDAsIDIyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiUm9vdE5vZGU6IHsgX19pZF9fOiAxIH0sIC8vIFByZWZhYiDnt6jpm4bjg6Ljg7zjg4njga7jg6vjg7zjg4hcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW91bnRlZENoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW91bnRlZENvbXBvbmVudHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU92ZXJyaWRlczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWRDb21wb25lbnRzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBwcmVmYWJJbmZvLmluc3RhbmNlID0geyBfX2lkX186IGluc3RhbmNlSWR4IH07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g5a2Q44OO44O844OJ44O744Kz44Oz44Od44O844ON44Oz44OI44KS44Kv44Oq44Ki77yIUHJlZmFiIOOCouOCu+ODg+ODiOOBi+OCieW+qeWFg+OBleOCjOOCi++8iVxyXG4gICAgICAgICAgICAgICAgZGF0YVtmbHBOb2RlSWR4XS5fY2hpbGRyZW4gPSBbXTtcclxuICAgICAgICAgICAgICAgIGRhdGFbZmxwTm9kZUlkeF0uX2NvbXBvbmVudHMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg6vjg7zjg4jjga4gbmVzdGVkUHJlZmFiSW5zdGFuY2VSb290cyDjgavov73liqBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvb3RQcmVmYWJJZHggPSBkYXRhWzFdLl9wcmVmYWI/Ll9faWRfXztcclxuICAgICAgICAgICAgICAgIGlmIChyb290UHJlZmFiSWR4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb290UHJlZmFiID0gZGF0YVtyb290UHJlZmFiSWR4XTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJvb3RQcmVmYWIubmVzdGVkUHJlZmFiSW5zdGFuY2VSb290cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByb290UHJlZmFiLm5lc3RlZFByZWZhYkluc3RhbmNlUm9vdHMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxyZWFkeU5lc3RlZCA9IHJvb3RQcmVmYWIubmVzdGVkUHJlZmFiSW5zdGFuY2VSb290cy5zb21lKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAocjogYW55KSA9PiByPy5fX2lkX18gPT09IGZscE5vZGVJZHhcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYWxyZWFkeU5lc3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByb290UHJlZmFiLm5lc3RlZFByZWZhYkluc3RhbmNlUm9vdHMucHVzaCh7IF9faWRfXzogZmxwTm9kZUlkeCB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMocHJlZmFiUGF0aCwgSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMiksIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdOZXN0ZWRQcmVmYWJzID0gW107XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIltQcmVmYWJUb29sc10gX2ZpeE5lc3RlZFByZWZhYkpzb24gZmFpbGVkOlwiLCBlLm1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJldmVydFByZWZhYihub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicmV2ZXJ0LXByZWZhYlwiLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIG5vZGVVdWlkLCByZXN1bHQgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJlZmFiSW5mbyh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXQtaW5mb1wiLCB1dWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaW5mbyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVBbmRSZXBsYWNlKG5vZGVVdWlkOiBzdHJpbmcsIHBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIDEuIENoZWNrIGlmIHByZWZhYiBhbHJlYWR5IGV4aXN0c1xyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuYXNzZXRFeGlzdHMocGF0aCk7XHJcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihcclxuICAgICAgICAgICAgICAgICAgICBgUHJlZmFiIGFscmVhZHkgZXhpc3RzIGF0IFwiJHtwYXRofVwiLiBEZWxldGUgaXQgZmlyc3Qgb3IgdXNlIGEgZGlmZmVyZW50IHBhdGguYFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gMi4gR2V0IG5vZGUgaW5mbyAocGFyZW50LCBzaWJsaW5nIGluZGV4LCB0cmFuc2Zvcm0pIGJlZm9yZSBjcmVhdGluZyBwcmVmYWJcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLnNjZW5lU2NyaXB0KFwiZ2V0Tm9kZUluZm9cIiwgW25vZGVVdWlkXSk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZUluZm8/LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYE5vZGUgJHtub2RlVXVpZH0gbm90IGZvdW5kYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcGFyZW50VXVpZCA9IG5vZGVJbmZvLmRhdGE/LnBhcmVudDtcclxuXHJcbiAgICAgICAgICAgIC8vIDMuIENyZWF0ZSBwcmVmYWIgZnJvbSB0aGUgbm9kZVxyXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJBc3NldFV1aWQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJjcmVhdGUtcHJlZmFiXCIsIG5vZGVVdWlkLCBwYXRoKTtcclxuICAgICAgICAgICAgaWYgKCFwcmVmYWJBc3NldFV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoXCJjcmVhdGUtcHJlZmFiIHJldHVybmVkIG5vIGFzc2V0IFVVSURcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDQuIERlbGV0ZSB0aGUgb3JpZ2luYWwgbm9kZVxyXG4gICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJyZW1vdmUtbm9kZVwiLCB7IHV1aWQ6IG5vZGVVdWlkIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gNS4gSW5zdGFudGlhdGUgdGhlIHByZWZhYiBhdCB0aGUgc2FtZSBwYXJlbnRcclxuICAgICAgICAgICAgY29uc3QgbmV3Tm9kZVV1aWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJjcmVhdGUtbm9kZVwiLCB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudFV1aWQgfHwgdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBwcmVmYWJBc3NldFV1aWQsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBwcmVmYWJBc3NldFV1aWQsXHJcbiAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBwYXRoLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxOb2RlVXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICBuZXdJbnN0YW5jZVV1aWQ6IG5ld05vZGVVdWlkLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuUHJlZmFiKHV1aWQ/OiBzdHJpbmcsIHBhdGg/OiBzdHJpbmcsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBQcmVmYWIg44KS6ZaL44GP44Go44GN44KC5YaF6YOo55qE44Gr44K344O844Oz5YiH5pu/44GM55m655Sf44GZ44KL44Gu44GnIGRpcnR5IHVudGl0bGVkIOODgeOCp+ODg+OCr1xyXG4gICAgICAgICAgICBhd2FpdCBlbnN1cmVTY2VuZVNhZmVUb1N3aXRjaChmb3JjZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBSZXNvbHZlIFVVSUQgZnJvbSBwYXRoIGlmIG5lZWRlZFxyXG4gICAgICAgICAgICBsZXQgYXNzZXRVdWlkID0gdXVpZDtcclxuICAgICAgICAgICAgaWYgKCFhc3NldFV1aWQgJiYgcGF0aCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInF1ZXJ5LWFzc2V0LWluZm9cIiwgcGF0aCk7XHJcbiAgICAgICAgICAgICAgICBhc3NldFV1aWQgPSBpbmZvPy51dWlkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghYXNzZXRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKFwiRWl0aGVyIHV1aWQgb3IgcGF0aCBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gT3BlbiBwcmVmYWIgaW4gZWRpdGluZyBtb2RlIChlcXVpdmFsZW50IHRvIGRvdWJsZS1jbGljaylcclxuICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImFzc2V0LWRiXCIsIFwib3Blbi1hc3NldFwiLCBhc3NldFV1aWQpO1xyXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBwcmVmYWIgZWRpdGluZyBtb2RlIHRvIGluaXRpYWxpemVcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRQcmVmYWJVdWlkID0gYXNzZXRVdWlkO1xyXG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nTmVzdGVkUHJlZmFicyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXVpZDogYXNzZXRVdWlkLCBtb2RlOiBcInByZWZhYi1lZGl0XCIgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2xvc2VQcmVmYWIoc2F2ZTogYm9vbGVhbiwgc2NlbmVVdWlkPzogc3RyaW5nLCBmb3JjZTogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gMS4gU2F2ZSBwcmVmYWIgaWYgcmVxdWVzdGVkLlxyXG4gICAgICAgICAgICAvLyBJbiBwcmVmYWItZWRpdCBtb2RlIHRoZSBcImN1cnJlbnQgc2NlbmVcIiBJUyB0aGUgcHJlZmFiIGJlaW5nIGVkaXRlZCwgc28gYSBwbGFpblxyXG4gICAgICAgICAgICAvLyBgc2F2ZS1zY2VuZWAgcGVyc2lzdHMgdGhlIC5wcmVmYWIgYXNzZXQuIEJlY2F1c2UgaXQgaXMgYmFja2VkIGJ5IGEgcmVhbCBhc3NldCAobm90IGFuXHJcbiAgICAgICAgICAgIC8vIHVudGl0bGVkIHNjZW5lKSBpdCBkb2VzIE5PVCByYWlzZSB0aGUgXCJTYXZlIGNoYW5nZXM/XCIgbW9kYWwuXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIFdlIG11c3QgTk9UIHJvdXRlIHRoaXMgdGhyb3VnaCBzYWZlU2F2ZVNjZW5lKCk6IHRoZSBwcmVmYWItZWRpdCB3cmFwcGVyIHNjZW5lIGhhcyBhblxyXG4gICAgICAgICAgICAvLyBlbXB0eSBuYW1lIChcIlwiKSwgd2hpY2ggaXMgbGlzdGVkIGluIHNjZW5lLXRvb2xzJyBVTlRJVExFRF9TQ0VORV9OQU1FUywgc29cclxuICAgICAgICAgICAgLy8gc2FmZVNhdmVTY2VuZSgpIGNsYXNzaWZpZXMgaXQgYXMgXCJ1bnRpdGxlZFwiIGFuZCBzaWxlbnRseSBza2lwcyB0aGUgc2F2ZSDigJQgd2hpY2ggbWVhbnNcclxuICAgICAgICAgICAgLy8gZXZlcnkgZWRpdCBtYWRlIGluIHByZWZhYi1lZGl0IG1vZGUgaXMgbG9zdCBvbiBjbG9zZS5cclxuICAgICAgICAgICAgaWYgKHNhdmUpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJyZW50UHJlZmFiVXVpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNhdmUtc2NlbmVcIik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vdCBvcGVuZWQgdmlhIHByZWZhYl9lZGl0IChlLmcuIGRvdWJsZS1jbGlja2VkIGV4dGVybmFsbHkpOiBmYWxsIGJhY2sgdG8gdGhlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZ3VhcmRlZCBzYXZlIHNvIHBsYWluIHNjZW5lcyBrZWVwIHRoZWlyIHVudGl0bGVkLWRpYWxvZyBwcm90ZWN0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNhZmVTYXZlU2NlbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gMi4gRGV0ZXJtaW5lIHdoaWNoIHNjZW5lIHRvIHJldHVybiB0b1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0U2NlbmUgPSBzY2VuZVV1aWQ7XHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0U2NlbmUpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRyeSBwcm9qZWN0J3Mgc3RhcnQgc2NlbmVcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U2NlbmUgPSBhd2FpdCAoRWRpdG9yIGFzIGFueSkuUHJvZmlsZS5nZXRDb25maWcoXCJwcmV2aWV3XCIsIFwiZ2VuZXJhbC5zdGFydF9zY2VuZVwiLCBcImxvY2FsXCIpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZmlyc3Qgc2NlbmVcclxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0U2NlbmUgfHwgdGFyZ2V0U2NlbmUgPT09IFwiY3VycmVudF9zY2VuZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXRzXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2NUeXBlOiBcImNjLlNjZW5lQXNzZXRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogXCJkYjovL2Fzc2V0cy8qKi8qXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc2NlbmVzKSAmJiBzY2VuZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTY2VuZSA9IHNjZW5lc1swXS51dWlkO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gMy4gT3BlbiB0aGUgc2NlbmVcclxuICAgICAgICAgICAgaWYgKHRhcmdldFNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBwcmVmYWIgZWRpdCDjg6Ljg7zjg4njgYvjgonmiLvjgovpgbfnp7vjgoLjg4DjgqTjgqLjg63jgrDjgYzlh7rjgYbjgotcclxuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoKGZvcmNlKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcIm9wZW4tc2NlbmVcIiwgdGFyZ2V0U2NlbmUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTGVmdCBwcmVmYWItZWRpdCBtb2RlOiBjbGVhciBjYWNoZWQgcHJlZmFiIHN0YXRlIHNvIGEgbGF0ZXIgbm9uLXByZWZhYiBjbG9zZSBkb2VzXHJcbiAgICAgICAgICAgIC8vIG5vdCBtaXN0YWtlbmx5IHRha2UgdGhlIGRpcmVjdC1zYXZlIHBhdGggYWJvdmUuXHJcbiAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRQcmVmYWJVdWlkID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5fcGVuZGluZ05lc3RlZFByZWZhYnMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHJldHVybmVkVG9TY2VuZTogdGFyZ2V0U2NlbmUgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlRnJvbVNwZWMocHJlZmFiUGF0aDogc3RyaW5nLCBzcGVjOiBhbnksIGF1dG9CaW5kTW9kZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gMS4g5pei5a2YIFByZWZhYiDjg4Hjgqfjg4Pjgq9cclxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmFzc2V0RXhpc3RzKHByZWZhYlBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoXHJcbiAgICAgICAgICAgICAgICAgICAgYFByZWZhYiBhbHJlYWR5IGV4aXN0cyBhdCBcIiR7cHJlZmFiUGF0aH1cIi4gRGVsZXRlIGl0IGZpcnN0IG9yIHVzZSBhIGRpZmZlcmVudCBwYXRoLmBcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDIuIOOCt+ODvOODs+OBruacgOWIneOBriBjYy5Ob2RlIFVVSUQg44KS5Y+W5b6X77yIU2NlbmUgVVVJRCDjgafjga/jgarjgY8gQ2FudmFzIOetie+8iVxyXG4gICAgICAgICAgICBjb25zdCBoaWVyID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldFNjZW5lSGllcmFyY2h5XCIsIFtmYWxzZV0pO1xyXG4gICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBoaWVyPy5oaWVyYXJjaHkgfHwgW107XHJcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0Tm9kZSA9IGhpZXJhcmNoeVswXTtcclxuICAgICAgICAgICAgaWYgKCFmaXJzdE5vZGU/LnV1aWQpIHJldHVybiBlcnIoXCJDb3VsZCBub3QgZmluZCBhIG5vZGUgaW4gdGhlIGN1cnJlbnQgc2NlbmUgdG8gdXNlIGFzIHBhcmVudFwiKTtcclxuICAgICAgICAgICAgY29uc3QgcGFyZW50VXVpZCA9IGZpcnN0Tm9kZS51dWlkO1xyXG5cclxuICAgICAgICAgICAgLy8gMy4g44OO44O844OJ44OE44Oq44O844KS5qeL56+JXHJcbiAgICAgICAgICAgIGNvbnN0IGF1dG9CaW5kID0gc3BlYy5hdXRvQmluZDtcclxuICAgICAgICAgICAgY29uc3QgY2xlYW5TcGVjID0geyAuLi5zcGVjIH07XHJcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhblNwZWMuYXV0b0JpbmQ7XHJcblxyXG4gICAgICAgICAgICBjb25zdCB0cmVlUmVzdWx0ID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImJ1aWxkTm9kZVRyZWVcIiwgW3BhcmVudFV1aWQsIGNsZWFuU3BlY10pO1xyXG4gICAgICAgICAgICBpZiAoIXRyZWVSZXN1bHQ/LnN1Y2Nlc3MpIHJldHVybiBlcnIodHJlZVJlc3VsdD8uZXJyb3IgfHwgXCJidWlsZE5vZGVUcmVlIGZhaWxlZFwiKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWQgPSB0cmVlUmVzdWx0LmRhdGE/LnV1aWQ7XHJcbiAgICAgICAgICAgIGlmICghbm9kZVV1aWQpIHJldHVybiBlcnIoXCJidWlsZE5vZGVUcmVlIHJldHVybmVkIG5vIHJvb3Qgbm9kZSBVVUlEXCIpO1xyXG5cclxuICAgICAgICAgICAgLy8gNC4g44OV44Kp44Oz44OI44O7U3ByaXRlRnJhbWUg44KSIEVkaXRvciBBUEkg57WM55Sx44Gn6Kit5a6a77yI44Ki44K744OD44OI5L6d5a2Y6L+96Leh44Gu44Gf44KB77yJXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2FwcGx5RGVmYXVsdEFzc2V0cyhub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICAvLyA0Yi4gdjIuMC4wOiBzcGVjLnByb3BlcnRpZXMg44KSIEVkaXRvciBBUEkg57WM55Sx44Gn5YaN6Kit5a6a44GZ44KLXHJcbiAgICAgICAgICAgIC8vICAgICBidWlsZE5vZGVSZWN1cnNpdmUg44GvIHNjZW5lLXByb2Nlc3Mg5YaF44GnIGBjb21wW3Byb3BOYW1lXSA9IHZhbHVlYCDjgafku6PlhaXjgZnjgovjgYzjgIFcclxuICAgICAgICAgICAgLy8gICAgIOOBk+OCjOOBoOOBqCBhc3NldCByZWYgKFVVSUQg5paH5a2X5YiXKSDjgYwgcmF3IOaWh+Wtl+WIl+OBruOBvuOBviAucHJlZmFiIOOBq+abuOOBjeWHuuOBleOCjOOAgVxyXG4gICAgICAgICAgICAvLyAgICAgcnVudGltZSDjgacgYHtfX3V1aWRfXywgX19leHBlY3RlZFR5cGVfX31gIOW9ouW8j+OBq+ino+axuuOBleOCjOOBquOBhOODkOOCsOOBjOOBguOCi+OAglxyXG4gICAgICAgICAgICAvLyAgICAgY29tcG9uZW50X3NldF9wcm9wZXJ0eSDntYznlLHjgaflho3oqK3lrprjgZnjgovjgZPjgajjgacgRWRpdG9yIOOBjOato+OBl+OBhCBkdW1wIOW9ouW8j+OBp1xyXG4gICAgICAgICAgICAvLyAgICAg44K344Oq44Ki44Op44Kk44K644GX44Gm44GP44KM44KL44CC5YCk5Z6LIChWZWMzL0NvbG9yL1NpemUpIOOChCBlbnVtIOWQjeOBquOBqeOCgumAj+mBjueahOOBq+ino+axuuOBleOCjOOCi+OAglxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9yZWFwcGx5UHJvcGVydGllc1ZpYUVkaXRvcih0cmVlUmVzdWx0LmRhdGEsIGNsZWFuU3BlYyk7XHJcblxyXG4gICAgICAgICAgICAvLyA1LiBhdXRvQmluZCDlrp/ooYwgKOaXpzQpXHJcbiAgICAgICAgICAgIGxldCBhdXRvQmluZFJlc3VsdDogYW55ID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGF1dG9CaW5kKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2NvbXBvbmVudFRvb2xzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycihcImF1dG9CaW5kIHJlcXVpcmVzIENvbXBvbmVudFRvb2xzIGRlcGVuZGVuY3kgKGludGVybmFsIGNvbmZpZ3VyYXRpb24gZXJyb3IpXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgYmluZFRvb2xSZXN1bHQgPSBhd2FpdCB0aGlzLl9jb21wb25lbnRUb29scy5leGVjdXRlKFwiY29tcG9uZW50X2F1dG9fYmluZFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogYXV0b0JpbmQsXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yY2U6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vZGU6IGF1dG9CaW5kTW9kZSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQmluZFJlc3VsdCA9IEpTT04ucGFyc2UoYmluZFRvb2xSZXN1bHQuY29udGVudFswXS50ZXh0KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyBhdXRvQmluZFJlc3VsdCA9IGJpbmRUb29sUmVzdWx0OyB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDYuIFByZWZhYiDkvZzmiJBcclxuICAgICAgICAgICAgY29uc3QgcHJlZmFiQXNzZXRVdWlkID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcclxuICAgICAgICAgICAgICAgIFwic2NlbmVcIiwgXCJjcmVhdGUtcHJlZmFiXCIsIG5vZGVVdWlkLCBwcmVmYWJQYXRoXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmICghcHJlZmFiQXNzZXRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJyZW1vdmUtbm9kZVwiLCB7IHV1aWQ6IG5vZGVVdWlkIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihcImNyZWF0ZS1wcmVmYWIgcmV0dXJuZWQgbm8gYXNzZXQgVVVJRFwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gNy4g5LiA5pmC44OO44O844OJ44KS5YmK6ZmkXHJcbiAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInJlbW92ZS1ub2RlXCIsIHsgdXVpZDogbm9kZVV1aWQgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHByZWZhYkFzc2V0VXVpZCxcclxuICAgICAgICAgICAgICAgIHBhdGg6IHByZWZhYlBhdGgsXHJcbiAgICAgICAgICAgICAgICBub2RlVHJlZTogdHJlZVJlc3VsdC5kYXRhLFxyXG4gICAgICAgICAgICAgICAgYXV0b0JpbmQ6IGF1dG9CaW5kUmVzdWx0LFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBidWlsZE5vZGVUcmVlIOOBp+S9nOaIkOOBl+OBn+ODjuODvOODieODhOODquODvOOBriBMYWJlbCDjgavjg5fjg63jgrjjgqfjgq/jg4jjg5Xjgqnjg7Pjg4jjgpLoqK3lrprjgZnjgovjgIJcclxuICAgICAqIEVkaXRvciBBUEkgKHNjZW5lOnNldC1wcm9wZXJ0eSkg57WM55Sx44Gn6Kit5a6a44GZ44KL44GT44Go44Gn44Ki44K744OD44OI5L6d5a2Y44GM5q2j44GX44GP6L+96Leh44GV44KM44KL44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgX2FwcGx5RGVmYXVsdEFzc2V0cyhyb290VXVpZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgLy8g44OX44Ot44K444Kn44Kv44OI44Gu44OH44OV44Kp44Or44OI44OV44Kp44Oz44OI44KS5qSc57Si77yIcmVzb3VyY2VzL2ZvbnRzLyDphY3kuIvjga4gVFRGRm9udO+8iVxyXG4gICAgICAgIGxldCBmb250VXVpZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXRzXCIsIHtcclxuICAgICAgICAgICAgICAgIHBhdHRlcm46IFwiZGI6Ly9hc3NldHMvcmVzb3VyY2VzL2ZvbnRzLyoqXCIsXHJcbiAgICAgICAgICAgICAgICBjY1R5cGU6IFwiY2MuVFRGRm9udFwiLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXNzZXRzKSAmJiBhc3NldHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZm9udFV1aWQgPSBhc3NldHNbMF0udXVpZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxyXG5cclxuICAgICAgICBpZiAoIWZvbnRVdWlkKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIOWFqOWtkOWtq+ODjuODvOODieOCkuWPluW+l1xyXG4gICAgICAgIGNvbnN0IGRlc2NlbmRhbnRzID0gYXdhaXQgdGhpcy5zY2VuZVNjcmlwdChcImdldEFsbERlc2NlbmRhbnRzXCIsIFtyb290VXVpZF0pO1xyXG4gICAgICAgIGlmICghZGVzY2VuZGFudHM/LnN1Y2Nlc3MpIHJldHVybjtcclxuICAgICAgICBjb25zdCBhbGxOb2RlcyA9IFt7IHV1aWQ6IHJvb3RVdWlkLCBuYW1lOiBcInJvb3RcIiB9LCAuLi5kZXNjZW5kYW50cy5kYXRhXTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIGFsbE5vZGVzKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRHVtcCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGVcIiwgbm9kZS51dWlkKTtcclxuICAgICAgICAgICAgICAgIGlmICghbm9kZUR1bXApIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcHMgPSBub2RlRHVtcC5fX2NvbXBzX18gfHwgW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wc1tpXS50eXBlIHx8IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTGFiZWwg44Gr44OV44Kp44Oz44OI6Kit5a6aXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBUeXBlID09PSBcImNjLkxhYmVsXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9udER1bXAgPSBjb21wc1tpXS52YWx1ZT8uZm9udDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmb250RHVtcD8udmFsdWU/LnV1aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNldC1wcm9wZXJ0eVwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtpfS5mb250YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHR5cGU6IFwiY2MuVFRGRm9udFwiLCB2YWx1ZTogeyB1dWlkOiBmb250VXVpZCB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNraXAgbm9kZXMgdGhhdCBjYW4ndCBiZSBxdWVyaWVkICovIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB2Mi4wLjA6IHNwZWMucHJvcGVydGllcyDjgpIgRWRpdG9yIEFQSSAoY29tcG9uZW50X3NldF9wcm9wZXJ0eSkg57WM55Sx44Gn5YaN6Kit5a6a44GZ44KL44CCXHJcbiAgICAgKlxyXG4gICAgICogYnVpbGROb2RlUmVjdXJzaXZlIChzY2VuZS50cykg44GvIGBjb21wW3Byb3BOYW1lXSA9IHZhbHVlYCDjgafku6PlhaXjgZnjgovjgYzjgIFhc3NldCByZWZcclxuICAgICAqIOOCkuWQq+OCgOODl+ODreODkeODhuOCo+OBryBFZGl0b3Ig44K344Oq44Ki44Op44Kk44K244KS6YCa44KJ44Gq44GE44Gf44KBIC5wcmVmYWIgSlNPTiDjgasgcmF3IFVVSURcclxuICAgICAqIOaWh+Wtl+WIl+OBqOOBl+OBpuabuOOBjeWHuuOBleOCjOOBpuOBl+OBvuOBhiAoUkVBRE1FIEtub3duIExpbWl0YXRpb24g6Kej5raIKeOAglxyXG4gICAgICpcclxuICAgICAqIOacrOODoeOCveODg+ODieOBryBub2RlVHJlZSDjgaggc3BlYyDjgpLlubPooYwgd2FsayDjgZfjgabjgIHlkITjg47jg7zjg4njga4gcHJvcGVydGllcyDjgpLlho3oqK3lrprjgZnjgovjgIJcclxuICAgICAqIENvbXBvbmVudFRvb2xzIOOBriBidWlsZER1bXBXaXRoVHlwZUluZm8g44GM5Z6L6Kej5rG644KS6KGM44GG44Gf44KB44CBVVVJRC9wYXRoL3twYXRoLGd1aWR9L1xyXG4gICAgICogZW51bSDlkI0vVmVjMy9Db2xvciDjgarjganjgpLjgZ3jga7jgb7jgb7muKHjgZvjgovjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBfcmVhcHBseVByb3BlcnRpZXNWaWFFZGl0b3Iobm9kZVRyZWU6IGFueSwgc3BlYzogYW55KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9jb21wb25lbnRUb29scyB8fCAhbm9kZVRyZWU/LnV1aWQgfHwgIXNwZWMpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHNwZWMucHJvcGVydGllcyAmJiB0eXBlb2Ygc3BlYy5wcm9wZXJ0aWVzID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNwZWMucHJvcGVydGllcykpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRvdElkeCA9IGtleS5sYXN0SW5kZXhPZihcIi5cIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZG90SWR4IDwgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGtleS5zdWJzdHJpbmcoMCwgZG90SWR4KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0ga2V5LnN1YnN0cmluZyhkb3RJZHggKyAxKTtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnRlbnRTaXplIOOBryBzY2VuZS50cyDlgbTjgacgc2V0Q29udGVudFNpemUoKSDjgafpganliIfjgavlh6bnkIbmuIjjgb/jgarjga7jgafjgrnjgq3jg4Pjg5dcclxuICAgICAgICAgICAgICAgIC8vIChFZGl0b3Ig57WM55Sx44Gn5YaN6Kit5a6a44GX44Gm44KC5a6z44Gv44Gq44GE44GM5YaX6ZW3KVxyXG4gICAgICAgICAgICAgICAgaWYgKHByb3BOYW1lID09PSBcImNvbnRlbnRTaXplXCIpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9jb21wb25lbnRUb29scy5leGVjdXRlKFwiY29tcG9uZW50X3NldF9wcm9wZXJ0eVwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVUcmVlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcHJvcE5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlgIvliKXjg5fjg63jg5Hjg4bjgqPjga7lpLHmlZfjga/nhKHoppbjgZfjgabntprooYwgKGF1dG9fYmluZCDnrYnjgaflvozjgYvjgonoqK3lrprjgZnjgovloLTlkIjjgYLjgoopXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNoaWxkcmVuID0gKG5vZGVUcmVlLmNoaWxkcmVuIHx8IFtdKSBhcyBhbnlbXTtcclxuICAgICAgICBjb25zdCBzcGVjQ2hpbGRyZW4gPSAoc3BlYy5jaGlsZHJlbiB8fCBbXSkgYXMgYW55W107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihjaGlsZHJlbi5sZW5ndGgsIHNwZWNDaGlsZHJlbi5sZW5ndGgpOyBpKyspIHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5fcmVhcHBseVByb3BlcnRpZXNWaWFFZGl0b3IoY2hpbGRyZW5baV0sIHNwZWNDaGlsZHJlbltpXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTY3JpcHQobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgYXJncyxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=