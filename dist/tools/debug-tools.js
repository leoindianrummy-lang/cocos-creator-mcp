"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugTools = void 0;
const tool_base_1 = require("../tool-base");
const mcp_server_1 = require("../mcp-server");
const utils_1 = require("../utils");
const scene_tools_1 = require("./scene-tools");
const screenshot_1 = require("../screenshot");
class DebugTools {
    constructor() {
        this.categoryName = "debug";
    }
    getTools() {
        return [
            {
                name: "debug_list_messages",
                description: "List available Editor messages for a given extension or built-in module.",
                inputSchema: {
                    type: "object",
                    properties: {
                        target: { type: "string", description: "Message target (e.g. 'scene', 'asset-db', 'extension')" },
                    },
                    required: ["target"],
                },
            },
            {
                name: "debug_execute_script",
                description: "Execute a custom scene script method. The method must be registered in scene.ts.",
                inputSchema: {
                    type: "object",
                    properties: {
                        method: { type: "string", description: "Method name from scene.ts" },
                        args: { type: "array", description: "Arguments to pass", items: {} },
                    },
                    required: ["method"],
                },
            },
            {
                name: "read_console",
                description: "Read Editor / Scene / Game console logs in one tool. Captures compile errors (from Editor / project.log), runtime errors, and console.log output across all sources. Supports action='get' (default) and action='clear'. Replaces debug_get_console_logs / debug_clear_console in v2.0.0.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'get' (default) or 'clear'." },
                        types: {
                            type: "array",
                            items: { type: "string" },
                            description: "Filter by entry type. Any of 'log' | 'info' | 'warn' | 'error'. Returns all types if omitted.",
                        },
                        sources: {
                            type: "array",
                            items: { type: "string" },
                            description: "Filter by source. Any of 'editor' | 'scene' | 'game'. Default: all three.",
                        },
                        count: { type: "number", description: "Max entries to return after merge (default 50)." },
                        includeStacktrace: { type: "boolean", description: "Include stacktrace strings if available (default false)." },
                        since: { type: "string", description: "ISO timestamp — return only entries newer than this (optional)." },
                        search: { type: "string", description: "Substring or regex pattern to filter messages (optional)." },
                    },
                },
            },
            {
                name: "debug_logs",
                description: "Read or search the project log file (separate from read_console — this is the editor's persistent log). Actions: 'get' (last N lines), 'search' (regex pattern), 'info' (file size / path / mtime).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'get' (default) | 'search' | 'info'" },
                        lines: { type: "number", description: "Number of lines to read (action=get, default 100)" },
                        pattern: { type: "string", description: "Regex pattern (action=search)" },
                    },
                },
            },
            {
                name: "debug_extension",
                description: "Manage editor extensions (this MCP server itself + others). Actions: 'list' (all installed extensions), 'info' (details for a specific extension by name), 'reload' (reload this MCP extension — for new tool definitions a full CC restart is still required).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'list' (default) | 'info' | 'reload'" },
                        name: { type: "string", description: "Extension name (action=info)" },
                    },
                },
            },
            // ── 以下、既存MCP未対応のEditor API ──
            {
                name: "debug_query_devices",
                description: "List connected devices (for native debugging).",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "debug_open_url",
                description: "Open a URL in the system browser from the editor.",
                inputSchema: {
                    type: "object",
                    properties: { url: { type: "string", description: "URL to open" } },
                    required: ["url"],
                },
            },
            {
                name: "debug_validate_scene",
                description: "Validate the current scene for common issues.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "debug_game_command",
                description: "Send a command to the running game preview. Requires GameDebugClient in the game. Commands: 'screenshot' (capture game canvas), 'state' (dump GameDb), 'navigate' (go to a page), 'click' (click a node by name), 'inspect' (get runtime node info: UITransform sizes, Widget, Layout, position). Returns the result from the game.",
                inputSchema: {
                    type: "object",
                    properties: {
                        type: { type: "string", description: "Command type: 'screenshot', 'state', 'navigate', 'click', 'inspect'" },
                        args: { type: "object", description: "Command arguments (e.g. {page: 'HomePageView'} for navigate, {name: 'ButtonName'} for click)" },
                        timeout: { type: "number", description: "Max wait time in ms (default 5000)" },
                        maxWidth: { type: "number", description: "Max width for screenshot resize (default: 960, 0 = no resize)" },
                        imageFormat: { type: "string", description: "Screenshot output format: 'webp' (default, Q=85) or 'png' (lossless)" },
                    },
                    required: ["type"],
                },
            },
            {
                name: "debug_screenshot",
                description: "Capture screenshots. Targets: 'window' (default — editor window, returns saved PNG path) or 'pages' (navigate game preview to each page name in `pages` and screenshot each — requires GameDebugClient + active preview).",
                inputSchema: {
                    type: "object",
                    properties: {
                        target: { type: "string", description: "'window' (default) | 'pages'" },
                        savePath: { type: "string", description: "File path (target=window, default temp/screenshots/screenshot_<timestamp>.png)" },
                        maxWidth: { type: "number", description: "Max width in pixels for resize (default 960, 0 = no resize)" },
                        pages: { type: "array", items: { type: "string" }, description: "Page names to screenshot (target=pages, e.g. ['HomePageView','ShopPageView'])" },
                        delay: { type: "number", description: "Delay ms between navigate and screenshot (target=pages, default 1000)" },
                    },
                },
            },
            {
                name: "debug_preview",
                description: "Start or stop the game preview. Uses Preview in Editor (auto-opens MainScene if needed). Falls back to browser preview if editor preview fails.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'start' (default) or 'stop'" },
                        waitForReady: { type: "boolean", description: "If true, wait until GameDebugClient connects after start (default: false)" },
                        waitTimeout: { type: "number", description: "Max wait time in ms for waitForReady (default: 15000)" },
                    },
                },
            },
            {
                name: "debug_clear_code_cache",
                description: "Clear the code cache (equivalent to Developer > Cache > Clear code cache) and soft-reload the scene.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "debug_record",
                description: "Record the game preview canvas to a video file (MP4/WebM via MediaRecorder on the game side). Actions: 'start' (configure fps/quality/format/savePath) and 'stop' (returns file path + size). Video saved to project's temp/recordings/rec_<datetime>.* by default.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'start' | 'stop'" },
                        fps: { type: "number", description: "Frames per second (action=start, default 30)" },
                        quality: { type: "string", description: "'low'|'medium'|'high'|'ultra' (action=start, default medium). Coefficients 0.15/0.25/0.40/0.60." },
                        coefficient: { type: "number", description: "Custom bitrate coefficient (width × height × fps × coefficient). Overrides quality." },
                        videoBitsPerSecond: { type: "number", description: "Explicit bitrate in bps. Overrides quality-based calculation." },
                        format: { type: "string", description: "'mp4' (default) | 'webm'. mp4 falls back to webm if unsupported." },
                        savePath: { type: "string", description: "Save directory (project-relative or absolute). Default: temp/recordings" },
                        timeout: { type: "number", description: "Max wait time in ms for file upload (action=stop, default 30000)" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "execute_editor_script",
                description: "ESCAPE HATCH (v2.0.0). Execute arbitrary JavaScript in the editor's scene process. Use for operations not covered by other tools: atomic transactions, experimental APIs, bulk operations, project-specific workflows. Code is wrapped in an async function so 'await' is usable directly. Available globals: Editor (Message API), cc (engine module), console. Return values are serialized; cc.Node / cc.Component instances become summary objects. WARNING: full Editor process privileges — local development only, never expose to untrusted callers.",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: { type: "string", description: "JavaScript code. Use `return <expr>` to return a value. Async / await supported." },
                        timeoutMs: { type: "number", description: "Max execution time in ms (default: 5000)." },
                        returnLogs: { type: "boolean", description: "If true, captures console.log/warn/error during execution and returns them in `logs` (default: false)." },
                    },
                    required: ["code"],
                },
            },
            {
                name: "debug_wait_compile",
                description: "Wait for TypeScript compilation to complete. Monitors the packer-driver debug log for 'Target(editor) ends' message. Use after modifying .ts files to ensure changes are compiled before operating on Prefabs. With clean=true, deletes compiled output first to force a fresh recompile (slower but guaranteed).",
                inputSchema: {
                    type: "object",
                    properties: {
                        timeout: { type: "number", description: "Max wait time in ms (default: 15000)" },
                        clean: { type: "boolean", description: "If true, delete compiled output first to force fresh recompile (default: false)" },
                    },
                },
            },
        ];
    }
    async execute(toolName, args) {
        var _a, _b;
        try {
            switch (toolName) {
                case "debug_list_messages":
                    return this.listMessages(args.target);
                case "debug_execute_script":
                    return this.executeScript(args.method, args.args || []);
                case "read_console":
                    return this.readConsole({
                        action: args.action || "get",
                        types: (0, utils_1.parseMaybeJson)(args.types),
                        sources: (0, utils_1.parseMaybeJson)(args.sources),
                        count: args.count || 50,
                        includeStacktrace: (_a = args.includeStacktrace) !== null && _a !== void 0 ? _a : false,
                        since: args.since,
                        search: args.search,
                    });
                case "debug_logs":
                    return this.handleLogsAction(args);
                case "debug_extension":
                    return this.handleExtensionAction(args);
                case "debug_query_devices": {
                    const devices = await Editor.Message.request("device", "query").catch(() => []);
                    return (0, tool_base_1.ok)({ success: true, devices });
                }
                case "debug_open_url":
                    await Editor.Message.request("program", "open-url", args.url);
                    return (0, tool_base_1.ok)({ success: true, url: args.url });
                case "debug_game_command":
                    return this.gameCommand(args.type || args.command, (0, utils_1.parseMaybeJson)(args.args), args.timeout || 5000, args.maxWidth, args.imageFormat);
                case "debug_screenshot": {
                    const target = args.target || "window";
                    if (target === "window")
                        return this.takeScreenshot(args.savePath, args.maxWidth);
                    if (target === "pages") {
                        if (!Array.isArray(args.pages))
                            return (0, tool_base_1.err)("debug_screenshot(pages): 'pages' array is required");
                        return this.batchScreenshot(args.pages, args.delay || 1000, args.maxWidth);
                    }
                    return (0, tool_base_1.err)(`Unknown debug_screenshot target: ${target}. Expected 'window' or 'pages'.`);
                }
                case "debug_preview":
                    return this.handlePreview(args.action || "start", args.waitForReady, args.waitTimeout || 15000);
                case "debug_clear_code_cache":
                    return this.clearCodeCache();
                case "debug_validate_scene":
                    return this.validateScene();
                case "debug_record":
                    if (args.action === "start") {
                        return this.gameCommand("record_start", {
                            fps: args.fps, quality: args.quality, coefficient: args.coefficient,
                            videoBitsPerSecond: args.videoBitsPerSecond, format: args.format, savePath: args.savePath,
                        }, 5000);
                    }
                    if (args.action === "stop") {
                        return this.gameCommand("record_stop", undefined, args.timeout || 30000);
                    }
                    return (0, tool_base_1.err)(`Unknown debug_record action: ${args.action}. Expected 'start' or 'stop'.`);
                case "debug_wait_compile":
                    return this.waitCompile(args.timeout || 15000, (_b = args.clean) !== null && _b !== void 0 ? _b : false);
                case "execute_editor_script": {
                    if (typeof args.code !== "string" || args.code.length === 0) {
                        return (0, tool_base_1.err)("execute_editor_script: 'code' is required and must be a non-empty string");
                    }
                    try {
                        const result = await Editor.Message.request("scene", "execute-scene-script", {
                            name: "cocos-creator-mcp",
                            method: "executeEditorScript",
                            args: [{
                                    code: args.code,
                                    timeoutMs: args.timeoutMs,
                                    returnLogs: args.returnLogs,
                                }],
                        });
                        return (0, tool_base_1.ok)(result);
                    }
                    catch (e) {
                        return (0, tool_base_1.err)(e.message || String(e));
                    }
                }
                default:
                    return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
            }
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getEditorInfo() {
        var _a, _b;
        return (0, tool_base_1.ok)({
            success: true,
            version: Editor.App.version,
            path: Editor.App.path,
            home: Editor.App.home,
            language: ((_b = (_a = Editor.I18n) === null || _a === void 0 ? void 0 : _a.getLanguage) === null || _b === void 0 ? void 0 : _b.call(_a)) || "unknown",
        });
    }
    async listMessages(target) {
        try {
            const info = await Editor.Message.request("extension", "query-info", target);
            return (0, tool_base_1.ok)({ success: true, target, info });
        }
        catch (e) {
            const knownMessages = {
                "scene": [
                    "query-node-tree", "create-node", "remove-node", "duplicate-node",
                    "set-property", "create-prefab", "save-scene", "execute-scene-script",
                    "query-is-dirty", "query-classes", "soft-reload", "snapshot",
                    "change-gizmo-tool", "query-gizmo-tool-name", "focus-camera-on-nodes",
                ],
                "asset-db": [
                    "query-assets", "query-asset-info", "query-asset-meta",
                    "refresh-asset", "save-asset", "create-asset", "delete-asset",
                    "move-asset", "copy-asset", "open-asset", "reimport-asset",
                    "query-path", "query-uuid", "query-url", "query-asset-depends",
                ],
            };
            const messages = knownMessages[target];
            if (messages) {
                return (0, tool_base_1.ok)({ success: true, target, messages, note: "Static list (query failed)" });
            }
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async executeScript(method, args) {
        const result = await Editor.Message.request("scene", "execute-scene-script", {
            name: "cocos-creator-mcp",
            method,
            args,
        });
        return (0, tool_base_1.ok)(result);
    }
    async readConsole(opts) {
        const allowedSources = new Set(["editor", "scene", "game"]);
        const sources = (opts.sources && opts.sources.length > 0)
            ? opts.sources.filter(s => allowedSources.has(s))
            : ["editor", "scene", "game"];
        if (opts.action === "clear") {
            const cleared = [];
            if (sources.includes("editor")) {
                try {
                    Editor.Message.send("console", "clear");
                    cleared.push("editor");
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }
            if (sources.includes("scene")) {
                try {
                    await Editor.Message.request("scene", "execute-scene-script", {
                        name: "cocos-creator-mcp",
                        method: "clearConsoleLogs",
                        args: [],
                    });
                    cleared.push("scene");
                }
                catch ( /* scene not available */_b) { /* scene not available */ }
            }
            if (sources.includes("game")) {
                (0, mcp_server_1.clearGameLogs)();
                cleared.push("game");
            }
            return (0, tool_base_1.ok)({ success: true, action: "clear", cleared });
        }
        if (opts.action !== "get") {
            return (0, tool_base_1.err)(`Unknown action: ${opts.action}. Expected 'get' or 'clear'.`);
        }
        const entries = [];
        // scene source
        if (sources.includes("scene")) {
            try {
                const result = await Editor.Message.request("scene", "execute-scene-script", {
                    name: "cocos-creator-mcp",
                    method: "getConsoleLogs",
                    args: [opts.count * 2, undefined], // request more, filter after merge
                });
                if (result === null || result === void 0 ? void 0 : result.logs) {
                    for (const l of result.logs) {
                        entries.push({
                            timestamp: l.timestamp,
                            source: "scene",
                            type: normalizeType(l.level),
                            message: l.message,
                            stacktrace: l.stacktrace,
                        });
                    }
                }
            }
            catch ( /* scene not available */_c) { /* scene not available */ }
        }
        // game source
        if (sources.includes("game")) {
            const gameResult = (0, mcp_server_1.getGameLogs)(opts.count * 2);
            for (const l of gameResult.logs) {
                entries.push({
                    timestamp: l.timestamp,
                    source: "game",
                    type: normalizeType(l.level),
                    message: l.message,
                    stacktrace: l.stacktrace,
                });
            }
        }
        // editor source
        if (sources.includes("editor")) {
            let viaApi = false;
            // 1. Try native console API first
            try {
                const logs = await Editor.Message.request("console", "query-last-logs", opts.count * 2);
                if (Array.isArray(logs) && logs.length > 0) {
                    viaApi = true;
                    for (const l of logs) {
                        entries.push({
                            timestamp: l.timestamp || new Date().toISOString(),
                            source: "editor",
                            type: normalizeType(l.type || l.level),
                            message: l.message || String(l),
                            stacktrace: l.stack || l.stacktrace,
                        });
                    }
                }
            }
            catch ( /* not supported in this version → fallback */_d) { /* not supported in this version → fallback */ }
            // 2. Fallback: parse project.log tail for compile error / warning patterns
            if (!viaApi) {
                try {
                    const parsed = await readProjectLogTail(opts.count * 2);
                    for (const e of parsed) {
                        entries.push(Object.assign(Object.assign({}, e), { source: "editor" }));
                    }
                }
                catch ( /* project.log unavailable */_f) { /* project.log unavailable */ }
            }
        }
        // Apply filters
        let filtered = entries;
        if (opts.types && opts.types.length > 0) {
            const allow = new Set(opts.types.map(normalizeType));
            filtered = filtered.filter(e => allow.has(e.type));
        }
        if (opts.since) {
            filtered = filtered.filter(e => e.timestamp > opts.since);
        }
        if (opts.search) {
            let re;
            try {
                re = new RegExp(opts.search, "i");
            }
            catch (_g) {
                re = new RegExp(escapeRegex(opts.search), "i");
            }
            filtered = filtered.filter(e => re.test(e.message));
        }
        if (!opts.includeStacktrace) {
            filtered = filtered.map((_a) => {
                var { stacktrace } = _a, rest = __rest(_a, ["stacktrace"]);
                return rest;
            });
        }
        // Sort by timestamp ascending, take last `count`
        filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const result = filtered.slice(-opts.count);
        const counts = {
            editor: entries.filter(e => e.source === "editor").length,
            scene: entries.filter(e => e.source === "scene").length,
            game: entries.filter(e => e.source === "game").length,
            total: result.length,
        };
        return (0, tool_base_1.ok)({ success: true, action: "get", entries: result, counts });
    }
    /** debug_logs dispatcher (v2.0.0). */
    async handleLogsAction(args) {
        const action = args.action || "get";
        switch (action) {
            case "get":
                return this.getProjectLogs(args.lines || 100);
            case "search":
                if (!args.pattern)
                    return (0, tool_base_1.err)("debug_logs(search): 'pattern' is required");
                return this.searchProjectLogs(args.pattern);
            case "info":
                return this.getLogFileInfo();
            default:
                return (0, tool_base_1.err)(`Unknown debug_logs action: ${action}. Expected get / search / info.`);
        }
    }
    /** debug_extension dispatcher (v2.0.0). */
    async handleExtensionAction(args) {
        const action = args.action || "list";
        switch (action) {
            case "list":
                return this.listExtensions();
            case "info":
                if (!args.name)
                    return (0, tool_base_1.err)("debug_extension(info): 'name' is required");
                return this.getExtensionInfo(args.name);
            case "reload":
                return this.reloadExtension();
            default:
                return (0, tool_base_1.err)(`Unknown debug_extension action: ${action}. Expected list / info / reload.`);
        }
    }
    async listExtensions() {
        try {
            const list = await Editor.Message.request("extension", "query-all");
            return (0, tool_base_1.ok)({ success: true, extensions: list });
        }
        catch (_a) {
            return (0, tool_base_1.ok)({ success: true, extensions: [], note: "Extension query not supported" });
        }
    }
    async getExtensionInfo(name) {
        try {
            const info = await Editor.Message.request("extension", "query-info", name);
            return (0, tool_base_1.ok)({ success: true, name, info });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getProjectLogs(lines) {
        try {
            const fs = require("fs");
            const path = require("path");
            const logPath = path.join(Editor.Project.tmpDir, "logs", "project.log");
            if (!fs.existsSync(logPath))
                return (0, tool_base_1.ok)({ success: true, logs: [], note: "Log file not found" });
            const content = fs.readFileSync(logPath, "utf-8");
            const allLines = content.split("\n");
            const recent = allLines.slice(-lines);
            return (0, tool_base_1.ok)({ success: true, lines: recent.length, logs: recent });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async searchProjectLogs(pattern) {
        try {
            const fs = require("fs");
            const path = require("path");
            const logPath = path.join(Editor.Project.tmpDir, "logs", "project.log");
            if (!fs.existsSync(logPath))
                return (0, tool_base_1.ok)({ success: true, matches: [] });
            const content = fs.readFileSync(logPath, "utf-8");
            const regex = new RegExp(pattern, "gi");
            const matches = content.split("\n").filter((line) => regex.test(line));
            return (0, tool_base_1.ok)({ success: true, pattern, count: matches.length, matches: matches.slice(0, 100) });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async getLogFileInfo() {
        try {
            const fs = require("fs");
            const path = require("path");
            const logPath = path.join(Editor.Project.tmpDir, "logs", "project.log");
            if (!fs.existsSync(logPath))
                return (0, tool_base_1.ok)({ success: true, exists: false });
            const stat = fs.statSync(logPath);
            return (0, tool_base_1.ok)({ success: true, exists: true, path: logPath, size: stat.size, modified: stat.mtime });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async handlePreview(action, waitForReady, waitTimeout) {
        if (action === "stop") {
            return this.stopPreview();
        }
        const result = await this.startPreview();
        if (waitForReady) {
            const resultData = JSON.parse(result.content[0].text);
            if (resultData.success) {
                const ready = await this.waitForGameReady(waitTimeout || 15000);
                resultData.gameReady = ready;
                if (!ready) {
                    resultData.note = (resultData.note || "") + " GameDebugClient did not connect within timeout.";
                }
                return (0, tool_base_1.ok)(resultData);
            }
        }
        return result;
    }
    async waitForGameReady(timeout) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            // Check if game has sent any log or command result recently
            const gameResult = (0, mcp_server_1.getGameLogs)(1);
            if (gameResult.total > 0)
                return true;
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }
    async startPreview() {
        try {
            await this.ensureMainSceneOpen();
            // ツールバーのVueインスタンス経由でplay()を呼ぶ（UI状態も同期される）
            const played = await this.executeOnToolbar("start");
            if (played) {
                return (0, tool_base_1.ok)({ success: true, action: "start", mode: "editor" });
            }
            // フォールバック: 直接API
            const isPlaying = await Editor.Message.request("scene", "editor-preview-set-play", true);
            return (0, tool_base_1.ok)({ success: true, isPlaying, action: "start", mode: "editor", note: "direct API (toolbar UI may not sync)" });
        }
        catch (e) {
            try {
                const electron = require("electron");
                await electron.shell.openExternal("http://127.0.0.1:7456");
                return (0, tool_base_1.ok)({ success: true, action: "start", mode: "browser" });
            }
            catch (e2) {
                return (0, tool_base_1.err)(e2.message || String(e2));
            }
        }
    }
    async stopPreview() {
        try {
            // ツールバー経由で停止（UI同期）
            const stopped = await this.executeOnToolbar("stop");
            if (!stopped) {
                // フォールバック: 直接API
                await Editor.Message.request("scene", "editor-preview-set-play", false);
            }
            // scene:preview-stop ブロードキャストでツールバーUI状態をリセット
            Editor.Message.broadcast("scene:preview-stop");
            // シーンビューに戻す
            await new Promise(r => setTimeout(r, 500));
            await this.ensureMainSceneOpen();
            return (0, tool_base_1.ok)({ success: true, action: "stop" });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async executeOnToolbar(action) {
        try {
            const electron = require("electron");
            const allContents = electron.webContents.getAllWebContents();
            for (const wc of allContents) {
                try {
                    // play()をawaitしない — プレビュー完了を待つとタイムアウトするため
                    if (action === "start") {
                        const result = await wc.executeJavaScript(`(function() { if (window.xxx && window.xxx.play && !window.xxx.gameView.isPlay) { window.xxx.play(); return true; } return false; })()`);
                        if (result)
                            return true;
                    }
                    else {
                        const result = await wc.executeJavaScript(`(function() { if (window.xxx && window.xxx.gameView.isPlay) { window.xxx.play(); return true; } return false; })()`);
                        if (result)
                            return true;
                    }
                }
                catch ( /* not the toolbar webContents */_a) { /* not the toolbar webContents */ }
            }
        }
        catch ( /* electron API not available */_b) { /* electron API not available */ }
        return false;
    }
    async ensureMainSceneOpen() {
        const hierarchy = await Editor.Message.request("scene", "execute-scene-script", {
            name: "cocos-creator-mcp",
            method: "getSceneHierarchy",
            args: [false],
        }).catch(() => null);
        if (!(hierarchy === null || hierarchy === void 0 ? void 0 : hierarchy.sceneName) || hierarchy.sceneName === "scene-2d") {
            // プロジェクト設定のStart Sceneを参照
            let sceneUuid = null;
            try {
                sceneUuid = await Editor.Profile.getConfig("preview", "general.start_scene", "local");
            }
            catch ( /* ignore */_a) { /* ignore */ }
            // Start Sceneが未設定 or "current_scene" の場合、最初のシーンを使う
            if (!sceneUuid || sceneUuid === "current_scene") {
                const scenes = await Editor.Message.request("asset-db", "query-assets", {
                    ccType: "cc.SceneAsset",
                    pattern: "db://assets/**/*",
                });
                if (Array.isArray(scenes) && scenes.length > 0) {
                    sceneUuid = scenes[0].uuid;
                }
            }
            if (sceneUuid) {
                // debug_preview 内部の自動遷移は preview を優先して force=true
                // （dialog 出るより preview 開始を優先する運用）
                await (0, scene_tools_1.ensureSceneSafeToSwitch)(true);
                await Editor.Message.request("scene", "open-scene", sceneUuid);
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }
    async clearCodeCache() {
        try {
            const electron = require("electron");
            const menu = electron.Menu.getApplicationMenu();
            if (!menu)
                return (0, tool_base_1.err)("Application menu not found");
            const findMenuItem = (items, path) => {
                var _a;
                for (const item of items) {
                    if (item.label === path[0]) {
                        if (path.length === 1)
                            return item;
                        if ((_a = item.submenu) === null || _a === void 0 ? void 0 : _a.items)
                            return findMenuItem(item.submenu.items, path.slice(1));
                    }
                }
                return null;
            };
            const cacheItem = findMenuItem(menu.items, ["Developer", "Cache", "Clear code cache"]);
            if (!cacheItem)
                return (0, tool_base_1.err)("Menu item 'Developer > Cache > Clear code cache' not found");
            cacheItem.click();
            await new Promise(r => setTimeout(r, 1000));
            return (0, tool_base_1.ok)({ success: true, note: "Code cache cleared via menu" });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async gameCommand(type, args, timeout, maxWidth, imageFormat) {
        var _a;
        const cmdId = (0, mcp_server_1.queueGameCommand)(type, args);
        // Poll for result
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const result = (0, mcp_server_1.getCommandResult)();
            if (result && result.id === cmdId) {
                // If screenshot, save to file and return path
                if (type === "screenshot" && result.success && ((_a = result.data) === null || _a === void 0 ? void 0 : _a.dataUrl)) {
                    try {
                        const fs = require("fs");
                        const path = require("path");
                        const dir = path.join(Editor.Project.tmpDir, "screenshots");
                        if (!fs.existsSync(dir))
                            fs.mkdirSync(dir, { recursive: true });
                        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                        const base64 = result.data.dataUrl.replace(/^data:image\/png;base64,/, "");
                        const pngBuffer = Buffer.from(base64, "base64");
                        const effectiveMaxWidth = maxWidth !== undefined ? maxWidth : 960;
                        const electron = require("electron");
                        const origImage = electron.nativeImage.createFromBuffer(pngBuffer);
                        const originalSize = origImage.getSize();
                        const { buffer, width, height, format } = await (0, screenshot_1.processImage)(pngBuffer, effectiveMaxWidth, imageFormat);
                        const ext = format === "webp" ? "webp" : format === "jpeg" ? "jpg" : "png";
                        const filePath = path.join(dir, `game_${timestamp}.${ext}`);
                        fs.writeFileSync(filePath, buffer);
                        return (0, tool_base_1.ok)({
                            success: true, path: filePath, size: buffer.length, format,
                            originalSize: `${originalSize.width}x${originalSize.height}`,
                            savedSize: `${width}x${height}`,
                        });
                    }
                    catch (e) {
                        return (0, tool_base_1.ok)({ success: true, note: "Screenshot captured but file save failed", error: e.message });
                    }
                }
                return (0, tool_base_1.ok)(result);
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return (0, tool_base_1.err)(`Game did not respond within ${timeout}ms. Is GameDebugClient running in the preview?`);
    }
    async takeScreenshot(savePath, maxWidth) {
        try {
            const result = await (0, screenshot_1.takeEditorScreenshot)(savePath, maxWidth);
            return (0, tool_base_1.ok)(result);
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async reloadExtension() {
        // Schedule reload after response is sent
        setTimeout(async () => {
            try {
                await Editor.Message.request("extension", "reload", "cocos-creator-mcp");
            }
            catch (e) {
                console.error("[MCP] Extension reload failed:", e.message);
            }
        }, 500);
        return (0, tool_base_1.ok)({ success: true, note: "Extension reload scheduled. MCP server will restart in ~1s. NOTE: Adding new tool definitions or modifying scene.ts requires a full CocosCreator restart (reload is not sufficient)." });
    }
    async batchScreenshot(pages, delay, maxWidth) {
        const results = [];
        const timeout = 10000;
        for (const page of pages) {
            // Navigate
            const navResult = await this.gameCommand("navigate", { page }, timeout, maxWidth);
            const navData = JSON.parse(navResult.content[0].text);
            if (!navData.success) {
                results.push({ page, success: false, error: "navigate failed" });
                continue;
            }
            // Wait for page to render
            await new Promise(r => setTimeout(r, delay));
            // Screenshot
            const ssResult = await this.gameCommand("screenshot", {}, timeout, maxWidth);
            const ssData = JSON.parse(ssResult.content[0].text);
            results.push({
                page,
                success: ssData.success || false,
                path: ssData.path,
                error: ssData.success ? undefined : (ssData.error || ssData.message),
            });
        }
        const succeeded = results.filter(r => r.success).length;
        return (0, tool_base_1.ok)({
            success: true,
            total: pages.length,
            succeeded,
            failed: pages.length - succeeded,
            results,
        });
    }
    async validateScene() {
        try {
            const tree = await Editor.Message.request("scene", "query-node-tree");
            const issues = [];
            const checkNodes = (nodes) => {
                if (!nodes)
                    return;
                for (const node of nodes) {
                    if (!node.name)
                        issues.push(`Node ${node.uuid} has no name`);
                    if (node.children)
                        checkNodes(node.children);
                }
            };
            if (Array.isArray(tree))
                checkNodes(tree);
            return (0, tool_base_1.ok)({ success: true, issueCount: issues.length, issues });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    /**
     * TypeScript コンパイル完了を待つ。
     * packer-driver の debug.log に "Target(editor) ends" が現れるのを監視する。
     * 既にコンパイル済み（直近数秒以内に完了ログあり）なら即座に返す。
     */
    async waitCompile(timeout, clean) {
        try {
            const fs = require("fs");
            const path = require("path");
            const logPath = path.join(Editor.Project.path, "temp", "programming", "packer-driver", "logs", "debug.log");
            const chunksDir = path.join(Editor.Project.path, "temp", "programming", "packer-driver", "targets", "editor", "chunks");
            if (!fs.existsSync(logPath)) {
                return (0, tool_base_1.err)(`Compile log not found: ${logPath}`);
            }
            const MARKER = "Target(editor) ends";
            // clean モード: コードキャッシュクリア + soft-reload で再コンパイルを強制
            if (clean) {
                // Developer > Cache > Clear code cache をクリック
                try {
                    const electron = require("electron");
                    const menu = electron.Menu.getApplicationMenu();
                    const findMenuItem = (items, labels) => {
                        var _a;
                        for (const item of items) {
                            if (item.label === labels[0]) {
                                if (labels.length === 1)
                                    return item;
                                if ((_a = item.submenu) === null || _a === void 0 ? void 0 : _a.items)
                                    return findMenuItem(item.submenu.items, labels.slice(1));
                            }
                        }
                        return null;
                    };
                    const cacheItem = menu ? findMenuItem(menu.items, ["Developer", "Cache", "Clear code cache"]) : null;
                    if (cacheItem)
                        cacheItem.click();
                }
                catch (_e) { /* ignore */ }
                await new Promise(r => setTimeout(r, 500));
                // soft-reload でシーンを再読み込み → コンパイルトリガー
                await Editor.Message.request("scene", "soft-reload").catch(() => { });
            }
            // refresh-asset でファイル変更を CC に通知してコンパイルをトリガー
            await Editor.Message.request("asset-db", "refresh-asset", "db://assets").catch(() => { });
            const initialSize = fs.statSync(logPath).size;
            const startTime = Date.now();
            const POLL_INTERVAL = 200;
            const DETECT_GRACE_MS = 2000; // CC がファイル変更を検知するまでの猶予
            while (Date.now() - startTime < timeout) {
                await new Promise(r => setTimeout(r, POLL_INTERVAL));
                const currentSize = fs.statSync(logPath).size;
                // ログが成長していない
                if (currentSize <= initialSize) {
                    // clean モードでは必ずコンパイルが走るので猶予判定しない
                    if (clean)
                        continue;
                    // 猶予期間内はまだ待つ (CC の検知が遅い可能性)
                    if (Date.now() - startTime < DETECT_GRACE_MS)
                        continue;
                    // 猶予期間を過ぎてもログが成長しない → コンパイル不要
                    return (0, tool_base_1.ok)({ success: true, compiled: true, waitedMs: Date.now() - startTime, note: "No compilation triggered (no changes detected)" });
                }
                // ログが成長した → 新しい部分にマーカーがあるか確認
                const fd = fs.openSync(logPath, "r");
                const newBytes = currentSize - initialSize;
                const buffer = Buffer.alloc(newBytes);
                fs.readSync(fd, buffer, 0, newBytes, initialSize);
                fs.closeSync(fd);
                const newContent = buffer.toString("utf8");
                if (newContent.includes(MARKER)) {
                    return (0, tool_base_1.ok)({ success: true, compiled: true, waitedMs: Date.now() - startTime });
                }
            }
            return (0, tool_base_1.ok)({ success: true, compiled: false, timeout: true, waitedMs: timeout });
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
}
exports.DebugTools = DebugTools;
/** Normalize various level / type spellings to a canonical "log"|"info"|"warn"|"error" string. */
function normalizeType(raw) {
    const s = String(raw !== null && raw !== void 0 ? raw : "").toLowerCase();
    if (s === "warning")
        return "warn";
    if (s === "err")
        return "error";
    if (s === "log" || s === "info" || s === "warn" || s === "error")
        return s;
    return "log";
}
/** Escape a string so it can be embedded into a RegExp literally. */
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * project.log の末尾を読み、Cocos Creator が書き出す compile error / warning /
 * generic message を構造化エントリに変換する。
 *
 * Cocos Creator が project.log に書き出す代表的なパターン:
 *   [11:22:33] [info] message...
 *   [11:22:33] [warn] message...
 *   [11:22:33] [error] message... (TS2304: Cannot find name 'Foo' など)
 *   [Scene] [error] file: assets/.../Foo.ts(12,5)
 *
 * Editor バージョンや locale により書式は変わる可能性があるので、行頭の
 * `[ts] [level]` パターンと、`error TS\d+:` の TypeScript エラー、
 * `[level]` 単独行など複数パターンを許容する。
 */
async function readProjectLogTail(maxEntries) {
    const fs = require("fs");
    const path = require("path");
    const logPath = path.join(Editor.Project.tmpDir, "logs", "project.log");
    if (!fs.existsSync(logPath))
        return [];
    const stat = fs.statSync(logPath);
    // 末尾 256KB を読む（compile error は大きくないので十分）
    const READ_BYTES = 256 * 1024;
    const start = Math.max(0, stat.size - READ_BYTES);
    const fd = fs.openSync(logPath, "r");
    const buffer = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);
    const text = buffer.toString("utf8");
    const lines = text.split(/\r?\n/);
    // 部分行（先頭行は切れている可能性）を捨てる
    if (start > 0 && lines.length > 0)
        lines.shift();
    const entries = [];
    const lineRe = /^\[(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\]\s*(?:\[([^\]]+)\])?\s*\[?(log|info|warn|warning|error)\]?\s*(.*)$/i;
    const tsErrRe = /\berror\s+TS\d+:\s*/i;
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10);
    let pending = null;
    for (const raw of lines) {
        const line = raw.replace(/\[[0-9;]*m/g, ""); // strip ANSI color codes
        if (!line.trim())
            continue;
        const m = line.match(lineRe);
        if (m) {
            if (pending)
                entries.push(pending);
            const [, time, tag, level, body] = m;
            const ts = `${isoDate}T${time}${time.length === 8 ? ".000" : ""}Z`;
            pending = {
                timestamp: ts,
                type: normalizeType(level),
                message: tag ? `[${tag}] ${body}` : body,
            };
        }
        else if (tsErrRe.test(line)) {
            // TypeScript エラー単独行（タイムスタンプなし）
            if (pending)
                entries.push(pending);
            pending = {
                timestamp: new Date().toISOString(),
                type: "error",
                message: line.trim(),
            };
        }
        else if (pending) {
            // 継続行 — stacktrace に追加
            pending.stacktrace = pending.stacktrace ? `${pending.stacktrace}\n${line}` : line;
        }
    }
    if (pending)
        entries.push(pending);
    // 末尾 maxEntries 件
    return entries.slice(-maxEntries);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBdUM7QUFDdkMsOENBQStGO0FBQy9GLG9DQUEwQztBQUMxQywrQ0FBd0Q7QUFDeEQsOENBQW1FO0FBRW5FLE1BQWEsVUFBVTtJQUF2QjtRQUNhLGlCQUFZLEdBQUcsT0FBTyxDQUFDO0lBODRCcEMsQ0FBQztJQTU0QkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixXQUFXLEVBQUUsMEVBQTBFO2dCQUN2RixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdEQUF3RCxFQUFFO3FCQUNwRztvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsa0ZBQWtGO2dCQUMvRixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJCQUEyQixFQUFFO3dCQUNwRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO3FCQUN2RTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsY0FBYztnQkFDcEIsV0FBVyxFQUFFLDJSQUEyUjtnQkFDeFMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNk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QyxDQUFDLENBQUMsSUFBSTthQUMzQyxDQUFDO1FBQ04sQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzVCLCtCQUErQjtZQUMvQixJQUFJLE9BQU87Z0JBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxPQUFPLEdBQUc7Z0JBQ04sU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxJQUFJLEVBQUUsT0FBTztnQkFDYixPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRTthQUN2QixDQUFDO1FBQ04sQ0FBQzthQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDakIsdUJBQXVCO1lBQ3ZCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDdEYsQ0FBQztJQUNMLENBQUM7SUFDRCxJQUFJLE9BQU87UUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRW5DLGtCQUFrQjtJQUNsQixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbENhdGVnb3J5LCBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3VsdCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBvaywgZXJyIH0gZnJvbSBcIi4uL3Rvb2wtYmFzZVwiO1xyXG5pbXBvcnQgeyBnZXRHYW1lTG9ncywgY2xlYXJHYW1lTG9ncywgcXVldWVHYW1lQ29tbWFuZCwgZ2V0Q29tbWFuZFJlc3VsdCB9IGZyb20gXCIuLi9tY3Atc2VydmVyXCI7XHJcbmltcG9ydCB7IHBhcnNlTWF5YmVKc29uIH0gZnJvbSBcIi4uL3V0aWxzXCI7XHJcbmltcG9ydCB7IGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoIH0gZnJvbSBcIi4vc2NlbmUtdG9vbHNcIjtcclxuaW1wb3J0IHsgcHJvY2Vzc0ltYWdlLCB0YWtlRWRpdG9yU2NyZWVuc2hvdCB9IGZyb20gXCIuLi9zY3JlZW5zaG90XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRGVidWdUb29scyBpbXBsZW1lbnRzIFRvb2xDYXRlZ29yeSB7XHJcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcImRlYnVnXCI7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19saXN0X21lc3NhZ2VzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMaXN0IGF2YWlsYWJsZSBFZGl0b3IgbWVzc2FnZXMgZm9yIGEgZ2l2ZW4gZXh0ZW5zaW9uIG9yIGJ1aWx0LWluIG1vZHVsZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJNZXNzYWdlIHRhcmdldCAoZS5nLiAnc2NlbmUnLCAnYXNzZXQtZGInLCAnZXh0ZW5zaW9uJylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInRhcmdldFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZXhlY3V0ZV9zY3JpcHRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkV4ZWN1dGUgYSBjdXN0b20gc2NlbmUgc2NyaXB0IG1ldGhvZC4gVGhlIG1ldGhvZCBtdXN0IGJlIHJlZ2lzdGVyZWQgaW4gc2NlbmUudHMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTWV0aG9kIG5hbWUgZnJvbSBzY2VuZS50c1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHsgdHlwZTogXCJhcnJheVwiLCBkZXNjcmlwdGlvbjogXCJBcmd1bWVudHMgdG8gcGFzc1wiLCBpdGVtczoge30gfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJtZXRob2RcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInJlYWRfY29uc29sZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVhZCBFZGl0b3IgLyBTY2VuZSAvIEdhbWUgY29uc29sZSBsb2dzIGluIG9uZSB0b29sLiBDYXB0dXJlcyBjb21waWxlIGVycm9ycyAoZnJvbSBFZGl0b3IgLyBwcm9qZWN0LmxvZyksIHJ1bnRpbWUgZXJyb3JzLCBhbmQgY29uc29sZS5sb2cgb3V0cHV0IGFjcm9zcyBhbGwgc291cmNlcy4gU3VwcG9ydHMgYWN0aW9uPSdnZXQnIChkZWZhdWx0KSBhbmQgYWN0aW9uPSdjbGVhcicuIFJlcGxhY2VzIGRlYnVnX2dldF9jb25zb2xlX2xvZ3MgLyBkZWJ1Z19jbGVhcl9jb25zb2xlIGluIHYyLjAuMC5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInZ2V0JyAoZGVmYXVsdCkgb3IgJ2NsZWFyJy5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRmlsdGVyIGJ5IGVudHJ5IHR5cGUuIEFueSBvZiAnbG9nJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcicuIFJldHVybnMgYWxsIHR5cGVzIGlmIG9taXR0ZWQuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkZpbHRlciBieSBzb3VyY2UuIEFueSBvZiAnZWRpdG9yJyB8ICdzY2VuZScgfCAnZ2FtZScuIERlZmF1bHQ6IGFsbCB0aHJlZS5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IGVudHJpZXMgdG8gcmV0dXJuIGFmdGVyIG1lcmdlIChkZWZhdWx0IDUwKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlU3RhY2t0cmFjZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSW5jbHVkZSBzdGFja3RyYWNlIHN0cmluZ3MgaWYgYXZhaWxhYmxlIChkZWZhdWx0IGZhbHNlKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaW5jZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJJU08gdGltZXN0YW1wIOKAlCByZXR1cm4gb25seSBlbnRyaWVzIG5ld2VyIHRoYW4gdGhpcyAob3B0aW9uYWwpLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTdWJzdHJpbmcgb3IgcmVnZXggcGF0dGVybiB0byBmaWx0ZXIgbWVzc2FnZXMgKG9wdGlvbmFsKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2xvZ3NcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlYWQgb3Igc2VhcmNoIHRoZSBwcm9qZWN0IGxvZyBmaWxlIChzZXBhcmF0ZSBmcm9tIHJlYWRfY29uc29sZSDigJQgdGhpcyBpcyB0aGUgZWRpdG9yJ3MgcGVyc2lzdGVudCBsb2cpLiBBY3Rpb25zOiAnZ2V0JyAobGFzdCBOIGxpbmVzKSwgJ3NlYXJjaCcgKHJlZ2V4IHBhdHRlcm4pLCAnaW5mbycgKGZpbGUgc2l6ZSAvIHBhdGggLyBtdGltZSkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2dldCcgKGRlZmF1bHQpIHwgJ3NlYXJjaCcgfCAnaW5mbydcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lczogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJOdW1iZXIgb2YgbGluZXMgdG8gcmVhZCAoYWN0aW9uPWdldCwgZGVmYXVsdCAxMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJSZWdleCBwYXR0ZXJuIChhY3Rpb249c2VhcmNoKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZXh0ZW5zaW9uXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJNYW5hZ2UgZWRpdG9yIGV4dGVuc2lvbnMgKHRoaXMgTUNQIHNlcnZlciBpdHNlbGYgKyBvdGhlcnMpLiBBY3Rpb25zOiAnbGlzdCcgKGFsbCBpbnN0YWxsZWQgZXh0ZW5zaW9ucyksICdpbmZvJyAoZGV0YWlscyBmb3IgYSBzcGVjaWZpYyBleHRlbnNpb24gYnkgbmFtZSksICdyZWxvYWQnIChyZWxvYWQgdGhpcyBNQ1AgZXh0ZW5zaW9uIOKAlCBmb3IgbmV3IHRvb2wgZGVmaW5pdGlvbnMgYSBmdWxsIENDIHJlc3RhcnQgaXMgc3RpbGwgcmVxdWlyZWQpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidsaXN0JyAoZGVmYXVsdCkgfCAnaW5mbycgfCAncmVsb2FkJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRXh0ZW5zaW9uIG5hbWUgKGFjdGlvbj1pbmZvKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIOKUgOKUgCDku6XkuIvjgIHml6LlrZhNQ1DmnKrlr77lv5zjga5FZGl0b3IgQVBJIOKUgOKUgFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3F1ZXJ5X2RldmljZXNcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxpc3QgY29ubmVjdGVkIGRldmljZXMgKGZvciBuYXRpdmUgZGVidWdnaW5nKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfb3Blbl91cmxcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk9wZW4gYSBVUkwgaW4gdGhlIHN5c3RlbSBicm93c2VyIGZyb20gdGhlIGVkaXRvci5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHVybDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJVUkwgdG8gb3BlblwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widXJsXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z192YWxpZGF0ZV9zY2VuZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVmFsaWRhdGUgdGhlIGN1cnJlbnQgc2NlbmUgZm9yIGNvbW1vbiBpc3N1ZXMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dhbWVfY29tbWFuZFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2VuZCBhIGNvbW1hbmQgdG8gdGhlIHJ1bm5pbmcgZ2FtZSBwcmV2aWV3LiBSZXF1aXJlcyBHYW1lRGVidWdDbGllbnQgaW4gdGhlIGdhbWUuIENvbW1hbmRzOiAnc2NyZWVuc2hvdCcgKGNhcHR1cmUgZ2FtZSBjYW52YXMpLCAnc3RhdGUnIChkdW1wIEdhbWVEYiksICduYXZpZ2F0ZScgKGdvIHRvIGEgcGFnZSksICdjbGljaycgKGNsaWNrIGEgbm9kZSBieSBuYW1lKSwgJ2luc3BlY3QnIChnZXQgcnVudGltZSBub2RlIGluZm86IFVJVHJhbnNmb3JtIHNpemVzLCBXaWRnZXQsIExheW91dCwgcG9zaXRpb24pLiBSZXR1cm5zIHRoZSByZXN1bHQgZnJvbSB0aGUgZ2FtZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tbWFuZCB0eXBlOiAnc2NyZWVuc2hvdCcsICdzdGF0ZScsICduYXZpZ2F0ZScsICdjbGljaycsICdpbnNwZWN0J1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHsgdHlwZTogXCJvYmplY3RcIiwgZGVzY3JpcHRpb246IFwiQ29tbWFuZCBhcmd1bWVudHMgKGUuZy4ge3BhZ2U6ICdIb21lUGFnZVZpZXcnfSBmb3IgbmF2aWdhdGUsIHtuYW1lOiAnQnV0dG9uTmFtZSd9IGZvciBjbGljaylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgKGRlZmF1bHQgNTAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhXaWR0aDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2lkdGggZm9yIHNjcmVlbnNob3QgcmVzaXplIChkZWZhdWx0OiA5NjAsIDAgPSBubyByZXNpemUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VGb3JtYXQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU2NyZWVuc2hvdCBvdXRwdXQgZm9ybWF0OiAnd2VicCcgKGRlZmF1bHQsIFE9ODUpIG9yICdwbmcnIChsb3NzbGVzcylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3NjcmVlbnNob3RcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNhcHR1cmUgc2NyZWVuc2hvdHMuIFRhcmdldHM6ICd3aW5kb3cnIChkZWZhdWx0IOKAlCBlZGl0b3Igd2luZG93LCByZXR1cm5zIHNhdmVkIFBORyBwYXRoKSBvciAncGFnZXMnIChuYXZpZ2F0ZSBnYW1lIHByZXZpZXcgdG8gZWFjaCBwYWdlIG5hbWUgaW4gYHBhZ2VzYCBhbmQgc2NyZWVuc2hvdCBlYWNoIOKAlCByZXF1aXJlcyBHYW1lRGVidWdDbGllbnQgKyBhY3RpdmUgcHJldmlldykuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ3dpbmRvdycgKGRlZmF1bHQpIHwgJ3BhZ2VzJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkZpbGUgcGF0aCAodGFyZ2V0PXdpbmRvdywgZGVmYXVsdCB0ZW1wL3NjcmVlbnNob3RzL3NjcmVlbnNob3RfPHRpbWVzdGFtcD4ucG5nKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFdpZHRoOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3aWR0aCBpbiBwaXhlbHMgZm9yIHJlc2l6ZSAoZGVmYXVsdCA5NjAsIDAgPSBubyByZXNpemUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZXM6IHsgdHlwZTogXCJhcnJheVwiLCBpdGVtczogeyB0eXBlOiBcInN0cmluZ1wiIH0sIGRlc2NyaXB0aW9uOiBcIlBhZ2UgbmFtZXMgdG8gc2NyZWVuc2hvdCAodGFyZ2V0PXBhZ2VzLCBlLmcuIFsnSG9tZVBhZ2VWaWV3JywnU2hvcFBhZ2VWaWV3J10pXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiRGVsYXkgbXMgYmV0d2VlbiBuYXZpZ2F0ZSBhbmQgc2NyZWVuc2hvdCAodGFyZ2V0PXBhZ2VzLCBkZWZhdWx0IDEwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19wcmV2aWV3XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTdGFydCBvciBzdG9wIHRoZSBnYW1lIHByZXZpZXcuIFVzZXMgUHJldmlldyBpbiBFZGl0b3IgKGF1dG8tb3BlbnMgTWFpblNjZW5lIGlmIG5lZWRlZCkuIEZhbGxzIGJhY2sgdG8gYnJvd3NlciBwcmV2aWV3IGlmIGVkaXRvciBwcmV2aWV3IGZhaWxzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidzdGFydCcgKGRlZmF1bHQpIG9yICdzdG9wJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JSZWFkeTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgd2FpdCB1bnRpbCBHYW1lRGVidWdDbGllbnQgY29ubmVjdHMgYWZ0ZXIgc3RhcnQgKGRlZmF1bHQ6IGZhbHNlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRUaW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgZm9yIHdhaXRGb3JSZWFkeSAoZGVmYXVsdDogMTUwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19jbGVhcl9jb2RlX2NhY2hlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDbGVhciB0aGUgY29kZSBjYWNoZSAoZXF1aXZhbGVudCB0byBEZXZlbG9wZXIgPiBDYWNoZSA+IENsZWFyIGNvZGUgY2FjaGUpIGFuZCBzb2Z0LXJlbG9hZCB0aGUgc2NlbmUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3JlY29yZFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVjb3JkIHRoZSBnYW1lIHByZXZpZXcgY2FudmFzIHRvIGEgdmlkZW8gZmlsZSAoTVA0L1dlYk0gdmlhIE1lZGlhUmVjb3JkZXIgb24gdGhlIGdhbWUgc2lkZSkuIEFjdGlvbnM6ICdzdGFydCcgKGNvbmZpZ3VyZSBmcHMvcXVhbGl0eS9mb3JtYXQvc2F2ZVBhdGgpIGFuZCAnc3RvcCcgKHJldHVybnMgZmlsZSBwYXRoICsgc2l6ZSkuIFZpZGVvIHNhdmVkIHRvIHByb2plY3QncyB0ZW1wL3JlY29yZGluZ3MvcmVjXzxkYXRldGltZT4uKiBieSBkZWZhdWx0LlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidzdGFydCcgfCAnc3RvcCdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcHM6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiRnJhbWVzIHBlciBzZWNvbmQgKGFjdGlvbj1zdGFydCwgZGVmYXVsdCAzMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidsb3cnfCdtZWRpdW0nfCdoaWdoJ3wndWx0cmEnIChhY3Rpb249c3RhcnQsIGRlZmF1bHQgbWVkaXVtKS4gQ29lZmZpY2llbnRzIDAuMTUvMC4yNS8wLjQwLzAuNjAuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29lZmZpY2llbnQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiQ3VzdG9tIGJpdHJhdGUgY29lZmZpY2llbnQgKHdpZHRoIMOXIGhlaWdodCDDlyBmcHMgw5cgY29lZmZpY2llbnQpLiBPdmVycmlkZXMgcXVhbGl0eS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0JpdHNQZXJTZWNvbmQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiRXhwbGljaXQgYml0cmF0ZSBpbiBicHMuIE92ZXJyaWRlcyBxdWFsaXR5LWJhc2VkIGNhbGN1bGF0aW9uLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInbXA0JyAoZGVmYXVsdCkgfCAnd2VibScuIG1wNCBmYWxscyBiYWNrIHRvIHdlYm0gaWYgdW5zdXBwb3J0ZWQuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU2F2ZSBkaXJlY3RvcnkgKHByb2plY3QtcmVsYXRpdmUgb3IgYWJzb2x1dGUpLiBEZWZhdWx0OiB0ZW1wL3JlY29yZGluZ3NcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgZm9yIGZpbGUgdXBsb2FkIChhY3Rpb249c3RvcCwgZGVmYXVsdCAzMDAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZXhlY3V0ZV9lZGl0b3Jfc2NyaXB0XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJFU0NBUEUgSEFUQ0ggKHYyLjAuMCkuIEV4ZWN1dGUgYXJiaXRyYXJ5IEphdmFTY3JpcHQgaW4gdGhlIGVkaXRvcidzIHNjZW5lIHByb2Nlc3MuIFVzZSBmb3Igb3BlcmF0aW9ucyBub3QgY292ZXJlZCBieSBvdGhlciB0b29sczogYXRvbWljIHRyYW5zYWN0aW9ucywgZXhwZXJpbWVudGFsIEFQSXMsIGJ1bGsgb3BlcmF0aW9ucywgcHJvamVjdC1zcGVjaWZpYyB3b3JrZmxvd3MuIENvZGUgaXMgd3JhcHBlZCBpbiBhbiBhc3luYyBmdW5jdGlvbiBzbyAnYXdhaXQnIGlzIHVzYWJsZSBkaXJlY3RseS4gQXZhaWxhYmxlIGdsb2JhbHM6IEVkaXRvciAoTWVzc2FnZSBBUEkpLCBjYyAoZW5naW5lIG1vZHVsZSksIGNvbnNvbGUuIFJldHVybiB2YWx1ZXMgYXJlIHNlcmlhbGl6ZWQ7IGNjLk5vZGUgLyBjYy5Db21wb25lbnQgaW5zdGFuY2VzIGJlY29tZSBzdW1tYXJ5IG9iamVjdHMuIFdBUk5JTkc6IGZ1bGwgRWRpdG9yIHByb2Nlc3MgcHJpdmlsZWdlcyDigJQgbG9jYWwgZGV2ZWxvcG1lbnQgb25seSwgbmV2ZXIgZXhwb3NlIHRvIHVudHJ1c3RlZCBjYWxsZXJzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJKYXZhU2NyaXB0IGNvZGUuIFVzZSBgcmV0dXJuIDxleHByPmAgdG8gcmV0dXJuIGEgdmFsdWUuIEFzeW5jIC8gYXdhaXQgc3VwcG9ydGVkLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRNczogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggZXhlY3V0aW9uIHRpbWUgaW4gbXMgKGRlZmF1bHQ6IDUwMDApLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybkxvZ3M6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIGNhcHR1cmVzIGNvbnNvbGUubG9nL3dhcm4vZXJyb3IgZHVyaW5nIGV4ZWN1dGlvbiBhbmQgcmV0dXJucyB0aGVtIGluIGBsb2dzYCAoZGVmYXVsdDogZmFsc2UpLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiY29kZVwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfd2FpdF9jb21waWxlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJXYWl0IGZvciBUeXBlU2NyaXB0IGNvbXBpbGF0aW9uIHRvIGNvbXBsZXRlLiBNb25pdG9ycyB0aGUgcGFja2VyLWRyaXZlciBkZWJ1ZyBsb2cgZm9yICdUYXJnZXQoZWRpdG9yKSBlbmRzJyBtZXNzYWdlLiBVc2UgYWZ0ZXIgbW9kaWZ5aW5nIC50cyBmaWxlcyB0byBlbnN1cmUgY2hhbmdlcyBhcmUgY29tcGlsZWQgYmVmb3JlIG9wZXJhdGluZyBvbiBQcmVmYWJzLiBXaXRoIGNsZWFuPXRydWUsIGRlbGV0ZXMgY29tcGlsZWQgb3V0cHV0IGZpcnN0IHRvIGZvcmNlIGEgZnJlc2ggcmVjb21waWxlIChzbG93ZXIgYnV0IGd1YXJhbnRlZWQpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2FpdCB0aW1lIGluIG1zIChkZWZhdWx0OiAxNTAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbjogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgZGVsZXRlIGNvbXBpbGVkIG91dHB1dCBmaXJzdCB0byBmb3JjZSBmcmVzaCByZWNvbXBpbGUgKGRlZmF1bHQ6IGZhbHNlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfbGlzdF9tZXNzYWdlc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxpc3RNZXNzYWdlcyhhcmdzLnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZXhlY3V0ZV9zY3JpcHRcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NyaXB0KGFyZ3MubWV0aG9kLCBhcmdzLmFyZ3MgfHwgW10pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlYWRfY29uc29sZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRDb25zb2xlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiBhcmdzLmFjdGlvbiB8fCBcImdldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlczogcGFyc2VNYXliZUpzb24oYXJncy50eXBlcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZXM6IHBhcnNlTWF5YmVKc29uKGFyZ3Muc291cmNlcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBhcmdzLmNvdW50IHx8IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlU3RhY2t0cmFjZTogYXJncy5pbmNsdWRlU3RhY2t0cmFjZSA/PyBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2luY2U6IGFyZ3Muc2luY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogYXJncy5zZWFyY2gsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfbG9nc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUxvZ3NBY3Rpb24oYXJncyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZXh0ZW5zaW9uXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXh0ZW5zaW9uQWN0aW9uKGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3F1ZXJ5X2RldmljZXNcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZXMgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZGV2aWNlXCIsIFwicXVlcnlcIikuY2F0Y2goKCkgPT4gW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGRldmljZXMgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfb3Blbl91cmxcIjpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwicHJvZ3JhbVwiLCBcIm9wZW4tdXJsXCIsIGFyZ3MudXJsKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB1cmw6IGFyZ3MudXJsIH0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dhbWVfY29tbWFuZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdhbWVDb21tYW5kKGFyZ3MudHlwZSB8fCBhcmdzLmNvbW1hbmQsIHBhcnNlTWF5YmVKc29uKGFyZ3MuYXJncyksIGFyZ3MudGltZW91dCB8fCA1MDAwLCBhcmdzLm1heFdpZHRoLCBhcmdzLmltYWdlRm9ybWF0KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19zY3JlZW5zaG90XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhcmdzLnRhcmdldCB8fCBcIndpbmRvd1wiO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgPT09IFwid2luZG93XCIpIHJldHVybiB0aGlzLnRha2VTY3JlZW5zaG90KGFyZ3Muc2F2ZVBhdGgsIGFyZ3MubWF4V2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgPT09IFwicGFnZXNcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJncy5wYWdlcykpIHJldHVybiBlcnIoXCJkZWJ1Z19zY3JlZW5zaG90KHBhZ2VzKTogJ3BhZ2VzJyBhcnJheSBpcyByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmF0Y2hTY3JlZW5zaG90KGFyZ3MucGFnZXMsIGFyZ3MuZGVsYXkgfHwgMTAwMCwgYXJncy5tYXhXaWR0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gZGVidWdfc2NyZWVuc2hvdCB0YXJnZXQ6ICR7dGFyZ2V0fS4gRXhwZWN0ZWQgJ3dpbmRvdycgb3IgJ3BhZ2VzJy5gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19wcmV2aWV3XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlUHJldmlldyhhcmdzLmFjdGlvbiB8fCBcInN0YXJ0XCIsIGFyZ3Mud2FpdEZvclJlYWR5LCBhcmdzLndhaXRUaW1lb3V0IHx8IDE1MDAwKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19jbGVhcl9jb2RlX2NhY2hlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJDb2RlQ2FjaGUoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z192YWxpZGF0ZV9zY2VuZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlU2NlbmUoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19yZWNvcmRcIjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5hY3Rpb24gPT09IFwic3RhcnRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nYW1lQ29tbWFuZChcInJlY29yZF9zdGFydFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcHM6IGFyZ3MuZnBzLCBxdWFsaXR5OiBhcmdzLnF1YWxpdHksIGNvZWZmaWNpZW50OiBhcmdzLmNvZWZmaWNpZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9CaXRzUGVyU2Vjb25kOiBhcmdzLnZpZGVvQml0c1BlclNlY29uZCwgZm9ybWF0OiBhcmdzLmZvcm1hdCwgc2F2ZVBhdGg6IGFyZ3Muc2F2ZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5hY3Rpb24gPT09IFwic3RvcFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdhbWVDb21tYW5kKFwicmVjb3JkX3N0b3BcIiwgdW5kZWZpbmVkLCBhcmdzLnRpbWVvdXQgfHwgMzAwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIGRlYnVnX3JlY29yZCBhY3Rpb246ICR7YXJncy5hY3Rpb259LiBFeHBlY3RlZCAnc3RhcnQnIG9yICdzdG9wJy5gKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z193YWl0X2NvbXBpbGVcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53YWl0Q29tcGlsZShhcmdzLnRpbWVvdXQgfHwgMTUwMDAsIGFyZ3MuY2xlYW4gPz8gZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImV4ZWN1dGVfZWRpdG9yX3NjcmlwdFwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmdzLmNvZGUgIT09IFwic3RyaW5nXCIgfHwgYXJncy5jb2RlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKFwiZXhlY3V0ZV9lZGl0b3Jfc2NyaXB0OiAnY29kZScgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiZXhlY3V0ZUVkaXRvclNjcmlwdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBhcmdzLmNvZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dE1zOiBhcmdzLnRpbWVvdXRNcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5Mb2dzOiBhcmdzLnJldHVybkxvZ3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0RWRpdG9ySW5mbygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uOiBFZGl0b3IuQXBwLnZlcnNpb24sXHJcbiAgICAgICAgICAgIHBhdGg6IEVkaXRvci5BcHAucGF0aCxcclxuICAgICAgICAgICAgaG9tZTogRWRpdG9yLkFwcC5ob21lLFxyXG4gICAgICAgICAgICBsYW5ndWFnZTogRWRpdG9yLkkxOG4/LmdldExhbmd1YWdlPy4oKSB8fCBcInVua25vd25cIixcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RNZXNzYWdlcyh0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicXVlcnktaW5mb1wiLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB0YXJnZXQsIGluZm8gfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtub3duTWVzc2FnZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgICAgICAgICAgICAgIFwic2NlbmVcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgIFwicXVlcnktbm9kZS10cmVlXCIsIFwiY3JlYXRlLW5vZGVcIiwgXCJyZW1vdmUtbm9kZVwiLCBcImR1cGxpY2F0ZS1ub2RlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJzZXQtcHJvcGVydHlcIiwgXCJjcmVhdGUtcHJlZmFiXCIsIFwic2F2ZS1zY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1pcy1kaXJ0eVwiLCBcInF1ZXJ5LWNsYXNzZXNcIiwgXCJzb2Z0LXJlbG9hZFwiLCBcInNuYXBzaG90XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJjaGFuZ2UtZ2l6bW8tdG9vbFwiLCBcInF1ZXJ5LWdpem1vLXRvb2wtbmFtZVwiLCBcImZvY3VzLWNhbWVyYS1vbi1ub2Rlc1wiLFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIFwiYXNzZXQtZGJcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgIFwicXVlcnktYXNzZXRzXCIsIFwicXVlcnktYXNzZXQtaW5mb1wiLCBcInF1ZXJ5LWFzc2V0LW1ldGFcIixcclxuICAgICAgICAgICAgICAgICAgICBcInJlZnJlc2gtYXNzZXRcIiwgXCJzYXZlLWFzc2V0XCIsIFwiY3JlYXRlLWFzc2V0XCIsIFwiZGVsZXRlLWFzc2V0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJtb3ZlLWFzc2V0XCIsIFwiY29weS1hc3NldFwiLCBcIm9wZW4tYXNzZXRcIiwgXCJyZWltcG9ydC1hc3NldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwicXVlcnktcGF0aFwiLCBcInF1ZXJ5LXV1aWRcIiwgXCJxdWVyeS11cmxcIiwgXCJxdWVyeS1hc3NldC1kZXBlbmRzXCIsXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IGtub3duTWVzc2FnZXNbdGFyZ2V0XTtcclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB0YXJnZXQsIG1lc3NhZ2VzLCBub3RlOiBcIlN0YXRpYyBsaXN0IChxdWVyeSBmYWlsZWQpXCIgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NyaXB0KG1ldGhvZDogc3RyaW5nLCBhcmdzOiBhbnlbXSk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICBtZXRob2QsXHJcbiAgICAgICAgICAgIGFyZ3MsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkQ29uc29sZShvcHRzOiB7XHJcbiAgICAgICAgYWN0aW9uOiBzdHJpbmc7XHJcbiAgICAgICAgdHlwZXM/OiBzdHJpbmdbXTtcclxuICAgICAgICBzb3VyY2VzPzogc3RyaW5nW107XHJcbiAgICAgICAgY291bnQ6IG51bWJlcjtcclxuICAgICAgICBpbmNsdWRlU3RhY2t0cmFjZTogYm9vbGVhbjtcclxuICAgICAgICBzaW5jZT86IHN0cmluZztcclxuICAgICAgICBzZWFyY2g/OiBzdHJpbmc7XHJcbiAgICB9KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgY29uc3QgYWxsb3dlZFNvdXJjZXMgPSBuZXcgU2V0KFtcImVkaXRvclwiLCBcInNjZW5lXCIsIFwiZ2FtZVwiXSk7XHJcbiAgICAgICAgY29uc3Qgc291cmNlcyA9IChvcHRzLnNvdXJjZXMgJiYgb3B0cy5zb3VyY2VzLmxlbmd0aCA+IDApXHJcbiAgICAgICAgICAgID8gb3B0cy5zb3VyY2VzLmZpbHRlcihzID0+IGFsbG93ZWRTb3VyY2VzLmhhcyhzKSlcclxuICAgICAgICAgICAgOiBbXCJlZGl0b3JcIiwgXCJzY2VuZVwiLCBcImdhbWVcIl07XHJcblxyXG4gICAgICAgIGlmIChvcHRzLmFjdGlvbiA9PT0gXCJjbGVhclwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsZWFyZWQ6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwiZWRpdG9yXCIpKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkgeyBFZGl0b3IuTWVzc2FnZS5zZW5kKFwiY29uc29sZVwiLCBcImNsZWFyXCIpOyBjbGVhcmVkLnB1c2goXCJlZGl0b3JcIik7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwic2NlbmVcIikpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJjbGVhckNvbnNvbGVMb2dzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyZWQucHVzaChcInNjZW5lXCIpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNjZW5lIG5vdCBhdmFpbGFibGUgKi8gfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwiZ2FtZVwiKSkge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJHYW1lTG9ncygpO1xyXG4gICAgICAgICAgICAgICAgY2xlYXJlZC5wdXNoKFwiZ2FtZVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IFwiY2xlYXJcIiwgY2xlYXJlZCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRzLmFjdGlvbiAhPT0gXCJnZXRcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIGFjdGlvbjogJHtvcHRzLmFjdGlvbn0uIEV4cGVjdGVkICdnZXQnIG9yICdjbGVhcicuYCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyaWVzOiBBcnJheTx7IHRpbWVzdGFtcDogc3RyaW5nOyBzb3VyY2U6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfT4gPSBbXTtcclxuXHJcbiAgICAgICAgLy8gc2NlbmUgc291cmNlXHJcbiAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJzY2VuZVwiKSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiZ2V0Q29uc29sZUxvZ3NcIixcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbb3B0cy5jb3VudCAqIDIsIHVuZGVmaW5lZF0sIC8vIHJlcXVlc3QgbW9yZSwgZmlsdGVyIGFmdGVyIG1lcmdlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ/LmxvZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGwgb2YgcmVzdWx0LmxvZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW50cmllcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbC50aW1lc3RhbXAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwic2NlbmVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vcm1hbGl6ZVR5cGUobC5sZXZlbCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBsLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja3RyYWNlOiBsLnN0YWNrdHJhY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNjZW5lIG5vdCBhdmFpbGFibGUgKi8gfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZ2FtZSBzb3VyY2VcclxuICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcImdhbWVcIikpIHtcclxuICAgICAgICAgICAgY29uc3QgZ2FtZVJlc3VsdCA9IGdldEdhbWVMb2dzKG9wdHMuY291bnQgKiAyKTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBsIG9mIGdhbWVSZXN1bHQubG9ncykge1xyXG4gICAgICAgICAgICAgICAgZW50cmllcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IGwudGltZXN0YW1wLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogXCJnYW1lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9ybWFsaXplVHlwZShsLmxldmVsKSxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBsLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2t0cmFjZTogKGwgYXMgYW55KS5zdGFja3RyYWNlLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGVkaXRvciBzb3VyY2VcclxuICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcImVkaXRvclwiKSkge1xyXG4gICAgICAgICAgICBsZXQgdmlhQXBpID0gZmFsc2U7XHJcbiAgICAgICAgICAgIC8vIDEuIFRyeSBuYXRpdmUgY29uc29sZSBBUEkgZmlyc3RcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ3MgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiY29uc29sZVwiLCBcInF1ZXJ5LWxhc3QtbG9nc1wiLCBvcHRzLmNvdW50ICogMik7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsb2dzKSAmJiBsb2dzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB2aWFBcGkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbCBvZiBsb2dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJpZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IGwudGltZXN0YW1wIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogXCJlZGl0b3JcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vcm1hbGl6ZVR5cGUobC50eXBlIHx8IGwubGV2ZWwpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbC5tZXNzYWdlIHx8IFN0cmluZyhsKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrdHJhY2U6IGwuc3RhY2sgfHwgbC5zdGFja3RyYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBub3Qgc3VwcG9ydGVkIGluIHRoaXMgdmVyc2lvbiDihpIgZmFsbGJhY2sgKi8gfVxyXG5cclxuICAgICAgICAgICAgLy8gMi4gRmFsbGJhY2s6IHBhcnNlIHByb2plY3QubG9nIHRhaWwgZm9yIGNvbXBpbGUgZXJyb3IgLyB3YXJuaW5nIHBhdHRlcm5zXHJcbiAgICAgICAgICAgIGlmICghdmlhQXBpKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IGF3YWl0IHJlYWRQcm9qZWN0TG9nVGFpbChvcHRzLmNvdW50ICogMik7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBlIG9mIHBhcnNlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goeyAuLi5lLCBzb3VyY2U6IFwiZWRpdG9yXCIgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHByb2plY3QubG9nIHVuYXZhaWxhYmxlICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQXBwbHkgZmlsdGVyc1xyXG4gICAgICAgIGxldCBmaWx0ZXJlZCA9IGVudHJpZXM7XHJcbiAgICAgICAgaWYgKG9wdHMudHlwZXMgJiYgb3B0cy50eXBlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFsbG93ID0gbmV3IFNldChvcHRzLnR5cGVzLm1hcChub3JtYWxpemVUeXBlKSk7XHJcbiAgICAgICAgICAgIGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKGUgPT4gYWxsb3cuaGFzKGUudHlwZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAob3B0cy5zaW5jZSkge1xyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihlID0+IGUudGltZXN0YW1wID4gb3B0cy5zaW5jZSEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAob3B0cy5zZWFyY2gpIHtcclxuICAgICAgICAgICAgbGV0IHJlOiBSZWdFeHA7XHJcbiAgICAgICAgICAgIHRyeSB7IHJlID0gbmV3IFJlZ0V4cChvcHRzLnNlYXJjaCwgXCJpXCIpOyB9XHJcbiAgICAgICAgICAgIGNhdGNoIHsgcmUgPSBuZXcgUmVnRXhwKGVzY2FwZVJlZ2V4KG9wdHMuc2VhcmNoKSwgXCJpXCIpOyB9XHJcbiAgICAgICAgICAgIGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKGUgPT4gcmUudGVzdChlLm1lc3NhZ2UpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFvcHRzLmluY2x1ZGVTdGFja3RyYWNlKSB7XHJcbiAgICAgICAgICAgIGZpbHRlcmVkID0gZmlsdGVyZWQubWFwKCh7IHN0YWNrdHJhY2UsIC4uLnJlc3QgfSkgPT4gcmVzdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTb3J0IGJ5IHRpbWVzdGFtcCBhc2NlbmRpbmcsIHRha2UgbGFzdCBgY291bnRgXHJcbiAgICAgICAgZmlsdGVyZWQuc29ydCgoYSwgYikgPT4gYS50aW1lc3RhbXAubG9jYWxlQ29tcGFyZShiLnRpbWVzdGFtcCkpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbHRlcmVkLnNsaWNlKC1vcHRzLmNvdW50KTtcclxuXHJcbiAgICAgICAgY29uc3QgY291bnRzID0ge1xyXG4gICAgICAgICAgICBlZGl0b3I6IGVudHJpZXMuZmlsdGVyKGUgPT4gZS5zb3VyY2UgPT09IFwiZWRpdG9yXCIpLmxlbmd0aCxcclxuICAgICAgICAgICAgc2NlbmU6IGVudHJpZXMuZmlsdGVyKGUgPT4gZS5zb3VyY2UgPT09IFwic2NlbmVcIikubGVuZ3RoLFxyXG4gICAgICAgICAgICBnYW1lOiBlbnRyaWVzLmZpbHRlcihlID0+IGUuc291cmNlID09PSBcImdhbWVcIikubGVuZ3RoLFxyXG4gICAgICAgICAgICB0b3RhbDogcmVzdWx0Lmxlbmd0aCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IFwiZ2V0XCIsIGVudHJpZXM6IHJlc3VsdCwgY291bnRzIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBkZWJ1Z19sb2dzIGRpc3BhdGNoZXIgKHYyLjAuMCkuICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUxvZ3NBY3Rpb24oYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uIHx8IFwiZ2V0XCI7XHJcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSBcImdldFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvamVjdExvZ3MoYXJncy5saW5lcyB8fCAxMDApO1xyXG4gICAgICAgICAgICBjYXNlIFwic2VhcmNoXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MucGF0dGVybikgcmV0dXJuIGVycihcImRlYnVnX2xvZ3Moc2VhcmNoKTogJ3BhdHRlcm4nIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VhcmNoUHJvamVjdExvZ3MoYXJncy5wYXR0ZXJuKTtcclxuICAgICAgICAgICAgY2FzZSBcImluZm9cIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldExvZ0ZpbGVJbmZvKCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIGRlYnVnX2xvZ3MgYWN0aW9uOiAke2FjdGlvbn0uIEV4cGVjdGVkIGdldCAvIHNlYXJjaCAvIGluZm8uYCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBkZWJ1Z19leHRlbnNpb24gZGlzcGF0Y2hlciAodjIuMC4wKS4gKi9cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlRXh0ZW5zaW9uQWN0aW9uKGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzLmFjdGlvbiB8fCBcImxpc3RcIjtcclxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xyXG4gICAgICAgICAgICBjYXNlIFwibGlzdFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlzdEV4dGVuc2lvbnMoKTtcclxuICAgICAgICAgICAgY2FzZSBcImluZm9cIjpcclxuICAgICAgICAgICAgICAgIGlmICghYXJncy5uYW1lKSByZXR1cm4gZXJyKFwiZGVidWdfZXh0ZW5zaW9uKGluZm8pOiAnbmFtZScgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRlbnNpb25JbmZvKGFyZ3MubmFtZSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJyZWxvYWRcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbG9hZEV4dGVuc2lvbigpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBkZWJ1Z19leHRlbnNpb24gYWN0aW9uOiAke2FjdGlvbn0uIEV4cGVjdGVkIGxpc3QgLyBpbmZvIC8gcmVsb2FkLmApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RFeHRlbnNpb25zKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicXVlcnktYWxsXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleHRlbnNpb25zOiBsaXN0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleHRlbnNpb25zOiBbXSwgbm90ZTogXCJFeHRlbnNpb24gcXVlcnkgbm90IHN1cHBvcnRlZFwiIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldEV4dGVuc2lvbkluZm8obmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJleHRlbnNpb25cIiwgXCJxdWVyeS1pbmZvXCIsIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBuYW1lLCBpbmZvIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldFByb2plY3RMb2dzKGxpbmVzOiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbG9nczogW10sIG5vdGU6IFwiTG9nIGZpbGUgbm90IGZvdW5kXCIgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobG9nUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYWxsTGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWNlbnQgPSBhbGxMaW5lcy5zbGljZSgtbGluZXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBsaW5lczogcmVjZW50Lmxlbmd0aCwgbG9nczogcmVjZW50IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaFByb2plY3RMb2dzKHBhdHRlcm46IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ1BhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QudG1wRGlyLCBcImxvZ3NcIiwgXCJwcm9qZWN0LmxvZ1wiKTtcclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBtYXRjaGVzOiBbXSB9KTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybiwgXCJnaVwiKTtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIikuZmlsdGVyKChsaW5lOiBzdHJpbmcpID0+IHJlZ2V4LnRlc3QobGluZSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBwYXR0ZXJuLCBjb3VudDogbWF0Y2hlcy5sZW5ndGgsIG1hdGNoZXM6IG1hdGNoZXMuc2xpY2UoMCwgMTAwKSB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dGaWxlSW5mbygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZXhpc3RzOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleGlzdHM6IHRydWUsIHBhdGg6IGxvZ1BhdGgsIHNpemU6IHN0YXQuc2l6ZSwgbW9kaWZpZWQ6IHN0YXQubXRpbWUgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUHJldmlldyhhY3Rpb246IHN0cmluZywgd2FpdEZvclJlYWR5PzogYm9vbGVhbiwgd2FpdFRpbWVvdXQ/OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcInN0b3BcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdG9wUHJldmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnN0YXJ0UHJldmlldygpO1xyXG4gICAgICAgIGlmICh3YWl0Rm9yUmVhZHkpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0RGF0YSA9IEpTT04ucGFyc2UocmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHREYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWR5ID0gYXdhaXQgdGhpcy53YWl0Rm9yR2FtZVJlYWR5KHdhaXRUaW1lb3V0IHx8IDE1MDAwKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdERhdGEuZ2FtZVJlYWR5ID0gcmVhZHk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlYWR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0RGF0YS5ub3RlID0gKHJlc3VsdERhdGEubm90ZSB8fCBcIlwiKSArIFwiIEdhbWVEZWJ1Z0NsaWVudCBkaWQgbm90IGNvbm5lY3Qgd2l0aGluIHRpbWVvdXQuXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2socmVzdWx0RGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHdhaXRGb3JHYW1lUmVhZHkodGltZW91dDogbnVtYmVyKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGdhbWUgaGFzIHNlbnQgYW55IGxvZyBvciBjb21tYW5kIHJlc3VsdCByZWNlbnRseVxyXG4gICAgICAgICAgICBjb25zdCBnYW1lUmVzdWx0ID0gZ2V0R2FtZUxvZ3MoMSk7XHJcbiAgICAgICAgICAgIGlmIChnYW1lUmVzdWx0LnRvdGFsID4gMCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc3RhcnRQcmV2aWV3KCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTWFpblNjZW5lT3BlbigpO1xyXG5cclxuICAgICAgICAgICAgLy8g44OE44O844Or44OQ44O844GuVnVl44Kk44Oz44K544K/44Oz44K557WM55Sx44GncGxheSgp44KS5ZG844G277yIVUnnirbmhYvjgoLlkIzmnJ/jgZXjgozjgovvvIlcclxuICAgICAgICAgICAgY29uc3QgcGxheWVkID0gYXdhaXQgdGhpcy5leGVjdXRlT25Ub29sYmFyKFwic3RhcnRcIik7XHJcbiAgICAgICAgICAgIGlmIChwbGF5ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogXCJzdGFydFwiLCBtb2RlOiBcImVkaXRvclwiIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDjg5Xjgqnjg7zjg6vjg5Djg4Pjgq86IOebtOaOpUFQSVxyXG4gICAgICAgICAgICBjb25zdCBpc1BsYXlpbmcgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJlZGl0b3ItcHJldmlldy1zZXQtcGxheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaXNQbGF5aW5nLCBhY3Rpb246IFwic3RhcnRcIiwgbW9kZTogXCJlZGl0b3JcIiwgbm90ZTogXCJkaXJlY3QgQVBJICh0b29sYmFyIFVJIG1heSBub3Qgc3luYylcIiB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZWxlY3Ryb24uc2hlbGwub3BlbkV4dGVybmFsKFwiaHR0cDovLzEyNy4wLjAuMTo3NDU2XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcInN0YXJ0XCIsIG1vZGU6IFwiYnJvd3NlclwiIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlMjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGUyLm1lc3NhZ2UgfHwgU3RyaW5nKGUyKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzdG9wUHJldmlldygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyDjg4Tjg7zjg6vjg5Djg7zntYznlLHjgaflgZzmraLvvIhVSeWQjOacn++8iVxyXG4gICAgICAgICAgICBjb25zdCBzdG9wcGVkID0gYXdhaXQgdGhpcy5leGVjdXRlT25Ub29sYmFyKFwic3RvcFwiKTtcclxuICAgICAgICAgICAgaWYgKCFzdG9wcGVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDjg5Xjgqnjg7zjg6vjg5Djg4Pjgq86IOebtOaOpUFQSVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiZWRpdG9yLXByZXZpZXctc2V0LXBsYXlcIiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHNjZW5lOnByZXZpZXctc3RvcCDjg5bjg63jg7zjg4njgq3jg6Pjgrnjg4jjgafjg4Tjg7zjg6vjg5Djg7xVSeeKtuaFi+OCkuODquOCu+ODg+ODiFxyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5icm9hZGNhc3QoXCJzY2VuZTpwcmV2aWV3LXN0b3BcIik7XHJcbiAgICAgICAgICAgIC8vIOOCt+ODvOODs+ODk+ODpeODvOOBq+aIu+OBmVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgNTAwKSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTWFpblNjZW5lT3BlbigpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IFwic3RvcFwiIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVPblRvb2xiYXIoYWN0aW9uOiBcInN0YXJ0XCIgfCBcInN0b3BcIik6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBhbGxDb250ZW50cyA9IGVsZWN0cm9uLndlYkNvbnRlbnRzLmdldEFsbFdlYkNvbnRlbnRzKCk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qgd2Mgb2YgYWxsQ29udGVudHMpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheSgp44KSYXdhaXTjgZfjgarjgYQg4oCUIOODl+ODrOODk+ODpeODvOWujOS6huOCkuW+heOBpOOBqOOCv+OCpOODoOOCouOCpuODiOOBmeOCi+OBn+OCgVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09IFwic3RhcnRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3Yy5leGVjdXRlSmF2YVNjcmlwdChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAoZnVuY3Rpb24oKSB7IGlmICh3aW5kb3cueHh4ICYmIHdpbmRvdy54eHgucGxheSAmJiAhd2luZG93Lnh4eC5nYW1lVmlldy5pc1BsYXkpIHsgd2luZG93Lnh4eC5wbGF5KCk7IHJldHVybiB0cnVlOyB9IHJldHVybiBmYWxzZTsgfSkoKWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2MuZXhlY3V0ZUphdmFTY3JpcHQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgKGZ1bmN0aW9uKCkgeyBpZiAod2luZG93Lnh4eCAmJiB3aW5kb3cueHh4LmdhbWVWaWV3LmlzUGxheSkgeyB3aW5kb3cueHh4LnBsYXkoKTsgcmV0dXJuIHRydWU7IH0gcmV0dXJuIGZhbHNlOyB9KSgpYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogbm90IHRoZSB0b29sYmFyIHdlYkNvbnRlbnRzICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiBlbGVjdHJvbiBBUEkgbm90IGF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZW5zdXJlTWFpblNjZW5lT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgbWV0aG9kOiBcImdldFNjZW5lSGllcmFyY2h5XCIsXHJcbiAgICAgICAgICAgIGFyZ3M6IFtmYWxzZV0sXHJcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgIGlmICghaGllcmFyY2h5Py5zY2VuZU5hbWUgfHwgaGllcmFyY2h5LnNjZW5lTmFtZSA9PT0gXCJzY2VuZS0yZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIOODl+ODreOCuOOCp+OCr+ODiOioreWumuOBrlN0YXJ0IFNjZW5l44KS5Y+C54WnXHJcbiAgICAgICAgICAgIGxldCBzY2VuZVV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgc2NlbmVVdWlkID0gYXdhaXQgKEVkaXRvciBhcyBhbnkpLlByb2ZpbGUuZ2V0Q29uZmlnKFwicHJldmlld1wiLCBcImdlbmVyYWwuc3RhcnRfc2NlbmVcIiwgXCJsb2NhbFwiKTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XHJcblxyXG4gICAgICAgICAgICAvLyBTdGFydCBTY2VuZeOBjOacquioreWumiBvciBcImN1cnJlbnRfc2NlbmVcIiDjga7loLTlkIjjgIHmnIDliJ3jga7jgrfjg7zjg7PjgpLkvb/jgYZcclxuICAgICAgICAgICAgaWYgKCFzY2VuZVV1aWQgfHwgc2NlbmVVdWlkID09PSBcImN1cnJlbnRfc2NlbmVcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXRzXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBjY1R5cGU6IFwiY2MuU2NlbmVBc3NldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IFwiZGI6Ly9hc3NldHMvKiovKlwiLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2VuZXMpICYmIHNjZW5lcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NlbmVVdWlkID0gc2NlbmVzWzBdLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzY2VuZVV1aWQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGRlYnVnX3ByZXZpZXcg5YaF6YOo44Gu6Ieq5YuV6YG356e744GvIHByZXZpZXcg44KS5YSq5YWI44GX44GmIGZvcmNlPXRydWVcclxuICAgICAgICAgICAgICAgIC8vIO+8iGRpYWxvZyDlh7rjgovjgojjgoogcHJldmlldyDplovlp4vjgpLlhKrlhYjjgZnjgovpgYvnlKjvvIlcclxuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwib3Blbi1zY2VuZVwiLCBzY2VuZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDE1MDApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyQ29kZUNhY2hlKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBtZW51ID0gZWxlY3Ryb24uTWVudS5nZXRBcHBsaWNhdGlvbk1lbnUoKTtcclxuICAgICAgICAgICAgaWYgKCFtZW51KSByZXR1cm4gZXJyKFwiQXBwbGljYXRpb24gbWVudSBub3QgZm91bmRcIik7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmaW5kTWVudUl0ZW0gPSAoaXRlbXM6IGFueVtdLCBwYXRoOiBzdHJpbmdbXSk6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5sYWJlbCA9PT0gcGF0aFswXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHJldHVybiBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5zdWJtZW51Py5pdGVtcykgcmV0dXJuIGZpbmRNZW51SXRlbShpdGVtLnN1Ym1lbnUuaXRlbXMsIHBhdGguc2xpY2UoMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY2FjaGVJdGVtID0gZmluZE1lbnVJdGVtKG1lbnUuaXRlbXMsIFtcIkRldmVsb3BlclwiLCBcIkNhY2hlXCIsIFwiQ2xlYXIgY29kZSBjYWNoZVwiXSk7XHJcbiAgICAgICAgICAgIGlmICghY2FjaGVJdGVtKSByZXR1cm4gZXJyKFwiTWVudSBpdGVtICdEZXZlbG9wZXIgPiBDYWNoZSA+IENsZWFyIGNvZGUgY2FjaGUnIG5vdCBmb3VuZFwiKTtcclxuXHJcbiAgICAgICAgICAgIGNhY2hlSXRlbS5jbGljaygpO1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwMCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIkNvZGUgY2FjaGUgY2xlYXJlZCB2aWEgbWVudVwiIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdhbWVDb21tYW5kKHR5cGU6IHN0cmluZywgYXJnczogYW55LCB0aW1lb3V0OiBudW1iZXIsIG1heFdpZHRoPzogbnVtYmVyLCBpbWFnZUZvcm1hdD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGNtZElkID0gcXVldWVHYW1lQ29tbWFuZCh0eXBlLCBhcmdzKTtcclxuXHJcbiAgICAgICAgLy8gUG9sbCBmb3IgcmVzdWx0XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldENvbW1hbmRSZXN1bHQoKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuaWQgPT09IGNtZElkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiBzY3JlZW5zaG90LCBzYXZlIHRvIGZpbGUgYW5kIHJldHVybiBwYXRoXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJzY3JlZW5zaG90XCIgJiYgcmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGE/LmRhdGFVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QudG1wRGlyLCBcInNjcmVlbnNob3RzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkgZnMubWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKC9bOi5dL2csIFwiLVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0ID0gcmVzdWx0LmRhdGEuZGF0YVVybC5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBuZ0J1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NCwgXCJiYXNlNjRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVmZmVjdGl2ZU1heFdpZHRoID0gbWF4V2lkdGggIT09IHVuZGVmaW5lZCA/IG1heFdpZHRoIDogOTYwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ0ltYWdlID0gZWxlY3Ryb24ubmF0aXZlSW1hZ2UuY3JlYXRlRnJvbUJ1ZmZlcihwbmdCdWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFNpemUgPSBvcmlnSW1hZ2UuZ2V0U2l6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ1ZmZlciwgd2lkdGgsIGhlaWdodCwgZm9ybWF0IH0gPSBhd2FpdCBwcm9jZXNzSW1hZ2UocG5nQnVmZmVyLCBlZmZlY3RpdmVNYXhXaWR0aCwgaW1hZ2VGb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBmb3JtYXQgPT09IFwid2VicFwiID8gXCJ3ZWJwXCIgOiBmb3JtYXQgPT09IFwianBlZ1wiID8gXCJqcGdcIiA6IFwicG5nXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGRpciwgYGdhbWVfJHt0aW1lc3RhbXB9LiR7ZXh0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgcGF0aDogZmlsZVBhdGgsIHNpemU6IGJ1ZmZlci5sZW5ndGgsIGZvcm1hdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsU2l6ZTogYCR7b3JpZ2luYWxTaXplLndpZHRofXgke29yaWdpbmFsU2l6ZS5oZWlnaHR9YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVkU2l6ZTogYCR7d2lkdGh9eCR7aGVpZ2h0fWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIlNjcmVlbnNob3QgY2FwdHVyZWQgYnV0IGZpbGUgc2F2ZSBmYWlsZWRcIiwgZXJyb3I6IGUubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlcnIoYEdhbWUgZGlkIG5vdCByZXNwb25kIHdpdGhpbiAke3RpbWVvdXR9bXMuIElzIEdhbWVEZWJ1Z0NsaWVudCBydW5uaW5nIGluIHRoZSBwcmV2aWV3P2ApO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdGFrZVNjcmVlbnNob3Qoc2F2ZVBhdGg/OiBzdHJpbmcsIG1heFdpZHRoPzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGFrZUVkaXRvclNjcmVlbnNob3Qoc2F2ZVBhdGgsIG1heFdpZHRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVsb2FkRXh0ZW5zaW9uKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIC8vIFNjaGVkdWxlIHJlbG9hZCBhZnRlciByZXNwb25zZSBpcyBzZW50XHJcbiAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicmVsb2FkXCIsIFwiY29jb3MtY3JlYXRvci1tY3BcIik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltNQ1BdIEV4dGVuc2lvbiByZWxvYWQgZmFpbGVkOlwiLCBlLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgNTAwKTtcclxuICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIkV4dGVuc2lvbiByZWxvYWQgc2NoZWR1bGVkLiBNQ1Agc2VydmVyIHdpbGwgcmVzdGFydCBpbiB+MXMuIE5PVEU6IEFkZGluZyBuZXcgdG9vbCBkZWZpbml0aW9ucyBvciBtb2RpZnlpbmcgc2NlbmUudHMgcmVxdWlyZXMgYSBmdWxsIENvY29zQ3JlYXRvciByZXN0YXJ0IChyZWxvYWQgaXMgbm90IHN1ZmZpY2llbnQpLlwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hTY3JlZW5zaG90KHBhZ2VzOiBzdHJpbmdbXSwgZGVsYXk6IG51bWJlciwgbWF4V2lkdGg/OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHRpbWVvdXQgPSAxMDAwMDtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIHBhZ2VzKSB7XHJcbiAgICAgICAgICAgIC8vIE5hdmlnYXRlXHJcbiAgICAgICAgICAgIGNvbnN0IG5hdlJlc3VsdCA9IGF3YWl0IHRoaXMuZ2FtZUNvbW1hbmQoXCJuYXZpZ2F0ZVwiLCB7IHBhZ2UgfSwgdGltZW91dCwgbWF4V2lkdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBuYXZEYXRhID0gSlNPTi5wYXJzZShuYXZSZXN1bHQuY29udGVudFswXS50ZXh0KTtcclxuICAgICAgICAgICAgaWYgKCFuYXZEYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHBhZ2UsIHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJuYXZpZ2F0ZSBmYWlsZWRcIiB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBwYWdlIHRvIHJlbmRlclxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgZGVsYXkpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNjcmVlbnNob3RcclxuICAgICAgICAgICAgY29uc3Qgc3NSZXN1bHQgPSBhd2FpdCB0aGlzLmdhbWVDb21tYW5kKFwic2NyZWVuc2hvdFwiLCB7fSwgdGltZW91dCwgbWF4V2lkdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBzc0RhdGEgPSBKU09OLnBhcnNlKHNzUmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBwYWdlLFxyXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3NEYXRhLnN1Y2Nlc3MgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBzc0RhdGEucGF0aCxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBzc0RhdGEuc3VjY2VzcyA/IHVuZGVmaW5lZCA6IChzc0RhdGEuZXJyb3IgfHwgc3NEYXRhLm1lc3NhZ2UpLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN1Y2NlZWRlZCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdWNjZXNzKS5sZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgdG90YWw6IHBhZ2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgc3VjY2VlZGVkLFxyXG4gICAgICAgICAgICBmYWlsZWQ6IHBhZ2VzLmxlbmd0aCAtIHN1Y2NlZWRlZCxcclxuICAgICAgICAgICAgcmVzdWx0cyxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGUtdHJlZVwiKTtcclxuICAgICAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBjb25zdCBjaGVja05vZGVzID0gKG5vZGVzOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlcykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlLm5hbWUpIGlzc3Vlcy5wdXNoKGBOb2RlICR7bm9kZS51dWlkfSBoYXMgbm8gbmFtZWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSBjaGVja05vZGVzKG5vZGUuY2hpbGRyZW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlKSkgY2hlY2tOb2Rlcyh0cmVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaXNzdWVDb3VudDogaXNzdWVzLmxlbmd0aCwgaXNzdWVzIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFR5cGVTY3JpcHQg44Kz44Oz44OR44Kk44Or5a6M5LqG44KS5b6F44Gk44CCXHJcbiAgICAgKiBwYWNrZXItZHJpdmVyIOOBriBkZWJ1Zy5sb2cg44GrIFwiVGFyZ2V0KGVkaXRvcikgZW5kc1wiIOOBjOePvuOCjOOCi+OBruOCkuebo+imluOBmeOCi+OAglxyXG4gICAgICog5pei44Gr44Kz44Oz44OR44Kk44Or5riI44G/77yI55u06L+R5pWw56eS5Lul5YaF44Gr5a6M5LqG44Ot44Kw44GC44KK77yJ44Gq44KJ5Y2z5bqn44Gr6L+U44GZ44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgd2FpdENvbXBpbGUodGltZW91dDogbnVtYmVyLCBjbGVhbjogYm9vbGVhbik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ1BhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgXCJ0ZW1wXCIsIFwicHJvZ3JhbW1pbmdcIiwgXCJwYWNrZXItZHJpdmVyXCIsIFwibG9nc1wiLCBcImRlYnVnLmxvZ1wiKTtcclxuICAgICAgICAgICAgY29uc3QgY2h1bmtzRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIFwidGVtcFwiLCBcInByb2dyYW1taW5nXCIsIFwicGFja2VyLWRyaXZlclwiLCBcInRhcmdldHNcIiwgXCJlZGl0b3JcIiwgXCJjaHVua3NcIik7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYENvbXBpbGUgbG9nIG5vdCBmb3VuZDogJHtsb2dQYXRofWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBNQVJLRVIgPSBcIlRhcmdldChlZGl0b3IpIGVuZHNcIjtcclxuXHJcbiAgICAgICAgICAgIC8vIGNsZWFuIOODouODvOODiTog44Kz44O844OJ44Kt44Oj44OD44K344Ol44Kv44Oq44KiICsgc29mdC1yZWxvYWQg44Gn5YaN44Kz44Oz44OR44Kk44Or44KS5by35Yi2XHJcbiAgICAgICAgICAgIGlmIChjbGVhbikge1xyXG4gICAgICAgICAgICAgICAgLy8gRGV2ZWxvcGVyID4gQ2FjaGUgPiBDbGVhciBjb2RlIGNhY2hlIOOCkuOCr+ODquODg+OCr1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW51ID0gZWxlY3Ryb24uTWVudS5nZXRBcHBsaWNhdGlvbk1lbnUoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5kTWVudUl0ZW0gPSAoaXRlbXM6IGFueVtdLCBsYWJlbHM6IHN0cmluZ1tdKTogYW55ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5sYWJlbCA9PT0gbGFiZWxzWzBdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhYmVscy5sZW5ndGggPT09IDEpIHJldHVybiBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnN1Ym1lbnU/Lml0ZW1zKSByZXR1cm4gZmluZE1lbnVJdGVtKGl0ZW0uc3VibWVudS5pdGVtcywgbGFiZWxzLnNsaWNlKDEpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlSXRlbSA9IG1lbnUgPyBmaW5kTWVudUl0ZW0obWVudS5pdGVtcywgW1wiRGV2ZWxvcGVyXCIsIFwiQ2FjaGVcIiwgXCJDbGVhciBjb2RlIGNhY2hlXCJdKSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhY2hlSXRlbSkgY2FjaGVJdGVtLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChfZSkgeyAvKiBpZ25vcmUgKi8gfVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpO1xyXG4gICAgICAgICAgICAgICAgLy8gc29mdC1yZWxvYWQg44Gn44K344O844Oz44KS5YaN6Kqt44G/6L6844G/IOKGkiDjgrPjg7Pjg5HjgqTjg6vjg4jjg6rjgqzjg7xcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNvZnQtcmVsb2FkXCIpLmNhdGNoKCgpID0+IHt9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gcmVmcmVzaC1hc3NldCDjgafjg5XjgqHjgqTjg6vlpInmm7TjgpIgQ0Mg44Gr6YCa55+l44GX44Gm44Kz44Oz44OR44Kk44Or44KS44OI44Oq44Ks44O8XHJcbiAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInJlZnJlc2gtYXNzZXRcIiwgXCJkYjovL2Fzc2V0c1wiKS5jYXRjaCgoKSA9PiB7fSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU2l6ZSA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpLnNpemU7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IFBPTExfSU5URVJWQUwgPSAyMDA7XHJcbiAgICAgICAgICAgIGNvbnN0IERFVEVDVF9HUkFDRV9NUyA9IDIwMDA7IC8vIENDIOOBjOODleOCoeOCpOODq+WkieabtOOCkuaknOefpeOBmeOCi+OBvuOBp+OBrueMtuS6iFxyXG5cclxuICAgICAgICAgICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgUE9MTF9JTlRFUlZBTCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTaXplID0gZnMuc3RhdFN5bmMobG9nUGF0aCkuc2l6ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg63jgrDjgYzmiJDplbfjgZfjgabjgYTjgarjgYRcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U2l6ZSA8PSBpbml0aWFsU2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsZWFuIOODouODvOODieOBp+OBr+W/heOBmuOCs+ODs+ODkeOCpOODq+OBjOi1sOOCi+OBruOBp+eMtuS6iOWIpOWumuOBl+OBquOBhFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGVhbikgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g54y25LqI5pyf6ZaT5YaF44Gv44G+44Gg5b6F44GkIChDQyDjga7mpJznn6XjgYzpgYXjgYTlj6/og73mgKcpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCBERVRFQ1RfR1JBQ0VfTVMpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeMtuS6iOacn+mWk+OCkumBjuOBjuOBpuOCguODreOCsOOBjOaIkOmVt+OBl+OBquOBhCDihpIg44Kz44Oz44OR44Kk44Or5LiN6KaBXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IHRydWUsIHdhaXRlZE1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLCBub3RlOiBcIk5vIGNvbXBpbGF0aW9uIHRyaWdnZXJlZCAobm8gY2hhbmdlcyBkZXRlY3RlZClcIiB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg63jgrDjgYzmiJDplbfjgZfjgZ8g4oaSIOaWsOOBl+OBhOmDqOWIhuOBq+ODnuODvOOCq+ODvOOBjOOBguOCi+OBi+eiuuiqjVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmQgPSBmcy5vcGVuU3luYyhsb2dQYXRoLCBcInJcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdCeXRlcyA9IGN1cnJlbnRTaXplIC0gaW5pdGlhbFNpemU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuYWxsb2MobmV3Qnl0ZXMpO1xyXG4gICAgICAgICAgICAgICAgZnMucmVhZFN5bmMoZmQsIGJ1ZmZlciwgMCwgbmV3Qnl0ZXMsIGluaXRpYWxTaXplKTtcclxuICAgICAgICAgICAgICAgIGZzLmNsb3NlU3luYyhmZCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobmV3Q29udGVudC5pbmNsdWRlcyhNQVJLRVIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IHRydWUsIHdhaXRlZE1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBjb21waWxlZDogZmFsc2UsIHRpbWVvdXQ6IHRydWUsIHdhaXRlZE1zOiB0aW1lb3V0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIE5vcm1hbGl6ZSB2YXJpb3VzIGxldmVsIC8gdHlwZSBzcGVsbGluZ3MgdG8gYSBjYW5vbmljYWwgXCJsb2dcInxcImluZm9cInxcIndhcm5cInxcImVycm9yXCIgc3RyaW5nLiAqL1xyXG5mdW5jdGlvbiBub3JtYWxpemVUeXBlKHJhdzogYW55KTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHMgPSBTdHJpbmcocmF3ID8/IFwiXCIpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAocyA9PT0gXCJ3YXJuaW5nXCIpIHJldHVybiBcIndhcm5cIjtcclxuICAgIGlmIChzID09PSBcImVyclwiKSByZXR1cm4gXCJlcnJvclwiO1xyXG4gICAgaWYgKHMgPT09IFwibG9nXCIgfHwgcyA9PT0gXCJpbmZvXCIgfHwgcyA9PT0gXCJ3YXJuXCIgfHwgcyA9PT0gXCJlcnJvclwiKSByZXR1cm4gcztcclxuICAgIHJldHVybiBcImxvZ1wiO1xyXG59XHJcblxyXG4vKiogRXNjYXBlIGEgc3RyaW5nIHNvIGl0IGNhbiBiZSBlbWJlZGRlZCBpbnRvIGEgUmVnRXhwIGxpdGVyYWxseS4gKi9cclxuZnVuY3Rpb24gZXNjYXBlUmVnZXgoczogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBzLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIHByb2plY3QubG9nIOOBruacq+WwvuOCkuiqreOBv+OAgUNvY29zIENyZWF0b3Ig44GM5pu444GN5Ye644GZIGNvbXBpbGUgZXJyb3IgLyB3YXJuaW5nIC9cclxuICogZ2VuZXJpYyBtZXNzYWdlIOOCkuani+mAoOWMluOCqOODs+ODiOODquOBq+WkieaPm+OBmeOCi+OAglxyXG4gKlxyXG4gKiBDb2NvcyBDcmVhdG9yIOOBjCBwcm9qZWN0LmxvZyDjgavmm7jjgY3lh7rjgZnku6PooajnmoTjgarjg5Hjgr/jg7zjg7M6XHJcbiAqICAgWzExOjIyOjMzXSBbaW5mb10gbWVzc2FnZS4uLlxyXG4gKiAgIFsxMToyMjozM10gW3dhcm5dIG1lc3NhZ2UuLi5cclxuICogICBbMTE6MjI6MzNdIFtlcnJvcl0gbWVzc2FnZS4uLiAoVFMyMzA0OiBDYW5ub3QgZmluZCBuYW1lICdGb28nIOOBquOBqSlcclxuICogICBbU2NlbmVdIFtlcnJvcl0gZmlsZTogYXNzZXRzLy4uLi9Gb28udHMoMTIsNSlcclxuICpcclxuICogRWRpdG9yIOODkOODvOOCuOODp+ODs+OChCBsb2NhbGUg44Gr44KI44KK5pu45byP44Gv5aSJ44KP44KL5Y+v6IO95oCn44GM44GC44KL44Gu44Gn44CB6KGM6aCt44GuXHJcbiAqIGBbdHNdIFtsZXZlbF1gIOODkeOCv+ODvOODs+OBqOOAgWBlcnJvciBUU1xcZCs6YCDjga4gVHlwZVNjcmlwdCDjgqjjg6njg7zjgIFcclxuICogYFtsZXZlbF1gIOWNmOeLrOihjOOBquOBqeikh+aVsOODkeOCv+ODvOODs+OCkuioseWuueOBmeOCi+OAglxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcmVhZFByb2plY3RMb2dUYWlsKG1heEVudHJpZXM6IG51bWJlcik6IFByb21pc2U8QXJyYXk8eyB0aW1lc3RhbXA6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfT4+IHtcclxuICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgY29uc3QgbG9nUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC50bXBEaXIsIFwibG9nc1wiLCBcInByb2plY3QubG9nXCIpO1xyXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSByZXR1cm4gW107XHJcblxyXG4gICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpO1xyXG4gICAgLy8g5pyr5bC+IDI1NktCIOOCkuiqreOCgO+8iGNvbXBpbGUgZXJyb3Ig44Gv5aSn44GN44GP44Gq44GE44Gu44Gn5Y2B5YiG77yJXHJcbiAgICBjb25zdCBSRUFEX0JZVEVTID0gMjU2ICogMTAyNDtcclxuICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoMCwgc3RhdC5zaXplIC0gUkVBRF9CWVRFUyk7XHJcbiAgICBjb25zdCBmZCA9IGZzLm9wZW5TeW5jKGxvZ1BhdGgsIFwiclwiKTtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhzdGF0LnNpemUgLSBzdGFydCk7XHJcbiAgICBmcy5yZWFkU3luYyhmZCwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzdGFydCk7XHJcbiAgICBmcy5jbG9zZVN5bmMoZmQpO1xyXG4gICAgY29uc3QgdGV4dCA9IGJ1ZmZlci50b1N0cmluZyhcInV0ZjhcIik7XHJcblxyXG4gICAgY29uc3QgbGluZXMgPSB0ZXh0LnNwbGl0KC9cXHI/XFxuLyk7XHJcbiAgICAvLyDpg6jliIbooYzvvIjlhYjpoK3ooYzjga/liIfjgozjgabjgYTjgovlj6/og73mgKfvvInjgpLmjajjgabjgotcclxuICAgIGlmIChzdGFydCA+IDAgJiYgbGluZXMubGVuZ3RoID4gMCkgbGluZXMuc2hpZnQoKTtcclxuXHJcbiAgICBjb25zdCBlbnRyaWVzOiBBcnJheTx7IHRpbWVzdGFtcDogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZzsgc3RhY2t0cmFjZT86IHN0cmluZyB9PiA9IFtdO1xyXG4gICAgY29uc3QgbGluZVJlID0gL15cXFsoXFxkezJ9OlxcZHsyfTpcXGR7Mn0oPzpcXC5cXGQrKT8pXFxdXFxzKig/OlxcWyhbXlxcXV0rKVxcXSk/XFxzKlxcWz8obG9nfGluZm98d2Fybnx3YXJuaW5nfGVycm9yKVxcXT9cXHMqKC4qKSQvaTtcclxuICAgIGNvbnN0IHRzRXJyUmUgPSAvXFxiZXJyb3JcXHMrVFNcXGQrOlxccyovaTtcclxuICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IGlzb0RhdGUgPSB0b2RheS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxuXHJcbiAgICBsZXQgcGVuZGluZzogeyB0aW1lc3RhbXA6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfSB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIGZvciAoY29uc3QgcmF3IG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3QgbGluZSA9IHJhdy5yZXBsYWNlKC9cdTAwMWJcXFtbMC05O10qbS9nLCBcIlwiKTsgLy8gc3RyaXAgQU5TSSBjb2xvciBjb2Rlc1xyXG4gICAgICAgIGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBjb25zdCBtID0gbGluZS5tYXRjaChsaW5lUmUpO1xyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSBlbnRyaWVzLnB1c2gocGVuZGluZyk7XHJcbiAgICAgICAgICAgIGNvbnN0IFssIHRpbWUsIHRhZywgbGV2ZWwsIGJvZHldID0gbTtcclxuICAgICAgICAgICAgY29uc3QgdHMgPSBgJHtpc29EYXRlfVQke3RpbWV9JHt0aW1lLmxlbmd0aCA9PT0gOCA/IFwiLjAwMFwiIDogXCJcIn1aYDtcclxuICAgICAgICAgICAgcGVuZGluZyA9IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdHMsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGxldmVsKSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHRhZyA/IGBbJHt0YWd9XSAke2JvZHl9YCA6IGJvZHksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIGlmICh0c0VyclJlLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgICAgLy8gVHlwZVNjcmlwdCDjgqjjg6njg7zljZjni6zooYzvvIjjgr/jgqTjg6Djgrnjgr/jg7Pjg5fjgarjgZfvvIlcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIGVudHJpZXMucHVzaChwZW5kaW5nKTtcclxuICAgICAgICAgICAgcGVuZGluZyA9IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbGluZS50cmltKCksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIGlmIChwZW5kaW5nKSB7XHJcbiAgICAgICAgICAgIC8vIOe2mee2muihjCDigJQgc3RhY2t0cmFjZSDjgavov73liqBcclxuICAgICAgICAgICAgcGVuZGluZy5zdGFja3RyYWNlID0gcGVuZGluZy5zdGFja3RyYWNlID8gYCR7cGVuZGluZy5zdGFja3RyYWNlfVxcbiR7bGluZX1gIDogbGluZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAocGVuZGluZykgZW50cmllcy5wdXNoKHBlbmRpbmcpO1xyXG5cclxuICAgIC8vIOacq+WwviBtYXhFbnRyaWVzIOS7tlxyXG4gICAgcmV0dXJuIGVudHJpZXMuc2xpY2UoLW1heEVudHJpZXMpO1xyXG59XHJcbiJdfQ==