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
        // editor source — Step 3 で実装。現状は試行のみ
        if (sources.includes("editor")) {
            try {
                const logs = await Editor.Message.request("console", "query-last-logs", opts.count * 2);
                if (Array.isArray(logs)) {
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
            catch ( /* Editor console API not supported in this version — Step 3 で project.log fallback を追加 */_d) { /* Editor console API not supported in this version — Step 3 で project.log fallback を追加 */ }
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
            catch (_f) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBdUM7QUFDdkMsOENBQStGO0FBQy9GLG9DQUEwQztBQUMxQywrQ0FBd0Q7QUFDeEQsOENBQW1FO0FBRW5FLE1BQWEsVUFBVTtJQUF2QjtRQUNhLGlCQUFZLEdBQUcsT0FBTyxDQUFDO0lBODdCcEMsQ0FBQztJQTU3QkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixXQUFXLEVBQUUscUVBQXFFO2dCQUNsRixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7YUFDbEQ7WUFDRDtnQkFDSSxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixXQUFXLEVBQUUsMEVBQTBFO2dCQUN2RixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdEQUF3RCxFQUFFO3FCQUNwRztvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsa0ZBQWtGO2dCQUMvRixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJCQUEyQixFQUFFO3dCQUNwRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO3FCQUN2RTtvQkFDRCxRQUFRLEVBQUUs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LENBQUMsQ0FBQztBQUNwRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbENhdGVnb3J5LCBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3VsdCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBvaywgZXJyIH0gZnJvbSBcIi4uL3Rvb2wtYmFzZVwiO1xyXG5pbXBvcnQgeyBnZXRHYW1lTG9ncywgY2xlYXJHYW1lTG9ncywgcXVldWVHYW1lQ29tbWFuZCwgZ2V0Q29tbWFuZFJlc3VsdCB9IGZyb20gXCIuLi9tY3Atc2VydmVyXCI7XHJcbmltcG9ydCB7IHBhcnNlTWF5YmVKc29uIH0gZnJvbSBcIi4uL3V0aWxzXCI7XHJcbmltcG9ydCB7IGVuc3VyZVNjZW5lU2FmZVRvU3dpdGNoIH0gZnJvbSBcIi4vc2NlbmUtdG9vbHNcIjtcclxuaW1wb3J0IHsgcHJvY2Vzc0ltYWdlLCB0YWtlRWRpdG9yU2NyZWVuc2hvdCB9IGZyb20gXCIuLi9zY3JlZW5zaG90XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRGVidWdUb29scyBpbXBsZW1lbnRzIFRvb2xDYXRlZ29yeSB7XHJcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcImRlYnVnXCI7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19nZXRfZWRpdG9yX2luZm9cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBDb2NvcyBDcmVhdG9yIGVkaXRvciBpbmZvcm1hdGlvbiAodmVyc2lvbiwgcGxhdGZvcm0sIGxhbmd1YWdlKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfbGlzdF9tZXNzYWdlc1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTGlzdCBhdmFpbGFibGUgRWRpdG9yIG1lc3NhZ2VzIGZvciBhIGdpdmVuIGV4dGVuc2lvbiBvciBidWlsdC1pbiBtb2R1bGUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiTWVzc2FnZSB0YXJnZXQgKGUuZy4gJ3NjZW5lJywgJ2Fzc2V0LWRiJywgJ2V4dGVuc2lvbicpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ0YXJnZXRcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX2V4ZWN1dGVfc2NyaXB0XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJFeGVjdXRlIGEgY3VzdG9tIHNjZW5lIHNjcmlwdCBtZXRob2QuIFRoZSBtZXRob2QgbXVzdCBiZSByZWdpc3RlcmVkIGluIHNjZW5lLnRzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk1ldGhvZCBuYW1lIGZyb20gc2NlbmUudHNcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7IHR5cGU6IFwiYXJyYXlcIiwgZGVzY3JpcHRpb246IFwiQXJndW1lbnRzIHRvIHBhc3NcIiwgaXRlbXM6IHt9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wibWV0aG9kXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19nZXRfY29uc29sZV9sb2dzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJbREVQUkVDQVRFRCB2Mi4wLjAg4oCUIHVzZSByZWFkX2NvbnNvbGUgaW5zdGVhZF0gR2V0IHJlY2VudCBjb25zb2xlIGxvZyBlbnRyaWVzLiBBdXRvbWF0aWNhbGx5IGNhcHR1cmVzIHNjZW5lIHByb2Nlc3MgbG9ncyAoY29uc29sZS5sb2cvd2Fybi9lcnJvciBpbiBzY2VuZSBzY3JpcHRzKS4gR2FtZSBwcmV2aWV3IGxvZ3MgY2FuIGFsc28gYmUgY2FwdHVyZWQgYnkgc2VuZGluZyBQT1NUIHJlcXVlc3RzIHRvIC9sb2cgZW5kcG9pbnQg4oCUIHNlZSBSRUFETUUgZm9yIHNldHVwLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IG51bWJlciBvZiBlbnRyaWVzIChkZWZhdWx0IDUwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkZpbHRlciBieSBsZXZlbDogJ2xvZycsICd3YXJuJywgb3IgJ2Vycm9yJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJGaWx0ZXIgYnkgc291cmNlOiAnc2NlbmUnIG9yICdnYW1lJy4gUmV0dXJucyBib3RoIGlmIG9taXR0ZWQuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19jbGVhcl9jb25zb2xlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJbREVQUkVDQVRFRCB2Mi4wLjAg4oCUIHVzZSByZWFkX2NvbnNvbGUgd2l0aCBhY3Rpb249J2NsZWFyJ10gQ2xlYXIgdGhlIGVkaXRvciBjb25zb2xlLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJyZWFkX2NvbnNvbGVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlYWQgRWRpdG9yIC8gU2NlbmUgLyBHYW1lIGNvbnNvbGUgbG9ncyBpbiBvbmUgdG9vbC4gQ2FwdHVyZXMgY29tcGlsZSBlcnJvcnMgKGZyb20gRWRpdG9yIC8gcHJvamVjdC5sb2cpLCBydW50aW1lIGVycm9ycywgYW5kIGNvbnNvbGUubG9nIG91dHB1dCBhY3Jvc3MgYWxsIHNvdXJjZXMuIFN1cHBvcnRzIGFjdGlvbj0nZ2V0JyAoZGVmYXVsdCkgYW5kIGFjdGlvbj0nY2xlYXInLiBSZXBsYWNlcyBkZWJ1Z19nZXRfY29uc29sZV9sb2dzIC8gZGVidWdfY2xlYXJfY29uc29sZSBpbiB2Mi4wLjAuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2dldCcgKGRlZmF1bHQpIG9yICdjbGVhcicuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkZpbHRlciBieSBlbnRyeSB0eXBlLiBBbnkgb2YgJ2xvZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InLiBSZXR1cm5zIGFsbCB0eXBlcyBpZiBvbWl0dGVkLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImFycmF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGaWx0ZXIgYnkgc291cmNlLiBBbnkgb2YgJ2VkaXRvcicgfCAnc2NlbmUnIHwgJ2dhbWUnLiBEZWZhdWx0OiBhbGwgdGhyZWUuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCBlbnRyaWVzIHRvIHJldHVybiBhZnRlciBtZXJnZSAoZGVmYXVsdCA1MCkuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZVN0YWNrdHJhY2U6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgc3RhY2t0cmFjZSBzdHJpbmdzIGlmIGF2YWlsYWJsZSAoZGVmYXVsdCBmYWxzZSkuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2luY2U6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiSVNPIHRpbWVzdGFtcCDigJQgcmV0dXJuIG9ubHkgZW50cmllcyBuZXdlciB0aGFuIHRoaXMgKG9wdGlvbmFsKS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU3Vic3RyaW5nIG9yIHJlZ2V4IHBhdHRlcm4gdG8gZmlsdGVyIG1lc3NhZ2VzIChvcHRpb25hbCkuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19saXN0X2V4dGVuc2lvbnNcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxpc3QgYWxsIGluc3RhbGxlZCBleHRlbnNpb25zLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19nZXRfcHJvamVjdF9sb2dzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZWFkIHJlY2VudCBwcm9qZWN0IGxvZyBlbnRyaWVzIGZyb20gdGhlIGxvZyBmaWxlLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZXM6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTnVtYmVyIG9mIGxpbmVzIHRvIHJlYWQgKGRlZmF1bHQgMTAwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfc2VhcmNoX3Byb2plY3RfbG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2VhcmNoIGZvciBhIHBhdHRlcm4gaW4gcHJvamVjdCBsb2dzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTZWFyY2ggcGF0dGVybiAocmVnZXggc3VwcG9ydGVkKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wicGF0dGVyblwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfZ2V0X2xvZ19maWxlX2luZm9cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcHJvamVjdCBsb2cgZmlsZSAoc2l6ZSwgcGF0aCwgbGFzdCBtb2RpZmllZCkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyDilIDilIAg5Lul5LiL44CB5pei5a2YTUNQ5pyq5a++5b+c44GuRWRpdG9yIEFQSSDilIDilIBcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19xdWVyeV9kZXZpY2VzXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMaXN0IGNvbm5lY3RlZCBkZXZpY2VzIChmb3IgbmF0aXZlIGRlYnVnZ2luZykuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX29wZW5fdXJsXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJPcGVuIGEgVVJMIGluIHRoZSBzeXN0ZW0gYnJvd3NlciBmcm9tIHRoZSBlZGl0b3IuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogeyB1cmw6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiVVJMIHRvIG9wZW5cIiB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInVybFwiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfdmFsaWRhdGVfc2NlbmVcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlZhbGlkYXRlIHRoZSBjdXJyZW50IHNjZW5lIGZvciBjb21tb24gaXNzdWVzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19nYW1lX2NvbW1hbmRcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNlbmQgYSBjb21tYW5kIHRvIHRoZSBydW5uaW5nIGdhbWUgcHJldmlldy4gUmVxdWlyZXMgR2FtZURlYnVnQ2xpZW50IGluIHRoZSBnYW1lLiBDb21tYW5kczogJ3NjcmVlbnNob3QnIChjYXB0dXJlIGdhbWUgY2FudmFzKSwgJ3N0YXRlJyAoZHVtcCBHYW1lRGIpLCAnbmF2aWdhdGUnIChnbyB0byBhIHBhZ2UpLCAnY2xpY2snIChjbGljayBhIG5vZGUgYnkgbmFtZSksICdpbnNwZWN0JyAoZ2V0IHJ1bnRpbWUgbm9kZSBpbmZvOiBVSVRyYW5zZm9ybSBzaXplcywgV2lkZ2V0LCBMYXlvdXQsIHBvc2l0aW9uKS4gUmV0dXJucyB0aGUgcmVzdWx0IGZyb20gdGhlIGdhbWUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkNvbW1hbmQgdHlwZTogJ3NjcmVlbnNob3QnLCAnc3RhdGUnLCAnbmF2aWdhdGUnLCAnY2xpY2snLCAnaW5zcGVjdCdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7IHR5cGU6IFwib2JqZWN0XCIsIGRlc2NyaXB0aW9uOiBcIkNvbW1hbmQgYXJndW1lbnRzIChlLmcuIHtwYWdlOiAnSG9tZVBhZ2VWaWV3J30gZm9yIG5hdmlnYXRlLCB7bmFtZTogJ0J1dHRvbk5hbWUnfSBmb3IgY2xpY2spXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2FpdCB0aW1lIGluIG1zIChkZWZhdWx0IDUwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4V2lkdGg6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdpZHRoIGZvciBzY3JlZW5zaG90IHJlc2l6ZSAoZGVmYXVsdDogOTYwLCAwID0gbm8gcmVzaXplKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlRm9ybWF0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlNjcmVlbnNob3Qgb3V0cHV0IGZvcm1hdDogJ3dlYnAnIChkZWZhdWx0LCBRPTg1KSBvciAncG5nJyAobG9zc2xlc3MpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJ0eXBlXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19zY3JlZW5zaG90XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUYWtlIGEgc2NyZWVuc2hvdCBvZiB0aGUgZWRpdG9yIHdpbmRvdyBhbmQgc2F2ZSB0byBhIGZpbGUuIFJldHVybnMgdGhlIGZpbGUgcGF0aCBvZiB0aGUgc2F2ZWQgUE5HLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRmlsZSBwYXRoIHRvIHNhdmUgdGhlIFBORyAoZGVmYXVsdDogdGVtcC9zY3JlZW5zaG90cy9zY3JlZW5zaG90Xzx0aW1lc3RhbXA+LnBuZylcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhXaWR0aDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2lkdGggaW4gcGl4ZWxzIGZvciByZXNpemUgKGRlZmF1bHQ6IDk2MCwgMCA9IG5vIHJlc2l6ZSkuIEFzcGVjdCByYXRpbyBpcyBwcmVzZXJ2ZWQuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19wcmV2aWV3XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTdGFydCBvciBzdG9wIHRoZSBnYW1lIHByZXZpZXcuIFVzZXMgUHJldmlldyBpbiBFZGl0b3IgKGF1dG8tb3BlbnMgTWFpblNjZW5lIGlmIG5lZWRlZCkuIEZhbGxzIGJhY2sgdG8gYnJvd3NlciBwcmV2aWV3IGlmIGVkaXRvciBwcmV2aWV3IGZhaWxzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidzdGFydCcgKGRlZmF1bHQpIG9yICdzdG9wJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JSZWFkeTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgd2FpdCB1bnRpbCBHYW1lRGVidWdDbGllbnQgY29ubmVjdHMgYWZ0ZXIgc3RhcnQgKGRlZmF1bHQ6IGZhbHNlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRUaW1lb3V0OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIk1heCB3YWl0IHRpbWUgaW4gbXMgZm9yIHdhaXRGb3JSZWFkeSAoZGVmYXVsdDogMTUwMDApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19jbGVhcl9jb2RlX2NhY2hlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDbGVhciB0aGUgY29kZSBjYWNoZSAoZXF1aXZhbGVudCB0byBEZXZlbG9wZXIgPiBDYWNoZSA+IENsZWFyIGNvZGUgY2FjaGUpIGFuZCBzb2Z0LXJlbG9hZCB0aGUgc2NlbmUuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3JlbG9hZF9leHRlbnNpb25cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlbG9hZCB0aGUgTUNQIGV4dGVuc2lvbiBpdHNlbGYuIFVzZSBhZnRlciBucG0gcnVuIGJ1aWxkIHRvIGFwcGx5IGNvZGUgY2hhbmdlcyB3aXRob3V0IHJlc3RhcnRpbmcgQ29jb3NDcmVhdG9yLiBSZXNwb25zZSBpcyBzZW50IGJlZm9yZSByZWxvYWQgc3RhcnRzLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJkZWJ1Z19nZXRfZXh0ZW5zaW9uX2luZm9cIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdldCBkZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIGV4dGVuc2lvbi5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRXh0ZW5zaW9uIG5hbWVcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcIm5hbWVcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3JlY29yZF9zdGFydFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU3RhcnQgcmVjb3JkaW5nIHRoZSBnYW1lIHByZXZpZXcgY2FudmFzIHRvIGEgdmlkZW8gZmlsZS4gVXNlcyBNZWRpYVJlY29yZGVyIG9uIHRoZSBnYW1lIHNpZGUuIEJpdHJhdGUgaXMgYXV0by1jYWxjdWxhdGVkIGZyb20gY2FudmFzIHJlc29sdXRpb24gw5cgZnBzIMOXIHF1YWxpdHkgY29lZmZpY2llbnQgdW5sZXNzIHZpZGVvQml0c1BlclNlY29uZCBpcyBzZXQgZXhwbGljaXRseS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZwczogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJGcmFtZXMgcGVyIHNlY29uZCAoZGVmYXVsdDogMzApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVhbGl0eTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInbG93Jy8nbWVkaXVtJy8naGlnaCcvJ3VsdHJhJyAoZGVmYXVsdDogbWVkaXVtKS4gQ29lZmZpY2llbnRzOiAwLjE1LzAuMjUvMC40MC8wLjYwXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29lZmZpY2llbnQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiQ3VzdG9tIGJpdHJhdGUgY29lZmZpY2llbnQgKHdpZHRoIMOXIGhlaWdodCDDlyBmcHMgw5cgY29lZmZpY2llbnQpLiBPdmVycmlkZXMgcXVhbGl0eS5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0JpdHNQZXJTZWNvbmQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiRXhwbGljaXQgYml0cmF0ZSBpbiBicHMuIE92ZXJyaWRlcyBxdWFsaXR5LWJhc2VkIGNhbGN1bGF0aW9uLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInbXA0JyAoZGVmYXVsdCkgb3IgJ3dlYm0nLiBtcDQgZmFsbHMgYmFjayB0byB3ZWJtIGlmIG5vdCBzdXBwb3J0ZWQuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU2F2ZSBkaXJlY3RvcnkgKHByb2plY3QtcmVsYXRpdmUgb3IgYWJzb2x1dGUpLiBEZWZhdWx0OiB0ZW1wL3JlY29yZGluZ3NcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlYnVnX3JlY29yZF9zdG9wXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTdG9wIHJlY29yZGluZyBzdGFydGVkIGJ5IGRlYnVnX3JlY29yZF9zdGFydC4gUmV0dXJucyB0aGUgc2F2ZWQgV2ViTSBmaWxlIHBhdGggYW5kIHNpemUuIFZpZGVvIGlzIHNhdmVkIHRvIHByb2plY3QncyB0ZW1wL3JlY29yZGluZ3MvcmVjXzxkYXRldGltZT4ud2VibS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiTWF4IHdhaXQgdGltZSBpbiBtcyBmb3IgZmlsZSB1cGxvYWQgKGRlZmF1bHQ6IDMwMDAwKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfYmF0Y2hfc2NyZWVuc2hvdFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTmF2aWdhdGUgdG8gbXVsdGlwbGUgcGFnZXMgYW5kIHRha2UgYSBzY3JlZW5zaG90IG9mIGVhY2guIFJlcXVpcmVzIGdhbWUgcHJldmlldyBydW5uaW5nIHdpdGggR2FtZURlYnVnQ2xpZW50LiBSZXR1cm5zIGFuIGFycmF5IG9mIHNjcmVlbnNob3QgZmlsZSBwYXRocy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2VzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImFycmF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMaXN0IG9mIHBhZ2UgbmFtZXMgdG8gc2NyZWVuc2hvdCAoZS5nLiBbJ0hvbWVQYWdlVmlldycsICdTaG9wUGFnZVZpZXcnXSlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb246IFwiRGVsYXkgaW4gbXMgYmV0d2VlbiBuYXZpZ2F0ZSBhbmQgc2NyZWVuc2hvdCAoZGVmYXVsdDogMTAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhXaWR0aDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2lkdGggZm9yIHNjcmVlbnNob3QgcmVzaXplIChkZWZhdWx0OiA5NjApXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJwYWdlc1wiXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVidWdfd2FpdF9jb21waWxlXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJXYWl0IGZvciBUeXBlU2NyaXB0IGNvbXBpbGF0aW9uIHRvIGNvbXBsZXRlLiBNb25pdG9ycyB0aGUgcGFja2VyLWRyaXZlciBkZWJ1ZyBsb2cgZm9yICdUYXJnZXQoZWRpdG9yKSBlbmRzJyBtZXNzYWdlLiBVc2UgYWZ0ZXIgbW9kaWZ5aW5nIC50cyBmaWxlcyB0byBlbnN1cmUgY2hhbmdlcyBhcmUgY29tcGlsZWQgYmVmb3JlIG9wZXJhdGluZyBvbiBQcmVmYWJzLiBXaXRoIGNsZWFuPXRydWUsIGRlbGV0ZXMgY29tcGlsZWQgb3V0cHV0IGZpcnN0IHRvIGZvcmNlIGEgZnJlc2ggcmVjb21waWxlIChzbG93ZXIgYnV0IGd1YXJhbnRlZWQpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJNYXggd2FpdCB0aW1lIGluIG1zIChkZWZhdWx0OiAxNTAwMClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbjogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgZGVsZXRlIGNvbXBpbGVkIG91dHB1dCBmaXJzdCB0byBmb3JjZSBmcmVzaCByZWNvbXBpbGUgKGRlZmF1bHQ6IGZhbHNlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZ2V0X2VkaXRvcl9pbmZvXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RWRpdG9ySW5mbygpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2xpc3RfbWVzc2FnZXNcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5saXN0TWVzc2FnZXMoYXJncy50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2V4ZWN1dGVfc2NyaXB0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVNjcmlwdChhcmdzLm1ldGhvZCwgYXJncy5hcmdzIHx8IFtdKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19nZXRfY29uc29sZV9sb2dzXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc29sZUxvZ3MoYXJncy5jb3VudCB8fCA1MCwgYXJncy5sZXZlbCwgYXJncy5zb3VyY2UpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlYWRfY29uc29sZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRDb25zb2xlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiBhcmdzLmFjdGlvbiB8fCBcImdldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlczogcGFyc2VNYXliZUpzb24oYXJncy50eXBlcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZXM6IHBhcnNlTWF5YmVKc29uKGFyZ3Muc291cmNlcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBhcmdzLmNvdW50IHx8IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlU3RhY2t0cmFjZTogYXJncy5pbmNsdWRlU3RhY2t0cmFjZSA/PyBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2luY2U6IGFyZ3Muc2luY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogYXJncy5zZWFyY2gsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfY2xlYXJfY29uc29sZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnNlbmQoXCJjb25zb2xlXCIsIFwiY2xlYXJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgc2NlbmUgcHJvY2VzcyBsb2cgYnVmZmVyXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJjbGVhckNvbnNvbGVMb2dzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHt9KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBnYW1lIHByZXZpZXcgbG9nIGJ1ZmZlclxyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyR2FtZUxvZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2xpc3RfZXh0ZW5zaW9uc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxpc3RFeHRlbnNpb25zKCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZ2V0X3Byb2plY3RfbG9nc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFByb2plY3RMb2dzKGFyZ3MubGluZXMgfHwgMTAwKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19zZWFyY2hfcHJvamVjdF9sb2dzXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VhcmNoUHJvamVjdExvZ3MoYXJncy5wYXR0ZXJuKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19nZXRfbG9nX2ZpbGVfaW5mb1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldExvZ0ZpbGVJbmZvKCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfcXVlcnlfZGV2aWNlc1wiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlcyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJkZXZpY2VcIiwgXCJxdWVyeVwiKS5jYXRjaCgoKSA9PiBbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZGV2aWNlcyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19vcGVuX3VybFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJwcm9ncmFtXCIsIFwib3Blbi11cmxcIiwgYXJncy51cmwpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIHVybDogYXJncy51cmwgfSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZ2FtZV9jb21tYW5kXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2FtZUNvbW1hbmQoYXJncy50eXBlIHx8IGFyZ3MuY29tbWFuZCwgcGFyc2VNYXliZUpzb24oYXJncy5hcmdzKSwgYXJncy50aW1lb3V0IHx8IDUwMDAsIGFyZ3MubWF4V2lkdGgsIGFyZ3MuaW1hZ2VGb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3NjcmVlbnNob3RcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50YWtlU2NyZWVuc2hvdChhcmdzLnNhdmVQYXRoLCBhcmdzLm1heFdpZHRoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19wcmV2aWV3XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlUHJldmlldyhhcmdzLmFjdGlvbiB8fCBcInN0YXJ0XCIsIGFyZ3Mud2FpdEZvclJlYWR5LCBhcmdzLndhaXRUaW1lb3V0IHx8IDE1MDAwKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19jbGVhcl9jb2RlX2NhY2hlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJDb2RlQ2FjaGUoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19yZWxvYWRfZXh0ZW5zaW9uXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVsb2FkRXh0ZW5zaW9uKCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfdmFsaWRhdGVfc2NlbmVcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0ZVNjZW5lKCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfZ2V0X2V4dGVuc2lvbl9pbmZvXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0ZW5zaW9uSW5mbyhhcmdzLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX2JhdGNoX3NjcmVlbnNob3RcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5iYXRjaFNjcmVlbnNob3QoYXJncy5wYWdlcywgYXJncy5kZWxheSB8fCAxMDAwLCBhcmdzLm1heFdpZHRoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWJ1Z19yZWNvcmRfc3RhcnRcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nYW1lQ29tbWFuZChcInJlY29yZF9zdGFydFwiLCB7IGZwczogYXJncy5mcHMsIHF1YWxpdHk6IGFyZ3MucXVhbGl0eSwgY29lZmZpY2llbnQ6IGFyZ3MuY29lZmZpY2llbnQsIHZpZGVvQml0c1BlclNlY29uZDogYXJncy52aWRlb0JpdHNQZXJTZWNvbmQsIGZvcm1hdDogYXJncy5mb3JtYXQsIHNhdmVQYXRoOiBhcmdzLnNhdmVQYXRoIH0sIDUwMDApO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRlYnVnX3JlY29yZF9zdG9wXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2FtZUNvbW1hbmQoXCJyZWNvcmRfc3RvcFwiLCB1bmRlZmluZWQsIGFyZ3MudGltZW91dCB8fCAzMDAwMCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdfd2FpdF9jb21waWxlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2FpdENvbXBpbGUoYXJncy50aW1lb3V0IHx8IDE1MDAwLCBhcmdzLmNsZWFuID8/IGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0RWRpdG9ySW5mbygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICByZXR1cm4gb2soe1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uOiBFZGl0b3IuQXBwLnZlcnNpb24sXHJcbiAgICAgICAgICAgIHBhdGg6IEVkaXRvci5BcHAucGF0aCxcclxuICAgICAgICAgICAgaG9tZTogRWRpdG9yLkFwcC5ob21lLFxyXG4gICAgICAgICAgICBsYW5ndWFnZTogRWRpdG9yLkkxOG4/LmdldExhbmd1YWdlPy4oKSB8fCBcInVua25vd25cIixcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RNZXNzYWdlcyh0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicXVlcnktaW5mb1wiLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB0YXJnZXQsIGluZm8gfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtub3duTWVzc2FnZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgICAgICAgICAgICAgIFwic2NlbmVcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgIFwicXVlcnktbm9kZS10cmVlXCIsIFwiY3JlYXRlLW5vZGVcIiwgXCJyZW1vdmUtbm9kZVwiLCBcImR1cGxpY2F0ZS1ub2RlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJzZXQtcHJvcGVydHlcIiwgXCJjcmVhdGUtcHJlZmFiXCIsIFwic2F2ZS1zY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJxdWVyeS1pcy1kaXJ0eVwiLCBcInF1ZXJ5LWNsYXNzZXNcIiwgXCJzb2Z0LXJlbG9hZFwiLCBcInNuYXBzaG90XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJjaGFuZ2UtZ2l6bW8tdG9vbFwiLCBcInF1ZXJ5LWdpem1vLXRvb2wtbmFtZVwiLCBcImZvY3VzLWNhbWVyYS1vbi1ub2Rlc1wiLFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIFwiYXNzZXQtZGJcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgIFwicXVlcnktYXNzZXRzXCIsIFwicXVlcnktYXNzZXQtaW5mb1wiLCBcInF1ZXJ5LWFzc2V0LW1ldGFcIixcclxuICAgICAgICAgICAgICAgICAgICBcInJlZnJlc2gtYXNzZXRcIiwgXCJzYXZlLWFzc2V0XCIsIFwiY3JlYXRlLWFzc2V0XCIsIFwiZGVsZXRlLWFzc2V0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJtb3ZlLWFzc2V0XCIsIFwiY29weS1hc3NldFwiLCBcIm9wZW4tYXNzZXRcIiwgXCJyZWltcG9ydC1hc3NldFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwicXVlcnktcGF0aFwiLCBcInF1ZXJ5LXV1aWRcIiwgXCJxdWVyeS11cmxcIiwgXCJxdWVyeS1hc3NldC1kZXBlbmRzXCIsXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IGtub3duTWVzc2FnZXNbdGFyZ2V0XTtcclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCB0YXJnZXQsIG1lc3NhZ2VzLCBub3RlOiBcIlN0YXRpYyBsaXN0IChxdWVyeSBmYWlsZWQpXCIgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NyaXB0KG1ldGhvZDogc3RyaW5nLCBhcmdzOiBhbnlbXSk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcImV4ZWN1dGUtc2NlbmUtc2NyaXB0XCIsIHtcclxuICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICBtZXRob2QsXHJcbiAgICAgICAgICAgIGFyZ3MsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb25zb2xlTG9ncyhjb3VudDogbnVtYmVyLCBsZXZlbD86IHN0cmluZywgc291cmNlPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgLy8gMS4gVHJ5IEVkaXRvcidzIG5hdGl2ZSBjb25zb2xlIEFQSSBmaXJzdCAobWF5IGJlIHN1cHBvcnRlZCBpbiBmdXR1cmUgQ29jb3NDcmVhdG9yIHZlcnNpb25zKVxyXG4gICAgICAgIGlmICghc291cmNlKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImNvbnNvbGVcIiwgXCJxdWVyeS1sYXN0LWxvZ3NcIiwgY291bnQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobG9ncykgJiYgbG9ncy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbG9ncywgc291cmNlOiBcImVkaXRvci1hcGlcIiwgbm90ZTogXCJVc2luZyBuYXRpdmUgRWRpdG9yIGNvbnNvbGUgQVBJXCIgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBOb3Qgc3VwcG9ydGVkIGluIHRoaXMgdmVyc2lvbiDigJQgdXNlIGZhbGxiYWNrICovIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDIuIEZhbGxiYWNrOiBjb2xsZWN0IGZyb20gc2NlbmUgcHJvY2VzcyBidWZmZXIgKyBnYW1lIHByZXZpZXcgYnVmZmVyXHJcbiAgICAgICAgbGV0IHNjZW5lTG9nczogYW55W10gPSBbXTtcclxuICAgICAgICBsZXQgZ2FtZUxvZ3M6IGFueVtdID0gW107XHJcblxyXG4gICAgICAgIC8vIDJhLiBTY2VuZSBwcm9jZXNzIGxvZ3MgKGNvbnNvbGUgd3JhcHBlciBpbiBzY2VuZS50cylcclxuICAgICAgICBpZiAoIXNvdXJjZSB8fCBzb3VyY2UgPT09IFwic2NlbmVcIikge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiZ2V0Q29uc29sZUxvZ3NcIixcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbY291bnQgKiAyLCBsZXZlbF0sIC8vIHJlcXVlc3QgbW9yZSwgd2lsbCB0cmltIGFmdGVyIG1lcmdlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ/LmxvZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY2VuZUxvZ3MgPSByZXN1bHQubG9ncy5tYXAoKGw6IGFueSkgPT4gKHsgLi4ubCwgc291cmNlOiBcInNjZW5lXCIgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogc2NlbmUgbm90IGF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAyYi4gR2FtZSBwcmV2aWV3IGxvZ3MgKHJlY2VpdmVkIHZpYSBQT1NUIC9sb2cgZW5kcG9pbnQpXHJcbiAgICAgICAgaWYgKCFzb3VyY2UgfHwgc291cmNlID09PSBcImdhbWVcIikge1xyXG4gICAgICAgICAgICBjb25zdCBnYW1lUmVzdWx0ID0gZ2V0R2FtZUxvZ3MoY291bnQgKiAyLCBsZXZlbCk7XHJcbiAgICAgICAgICAgIGdhbWVMb2dzID0gZ2FtZVJlc3VsdC5sb2dzLm1hcCgobDogYW55KSA9PiAoeyAuLi5sLCBzb3VyY2U6IFwiZ2FtZVwiIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIE1lcmdlIGFuZCBzb3J0IGJ5IHRpbWVzdGFtcCwgdGFrZSBsYXN0IGBjb3VudGBcclxuICAgICAgICBjb25zdCBtZXJnZWQgPSBbLi4uc2NlbmVMb2dzLCAuLi5nYW1lTG9nc11cclxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEudGltZXN0YW1wLmxvY2FsZUNvbXBhcmUoYi50aW1lc3RhbXApKVxyXG4gICAgICAgICAgICAuc2xpY2UoLWNvdW50KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgbG9nczogbWVyZ2VkLFxyXG4gICAgICAgICAgICB0b3RhbDogeyBzY2VuZTogc2NlbmVMb2dzLmxlbmd0aCwgZ2FtZTogKHNvdXJjZSA9PT0gXCJzY2VuZVwiID8gMCA6IGdhbWVMb2dzLmxlbmd0aCkgfSxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlYWRDb25zb2xlKG9wdHM6IHtcclxuICAgICAgICBhY3Rpb246IHN0cmluZztcclxuICAgICAgICB0eXBlcz86IHN0cmluZ1tdO1xyXG4gICAgICAgIHNvdXJjZXM/OiBzdHJpbmdbXTtcclxuICAgICAgICBjb3VudDogbnVtYmVyO1xyXG4gICAgICAgIGluY2x1ZGVTdGFja3RyYWNlOiBib29sZWFuO1xyXG4gICAgICAgIHNpbmNlPzogc3RyaW5nO1xyXG4gICAgICAgIHNlYXJjaD86IHN0cmluZztcclxuICAgIH0pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCBhbGxvd2VkU291cmNlcyA9IG5ldyBTZXQoW1wiZWRpdG9yXCIsIFwic2NlbmVcIiwgXCJnYW1lXCJdKTtcclxuICAgICAgICBjb25zdCBzb3VyY2VzID0gKG9wdHMuc291cmNlcyAmJiBvcHRzLnNvdXJjZXMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgPyBvcHRzLnNvdXJjZXMuZmlsdGVyKHMgPT4gYWxsb3dlZFNvdXJjZXMuaGFzKHMpKVxyXG4gICAgICAgICAgICA6IFtcImVkaXRvclwiLCBcInNjZW5lXCIsIFwiZ2FtZVwiXTtcclxuXHJcbiAgICAgICAgaWYgKG9wdHMuYWN0aW9uID09PSBcImNsZWFyXCIpIHtcclxuICAgICAgICAgICAgY29uc3QgY2xlYXJlZDogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJlZGl0b3JcIikpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7IEVkaXRvci5NZXNzYWdlLnNlbmQoXCJjb25zb2xlXCIsIFwiY2xlYXJcIik7IGNsZWFyZWQucHVzaChcImVkaXRvclwiKTsgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJzY2VuZVwiKSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY29jb3MtY3JlYXRvci1tY3BcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcImNsZWFyQ29uc29sZUxvZ3NcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJlZC5wdXNoKFwic2NlbmVcIik7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogc2NlbmUgbm90IGF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNvdXJjZXMuaW5jbHVkZXMoXCJnYW1lXCIpKSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhckdhbWVMb2dzKCk7XHJcbiAgICAgICAgICAgICAgICBjbGVhcmVkLnB1c2goXCJnYW1lXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogXCJjbGVhclwiLCBjbGVhcmVkIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdHMuYWN0aW9uICE9PSBcImdldFwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gYWN0aW9uOiAke29wdHMuYWN0aW9ufS4gRXhwZWN0ZWQgJ2dldCcgb3IgJ2NsZWFyJy5gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXM6IEFycmF5PHsgdGltZXN0YW1wOiBzdHJpbmc7IHNvdXJjZTogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZzsgc3RhY2t0cmFjZT86IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuICAgICAgICAvLyBzY2VuZSBzb3VyY2VcclxuICAgICAgICBpZiAoc291cmNlcy5pbmNsdWRlcyhcInNjZW5lXCIpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJleGVjdXRlLXNjZW5lLXNjcmlwdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb2Nvcy1jcmVhdG9yLW1jcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJnZXRDb25zb2xlTG9nc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtvcHRzLmNvdW50ICogMiwgdW5kZWZpbmVkXSwgLy8gcmVxdWVzdCBtb3JlLCBmaWx0ZXIgYWZ0ZXIgbWVyZ2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdD8ubG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbCBvZiByZXN1bHQubG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBsLnRpbWVzdGFtcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogXCJzY2VuZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9ybWFsaXplVHlwZShsLmxldmVsKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGwubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrdHJhY2U6IGwuc3RhY2t0cmFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogc2NlbmUgbm90IGF2YWlsYWJsZSAqLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBnYW1lIHNvdXJjZVxyXG4gICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwiZ2FtZVwiKSkge1xyXG4gICAgICAgICAgICBjb25zdCBnYW1lUmVzdWx0ID0gZ2V0R2FtZUxvZ3Mob3B0cy5jb3VudCAqIDIpO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGwgb2YgZ2FtZVJlc3VsdC5sb2dzKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbC50aW1lc3RhbXAsXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcImdhbWVcIixcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGwubGV2ZWwpLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGwubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja3RyYWNlOiAobCBhcyBhbnkpLnN0YWNrdHJhY2UsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZWRpdG9yIHNvdXJjZSDigJQgU3RlcCAzIOOBp+Wun+ijheOAguePvueKtuOBr+ippuihjOOBruOBv1xyXG4gICAgICAgIGlmIChzb3VyY2VzLmluY2x1ZGVzKFwiZWRpdG9yXCIpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImNvbnNvbGVcIiwgXCJxdWVyeS1sYXN0LWxvZ3NcIiwgb3B0cy5jb3VudCAqIDIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobG9ncykpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGwgb2YgbG9ncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBsLnRpbWVzdGFtcCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwiZWRpdG9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub3JtYWxpemVUeXBlKGwudHlwZSB8fCBsLmxldmVsKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGwubWVzc2FnZSB8fCBTdHJpbmcobCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja3RyYWNlOiBsLnN0YWNrIHx8IGwuc3RhY2t0cmFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogRWRpdG9yIGNvbnNvbGUgQVBJIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyB2ZXJzaW9uIOKAlCBTdGVwIDMg44GnIHByb2plY3QubG9nIGZhbGxiYWNrIOOCkui/veWKoCAqLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBBcHBseSBmaWx0ZXJzXHJcbiAgICAgICAgbGV0IGZpbHRlcmVkID0gZW50cmllcztcclxuICAgICAgICBpZiAob3B0cy50eXBlcyAmJiBvcHRzLnR5cGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgYWxsb3cgPSBuZXcgU2V0KG9wdHMudHlwZXMubWFwKG5vcm1hbGl6ZVR5cGUpKTtcclxuICAgICAgICAgICAgZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoZSA9PiBhbGxvdy5oYXMoZS50eXBlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvcHRzLnNpbmNlKSB7XHJcbiAgICAgICAgICAgIGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKGUgPT4gZS50aW1lc3RhbXAgPiBvcHRzLnNpbmNlISk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvcHRzLnNlYXJjaCkge1xyXG4gICAgICAgICAgICBsZXQgcmU6IFJlZ0V4cDtcclxuICAgICAgICAgICAgdHJ5IHsgcmUgPSBuZXcgUmVnRXhwKG9wdHMuc2VhcmNoLCBcImlcIik7IH1cclxuICAgICAgICAgICAgY2F0Y2ggeyByZSA9IG5ldyBSZWdFeHAoZXNjYXBlUmVnZXgob3B0cy5zZWFyY2gpLCBcImlcIik7IH1cclxuICAgICAgICAgICAgZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoZSA9PiByZS50ZXN0KGUubWVzc2FnZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIW9wdHMuaW5jbHVkZVN0YWNrdHJhY2UpIHtcclxuICAgICAgICAgICAgZmlsdGVyZWQgPSBmaWx0ZXJlZC5tYXAoKHsgc3RhY2t0cmFjZSwgLi4ucmVzdCB9KSA9PiByZXN0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNvcnQgYnkgdGltZXN0YW1wIGFzY2VuZGluZywgdGFrZSBsYXN0IGBjb3VudGBcclxuICAgICAgICBmaWx0ZXJlZC5zb3J0KChhLCBiKSA9PiBhLnRpbWVzdGFtcC5sb2NhbGVDb21wYXJlKGIudGltZXN0YW1wKSk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gZmlsdGVyZWQuc2xpY2UoLW9wdHMuY291bnQpO1xyXG5cclxuICAgICAgICBjb25zdCBjb3VudHMgPSB7XHJcbiAgICAgICAgICAgIGVkaXRvcjogZW50cmllcy5maWx0ZXIoZSA9PiBlLnNvdXJjZSA9PT0gXCJlZGl0b3JcIikubGVuZ3RoLFxyXG4gICAgICAgICAgICBzY2VuZTogZW50cmllcy5maWx0ZXIoZSA9PiBlLnNvdXJjZSA9PT0gXCJzY2VuZVwiKS5sZW5ndGgsXHJcbiAgICAgICAgICAgIGdhbWU6IGVudHJpZXMuZmlsdGVyKGUgPT4gZS5zb3VyY2UgPT09IFwiZ2FtZVwiKS5sZW5ndGgsXHJcbiAgICAgICAgICAgIHRvdGFsOiByZXN1bHQubGVuZ3RoLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogXCJnZXRcIiwgZW50cmllczogcmVzdWx0LCBjb3VudHMgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0RXh0ZW5zaW9ucygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBsaXN0ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImV4dGVuc2lvblwiLCBcInF1ZXJ5LWFsbFwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZXh0ZW5zaW9uczogbGlzdCB9KTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZXh0ZW5zaW9uczogW10sIG5vdGU6IFwiRXh0ZW5zaW9uIHF1ZXJ5IG5vdCBzdXBwb3J0ZWRcIiB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRFeHRlbnNpb25JbmZvKG5hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiZXh0ZW5zaW9uXCIsIFwicXVlcnktaW5mb1wiLCBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbmFtZSwgaW5mbyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRQcm9qZWN0TG9ncyhsaW5lczogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuICAgICAgICAgICAgY29uc3QgbG9nUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC50bXBEaXIsIFwibG9nc1wiLCBcInByb2plY3QubG9nXCIpO1xyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nUGF0aCkpIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGxvZ3M6IFtdLCBub3RlOiBcIkxvZyBmaWxlIG5vdCBmb3VuZFwiIH0pO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGxvZ1BhdGgsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGFsbExpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuICAgICAgICAgICAgY29uc3QgcmVjZW50ID0gYWxsTGluZXMuc2xpY2UoLWxpbmVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbGluZXM6IHJlY2VudC5sZW5ndGgsIGxvZ3M6IHJlY2VudCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZWFyY2hQcm9qZWN0TG9ncyhwYXR0ZXJuOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJsb2dzXCIsIFwicHJvamVjdC5sb2dcIik7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsb2dQYXRoKSkgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbWF0Y2hlczogW10gfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobG9nUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKHBhdHRlcm4sIFwiZ2lcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpLmZpbHRlcigobGluZTogc3RyaW5nKSA9PiByZWdleC50ZXN0KGxpbmUpKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgcGF0dGVybiwgY291bnQ6IG1hdGNoZXMubGVuZ3RoLCBtYXRjaGVzOiBtYXRjaGVzLnNsaWNlKDAsIDEwMCkgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0TG9nRmlsZUluZm8oKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuICAgICAgICAgICAgY29uc3QgbG9nUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC50bXBEaXIsIFwibG9nc1wiLCBcInByb2plY3QubG9nXCIpO1xyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nUGF0aCkpIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGV4aXN0czogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhsb2dQYXRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgZXhpc3RzOiB0cnVlLCBwYXRoOiBsb2dQYXRoLCBzaXplOiBzdGF0LnNpemUsIG1vZGlmaWVkOiBzdGF0Lm10aW1lIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVByZXZpZXcoYWN0aW9uOiBzdHJpbmcsIHdhaXRGb3JSZWFkeT86IGJvb2xlYW4sIHdhaXRUaW1lb3V0PzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJzdG9wXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RvcFByZXZpZXcoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zdGFydFByZXZpZXcoKTtcclxuICAgICAgICBpZiAod2FpdEZvclJlYWR5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdERhdGEgPSBKU09OLnBhcnNlKHJlc3VsdC5jb250ZW50WzBdLnRleHQpO1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0RGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWFkeSA9IGF3YWl0IHRoaXMud2FpdEZvckdhbWVSZWFkeSh3YWl0VGltZW91dCB8fCAxNTAwMCk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHREYXRhLmdhbWVSZWFkeSA9IHJlYWR5O1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZWFkeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdERhdGEubm90ZSA9IChyZXN1bHREYXRhLm5vdGUgfHwgXCJcIikgKyBcIiBHYW1lRGVidWdDbGllbnQgZGlkIG5vdCBjb25uZWN0IHdpdGhpbiB0aW1lb3V0LlwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdERhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyB3YWl0Rm9yR2FtZVJlYWR5KHRpbWVvdXQ6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuICAgICAgICB3aGlsZSAoRGF0ZS5ub3coKSAtIHN0YXJ0IDwgdGltZW91dCkge1xyXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBnYW1lIGhhcyBzZW50IGFueSBsb2cgb3IgY29tbWFuZCByZXN1bHQgcmVjZW50bHlcclxuICAgICAgICAgICAgY29uc3QgZ2FtZVJlc3VsdCA9IGdldEdhbWVMb2dzKDEpO1xyXG4gICAgICAgICAgICBpZiAoZ2FtZVJlc3VsdC50b3RhbCA+IDApIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgNTAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHN0YXJ0UHJldmlldygpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuc3VyZU1haW5TY2VuZU9wZW4oKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOODhOODvOODq+ODkOODvOOBrlZ1ZeOCpOODs+OCueOCv+ODs+OCuee1jOeUseOBp3BsYXkoKeOCkuWRvOOBtu+8iFVJ54q25oWL44KC5ZCM5pyf44GV44KM44KL77yJXHJcbiAgICAgICAgICAgIGNvbnN0IHBsYXllZCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU9uVG9vbGJhcihcInN0YXJ0XCIpO1xyXG4gICAgICAgICAgICBpZiAocGxheWVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IFwic3RhcnRcIiwgbW9kZTogXCJlZGl0b3JcIiB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g44OV44Kp44O844Or44OQ44OD44KvOiDnm7TmjqVBUElcclxuICAgICAgICAgICAgY29uc3QgaXNQbGF5aW5nID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwiZWRpdG9yLXByZXZpZXctc2V0LXBsYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGlzUGxheWluZywgYWN0aW9uOiBcInN0YXJ0XCIsIG1vZGU6IFwiZWRpdG9yXCIsIG5vdGU6IFwiZGlyZWN0IEFQSSAodG9vbGJhciBVSSBtYXkgbm90IHN5bmMpXCIgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGVsZWN0cm9uLnNoZWxsLm9wZW5FeHRlcm5hbChcImh0dHA6Ly8xMjcuMC4wLjE6NzQ1NlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogXCJzdGFydFwiLCBtb2RlOiBcImJyb3dzZXJcIiB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZTI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihlMi5tZXNzYWdlIHx8IFN0cmluZyhlMikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc3RvcFByZXZpZXcoKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g44OE44O844Or44OQ44O857WM55Sx44Gn5YGc5q2i77yIVUnlkIzmnJ/vvIlcclxuICAgICAgICAgICAgY29uc3Qgc3RvcHBlZCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU9uVG9vbGJhcihcInN0b3BcIik7XHJcbiAgICAgICAgICAgIGlmICghc3RvcHBlZCkge1xyXG4gICAgICAgICAgICAgICAgLy8g44OV44Kp44O844Or44OQ44OD44KvOiDnm7TmjqVBUElcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcImVkaXRvci1wcmV2aWV3LXNldC1wbGF5XCIsIGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzY2VuZTpwcmV2aWV3LXN0b3Ag44OW44Ot44O844OJ44Kt44Oj44K544OI44Gn44OE44O844Or44OQ44O8VUnnirbmhYvjgpLjg6rjgrvjg4Pjg4hcclxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UuYnJvYWRjYXN0KFwic2NlbmU6cHJldmlldy1zdG9wXCIpO1xyXG4gICAgICAgICAgICAvLyDjgrfjg7zjg7Pjg5Pjg6Xjg7zjgavmiLvjgZlcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuc3VyZU1haW5TY2VuZU9wZW4oKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBcInN0b3BcIiB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlT25Ub29sYmFyKGFjdGlvbjogXCJzdGFydFwiIHwgXCJzdG9wXCIpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgY29uc3QgYWxsQ29udGVudHMgPSBlbGVjdHJvbi53ZWJDb250ZW50cy5nZXRBbGxXZWJDb250ZW50cygpO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHdjIG9mIGFsbENvbnRlbnRzKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHBsYXkoKeOCkmF3YWl044GX44Gq44GEIOKAlCDjg5fjg6zjg5Pjg6Xjg7zlrozkuobjgpLlvoXjgaTjgajjgr/jgqTjg6DjgqLjgqbjg4jjgZnjgovjgZ/jgoFcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uID09PSBcInN0YXJ0XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd2MuZXhlY3V0ZUphdmFTY3JpcHQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgKGZ1bmN0aW9uKCkgeyBpZiAod2luZG93Lnh4eCAmJiB3aW5kb3cueHh4LnBsYXkgJiYgIXdpbmRvdy54eHguZ2FtZVZpZXcuaXNQbGF5KSB7IHdpbmRvdy54eHgucGxheSgpOyByZXR1cm4gdHJ1ZTsgfSByZXR1cm4gZmFsc2U7IH0pKClgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdjLmV4ZWN1dGVKYXZhU2NyaXB0KFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYChmdW5jdGlvbigpIHsgaWYgKHdpbmRvdy54eHggJiYgd2luZG93Lnh4eC5nYW1lVmlldy5pc1BsYXkpIHsgd2luZG93Lnh4eC5wbGF5KCk7IHJldHVybiB0cnVlOyB9IHJldHVybiBmYWxzZTsgfSkoKWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIG5vdCB0aGUgdG9vbGJhciB3ZWJDb250ZW50cyAqLyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIHsgLyogZWxlY3Ryb24gQVBJIG5vdCBhdmFpbGFibGUgKi8gfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGVuc3VyZU1haW5TY2VuZU9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgY29uc3QgaGllcmFyY2h5ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwiZXhlY3V0ZS1zY2VuZS1zY3JpcHRcIiwge1xyXG4gICAgICAgICAgICBuYW1lOiBcImNvY29zLWNyZWF0b3ItbWNwXCIsXHJcbiAgICAgICAgICAgIG1ldGhvZDogXCJnZXRTY2VuZUhpZXJhcmNoeVwiLFxyXG4gICAgICAgICAgICBhcmdzOiBbZmFsc2VdLFxyXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IG51bGwpO1xyXG5cclxuICAgICAgICBpZiAoIWhpZXJhcmNoeT8uc2NlbmVOYW1lIHx8IGhpZXJhcmNoeS5zY2VuZU5hbWUgPT09IFwic2NlbmUtMmRcIikge1xyXG4gICAgICAgICAgICAvLyDjg5fjg63jgrjjgqfjgq/jg4joqK3lrprjga5TdGFydCBTY2VuZeOCkuWPgueFp1xyXG4gICAgICAgICAgICBsZXQgc2NlbmVVdWlkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHNjZW5lVXVpZCA9IGF3YWl0IChFZGl0b3IgYXMgYW55KS5Qcm9maWxlLmdldENvbmZpZyhcInByZXZpZXdcIiwgXCJnZW5lcmFsLnN0YXJ0X3NjZW5lXCIsIFwibG9jYWxcIik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxyXG5cclxuICAgICAgICAgICAgLy8gU3RhcnQgU2NlbmXjgYzmnKroqK3lrpogb3IgXCJjdXJyZW50X3NjZW5lXCIg44Gu5aC05ZCI44CB5pyA5Yid44Gu44K344O844Oz44KS5L2/44GGXHJcbiAgICAgICAgICAgIGlmICghc2NlbmVVdWlkIHx8IHNjZW5lVXVpZCA9PT0gXCJjdXJyZW50X3NjZW5lXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lcyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJhc3NldC1kYlwiLCBcInF1ZXJ5LWFzc2V0c1wiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2NUeXBlOiBcImNjLlNjZW5lQXNzZXRcIixcclxuICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuOiBcImRiOi8vYXNzZXRzLyoqLypcIixcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc2NlbmVzKSAmJiBzY2VuZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lVXVpZCA9IHNjZW5lc1swXS51dWlkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoc2NlbmVVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkZWJ1Z19wcmV2aWV3IOWGhemDqOOBruiHquWLlemBt+enu+OBryBwcmV2aWV3IOOCkuWEquWFiOOBl+OBpiBmb3JjZT10cnVlXHJcbiAgICAgICAgICAgICAgICAvLyDvvIhkaWFsb2cg5Ye644KL44KI44KKIHByZXZpZXcg6ZaL5aeL44KS5YSq5YWI44GZ44KL6YGL55So77yJXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBlbnN1cmVTY2VuZVNhZmVUb1N3aXRjaCh0cnVlKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcIm9wZW4tc2NlbmVcIiwgc2NlbmVVdWlkKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxNTAwKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjbGVhckNvZGVDYWNoZSgpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBlbGVjdHJvbiA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTtcclxuICAgICAgICAgICAgY29uc3QgbWVudSA9IGVsZWN0cm9uLk1lbnUuZ2V0QXBwbGljYXRpb25NZW51KCk7XHJcbiAgICAgICAgICAgIGlmICghbWVudSkgcmV0dXJuIGVycihcIkFwcGxpY2F0aW9uIG1lbnUgbm90IGZvdW5kXCIpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZmluZE1lbnVJdGVtID0gKGl0ZW1zOiBhbnlbXSwgcGF0aDogc3RyaW5nW10pOiBhbnkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ubGFiZWwgPT09IHBhdGhbMF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSByZXR1cm4gaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uc3VibWVudT8uaXRlbXMpIHJldHVybiBmaW5kTWVudUl0ZW0oaXRlbS5zdWJtZW51Lml0ZW1zLCBwYXRoLnNsaWNlKDEpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlSXRlbSA9IGZpbmRNZW51SXRlbShtZW51Lml0ZW1zLCBbXCJEZXZlbG9wZXJcIiwgXCJDYWNoZVwiLCBcIkNsZWFyIGNvZGUgY2FjaGVcIl0pO1xyXG4gICAgICAgICAgICBpZiAoIWNhY2hlSXRlbSkgcmV0dXJuIGVycihcIk1lbnUgaXRlbSAnRGV2ZWxvcGVyID4gQ2FjaGUgPiBDbGVhciBjb2RlIGNhY2hlJyBub3QgZm91bmRcIik7XHJcblxyXG4gICAgICAgICAgICBjYWNoZUl0ZW0uY2xpY2soKTtcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbm90ZTogXCJDb2RlIGNhY2hlIGNsZWFyZWQgdmlhIG1lbnVcIiB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnYW1lQ29tbWFuZCh0eXBlOiBzdHJpbmcsIGFyZ3M6IGFueSwgdGltZW91dDogbnVtYmVyLCBtYXhXaWR0aD86IG51bWJlciwgaW1hZ2VGb3JtYXQ/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCBjbWRJZCA9IHF1ZXVlR2FtZUNvbW1hbmQodHlwZSwgYXJncyk7XHJcblxyXG4gICAgICAgIC8vIFBvbGwgZm9yIHJlc3VsdFxyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuICAgICAgICB3aGlsZSAoRGF0ZS5ub3coKSAtIHN0YXJ0IDwgdGltZW91dCkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBnZXRDb21tYW5kUmVzdWx0KCk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LmlkID09PSBjbWRJZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgc2NyZWVuc2hvdCwgc2F2ZSB0byBmaWxlIGFuZCByZXR1cm4gcGF0aFxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IFwic2NyZWVuc2hvdFwiICYmIHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5kYXRhPy5kYXRhVXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnRtcERpciwgXCJzY3JlZW5zaG90c1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIGZzLm1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCBcIi1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IHJlc3VsdC5kYXRhLmRhdGFVcmwucmVwbGFjZSgvXmRhdGE6aW1hZ2VcXC9wbmc7YmFzZTY0LC8sIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwbmdCdWZmZXIgPSBCdWZmZXIuZnJvbShiYXNlNjQsIFwiYmFzZTY0XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlZmZlY3RpdmVNYXhXaWR0aCA9IG1heFdpZHRoICE9PSB1bmRlZmluZWQgPyBtYXhXaWR0aCA6IDk2MDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlY3Ryb24gPSByZXF1aXJlKFwiZWxlY3Ryb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdJbWFnZSA9IGVsZWN0cm9uLm5hdGl2ZUltYWdlLmNyZWF0ZUZyb21CdWZmZXIocG5nQnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxTaXplID0gb3JpZ0ltYWdlLmdldFNpemUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBidWZmZXIsIHdpZHRoLCBoZWlnaHQsIGZvcm1hdCB9ID0gYXdhaXQgcHJvY2Vzc0ltYWdlKHBuZ0J1ZmZlciwgZWZmZWN0aXZlTWF4V2lkdGgsIGltYWdlRm9ybWF0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0ID0gZm9ybWF0ID09PSBcIndlYnBcIiA/IFwid2VicFwiIDogZm9ybWF0ID09PSBcImpwZWdcIiA/IFwianBnXCIgOiBcInBuZ1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihkaXIsIGBnYW1lXyR7dGltZXN0YW1wfS4ke2V4dH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgYnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIHBhdGg6IGZpbGVQYXRoLCBzaXplOiBidWZmZXIubGVuZ3RoLCBmb3JtYXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFNpemU6IGAke29yaWdpbmFsU2l6ZS53aWR0aH14JHtvcmlnaW5hbFNpemUuaGVpZ2h0fWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlZFNpemU6IGAke3dpZHRofXgke2hlaWdodH1gLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbm90ZTogXCJTY3JlZW5zaG90IGNhcHR1cmVkIGJ1dCBmaWxlIHNhdmUgZmFpbGVkXCIsIGVycm9yOiBlLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDIwMCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZXJyKGBHYW1lIGRpZCBub3QgcmVzcG9uZCB3aXRoaW4gJHt0aW1lb3V0fW1zLiBJcyBHYW1lRGVidWdDbGllbnQgcnVubmluZyBpbiB0aGUgcHJldmlldz9gKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHRha2VTY3JlZW5zaG90KHNhdmVQYXRoPzogc3RyaW5nLCBtYXhXaWR0aD86IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRha2VFZGl0b3JTY3JlZW5zaG90KHNhdmVQYXRoLCBtYXhXaWR0aCk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayhyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbG9hZEV4dGVuc2lvbigpOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICAvLyBTY2hlZHVsZSByZWxvYWQgYWZ0ZXIgcmVzcG9uc2UgaXMgc2VudFxyXG4gICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImV4dGVuc2lvblwiLCBcInJlbG9hZFwiLCBcImNvY29zLWNyZWF0b3ItbWNwXCIpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbTUNQXSBFeHRlbnNpb24gcmVsb2FkIGZhaWxlZDpcIiwgZS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgbm90ZTogXCJFeHRlbnNpb24gcmVsb2FkIHNjaGVkdWxlZC4gTUNQIHNlcnZlciB3aWxsIHJlc3RhcnQgaW4gfjFzLiBOT1RFOiBBZGRpbmcgbmV3IHRvb2wgZGVmaW5pdGlvbnMgb3IgbW9kaWZ5aW5nIHNjZW5lLnRzIHJlcXVpcmVzIGEgZnVsbCBDb2Nvc0NyZWF0b3IgcmVzdGFydCAocmVsb2FkIGlzIG5vdCBzdWZmaWNpZW50KS5cIiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoU2NyZWVuc2hvdChwYWdlczogc3RyaW5nW10sIGRlbGF5OiBudW1iZXIsIG1heFdpZHRoPzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0czogYW55W10gPSBbXTtcclxuICAgICAgICBjb25zdCB0aW1lb3V0ID0gMTAwMDA7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBwYWdlcykge1xyXG4gICAgICAgICAgICAvLyBOYXZpZ2F0ZVxyXG4gICAgICAgICAgICBjb25zdCBuYXZSZXN1bHQgPSBhd2FpdCB0aGlzLmdhbWVDb21tYW5kKFwibmF2aWdhdGVcIiwgeyBwYWdlIH0sIHRpbWVvdXQsIG1heFdpZHRoKTtcclxuICAgICAgICAgICAgY29uc3QgbmF2RGF0YSA9IEpTT04ucGFyc2UobmF2UmVzdWx0LmNvbnRlbnRbMF0udGV4dCk7XHJcbiAgICAgICAgICAgIGlmICghbmF2RGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBwYWdlLCBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwibmF2aWdhdGUgZmFpbGVkXCIgfSk7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgcGFnZSB0byByZW5kZXJcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIGRlbGF5KSk7XHJcblxyXG4gICAgICAgICAgICAvLyBTY3JlZW5zaG90XHJcbiAgICAgICAgICAgIGNvbnN0IHNzUmVzdWx0ID0gYXdhaXQgdGhpcy5nYW1lQ29tbWFuZChcInNjcmVlbnNob3RcIiwge30sIHRpbWVvdXQsIG1heFdpZHRoKTtcclxuICAgICAgICAgICAgY29uc3Qgc3NEYXRhID0gSlNPTi5wYXJzZShzc1Jlc3VsdC5jb250ZW50WzBdLnRleHQpO1xyXG4gICAgICAgICAgICByZXN1bHRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgcGFnZSxcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHNzRGF0YS5zdWNjZXNzIHx8IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogc3NEYXRhLnBhdGgsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogc3NEYXRhLnN1Y2Nlc3MgPyB1bmRlZmluZWQgOiAoc3NEYXRhLmVycm9yIHx8IHNzRGF0YS5tZXNzYWdlKSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzdWNjZWVkZWQgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuc3VjY2VzcykubGVuZ3RoO1xyXG4gICAgICAgIHJldHVybiBvayh7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIHRvdGFsOiBwYWdlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgIHN1Y2NlZWRlZCxcclxuICAgICAgICAgICAgZmFpbGVkOiBwYWdlcy5sZW5ndGggLSBzdWNjZWVkZWQsXHJcbiAgICAgICAgICAgIHJlc3VsdHMsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwic2NlbmVcIiwgXCJxdWVyeS1ub2RlLXRyZWVcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgY2hlY2tOb2RlcyA9IChub2RlczogYW55W10pID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghbm9kZXMpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbm9kZS5uYW1lKSBpc3N1ZXMucHVzaChgTm9kZSAke25vZGUudXVpZH0gaGFzIG5vIG5hbWVgKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikgY2hlY2tOb2Rlcyhub2RlLmNoaWxkcmVuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodHJlZSkpIGNoZWNrTm9kZXModHJlZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGlzc3VlQ291bnQ6IGlzc3Vlcy5sZW5ndGgsIGlzc3VlcyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUeXBlU2NyaXB0IOOCs+ODs+ODkeOCpOODq+WujOS6huOCkuW+heOBpOOAglxyXG4gICAgICogcGFja2VyLWRyaXZlciDjga4gZGVidWcubG9nIOOBqyBcIlRhcmdldChlZGl0b3IpIGVuZHNcIiDjgYznj77jgozjgovjga7jgpLnm6PoppbjgZnjgovjgIJcclxuICAgICAqIOaXouOBq+OCs+ODs+ODkeOCpOODq+a4iOOBv++8iOebtOi/keaVsOenkuS7peWGheOBq+WujOS6huODreOCsOOBguOCiu+8ieOBquOCieWNs+W6p+OBq+i/lOOBmeOAglxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIHdhaXRDb21waWxlKHRpbWVvdXQ6IG51bWJlciwgY2xlYW46IGJvb2xlYW4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIFwidGVtcFwiLCBcInByb2dyYW1taW5nXCIsIFwicGFja2VyLWRyaXZlclwiLCBcImxvZ3NcIiwgXCJkZWJ1Zy5sb2dcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGNodW5rc0RpciA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCBcInRlbXBcIiwgXCJwcm9ncmFtbWluZ1wiLCBcInBhY2tlci1kcml2ZXJcIiwgXCJ0YXJnZXRzXCIsIFwiZWRpdG9yXCIsIFwiY2h1bmtzXCIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBDb21waWxlIGxvZyBub3QgZm91bmQ6ICR7bG9nUGF0aH1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgTUFSS0VSID0gXCJUYXJnZXQoZWRpdG9yKSBlbmRzXCI7XHJcblxyXG4gICAgICAgICAgICAvLyBjbGVhbiDjg6Ljg7zjg4k6IOOCs+ODvOODieOCreODo+ODg+OCt+ODpeOCr+ODquOCoiArIHNvZnQtcmVsb2FkIOOBp+WGjeOCs+ODs+ODkeOCpOODq+OCkuW8t+WItlxyXG4gICAgICAgICAgICBpZiAoY2xlYW4pIHtcclxuICAgICAgICAgICAgICAgIC8vIERldmVsb3BlciA+IENhY2hlID4gQ2xlYXIgY29kZSBjYWNoZSDjgpLjgq/jg6rjg4Pjgq9cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlY3Ryb24gPSByZXF1aXJlKFwiZWxlY3Ryb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVudSA9IGVsZWN0cm9uLk1lbnUuZ2V0QXBwbGljYXRpb25NZW51KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluZE1lbnVJdGVtID0gKGl0ZW1zOiBhbnlbXSwgbGFiZWxzOiBzdHJpbmdbXSk6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ubGFiZWwgPT09IGxhYmVsc1swXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYWJlbHMubGVuZ3RoID09PSAxKSByZXR1cm4gaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5zdWJtZW51Py5pdGVtcykgcmV0dXJuIGZpbmRNZW51SXRlbShpdGVtLnN1Ym1lbnUuaXRlbXMsIGxhYmVscy5zbGljZSgxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWNoZUl0ZW0gPSBtZW51ID8gZmluZE1lbnVJdGVtKG1lbnUuaXRlbXMsIFtcIkRldmVsb3BlclwiLCBcIkNhY2hlXCIsIFwiQ2xlYXIgY29kZSBjYWNoZVwiXSkgOiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYWNoZUl0ZW0pIGNhY2hlSXRlbS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2UpIHsgLyogaWdub3JlICovIH1cclxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuICAgICAgICAgICAgICAgIC8vIHNvZnQtcmVsb2FkIOOBp+OCt+ODvOODs+OCkuWGjeiqreOBv+i+vOOBvyDihpIg44Kz44Oz44OR44Kk44Or44OI44Oq44Ks44O8XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJzb2Z0LXJlbG9hZFwiKS5jYXRjaCgoKSA9PiB7fSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHJlZnJlc2gtYXNzZXQg44Gn44OV44Kh44Kk44Or5aSJ5pu044KSIENDIOOBq+mAmuefpeOBl+OBpuOCs+ODs+ODkeOCpOODq+OCkuODiOODquOCrOODvFxyXG4gICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYXNzZXQtZGJcIiwgXCJyZWZyZXNoLWFzc2V0XCIsIFwiZGI6Ly9hc3NldHNcIikuY2F0Y2goKCkgPT4ge30pO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFNpemUgPSBmcy5zdGF0U3luYyhsb2dQYXRoKS5zaXplO1xyXG4gICAgICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICBjb25zdCBQT0xMX0lOVEVSVkFMID0gMjAwO1xyXG4gICAgICAgICAgICBjb25zdCBERVRFQ1RfR1JBQ0VfTVMgPSAyMDAwOyAvLyBDQyDjgYzjg5XjgqHjgqTjg6vlpInmm7TjgpLmpJznn6XjgZnjgovjgb7jgafjga7njLbkuohcclxuXHJcbiAgICAgICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lIDwgdGltZW91dCkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIFBPTExfSU5URVJWQUwpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50U2l6ZSA9IGZzLnN0YXRTeW5jKGxvZ1BhdGgpLnNpemU7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g44Ot44Kw44GM5oiQ6ZW344GX44Gm44GE44Gq44GEXHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFNpemUgPD0gaW5pdGlhbFNpemUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjbGVhbiDjg6Ljg7zjg4njgafjga/lv4XjgZrjgrPjg7Pjg5HjgqTjg6vjgYzotbDjgovjga7jgafnjLbkuojliKTlrprjgZfjgarjgYRcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2xlYW4pIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeMtuS6iOacn+mWk+WGheOBr+OBvuOBoOW+heOBpCAoQ0Mg44Gu5qSc55+l44GM6YGF44GE5Y+v6IO95oCnKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lIDwgREVURUNUX0dSQUNFX01TKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDnjLbkuojmnJ/plpPjgpLpgY7jgY7jgabjgoLjg63jgrDjgYzmiJDplbfjgZfjgarjgYQg4oaSIOOCs+ODs+ODkeOCpOODq+S4jeimgVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGNvbXBpbGVkOiB0cnVlLCB3YWl0ZWRNczogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSwgbm90ZTogXCJObyBjb21waWxhdGlvbiB0cmlnZ2VyZWQgKG5vIGNoYW5nZXMgZGV0ZWN0ZWQpXCIgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g44Ot44Kw44GM5oiQ6ZW344GX44GfIOKGkiDmlrDjgZfjgYTpg6jliIbjgavjg57jg7zjgqvjg7zjgYzjgYLjgovjgYvnorroqo1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGZkID0gZnMub3BlblN5bmMobG9nUGF0aCwgXCJyXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Qnl0ZXMgPSBjdXJyZW50U2l6ZSAtIGluaXRpYWxTaXplO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmFsbG9jKG5ld0J5dGVzKTtcclxuICAgICAgICAgICAgICAgIGZzLnJlYWRTeW5jKGZkLCBidWZmZXIsIDAsIG5ld0J5dGVzLCBpbml0aWFsU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICBmcy5jbG9zZVN5bmMoZmQpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGJ1ZmZlci50b1N0cmluZyhcInV0ZjhcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRlbnQuaW5jbHVkZXMoTUFSS0VSKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGNvbXBpbGVkOiB0cnVlLCB3YWl0ZWRNczogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgY29tcGlsZWQ6IGZhbHNlLCB0aW1lb3V0OiB0cnVlLCB3YWl0ZWRNczogdGltZW91dCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBOb3JtYWxpemUgdmFyaW91cyBsZXZlbCAvIHR5cGUgc3BlbGxpbmdzIHRvIGEgY2Fub25pY2FsIFwibG9nXCJ8XCJpbmZvXCJ8XCJ3YXJuXCJ8XCJlcnJvclwiIHN0cmluZy4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplVHlwZShyYXc6IGFueSk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzID0gU3RyaW5nKHJhdyA/PyBcIlwiKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKHMgPT09IFwid2FybmluZ1wiKSByZXR1cm4gXCJ3YXJuXCI7XHJcbiAgICBpZiAocyA9PT0gXCJlcnJcIikgcmV0dXJuIFwiZXJyb3JcIjtcclxuICAgIGlmIChzID09PSBcImxvZ1wiIHx8IHMgPT09IFwiaW5mb1wiIHx8IHMgPT09IFwid2FyblwiIHx8IHMgPT09IFwiZXJyb3JcIikgcmV0dXJuIHM7XHJcbiAgICByZXR1cm4gXCJsb2dcIjtcclxufVxyXG5cclxuLyoqIEVzY2FwZSBhIHN0cmluZyBzbyBpdCBjYW4gYmUgZW1iZWRkZWQgaW50byBhIFJlZ0V4cCBsaXRlcmFsbHkuICovXHJcbmZ1bmN0aW9uIGVzY2FwZVJlZ2V4KHM6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gcy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XHJcbn1cclxuIl19