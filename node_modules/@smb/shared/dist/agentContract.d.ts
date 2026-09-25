import { z } from 'zod';
export declare const AgentContractSchema: z.ZodObject<{
    agent: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    purpose: z.ZodString;
    input_types: z.ZodArray<z.ZodString, "many">;
    knowledge_sources: z.ZodArray<z.ZodString, "many">;
    allowed_tools: z.ZodArray<z.ZodString, "many">;
    prohibited_actions: z.ZodArray<z.ZodString, "many">;
    approval_required_for: z.ZodArray<z.ZodString, "many">;
    escalation_rules: z.ZodObject<{
        confidence_threshold: z.ZodDefault<z.ZodNumber>;
        trigger_conditions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        confidence_threshold: number;
        trigger_conditions: string[];
    }, {
        trigger_conditions: string[];
        confidence_threshold?: number | undefined;
    }>;
    evaluation_tests: z.ZodArray<z.ZodString, "many">;
    cost_limits: z.ZodObject<{
        max_tokens_per_run: z.ZodNumber;
        max_tool_calls_per_run: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        max_tokens_per_run: number;
        max_tool_calls_per_run: number;
    }, {
        max_tokens_per_run: number;
        max_tool_calls_per_run: number;
    }>;
    success_metrics: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    agent: string;
    version: string;
    purpose: string;
    input_types: string[];
    knowledge_sources: string[];
    allowed_tools: string[];
    prohibited_actions: string[];
    approval_required_for: string[];
    escalation_rules: {
        confidence_threshold: number;
        trigger_conditions: string[];
    };
    evaluation_tests: string[];
    cost_limits: {
        max_tokens_per_run: number;
        max_tool_calls_per_run: number;
    };
    success_metrics: string[];
}, {
    agent: string;
    purpose: string;
    input_types: string[];
    knowledge_sources: string[];
    allowed_tools: string[];
    prohibited_actions: string[];
    approval_required_for: string[];
    escalation_rules: {
        trigger_conditions: string[];
        confidence_threshold?: number | undefined;
    };
    evaluation_tests: string[];
    cost_limits: {
        max_tokens_per_run: number;
        max_tool_calls_per_run: number;
    };
    success_metrics: string[];
    version?: string | undefined;
}>;
export type AgentContract = z.infer<typeof AgentContractSchema>;
export declare const LEAD_QUALIFICATION_AGENT_CONTRACT: AgentContract;
