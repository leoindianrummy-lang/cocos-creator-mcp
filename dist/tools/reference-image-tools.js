"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceImageTools = void 0;
const tool_base_1 = require("../tool-base");
class ReferenceImageTools {
    constructor() {
        this.categoryName = "referenceImage";
    }
    getTools() {
        return [
            {
                name: "refimage_manage",
                description: "Manage scene-view reference image overlays. Actions: 'add' (path), 'remove' (index), 'clear_all', 'switch' (index), 'refresh'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'add' | 'remove' | 'clear_all' | 'switch' | 'refresh'" },
                        path: { type: "string", description: "Image file path or db:// path (action=add)" },
                        index: { type: "number", description: "Image index (action=remove|switch)" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "refimage_set",
                description: "Adjust the currently active reference image. Actions: 'position' ({x,y}), 'scale' (scale), 'opacity' (opacity 0-255).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'position' | 'scale' | 'opacity'" },
                        x: { type: "number" },
                        y: { type: "number" },
                        scale: { type: "number" },
                        opacity: { type: "number", description: "0-255" },
                    },
                    required: ["action"],
                },
            },
            {
                name: "refimage_query",
                description: "Query reference image state. Actions: 'list' (all images / config), 'current' (active image info).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'list' (default) | 'current'" },
                    },
                },
            },
        ];
    }
    async execute(toolName, args) {
        try {
            switch (toolName) {
                case "refimage_manage":
                    return this.manage(args);
                case "refimage_set":
                    return this.set(args);
                case "refimage_query":
                    return this.query(args);
                default:
                    return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
            }
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
    async manage(args) {
        switch (args.action) {
            case "add":
                if (!args.path)
                    return (0, tool_base_1.err)("refimage_manage(add): 'path' is required");
                await Editor.Message.request("scene", "add-reference-image", args.path);
                return (0, tool_base_1.ok)({ success: true, action: args.action, path: args.path });
            case "remove":
                if (typeof args.index !== "number")
                    return (0, tool_base_1.err)("refimage_manage(remove): 'index' is required");
                await Editor.Message.request("scene", "remove-reference-image", args.index);
                return (0, tool_base_1.ok)({ success: true, action: args.action, index: args.index });
            case "clear_all":
                await Editor.Message.request("scene", "clear-all-reference-images");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            case "switch":
                if (typeof args.index !== "number")
                    return (0, tool_base_1.err)("refimage_manage(switch): 'index' is required");
                await Editor.Message.request("scene", "switch-reference-image", args.index);
                return (0, tool_base_1.ok)({ success: true, action: args.action, index: args.index });
            case "refresh":
                await Editor.Message.request("scene", "refresh-reference-image");
                return (0, tool_base_1.ok)({ success: true, action: args.action });
            default:
                return (0, tool_base_1.err)(`Unknown refimage_manage action: ${args.action}`);
        }
    }
    async set(args) {
        switch (args.action) {
            case "position":
                await Editor.Message.request("scene", "set-reference-image-position", args.x, args.y);
                return (0, tool_base_1.ok)({ success: true, action: args.action, x: args.x, y: args.y });
            case "scale":
                await Editor.Message.request("scene", "set-reference-image-scale", args.scale);
                return (0, tool_base_1.ok)({ success: true, action: args.action, scale: args.scale });
            case "opacity":
                await Editor.Message.request("scene", "set-reference-image-opacity", args.opacity);
                return (0, tool_base_1.ok)({ success: true, action: args.action, opacity: args.opacity });
            default:
                return (0, tool_base_1.err)(`Unknown refimage_set action: ${args.action}`);
        }
    }
    async query(args) {
        const action = args.action || "list";
        switch (action) {
            case "list":
            case "config": {
                const config = await Editor.Message.request("scene", "query-reference-image-config").catch(() => null);
                return (0, tool_base_1.ok)({ success: true, action, config });
            }
            case "current": {
                const current = await Editor.Message.request("scene", "query-current-reference-image").catch(() => null);
                return (0, tool_base_1.ok)({ success: true, action, current });
            }
            default:
                return (0, tool_base_1.err)(`Unknown refimage_query action: ${action}`);
        }
    }
}
exports.ReferenceImageTools = ReferenceImageTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLWltYWdlLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBdUM7QUFFdkMsTUFBYSxtQkFBbUI7SUFBaEM7UUFDYSxpQkFBWSxHQUFHLGdCQUFnQixDQUFDO0lBdUg3QyxDQUFDO0lBckhHLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsV0FBVyxFQUFFLGdJQUFnSTtnQkFDN0ksV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx1REFBdUQsRUFBRTt3QkFDaEcsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNENBQTRDLEVBQUU7d0JBQ25GLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLG9DQUFvQyxFQUFFO3FCQUMvRTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsY0FBYztnQkFDcEIsV0FBVyxFQUFFLHVIQUF1SDtnQkFDcEksV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxrQ0FBa0MsRUFBRTt3QkFDM0UsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDckIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDckIsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDekIsT0FBTyxFQUFF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LEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEgsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUNEO2dCQUNJLE9BQU8sSUFBQSxlQUFHLEVBQUMsa0NBQWtDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQXhIRCxrREF3SEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sQ2F0ZWdvcnksIFRvb2xEZWZpbml0aW9uLCBUb29sUmVzdWx0IH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IG9rLCBlcnIgfSBmcm9tIFwiLi4vdG9vbC1iYXNlXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlSW1hZ2VUb29scyBpbXBsZW1lbnRzIFRvb2xDYXRlZ29yeSB7XHJcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcInJlZmVyZW5jZUltYWdlXCI7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJyZWZpbWFnZV9tYW5hZ2VcIixcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1hbmFnZSBzY2VuZS12aWV3IHJlZmVyZW5jZSBpbWFnZSBvdmVybGF5cy4gQWN0aW9uczogJ2FkZCcgKHBhdGgpLCAncmVtb3ZlJyAoaW5kZXgpLCAnY2xlYXJfYWxsJywgJ3N3aXRjaCcgKGluZGV4KSwgJ3JlZnJlc2gnLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidhZGQnIHwgJ3JlbW92ZScgfCAnY2xlYXJfYWxsJyB8ICdzd2l0Y2gnIHwgJ3JlZnJlc2gnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJJbWFnZSBmaWxlIHBhdGggb3IgZGI6Ly8gcGF0aCAoYWN0aW9uPWFkZClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJJbWFnZSBpbmRleCAoYWN0aW9uPXJlbW92ZXxzd2l0Y2gpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJhY3Rpb25cIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInJlZmltYWdlX3NldFwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQWRqdXN0IHRoZSBjdXJyZW50bHkgYWN0aXZlIHJlZmVyZW5jZSBpbWFnZS4gQWN0aW9uczogJ3Bvc2l0aW9uJyAoe3gseX0pLCAnc2NhbGUnIChzY2FsZSksICdvcGFjaXR5JyAob3BhY2l0eSAwLTI1NSkuXCIsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ3Bvc2l0aW9uJyB8ICdzY2FsZScgfCAnb3BhY2l0eSdcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogeyB0eXBlOiBcIm51bWJlclwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlOiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCIwLTI1NVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJyZWZpbWFnZV9xdWVyeVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUXVlcnkgcmVmZXJlbmNlIGltYWdlIHN0YXRlLiBBY3Rpb25zOiAnbGlzdCcgKGFsbCBpbWFnZXMgLyBjb25maWcpLCAnY3VycmVudCcgKGFjdGl2ZSBpbWFnZSBpbmZvKS5cIixcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCInbGlzdCcgKGRlZmF1bHQpIHwgJ2N1cnJlbnQnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZWZpbWFnZV9tYW5hZ2VcIjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tYW5hZ2UoYXJncyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVmaW1hZ2Vfc2V0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0KGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlZmltYWdlX3F1ZXJ5XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkoYXJncyk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyKGUubWVzc2FnZSB8fCBTdHJpbmcoZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG1hbmFnZShhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MucGF0aCkgcmV0dXJuIGVycihcInJlZmltYWdlX21hbmFnZShhZGQpOiAncGF0aCcgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJhZGQtcmVmZXJlbmNlLWltYWdlXCIsIGFyZ3MucGF0aCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBwYXRoOiBhcmdzLnBhdGggfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJyZW1vdmVcIjpcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJncy5pbmRleCAhPT0gXCJudW1iZXJcIikgcmV0dXJuIGVycihcInJlZmltYWdlX21hbmFnZShyZW1vdmUpOiAnaW5kZXgnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicmVtb3ZlLXJlZmVyZW5jZS1pbWFnZVwiLCBhcmdzLmluZGV4KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIGluZGV4OiBhcmdzLmluZGV4IH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwiY2xlYXJfYWxsXCI6XHJcbiAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJjbGVhci1hbGwtcmVmZXJlbmNlLWltYWdlc1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24gfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzd2l0Y2hcIjpcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJncy5pbmRleCAhPT0gXCJudW1iZXJcIikgcmV0dXJuIGVycihcInJlZmltYWdlX21hbmFnZShzd2l0Y2gpOiAnaW5kZXgnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic3dpdGNoLXJlZmVyZW5jZS1pbWFnZVwiLCBhcmdzLmluZGV4KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIGluZGV4OiBhcmdzLmluZGV4IH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwicmVmcmVzaFwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicmVmcmVzaC1yZWZlcmVuY2UtaW1hZ2VcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uIH0pO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biByZWZpbWFnZV9tYW5hZ2UgYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldChhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICBjYXNlIFwicG9zaXRpb25cIjpcclxuICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJzY2VuZVwiLCBcInNldC1yZWZlcmVuY2UtaW1hZ2UtcG9zaXRpb25cIiwgYXJncy54LCBhcmdzLnkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgeDogYXJncy54LCB5OiBhcmdzLnkgfSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzY2FsZVwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic2V0LXJlZmVyZW5jZS1pbWFnZS1zY2FsZVwiLCBhcmdzLnNjYWxlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIHNjYWxlOiBhcmdzLnNjYWxlIH0pO1xyXG4gICAgICAgICAgICBjYXNlIFwib3BhY2l0eVwiOlxyXG4gICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwic2V0LXJlZmVyZW5jZS1pbWFnZS1vcGFjaXR5XCIsIGFyZ3Mub3BhY2l0eSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBvcGFjaXR5OiBhcmdzLm9wYWNpdHkgfSk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHJlZmltYWdlX3NldCBhY3Rpb246ICR7YXJncy5hY3Rpb259YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uIHx8IFwibGlzdFwiO1xyXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJsaXN0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb25maWdcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZmlnID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInNjZW5lXCIsIFwicXVlcnktcmVmZXJlbmNlLWltYWdlLWNvbmZpZ1wiKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbiwgY29uZmlnIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgXCJjdXJyZW50XCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwic2NlbmVcIiwgXCJxdWVyeS1jdXJyZW50LXJlZmVyZW5jZS1pbWFnZVwiKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbiwgY3VycmVudCB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycihgVW5rbm93biByZWZpbWFnZV9xdWVyeSBhY3Rpb246ICR7YWN0aW9ufWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=