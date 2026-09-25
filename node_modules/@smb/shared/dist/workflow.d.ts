import { z } from 'zod';
export declare const WorkflowDefinitionSchema: z.ZodObject<{
    id: z.ZodDefault<z.ZodString>;
    name: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    description: z.ZodString;
    trigger: z.ZodString;
    steps: z.ZodArray<z.ZodString, "many">;
    approval_required_for: z.ZodArray<z.ZodString, "many">;
    escalate_when: z.ZodArray<z.ZodString, "many">;
    retry_policy: z.ZodDefault<z.ZodObject<{
        max_retries: z.ZodDefault<z.ZodNumber>;
        backoff_seconds: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        max_retries: number;
        backoff_seconds: number;
    }, {
        max_retries?: number | undefined;
        backoff_seconds?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    approval_required_for: string[];
    name: string;
    id: string;
    description: string;
    trigger: string;
    steps: string[];
    escalate_when: string[];
    retry_policy: {
        max_retries: number;
        backoff_seconds: number;
    };
}, {
    approval_required_for: string[];
    name: string;
    description: string;
    trigger: string;
    steps: string[];
    escalate_when: string[];
    version?: string | undefined;
    id?: string | undefined;
    retry_policy?: {
        max_retries?: number | undefined;
        backoff_seconds?: number | undefined;
    } | undefined;
}>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export declare const INBOUND_LEAD_WORKFLOW_DEFINITION: WorkflowDefinition;
