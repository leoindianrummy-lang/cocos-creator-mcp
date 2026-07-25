"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesTools = void 0;
const tool_base_1 = require("../tool-base");
class PreferencesTools {
    constructor() {
        this.categoryName = "preferences";
    }
    getTools() {
        return [
            {
                name: "preferences_manage",
                description: "Manage editor preferences. Actions: 'get' (read one value), 'set' (write one value), 'get_all' (dump all keys for a protocol), 'reset' (revert one key to default).",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "'get' | 'set' | 'get_all' | 'reset'" },
                        protocol: { type: "string", description: "Protocol name (e.g. 'general', 'builder', 'engine')" },
                        key: { type: "string", description: "Preference key (required for get/set/reset)" },
                        value: { description: "Value to set (required for action=set)" },
                    },
                    required: ["action", "protocol"],
                },
            },
        ];
    }
    async execute(toolName, args) {
        if (toolName !== "preferences_manage")
            return (0, tool_base_1.err)(`Unknown tool: ${toolName}`);
        try {
            const action = args.action;
            switch (action) {
                case "get": {
                    if (!args.key)
                        return (0, tool_base_1.err)("preferences_manage(get): 'key' is required");
                    const value = Editor.Profile.getConfig(args.protocol, args.key);
                    return (0, tool_base_1.ok)({ success: true, action, protocol: args.protocol, key: args.key, value });
                }
                case "set": {
                    if (!args.key)
                        return (0, tool_base_1.err)("preferences_manage(set): 'key' is required");
                    if (args.value === undefined)
                        return (0, tool_base_1.err)("preferences_manage(set): 'value' is required");
                    Editor.Profile.setConfig(args.protocol, args.key, args.value);
                    return (0, tool_base_1.ok)({ success: true, action, protocol: args.protocol, key: args.key });
                }
                case "get_all": {
                    const config = Editor.Profile.getConfig(args.protocol);
                    return (0, tool_base_1.ok)({ success: true, action, protocol: args.protocol, config });
                }
                case "reset": {
                    if (!args.key)
                        return (0, tool_base_1.err)("preferences_manage(reset): 'key' is required");
                    Editor.Profile.removeConfig(args.protocol, args.key);
                    return (0, tool_base_1.ok)({ success: true, action, protocol: args.protocol, key: args.key });
                }
                default:
                    return (0, tool_base_1.err)(`Unknown preferences_manage action: ${action}. Expected get / set / get_all / reset.`);
            }
        }
        catch (e) {
            return (0, tool_base_1.err)(e.message || String(e));
        }
    }
}
exports.PreferencesTools = PreferencesTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNENBQXVDO0FBRXZDLE1BQWEsZ0JBQWdCO0lBQTdCO1FBQ2EsaUJBQVksR0FBRyxhQUFhLENBQUM7SUFxRDFDLENBQUM7SUFuREcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUscUtBQXFLO2dCQUNsTCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFDQUFxQyxFQUFFO3dCQUM5RSxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxxREFBcUQsRUFBRTt3QkFDaEcsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNkNBQTZDLEVBQUU7d0JBQ25GLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSx3Q0FBd0MsRUFBRTtxQkFDbkU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztpQkFDbkM7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQXlCO1FBQ3JELElBQUksUUFBUSxLQUFLLG9CQUFvQjtZQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsaUJBQWlCLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUMzQixRQUFRLE1BQU0sRUFBRSxDQUFDO2dCQUNiLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUc7d0JBQUUsT0FBTyxJQUFBLGVBQUcsRUFBQyw0Q0FBNEMsQ0FBQyxDQUFDO29CQUN4RSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEUsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ3hGLENBQUM7Z0JBQ0QsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNULElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRzt3QkFBRSxPQUFPLElBQUEsZUFBRyxFQUFDLDRDQUE0QyxDQUFDLENBQUM7b0JBQ3hFLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO3dCQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsOENBQThDLENBQUMsQ0FBQztvQkFDekYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDOUQsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDakYsQ0FBQztnQkFDRCxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2IsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN2RCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDMUUsQ0FBQztnQkFDRCxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHO3dCQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsOENBQThDLENBQUMsQ0FBQztvQkFDMUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JELE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2pGLENBQUM7Z0JBQ0Q7b0JBQ0ksT0FBTyxJQUFBLGVBQUcsRUFBQyxzQ0FBc0MsTUFBTSx5Q0FBeUMsQ0FBQyxDQUFDO1lBQzFHLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBdERELDRDQXNEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgb2ssIGVyciB9IGZyb20gXCIuLi90b29sLWJhc2VcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcmVmZXJlbmNlc1Rvb2xzIGltcGxlbWVudHMgVG9vbENhdGVnb3J5IHtcclxuICAgIHJlYWRvbmx5IGNhdGVnb3J5TmFtZSA9IFwicHJlZmVyZW5jZXNcIjtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcInByZWZlcmVuY2VzX21hbmFnZVwiLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTWFuYWdlIGVkaXRvciBwcmVmZXJlbmNlcy4gQWN0aW9uczogJ2dldCcgKHJlYWQgb25lIHZhbHVlKSwgJ3NldCcgKHdyaXRlIG9uZSB2YWx1ZSksICdnZXRfYWxsJyAoZHVtcCBhbGwga2V5cyBmb3IgYSBwcm90b2NvbCksICdyZXNldCcgKHJldmVydCBvbmUga2V5IHRvIGRlZmF1bHQpLlwiLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIidnZXQnIHwgJ3NldCcgfCAnZ2V0X2FsbCcgfCAncmVzZXQnXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiUHJvdG9jb2wgbmFtZSAoZS5nLiAnZ2VuZXJhbCcsICdidWlsZGVyJywgJ2VuZ2luZScpXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByZWZlcmVuY2Uga2V5IChyZXF1aXJlZCBmb3IgZ2V0L3NldC9yZXNldClcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogXCJWYWx1ZSB0byBzZXQgKHJlcXVpcmVkIGZvciBhY3Rpb249c2V0KVwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogW1wiYWN0aW9uXCIsIFwicHJvdG9jb2xcIl0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICAgICAgaWYgKHRvb2xOYW1lICE9PSBcInByZWZlcmVuY2VzX21hbmFnZVwiKSByZXR1cm4gZXJyKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XHJcbiAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZ2V0XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFyZ3Mua2V5KSByZXR1cm4gZXJyKFwicHJlZmVyZW5jZXNfbWFuYWdlKGdldCk6ICdrZXknIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gRWRpdG9yLlByb2ZpbGUuZ2V0Q29uZmlnKGFyZ3MucHJvdG9jb2wsIGFyZ3Mua2V5KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb24sIHByb3RvY29sOiBhcmdzLnByb3RvY29sLCBrZXk6IGFyZ3Mua2V5LCB2YWx1ZSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzZXRcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJncy5rZXkpIHJldHVybiBlcnIoXCJwcmVmZXJlbmNlc19tYW5hZ2Uoc2V0KTogJ2tleScgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MudmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGVycihcInByZWZlcmVuY2VzX21hbmFnZShzZXQpOiAndmFsdWUnIGlzIHJlcXVpcmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIEVkaXRvci5Qcm9maWxlLnNldENvbmZpZyhhcmdzLnByb3RvY29sLCBhcmdzLmtleSwgYXJncy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uLCBwcm90b2NvbDogYXJncy5wcm90b2NvbCwga2V5OiBhcmdzLmtleSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJnZXRfYWxsXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWcgPSBFZGl0b3IuUHJvZmlsZS5nZXRDb25maWcoYXJncy5wcm90b2NvbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uLCBwcm90b2NvbDogYXJncy5wcm90b2NvbCwgY29uZmlnIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlc2V0XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFyZ3Mua2V5KSByZXR1cm4gZXJyKFwicHJlZmVyZW5jZXNfbWFuYWdlKHJlc2V0KTogJ2tleScgaXMgcmVxdWlyZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgRWRpdG9yLlByb2ZpbGUucmVtb3ZlQ29uZmlnKGFyZ3MucHJvdG9jb2wsIGFyZ3Mua2V5KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb24sIHByb3RvY29sOiBhcmdzLnByb3RvY29sLCBrZXk6IGFyZ3Mua2V5IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHByZWZlcmVuY2VzX21hbmFnZSBhY3Rpb246ICR7YWN0aW9ufS4gRXhwZWN0ZWQgZ2V0IC8gc2V0IC8gZ2V0X2FsbCAvIHJlc2V0LmApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==