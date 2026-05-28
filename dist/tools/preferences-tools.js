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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNENBQXVDO0FBRXZDLE1BQWEsZ0JBQWdCO0lBQTdCO1FBQ2EsaUJBQVksR0FBRyxhQUFhLENBQUM7SUFxRDFDLENBQUM7SUFuREcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUscUtBQXFLO2dCQUNsTCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFDQUFxQyxFQUFFO3dCQUM5RSxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxxREFBcUQsRUFBRTt3QkFDaEcsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNkNBQTZDLEVBQUU7d0JBQ25GLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSx3Q0FBd0MsRUFBRTtxQkFDbkU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztpQkFDbkM7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQXlCO1FBQ3JELElBQUksUUFBUSxLQUFLLG9CQUFvQjtZQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsaUJBQWlCLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUMzQixRQUFRLE1BQU0sRUFBRSxDQUFDO2dCQUNiLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUc7d0JBQUUsT0FBTyxJQUFBLGVBQUcsRUFBQyw0Q0FBNEMsQ0FBQyxDQUFDO29CQUN4RSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEUsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ3hGLENBQUM7Z0JBQ0QsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNULElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRzt3QkFBRSxPQUFPLElBQUEsZUFBRyxFQUFDLDRDQUE0QyxDQUFDLENBQUM7b0JBQ3hFLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO3dCQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsOENBQThDLENBQUMsQ0FBQztvQkFDekYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDOUQsT0FBTyxJQUFBLGNBQUUsRUFBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDakYsQ0FBQztnQkFDRCxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2IsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN2RCxPQUFPLElBQUEsY0FBRSxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDMUUsQ0FBQztnQkFDRCxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHO3dCQUFFLE9BQU8sSUFBQSxlQUFHLEVBQUMsOENBQThDLENBQUMsQ0FBQztvQkFDMUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JELE9BQU8sSUFBQSxjQUFFLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2pGLENBQUM7Z0JBQ0Q7b0JBQ0ksT0FBTyxJQUFBLGVBQUcsRUFBQyxzQ0FBc0MsTUFBTSx5Q0FBeUMsQ0FBQyxDQUFDO1lBQzFHLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBdERELDRDQXNEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xDYXRlZ29yeSwgVG9vbERlZmluaXRpb24sIFRvb2xSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IG9rLCBlcnIgfSBmcm9tIFwiLi4vdG9vbC1iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBQcmVmZXJlbmNlc1Rvb2xzIGltcGxlbWVudHMgVG9vbENhdGVnb3J5IHtcbiAgICByZWFkb25seSBjYXRlZ29yeU5hbWUgPSBcInByZWZlcmVuY2VzXCI7XG5cbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcInByZWZlcmVuY2VzX21hbmFnZVwiLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1hbmFnZSBlZGl0b3IgcHJlZmVyZW5jZXMuIEFjdGlvbnM6ICdnZXQnIChyZWFkIG9uZSB2YWx1ZSksICdzZXQnICh3cml0ZSBvbmUgdmFsdWUpLCAnZ2V0X2FsbCcgKGR1bXAgYWxsIGtleXMgZm9yIGEgcHJvdG9jb2wpLCAncmVzZXQnIChyZXZlcnQgb25lIGtleSB0byBkZWZhdWx0KS5cIixcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiJ2dldCcgfCAnc2V0JyB8ICdnZXRfYWxsJyB8ICdyZXNldCdcIiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiUHJvdG9jb2wgbmFtZSAoZS5nLiAnZ2VuZXJhbCcsICdidWlsZGVyJywgJ2VuZ2luZScpXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcmVmZXJlbmNlIGtleSAocmVxdWlyZWQgZm9yIGdldC9zZXQvcmVzZXQpXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiBcIlZhbHVlIHRvIHNldCAocmVxdWlyZWQgZm9yIGFjdGlvbj1zZXQpXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImFjdGlvblwiLCBcInByb3RvY29sXCJdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xuICAgICAgICBpZiAodG9vbE5hbWUgIT09IFwicHJlZmVyZW5jZXNfbWFuYWdlXCIpIHJldHVybiBlcnIoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uO1xuICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLmtleSkgcmV0dXJuIGVycihcInByZWZlcmVuY2VzX21hbmFnZShnZXQpOiAna2V5JyBpcyByZXF1aXJlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBFZGl0b3IuUHJvZmlsZS5nZXRDb25maWcoYXJncy5wcm90b2NvbCwgYXJncy5rZXkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb24sIHByb3RvY29sOiBhcmdzLnByb3RvY29sLCBrZXk6IGFyZ3Mua2V5LCB2YWx1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBcInNldFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJncy5rZXkpIHJldHVybiBlcnIoXCJwcmVmZXJlbmNlc19tYW5hZ2Uoc2V0KTogJ2tleScgaXMgcmVxdWlyZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBlcnIoXCJwcmVmZXJlbmNlc19tYW5hZ2Uoc2V0KTogJ3ZhbHVlJyBpcyByZXF1aXJlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgRWRpdG9yLlByb2ZpbGUuc2V0Q29uZmlnKGFyZ3MucHJvdG9jb2wsIGFyZ3Mua2V5LCBhcmdzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9rKHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uLCBwcm90b2NvbDogYXJncy5wcm90b2NvbCwga2V5OiBhcmdzLmtleSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBcImdldF9hbGxcIjoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWcgPSBFZGl0b3IuUHJvZmlsZS5nZXRDb25maWcoYXJncy5wcm90b2NvbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbiwgcHJvdG9jb2w6IGFyZ3MucHJvdG9jb2wsIGNvbmZpZyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBcInJlc2V0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLmtleSkgcmV0dXJuIGVycihcInByZWZlcmVuY2VzX21hbmFnZShyZXNldCk6ICdrZXknIGlzIHJlcXVpcmVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBFZGl0b3IuUHJvZmlsZS5yZW1vdmVDb25maWcoYXJncy5wcm90b2NvbCwgYXJncy5rZXkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2soeyBzdWNjZXNzOiB0cnVlLCBhY3Rpb24sIHByb3RvY29sOiBhcmdzLnByb3RvY29sLCBrZXk6IGFyZ3Mua2V5IH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyKGBVbmtub3duIHByZWZlcmVuY2VzX21hbmFnZSBhY3Rpb246ICR7YWN0aW9ufS4gRXhwZWN0ZWQgZ2V0IC8gc2V0IC8gZ2V0X2FsbCAvIHJlc2V0LmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnIoZS5tZXNzYWdlIHx8IFN0cmluZyhlKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=