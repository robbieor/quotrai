import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TaskStep {
  step_key: string;
  label: string;
  sort_order: number;
}

interface TaskRequest {
  task_type: string;
  mode: "preview" | "live";
  steps: TaskStep[];
  input_payload: Record<string, unknown>;
}

// ─── Step helpers ────────────────────────────────────────────

async function markStep(
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  stepKey: string,
  status: "running" | "complete" | "error",
  errorMessage?: string
) {
  const update: Record<string, unknown> = { status };
  if (status === "running") update.started_at = new Date().toISOString();
  if (status === "complete") update.completed_at = new Date().toISOString();
  if (status === "error") {
    update.completed_at = new Date().toISOString();
    update.error_message = errorMessage || "Unknown error";
  }

  await supabase
    .from("task_steps")
    .update(update)
    .eq("task_id", taskId)
    .eq("step_key", stepKey);
}

async function finishTask(
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  status: "success" | "error",
  resultOrError: Record<string, unknown> | string
) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "success") {
    update.result_payload = resultOrError;
    update.success_message =
      (resultOrError as Record<string, unknown>).success_message || "Done";
  } else {
    update.error_message = resultOrError as string;
  }
  await supabase.from("agent_tasks").update(update).eq("id", taskId);
}

// ─── Task handlers ───────────────────────────────────────────

async function handleSendPreview(
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  input: Record<string, unknown>,
  token: string
) {
  const steps = [
    "structure",
    "branding",
    "layout",
    "line_items",
    "totals",
    "pdf",
    "email",
  ];

  // Steps 1-5 are fast prep steps — mark them complete quickly
  for (const key of steps.slice(0, 5)) {
    await markStep(supabase, taskId, key, "running");
    // Small delay so realtime delivers each update visibly
    await new Promise((r) => setTimeout(r, 300));
    await markStep(supabase, taskId, key, "complete");
  }

  // Step 6: PDF — the payload should already contain pdfBase64
  await markStep(supabase, taskId, "pdf", "running");
  const pdfBase64 = input.pdfBase64 as string;
  if (!pdfBase64) {
    await markStep(supabase, taskId, "pdf", "error", "No PDF data provided");
    return { success: false, error: "No PDF data" };
  }
  await markStep(supabase, taskId, "pdf", "complete");

  // Step 7: Email — call send-preview-email internally
  await markStep(supabase, taskId, "email", "running");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const resp = await fetch(`${supabaseUrl}/functions/v1/send-preview-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      pdfBase64,
      documentType: input.documentType || "invoice",
    }),
  });

  const emailResult = await resp.json();

  if (!resp.ok || !emailResult.success) {
    const errMsg = emailResult.error || "Email send failed";
    await markStep(supabase, taskId, "email", "error", errMsg);
    return { success: false, error: errMsg };
  }

  await markStep(supabase, taskId, "email", "complete");

  return {
    success: true,
    success_message: `Preview sent to ${emailResult.sentTo}`,
    status: emailResult.status,
    sentTo: emailResult.sentTo,
  };
}

// ─── Main handler ────────────────────────────────────────────

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as TaskRequest;
    const { task_type, mode = "preview", steps, input_payload } = body;

    if (!task_type || !steps?.length) {
      return new Response(
        JSON.stringify({ error: "task_type and steps are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get team_id
    const { data: teamRow } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .single();

    // Create task row
    const { data: task, error: taskError } = await supabase
      .from("agent_tasks")
      .insert({
        user_id: user.id,
        team_id: teamRow?.team_id || null,
        task_type,
        mode,
        status: "running",
        steps: steps,
        input_payload,
        current_step_index: 0,
      })
      .select()
      .single();

    if (taskError || !task) {
      throw new Error(taskError?.message || "Failed to create task");
    }

    // Create step rows
    const stepRows = steps.map((s, i) => ({
      task_id: task.id,
      step_key: s.step_key,
      label: s.label,
      sort_order: i,
      status: "pending",
    }));

    const { error: stepsError } = await supabase
      .from("task_steps")
      .insert(stepRows);

    if (stepsError) {
      console.error("Failed to create steps:", stepsError);
    }

    // Return task ID immediately — execute in background via waitUntil-like pattern
    // Deno.serve doesn't have waitUntil, so we use respondWith pattern
    const taskId = task.id;

    // Start execution asynchronously (fire-and-forget)
    const executeTask = async () => {
      try {
        let result: Record<string, unknown>;

        switch (task_type) {
          case "send_preview":
            result = await handleSendPreview(
              supabase,
              taskId,
              input_payload || {},
              token
            );
            break;
          default:
            result = { success: false, error: `Unknown task type: ${task_type}` };
        }

        if (result.success) {
          await finishTask(supabase, taskId, "success", result);
        } else {
          await finishTask(
            supabase,
            taskId,
            "error",
            (result.error as string) || "Task failed"
          );
        }
      } catch (err) {
        console.error("Task execution error:", err);
        await finishTask(
          supabase,
          taskId,
          "error",
          err instanceof Error ? err.message : "Unexpected error"
        );
      }
    };

    // Fire and forget — the response returns immediately
    executeTask();

    return new Response(
      JSON.stringify({ task_id: taskId, status: "running" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("run-task error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
