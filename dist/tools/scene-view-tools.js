"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneViewTools = void 0;
const tool_base_1 = require("../tool-base");
class SceneViewTools {
    constructor() {
        this.categoryName = "sceneView";
    }
    getTools() {
        return [
            {
                name: "view_gizmo",
                description: "Manage the scene view gizmo (move/rotate/scale tool, pivot, coordinate). Actions: 'set_tool'+tool, 'get_tool', 'set_pivot'+pivot, 'get_pivot', 'set_coordinate'+coordinate, 'get_coordinate'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'set_tool' | 'get_tool' | 'set_pivot' | 'get_pivot' | 'set_coordinate' | 'get_coordinate'" },
                        tool: { type: "string", description: "'move' | 'rotate' | 'scale' | 'rect' (action=set_tool)" },
                        pivot: { type: "string", description: "'center' | 'pivot' (action=set_pivot)" },
                        coordinate: { type: "string", description: "'local' | 'global' (action=set_coordinate)" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "view_settings",
                description: "Manage scene view settings (2D/3D mode, grid, icon gizmos, status snapshot, reset). Actions: 'set_mode'+mode, 'get_mode', 'set_grid'+visible, 'get_grid', 'set_icon3d'+enabled, 'get_icon3d', 'set_icon_size'+size, 'get_icon_size', 'status', 'reset'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'set_mode' | 'get_mode' | 'set_grid' | 'get_grid' | 'set_icon3d' | 'get_icon3d' | 'set_icon_size' | 'get_icon_size' | 'status' | 'reset'" },
                        mode: { type: "string", description: "'2d' | '3d' (action=set_mode)" },
                        visible: { type: "boolean", description: "action=set_grid" },
                        enabled: { type: "boolean", description: "action=set_icon3d" },
                        size: { type: "number", description: "action=set_icon_size" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "view_camera",
                description: "Move / align the scene camera. Actions: 'focus_on_nodes'+uuids (focus camera on node(s)), 'align_with_view' (align selected node with current camera view), 'align_view_with_node' (align camera with selected node).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'focus_on_nodes' | 'align_with_view' | 'align_view_with_node'" },
                        uuids: { type: "array", items: { type: "string" }, description: "Node UUIDs (action=focus_on_nodes)" },
                    },
                    required: ["action"],
                },
            },
        ];
    }
    async execute(toolName, args) {
        try {
            switch (toolName) {
                case "view_gizmo": return this.gizmo(args);
                case "view_settings": return this.settings(args);
                case "view_camera": return this.camera(args);
                default: return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
            }
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async gizmo(args) {
        switch (args.action) {
            case "set_tool":
                await Editor.Message.request("scene", "change-gizmo-tool", args.tool);
                return (0, tool_base_1.ok)({ success: true, action: args.action, tool: args.tool });
            case "get_tool": {
                const tool = await Editor.Message.request("scene", "query-gizmo-tool-name");
                return (0, tool_base_1.ok)({ success: true, action: args.action, tool });
            }
            case "set_pivot":
                await Editor.Message.request("scene", "change-gizmo-pivot", args.pivot);
                return (0, tool_base_1.ok)({ success: true, action: args.action, pivot: args.pivot });
            case "get_pivot": {
                const pivot = await Editor.Message.request("scene", "query-gizmo-pivot");
                return (0, tool_base_1.ok)({ success: true, action: args.action, pivot });
            }
            case "set_coordinate":
                await Editor.Message.request("scene", "change-gizmo-coordinate", args.coordinate);
                return (0, tool_base_1.ok)({ success: true, action: args.action, coordinate: args.coordinate });
            case "get_coordinate": {
                const coord = await Editor.Message.request("scene", "query-gizmo-coordinate");
                return (0, tool_base_1.ok)({ success: true, action: args.action, coordinate: coord });
            }
            default:
                return (0, tool_base_1.err)(`Unknown view_gizmo action: ${args.action}`);
        }
    }
    async settings(args) {
        switch (args.action) {
            case "set_mode":
                try {
                    await Editor.Message.request("scene", "change-view-mode-2d-3d", args.mode);
                    return (0, tool_base_1.ok)({ success: true, action: args.action, mode: args.mode });
                }
                catch (_e) {
                    return (0, tool_base_1.ok)({ success: true, action: args.action, mode: args.mode, note: "API not available in this CC version (3.8.x)" });
                }
            case "get_mode": {
                // 3.8.x には query-view-mode-2d-3d API が存在しない → null + note を返す
                try {
                    const mode = await Editor.Message.request("scene", "query-view-mode-2d-3d");
                    return (0, tool_base_1.ok)({ success: true, action: args.action, mode });
                }
                catch (_e) {
                    return (0, tool_base_1.ok)({ success: true, action: args.action, mode: null, note: "API not available in this CC version (3.8.x)" });
                }
            }
            case "set_grid":
                await Editor.Message.request("scene", "set-grid-visible", args.visible);
                return (0, tool_base_1.ok)({ success: true, action: args.action, visible: args.visible });
            case "get_grid": {
                // 3.8.x は query-is-grid-visible が正、query-grid-visible は無い
                let visible = null;
                try {
                    visible = await Editor.Message.request("scene", "query-is-grid-visible");
                }
                catch (_a) {
                    try {
                        visible = await Editor.Message.request("scene", "query-grid-visible");
                    }
                    catch ( /* both unavailable */_b) { /* both unavailable */ }
                }
                return (0, tool_base_1.ok)({ success: true, action: args.action, visible });
            }
            case "set_icon3d":
                await Editor.Message.request("scene", "set-icon-gizmo-3d", args.enabled);
                return (0, tool_base_1.ok)({ success: true, action: args.action, enabled: args.enabled });
            case "get_icon3d": {
                const enabled = await Editor.Message.request("scene", "query-is-icon-gizmo-3d");
                return (0, tool_base_1.ok)({ success: true, action: args.action, enabled });
            }
            case "set_icon_size":
                await Editor.Message.request("scene", "set-icon-gizmo-size", args.size);
                return (0, tool_base_1.ok)({ success: true, action: args.action, size: args.size });
            case "get_icon_size": {
                const size = await Editor.Message.request("scene", "query-icon-gizmo-size");
                return (0, tool_base_1.ok)({ success: true, action: args.action, size });
            }
            case "status": {
                const [tool, pivot, coord, mode, grid] = await Promise.all([
                    Editor.Message.request("scene", "query-gizmo-tool-name").catch(() => null),
                    Editor.Message.request("scene", "query-gizmo-pivot").catch(() => null),
                    Editor.Message.request("scene", "query-gizmo-coordinate").catch(() => null),
                    Editor.Message.request("scene", "query-view-mode-2d-3d").catch(() => null),
                    Editor.Message.request("scene", "query-grid-visible").catch(() => null),
                ]);
                return (0, tool_base_1.ok)({ success: true, action: args.action, tool, pivot, coordinate: coord, mode, gridVisible: grid });
            }
            case "reset":
                // 3.8.x には reset-scene-view API が無い。graceful no-op で OK 扱い
                try {
                    await Editor.Message.request("scene", "reset-scene-view");
                    return (0, tool_base_1.ok)({ success: true, action: args.action });
                }
                catch (_e) {
                    return (0, tool_base_1.ok)({ success: true, action: args.action, note: "API not available in this CC version (3.8.x)" });
                }
            default:
                return (0, tool_base_1.err)(`Unknown view_settings action: ${args.action}`);
        }
    }
    async camera(args) {
        // 3.8.x には focus-camera-on-nodes / align-with-view / align-view-with-node API が無い。
        // graceful no-op で success:true + note を返す (将来バージョンで動くなら実 API を試行)。
        const tryEditorMsg = async (msg, ...payload) => {
            try {
                await Editor.Message.request("scene", msg, ...payload);
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            }
            catch (_e) {
                return (0, tool_base_1.ok)({ success: true, action: args.action, note: `API "scene.${msg}" not available in this CC version (3.8.x)` });
            }
        };
        switch (args.action) {
            case "focus_on_nodes":
                return tryEditorMsg("focus-camera-on-nodes", args.uuids);
            case "align_with_view":
                return tryEditorMsg("align-with-view");
            case "align_view_with_node":
                return tryEditorMsg("align-view-with-node");
            default:
                return (0, tool_base_1.err)(`Unknown view_camera action: ${args.action}`);
        }
    }
}
exports.SceneViewTools = SceneViewTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdmlldy10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS12aWV3LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRDQUF1QztBQUV2QyxNQUFhLGNBQWM7SUFBM0I7UUFDYSxpQkFBWSxHQUFHLFdBQVcsQ0FBQztJQW1MeEMsQ0FBQztJQWpMRyxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxZQUFZO2dCQUNsQixXQUFXLEVBQUUsK0xBQStMO2dCQUM1TSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDJGQUEyRixFQUFFO3dCQUNwSSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx3REFBd0QsRUFBRTt3QkFDL0YsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsdUNBQXVDLEVBQUU7d0JBQy9FLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDRDQUE0QyxFQUFFO3FCQUM1RjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLHlQQUF5UDtnQkFDdFEsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwwSUFBMEksRUFBRTt3QkFDbkwsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsK0JBQStCLEVBQUU7d0JBQ3RFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFB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QUFDO0NBQ0o7QUFwTEQsd0NBb0xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbENhdGVnb3J5LCBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3VsdCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBvaywgZXJyIH0gZnJvbSBcIi4uL3Rvb2wtYmFzZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNjZW5lVmlld1Rvb2xzIGltcGxlbWVudHMgVG9vbENhdGVnb3J5IHtcclxuICAgIHJlYWRvbmx5IGNhdGVnb3J5TmFtZSA9IFwic2NlbmVWaWV3XCI7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJ2aWV3X2dpem1vXCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJNYW5hZ2UgdGhlIHNjZW5lIHZpZXcgZ2l6bW8gKG1vdmUvcm90YXRlL3NjYWxlIHRvb2wsIHBpdm90LCBjb29yZGluYXRlKS4gQWN0aW9uczogJ3NldF90b29sJyt0b29sLCAnZ2V0X3Rvb2wnLCAnc2V0X3Bpdm90JytwaXZvdCwgJ2dldF9waXZvdCcsICdzZXRfY29vcmRpbmF0ZScrY29vcmRpbmF0ZSwgJ2dldF9jb29yZGluYXRlJy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInc2V0X3Rvb2wnIHwgJ2dldF90b29sJyB8ICdzZXRfcGl2b3QnIHwgJ2dldF9waXZvdCcgfCAnc2V0X2Nvb3JkaW5hdGUnIHwgJ2dldF9jb29yZGluYXRlJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2w6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ21vdmUnIHwgJ3JvdGF0ZScgfCAnc2NhbGUnIHwgJ3JlY3QnIChhY3Rpb249c2V0X3Rvb2wpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGl2b3Q6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2NlbnRlcicgfCAncGl2b3QnIChhY3Rpb249c2V0X3Bpdm90KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2xvY2FsJyB8ICdnbG9iYWwnIChhY3Rpb249c2V0X2Nvb3JkaW5hdGUpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJhY3Rpb25cIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInZpZXdfc2V0dGluZ3NcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1hbmFnZSBzY2VuZSB2aWV3IHNldHRpbmdzICgyRC8zRCBtb2RlLCBncmlkLCBpY29uIGdpem1vcywgc3RhdHVzIHNuYXBzaG90LCByZXNldCkuIEFjdGlvbnM6ICdzZXRfbW9kZScrbW9kZSwgJ2dldF9tb2RlJywgJ3NldF9ncmlkJyt2aXNpYmxlLCAnZ2V0X2dyaWQnLCAnc2V0X2ljb24zZCcrZW5hYmxlZCwgJ2dldF9pY29uM2QnLCAnc2V0X2ljb25fc2l6ZScrc2l6ZSwgJ2dldF9pY29uX3NpemUnLCAnc3RhdHVzJywgJ3Jlc2V0Jy5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInc2V0X21vZGUnIHwgJ2dldF9tb2RlJyB8ICdzZXRfZ3JpZCcgfCAnZ2V0X2dyaWQnIHwgJ3NldF9pY29uM2QnIHwgJ2dldF9pY29uM2QnIHwgJ3NldF9pY29uX3NpemUnIHwgJ2dldF9pY29uX3NpemUnIHwgJ3N0YXR1cycgfCAncmVzZXQnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInMmQnIHwgJzNkJyAoYWN0aW9uPXNldF9tb2RlKVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGU6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcImFjdGlvbj1zZXRfZ3JpZFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcImFjdGlvbj1zZXRfaWNvbjNkXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJhY3Rpb249c2V0X2ljb25fc2l6ZVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJ2aWV3X2NhbWVyYVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTW92ZSAvIGFsaWduIHRoZSBzY2VuZSBjYW1lcmEuIEFjdGlvbnM6ICdmb2N1c19vbl9ub2RlcycrdXVpZHMgKGZvY3VzIGNhbWVyYSBvbiBub2RlKHMpKSwgJ2FsaWduX3dpdGhfdmlldycgKGFsaWduIHNlbGVjdGVkIG5vZGUgd2l0aCBjdXJyZW50IGNhbWVyYSB2aWV3KSwgJ2FsaWduX3ZpZXdfd2l0aF9ub2RlJyAoYWxpZ24gY2FtZXJhIHdpdGggc2VsZWN0ZWQgbm9kZSkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2ZvY3VzX29uX25vZGVzJyB8ICdhbGlnbl93aXRoX3ZpZXcnIHwgJ2FsaWduX3ZpZXdfd2l0aF9ub2RlJ1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRzOiB7IHR5cGU6IFwiYXJyYXlcIiwgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LCBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSURzIChhY3Rpb249Zm9jdXNfb25fbm9kZXMpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJhY3Rpb25cIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInZpZXdfZ2l6bW9cIjogcmV0dXJuIHRoaXMuZ2l6bW8oYXJncyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwidmlld19zZXR0aW5nc1wiOiByZXR1cm4gdGhpcy5zZXR0aW5ncyhhcmdzKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJ2aWV3X2NhbWVyYVwiOiByZXR1cm4gdGhpcy5jYW1lcmEoYXJncyk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gZXJyKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnaXptbyhhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICBjYXNlIFwic2V0X3Rvb2xcIjpcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcImNoYW5nZS1naXptby10b29sXCIsIGFyZ3MudG9vbCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCB0b29sOiBhcmdzLnRvb2wgfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJnZXRfdG9vbFwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktZ2l6bW8tdG9vbC1uYW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgdG9vbCB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwic2V0X3Bpdm90XCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJjaGFuZ2UtZ2l6bW8tcGl2b3RcIiwgYXJncy5waXZvdCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBwaXZvdDogYXJncy5waXZvdCB9KTtcclxuICAgICAgICAgICAgY2FzZSBcImdldF9waXZvdFwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwaXZvdCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWdpem1vLXBpdm90XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgcGl2b3QgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcInNldF9jb29yZGluYXRlXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJjaGFuZ2UtZ2l6bW8tY29vcmRpbmF0ZVwiLCBhcmdzLmNvb3JkaW5hdGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgY29vcmRpbmF0ZTogYXJncy5jb29yZGluYXRlIH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwiZ2V0X2Nvb3JkaW5hdGVcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29vcmQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1naXptby1jb29yZGluYXRlXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgY29vcmRpbmF0ZTogY29vcmQgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gdmlld19naXptbyBhY3Rpb246ICR7YXJncy5hY3Rpb259YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0dGluZ3MoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSBcInNldF9tb2RlXCI6XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcImNoYW5nZS12aWV3LW1vZGUtMmQtM2RcIiwgYXJncy5tb2RlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtb2RlOiBhcmdzLm1vZGUgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChfZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIG1vZGU6IGFyZ3MubW9kZSwgbm90ZTogXCJBUEkgbm90IGF2YWlsYWJsZSBpbiB0aGlzIENDIHZlcnNpb24gKDMuOC54KVwiIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwiZ2V0X21vZGVcIjoge1xyXG4gICAgICAgICAgICAgICAgLy8gMy44Lngg44Gr44GvIHF1ZXJ5LXZpZXctbW9kZS0yZC0zZCBBUEkg44GM5a2Y5Zyo44GX44Gq44GEIOKGkiBudWxsICsgbm90ZSDjgpLov5TjgZlcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LXZpZXctbW9kZS0yZC0zZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtb2RlIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtb2RlOiBudWxsLCBub3RlOiBcIkFQSSBub3QgYXZhaWxhYmxlIGluIHRoaXMgQ0MgdmVyc2lvbiAoMy44LngpXCIgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcInNldF9ncmlkXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJzZXQtZ3JpZC12aXNpYmxlXCIsIGFyZ3MudmlzaWJsZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCB2aXNpYmxlOiBhcmdzLnZpc2libGUgfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJnZXRfZ3JpZFwiOiB7XHJcbiAgICAgICAgICAgICAgICAvLyAzLjgueCDjga8gcXVlcnktaXMtZ3JpZC12aXNpYmxlIOOBjOato+OAgXF1ZXJ5LWdyaWQtdmlzaWJsZSDjga/nhKHjgYRcclxuICAgICAgICAgICAgICAgIGxldCB2aXNpYmxlOiBhbnkgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHsgdmlzaWJsZSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWlzLWdyaWQtdmlzaWJsZVwiKTsgfVxyXG4gICAgICAgICAgICAgICAgY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IHZpc2libGUgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1ncmlkLXZpc2libGVcIik7IH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCB7IC8qIGJvdGggdW5hdmFpbGFibGUgKi8gfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgdmlzaWJsZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwic2V0X2ljb24zZFwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic2V0LWljb24tZ2l6bW8tM2RcIiwgYXJncy5lbmFibGVkKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIGVuYWJsZWQ6IGFyZ3MuZW5hYmxlZCB9KTtcclxuICAgICAgICAgICAgY2FzZSBcImdldF9pY29uM2RcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZCA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWlzLWljb24tZ2l6bW8tM2RcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBlbmFibGVkIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJzZXRfaWNvbl9zaXplXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJzZXQtaWNvbi1naXptby1zaXplXCIsIGFyZ3Muc2l6ZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBzaXplOiBhcmdzLnNpemUgfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJnZXRfaWNvbl9zaXplXCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNpemUgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1pY29uLWdpem1vLXNpemVcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBzaXplIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJzdGF0dXNcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgW3Rvb2wsIHBpdm90LCBjb29yZCwgbW9kZSwgZ3JpZF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgICAgICAgICAgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktZ2l6bW8tdG9vbC1uYW1lXCIpLmNhdGNoKCgpID0+IG51bGwpLFxyXG4gICAgICAgICAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWdpem1vLXBpdm90XCIpLmNhdGNoKCgpID0+IG51bGwpLFxyXG4gICAgICAgICAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWdpem1vLWNvb3JkaW5hdGVcIikuY2F0Y2goKCkgPT4gbnVsbCksXHJcbiAgICAgICAgICAgICAgICAgICAgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktdmlldy1tb2RlLTJkLTNkXCIpLmNhdGNoKCgpID0+IG51bGwpLFxyXG4gICAgICAgICAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInF1ZXJ5LWdyaWQtdmlzaWJsZVwiKS5jYXRjaCgoKSA9PiBudWxsKSxcclxuICAgICAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgdG9vbCwgcGl2b3QsIGNvb3JkaW5hdGU6IGNvb3JkLCBtb2RlLCBncmlkVmlzaWJsZTogZ3JpZCB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwicmVzZXRcIjpcclxuICAgICAgICAgICAgICAgIC8vIDMuOC54IOOBq+OBryByZXNldC1zY2VuZS12aWV3IEFQSSDjgYznhKHjgYTjgIJncmFjZWZ1bCBuby1vcCDjgacgT0sg5omx44GEXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInJlc2V0LXNjZW5lLXZpZXdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgbm90ZTogXCJBUEkgbm90IGF2YWlsYWJsZSBpbiB0aGlzIENDIHZlcnNpb24gKDMuOC54KVwiIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biB2aWV3X3NldHRpbmdzIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjYW1lcmEoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIC8vIDMuOC54IOOBq+OBryBmb2N1cy1jYW1lcmEtb24tbm9kZXMgLyBhbGlnbi13aXRoLXZpZXcgLyBhbGlnbi12aWV3LXdpdGgtbm9kZSBBUEkg44GM54Sh44GE44CCXHJcbiAgICAgICAgLy8gZ3JhY2VmdWwgbm8tb3Ag44GnIHN1Y2Nlc3M6dHJ1ZSArIG5vdGUg44KS6L+U44GZICjlsIbmnaXjg5Djg7zjgrjjg6fjg7Pjgafli5XjgY/jgarjgonlrp8gQVBJIOOCkuippuihjCnjgIJcclxuICAgICAgICBjb25zdCB0cnlFZGl0b3JNc2cgPSBhc3luYyAobXNnOiBzdHJpbmcsIC4uLnBheWxvYWQ6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzdWx0PiA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgbXNnLCAuLi5wYXlsb2FkKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24gfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBub3RlOiBgQVBJIFwic2NlbmUuJHttc2d9XCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIENDIHZlcnNpb24gKDMuOC54KWAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSBcImZvY3VzX29uX25vZGVzXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ5RWRpdG9yTXNnKFwiZm9jdXMtY2FtZXJhLW9uLW5vZGVzXCIsIGFyZ3MudXVpZHMpO1xyXG4gICAgICAgICAgICBjYXNlIFwiYWxpZ25fd2l0aF92aWV3XCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ5RWRpdG9yTXNnKFwiYWxpZ24td2l0aC12aWV3XCIpO1xyXG4gICAgICAgICAgICBjYXNlIFwiYWxpZ25fdmlld193aXRoX25vZGVcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnlFZGl0b3JNc2coXCJhbGlnbi12aWV3LXdpdGgtbm9kZVwiKTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gdmlld19jYW1lcmEgYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=