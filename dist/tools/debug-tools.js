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
                name: "debug_get_editor_info",
                description: "Get Cocos Creator editor information (version, platform, language).",
                inputSchema: { type: "object", properties: {} },
            },
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
                name: "debug_get_console_logs",
                description: "[DEPRECATED v2.0.0 — use read_console instead] Get recent console log entries. Automatically captures scene process logs (console.log/warn/error in scene scripts). Game preview logs can also be captured by sending POST requests to /log endpoint — see README for setup.",
                inputSchema: {
                    type: "object",
                    properties: {
                        count: { type: "number", description: "Max number of entries (default 50)" },
                        level: { type: "string", description: "Filter by level: 'log', 'warn', or 'error'" },
                        source: { type: "string", description: "Filter by source: 'scene' or 'game'. Returns both if omitted." },
                    },
                },
            },
            {
                name: "debug_clear_console",
                description: "[DEPRECATED v2.0.0 — use read_console with action='clear'] Clear the editor console.",
                inputSchema: { type: "object", properties: {} },
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
                name: "debug_list_extensions",
                description: "List all installed extensions.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "debug_get_project_logs",
                description: "Read recent project log entries from the log file.",
                inputSchema: {
                    type: "object",
                    properties: {
                        lines: { type: "number", description: "Number of lines to read (default 100)" },
                    },
                },
            },
            {
                name: "debug_search_project_logs",
                description: "Search for a pattern in project logs.",
                inputSchema: {
                    type: "object",
                    properties: {
                        pattern: { type: "string", description: "Search pattern (regex supported)" },
                    },
                    required: ["pattern"],
                },
            },
            {
                name: "debug_get_log_file_info",
                description: "Get information about the project log file (size, path, last modified).",
                inputSchema: { type: "object", properties: {} },
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
                description: "Take a screenshot of the editor window and save to a file. Returns the file path of the saved PNG.",
                inputSchema: {
                    type: "object",
                    properties: {
                        savePath: { type: "string", description: "File path to save the PNG (default: temp/screenshots/screenshot_<timestamp>.png)" },
                        maxWidth: { type: "number", description: "Max width in pixels for resize (default: 960, 0 = no resize). Aspect ratio is preserved." },
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
                name: "debug_reload_extension",
                description: "Reload the MCP extension itself. Use after npm run build to apply code changes without restarting CocosCreator. Response is sent before reload starts.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "debug_get_extension_info",
                description: "Get detailed information about a specific extension.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Extension name" },
                    },
                    required: ["name"],
                },
            },
            {
                name: "debug_record_start",
                description: "Start recording the game preview canvas to a video file. Uses MediaRecorder on the game side. Bitrate is auto-calculated from canvas resolution × fps × quality coefficient unless videoBitsPerSecond is set explicitly.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fps: { type: "number", description: "Frames per second (default: 30)" },
                        quality: { type: "string", description: "'low'/'medium'/'high'/'ultra' (default: medium). Coefficients: 0.15/0.25/0.40/0.60" },
                        coefficient: { type: "number", description: "Custom bitrate coefficient (width × height × fps × coefficient). Overrides quality." },
                        videoBitsPerSecond: { type: "number", description: "Explicit bitrate in bps. Overrides quality-based calculation." },
                        format: { type: "string", description: "'mp4' (default) or 'webm'. mp4 falls back to webm if not supported." },
                        savePath: { type: "string", description: "Save directory (project-relative or absolute). Default: temp/recordings" },
                    },
                },
            },
            {
                name: "debug_record_stop",
                description: "Stop recording started by debug_record_start. Returns the saved WebM file path and size. Video is saved to project's temp/recordings/rec_<datetime>.webm.",
                inputSchema: {
                    type: "object",
                    properties: {
                        timeout: { type: "number", description: "Max wait time in ms for file upload (default: 30000)" },
                    },
                },
            },
            {
                name: "debug_batch_screenshot",
                description: "Navigate to multiple pages and take a screenshot of each. Requires game preview running with GameDebugClient. Returns an array of screenshot file paths.",
                inputSchema: {
                    type: "object",
                    properties: {
                        pages: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of page names to screenshot (e.g. ['HomePageView', 'ShopPageView'])",
                        },
                        delay: { type: "number", description: "Delay in ms between navigate and screenshot (default: 1000)" },
                        maxWidth: { type: "number", description: "Max width for screenshot resize (default: 960)" },
                    },
                    required: ["pages"],
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
                case "debug_get_editor_info":
                    return this.getEditorInfo();
                case "debug_list_messages":
                    return this.listMessages(args.target);
                case "debug_execute_script":
                    return this.executeScript(args.method, args.args || []);
                case "debug_get_console_logs":
                    return this.getConsoleLogs(args.count || 50, args.level, args.source);
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
                case "debug_clear_console":
                    Editor.Message.send("console", "clear");
                    // Clear scene process log buffer
                    await Editor.Message.request("scene", "execute-scene-script", {
                        name: "cocos-creator-mcp",
                        method: "clearConsoleLogs",
                        args: [],
                    }).catch(() => { });
                    // Clear game preview log buffer
                    (0, mcp_server_1.clearGameLogs)();
                    return (0, tool_base_1.ok)({ success: true });
                case "debug_list_extensions":
                    return this.listExtensions();
                case "debug_get_project_logs":
                    return this.getProjectLogs(args.lines || 100);
                case "debug_search_project_logs":
                    return this.searchProjectLogs(args.pattern);
                case "debug_get_log_file_info":
                    return this.getLogFileInfo();
                case "debug_query_devices": {
                    const devices = await Editor.Message.request("device", "query").catch(() => []);
                    return (0, tool_base_1.ok)({ success: true, devices });
                }
                case "debug_open_url":
                    await Editor.Message.request("program", "open-url", args.url);
                    return (0, tool_base_1.ok)({ success: true, url: args.url });
                case "debug_game_command":
                    return this.gameCommand(args.type || args.command, (0, utils_1.parseMaybeJson)(args.args), args.timeout || 5000, args.maxWidth, args.imageFormat);
                case "debug_screenshot":
                    return this.takeScreenshot(args.savePath, args.maxWidth);
                case "debug_preview":
                    return this.handlePreview(args.action || "start", args.waitForReady, args.waitTimeout || 15000);
                case "debug_clear_code_cache":
                    return this.clearCodeCache();
                case "debug_reload_extension":
                    return this.reloadExtension();
                case "debug_validate_scene":
                    return this.validateScene();
                case "debug_get_extension_info":
                    return this.getExtensionInfo(args.name);
                case "debug_batch_screenshot":
                    return this.batchScreenshot(args.pages, args.delay || 1000, args.maxWidth);
                case "debug_record_start":
                    return this.gameCommand("record_start", { fps: args.fps, quality: args.quality, coefficient: args.coefficient, videoBitsPerSecond: args.videoBitsPerSecond, format: args.format, savePath: args.savePath }, 5000);
                case "debug_record_stop":
                    return this.gameCommand("record_stop", undefined, args.timeout || 30000);
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
    async getConsoleLogs(count, level, source) {
        // 1. Try Editor's native console API first (may be supported in future CocosCreator versions)
        if (!source) {
            try {
                const logs = await Editor.Message.request("console", "query-last-logs", count);
                if (Array.isArray(logs) && logs.length > 0) {
                    return (0, tool_base_1.ok)({ success: true, logs, source: "editor-api", note: "Using native Editor console API" });
                }
            }
            catch ( /* Not supported in this version — use fallback */_a) { /* Not supported in this version — use fallback */ }
        }
        // 2. Fallback: collect from scene process buffer + game preview buffer
        let sceneLogs = [];
        let gameLogs = [];
        // 2a. Scene process logs (console wrapper in scene.ts)
        if (!source || source === "scene") {
            try {
                const result = await Editor.Message.request("scene", "execute-scene-script", {
                    name: "cocos-creator-mcp",
                    method: "getConsoleLogs",
                    args: [count * 2, level], // request more, will trim after merge
                });
                if (result === null || result === void 0 ? void 0 : result.logs) {
                    sceneLogs = result.logs.map((l) => (Object.assign(Object.assign({}, l), { source: "scene" })));
                }
            }
            catch ( /* scene not available */_b) { /* scene not available */ }
        }
        // 2b. Game preview logs (received via POST /log endpoint)
        if (!source || source === "game") {
            const gameResult = (0, mcp_server_1.getGameLogs)(count * 2, level);
            gameLogs = gameResult.logs.map((l) => (Object.assign(Object.assign({}, l), { source: "game" })));
        }
        // Merge and sort by timestamp, take last `count`
        const merged = [...sceneLogs, ...gameLogs]
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
            .slice(-count);
        return (0, tool_base_1.ok)({
            success: true,
            logs: merged,
            total: { scene: sceneLogs.length, game: (source === "scene" ? 0 : gameLogs.length) },
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBdUM7QUFDdkMsOENBQStGO0FBQy9GLG9DQUEwQztBQUMxQywrQ0FBd0Q7QUFDeEQsOENBQW1FO0FBRW5FLE1BQWEsVUFBVTtJQUF2QjtRQUNhLGlCQUFZLEdBQUcsT0FBTyxDQUFDO0lBMitCcEMsQ0FBQztJQXorQkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixXQUFXLEVBQUUscUVBQXFFO2dCQUNsRixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7YUFDbEQ7WUFDRDtnQkFDSSxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixXQUFXLEVBQUUsMEVBQTBFO2dCQUN2RixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdEQUF3RCxFQUFFO3FCQUNwRztvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsa0ZBQWtGO2dCQUMvRixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJCQUEyQixFQUFFO3dCQUNwRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO3FCQUN2RTtvQkFDRCxRQUFRLEVBQUUs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dkIsQ0FBQztRQUNOLENBQUM7YUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLHVCQUF1QjtZQUN2QixPQUFPLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3RGLENBQUM7SUFDTCxDQUFDO0lBQ0QsSUFBSSxPQUFPO1FBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVuQyxrQkFBa0I7SUFDbEIsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDdEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgb2ssIGVyciB9IGZyb20gXCIuLi90b29sLWJhc2VcIjtcclxuaW1wb3J0IHsgZ2V0R2FtZUxvZ3MsIGNsZWFyR2FtZUxvZ3MsIHF1ZXVlR2FtZUNvbW1hbmQsIGdldENvbW1hbmRSZXN1bHQgfSBmcm9tIFwiLi4vbWNwLXNlcnZlclwiO1xyXG5pbXBvcnQgeyBwYXJzZU1heWJlSnNvbiB9IGZyb20gXCIuLi91dGlsc1wiO1xyXG5pbXBvcnQgeyBlbnN1cmVTY2VuZVNhZmVUb1N3aXRjaCB9IGZyb20gXCIuL3NjZW5lLXRvb2xzXCI7XHJcbmltcG9ydCB7IHByb2Nlc3NJbWFnZSwgdGFrZUVkaXRvclNjcmVlbnNob3QgfSBmcm9tIFwiLi4vc2NyZWVuc2hvdFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIERlYnVnVG9vbHMgaW1wbGVtZW50cyBUb29sQ2F0ZWdvcnkge1xyXG4gICAgcmVhZG9ubHkgY2F0ZWdvcnlOYW1lID0gXCJkZWJ1Z1wiO1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZ2V0X2VkaXRvcl9pbmZvXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgQ29jb3MgQ3JlYXRvciBlZGl0b3IgaW5mb3JtYXRpb24gKHZlcnNpb24sIHBsYXRmb3JtLCBsYW5ndWFnZSkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2xpc3RfbWVzc2FnZXNcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxpc3QgYXZhaWxhYmxlIEVkaXRvciBtZXNzYWdlcyBmb3IgYSBnaXZlbiBleHRlbnNpb24gb3IgYnVpbHQtaW4gbW9kdWxlLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk1lc3NhZ2UgdGFyZ2V0IChlLmcuICdzY2VuZScsICdhc3NldC1kYicsICdleHRlbnNpb24nKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widGFyZ2V0XCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19leGVjdXRlX3NjcmlwdFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRXhlY3V0ZSBhIGN1c3RvbSBzY2VuZSBzY3JpcHQgbWV0aG9kLiBUaGUgbWV0aG9kIG11c3QgYmUgcmVnaXN0ZXJlZCBpbiBzY2VuZS50cy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJNZXRob2QgbmFtZSBmcm9tIHNjZW5lLnRzXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogeyB0eXBlOiBcImFycmF5XCIsIGRlc2NyaXB0aW9uOiBcIkFyZ3VtZW50cyB0byBwYXNzXCIsIGl0ZW1zOiB7fSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcIm1ldGhvZFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZ2V0X2NvbnNvbGVfbG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiW0RFUFJFQ0FURUQgdjIuMC4wIOKAlCB1c2UgcmVhZF9jb25zb2xlIGluc3RlYWRdIEdldCByZWNlbnQgY29uc29sZSBsb2cgZW50cmllcy4gQXV0b21hdGljYWxseSBjYXB0dXJlcyBzY2VuZSBwcm9jZXNzIGxvZ3MgKGNvbnNvbGUubG9nL3dhcm4vZXJyb3IgaW4gc2NlbmUgc2NyaXB0cykuIEdhbWUgcHJldmlldyBsb2dzIGNhbiBhbHNvIGJlIGNhcHR1cmVkIGJ5IHNlbmRpbmcgUE9TVCByZXF1ZXN0cyB0byAvbG9nIGVuZHBvaW50IOKAlCBzZWUgUkVBRE1FIGZvciBzZXR1cC5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCBudW1iZXIgb2YgZW50cmllcyAoZGVmYXVsdCA1MClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJGaWx0ZXIgYnkgbGV2ZWw6ICdsb2cnLCAnd2FybicsIG9yICdlcnJvcidcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRmlsdGVyIGJ5IHNvdXJjZTogJ3NjZW5lJyBvciAnZ2FtZScuIFJldHVybnMgYm90aCBpZiBvbWl0dGVkLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfY2xlYXJfY29uc29sZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiW0RFUFJFQ0FURUQgdjIuMC4wIOKAlCB1c2UgcmVhZF9jb25zb2xlIHdpdGggYWN0aW9uPSdjbGVhciddIENsZWFyIHRoZSBlZGl0b3IgY29uc29sZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwicmVhZF9jb25zb2xlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZWFkIEVkaXRvciAvIFNjZW5lIC8gR2FtZSBjb25zb2xlIGxvZ3MgaW4gb25lIHRvb2wuIENhcHR1cmVzIGNvbXBpbGUgZXJyb3JzIChmcm9tIEVkaXRvciAvIHByb2plY3QubG9nKSwgcnVudGltZSBlcnJvcnMsIGFuZCBjb25zb2xlLmxvZyBvdXRwdXQgYWNyb3NzIGFsbCBzb3VyY2VzLiBTdXBwb3J0cyBhY3Rpb249J2dldCcgKGRlZmF1bHQpIGFuZCBhY3Rpb249J2NsZWFyJy4gUmVwbGFjZXMgZGVidWdfZ2V0X2NvbnNvbGVfbG9ncyAvIGRlYnVnX2NsZWFyX2NvbnNvbGUgaW4gdjIuMC4wLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidnZXQnIChkZWZhdWx0KSBvciAnY2xlYXInLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImFycmF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGaWx0ZXIgYnkgZW50cnkgdHlwZS4gQW55IG9mICdsb2cnIHwgJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJy4gUmV0dXJucyBhbGwgdHlwZXMgaWYgb21pdHRlZC5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRmlsdGVyIGJ5IHNvdXJjZS4gQW55IG9mICdlZGl0b3InIHwgJ3NjZW5lJyB8ICdnYW1lJy4gRGVmYXVsdDogYWxsIHRocmVlLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggZW50cmllcyB0byByZXR1cm4gYWZ0ZXIgbWVyZ2UgKGRlZmF1bHQgNTApLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVTdGFja3RyYWNlOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJJbmNsdWRlIHN0YWNrdHJhY2Ugc3RyaW5ncyBpZiBhdmFpbGFibGUgKGRlZmF1bHQgZmFsc2UpLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbmNlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIklTTyB0aW1lc3RhbXAg4oCUIHJldHVybiBvbmx5IGVudHJpZXMgbmV3ZXIgdGhhbiB0aGlzIChvcHRpb25hbCkuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlN1YnN0cmluZyBvciByZWdleCBwYXR0ZXJuIHRvIGZpbHRlciBtZXNzYWdlcyAob3B0aW9uYWwpLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfbGlzdF9leHRlbnNpb25zXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMaXN0IGFsbCBpbnN0YWxsZWQgZXh0ZW5zaW9ucy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZ2V0X3Byb2plY3RfbG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVhZCByZWNlbnQgcHJvamVjdCBsb2cgZW50cmllcyBmcm9tIHRoZSBsb2cgZmlsZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk51bWJlciBvZiBsaW5lcyB0byByZWFkIChkZWZhdWx0IDEwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3NlYXJjaF9wcm9qZWN0X2xvZ3NcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNlYXJjaCBmb3IgYSBwYXR0ZXJuIGluIHByb2plY3QgbG9ncy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU2VhcmNoIHBhdHRlcm4gKHJlZ2V4IHN1cHBvcnRlZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInBhdHRlcm5cIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dldF9sb2dfZmlsZV9pbmZvXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHByb2plY3QgbG9nIGZpbGUgKHNpemUsIHBhdGgsIGxhc3QgbW9kaWZpZWQpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8g4pSA4pSAIOS7peS4i+OAgeaXouWtmE1DUOacquWvvuW/nOOBrkVkaXRvciBBUEkg4pSA4pSAXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfcXVlcnlfZGV2aWNlc1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTGlzdCBjb25uZWN0ZWQgZGV2aWNlcyAoZm9yIG5hdGl2ZSBkZWJ1Z2dpbmcpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19vcGVuX3VybFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiT3BlbiBhIFVSTCBpbiB0aGUgc3lzdGVtIGJyb3dzZXIgZnJvbSB0aGUgZWRpdG9yLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgdXJsOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlVSTCB0byBvcGVuXCIgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ1cmxcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3ZhbGlkYXRlX3NjZW5lXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJWYWxpZGF0ZSB0aGUgY3VycmVudCBzY2VuZSBmb3IgY29tbW9uIGlzc3Vlcy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZ2FtZV9jb21tYW5kXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTZW5kIGEgY29tbWFuZCB0byB0aGUgcnVubmluZyBnYW1lIHByZXZpZXcuIFJlcXVpcmVzIEdhbWVEZWJ1Z0NsaWVudCBpbiB0aGUgZ2FtZS4gQ29tbWFuZHM6ICdzY3JlZW5zaG90JyAoY2FwdHVyZSBnYW1lIGNhbnZhcyksICdzdGF0ZScgKGR1bXAgR2FtZURiKSwgJ25hdmlnYXRlJyAoZ28gdG8gYSBwYWdlKSwgJ2NsaWNrJyAoY2xpY2sgYSBub2RlIGJ5IG5hbWUpLCAnaW5zcGVjdCcgKGdldCBydW50aW1lIG5vZGUgaW5mbzogVUlUcmFuc2Zvcm0gc2l6ZXMsIFdpZGdldCwgTGF5b3V0LCBwb3NpdGlvbikuIFJldHVybnMgdGhlIHJlc3VsdCBmcm9tIHRoZSBnYW1lLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21tYW5kIHR5cGU6ICdzY3JlZW5zaG90JywgJ3N0YXRlJywgJ25hdmlnYXRlJywgJ2NsaWNrJywgJ2luc3BlY3QnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogeyB0eXBlOiBcIm9iamVjdFwiLCBkZXNjcmlwdGlvbjogXCJDb21tYW5kIGFyZ3VtZW50cyAoZS5nLiB7cGFnZTogJ0hvbWVQYWdlVmlldyd9IGZvciBuYXZpZ2F0ZSwge25hbWU6ICdCdXR0b25OYW1lJ30gZm9yIGNsaWNrKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdhaXQgdGltZSBpbiBtcyAoZGVmYXVsdCA1MDAwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFdpZHRoOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3aWR0aCBmb3Igc2NyZWVuc2hvdCByZXNpemUgKGRlZmF1bHQ6IDk2MCwgMCA9IG5vIHJlc2l6ZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZUZvcm1hdDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTY3JlZW5zaG90IG91dHB1dCBmb3JtYXQ6ICd3ZWJwJyAoZGVmYXVsdCwgUT04NSkgb3IgJ3BuZycgKGxvc3NsZXNzKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widHlwZVwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfc2NyZWVuc2hvdFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVGFrZSBhIHNjcmVlbnNob3Qgb2YgdGhlIGVkaXRvciB3aW5kb3cgYW5kIHNhdmUgdG8gYSBmaWxlLiBSZXR1cm5zIHRoZSBmaWxlIHBhdGggb2YgdGhlIHNhdmVkIFBORy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkZpbGUgcGF0aCB0byBzYXZlIHRoZSBQTkcgKGRlZmF1bHQ6IHRlbXAvc2NyZWVuc2hvdHMvc2NyZWVuc2hvdF88dGltZXN0YW1wPi5wbmcpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4V2lkdGg6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdpZHRoIGluIHBpeGVscyBmb3IgcmVzaXplIChkZWZhdWx0OiA5NjAsIDAgPSBubyByZXNpemUpLiBBc3BlY3QgcmF0aW8gaXMgcHJlc2VydmVkLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfcHJldmlld1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU3RhcnQgb3Igc3RvcCB0aGUgZ2FtZSBwcmV2aWV3LiBVc2VzIFByZXZpZXcgaW4gRWRpdG9yIChhdXRvLW9wZW5zIE1haW5TY2VuZSBpZiBuZWVkZWQpLiBGYWxscyBiYWNrIHRvIGJyb3dzZXIgcHJldmlldyBpZiBlZGl0b3IgcHJldmlldyBmYWlscy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInc3RhcnQnIChkZWZhdWx0KSBvciAnc3RvcCdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUmVhZHk6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIHdhaXQgdW50aWwgR2FtZURlYnVnQ2xpZW50IGNvbm5lY3RzIGFmdGVyIHN0YXJ0IChkZWZhdWx0OiBmYWxzZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0VGltZW91dDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2FpdCB0aW1lIGluIG1zIGZvciB3YWl0Rm9yUmVhZHkgKGRlZmF1bHQ6IDE1MDAwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfY2xlYXJfY29kZV9jYWNoZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ2xlYXIgdGhlIGNvZGUgY2FjaGUgKGVxdWl2YWxlbnQgdG8gRGV2ZWxvcGVyID4gQ2FjaGUgPiBDbGVhciBjb2RlIGNhY2hlKSBhbmQgc29mdC1yZWxvYWQgdGhlIHNjZW5lLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19yZWxvYWRfZXh0ZW5zaW9uXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZWxvYWQgdGhlIE1DUCBleHRlbnNpb24gaXRzZWxmLiBVc2UgYWZ0ZXIgbnBtIHJ1biBidWlsZCB0byBhcHBseSBjb2RlIGNoYW5nZXMgd2l0aG91dCByZXN0YXJ0aW5nIENvY29zQ3JlYXRvci4gUmVzcG9uc2UgaXMgc2VudCBiZWZvcmUgcmVsb2FkIHN0YXJ0cy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZ2V0X2V4dGVuc2lvbl9pbmZvXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgZGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgYSBzcGVjaWZpYyBleHRlbnNpb24uXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkV4dGVuc2lvbiBuYW1lXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJuYW1lXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19yZWNvcmRfc3RhcnRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlN0YXJ0IHJlY29yZGluZyB0aGUgZ2FtZSBwcmV2aWV3IGNhbnZhcyB0byBhIHZpZGVvIGZpbGUuIFVzZXMgTWVkaWFSZWNvcmRlciBvbiB0aGUgZ2FtZSBzaWRlLiBCaXRyYXRlIGlzIGF1dG8tY2FsY3VsYXRlZCBmcm9tIGNhbnZhcyByZXNvbHV0aW9uIMOXIGZwcyDDlyBxdWFsaXR5IGNvZWZmaWNpZW50IHVubGVzcyB2aWRlb0JpdHNQZXJTZWNvbmQgaXMgc2V0IGV4cGxpY2l0bHkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcHM6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiRnJhbWVzIHBlciBzZWNvbmQgKGRlZmF1bHQ6IDMwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1YWxpdHk6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2xvdycvJ21lZGl1bScvJ2hpZ2gnLyd1bHRyYScgKGRlZmF1bHQ6IG1lZGl1bSkuIENvZWZmaWNpZW50czogMC4xNS8wLjI1LzAuNDAvMC42MFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZWZmaWNpZW50OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIkN1c3RvbSBiaXRyYXRlIGNvZWZmaWNpZW50ICh3aWR0aCDDlyBoZWlnaHQgw5cgZnBzIMOXIGNvZWZmaWNpZW50KS4gT3ZlcnJpZGVzIHF1YWxpdHkuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9CaXRzUGVyU2Vjb25kOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIkV4cGxpY2l0IGJpdHJhdGUgaW4gYnBzLiBPdmVycmlkZXMgcXVhbGl0eS1iYXNlZCBjYWxjdWxhdGlvbi5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ21wNCcgKGRlZmF1bHQpIG9yICd3ZWJtJy4gbXA0IGZhbGxzIGJhY2sgdG8gd2VibSBpZiBub3Qgc3VwcG9ydGVkLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlNhdmUgZGlyZWN0b3J5IChwcm9qZWN0LXJlbGF0aXZlIG9yIGFic29sdXRlKS4gRGVmYXVsdDogdGVtcC9yZWNvcmRpbmdzXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19yZWNvcmRfc3RvcFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU3RvcCByZWNvcmRpbmcgc3RhcnRlZCBieSBkZWJ1Z19yZWNvcmRfc3RhcnQuIFJldHVybnMgdGhlIHNhdmVkIFdlYk0gZmlsZSBwYXRoIGFuZCBzaXplLiBWaWRlbyBpcyBzYXZlZCB0byBwcm9qZWN0J3MgdGVtcC9yZWNvcmRpbmdzL3JlY188ZGF0ZXRpbWU+LndlYm0uXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgZm9yIGZpbGUgdXBsb2FkIChkZWZhdWx0OiAzMDAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2JhdGNoX3NjcmVlbnNob3RcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5hdmlnYXRlIHRvIG11bHRpcGxlIHBhZ2VzIGFuZCB0YWtlIGEgc2NyZWVuc2hvdCBvZiBlYWNoLiBSZXF1aXJlcyBnYW1lIHByZXZpZXcgcnVubmluZyB3aXRoIEdhbWVEZWJ1Z0NsaWVudC4gUmV0dXJucyBhbiBhcnJheSBvZiBzY3JlZW5zaG90IGZpbGUgcGF0aHMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTGlzdCBvZiBwYWdlIG5hbWVzIHRvIHNjcmVlbnNob3QgKGUuZy4gWydIb21lUGFnZVZpZXcnLCAnU2hvcFBhZ2VWaWV3J10pXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIkRlbGF5IGluIG1zIGJldHdlZW4gbmF2aWdhdGUgYW5kIHNjcmVlbnNob3QgKGRlZmF1bHQ6IDEwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4V2lkdGg6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdpZHRoIGZvciBzY3JlZW5zaG90IHJlc2l6ZSAoZGVmYXVsdDogOTYwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wicGFnZXNcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImV4ZWN1dGVfZWRpdG9yX3NjcmlwdFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRVNDQVBFIEhBVENIICh2Mi4wLjApLiBFeGVjdXRlIGFyYml0cmFyeSBKYXZhU2NyaXB0IGluIHRoZSBlZGl0b3IncyBzY2VuZSBwcm9jZXNzLiBVc2UgZm9yIG9wZXJhdGlvbnMgbm90IGNvdmVyZWQgYnkgb3RoZXIgdG9vbHM6IGF0b21pYyB0cmFuc2FjdGlvbnMsIGV4cGVyaW1lbnRhbCBBUElzLCBidWxrIG9wZXJhdGlvbnMsIHByb2plY3Qtc3BlY2lmaWMgd29ya2Zsb3dzLiBDb2RlIGlzIHdyYXBwZWQgaW4gYW4gYXN5bmMgZnVuY3Rpb24gc28gJ2F3YWl0JyBpcyB1c2FibGUgZGlyZWN0bHkuIEF2YWlsYWJsZSBnbG9iYWxzOiBFZGl0b3IgKE1lc3NhZ2UgQVBJKSwgY2MgKGVuZ2luZSBtb2R1bGUpLCBjb25zb2xlLiBSZXR1cm4gdmFsdWVzIGFyZSBzZXJpYWxpemVkOyBjYy5Ob2RlIC8gY2MuQ29tcG9uZW50IGluc3RhbmNlcyBiZWNvbWUgc3VtbWFyeSBvYmplY3RzLiBXQVJOSU5HOiBmdWxsIEVkaXRvciBwcm9jZXNzIHByaXZpbGVnZXMg4oCUIGxvY2FsIGRldmVsb3BtZW50IG9ubHksIG5ldmVyIGV4cG9zZSB0byB1bnRydXN0ZWQgY2FsbGVycy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiSmF2YVNjcmlwdCBjb2RlLiBVc2UgYHJldHVybiA8ZXhwcj5gIHRvIHJldHVybiBhIHZhbHVlLiBBc3luYyAvIGF3YWl0IHN1cHBvcnRlZC5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TXM6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IGV4ZWN1dGlvbiB0aW1lIGluIG1zIChkZWZhdWx0OiA1MDAwKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5Mb2dzOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJJZiB0cnVlLCBjYXB0dXJlcyBjb25zb2xlLmxvZy93YXJuL2Vycm9yIGR1cmluZyBleGVjdXRpb24gYW5kIHJldHVybnMgdGhlbSBpbiBgbG9nc2AgKGRlZmF1bHQ6IGZhbHNlKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImNvZGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3dhaXRfY29tcGlsZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiV2FpdCBmb3IgVHlwZVNjcmlwdCBjb21waWxhdGlvbiB0byBjb21wbGV0ZS4gTW9uaXRvcnMgdGhlIHBhY2tlci1kcml2ZXIgZGVidWcgbG9nIGZvciAnVGFyZ2V0KGVkaXRvcikgZW5kcycgbWVzc2FnZS4gVXNlIGFmdGVyIG1vZGlmeWluZyAudHMgZmlsZXMgdG8gZW5zdXJlIGNoYW5nZXMgYXJlIGNvbXBpbGVkIGJlZm9yZSBvcGVyYXRpbmcgb24gUHJlZmFicy4gV2l0aCBjbGVhbj10cnVlLCBkZWxldGVzIGNvbXBpbGVkIG91dHB1dCBmaXJzdCB0byBmb3JjZSBhIGZyZXNoIHJlY29tcGlsZSAoc2xvd2VyIGJ1dCBndWFyYW50ZWVkKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdhaXQgdGltZSBpbiBtcyAoZGVmYXVsdDogMTUwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYW46IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIGRlbGV0ZSBjb21waWxlZCBvdXRwdXQgZmlyc3QgdG8gZm9yY2UgZnJlc2ggcmVjb21waWxlIChkZWZhdWx0OiBmYWxzZSlcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dldF9lZGl0b3JfaW5mb1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEVkaXRvckluZm8oKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19saXN0X21lc3NhZ2VzXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlzdE1lc3NhZ2VzKGFyZ3MudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19leGVjdXRlX3NjcmlwdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY3JpcHQoYXJncy5tZXRob2QsIGFyZ3MuYXJncyB8fCBbXSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZ2V0X2NvbnNvbGVfbG9nc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbnNvbGVMb2dzKGFyZ3MuY291bnQgfHwgNTAsIGFyZ3MubGV2ZWwsIGFyZ3Muc291cmNlKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZWFkX2NvbnNvbGVcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkQ29uc29sZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogYXJncy5hY3Rpb24gfHwgXCJnZXRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZXM6IHBhcnNlTWF5YmVKc29uKGFyZ3MudHlwZXMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VzOiBwYXJzZU1heWJlSnNvbihhcmdzLnNvdXJjZXMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogYXJncy5jb3VudCB8fCA1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZVN0YWNrdHJhY2U6IGFyZ3MuaW5jbHVkZVN0YWNrdHJhY2UgPz8gZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbmNlOiBhcmdzLnNpbmNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IGFyZ3Muc2VhcmNoLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2NsZWFyX2NvbnNvbGVcIjpcclxuICAgICAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5zZW5kKFwiY29uc29sZVwiLCBcImNsZWFyXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHNjZW5lIHByb2Nlc3MgbG9nIGJ1ZmZlclxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiY2xlYXJDb25zb2xlTG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgZ2FtZSBwcmV2aWV3IGxvZyBidWZmZXJcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckdhbWVMb2dzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19saXN0X2V4dGVuc2lvbnNcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5saXN0RXh0ZW5zaW9ucygpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dldF9wcm9qZWN0X2xvZ3NcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9qZWN0TG9ncyhhcmdzLmxpbmVzIHx8IDEwMCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfc2VhcmNoX3Byb2plY3RfbG9nc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlYXJjaFByb2plY3RMb2dzKGFyZ3MucGF0dGVybik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZ2V0X2xvZ19maWxlX2luZm9cIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRMb2dGaWxlSW5mbygpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3F1ZXJ5X2RldmljZXNcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZXMgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZGV2aWNlXCIsIFwicXVlcnlcIikuY2F0Y2goKCkgPT4gW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGRldmljZXMgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfb3Blbl91cmxcIjpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwicHJvZ3JhbVwiLCBcIm9wZW4tdXJsXCIsIGFyZ3MudXJsKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB1cmw6IGFyZ3MudXJsIH0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dhbWVfY29tbWFuZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdhbWVDb21tYW5kKGFyZ3MudHlwZSB8fCBhcmdzLmNvbW1hbmQsIHBhcnNlTWF5YmVKc29uKGFyZ3MuYXJncyksIGFyZ3MudGltZW91dCB8fCA1MDAwLCBhcmdzLm1heFdpZHRoLCBhcmdzLmltYWdlRm9ybWF0KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19zY3JlZW5zaG90XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudGFrZVNjcmVlbnNob3QoYXJncy5zYXZlUGF0aCwgYXJncy5tYXhXaWR0aCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfcHJldmlld1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVByZXZpZXcoYXJncy5hY3Rpb24gfHwgXCJzdGFydFwiLCBhcmdzLndhaXRGb3JSZWFkeSwgYXJncy53YWl0VGltZW91dCB8fCAxNTAwMCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfY2xlYXJfY29kZV9jYWNoZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsZWFyQ29kZUNhY2hlKCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfcmVsb2FkX2V4dGVuc2lvblwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbG9hZEV4dGVuc2lvbigpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3ZhbGlkYXRlX3NjZW5lXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsaWRhdGVTY2VuZSgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dldF9leHRlbnNpb25faW5mb1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dGVuc2lvbkluZm8oYXJncy5uYW1lKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19iYXRjaF9zY3JlZW5zaG90XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmF0Y2hTY3JlZW5zaG90KGFyZ3MucGFnZXMsIGFyZ3MuZGVsYXkgfHwgMTAwMCwgYXJncy5tYXhXaWR0aCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfcmVjb3JkX3N0YXJ0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2FtZUNvbW1hbmQoXCJyZWNvcmRfc3RhcnRcIiwgeyBmcHM6IGFyZ3MuZnBzLCBxdWFsaXR5OiBhcmdzLnF1YWxpdHksIGNvZWZmaWNpZW50OiBhcmdzLmNvZWZmaWNpZW50LCB2aWRlb0JpdHNQZXJTZWNvbmQ6IGFyZ3MudmlkZW9CaXRzUGVyU2Vjb25kLCBmb3JtYXQ6IGFyZ3MuZm9ybWF0LCBzYXZlUGF0aDogYXJncy5zYXZlUGF0aCB9LCA1MDAwKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19yZWNvcmRfc3RvcFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdhbWVDb21tYW5kKFwicmVjb3JkX3N0b3BcIiwgdW5kZWZpbmVkLCBhcmdzLnRpbWVvdXQgfHwgMzAwMDApO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3dhaXRfY29tcGlsZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndhaXRDb21waWxlKGFyZ3MudGltZW91dCB8fCAxNTAwMCwgYXJncy5jbGVhbiA/PyBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZXhlY3V0ZV9lZGl0b3Jfc2NyaXB0XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyZ3MuY29kZSAhPT0gXCJzdHJpbmdcIiB8fCBhcmdzLmNvZGUubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnIoXCJleGVjdXRlX2VkaXRvcl9zY3JpcHQ6ICdjb2RlJyBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJleGVjdXRlRWRpdG9yU2NyaXB0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IGFyZ3MuY29kZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TXM6IGFyZ3MudGltZW91dE1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybkxvZ3M6IGFyZ3MucmV0dXJuTG9ncyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRFZGl0b3JJbmZvKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHJldHVybiBvayh7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb246IEVkaXRvci5BcHAudmVyc2lvbixcclxuICAgICAgICAgICAgcGF0aDogRWRpdG9yLkFwcC5wYXRoLFxyXG4gICAgICAgICAgICBob21lOiBFZGl0b3IuQXBwLmhvbWUsXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiBFZGl0b3IuSTE4bj8uZ2V0TGFuZ3VhZ2U/LigpIHx8IFwidW5rbm93blwiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbGlzdE1lc3NhZ2VzKHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJleHRlbnNpb25cIiwgXCJxdWVyeS1pbmZvXCIsIHRhcmdldCk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHRhcmdldCwgaW5mbyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgY29uc3Qga25vd25NZXNzYWdlczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG4gICAgICAgICAgICAgICAgXCJzY2VuZVwiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1ub2RlLXRyZWVcIiwgXCJjcmVhdGUtbm9kZVwiLCBcInJlbW92ZS1ub2RlXCIsIFwiZHVwbGljYXRlLW5vZGVcIixcclxuICAgICAgICAgICAgICAgICAgICBcInNldC1wcm9wZXJ0eVwiLCBcImNyZWF0ZS1wcmVmYWJcIiwgXCJzYXZlLXNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIixcclxuICAgICAgICAgICAgICAgICAgICBcInF1ZXJ5LWlzLWRpcnR5XCIsIFwicXVlcnktY2xhc3Nlc1wiLCBcInNvZnQtcmVsb2FkXCIsIFwic25hcHNob3RcIixcclxuICAgICAgICAgICAgICAgICAgICBcImNoYW5nZS1naXptby10b29sXCIsIFwicXVlcnktZ2l6bW8tdG9vbC1uYW1lXCIsIFwiZm9jdXMtY2FtZXJhLW9uLW5vZGVzXCIsXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgXCJhc3NldC1kYlwiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1hc3NldHNcIiwgXCJxdWVyeS1hc3NldC1pbmZvXCIsIFwicXVlcnktYXNzZXQtbWV0YVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwicmVmcmVzaC1hc3NldFwiLCBcInNhdmUtYXNzZXRcIiwgXCJjcmVhdGUtYXNzZXRcIiwgXCJkZWxldGUtYXNzZXRcIixcclxuICAgICAgICAgICAgICAgICAgICBcIm1vdmUtYXNzZXRcIiwgXCJjb3B5LWFzc2V0XCIsIFwib3Blbi1hc3NldFwiLCBcInJlaW1wb3J0LWFzc2V0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1wYXRoXCIsIFwicXVlcnktdXVpZFwiLCBcInF1ZXJ5LXVybFwiLCBcInF1ZXJ5LWFzc2V0LWRlcGVuZHNcIixcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0ga25vd25NZXNzYWdlc1t0YXJnZXRdO1xyXG4gICAgICAgICAgICBpZiAobWVzc2FnZXMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHRhcmdldCwgbWVzc2FnZXMsIG5vdGU6IFwiU3RhdGljIGxpc3QgKHF1ZXJ5IGZhaWxlZClcIiB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY3JpcHQobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgYXJncyxcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldENvbnNvbGVMb2dzKGNvdW50OiBudW1iZXIsIGxldmVsPzogc3RyaW5nLCBzb3VyY2U/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICAvLyAxLiBUcnkgRWRpdG9yJ3MgbmF0aXZlIGNvbnNvbGUgQVBJIGZpcnN0IChtYXkgYmUgc3VwcG9ydGVkIGluIGZ1dHVyZSBDb2Nvc0NyZWF0b3IgdmVyc2lvbnMpXHJcbiAgICAgICAgaWYgKCFzb3VyY2UpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ3MgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiY29uc29sZVwiLCBcInF1ZXJ5LWxhc3QtbG9nc1wiLCBjb3VudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsb2dzKSAmJiBsb2dzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBsb2dzLCBzb3VyY2U6IFwiZWRpdG9yLWFwaVwiLCBub3RlOiBcIlVzaW5nIG5hdGl2ZSBFZGl0b3IgY29uc29sZSBBUElcIiB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIE5vdCBzdXBwb3J0ZWQgaW4gdGhpcyB2ZXJzaW9uIOKAlCB1c2UgZmFsbGJhY2sgKi8gfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gRmFsbGJhY2s6IGNvbGxlY3QgZnJvbSBzY2VuZSBwcm9jZXNzIGJ1ZmZlciArIGdhbWUgcHJldmlldyBidWZmZXJcclxuICAgICAgICBsZXQgc2NlbmVMb2dzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGxldCBnYW1lTG9nczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgLy8gMmEuIFNjZW5lIHByb2Nlc3MgbG9ncyAoY29uc29sZSB3cmFwcGVyIGluIHNjZW5lLnRzKVxyXG4gICAgICAgIGlmICghc291cmNlIHx8IHNvdXJjZSA9PT0gXCJzY2VuZVwiKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJnZXRDb25zb2xlTG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtjb3VudCAqIDIsIGxldmVsXSwgLy8gcmVxdWVzdCBtb3JlLCB3aWxsIHRyaW0gYWZ0ZXIgbWVyZ2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdD8ubG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lTG9ncyA9IHJlc3VsdC5sb2dzLm1hcCgobDogYW55KSA9PiAoeyAuLi5sLCBzb3VyY2U6IFwic2NlbmVcIiB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBzY2VuZSBub3QgYXZhaWxhYmxlICovIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDJiLiBHYW1lIHByZXZpZXcgbG9ncyAocmVjZWl2ZWQgdmlhIFBPU1QgL2xvZyBlbmRwb2ludClcclxuICAgICAgICBpZiAoIXNvdXJjZSB8fCBzb3VyY2UgPT09IFwiZ2FtZVwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdhbWVSZXN1bHQgPSBnZXRHYW1lTG9ncyhjb3VudCAqIDIsIGxldmVsKTtcclxuICAgICAgICAgICAgZ2FtZUxvZ3MgPSBnYW1lUmVzdWx0LmxvZ3MubWFwKChsOiBhbnkpID0+ICh7IC4uLmwsIHNvdXJjZTogXCJnYW1lXCIgfSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gTWVyZ2UgYW5kIHNvcnQgYnkgdGltZXN0YW1wLCB0YWtlIGxhc3QgYGNvdW50YFxyXG4gICAgICAgIGNvbnN0IG1lcmdlZCA9IFsuLi5zY2VuZUxvZ3MsIC4uLmdhbWVMb2dzXVxyXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS50aW1lc3RhbXAubG9jYWxlQ29tcGFyZShiLnRpbWVzdGFtcCkpXHJcbiAgICAgICAgICAgIC5zbGljZSgtY291bnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBsb2dzOiBtZXJnZWQsXHJcbiAgICAgICAgICAgIHRvdGFsOiB7IHNjZW5lOiBzY2VuZUxvZ3MubGVuZ3RoLCBnYW1lOiAoc291cmNlID09PSBcInNjZW5lXCIgPyAwIDogZ2FtZUxvZ3MubGVuZ3RoKSB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVhZENvbnNvbGUob3B0czoge1xyXG4gICAgICAgIGFjdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHR5cGVzPzogc3RyaW5nW107XHJcbiAgICAgICAgc291cmNlcz86IHN0cmluZ1tdO1xyXG4gICAgICAgIGNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgaW5jbHVkZVN0YWNrdHJhY2U6IGJvb2xlYW47XHJcbiAgICAgICAgc2luY2U/OiBzdHJpbmc7XHJcbiAgICAgICAgc2VhcmNoPzogc3RyaW5nO1xyXG4gICAgfSk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGFsbG93ZWRTb3VyY2VzID0gbmV3IFNldChbXCJlZGl0b3JcIiwgXCJzY2VuZVwiLCBcImdhbWVcIl0pO1xyXG4gICAgICAgIGNvbnN0IHNvdXJjZXMgPSAob3B0cy5zb3VyY2VzICYmIG9wdHMuc291cmNlcy5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICA/IG9wdHMuc291cmNlcy5maWx0ZXIocyA9PiBhbGxvd2VkU291cmNlcy5oYXMocykpXHJcbiAgICAgICAgICAgIDogW1wiZWRpdG9yXCIsIFwic2NlbmVcIiwgXCJnYW1lXCJdO1xyXG5cclxuICAgICAgICBpZiAob3B0cy5hY3Rpb24gPT09IFwiY2xlYXJcIikge1xyXG4gICAgICAgICAgICBjb25zdCBjbGVhcmVkOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcImVkaXRvclwiKSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHsgRWRpdG9yLk1lc3NhZ2Uuc2VuZChcImNvbnNvbGVcIiwgXCJjbGVhclwiKTsgY2xlYXJlZC5wdXNoKFwiZWRpdG9yXCIpOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcInNjZW5lXCIpKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiY2xlYXJDb25zb2xlTG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjbGVhcmVkLnB1c2goXCJzY2VuZVwiKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBzY2VuZSBub3QgYXZhaWxhYmxlICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcImdhbWVcIikpIHtcclxuICAgICAgICAgICAgICAgIGNsZWFyR2FtZUxvZ3MoKTtcclxuICAgICAgICAgICAgICAgIGNsZWFyZWQucHVzaChcImdhbWVcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcImNsZWFyXCIsIGNsZWFyZWQgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0cy5hY3Rpb24gIT09IFwiZ2V0XCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBhY3Rpb246ICR7b3B0cy5hY3Rpb259LiBFeHBlY3RlZCAnZ2V0JyBvciAnY2xlYXInLmApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllczogQXJyYXk8eyB0aW1lc3RhbXA6IHN0cmluZzsgc291cmNlOiBzdHJpbmc7IHR5cGU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nOyBzdGFja3RyYWNlPzogc3RyaW5nIH0+ID0gW107XHJcblxyXG4gICAgICAgIC8vIHNjZW5lIHNvdXJjZVxyXG4gICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwic2NlbmVcIikpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcImdldENvbnNvbGVMb2dzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW29wdHMuY291bnQgKiAyLCB1bmRlZmluZWRdLCAvLyByZXF1ZXN0IG1vcmUsIGZpbHRlciBhZnRlciBtZXJnZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0Py5sb2dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBsIG9mIHJlc3VsdC5sb2dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJpZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IGwudGltZXN0YW1wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcInNjZW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGwubGV2ZWwpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbC5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2t0cmFjZTogbC5zdGFja3RyYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBzY2VuZSBub3QgYXZhaWxhYmxlICovIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGdhbWUgc291cmNlXHJcbiAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJnYW1lXCIpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdhbWVSZXN1bHQgPSBnZXRHYW1lTG9ncyhvcHRzLmNvdW50ICogMik7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgbCBvZiBnYW1lUmVzdWx0LmxvZ3MpIHtcclxuICAgICAgICAgICAgICAgIGVudHJpZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBsLnRpbWVzdGFtcCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwiZ2FtZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vcm1hbGl6ZVR5cGUobC5sZXZlbCksXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbC5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrdHJhY2U6IChsIGFzIGFueSkuc3RhY2t0cmFjZSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBlZGl0b3Igc291cmNlXHJcbiAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJlZGl0b3JcIikpIHtcclxuICAgICAgICAgICAgbGV0IHZpYUFwaSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAvLyAxLiBUcnkgbmF0aXZlIGNvbnNvbGUgQVBJIGZpcnN0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImNvbnNvbGVcIiwgXCJxdWVyeS1sYXN0LWxvZ3NcIiwgb3B0cy5jb3VudCAqIDIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobG9ncykgJiYgbG9ncy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlhQXBpID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGwgb2YgbG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBsLnRpbWVzdGFtcCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwiZWRpdG9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGwudHlwZSB8fCBsLmxldmVsKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGwubWVzc2FnZSB8fCBTdHJpbmcobCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja3RyYWNlOiBsLnN0YWNrIHx8IGwuc3RhY2t0cmFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogbm90IHN1cHBvcnRlZCBpbiB0aGlzIHZlcnNpb24g4oaSIGZhbGxiYWNrICovIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDIuIEZhbGxiYWNrOiBwYXJzZSBwcm9qZWN0LmxvZyB0YWlsIGZvciBjb21waWxlIGVycm9yIC8gd2FybmluZyBwYXR0ZXJuc1xyXG4gICAgICAgICAgICBpZiAoIXZpYUFwaSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBhd2FpdCByZWFkUHJvamVjdExvZ1RhaWwob3B0cy5jb3VudCAqIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZSBvZiBwYXJzZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW50cmllcy5wdXNoKHsgLi4uZSwgc291cmNlOiBcImVkaXRvclwiIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBwcm9qZWN0LmxvZyB1bmF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFwcGx5IGZpbHRlcnNcclxuICAgICAgICBsZXQgZmlsdGVyZWQgPSBlbnRyaWVzO1xyXG4gICAgICAgIGlmIChvcHRzLnR5cGVzICYmIG9wdHMudHlwZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBhbGxvdyA9IG5ldyBTZXQob3B0cy50eXBlcy5tYXAobm9ybWFsaXplVHlwZSkpO1xyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihlID0+IGFsbG93LmhhcyhlLnR5cGUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG9wdHMuc2luY2UpIHtcclxuICAgICAgICAgICAgZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoZSA9PiBlLnRpbWVzdGFtcCA+IG9wdHMuc2luY2UhKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG9wdHMuc2VhcmNoKSB7XHJcbiAgICAgICAgICAgIGxldCByZTogUmVnRXhwO1xyXG4gICAgICAgICAgICB0cnkgeyByZSA9IG5ldyBSZWdFeHAob3B0cy5zZWFyY2gsIFwiaVwiKTsgfVxyXG4gICAgICAgICAgICBjYXRjaCB7IHJlID0gbmV3IFJlZ0V4cChlc2NhcGVSZWdleChvcHRzLnNlYXJjaCksIFwiaVwiKTsgfVxyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihlID0+IHJlLnRlc3QoZS5tZXNzYWdlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghb3B0cy5pbmNsdWRlU3RhY2t0cmFjZSkge1xyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLm1hcCgoeyBzdGFja3RyYWNlLCAuLi5yZXN0IH0pID0+IHJlc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU29ydCBieSB0aW1lc3RhbXAgYXNjZW5kaW5nLCB0YWtlIGxhc3QgYGNvdW50YFxyXG4gICAgICAgIGZpbHRlcmVkLnNvcnQoKGEsIGIpID0+IGEudGltZXN0YW1wLmxvY2FsZUNvbXBhcmUoYi50aW1lc3RhbXApKTtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBmaWx0ZXJlZC5zbGljZSgtb3B0cy5jb3VudCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvdW50cyA9IHtcclxuICAgICAgICAgICAgZWRpdG9yOiBlbnRyaWVzLmZpbHRlcihlID0+IGUuc291cmNlID09PSBcImVkaXRvclwiKS5sZW5ndGgsXHJcbiAgICAgICAgICAgIHNjZW5lOiBlbnRyaWVzLmZpbHRlcihlID0+IGUuc291cmNlID09PSBcInNjZW5lXCIpLmxlbmd0aCxcclxuICAgICAgICAgICAgZ2FtZTogZW50cmllcy5maWx0ZXIoZSA9PiBlLnNvdXJjZSA9PT0gXCJnYW1lXCIpLmxlbmd0aCxcclxuICAgICAgICAgICAgdG90YWw6IHJlc3VsdC5sZW5ndGgsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcImdldFwiLCBlbnRyaWVzOiByZXN1bHQsIGNvdW50cyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RFeHRlbnNpb25zKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicXVlcnktYWxsXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleHRlbnNpb25zOiBsaXN0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleHRlbnNpb25zOiBbXSwgbm90ZTogXCJFeHRlbnNpb24gcXVlcnkgbm90IHN1cHBvcnRlZFwiIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldEV4dGVuc2lvbkluZm8obmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJleHRlbnNpb25cIiwgXCJxdWVyeS1pbmZvXCIsIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBuYW1lLCBpbmZvIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldFByb2plY3RMb2dzKGxpbmVzOiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbG9nczogW10sIG5vdGU6IFwiTG9nIGZpbGUgbm90IGZvdW5kXCIgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobG9nUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYWxsTGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWNlbnQgPSBhbGxMaW5lcy5zbGljZSgtbGluZXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBsaW5lczogcmVjZW50Lmxlbmd0aCwgbG9nczogcmVjZW50IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaFByb2plY3RMb2dzKHBhdHRlcm46IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ1BhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QudG1wRGlyLCBcImxvZ3NcIiwgXCJwcm9qZWN0LmxvZ1wiKTtcclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBtYXRjaGVzOiBbXSB9KTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybiwgXCJnaVwiKTtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIikuZmlsdGVyKChsaW5lOiBzdHJpbmcpID0+IHJlZ2V4LnRlc3QobGluZSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBwYXR0ZXJuLCBjb3VudDogbWF0Y2hlcy5sZW5ndGgsIG1hdGNoZXM6IG1hdGNoZXMuc2xpY2UoMCwgMTAwKSB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dGaWxlSW5mbygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZXhpc3RzOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleGlzdHM6IHRydWUsIHBhdGg6IGxvZ1BhdGgsIHNpemU6IHN0YXQuc2l6ZSwgbW9kaWZpZWQ6IHN0YXQubXRpbWUgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUHJldmlldyhhY3Rpb246IHN0cmluZywgd2FpdEZvclJlYWR5PzogYm9vbGVhbiwgd2FpdFRpbWVvdXQ/OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcInN0b3BcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdG9wUHJldmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnN0YXJ0UHJldmlldygpO1xyXG4gICAgICAgIGlmICh3YWl0Rm9yUmVhZHkpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0RGF0YSA9IEpTT04ucGFyc2UocmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHREYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWR5ID0gYXdhaXQgdGhpcy53YWl0Rm9yR2FtZVJlYWR5KHdhaXRUaW1lb3V0IHx8IDE1MDAwKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdERhdGEuZ2FtZVJlYWR5ID0gcmVhZHk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlYWR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0RGF0YS5ub3RlID0gKHJlc3VsdERhdGEubm90ZSB8fCBcIlwiKSArIFwiIEdhbWVEZWJ1Z0NsaWVudCBkaWQgbm90IGNvbm5lY3Qgd2l0aGluIHRpbWVvdXQuXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2socmVzdWx0RGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHdhaXRGb3JHYW1lUmVhZHkodGltZW91dDogbnVtYmVyKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGdhbWUgaGFzIHNlbnQgYW55IGxvZyBvciBjb21tYW5kIHJlc3VsdCByZWNlbnRseVxyXG4gICAgICAgICAgICBjb25zdCBnYW1lUmVzdWx0ID0gZ2V0R2FtZUxvZ3MoMSk7XHJcbiAgICAgICAgICAgIGlmIChnYW1lUmVzdWx0LnRvdGFsID4gMCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc3RhcnRQcmV2aWV3KCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTWFpblNjZW5lT3BlbigpO1xyXG5cclxuICAgICAgICAgICAgLy8g44OE44O844Or44OQ44O844GuVnVl44Kk44Oz44K544K/44Oz44K557WM55Sx44GncGxheSgp44KS5ZG844G277yIVUnnirbmhYvjgoLlkIzmnJ/jgZXjgozjgovvvIlcclxuICAgICAgICAgICAgY29uc3QgcGxheWVkID0gYXdhaXQgdGhpcy5leGVjdXRlT25Ub29sYmFyKFwic3RhcnRcIik7XHJcbiAgICAgICAgICAgIGlmIChwbGF5ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogXCJzdGFydFwiLCBtb2RlOiBcImVkaXRvclwiIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDjg5Xjgqnjg7zjg6vjg5Djg4Pjgq86IOebtOaOpUFQSVxyXG4gICAgICAgICAgICBjb25zdCBpc1BsYXlpbmcgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJlZGl0b3ItcHJldmlldy1zZXQtcGxheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaXNQbGF5aW5nLCBhY3Rpb246IFwic3RhcnRcIiwgbW9kZTogXCJlZGl0b3JcIiwgbm90ZTogXCJkaXJlY3QgQVBJICh0b29sYmFyIFVJIG1heSBub3Qgc3luYylcIiB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZWxlY3Ryb24uc2hlbGwub3BlbkV4dGVybmFsKFwiaHR0cDovLzEyNy4wLjAuMTo3NDU2XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcInN0YXJ0XCIsIG1vZGU6IFwiYnJvd3NlclwiIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlMjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGUyLm1lc3NhZ2UgfHwgU3RyaW5nKGUyKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzdG9wUHJldmlldygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyDjg4Tjg7zjg6vjg5Djg7zntYznlLHjgaflgZzmraLvvIhVSeWQjOacn++8iVxyXG4gICAgICAgICAgICBjb25zdCBzdG9wcGVkID0gYXdhaXQgdGhpcy5leGVjdXRlT25Ub29sYmFyKFwic3RvcFwiKTtcclxuICAgICAgICAgICAgaWYgKCFzdG9wcGVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDjg5Xjgqnjg7zjg6vjg5Djg4Pjgq86IOebtOaOpUFQSVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiZWRpdG9yLXByZXZpZXctc2V0LXBsYXlcIiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHNjZW5lOnByZXZpZXctc3RvcCDjg5bjg63jg7zjg4njgq3jg6Pjgrnjg4jjgafjg4Tjg7zjg6vjg5Djg7xVSeeKtuaFi+OCkuODquOCu+ODg+ODiFxyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5icm9hZGNhc3QoXCJzY2VuZTpwcmV2aWV3LXN0b3BcIik7XHJcbiAgICAgICAgICAgIC8vIOOCt+ODvOODs+ODk+ODpeODvOOBq+aIu+OBmVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgNTAwKSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTWFpblNjZW5lT3BlbigpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IFwic3RvcFwiIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVPblRvb2xiYXIoYWN0aW9uOiBcInN0YXJ0XCIgfCBcInN0b3BcIik6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBhbGxDb250ZW50cyA9IGVsZWN0cm9uLndlYkNvbnRlbnRzLmdldEFsbFdlYkNvbnRlbnRzKCk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qgd2Mgb2YgYWxsQ29udGVudHMpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheSgp44KSYXdhaXTjgZfjgarjgYQg4oCUIOODl+ODrOODk+ODpeODvOWujOS6huOCkuW+heOBpOOBqOOCv+OCpOODoOOCouOCpuODiOOBmeOCi+OBn+OCgVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09IFwic3RhcnRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3Yy5leGVjdXRlSmF2YVNjcmlwdChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAoZnVuY3Rpb24oKSB7IGlmICh3aW5kb3cueHh4ICYmIHdpbmRvdy54eHgucGxheSAmJiAhd2luZG93Lnh4eC5nYW1lVmlldy5pc1BsYXkpIHsgd2luZG93Lnh4eC5wbGF5KCk7IHJldHVybiB0cnVlOyB9IHJldHVybiBmYWxzZTsgfSkoKWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2MuZXhlY3V0ZUphdmFTY3JpcHQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgKGZ1bmN0aW9uKCkgeyBpZiAod2luZG93Lnh4eCAmJiB3aW5kb3cueHh4LmdhbWVWaWV3LmlzUGxheSkgeyB3aW5kb3cueHh4LnBsYXkoKTsgcmV0dXJuIHRydWU7IH0gcmV0dXJuIGZhbHNlOyB9KSgpYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogbm90IHRoZSB0b29sYmFyIHdlYkNvbnRlbnRzICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiBlbGVjdHJvbiBBUEkgbm90IGF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZW5zdXJlTWFpblNjZW5lT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgbWV0aG9kOiBcImdldFNjZW5lSGllcmFyY2h5XCIsXHJcbiAgICAgICAgICAgIGFyZ3M6IFtmYWxzZV0sXHJcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgIGlmICghaGllcmFyY2h5Py5zY2VuZU5hbWUgfHwgaGllcmFyY2h5LnNjZW5lTmFtZSA9PT0gXCJzY2VuZS0yZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIOODl+ODreOCuOOCp+OCr+ODiOioreWumuOBrlN0YXJ0IFNjZW5l44KS5Y+C54WnXHJcbiAgICAgICAgICAgIGxldCBzY2VuZVV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgc2NlbmVVdWlkID0gYXdhaXQgKEVkaXRvciBhcyBhbnkpLlByb2ZpbGUuZ2V0Q29uZmlnKFwicHJldmlld1wiLCBcImdlbmVyYWwuc3RhcnRfc2NlbmVcIiwgXCJsb2NhbFwiKTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XHJcblxyXG4gICAgICAgICAgICAvLyBTdGFydCBTY2VuZeOBjOacquioreWumiBvciBcImN1cnJlbnRfc2NlbmVcIiDjga7loLTlkIjjgIHmnIDliJ3jga7jgrfjg7zjg7PjgpLkvb/jgYZcclxuICAgICAgICAgICAgaWYgKCFzY2VuZVV1aWQgfHwgc2NlbmVVdWlkID09PSBcImN1cnJlbnRfc2NlbmVcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXRzXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBjY1R5cGU6IFwiY2MuU2NlbmVBc3NldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IFwiZGI6Ly9hc3NldHMvKiovKlwiLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2VuZXMpICYmIHNjZW5lcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NlbmVVdWlkID0gc2NlbmVzWzBdLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzY2VuZVV1aWQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGRlYnVnX3ByZXZpZXcg5YaF6YOo44Gu6Ieq5YuV6YG356e744GvIHByZXZpZXcg44KS5YSq5YWI44GX44GmIGZvcmNlPXRydWVcclxuICAgICAgICAgICAgICAgIC8vIO+8iGRpYWxvZyDlh7rjgovjgojjgoogcHJldmlldyDplovlp4vjgpLlhKrlhYjjgZnjgovpgYvnlKjvvIlcclxuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwib3Blbi1zY2VuZVwiLCBzY2VuZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDE1MDApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyQ29kZUNhY2hlKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBtZW51ID0gZWxlY3Ryb24uTWVudS5nZXRBcHBsaWNhdGlvbk1lbnUoKTtcclxuICAgICAgICAgICAgaWYgKCFtZW51KSByZXR1cm4gZXJyKFwiQXBwbGljYXRpb24gbWVudSBub3QgZm91bmRcIik7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmaW5kTWVudUl0ZW0gPSAoaXRlbXM6IGFueVtdLCBwYXRoOiBzdHJpbmdbXSk6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5sYWJlbCA9PT0gcGF0aFswXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHJldHVybiBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5zdWJtZW51Py5pdGVtcykgcmV0dXJuIGZpbmRNZW51SXRlbShpdGVtLnN1Ym1lbnUuaXRlbXMsIHBhdGguc2xpY2UoMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY2FjaGVJdGVtID0gZmluZE1lbnVJdGVtKG1lbnUuaXRlbXMsIFtcIkRldmVsb3BlclwiLCBcIkNhY2hlXCIsIFwiQ2xlYXIgY29kZSBjYWNoZVwiXSk7XHJcbiAgICAgICAgICAgIGlmICghY2FjaGVJdGVtKSByZXR1cm4gZXJyKFwiTWVudSBpdGVtICdEZXZlbG9wZXIgPiBDYWNoZSA+IENsZWFyIGNvZGUgY2FjaGUnIG5vdCBmb3VuZFwiKTtcclxuXHJcbiAgICAgICAgICAgIGNhY2hlSXRlbS5jbGljaygpO1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwMCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIkNvZGUgY2FjaGUgY2xlYXJlZCB2aWEgbWVudVwiIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdhbWVDb21tYW5kKHR5cGU6IHN0cmluZywgYXJnczogYW55LCB0aW1lb3V0OiBudW1iZXIsIG1heFdpZHRoPzogbnVtYmVyLCBpbWFnZUZvcm1hdD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGNtZElkID0gcXVldWVHYW1lQ29tbWFuZCh0eXBlLCBhcmdzKTtcclxuXHJcbiAgICAgICAgLy8gUG9sbCBmb3IgcmVzdWx0XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldENvbW1hbmRSZXN1bHQoKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuaWQgPT09IGNtZElkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiBzY3JlZW5zaG90LCBzYXZlIHRvIGZpbGUgYW5kIHJldHVybiBwYXRoXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJzY3JlZW5zaG90XCIgJiYgcmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGE/LmRhdGFVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QudG1wRGlyLCBcInNjcmVlbnNob3RzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkgZnMubWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKC9bOi5dL2csIFwiLVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0ID0gcmVzdWx0LmRhdGEuZGF0YVVybC5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBuZ0J1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NCwgXCJiYXNlNjRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVmZmVjdGl2ZU1heFdpZHRoID0gbWF4V2lkdGggIT09IHVuZGVmaW5lZCA/IG1heFdpZHRoIDogOTYwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ0ltYWdlID0gZWxlY3Ryb24ubmF0aXZlSW1hZ2UuY3JlYXRlRnJvbUJ1ZmZlcihwbmdCdWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFNpemUgPSBvcmlnSW1hZ2UuZ2V0U2l6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ1ZmZlciwgd2lkdGgsIGhlaWdodCwgZm9ybWF0IH0gPSBhd2FpdCBwcm9jZXNzSW1hZ2UocG5nQnVmZmVyLCBlZmZlY3RpdmVNYXhXaWR0aCwgaW1hZ2VGb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBmb3JtYXQgPT09IFwid2VicFwiID8gXCJ3ZWJwXCIgOiBmb3JtYXQgPT09IFwianBlZ1wiID8gXCJqcGdcIiA6IFwicG5nXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGRpciwgYGdhbWVfJHt0aW1lc3RhbXB9LiR7ZXh0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgcGF0aDogZmlsZVBhdGgsIHNpemU6IGJ1ZmZlci5sZW5ndGgsIGZvcm1hdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsU2l6ZTogYCR7b3JpZ2luYWxTaXplLndpZHRofXgke29yaWdpbmFsU2l6ZS5oZWlnaHR9YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVkU2l6ZTogYCR7d2lkdGh9eCR7aGVpZ2h0fWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIlNjcmVlbnNob3QgY2FwdHVyZWQgYnV0IGZpbGUgc2F2ZSBmYWlsZWRcIiwgZXJyb3I6IGUubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlcnIoYEdhbWUgZGlkIG5vdCByZXNwb25kIHdpdGhpbiAke3RpbWVvdXR9bXMuIElzIEdhbWVEZWJ1Z0NsaWVudCBydW5uaW5nIGluIHRoZSBwcmV2aWV3P2ApO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdGFrZVNjcmVlbnNob3Qoc2F2ZVBhdGg/OiBzdHJpbmcsIG1heFdpZHRoPzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGFrZUVkaXRvclNjcmVlbnNob3Qoc2F2ZVBhdGgsIG1heFdpZHRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVsb2FkRXh0ZW5zaW9uKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIC8vIFNjaGVkdWxlIHJlbG9hZCBhZnRlciByZXNwb25zZSBpcyBzZW50XHJcbiAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicmVsb2FkXCIsIFwiY29jb3MtY3JlYXRvci1tY3BcIik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltNQ1BdIEV4dGVuc2lvbiByZWxvYWQgZmFpbGVkOlwiLCBlLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgNTAwKTtcclxuICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIkV4dGVuc2lvbiByZWxvYWQgc2NoZWR1bGVkLiBNQ1Agc2VydmVyIHdpbGwgcmVzdGFydCBpbiB+MXMuIE5PVEU6IEFkZGluZyBuZXcgdG9vbCBkZWZpbml0aW9ucyBvciBtb2RpZnlpbmcgc2NlbmUudHMgcmVxdWlyZXMgYSBmdWxsIENvY29zQ3JlYXRvciByZXN0YXJ0IChyZWxvYWQgaXMgbm90IHN1ZmZpY2llbnQpLlwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hTY3JlZW5zaG90KHBhZ2VzOiBzdHJpbmdbXSwgZGVsYXk6IG51bWJlciwgbWF4V2lkdGg/OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHRpbWVvdXQgPSAxMDAwMDtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIHBhZ2VzKSB7XHJcbiAgICAgICAgICAgIC8vIE5hdmlnYXRlXHJcbiAgICAgICAgICAgIGNvbnN0IG5hdlJlc3VsdCA9IGF3YWl0IHRoaXMuZ2FtZUNvbW1hbmQoXCJuYXZpZ2F0ZVwiLCB7IHBhZ2UgfSwgdGltZW91dCwgbWF4V2lkdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBuYXZEYXRhID0gSlNPTi5wYXJzZShuYXZSZXN1bHQuY29udGVudFswXS50ZXh0KTtcclxuICAgICAgICAgICAgaWYgKCFuYXZEYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHBhZ2UsIHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJuYXZpZ2F0ZSBmYWlsZWRcIiB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBwYWdlIHRvIHJlbmRlclxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgZGVsYXkpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNjcmVlbnNob3RcclxuICAgICAgICAgICAgY29uc3Qgc3NSZXN1bHQgPSBhd2FpdCB0aGlzLmdhbWVDb21tYW5kKFwic2NyZWVuc2hvdFwiLCB7fSwgdGltZW91dCwgbWF4V2lkdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBzc0RhdGEgPSBKU09OLnBhcnNlKHNzUmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBwYWdlLFxyXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3NEYXRhLnN1Y2Nlc3MgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBzc0RhdGEucGF0aCxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBzc0RhdGEuc3VjY2VzcyA/IHVuZGVmaW5lZCA6IChzc0RhdGEuZXJyb3IgfHwgc3NEYXRhLm1lc3NhZ2UpLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN1Y2NlZWRlZCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdWNjZXNzKS5sZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgdG90YWw6IHBhZ2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgc3VjY2VlZGVkLFxyXG4gICAgICAgICAgICBmYWlsZWQ6IHBhZ2VzLmxlbmd0aCAtIHN1Y2NlZWRlZCxcclxuICAgICAgICAgICAgcmVzdWx0cyxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGUtdHJlZVwiKTtcclxuICAgICAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBjb25zdCBjaGVja05vZGVzID0gKG5vZGVzOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlcykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlLm5hbWUpIGlzc3Vlcy5wdXNoKGBOb2RlICR7bm9kZS51dWlkfSBoYXMgbm8gbmFtZWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSBjaGVja05vZGVzKG5vZGUuY2hpbGRyZW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlKSkgY2hlY2tOb2Rlcyh0cmVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaXNzdWVDb3VudDogaXNzdWVzLmxlbmd0aCwgaXNzdWVzIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFR5cGVTY3JpcHQg44Kz44Oz44OR44Kk44Or5a6M5LqG44KS5b6F44Gk44CCXHJcbiAgICAgKiBwYWNrZXItZHJpdmVyIOOBriBkZWJ1Zy5sb2cg44GrIFwiVGFyZ2V0KGVkaXRvcikgZW5kc1wiIOOBjOePvuOCjOOCi+OBruOCkuebo+imluOBmeOCi+OAglxyXG4gICAgICog5pei44Gr44Kz44Oz44OR44Kk44Or5riI44G/77yI55u06L+R5pWw56eS5Lul5YaF44Gr5a6M5LqG44Ot44Kw44GC44KK77yJ44Gq44KJ5Y2z5bqn44Gr6L+U44GZ44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgd2FpdENvbXBpbGUodGltZW91dDogbnVtYmVyLCBjbGVhbjogYm9vbGVhbik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ1BhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgXCJ0ZW1wXCIsIFwicHJvZ3JhbW1pbmdcIiwgXCJwYWNrZXItZHJpdmVyXCIsIFwibG9nc1wiLCBcImRlYnVnLmxvZ1wiKTtcclxuICAgICAgICAgICAgY29uc3QgY2h1bmtzRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIFwidGVtcFwiLCBcInByb2dyYW1taW5nXCIsIFwicGFja2VyLWRyaXZlclwiLCBcInRhcmdldHNcIiwgXCJlZGl0b3JcIiwgXCJjaHVua3NcIik7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYENvbXBpbGUgbG9nIG5vdCBmb3VuZDogJHtsb2dQYXRofWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBNQVJLRVIgPSBcIlRhcmdldChlZGl0b3IpIGVuZHNcIjtcclxuXHJcbiAgICAgICAgICAgIC8vIGNsZWFuIOODouODvOODiTog44Kz44O844OJ44Kt44Oj44OD44K344Ol44Kv44Oq44KiICsgc29mdC1yZWxvYWQg44Gn5YaN44Kz44Oz44OR44Kk44Or44KS5by35Yi2XHJcbiAgICAgICAgICAgIGlmIChjbGVhbikge1xyXG4gICAgICAgICAgICAgICAgLy8gRGV2ZWxvcGVyID4gQ2FjaGUgPiBDbGVhciBjb2RlIGNhY2hlIOOCkuOCr+ODquODg+OCr1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW51ID0gZWxlY3Ryb24uTWVudS5nZXRBcHBsaWNhdGlvbk1lbnUoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5kTWVudUl0ZW0gPSAoaXRlbXM6IGFueVtdLCBsYWJlbHM6IHN0cmluZ1tdKTogYW55ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5sYWJlbCA9PT0gbGFiZWxzWzBdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhYmVscy5sZW5ndGggPT09IDEpIHJldHVybiBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnN1Ym1lbnU/Lml0ZW1zKSByZXR1cm4gZmluZE1lbnVJdGVtKGl0ZW0uc3VibWVudS5pdGVtcywgbGFiZWxzLnNsaWNlKDEpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlSXRlbSA9IG1lbnUgPyBmaW5kTWVudUl0ZW0obWVudS5pdGVtcywgW1wiRGV2ZWxvcGVyXCIsIFwiQ2FjaGVcIiwgXCJDbGVhciBjb2RlIGNhY2hlXCJdKSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhY2hlSXRlbSkgY2FjaGVJdGVtLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChfZSkgeyAvKiBpZ25vcmUgKi8gfVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpO1xyXG4gICAgICAgICAgICAgICAgLy8gc29mdC1yZWxvYWQg44Gn44K344O844Oz44KS5YaN6Kqt44G/6L6844G/IOKGkiDjgrPjg7Pjg5HjgqTjg6vjg4jjg6rjgqzjg7xcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNvZnQtcmVsb2FkXCIpLmNhdGNoKCgpID0+IHt9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gcmVmcmVzaC1hc3NldCDjgafjg5XjgqHjgqTjg6vlpInmm7TjgpIgQ0Mg44Gr6YCa55+l44GX44Gm44Kz44Oz44OR44Kk44Or44KS44OI44Oq44Ks44O8XHJcbiAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInJlZnJlc2gtYXNzZXRcIiwgXCJkYjovL2Fzc2V0c1wiKS5jYXRjaCgoKSA9PiB7fSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU2l6ZSA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpLnNpemU7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IFBPTExfSU5URVJWQUwgPSAyMDA7XHJcbiAgICAgICAgICAgIGNvbnN0IERFVEVDVF9HUkFDRV9NUyA9IDIwMDA7IC8vIENDIOOBjOODleOCoeOCpOODq+WkieabtOOCkuaknOefpeOBmeOCi+OBvuOBp+OBrueMtuS6iFxyXG5cclxuICAgICAgICAgICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgUE9MTF9JTlRFUlZBTCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTaXplID0gZnMuc3RhdFN5bmMobG9nUGF0aCkuc2l6ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg63jgrDjgYzmiJDplbfjgZfjgabjgYTjgarjgYRcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U2l6ZSA8PSBpbml0aWFsU2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsZWFuIOODouODvOODieOBp+OBr+W/heOBmuOCs+ODs+ODkeOCpOODq+OBjOi1sOOCi+OBruOBp+eMtuS6iOWIpOWumuOBl+OBquOBhFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGVhbikgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g54y25LqI5pyf6ZaT5YaF44Gv44G+44Gg5b6F44GkIChDQyDjga7mpJznn6XjgYzpgYXjgYTlj6/og73mgKcpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCBERVRFQ1RfR1JBQ0VfTVMpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeMtuS6iOacn+mWk+OCkumBjuOBjuOBpuOCguODreOCsOOBjOaIkOmVt+OBl+OBquOBhCDihpIg44Kz44Oz44OR44Kk44Or5LiN6KaBXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IHRydWUsIHdhaXRlZE1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLCBub3RlOiBcIk5vIGNvbXBpbGF0aW9uIHRyaWdnZXJlZCAobm8gY2hhbmdlcyBkZXRlY3RlZClcIiB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg63jgrDjgYzmiJDplbfjgZfjgZ8g4oaSIOaWsOOBl+OBhOmDqOWIhuOBq+ODnuODvOOCq+ODvOOBjOOBguOCi+OBi+eiuuiqjVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmQgPSBmcy5vcGVuU3luYyhsb2dQYXRoLCBcInJcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdCeXRlcyA9IGN1cnJlbnRTaXplIC0gaW5pdGlhbFNpemU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuYWxsb2MobmV3Qnl0ZXMpO1xyXG4gICAgICAgICAgICAgICAgZnMucmVhZFN5bmMoZmQsIGJ1ZmZlciwgMCwgbmV3Qnl0ZXMsIGluaXRpYWxTaXplKTtcclxuICAgICAgICAgICAgICAgIGZzLmNsb3NlU3luYyhmZCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobmV3Q29udGVudC5pbmNsdWRlcyhNQVJLRVIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IHRydWUsIHdhaXRlZE1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBjb21waWxlZDogZmFsc2UsIHRpbWVvdXQ6IHRydWUsIHdhaXRlZE1zOiB0aW1lb3V0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIE5vcm1hbGl6ZSB2YXJpb3VzIGxldmVsIC8gdHlwZSBzcGVsbGluZ3MgdG8gYSBjYW5vbmljYWwgXCJsb2dcInxcImluZm9cInxcIndhcm5cInxcImVycm9yXCIgc3RyaW5nLiAqL1xyXG5mdW5jdGlvbiBub3JtYWxpemVUeXBlKHJhdzogYW55KTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHMgPSBTdHJpbmcocmF3ID8/IFwiXCIpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAocyA9PT0gXCJ3YXJuaW5nXCIpIHJldHVybiBcIndhcm5cIjtcclxuICAgIGlmIChzID09PSBcImVyclwiKSByZXR1cm4gXCJlcnJvclwiO1xyXG4gICAgaWYgKHMgPT09IFwibG9nXCIgfHwgcyA9PT0gXCJpbmZvXCIgfHwgcyA9PT0gXCJ3YXJuXCIgfHwgcyA9PT0gXCJlcnJvclwiKSByZXR1cm4gcztcclxuICAgIHJldHVybiBcImxvZ1wiO1xyXG59XHJcblxyXG4vKiogRXNjYXBlIGEgc3RyaW5nIHNvIGl0IGNhbiBiZSBlbWJlZGRlZCBpbnRvIGEgUmVnRXhwIGxpdGVyYWxseS4gKi9cclxuZnVuY3Rpb24gZXNjYXBlUmVnZXgoczogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBzLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIHByb2plY3QubG9nIOOBruacq+WwvuOCkuiqreOBv+OAgUNvY29zIENyZWF0b3Ig44GM5pu444GN5Ye644GZIGNvbXBpbGUgZXJyb3IgLyB3YXJuaW5nIC9cclxuICogZ2VuZXJpYyBtZXNzYWdlIOOCkuani+mAoOWMluOCqOODs+ODiOODquOBq+WkieaPm+OBmeOCi+OAglxyXG4gKlxyXG4gKiBDb2NvcyBDcmVhdG9yIOOBjCBwcm9qZWN0LmxvZyDjgavmm7jjgY3lh7rjgZnku6PooajnmoTjgarjg5Hjgr/jg7zjg7M6XHJcbiAqICAgWzExOjIyOjMzXSBbaW5mb10gbWVzc2FnZS4uLlxyXG4gKiAgIFsxMToyMjozM10gW3dhcm5dIG1lc3NhZ2UuLi5cclxuICogICBbMTE6MjI6MzNdIFtlcnJvcl0gbWVzc2FnZS4uLiAoVFMyMzA0OiBDYW5ub3QgZmluZCBuYW1lICdGb28nIOOBquOBqSlcclxuICogICBbU2NlbmVdIFtlcnJvcl0gZmlsZTogYXNzZXRzLy4uLi9Gb28udHMoMTIsNSlcclxuICpcclxuICogRWRpdG9yIOODkOODvOOCuOODp+ODs+OChCBsb2NhbGUg44Gr44KI44KK5pu45byP44Gv5aSJ44KP44KL5Y+v6IO95oCn44GM44GC44KL44Gu44Gn44CB6KGM6aCt44GuXHJcbiAqIGBbdHNdIFtsZXZlbF1gIOODkeOCv+ODvOODs+OBqOOAgWBlcnJvciBUU1xcZCs6YCDjga4gVHlwZVNjcmlwdCDjgqjjg6njg7zjgIFcclxuICogYFtsZXZlbF1gIOWNmOeLrOihjOOBquOBqeikh+aVsOODkeOCv+ODvOODs+OCkuioseWuueOBmeOCi+OAglxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcmVhZFByb2plY3RMb2dUYWlsKG1heEVudHJpZXM6IG51bWJlcik6IFByb21pc2U8QXJyYXk8eyB0aW1lc3RhbXA6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfT4+IHtcclxuICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgY29uc3QgbG9nUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC50bXBEaXIsIFwibG9nc1wiLCBcInByb2plY3QubG9nXCIpO1xyXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSByZXR1cm4gW107XHJcblxyXG4gICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpO1xyXG4gICAgLy8g5pyr5bC+IDI1NktCIOOCkuiqreOCgO+8iGNvbXBpbGUgZXJyb3Ig44Gv5aSn44GN44GP44Gq44GE44Gu44Gn5Y2B5YiG77yJXHJcbiAgICBjb25zdCBSRUFEX0JZVEVTID0gMjU2ICogMTAyNDtcclxuICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoMCwgc3RhdC5zaXplIC0gUkVBRF9CWVRFUyk7XHJcbiAgICBjb25zdCBmZCA9IGZzLm9wZW5TeW5jKGxvZ1BhdGgsIFwiclwiKTtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhzdGF0LnNpemUgLSBzdGFydCk7XHJcbiAgICBmcy5yZWFkU3luYyhmZCwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzdGFydCk7XHJcbiAgICBmcy5jbG9zZVN5bmMoZmQpO1xyXG4gICAgY29uc3QgdGV4dCA9IGJ1ZmZlci50b1N0cmluZyhcInV0ZjhcIik7XHJcblxyXG4gICAgY29uc3QgbGluZXMgPSB0ZXh0LnNwbGl0KC9cXHI/XFxuLyk7XHJcbiAgICAvLyDpg6jliIbooYzvvIjlhYjpoK3ooYzjga/liIfjgozjgabjgYTjgovlj6/og73mgKfvvInjgpLmjajjgabjgotcclxuICAgIGlmIChzdGFydCA+IDAgJiYgbGluZXMubGVuZ3RoID4gMCkgbGluZXMuc2hpZnQoKTtcclxuXHJcbiAgICBjb25zdCBlbnRyaWVzOiBBcnJheTx7IHRpbWVzdGFtcDogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZzsgc3RhY2t0cmFjZT86IHN0cmluZyB9PiA9IFtdO1xyXG4gICAgY29uc3QgbGluZVJlID0gL15cXFsoXFxkezJ9OlxcZHsyfTpcXGR7Mn0oPzpcXC5cXGQrKT8pXFxdXFxzKig/OlxcWyhbXlxcXV0rKVxcXSk/XFxzKlxcWz8obG9nfGluZm98d2Fybnx3YXJuaW5nfGVycm9yKVxcXT9cXHMqKC4qKSQvaTtcclxuICAgIGNvbnN0IHRzRXJyUmUgPSAvXFxiZXJyb3JcXHMrVFNcXGQrOlxccyovaTtcclxuICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IGlzb0RhdGUgPSB0b2RheS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxuXHJcbiAgICBsZXQgcGVuZGluZzogeyB0aW1lc3RhbXA6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfSB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIGZvciAoY29uc3QgcmF3IG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3QgbGluZSA9IHJhdy5yZXBsYWNlKC9cdTAwMWJcXFtbMC05O10qbS9nLCBcIlwiKTsgLy8gc3RyaXAgQU5TSSBjb2xvciBjb2Rlc1xyXG4gICAgICAgIGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBjb25zdCBtID0gbGluZS5tYXRjaChsaW5lUmUpO1xyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSBlbnRyaWVzLnB1c2gocGVuZGluZyk7XHJcbiAgICAgICAgICAgIGNvbnN0IFssIHRpbWUsIHRhZywgbGV2ZWwsIGJvZHldID0gbTtcclxuICAgICAgICAgICAgY29uc3QgdHMgPSBgJHtpc29EYXRlfVQke3RpbWV9JHt0aW1lLmxlbmd0aCA9PT0gOCA/IFwiLjAwMFwiIDogXCJcIn1aYDtcclxuICAgICAgICAgICAgcGVuZGluZyA9IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdHMsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGxldmVsKSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHRhZyA/IGBbJHt0YWd9XSAke2JvZHl9YCA6IGJvZHksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIGlmICh0c0VyclJlLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgICAgLy8gVHlwZVNjcmlwdCDjgqjjg6njg7zljZjni6zooYzvvIjjgr/jgqTjg6Djgrnjgr/jg7Pjg5fjgarjgZfvvIlcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIGVudHJpZXMucHVzaChwZW5kaW5nKTtcclxuICAgICAgICAgICAgcGVuZGluZyA9IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbGluZS50cmltKCksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIGlmIChwZW5kaW5nKSB7XHJcbiAgICAgICAgICAgIC8vIOe2mee2muihjCDigJQgc3RhY2t0cmFjZSDjgavov73liqBcclxuICAgICAgICAgICAgcGVuZGluZy5zdGFja3RyYWNlID0gcGVuZGluZy5zdGFja3RyYWNlID8gYCR7cGVuZGluZy5zdGFja3RyYWNlfVxcbiR7bGluZX1gIDogbGluZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAocGVuZGluZykgZW50cmllcy5wdXNoKHBlbmRpbmcpO1xyXG5cclxuICAgIC8vIOacq+WwviBtYXhFbnRyaWVzIOS7tlxyXG4gICAgcmV0dXJuIGVudHJpZXMuc2xpY2UoLW1heEVudHJpZXMpO1xyXG59XHJcbiJdfQ==