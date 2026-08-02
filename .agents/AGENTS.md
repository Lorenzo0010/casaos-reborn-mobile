# Backend Synchronization Rule

Whenever you are asked to implement a new feature, modify an API call, or integrate a new endpoint in this mobile app (`casaos-reborn-mobile`), you MUST proactively inspect the backend repository located at:
`c:\Users\loren\Documents\GitHub\casaos-reborn`

**Instructions for the Agent:**
1. Before proposing a plan or writing frontend code, use your `grep_search` and `view_file` tools to search the backend repository.
2. Identify the exact API endpoints exposed by the backend (e.g., look in `backend/` or `frontend/src/` inside the backend repo).
3. Verify the required HTTP methods, request payloads, and URL parameters.
4. Do not guess the API structure. Always extract the real details from the backend codebase to ensure perfect compatibility.

# Context and Project Focus Rule

By default, ALL modifications, file creations, and searches must be performed strictly within the currently active/open project directory.

**Instructions for the Agent:**
1. If the user asks for a modification without explicitly mentioning a different project, you MUST restrict your actions entirely to the currently open project.
2. Only exit the current project's scope if the user explicitly specifies another project by name or path in their request.

# English Language Rule

All additions to the codebase (including new UI strings, comments, variable names, and documentation) MUST be written in English.

**Instructions for the Agent:**
1. When adding new features, modals, alerts, or any user-facing text, use English by default.
2. If modifying an existing file that contains non-English text, preserve the existing text unless instructed otherwise, but ensure your new additions are in English.
3. If requested to translate existing text, convert it to English to maintain consistency.
