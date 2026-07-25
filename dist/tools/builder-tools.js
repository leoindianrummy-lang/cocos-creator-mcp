"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderTools = void 0;
const tool_base_1 = require("../tool-base");
class BuilderTools {
    constructor() {
        this.categoryName = "builder";
    }
    getTools() {
        return [
            {
                name: "builder_manage",
                description: "Manage the editor's Build / Preview server. Actions: 'open_panel' (open Build panel), 'get_settings' (read build config), 'query_tasks' (list active build tasks), 'run_preview' (start preview server), 'stop_preview' (stop preview server).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'open_panel' | 'get_settings' | 'query_tasks' | 'run_preview' | 'stop_preview'" },
                    },
                    required: ["action"],
                },
            },
        ];
    }
    async execute(toolName, args) {
        if (toolName !== "builder_manage")
            return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
        try {
            switch (args.action) {
                case "open_panel":
                    Editor.Panel.open("builder");
                    return (0, tool_base_1.ok)({ success: true, action: args.action });
                case "get_settings": {
                    const settings = await Editor.Message.request("builder", "query-build-options").catch(() => null);
                    return (0, tool_base_1.ok)({ success: true, action: args.action, settings });
                }
                case "query_tasks": {
                    const tasks = await Editor.Message.request("builder", "query-tasks").catch(() => []);
                    return (0, tool_base_1.ok)({ success: true, action: args.action, tasks });
                }
                case "run_preview":
                    await Editor.Message.request("preview", "start");
                    return (0, tool_base_1.ok)({ success: true, action: args.action, message: "Preview started" });
                case "stop_preview":
                    await Editor.Message.request("preview", "stop");
                    return (0, tool_base_1.ok)({ success: true, action: args.action, message: "Preview stopped" });
                default:
                    return (0, tool_base_1.err)(`Unknown builder_manage action: ${args.action}. Expected open_panel / get_settings / query_tasks / run_preview / stop_preview.`);
            }
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
}
exports.BuilderTools = BuilderTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRDQUF1QztBQUV2QyxNQUFhLFlBQVk7SUFBekI7UUFDYSxpQkFBWSxHQUFHLFNBQVMsQ0FBQztJQThDdEMsQ0FBQztJQTVDRyxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxnUEFBZ1A7Z0JBQzdQLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0ZBQWdGLEVBQUU7cUJBQzVIO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQXlCO1FBQ3JELElBQUksUUFBUSxLQUFLLGdCQUFnQjtZQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsaUJBQWlCLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDO1lBQ0QsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssWUFBWTtvQkFDYixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDN0IsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLE1BQU0sUUFBUSxHQUFHLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzRyxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDO2dCQUNELEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUM5RixPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDO2dCQUNELEtBQUssYUFBYTtvQkFDZCxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztnQkFDbEYsS0FBSyxjQUFjO29CQUNmLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUN6RCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRjtvQkFDSSxPQUFPLElBQUEsZUFBRyxFQUFDLGtDQUFrQyxJQUFJLENBQUMsTUFBTSxrRkFBa0YsQ0FBQyxDQUFDO1lBQ3BKLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBL0NELG9DQStDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgb2ssIGVyciB9IGZyb20gXCIuLi90b29sLWJhc2VcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBCdWlsZGVyVG9vbHMgaW1wbGVtZW50cyBUb29sQ2F0ZWdvcnkge1xyXG4gICAgcmVhZG9ubHkgY2F0ZWdvcnlOYW1lID0gXCJidWlsZGVyXCI7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJidWlsZGVyX21hbmFnZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTWFuYWdlIHRoZSBlZGl0b3IncyBCdWlsZCAvIFByZXZpZXcgc2VydmVyLiBBY3Rpb25zOiAnb3Blbl9wYW5lbCcgKG9wZW4gQnVpbGQgcGFuZWwpLCAnZ2V0X3NldHRpbmdzJyAocmVhZCBidWlsZCBjb25maWcpLCAncXVlcnlfdGFza3MnIChsaXN0IGFjdGl2ZSBidWlsZCB0YXNrcyksICdydW5fcHJldmlldycgKHN0YXJ0IHByZXZpZXcgc2VydmVyKSwgJ3N0b3BfcHJldmlldycgKHN0b3AgcHJldmlldyBzZXJ2ZXIpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidvcGVuX3BhbmVsJyB8ICdnZXRfc2V0dGluZ3MnIHwgJ3F1ZXJ5X3Rhc2tzJyB8ICdydW5fcHJldmlldycgfCAnc3RvcF9wcmV2aWV3J1wiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xyXG4gICAgICAgIGlmICh0b29sTmFtZSAhPT0gXCJidWlsZGVyX21hbmFnZVwiKSByZXR1cm4gZXJyKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIm9wZW5fcGFuZWxcIjpcclxuICAgICAgICAgICAgICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihcImJ1aWxkZXJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiB9KTtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJnZXRfc2V0dGluZ3NcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImJ1aWxkZXJcIiwgXCJxdWVyeS1idWlsZC1vcHRpb25zXCIpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIHNldHRpbmdzIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInF1ZXJ5X3Rhc2tzXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrcyA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJidWlsZGVyXCIsIFwicXVlcnktdGFza3NcIikuY2F0Y2goKCkgPT4gW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24sIHRhc2tzIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJ1bl9wcmV2aWV3XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInByZXZpZXdcIiwgXCJzdGFydFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtZXNzYWdlOiBcIlByZXZpZXcgc3RhcnRlZFwiIH0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInN0b3BfcHJldmlld1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoXCJwcmV2aWV3XCIsIFwic3RvcFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtZXNzYWdlOiBcIlByZXZpZXcgc3RvcHBlZFwiIH0pO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIGJ1aWxkZXJfbWFuYWdlIGFjdGlvbjogJHthcmdzLmFjdGlvbn0uIEV4cGVjdGVkIG9wZW5fcGFuZWwgLyBnZXRfc2V0dGluZ3MgLyBxdWVyeV90YXNrcyAvIHJ1bl9wcmV2aWV3IC8gc3RvcF9wcmV2aWV3LmApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==