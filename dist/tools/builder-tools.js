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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRDQUF1QztBQUV2QyxNQUFhLFlBQVk7SUFBekI7UUFDYSxpQkFBWSxHQUFHLFNBQVMsQ0FBQztJQThDdEMsQ0FBQztJQTVDRyxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxnUEFBZ1A7Z0JBQzdQLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0ZBQWdGLEVBQUU7cUJBQzVIO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQXlCO1FBQ3JELElBQUksUUFBUSxLQUFLLGdCQUFnQjtZQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsaUJBQWlCLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDO1lBQ0QsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssWUFBWTtvQkFDYixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDN0IsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLE1BQU0sUUFBUSxHQUFHLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzRyxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDO2dCQUNELEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUM5RixPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDO2dCQUNELEtBQUssYUFBYTtvQkFDZCxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztnQkFDbEYsS0FBSyxjQUFjO29CQUNmLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUN6RCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRjtvQkFDSSxPQUFPLElBQUEsZUFBRyxFQUFDLGtDQUFrQyxJQUFJLENBQUMsTUFBTSxrRkFBa0YsQ0FBQyxDQUFDO1lBQ3BKLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBL0NELG9DQStDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IG9rLCBlcnIgfSBmcm9tIFwiLi4vdG9vbC1iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBCdWlsZGVyVG9vbHMgaW1wbGVtZW50cyBUb29sQ2F0ZWdvcnkge1xuICAgIHJlYWRvbmx5IGNhdGVnb3J5TmFtZSA9IFwiYnVpbGRlclwiO1xuXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJidWlsZGVyX21hbmFnZVwiLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1hbmFnZSB0aGUgZWRpdG9yJ3MgQnVpbGQgLyBQcmV2aWV3IHNlcnZlci4gQWN0aW9uczogJ29wZW5fcGFuZWwnIChvcGVuIEJ1aWxkIHBhbmVsKSwgJ2dldF9zZXR0aW5ncycgKHJlYWQgYnVpbGQgY29uZmlnKSwgJ3F1ZXJ5X3Rhc2tzJyAobGlzdCBhY3RpdmUgYnVpbGQgdGFza3MpLCAncnVuX3ByZXZpZXcnIChzdGFydCBwcmV2aWV3IHNlcnZlciksICdzdG9wX3ByZXZpZXcnIChzdG9wIHByZXZpZXcgc2VydmVyKS5cIixcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ29wZW5fcGFuZWwnIHwgJ2dldF9zZXR0aW5ncycgfCAncXVlcnlfdGFza3MnIHwgJ3J1bl9wcmV2aWV3JyB8ICdzdG9wX3ByZXZpZXcnXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXN1bHQ+IHtcbiAgICAgICAgaWYgKHRvb2xOYW1lICE9PSBcImJ1aWxkZXJfbWFuYWdlXCIpIHJldHVybiBlcnIoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwib3Blbl9wYW5lbFwiOlxuICAgICAgICAgICAgICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihcImJ1aWxkZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogYXJncy5hY3Rpb24gfSk7XG4gICAgICAgICAgICAgICAgY2FzZSBcImdldF9zZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcImJ1aWxkZXJcIiwgXCJxdWVyeS1idWlsZC1vcHRpb25zXCIpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBzZXR0aW5ncyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBcInF1ZXJ5X3Rhc2tzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza3MgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwiYnVpbGRlclwiLCBcInF1ZXJ5LXRhc2tzXCIpLmNhdGNoKCgpID0+IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiBhcmdzLmFjdGlvbiwgdGFza3MgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgXCJydW5fcHJldmlld1wiOlxuICAgICAgICAgICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKFwicHJldmlld1wiLCBcInN0YXJ0XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtZXNzYWdlOiBcIlByZXZpZXcgc3RhcnRlZFwiIH0pO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzdG9wX3ByZXZpZXdcIjpcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KShcInByZXZpZXdcIiwgXCJzdG9wXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246IGFyZ3MuYWN0aW9uLCBtZXNzYWdlOiBcIlByZXZpZXcgc3RvcHBlZFwiIH0pO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnIoYFVua25vd24gYnVpbGRlcl9tYW5hZ2UgYWN0aW9uOiAke2FyZ3MuYWN0aW9ufS4gRXhwZWN0ZWQgb3Blbl9wYW5lbCAvIGdldF9zZXR0aW5ncyAvIHF1ZXJ5X3Rhc2tzIC8gcnVuX3ByZXZpZXcgLyBzdG9wX3ByZXZpZXcuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIGVycihlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==