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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBdUM7QUFDdkMsOENBQStGO0FBQy9GLG9DQUEwQztBQUMxQywrQ0FBd0Q7QUFDeEQsOENBQW1FO0FBRW5FLE1BQWEsVUFBVTtJQUF2QjtRQUNhLGlCQUFZLEdBQUcsT0FBTyxDQUFDO0lBMjhCcEMsQ0FBQztJQXo4QkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixXQUFXLEVBQUUscUVBQXFFO2dCQUNsRixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7YUFDbEQ7WUFDRDtnQkFDSSxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixXQUFXLEVBQUUsMEVBQTBFO2dCQUN2RixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdEQUF3RCxFQUFFO3FCQUNwRztvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsa0ZBQWtGO2dCQUMvRixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJCQUEyQixFQUFFO3dCQUNwRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO3FCQUN2RTtvQkFDRCxRQUFRLEVBQUUs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VSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN0RixDQUFDO0lBQ0wsQ0FBQztJQUNELElBQUksT0FBTztRQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFbkMsa0JBQWtCO0lBQ2xCLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3RDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sQ2F0ZWdvcnksIFRvb2xEZWZpbml0aW9uLCBUb29sUmVzdWx0IH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IG9rLCBlcnIgfSBmcm9tIFwiLi4vdG9vbC1iYXNlXCI7XHJcbmltcG9ydCB7IGdldEdhbWVMb2dzLCBjbGVhckdhbWVMb2dzLCBxdWV1ZUdhbWVDb21tYW5kLCBnZXRDb21tYW5kUmVzdWx0IH0gZnJvbSBcIi4uL21jcC1zZXJ2ZXJcIjtcclxuaW1wb3J0IHsgcGFyc2VNYXliZUpzb24gfSBmcm9tIFwiLi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgZW5zdXJlU2NlbmVTYWZlVG9Td2l0Y2ggfSBmcm9tIFwiLi9zY2VuZS10b29sc1wiO1xyXG5pbXBvcnQgeyBwcm9jZXNzSW1hZ2UsIHRha2VFZGl0b3JTY3JlZW5zaG90IH0gZnJvbSBcIi4uL3NjcmVlbnNob3RcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEZWJ1Z1Rvb2xzIGltcGxlbWVudHMgVG9vbENhdGVnb3J5IHtcclxuICAgIHJlYWRvbmx5IGNhdGVnb3J5TmFtZSA9IFwiZGVidWdcIjtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dldF9lZGl0b3JfaW5mb1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2V0IENvY29zIENyZWF0b3IgZWRpdG9yIGluZm9ybWF0aW9uICh2ZXJzaW9uLCBwbGF0Zm9ybSwgbGFuZ3VhZ2UpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19saXN0X21lc3NhZ2VzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMaXN0IGF2YWlsYWJsZSBFZGl0b3IgbWVzc2FnZXMgZm9yIGEgZ2l2ZW4gZXh0ZW5zaW9uIG9yIGJ1aWx0LWluIG1vZHVsZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJNZXNzYWdlIHRhcmdldCAoZS5nLiAnc2NlbmUnLCAnYXNzZXQtZGInLCAnZXh0ZW5zaW9uJylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInRhcmdldFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZXhlY3V0ZV9zY3JpcHRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkV4ZWN1dGUgYSBjdXN0b20gc2NlbmUgc2NyaXB0IG1ldGhvZC4gVGhlIG1ldGhvZCBtdXN0IGJlIHJlZ2lzdGVyZWQgaW4gc2NlbmUudHMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTWV0aG9kIG5hbWUgZnJvbSBzY2VuZS50c1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHsgdHlwZTogXCJhcnJheVwiLCBkZXNjcmlwdGlvbjogXCJBcmd1bWVudHMgdG8gcGFzc1wiLCBpdGVtczoge30gfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJtZXRob2RcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dldF9jb25zb2xlX2xvZ3NcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIltERVBSRUNBVEVEIHYyLjAuMCDigJQgdXNlIHJlYWRfY29uc29sZSBpbnN0ZWFkXSBHZXQgcmVjZW50IGNvbnNvbGUgbG9nIGVudHJpZXMuIEF1dG9tYXRpY2FsbHkgY2FwdHVyZXMgc2NlbmUgcHJvY2VzcyBsb2dzIChjb25zb2xlLmxvZy93YXJuL2Vycm9yIGluIHNjZW5lIHNjcmlwdHMpLiBHYW1lIHByZXZpZXcgbG9ncyBjYW4gYWxzbyBiZSBjYXB0dXJlZCBieSBzZW5kaW5nIFBPU1QgcmVxdWVzdHMgdG8gL2xvZyBlbmRwb2ludCDigJQgc2VlIFJFQURNRSBmb3Igc2V0dXAuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggbnVtYmVyIG9mIGVudHJpZXMgKGRlZmF1bHQgNTApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRmlsdGVyIGJ5IGxldmVsOiAnbG9nJywgJ3dhcm4nLCBvciAnZXJyb3InXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkZpbHRlciBieSBzb3VyY2U6ICdzY2VuZScgb3IgJ2dhbWUnLiBSZXR1cm5zIGJvdGggaWYgb21pdHRlZC5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2NsZWFyX2NvbnNvbGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIltERVBSRUNBVEVEIHYyLjAuMCDigJQgdXNlIHJlYWRfY29uc29sZSB3aXRoIGFjdGlvbj0nY2xlYXInXSBDbGVhciB0aGUgZWRpdG9yIGNvbnNvbGUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInJlYWRfY29uc29sZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVhZCBFZGl0b3IgLyBTY2VuZSAvIEdhbWUgY29uc29sZSBsb2dzIGluIG9uZSB0b29sLiBDYXB0dXJlcyBjb21waWxlIGVycm9ycyAoZnJvbSBFZGl0b3IgLyBwcm9qZWN0LmxvZyksIHJ1bnRpbWUgZXJyb3JzLCBhbmQgY29uc29sZS5sb2cgb3V0cHV0IGFjcm9zcyBhbGwgc291cmNlcy4gU3VwcG9ydHMgYWN0aW9uPSdnZXQnIChkZWZhdWx0KSBhbmQgYWN0aW9uPSdjbGVhcicuIFJlcGxhY2VzIGRlYnVnX2dldF9jb25zb2xlX2xvZ3MgLyBkZWJ1Z19jbGVhcl9jb25zb2xlIGluIHYyLjAuMC5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInZ2V0JyAoZGVmYXVsdCkgb3IgJ2NsZWFyJy5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRmlsdGVyIGJ5IGVudHJ5IHR5cGUuIEFueSBvZiAnbG9nJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcicuIFJldHVybnMgYWxsIHR5cGVzIGlmIG9taXR0ZWQuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkZpbHRlciBieSBzb3VyY2UuIEFueSBvZiAnZWRpdG9yJyB8ICdzY2VuZScgfCAnZ2FtZScuIERlZmF1bHQ6IGFsbCB0aHJlZS5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IGVudHJpZXMgdG8gcmV0dXJuIGFmdGVyIG1lcmdlIChkZWZhdWx0IDUwKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlU3RhY2t0cmFjZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSW5jbHVkZSBzdGFja3RyYWNlIHN0cmluZ3MgaWYgYXZhaWxhYmxlIChkZWZhdWx0IGZhbHNlKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaW5jZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJJU08gdGltZXN0YW1wIOKAlCByZXR1cm4gb25seSBlbnRyaWVzIG5ld2VyIHRoYW4gdGhpcyAob3B0aW9uYWwpLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTdWJzdHJpbmcgb3IgcmVnZXggcGF0dGVybiB0byBmaWx0ZXIgbWVzc2FnZXMgKG9wdGlvbmFsKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2xpc3RfZXh0ZW5zaW9uc1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTGlzdCBhbGwgaW5zdGFsbGVkIGV4dGVuc2lvbnMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dldF9wcm9qZWN0X2xvZ3NcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlYWQgcmVjZW50IHByb2plY3QgbG9nIGVudHJpZXMgZnJvbSB0aGUgbG9nIGZpbGUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lczogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJOdW1iZXIgb2YgbGluZXMgdG8gcmVhZCAoZGVmYXVsdCAxMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19zZWFyY2hfcHJvamVjdF9sb2dzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTZWFyY2ggZm9yIGEgcGF0dGVybiBpbiBwcm9qZWN0IGxvZ3MuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlNlYXJjaCBwYXR0ZXJuIChyZWdleCBzdXBwb3J0ZWQpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJwYXR0ZXJuXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19nZXRfbG9nX2ZpbGVfaW5mb1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2V0IGluZm9ybWF0aW9uIGFib3V0IHRoZSBwcm9qZWN0IGxvZyBmaWxlIChzaXplLCBwYXRoLCBsYXN0IG1vZGlmaWVkKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIOKUgOKUgCDku6XkuIvjgIHml6LlrZhNQ1DmnKrlr77lv5zjga5FZGl0b3IgQVBJIOKUgOKUgFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3F1ZXJ5X2RldmljZXNcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxpc3QgY29ubmVjdGVkIGRldmljZXMgKGZvciBuYXRpdmUgZGVidWdnaW5nKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfb3Blbl91cmxcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk9wZW4gYSBVUkwgaW4gdGhlIHN5c3RlbSBicm93c2VyIGZyb20gdGhlIGVkaXRvci5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHVybDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJVUkwgdG8gb3BlblwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1widXJsXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z192YWxpZGF0ZV9zY2VuZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVmFsaWRhdGUgdGhlIGN1cnJlbnQgc2NlbmUgZm9yIGNvbW1vbiBpc3N1ZXMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dhbWVfY29tbWFuZFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2VuZCBhIGNvbW1hbmQgdG8gdGhlIHJ1bm5pbmcgZ2FtZSBwcmV2aWV3LiBSZXF1aXJlcyBHYW1lRGVidWdDbGllbnQgaW4gdGhlIGdhbWUuIENvbW1hbmRzOiAnc2NyZWVuc2hvdCcgKGNhcHR1cmUgZ2FtZSBjYW52YXMpLCAnc3RhdGUnIChkdW1wIEdhbWVEYiksICduYXZpZ2F0ZScgKGdvIHRvIGEgcGFnZSksICdjbGljaycgKGNsaWNrIGEgbm9kZSBieSBuYW1lKSwgJ2luc3BlY3QnIChnZXQgcnVudGltZSBub2RlIGluZm86IFVJVHJhbnNmb3JtIHNpemVzLCBXaWRnZXQsIExheW91dCwgcG9zaXRpb24pLiBSZXR1cm5zIHRoZSByZXN1bHQgZnJvbSB0aGUgZ2FtZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tbWFuZCB0eXBlOiAnc2NyZWVuc2hvdCcsICdzdGF0ZScsICduYXZpZ2F0ZScsICdjbGljaycsICdpbnNwZWN0J1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHsgdHlwZTogXCJvYmplY3RcIiwgZGVzY3JpcHRpb246IFwiQ29tbWFuZCBhcmd1bWVudHMgKGUuZy4ge3BhZ2U6ICdIb21lUGFnZVZpZXcnfSBmb3IgbmF2aWdhdGUsIHtuYW1lOiAnQnV0dG9uTmFtZSd9IGZvciBjbGljaylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgKGRlZmF1bHQgNTAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhXaWR0aDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2lkdGggZm9yIHNjcmVlbnNob3QgcmVzaXplIChkZWZhdWx0OiA5NjAsIDAgPSBubyByZXNpemUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VGb3JtYXQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU2NyZWVuc2hvdCBvdXRwdXQgZm9ybWF0OiAnd2VicCcgKGRlZmF1bHQsIFE9ODUpIG9yICdwbmcnIChsb3NzbGVzcylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInR5cGVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3NjcmVlbnNob3RcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRha2UgYSBzY3JlZW5zaG90IG9mIHRoZSBlZGl0b3Igd2luZG93IGFuZCBzYXZlIHRvIGEgZmlsZS4gUmV0dXJucyB0aGUgZmlsZSBwYXRoIG9mIHRoZSBzYXZlZCBQTkcuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlUGF0aDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJGaWxlIHBhdGggdG8gc2F2ZSB0aGUgUE5HIChkZWZhdWx0OiB0ZW1wL3NjcmVlbnNob3RzL3NjcmVlbnNob3RfPHRpbWVzdGFtcD4ucG5nKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFdpZHRoOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3aWR0aCBpbiBwaXhlbHMgZm9yIHJlc2l6ZSAoZGVmYXVsdDogOTYwLCAwID0gbm8gcmVzaXplKS4gQXNwZWN0IHJhdGlvIGlzIHByZXNlcnZlZC5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3ByZXZpZXdcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlN0YXJ0IG9yIHN0b3AgdGhlIGdhbWUgcHJldmlldy4gVXNlcyBQcmV2aWV3IGluIEVkaXRvciAoYXV0by1vcGVucyBNYWluU2NlbmUgaWYgbmVlZGVkKS4gRmFsbHMgYmFjayB0byBicm93c2VyIHByZXZpZXcgaWYgZWRpdG9yIHByZXZpZXcgZmFpbHMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ3N0YXJ0JyAoZGVmYXVsdCkgb3IgJ3N0b3AnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlYWR5OiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJJZiB0cnVlLCB3YWl0IHVudGlsIEdhbWVEZWJ1Z0NsaWVudCBjb25uZWN0cyBhZnRlciBzdGFydCAoZGVmYXVsdDogZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdFRpbWVvdXQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdhaXQgdGltZSBpbiBtcyBmb3Igd2FpdEZvclJlYWR5IChkZWZhdWx0OiAxNTAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2NsZWFyX2NvZGVfY2FjaGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNsZWFyIHRoZSBjb2RlIGNhY2hlIChlcXVpdmFsZW50IHRvIERldmVsb3BlciA+IENhY2hlID4gQ2xlYXIgY29kZSBjYWNoZSkgYW5kIHNvZnQtcmVsb2FkIHRoZSBzY2VuZS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfcmVsb2FkX2V4dGVuc2lvblwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVsb2FkIHRoZSBNQ1AgZXh0ZW5zaW9uIGl0c2VsZi4gVXNlIGFmdGVyIG5wbSBydW4gYnVpbGQgdG8gYXBwbHkgY29kZSBjaGFuZ2VzIHdpdGhvdXQgcmVzdGFydGluZyBDb2Nvc0NyZWF0b3IuIFJlc3BvbnNlIGlzIHNlbnQgYmVmb3JlIHJlbG9hZCBzdGFydHMuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2dldF9leHRlbnNpb25faW5mb1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2V0IGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IGEgc3BlY2lmaWMgZXh0ZW5zaW9uLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJFeHRlbnNpb24gbmFtZVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wibmFtZVwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfcmVjb3JkX3N0YXJ0XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTdGFydCByZWNvcmRpbmcgdGhlIGdhbWUgcHJldmlldyBjYW52YXMgdG8gYSB2aWRlbyBmaWxlLiBVc2VzIE1lZGlhUmVjb3JkZXIgb24gdGhlIGdhbWUgc2lkZS4gQml0cmF0ZSBpcyBhdXRvLWNhbGN1bGF0ZWQgZnJvbSBjYW52YXMgcmVzb2x1dGlvbiDDlyBmcHMgw5cgcXVhbGl0eSBjb2VmZmljaWVudCB1bmxlc3MgdmlkZW9CaXRzUGVyU2Vjb25kIGlzIHNldCBleHBsaWNpdGx5LlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnBzOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIkZyYW1lcyBwZXIgc2Vjb25kIChkZWZhdWx0OiAzMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidsb3cnLydtZWRpdW0nLydoaWdoJy8ndWx0cmEnIChkZWZhdWx0OiBtZWRpdW0pLiBDb2VmZmljaWVudHM6IDAuMTUvMC4yNS8wLjQwLzAuNjBcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2VmZmljaWVudDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJDdXN0b20gYml0cmF0ZSBjb2VmZmljaWVudCAod2lkdGggw5cgaGVpZ2h0IMOXIGZwcyDDlyBjb2VmZmljaWVudCkuIE92ZXJyaWRlcyBxdWFsaXR5LlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvQml0c1BlclNlY29uZDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJFeHBsaWNpdCBiaXRyYXRlIGluIGJwcy4gT3ZlcnJpZGVzIHF1YWxpdHktYmFzZWQgY2FsY3VsYXRpb24uXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidtcDQnIChkZWZhdWx0KSBvciAnd2VibScuIG1wNCBmYWxscyBiYWNrIHRvIHdlYm0gaWYgbm90IHN1cHBvcnRlZC5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlUGF0aDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTYXZlIGRpcmVjdG9yeSAocHJvamVjdC1yZWxhdGl2ZSBvciBhYnNvbHV0ZSkuIERlZmF1bHQ6IHRlbXAvcmVjb3JkaW5nc1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfcmVjb3JkX3N0b3BcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlN0b3AgcmVjb3JkaW5nIHN0YXJ0ZWQgYnkgZGVidWdfcmVjb3JkX3N0YXJ0LiBSZXR1cm5zIHRoZSBzYXZlZCBXZWJNIGZpbGUgcGF0aCBhbmQgc2l6ZS4gVmlkZW8gaXMgc2F2ZWQgdG8gcHJvamVjdCdzIHRlbXAvcmVjb3JkaW5ncy9yZWNfPGRhdGV0aW1lPi53ZWJtLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2FpdCB0aW1lIGluIG1zIGZvciBmaWxlIHVwbG9hZCAoZGVmYXVsdDogMzAwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19iYXRjaF9zY3JlZW5zaG90XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOYXZpZ2F0ZSB0byBtdWx0aXBsZSBwYWdlcyBhbmQgdGFrZSBhIHNjcmVlbnNob3Qgb2YgZWFjaC4gUmVxdWlyZXMgZ2FtZSBwcmV2aWV3IHJ1bm5pbmcgd2l0aCBHYW1lRGVidWdDbGllbnQuIFJldHVybnMgYW4gYXJyYXkgb2Ygc2NyZWVuc2hvdCBmaWxlIHBhdGhzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxpc3Qgb2YgcGFnZSBuYW1lcyB0byBzY3JlZW5zaG90IChlLmcuIFsnSG9tZVBhZ2VWaWV3JywgJ1Nob3BQYWdlVmlldyddKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheTogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJEZWxheSBpbiBtcyBiZXR3ZWVuIG5hdmlnYXRlIGFuZCBzY3JlZW5zaG90IChkZWZhdWx0OiAxMDAwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFdpZHRoOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3aWR0aCBmb3Igc2NyZWVuc2hvdCByZXNpemUgKGRlZmF1bHQ6IDk2MClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInBhZ2VzXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z193YWl0X2NvbXBpbGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIldhaXQgZm9yIFR5cGVTY3JpcHQgY29tcGlsYXRpb24gdG8gY29tcGxldGUuIE1vbml0b3JzIHRoZSBwYWNrZXItZHJpdmVyIGRlYnVnIGxvZyBmb3IgJ1RhcmdldChlZGl0b3IpIGVuZHMnIG1lc3NhZ2UuIFVzZSBhZnRlciBtb2RpZnlpbmcgLnRzIGZpbGVzIHRvIGVuc3VyZSBjaGFuZ2VzIGFyZSBjb21waWxlZCBiZWZvcmUgb3BlcmF0aW5nIG9uIFByZWZhYnMuIFdpdGggY2xlYW49dHJ1ZSwgZGVsZXRlcyBjb21waWxlZCBvdXRwdXQgZmlyc3QgdG8gZm9yY2UgYSBmcmVzaCByZWNvbXBpbGUgKHNsb3dlciBidXQgZ3VhcmFudGVlZCkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgKGRlZmF1bHQ6IDE1MDAwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFuOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJJZiB0cnVlLCBkZWxldGUgY29tcGlsZWQgb3V0cHV0IGZpcnN0IHRvIGZvcmNlIGZyZXNoIHJlY29tcGlsZSAoZGVmYXVsdDogZmFsc2UpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19nZXRfZWRpdG9yX2luZm9cIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFZGl0b3JJbmZvKCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfbGlzdF9tZXNzYWdlc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxpc3RNZXNzYWdlcyhhcmdzLnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZXhlY3V0ZV9zY3JpcHRcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NyaXB0KGFyZ3MubWV0aG9kLCBhcmdzLmFyZ3MgfHwgW10pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dldF9jb25zb2xlX2xvZ3NcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb25zb2xlTG9ncyhhcmdzLmNvdW50IHx8IDUwLCBhcmdzLmxldmVsLCBhcmdzLnNvdXJjZSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVhZF9jb25zb2xlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVhZENvbnNvbGUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IGFyZ3MuYWN0aW9uIHx8IFwiZ2V0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzOiBwYXJzZU1heWJlSnNvbihhcmdzLnR5cGVzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlczogcGFyc2VNYXliZUpzb24oYXJncy5zb3VyY2VzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IGFyZ3MuY291bnQgfHwgNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVTdGFja3RyYWNlOiBhcmdzLmluY2x1ZGVTdGFja3RyYWNlID8/IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaW5jZTogYXJncy5zaW5jZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBhcmdzLnNlYXJjaCxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19jbGVhcl9jb25zb2xlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2Uuc2VuZChcImNvbnNvbGVcIiwgXCJjbGVhclwiKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBzY2VuZSBwcm9jZXNzIGxvZyBidWZmZXJcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcImNsZWFyQ29uc29sZUxvZ3NcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge30pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGdhbWUgcHJldmlldyBsb2cgYnVmZmVyXHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJHYW1lTG9ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfbGlzdF9leHRlbnNpb25zXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlzdEV4dGVuc2lvbnMoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19nZXRfcHJvamVjdF9sb2dzXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvamVjdExvZ3MoYXJncy5saW5lcyB8fCAxMDApO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3NlYXJjaF9wcm9qZWN0X2xvZ3NcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZWFyY2hQcm9qZWN0TG9ncyhhcmdzLnBhdHRlcm4pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2dldF9sb2dfZmlsZV9pbmZvXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TG9nRmlsZUluZm8oKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19xdWVyeV9kZXZpY2VzXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImRldmljZVwiLCBcInF1ZXJ5XCIpLmNhdGNoKCgpID0+IFtdKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBkZXZpY2VzIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX29wZW5fdXJsXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInByb2dyYW1cIiwgXCJvcGVuLXVybFwiLCBhcmdzLnVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgdXJsOiBhcmdzLnVybCB9KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19nYW1lX2NvbW1hbmRcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nYW1lQ29tbWFuZChhcmdzLnR5cGUgfHwgYXJncy5jb21tYW5kLCBwYXJzZU1heWJlSnNvbihhcmdzLmFyZ3MpLCBhcmdzLnRpbWVvdXQgfHwgNTAwMCwgYXJncy5tYXhXaWR0aCwgYXJncy5pbWFnZUZvcm1hdCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfc2NyZWVuc2hvdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRha2VTY3JlZW5zaG90KGFyZ3Muc2F2ZVBhdGgsIGFyZ3MubWF4V2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3ByZXZpZXdcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVQcmV2aWV3KGFyZ3MuYWN0aW9uIHx8IFwic3RhcnRcIiwgYXJncy53YWl0Rm9yUmVhZHksIGFyZ3Mud2FpdFRpbWVvdXQgfHwgMTUwMDApO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2NsZWFyX2NvZGVfY2FjaGVcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbGVhckNvZGVDYWNoZSgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3JlbG9hZF9leHRlbnNpb25cIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZWxvYWRFeHRlbnNpb24oKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z192YWxpZGF0ZV9zY2VuZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlU2NlbmUoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19nZXRfZXh0ZW5zaW9uX2luZm9cIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRlbnNpb25JbmZvKGFyZ3MubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfYmF0Y2hfc2NyZWVuc2hvdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmJhdGNoU2NyZWVuc2hvdChhcmdzLnBhZ2VzLCBhcmdzLmRlbGF5IHx8IDEwMDAsIGFyZ3MubWF4V2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3JlY29yZF9zdGFydFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdhbWVDb21tYW5kKFwicmVjb3JkX3N0YXJ0XCIsIHsgZnBzOiBhcmdzLmZwcywgcXVhbGl0eTogYXJncy5xdWFsaXR5LCBjb2VmZmljaWVudDogYXJncy5jb2VmZmljaWVudCwgdmlkZW9CaXRzUGVyU2Vjb25kOiBhcmdzLnZpZGVvQml0c1BlclNlY29uZCwgZm9ybWF0OiBhcmdzLmZvcm1hdCwgc2F2ZVBhdGg6IGFyZ3Muc2F2ZVBhdGggfSwgNTAwMCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfcmVjb3JkX3N0b3BcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nYW1lQ29tbWFuZChcInJlY29yZF9zdG9wXCIsIHVuZGVmaW5lZCwgYXJncy50aW1lb3V0IHx8IDMwMDAwKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z193YWl0X2NvbXBpbGVcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53YWl0Q29tcGlsZShhcmdzLnRpbWVvdXQgfHwgMTUwMDAsIGFyZ3MuY2xlYW4gPz8gZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRFZGl0b3JJbmZvKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHJldHVybiBvayh7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb246IEVkaXRvci5BcHAudmVyc2lvbixcclxuICAgICAgICAgICAgcGF0aDogRWRpdG9yLkFwcC5wYXRoLFxyXG4gICAgICAgICAgICBob21lOiBFZGl0b3IuQXBwLmhvbWUsXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiBFZGl0b3IuSTE4bj8uZ2V0TGFuZ3VhZ2U/LigpIHx8IFwidW5rbm93blwiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbGlzdE1lc3NhZ2VzKHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJleHRlbnNpb25cIiwgXCJxdWVyeS1pbmZvXCIsIHRhcmdldCk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHRhcmdldCwgaW5mbyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgY29uc3Qga25vd25NZXNzYWdlczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG4gICAgICAgICAgICAgICAgXCJzY2VuZVwiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1ub2RlLXRyZWVcIiwgXCJjcmVhdGUtbm9kZVwiLCBcInJlbW92ZS1ub2RlXCIsIFwiZHVwbGljYXRlLW5vZGVcIixcclxuICAgICAgICAgICAgICAgICAgICBcInNldC1wcm9wZXJ0eVwiLCBcImNyZWF0ZS1wcmVmYWJcIiwgXCJzYXZlLXNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIixcclxuICAgICAgICAgICAgICAgICAgICBcInF1ZXJ5LWlzLWRpcnR5XCIsIFwicXVlcnktY2xhc3Nlc1wiLCBcInNvZnQtcmVsb2FkXCIsIFwic25hcHNob3RcIixcclxuICAgICAgICAgICAgICAgICAgICBcImNoYW5nZS1naXptby10b29sXCIsIFwicXVlcnktZ2l6bW8tdG9vbC1uYW1lXCIsIFwiZm9jdXMtY2FtZXJhLW9uLW5vZGVzXCIsXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgXCJhc3NldC1kYlwiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1hc3NldHNcIiwgXCJxdWVyeS1hc3NldC1pbmZvXCIsIFwicXVlcnktYXNzZXQtbWV0YVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwicmVmcmVzaC1hc3NldFwiLCBcInNhdmUtYXNzZXRcIiwgXCJjcmVhdGUtYXNzZXRcIiwgXCJkZWxldGUtYXNzZXRcIixcclxuICAgICAgICAgICAgICAgICAgICBcIm1vdmUtYXNzZXRcIiwgXCJjb3B5LWFzc2V0XCIsIFwib3Blbi1hc3NldFwiLCBcInJlaW1wb3J0LWFzc2V0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1wYXRoXCIsIFwicXVlcnktdXVpZFwiLCBcInF1ZXJ5LXVybFwiLCBcInF1ZXJ5LWFzc2V0LWRlcGVuZHNcIixcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0ga25vd25NZXNzYWdlc1t0YXJnZXRdO1xyXG4gICAgICAgICAgICBpZiAobWVzc2FnZXMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHRhcmdldCwgbWVzc2FnZXMsIG5vdGU6IFwiU3RhdGljIGxpc3QgKHF1ZXJ5IGZhaWxlZClcIiB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY3JpcHQobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgYXJncyxcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldENvbnNvbGVMb2dzKGNvdW50OiBudW1iZXIsIGxldmVsPzogc3RyaW5nLCBzb3VyY2U/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICAvLyAxLiBUcnkgRWRpdG9yJ3MgbmF0aXZlIGNvbnNvbGUgQVBJIGZpcnN0IChtYXkgYmUgc3VwcG9ydGVkIGluIGZ1dHVyZSBDb2Nvc0NyZWF0b3IgdmVyc2lvbnMpXHJcbiAgICAgICAgaWYgKCFzb3VyY2UpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ3MgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiY29uc29sZVwiLCBcInF1ZXJ5LWxhc3QtbG9nc1wiLCBjb3VudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsb2dzKSAmJiBsb2dzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBsb2dzLCBzb3VyY2U6IFwiZWRpdG9yLWFwaVwiLCBub3RlOiBcIlVzaW5nIG5hdGl2ZSBFZGl0b3IgY29uc29sZSBBUElcIiB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIE5vdCBzdXBwb3J0ZWQgaW4gdGhpcyB2ZXJzaW9uIOKAlCB1c2UgZmFsbGJhY2sgKi8gfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gRmFsbGJhY2s6IGNvbGxlY3QgZnJvbSBzY2VuZSBwcm9jZXNzIGJ1ZmZlciArIGdhbWUgcHJldmlldyBidWZmZXJcclxuICAgICAgICBsZXQgc2NlbmVMb2dzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGxldCBnYW1lTG9nczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgLy8gMmEuIFNjZW5lIHByb2Nlc3MgbG9ncyAoY29uc29sZSB3cmFwcGVyIGluIHNjZW5lLnRzKVxyXG4gICAgICAgIGlmICghc291cmNlIHx8IHNvdXJjZSA9PT0gXCJzY2VuZVwiKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJnZXRDb25zb2xlTG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtjb3VudCAqIDIsIGxldmVsXSwgLy8gcmVxdWVzdCBtb3JlLCB3aWxsIHRyaW0gYWZ0ZXIgbWVyZ2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdD8ubG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lTG9ncyA9IHJlc3VsdC5sb2dzLm1hcCgobDogYW55KSA9PiAoeyAuLi5sLCBzb3VyY2U6IFwic2NlbmVcIiB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBzY2VuZSBub3QgYXZhaWxhYmxlICovIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDJiLiBHYW1lIHByZXZpZXcgbG9ncyAocmVjZWl2ZWQgdmlhIFBPU1QgL2xvZyBlbmRwb2ludClcclxuICAgICAgICBpZiAoIXNvdXJjZSB8fCBzb3VyY2UgPT09IFwiZ2FtZVwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdhbWVSZXN1bHQgPSBnZXRHYW1lTG9ncyhjb3VudCAqIDIsIGxldmVsKTtcclxuICAgICAgICAgICAgZ2FtZUxvZ3MgPSBnYW1lUmVzdWx0LmxvZ3MubWFwKChsOiBhbnkpID0+ICh7IC4uLmwsIHNvdXJjZTogXCJnYW1lXCIgfSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gTWVyZ2UgYW5kIHNvcnQgYnkgdGltZXN0YW1wLCB0YWtlIGxhc3QgYGNvdW50YFxyXG4gICAgICAgIGNvbnN0IG1lcmdlZCA9IFsuLi5zY2VuZUxvZ3MsIC4uLmdhbWVMb2dzXVxyXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS50aW1lc3RhbXAubG9jYWxlQ29tcGFyZShiLnRpbWVzdGFtcCkpXHJcbiAgICAgICAgICAgIC5zbGljZSgtY291bnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBsb2dzOiBtZXJnZWQsXHJcbiAgICAgICAgICAgIHRvdGFsOiB7IHNjZW5lOiBzY2VuZUxvZ3MubGVuZ3RoLCBnYW1lOiAoc291cmNlID09PSBcInNjZW5lXCIgPyAwIDogZ2FtZUxvZ3MubGVuZ3RoKSB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVhZENvbnNvbGUob3B0czoge1xyXG4gICAgICAgIGFjdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHR5cGVzPzogc3RyaW5nW107XHJcbiAgICAgICAgc291cmNlcz86IHN0cmluZ1tdO1xyXG4gICAgICAgIGNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgaW5jbHVkZVN0YWNrdHJhY2U6IGJvb2xlYW47XHJcbiAgICAgICAgc2luY2U/OiBzdHJpbmc7XHJcbiAgICAgICAgc2VhcmNoPzogc3RyaW5nO1xyXG4gICAgfSk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGFsbG93ZWRTb3VyY2VzID0gbmV3IFNldChbXCJlZGl0b3JcIiwgXCJzY2VuZVwiLCBcImdhbWVcIl0pO1xyXG4gICAgICAgIGNvbnN0IHNvdXJjZXMgPSAob3B0cy5zb3VyY2VzICYmIG9wdHMuc291cmNlcy5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICA/IG9wdHMuc291cmNlcy5maWx0ZXIocyA9PiBhbGxvd2VkU291cmNlcy5oYXMocykpXHJcbiAgICAgICAgICAgIDogW1wiZWRpdG9yXCIsIFwic2NlbmVcIiwgXCJnYW1lXCJdO1xyXG5cclxuICAgICAgICBpZiAob3B0cy5hY3Rpb24gPT09IFwiY2xlYXJcIikge1xyXG4gICAgICAgICAgICBjb25zdCBjbGVhcmVkOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcImVkaXRvclwiKSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHsgRWRpdG9yLk1lc3NhZ2Uuc2VuZChcImNvbnNvbGVcIiwgXCJjbGVhclwiKTsgY2xlYXJlZC5wdXNoKFwiZWRpdG9yXCIpOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcInNjZW5lXCIpKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiY2xlYXJDb25zb2xlTG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjbGVhcmVkLnB1c2goXCJzY2VuZVwiKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBzY2VuZSBub3QgYXZhaWxhYmxlICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcImdhbWVcIikpIHtcclxuICAgICAgICAgICAgICAgIGNsZWFyR2FtZUxvZ3MoKTtcclxuICAgICAgICAgICAgICAgIGNsZWFyZWQucHVzaChcImdhbWVcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcImNsZWFyXCIsIGNsZWFyZWQgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0cy5hY3Rpb24gIT09IFwiZ2V0XCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biBhY3Rpb246ICR7b3B0cy5hY3Rpb259LiBFeHBlY3RlZCAnZ2V0JyBvciAnY2xlYXInLmApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllczogQXJyYXk8eyB0aW1lc3RhbXA6IHN0cmluZzsgc291cmNlOiBzdHJpbmc7IHR5cGU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nOyBzdGFja3RyYWNlPzogc3RyaW5nIH0+ID0gW107XHJcblxyXG4gICAgICAgIC8vIHNjZW5lIHNvdXJjZVxyXG4gICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwic2NlbmVcIikpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcImdldENvbnNvbGVMb2dzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW29wdHMuY291bnQgKiAyLCB1bmRlZmluZWRdLCAvLyByZXF1ZXN0IG1vcmUsIGZpbHRlciBhZnRlciBtZXJnZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0Py5sb2dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBsIG9mIHJlc3VsdC5sb2dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJpZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IGwudGltZXN0YW1wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcInNjZW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGwubGV2ZWwpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbC5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2t0cmFjZTogbC5zdGFja3RyYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBzY2VuZSBub3QgYXZhaWxhYmxlICovIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGdhbWUgc291cmNlXHJcbiAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJnYW1lXCIpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdhbWVSZXN1bHQgPSBnZXRHYW1lTG9ncyhvcHRzLmNvdW50ICogMik7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgbCBvZiBnYW1lUmVzdWx0LmxvZ3MpIHtcclxuICAgICAgICAgICAgICAgIGVudHJpZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBsLnRpbWVzdGFtcCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwiZ2FtZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vcm1hbGl6ZVR5cGUobC5sZXZlbCksXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbC5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrdHJhY2U6IChsIGFzIGFueSkuc3RhY2t0cmFjZSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBlZGl0b3Igc291cmNlXHJcbiAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJlZGl0b3JcIikpIHtcclxuICAgICAgICAgICAgbGV0IHZpYUFwaSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAvLyAxLiBUcnkgbmF0aXZlIGNvbnNvbGUgQVBJIGZpcnN0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImNvbnNvbGVcIiwgXCJxdWVyeS1sYXN0LWxvZ3NcIiwgb3B0cy5jb3VudCAqIDIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobG9ncykgJiYgbG9ncy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlhQXBpID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGwgb2YgbG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBsLnRpbWVzdGFtcCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwiZWRpdG9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGwudHlwZSB8fCBsLmxldmVsKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGwubWVzc2FnZSB8fCBTdHJpbmcobCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja3RyYWNlOiBsLnN0YWNrIHx8IGwuc3RhY2t0cmFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogbm90IHN1cHBvcnRlZCBpbiB0aGlzIHZlcnNpb24g4oaSIGZhbGxiYWNrICovIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDIuIEZhbGxiYWNrOiBwYXJzZSBwcm9qZWN0LmxvZyB0YWlsIGZvciBjb21waWxlIGVycm9yIC8gd2FybmluZyBwYXR0ZXJuc1xyXG4gICAgICAgICAgICBpZiAoIXZpYUFwaSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBhd2FpdCByZWFkUHJvamVjdExvZ1RhaWwob3B0cy5jb3VudCAqIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZSBvZiBwYXJzZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW50cmllcy5wdXNoKHsgLi4uZSwgc291cmNlOiBcImVkaXRvclwiIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBwcm9qZWN0LmxvZyB1bmF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFwcGx5IGZpbHRlcnNcclxuICAgICAgICBsZXQgZmlsdGVyZWQgPSBlbnRyaWVzO1xyXG4gICAgICAgIGlmIChvcHRzLnR5cGVzICYmIG9wdHMudHlwZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBhbGxvdyA9IG5ldyBTZXQob3B0cy50eXBlcy5tYXAobm9ybWFsaXplVHlwZSkpO1xyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihlID0+IGFsbG93LmhhcyhlLnR5cGUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG9wdHMuc2luY2UpIHtcclxuICAgICAgICAgICAgZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoZSA9PiBlLnRpbWVzdGFtcCA+IG9wdHMuc2luY2UhKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG9wdHMuc2VhcmNoKSB7XHJcbiAgICAgICAgICAgIGxldCByZTogUmVnRXhwO1xyXG4gICAgICAgICAgICB0cnkgeyByZSA9IG5ldyBSZWdFeHAob3B0cy5zZWFyY2gsIFwiaVwiKTsgfVxyXG4gICAgICAgICAgICBjYXRjaCB7IHJlID0gbmV3IFJlZ0V4cChlc2NhcGVSZWdleChvcHRzLnNlYXJjaCksIFwiaVwiKTsgfVxyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihlID0+IHJlLnRlc3QoZS5tZXNzYWdlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghb3B0cy5pbmNsdWRlU3RhY2t0cmFjZSkge1xyXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IGZpbHRlcmVkLm1hcCgoeyBzdGFja3RyYWNlLCAuLi5yZXN0IH0pID0+IHJlc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU29ydCBieSB0aW1lc3RhbXAgYXNjZW5kaW5nLCB0YWtlIGxhc3QgYGNvdW50YFxyXG4gICAgICAgIGZpbHRlcmVkLnNvcnQoKGEsIGIpID0+IGEudGltZXN0YW1wLmxvY2FsZUNvbXBhcmUoYi50aW1lc3RhbXApKTtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBmaWx0ZXJlZC5zbGljZSgtb3B0cy5jb3VudCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvdW50cyA9IHtcclxuICAgICAgICAgICAgZWRpdG9yOiBlbnRyaWVzLmZpbHRlcihlID0+IGUuc291cmNlID09PSBcImVkaXRvclwiKS5sZW5ndGgsXHJcbiAgICAgICAgICAgIHNjZW5lOiBlbnRyaWVzLmZpbHRlcihlID0+IGUuc291cmNlID09PSBcInNjZW5lXCIpLmxlbmd0aCxcclxuICAgICAgICAgICAgZ2FtZTogZW50cmllcy5maWx0ZXIoZSA9PiBlLnNvdXJjZSA9PT0gXCJnYW1lXCIpLmxlbmd0aCxcclxuICAgICAgICAgICAgdG90YWw6IHJlc3VsdC5sZW5ndGgsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcImdldFwiLCBlbnRyaWVzOiByZXN1bHQsIGNvdW50cyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RFeHRlbnNpb25zKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicXVlcnktYWxsXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleHRlbnNpb25zOiBsaXN0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleHRlbnNpb25zOiBbXSwgbm90ZTogXCJFeHRlbnNpb24gcXVlcnkgbm90IHN1cHBvcnRlZFwiIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldEV4dGVuc2lvbkluZm8obmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJleHRlbnNpb25cIiwgXCJxdWVyeS1pbmZvXCIsIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBuYW1lLCBpbmZvIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldFByb2plY3RMb2dzKGxpbmVzOiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbG9nczogW10sIG5vdGU6IFwiTG9nIGZpbGUgbm90IGZvdW5kXCIgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobG9nUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYWxsTGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWNlbnQgPSBhbGxMaW5lcy5zbGljZSgtbGluZXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBsaW5lczogcmVjZW50Lmxlbmd0aCwgbG9nczogcmVjZW50IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaFByb2plY3RMb2dzKHBhdHRlcm46IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ1BhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QudG1wRGlyLCBcImxvZ3NcIiwgXCJwcm9qZWN0LmxvZ1wiKTtcclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBtYXRjaGVzOiBbXSB9KTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybiwgXCJnaVwiKTtcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIikuZmlsdGVyKChsaW5lOiBzdHJpbmcpID0+IHJlZ2V4LnRlc3QobGluZSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBwYXR0ZXJuLCBjb3VudDogbWF0Y2hlcy5sZW5ndGgsIG1hdGNoZXM6IG1hdGNoZXMuc2xpY2UoMCwgMTAwKSB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dGaWxlSW5mbygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZXhpc3RzOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBleGlzdHM6IHRydWUsIHBhdGg6IGxvZ1BhdGgsIHNpemU6IHN0YXQuc2l6ZSwgbW9kaWZpZWQ6IHN0YXQubXRpbWUgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUHJldmlldyhhY3Rpb246IHN0cmluZywgd2FpdEZvclJlYWR5PzogYm9vbGVhbiwgd2FpdFRpbWVvdXQ/OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcInN0b3BcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdG9wUHJldmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnN0YXJ0UHJldmlldygpO1xyXG4gICAgICAgIGlmICh3YWl0Rm9yUmVhZHkpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0RGF0YSA9IEpTT04ucGFyc2UocmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHREYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWR5ID0gYXdhaXQgdGhpcy53YWl0Rm9yR2FtZVJlYWR5KHdhaXRUaW1lb3V0IHx8IDE1MDAwKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdERhdGEuZ2FtZVJlYWR5ID0gcmVhZHk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlYWR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0RGF0YS5ub3RlID0gKHJlc3VsdERhdGEubm90ZSB8fCBcIlwiKSArIFwiIEdhbWVEZWJ1Z0NsaWVudCBkaWQgbm90IGNvbm5lY3Qgd2l0aGluIHRpbWVvdXQuXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2socmVzdWx0RGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHdhaXRGb3JHYW1lUmVhZHkodGltZW91dDogbnVtYmVyKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGdhbWUgaGFzIHNlbnQgYW55IGxvZyBvciBjb21tYW5kIHJlc3VsdCByZWNlbnRseVxyXG4gICAgICAgICAgICBjb25zdCBnYW1lUmVzdWx0ID0gZ2V0R2FtZUxvZ3MoMSk7XHJcbiAgICAgICAgICAgIGlmIChnYW1lUmVzdWx0LnRvdGFsID4gMCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc3RhcnRQcmV2aWV3KCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTWFpblNjZW5lT3BlbigpO1xyXG5cclxuICAgICAgICAgICAgLy8g44OE44O844Or44OQ44O844GuVnVl44Kk44Oz44K544K/44Oz44K557WM55Sx44GncGxheSgp44KS5ZG844G277yIVUnnirbmhYvjgoLlkIzmnJ/jgZXjgozjgovvvIlcclxuICAgICAgICAgICAgY29uc3QgcGxheWVkID0gYXdhaXQgdGhpcy5leGVjdXRlT25Ub29sYmFyKFwic3RhcnRcIik7XHJcbiAgICAgICAgICAgIGlmIChwbGF5ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogXCJzdGFydFwiLCBtb2RlOiBcImVkaXRvclwiIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDjg5Xjgqnjg7zjg6vjg5Djg4Pjgq86IOebtOaOpUFQSVxyXG4gICAgICAgICAgICBjb25zdCBpc1BsYXlpbmcgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJlZGl0b3ItcHJldmlldy1zZXQtcGxheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaXNQbGF5aW5nLCBhY3Rpb246IFwic3RhcnRcIiwgbW9kZTogXCJlZGl0b3JcIiwgbm90ZTogXCJkaXJlY3QgQVBJICh0b29sYmFyIFVJIG1heSBub3Qgc3luYylcIiB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZWxlY3Ryb24uc2hlbGwub3BlbkV4dGVybmFsKFwiaHR0cDovLzEyNy4wLjAuMTo3NDU2XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcInN0YXJ0XCIsIG1vZGU6IFwiYnJvd3NlclwiIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlMjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGUyLm1lc3NhZ2UgfHwgU3RyaW5nKGUyKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzdG9wUHJldmlldygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyDjg4Tjg7zjg6vjg5Djg7zntYznlLHjgaflgZzmraLvvIhVSeWQjOacn++8iVxyXG4gICAgICAgICAgICBjb25zdCBzdG9wcGVkID0gYXdhaXQgdGhpcy5leGVjdXRlT25Ub29sYmFyKFwic3RvcFwiKTtcclxuICAgICAgICAgICAgaWYgKCFzdG9wcGVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDjg5Xjgqnjg7zjg6vjg5Djg4Pjgq86IOebtOaOpUFQSVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiZWRpdG9yLXByZXZpZXctc2V0LXBsYXlcIiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHNjZW5lOnByZXZpZXctc3RvcCDjg5bjg63jg7zjg4njgq3jg6Pjgrnjg4jjgafjg4Tjg7zjg6vjg5Djg7xVSeeKtuaFi+OCkuODquOCu+ODg+ODiFxyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5icm9hZGNhc3QoXCJzY2VuZTpwcmV2aWV3LXN0b3BcIik7XHJcbiAgICAgICAgICAgIC8vIOOCt+ODvOODs+ODk+ODpeODvOOBq+aIu+OBmVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgNTAwKSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTWFpblNjZW5lT3BlbigpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IFwic3RvcFwiIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVPblRvb2xiYXIoYWN0aW9uOiBcInN0YXJ0XCIgfCBcInN0b3BcIik6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBhbGxDb250ZW50cyA9IGVsZWN0cm9uLndlYkNvbnRlbnRzLmdldEFsbFdlYkNvbnRlbnRzKCk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qgd2Mgb2YgYWxsQ29udGVudHMpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheSgp44KSYXdhaXTjgZfjgarjgYQg4oCUIOODl+ODrOODk+ODpeODvOWujOS6huOCkuW+heOBpOOBqOOCv+OCpOODoOOCouOCpuODiOOBmeOCi+OBn+OCgVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09IFwic3RhcnRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3Yy5leGVjdXRlSmF2YVNjcmlwdChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAoZnVuY3Rpb24oKSB7IGlmICh3aW5kb3cueHh4ICYmIHdpbmRvdy54eHgucGxheSAmJiAhd2luZG93Lnh4eC5nYW1lVmlldy5pc1BsYXkpIHsgd2luZG93Lnh4eC5wbGF5KCk7IHJldHVybiB0cnVlOyB9IHJldHVybiBmYWxzZTsgfSkoKWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2MuZXhlY3V0ZUphdmFTY3JpcHQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgKGZ1bmN0aW9uKCkgeyBpZiAod2luZG93Lnh4eCAmJiB3aW5kb3cueHh4LmdhbWVWaWV3LmlzUGxheSkgeyB3aW5kb3cueHh4LnBsYXkoKTsgcmV0dXJuIHRydWU7IH0gcmV0dXJuIGZhbHNlOyB9KSgpYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogbm90IHRoZSB0b29sYmFyIHdlYkNvbnRlbnRzICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiBlbGVjdHJvbiBBUEkgbm90IGF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZW5zdXJlTWFpblNjZW5lT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgbWV0aG9kOiBcImdldFNjZW5lSGllcmFyY2h5XCIsXHJcbiAgICAgICAgICAgIGFyZ3M6IFtmYWxzZV0sXHJcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgIGlmICghaGllcmFyY2h5Py5zY2VuZU5hbWUgfHwgaGllcmFyY2h5LnNjZW5lTmFtZSA9PT0gXCJzY2VuZS0yZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIOODl+ODreOCuOOCp+OCr+ODiOioreWumuOBrlN0YXJ0IFNjZW5l44KS5Y+C54WnXHJcbiAgICAgICAgICAgIGxldCBzY2VuZVV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgc2NlbmVVdWlkID0gYXdhaXQgKEVkaXRvciBhcyBhbnkpLlByb2ZpbGUuZ2V0Q29uZmlnKFwicHJldmlld1wiLCBcImdlbmVyYWwuc3RhcnRfc2NlbmVcIiwgXCJsb2NhbFwiKTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XHJcblxyXG4gICAgICAgICAgICAvLyBTdGFydCBTY2VuZeOBjOacquioreWumiBvciBcImN1cnJlbnRfc2NlbmVcIiDjga7loLTlkIjjgIHmnIDliJ3jga7jgrfjg7zjg7PjgpLkvb/jgYZcclxuICAgICAgICAgICAgaWYgKCFzY2VuZVV1aWQgfHwgc2NlbmVVdWlkID09PSBcImN1cnJlbnRfc2NlbmVcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwicXVlcnktYXNzZXRzXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBjY1R5cGU6IFwiY2MuU2NlbmVBc3NldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IFwiZGI6Ly9hc3NldHMvKiovKlwiLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2VuZXMpICYmIHNjZW5lcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NlbmVVdWlkID0gc2NlbmVzWzBdLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzY2VuZVV1aWQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGRlYnVnX3ByZXZpZXcg5YaF6YOo44Gu6Ieq5YuV6YG356e744GvIHByZXZpZXcg44KS5YSq5YWI44GX44GmIGZvcmNlPXRydWVcclxuICAgICAgICAgICAgICAgIC8vIO+8iGRpYWxvZyDlh7rjgovjgojjgoogcHJldmlldyDplovlp4vjgpLlhKrlhYjjgZnjgovpgYvnlKjvvIlcclxuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwib3Blbi1zY2VuZVwiLCBzY2VuZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDE1MDApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyQ29kZUNhY2hlKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZWN0cm9uID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBtZW51ID0gZWxlY3Ryb24uTWVudS5nZXRBcHBsaWNhdGlvbk1lbnUoKTtcclxuICAgICAgICAgICAgaWYgKCFtZW51KSByZXR1cm4gZXJyKFwiQXBwbGljYXRpb24gbWVudSBub3QgZm91bmRcIik7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmaW5kTWVudUl0ZW0gPSAoaXRlbXM6IGFueVtdLCBwYXRoOiBzdHJpbmdbXSk6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5sYWJlbCA9PT0gcGF0aFswXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHJldHVybiBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5zdWJtZW51Py5pdGVtcykgcmV0dXJuIGZpbmRNZW51SXRlbShpdGVtLnN1Ym1lbnUuaXRlbXMsIHBhdGguc2xpY2UoMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY2FjaGVJdGVtID0gZmluZE1lbnVJdGVtKG1lbnUuaXRlbXMsIFtcIkRldmVsb3BlclwiLCBcIkNhY2hlXCIsIFwiQ2xlYXIgY29kZSBjYWNoZVwiXSk7XHJcbiAgICAgICAgICAgIGlmICghY2FjaGVJdGVtKSByZXR1cm4gZXJyKFwiTWVudSBpdGVtICdEZXZlbG9wZXIgPiBDYWNoZSA+IENsZWFyIGNvZGUgY2FjaGUnIG5vdCBmb3VuZFwiKTtcclxuXHJcbiAgICAgICAgICAgIGNhY2hlSXRlbS5jbGljaygpO1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwMCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIkNvZGUgY2FjaGUgY2xlYXJlZCB2aWEgbWVudVwiIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdhbWVDb21tYW5kKHR5cGU6IHN0cmluZywgYXJnczogYW55LCB0aW1lb3V0OiBudW1iZXIsIG1heFdpZHRoPzogbnVtYmVyLCBpbWFnZUZvcm1hdD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGNtZElkID0gcXVldWVHYW1lQ29tbWFuZCh0eXBlLCBhcmdzKTtcclxuXHJcbiAgICAgICAgLy8gUG9sbCBmb3IgcmVzdWx0XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldENvbW1hbmRSZXN1bHQoKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuaWQgPT09IGNtZElkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiBzY3JlZW5zaG90LCBzYXZlIHRvIGZpbGUgYW5kIHJldHVybiBwYXRoXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJzY3JlZW5zaG90XCIgJiYgcmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGE/LmRhdGFVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QudG1wRGlyLCBcInNjcmVlbnNob3RzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkgZnMubWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKC9bOi5dL2csIFwiLVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0ID0gcmVzdWx0LmRhdGEuZGF0YVVybC5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBuZ0J1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NCwgXCJiYXNlNjRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVmZmVjdGl2ZU1heFdpZHRoID0gbWF4V2lkdGggIT09IHVuZGVmaW5lZCA/IG1heFdpZHRoIDogOTYwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ0ltYWdlID0gZWxlY3Ryb24ubmF0aXZlSW1hZ2UuY3JlYXRlRnJvbUJ1ZmZlcihwbmdCdWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFNpemUgPSBvcmlnSW1hZ2UuZ2V0U2l6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ1ZmZlciwgd2lkdGgsIGhlaWdodCwgZm9ybWF0IH0gPSBhd2FpdCBwcm9jZXNzSW1hZ2UocG5nQnVmZmVyLCBlZmZlY3RpdmVNYXhXaWR0aCwgaW1hZ2VGb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBmb3JtYXQgPT09IFwid2VicFwiID8gXCJ3ZWJwXCIgOiBmb3JtYXQgPT09IFwianBlZ1wiID8gXCJqcGdcIiA6IFwicG5nXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGRpciwgYGdhbWVfJHt0aW1lc3RhbXB9LiR7ZXh0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgcGF0aDogZmlsZVBhdGgsIHNpemU6IGJ1ZmZlci5sZW5ndGgsIGZvcm1hdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsU2l6ZTogYCR7b3JpZ2luYWxTaXplLndpZHRofXgke29yaWdpbmFsU2l6ZS5oZWlnaHR9YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVkU2l6ZTogYCR7d2lkdGh9eCR7aGVpZ2h0fWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIlNjcmVlbnNob3QgY2FwdHVyZWQgYnV0IGZpbGUgc2F2ZSBmYWlsZWRcIiwgZXJyb3I6IGUubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2socmVzdWx0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlcnIoYEdhbWUgZGlkIG5vdCByZXNwb25kIHdpdGhpbiAke3RpbWVvdXR9bXMuIElzIEdhbWVEZWJ1Z0NsaWVudCBydW5uaW5nIGluIHRoZSBwcmV2aWV3P2ApO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdGFrZVNjcmVlbnNob3Qoc2F2ZVBhdGg/OiBzdHJpbmcsIG1heFdpZHRoPzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGFrZUVkaXRvclNjcmVlbnNob3Qoc2F2ZVBhdGgsIG1heFdpZHRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVsb2FkRXh0ZW5zaW9uKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIC8vIFNjaGVkdWxlIHJlbG9hZCBhZnRlciByZXNwb25zZSBpcyBzZW50XHJcbiAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicmVsb2FkXCIsIFwiY29jb3MtY3JlYXRvci1tY3BcIik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltNQ1BdIEV4dGVuc2lvbiByZWxvYWQgZmFpbGVkOlwiLCBlLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgNTAwKTtcclxuICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBub3RlOiBcIkV4dGVuc2lvbiByZWxvYWQgc2NoZWR1bGVkLiBNQ1Agc2VydmVyIHdpbGwgcmVzdGFydCBpbiB+MXMuIE5PVEU6IEFkZGluZyBuZXcgdG9vbCBkZWZpbml0aW9ucyBvciBtb2RpZnlpbmcgc2NlbmUudHMgcmVxdWlyZXMgYSBmdWxsIENvY29zQ3JlYXRvciByZXN0YXJ0IChyZWxvYWQgaXMgbm90IHN1ZmZpY2llbnQpLlwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hTY3JlZW5zaG90KHBhZ2VzOiBzdHJpbmdbXSwgZGVsYXk6IG51bWJlciwgbWF4V2lkdGg/OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHRpbWVvdXQgPSAxMDAwMDtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIHBhZ2VzKSB7XHJcbiAgICAgICAgICAgIC8vIE5hdmlnYXRlXHJcbiAgICAgICAgICAgIGNvbnN0IG5hdlJlc3VsdCA9IGF3YWl0IHRoaXMuZ2FtZUNvbW1hbmQoXCJuYXZpZ2F0ZVwiLCB7IHBhZ2UgfSwgdGltZW91dCwgbWF4V2lkdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBuYXZEYXRhID0gSlNPTi5wYXJzZShuYXZSZXN1bHQuY29udGVudFswXS50ZXh0KTtcclxuICAgICAgICAgICAgaWYgKCFuYXZEYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHBhZ2UsIHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJuYXZpZ2F0ZSBmYWlsZWRcIiB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBwYWdlIHRvIHJlbmRlclxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgZGVsYXkpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNjcmVlbnNob3RcclxuICAgICAgICAgICAgY29uc3Qgc3NSZXN1bHQgPSBhd2FpdCB0aGlzLmdhbWVDb21tYW5kKFwic2NyZWVuc2hvdFwiLCB7fSwgdGltZW91dCwgbWF4V2lkdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBzc0RhdGEgPSBKU09OLnBhcnNlKHNzUmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBwYWdlLFxyXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3NEYXRhLnN1Y2Nlc3MgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBzc0RhdGEucGF0aCxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBzc0RhdGEuc3VjY2VzcyA/IHVuZGVmaW5lZCA6IChzc0RhdGEuZXJyb3IgfHwgc3NEYXRhLm1lc3NhZ2UpLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN1Y2NlZWRlZCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdWNjZXNzKS5sZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgdG90YWw6IHBhZ2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgc3VjY2VlZGVkLFxyXG4gICAgICAgICAgICBmYWlsZWQ6IHBhZ2VzLmxlbmd0aCAtIHN1Y2NlZWRlZCxcclxuICAgICAgICAgICAgcmVzdWx0cyxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcInF1ZXJ5LW5vZGUtdHJlZVwiKTtcclxuICAgICAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBjb25zdCBjaGVja05vZGVzID0gKG5vZGVzOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlcykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlLm5hbWUpIGlzc3Vlcy5wdXNoKGBOb2RlICR7bm9kZS51dWlkfSBoYXMgbm8gbmFtZWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSBjaGVja05vZGVzKG5vZGUuY2hpbGRyZW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlKSkgY2hlY2tOb2Rlcyh0cmVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgaXNzdWVDb3VudDogaXNzdWVzLmxlbmd0aCwgaXNzdWVzIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFR5cGVTY3JpcHQg44Kz44Oz44OR44Kk44Or5a6M5LqG44KS5b6F44Gk44CCXHJcbiAgICAgKiBwYWNrZXItZHJpdmVyIOOBriBkZWJ1Zy5sb2cg44GrIFwiVGFyZ2V0KGVkaXRvcikgZW5kc1wiIOOBjOePvuOCjOOCi+OBruOCkuebo+imluOBmeOCi+OAglxyXG4gICAgICog5pei44Gr44Kz44Oz44OR44Kk44Or5riI44G/77yI55u06L+R5pWw56eS5Lul5YaF44Gr5a6M5LqG44Ot44Kw44GC44KK77yJ44Gq44KJ5Y2z5bqn44Gr6L+U44GZ44CCXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgd2FpdENvbXBpbGUodGltZW91dDogbnVtYmVyLCBjbGVhbjogYm9vbGVhbik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ1BhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgXCJ0ZW1wXCIsIFwicHJvZ3JhbW1pbmdcIiwgXCJwYWNrZXItZHJpdmVyXCIsIFwibG9nc1wiLCBcImRlYnVnLmxvZ1wiKTtcclxuICAgICAgICAgICAgY29uc3QgY2h1bmtzRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIFwidGVtcFwiLCBcInByb2dyYW1taW5nXCIsIFwicGFja2VyLWRyaXZlclwiLCBcInRhcmdldHNcIiwgXCJlZGl0b3JcIiwgXCJjaHVua3NcIik7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYENvbXBpbGUgbG9nIG5vdCBmb3VuZDogJHtsb2dQYXRofWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBNQVJLRVIgPSBcIlRhcmdldChlZGl0b3IpIGVuZHNcIjtcclxuXHJcbiAgICAgICAgICAgIC8vIGNsZWFuIOODouODvOODiTog44Kz44O844OJ44Kt44Oj44OD44K344Ol44Kv44Oq44KiICsgc29mdC1yZWxvYWQg44Gn5YaN44Kz44Oz44OR44Kk44Or44KS5by35Yi2XHJcbiAgICAgICAgICAgIGlmIChjbGVhbikge1xyXG4gICAgICAgICAgICAgICAgLy8gRGV2ZWxvcGVyID4gQ2FjaGUgPiBDbGVhciBjb2RlIGNhY2hlIOOCkuOCr+ODquODg+OCr1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW51ID0gZWxlY3Ryb24uTWVudS5nZXRBcHBsaWNhdGlvbk1lbnUoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5kTWVudUl0ZW0gPSAoaXRlbXM6IGFueVtdLCBsYWJlbHM6IHN0cmluZ1tdKTogYW55ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5sYWJlbCA9PT0gbGFiZWxzWzBdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhYmVscy5sZW5ndGggPT09IDEpIHJldHVybiBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnN1Ym1lbnU/Lml0ZW1zKSByZXR1cm4gZmluZE1lbnVJdGVtKGl0ZW0uc3VibWVudS5pdGVtcywgbGFiZWxzLnNsaWNlKDEpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlSXRlbSA9IG1lbnUgPyBmaW5kTWVudUl0ZW0obWVudS5pdGVtcywgW1wiRGV2ZWxvcGVyXCIsIFwiQ2FjaGVcIiwgXCJDbGVhciBjb2RlIGNhY2hlXCJdKSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhY2hlSXRlbSkgY2FjaGVJdGVtLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChfZSkgeyAvKiBpZ25vcmUgKi8gfVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpO1xyXG4gICAgICAgICAgICAgICAgLy8gc29mdC1yZWxvYWQg44Gn44K344O844Oz44KS5YaN6Kqt44G/6L6844G/IOKGkiDjgrPjg7Pjg5HjgqTjg6vjg4jjg6rjgqzjg7xcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNvZnQtcmVsb2FkXCIpLmNhdGNoKCgpID0+IHt9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gcmVmcmVzaC1hc3NldCDjgafjg5XjgqHjgqTjg6vlpInmm7TjgpIgQ0Mg44Gr6YCa55+l44GX44Gm44Kz44Oz44OR44Kk44Or44KS44OI44Oq44Ks44O8XHJcbiAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJhc3NldC1kYlwiLCBcInJlZnJlc2gtYXNzZXRcIiwgXCJkYjovL2Fzc2V0c1wiKS5jYXRjaCgoKSA9PiB7fSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU2l6ZSA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpLnNpemU7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IFBPTExfSU5URVJWQUwgPSAyMDA7XHJcbiAgICAgICAgICAgIGNvbnN0IERFVEVDVF9HUkFDRV9NUyA9IDIwMDA7IC8vIENDIOOBjOODleOCoeOCpOODq+WkieabtOOCkuaknOefpeOBmeOCi+OBvuOBp+OBrueMtuS6iFxyXG5cclxuICAgICAgICAgICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCB0aW1lb3V0KSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgUE9MTF9JTlRFUlZBTCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTaXplID0gZnMuc3RhdFN5bmMobG9nUGF0aCkuc2l6ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg63jgrDjgYzmiJDplbfjgZfjgabjgYTjgarjgYRcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U2l6ZSA8PSBpbml0aWFsU2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsZWFuIOODouODvOODieOBp+OBr+W/heOBmuOCs+ODs+ODkeOCpOODq+OBjOi1sOOCi+OBruOBp+eMtuS6iOWIpOWumuOBl+OBquOBhFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGVhbikgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g54y25LqI5pyf6ZaT5YaF44Gv44G+44Gg5b6F44GkIChDQyDjga7mpJznn6XjgYzpgYXjgYTlj6/og73mgKcpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCBERVRFQ1RfR1JBQ0VfTVMpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeMtuS6iOacn+mWk+OCkumBjuOBjuOBpuOCguODreOCsOOBjOaIkOmVt+OBl+OBquOBhCDihpIg44Kz44Oz44OR44Kk44Or5LiN6KaBXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IHRydWUsIHdhaXRlZE1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLCBub3RlOiBcIk5vIGNvbXBpbGF0aW9uIHRyaWdnZXJlZCAobm8gY2hhbmdlcyBkZXRlY3RlZClcIiB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyDjg63jgrDjgYzmiJDplbfjgZfjgZ8g4oaSIOaWsOOBl+OBhOmDqOWIhuOBq+ODnuODvOOCq+ODvOOBjOOBguOCi+OBi+eiuuiqjVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmQgPSBmcy5vcGVuU3luYyhsb2dQYXRoLCBcInJcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdCeXRlcyA9IGN1cnJlbnRTaXplIC0gaW5pdGlhbFNpemU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuYWxsb2MobmV3Qnl0ZXMpO1xyXG4gICAgICAgICAgICAgICAgZnMucmVhZFN5bmMoZmQsIGJ1ZmZlciwgMCwgbmV3Qnl0ZXMsIGluaXRpYWxTaXplKTtcclxuICAgICAgICAgICAgICAgIGZzLmNsb3NlU3luYyhmZCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobmV3Q29udGVudC5pbmNsdWRlcyhNQVJLRVIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IHRydWUsIHdhaXRlZE1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBjb21waWxlZDogZmFsc2UsIHRpbWVvdXQ6IHRydWUsIHdhaXRlZE1zOiB0aW1lb3V0IH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIE5vcm1hbGl6ZSB2YXJpb3VzIGxldmVsIC8gdHlwZSBzcGVsbGluZ3MgdG8gYSBjYW5vbmljYWwgXCJsb2dcInxcImluZm9cInxcIndhcm5cInxcImVycm9yXCIgc3RyaW5nLiAqL1xyXG5mdW5jdGlvbiBub3JtYWxpemVUeXBlKHJhdzogYW55KTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHMgPSBTdHJpbmcocmF3ID8/IFwiXCIpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAocyA9PT0gXCJ3YXJuaW5nXCIpIHJldHVybiBcIndhcm5cIjtcclxuICAgIGlmIChzID09PSBcImVyclwiKSByZXR1cm4gXCJlcnJvclwiO1xyXG4gICAgaWYgKHMgPT09IFwibG9nXCIgfHwgcyA9PT0gXCJpbmZvXCIgfHwgcyA9PT0gXCJ3YXJuXCIgfHwgcyA9PT0gXCJlcnJvclwiKSByZXR1cm4gcztcclxuICAgIHJldHVybiBcImxvZ1wiO1xyXG59XHJcblxyXG4vKiogRXNjYXBlIGEgc3RyaW5nIHNvIGl0IGNhbiBiZSBlbWJlZGRlZCBpbnRvIGEgUmVnRXhwIGxpdGVyYWxseS4gKi9cclxuZnVuY3Rpb24gZXNjYXBlUmVnZXgoczogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBzLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIHByb2plY3QubG9nIOOBruacq+WwvuOCkuiqreOBv+OAgUNvY29zIENyZWF0b3Ig44GM5pu444GN5Ye644GZIGNvbXBpbGUgZXJyb3IgLyB3YXJuaW5nIC9cclxuICogZ2VuZXJpYyBtZXNzYWdlIOOCkuani+mAoOWMluOCqOODs+ODiOODquOBq+WkieaPm+OBmeOCi+OAglxyXG4gKlxyXG4gKiBDb2NvcyBDcmVhdG9yIOOBjCBwcm9qZWN0LmxvZyDjgavmm7jjgY3lh7rjgZnku6PooajnmoTjgarjg5Hjgr/jg7zjg7M6XHJcbiAqICAgWzExOjIyOjMzXSBbaW5mb10gbWVzc2FnZS4uLlxyXG4gKiAgIFsxMToyMjozM10gW3dhcm5dIG1lc3NhZ2UuLi5cclxuICogICBbMTE6MjI6MzNdIFtlcnJvcl0gbWVzc2FnZS4uLiAoVFMyMzA0OiBDYW5ub3QgZmluZCBuYW1lICdGb28nIOOBquOBqSlcclxuICogICBbU2NlbmVdIFtlcnJvcl0gZmlsZTogYXNzZXRzLy4uLi9Gb28udHMoMTIsNSlcclxuICpcclxuICogRWRpdG9yIOODkOODvOOCuOODp+ODs+OChCBsb2NhbGUg44Gr44KI44KK5pu45byP44Gv5aSJ44KP44KL5Y+v6IO95oCn44GM44GC44KL44Gu44Gn44CB6KGM6aCt44GuXHJcbiAqIGBbdHNdIFtsZXZlbF1gIOODkeOCv+ODvOODs+OBqOOAgWBlcnJvciBUU1xcZCs6YCDjga4gVHlwZVNjcmlwdCDjgqjjg6njg7zjgIFcclxuICogYFtsZXZlbF1gIOWNmOeLrOihjOOBquOBqeikh+aVsOODkeOCv+ODvOODs+OCkuioseWuueOBmeOCi+OAglxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcmVhZFByb2plY3RMb2dUYWlsKG1heEVudHJpZXM6IG51bWJlcik6IFByb21pc2U8QXJyYXk8eyB0aW1lc3RhbXA6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfT4+IHtcclxuICAgIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgY29uc3QgbG9nUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC50bXBEaXIsIFwibG9nc1wiLCBcInByb2plY3QubG9nXCIpO1xyXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSByZXR1cm4gW107XHJcblxyXG4gICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpO1xyXG4gICAgLy8g5pyr5bC+IDI1NktCIOOCkuiqreOCgO+8iGNvbXBpbGUgZXJyb3Ig44Gv5aSn44GN44GP44Gq44GE44Gu44Gn5Y2B5YiG77yJXHJcbiAgICBjb25zdCBSRUFEX0JZVEVTID0gMjU2ICogMTAyNDtcclxuICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoMCwgc3RhdC5zaXplIC0gUkVBRF9CWVRFUyk7XHJcbiAgICBjb25zdCBmZCA9IGZzLm9wZW5TeW5jKGxvZ1BhdGgsIFwiclwiKTtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhzdGF0LnNpemUgLSBzdGFydCk7XHJcbiAgICBmcy5yZWFkU3luYyhmZCwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzdGFydCk7XHJcbiAgICBmcy5jbG9zZVN5bmMoZmQpO1xyXG4gICAgY29uc3QgdGV4dCA9IGJ1ZmZlci50b1N0cmluZyhcInV0ZjhcIik7XHJcblxyXG4gICAgY29uc3QgbGluZXMgPSB0ZXh0LnNwbGl0KC9cXHI/XFxuLyk7XHJcbiAgICAvLyDpg6jliIbooYzvvIjlhYjpoK3ooYzjga/liIfjgozjgabjgYTjgovlj6/og73mgKfvvInjgpLmjajjgabjgotcclxuICAgIGlmIChzdGFydCA+IDAgJiYgbGluZXMubGVuZ3RoID4gMCkgbGluZXMuc2hpZnQoKTtcclxuXHJcbiAgICBjb25zdCBlbnRyaWVzOiBBcnJheTx7IHRpbWVzdGFtcDogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZzsgc3RhY2t0cmFjZT86IHN0cmluZyB9PiA9IFtdO1xyXG4gICAgY29uc3QgbGluZVJlID0gL15cXFsoXFxkezJ9OlxcZHsyfTpcXGR7Mn0oPzpcXC5cXGQrKT8pXFxdXFxzKig/OlxcWyhbXlxcXV0rKVxcXSk/XFxzKlxcWz8obG9nfGluZm98d2Fybnx3YXJuaW5nfGVycm9yKVxcXT9cXHMqKC4qKSQvaTtcclxuICAgIGNvbnN0IHRzRXJyUmUgPSAvXFxiZXJyb3JcXHMrVFNcXGQrOlxccyovaTtcclxuICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IGlzb0RhdGUgPSB0b2RheS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxuXHJcbiAgICBsZXQgcGVuZGluZzogeyB0aW1lc3RhbXA6IHN0cmluZzsgdHlwZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IHN0YWNrdHJhY2U/OiBzdHJpbmcgfSB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIGZvciAoY29uc3QgcmF3IG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3QgbGluZSA9IHJhdy5yZXBsYWNlKC9cdTAwMWJcXFtbMC05O10qbS9nLCBcIlwiKTsgLy8gc3RyaXAgQU5TSSBjb2xvciBjb2Rlc1xyXG4gICAgICAgIGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBjb25zdCBtID0gbGluZS5tYXRjaChsaW5lUmUpO1xyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSBlbnRyaWVzLnB1c2gocGVuZGluZyk7XHJcbiAgICAgICAgICAgIGNvbnN0IFssIHRpbWUsIHRhZywgbGV2ZWwsIGJvZHldID0gbTtcclxuICAgICAgICAgICAgY29uc3QgdHMgPSBgJHtpc29EYXRlfVQke3RpbWV9JHt0aW1lLmxlbmd0aCA9PT0gOCA/IFwiLjAwMFwiIDogXCJcIn1aYDtcclxuICAgICAgICAgICAgcGVuZGluZyA9IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdHMsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGxldmVsKSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHRhZyA/IGBbJHt0YWd9XSAke2JvZHl9YCA6IGJvZHksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIGlmICh0c0VyclJlLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgICAgLy8gVHlwZVNjcmlwdCDjgqjjg6njg7zljZjni6zooYzvvIjjgr/jgqTjg6Djgrnjgr/jg7Pjg5fjgarjgZfvvIlcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIGVudHJpZXMucHVzaChwZW5kaW5nKTtcclxuICAgICAgICAgICAgcGVuZGluZyA9IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbGluZS50cmltKCksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIGlmIChwZW5kaW5nKSB7XHJcbiAgICAgICAgICAgIC8vIOe2mee2muihjCDigJQgc3RhY2t0cmFjZSDjgavov73liqBcclxuICAgICAgICAgICAgcGVuZGluZy5zdGFja3RyYWNlID0gcGVuZGluZy5zdGFja3RyYWNlID8gYCR7cGVuZGluZy5zdGFja3RyYWNlfVxcbiR7bGluZX1gIDogbGluZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAocGVuZGluZykgZW50cmllcy5wdXNoKHBlbmRpbmcpO1xyXG5cclxuICAgIC8vIOacq+WwviBtYXhFbnRyaWVzIOS7tlxyXG4gICAgcmV0dXJuIGVudHJpZXMuc2xpY2UoLW1heEVudHJpZXMpO1xyXG59XHJcbiJdfQ==