---
name: config-expert
description: Expert guidance for creating, updating, and managing Antigravity configuration files including Rules (.agent/rules), Workflows (.agent/workflows), and Skills (.agent/skills). Activate this skill when the user asks to create or modify agent behaviors or configurations.
---
# Antigravity Configuration Expert

This skill provides the definitive standards for creating `.agent` configuration files.

## 1. File Structure & Locations

| Type | Path Pattern | Purpose |
| :--- | :--- | :--- |
| **Rules** | `.agent/rules/<name>.md` | Passive guidelines that are always active or triggered by file events. |
| **Workflows** | `.agent/workflows/<name>.md` | Active, multi-step procedures triggered by users (e.g., `/command`). |
| **Skills** | `.agent/skills/<name>/SKILL.md` | Reusable knowledge packages activated by task relevance. |

## 2. Rules (`.agent/rules/*.md`)

-   **Trigger**: Usually `always_on` or `on_file_open`.
-   **Content**: Directives on coding style, behavior, or restrictions.
-   **Format**:
    ```markdown
    ---
    description: Enforces Japanese output.
    glob: "**/*"
    trigger: always_on
    ---
    # Rule Title
    Rule content...
    ```

## 3. Workflows (`.agent/workflows/*.md`)

-   **Trigger**: User commands (slash commands).
-   **Content**: Numbered list of steps.
-   **Turbo Mode**:
    -   `// turbo`: Auto-runs the *next* command.
    -   `// turbo-all`: Auto-runs *all* commands in the workflow.
-   **Format**:
    ```markdown
    ---
    description: Deploys the application.
    ---
    1. Step one
    // turbo
    2. Command to run
    ```

## 4. Skills (`.agent/skills/*/SKILL.md`)

-   **Trigger**: Automatic based on `description` relevance to the active task.
-   **Structure**: A directory containing `SKILL.md` (required) and optional `scripts/`, `examples/`, `resources/`.
-   **SKILL.md Format**:
    ```yaml
    ---
    name: unique-skill-name
    description: Detailed description for the agent to match against user tasks.
    ---
    # Skill Title
    Markdown instructions...
    ```
-   **Best Practices**:
    -   Keep descriptions focused for accurate activation.
    -   Provide clear, step-by-step instructions.
    -   Use `run_command` with scripts in the `scripts/` folder if complex logic is needed.

## 5. Standard Procedure for Config Generation

When asked to create configuration ("Make a rule for X", "Create a workflow to do Y"):

1.  **Analyze**: Is it a passive restriction (Rule), an active process (Workflow), or a capability expansion (Skill)?
2.  **Draft**: Create the content with valid YAML Frontmatter.
3.  **Path**: Determine the absolute path (`.agent/rules/`, `.agent/workflows/`, or `.agent/skills/<name>/`).
4.  **Create**: Use `write_to_file`.
5.  **Notify**: Inform the user of the new configuration.
