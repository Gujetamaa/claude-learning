import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";

test("displays friendly message for creating a file", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
      args={{ command: "create", path: "src/Button.tsx" }}
    />
  );

  expect(screen.getByText("Creating file: src/Button.tsx")).toBeDefined();
});

test("displays friendly message for editing a file", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
      args={{ command: "str_replace", path: "src/Button.tsx" }}
    />
  );

  expect(screen.getByText("Editing file: src/Button.tsx")).toBeDefined();
});

test("displays friendly message for inserting into a file", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
      args={{ command: "insert", path: "src/Button.tsx" }}
    />
  );

  expect(screen.getByText("Inserting into file: src/Button.tsx")).toBeDefined();
});

test("displays friendly message for viewing a file", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
      args={{ command: "view", path: "src/Button.tsx" }}
    />
  );

  expect(screen.getByText("Viewing file: src/Button.tsx")).toBeDefined();
});

test("shows loading spinner when state is not result", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="call"
      args={{ command: "create", path: "src/Button.tsx" }}
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});

test("shows success indicator when state is result", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
      args={{ command: "create", path: "src/Button.tsx" }}
    />
  );

  const successDot = container.querySelector(".bg-emerald-500");
  expect(successDot).toBeDefined();
});

test("falls back to tool name when args are missing", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
    />
  );

  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("handles unknown commands gracefully", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="result"
      args={{ command: "undo_edit", path: "src/Button.tsx" }}
    />
  );

  expect(screen.getByText("undo_edit: src/Button.tsx")).toBeDefined();
});

test("handles unknown tool names", () => {
  render(
    <ToolInvocationDisplay
      toolName="file_manager"
      state="result"
      args={{ command: "delete", path: "src/Button.tsx" }}
    />
  );

  expect(screen.getByText("file_manager")).toBeDefined();
});

test("shows loading spinner for partial-call state", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      state="partial-call"
      args={{ command: "create", path: "src/Button.tsx" }}
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});
