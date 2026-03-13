"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationDisplayProps {
  toolName: string;
  state: string;
  args?: Record<string, unknown>;
}

function getToolMessage(
  toolName: string,
  args?: Record<string, unknown>
): string {
  if (toolName === "str_replace_editor" && args) {
    const command = args.command as string;
    const path = args.path as string;

    switch (command) {
      case "create":
        return `Creating file: ${path}`;
      case "str_replace":
        return `Editing file: ${path}`;
      case "insert":
        return `Inserting into file: ${path}`;
      case "view":
        return `Viewing file: ${path}`;
      default:
        return `${command}: ${path}`;
    }
  }

  return toolName;
}

export function ToolInvocationDisplay({
  toolName,
  state,
  args,
}: ToolInvocationDisplayProps) {
  const message = getToolMessage(toolName, args);
  const isComplete = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}
