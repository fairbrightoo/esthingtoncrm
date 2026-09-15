---
description: Enforces the Git branch deployment workflow for all code changes.
trigger: always_on
---

# Git Workflow & Deployment Rules

1. **Always Push to Staging First**: Whenever you make any changes, modifications, or bug fixes, you must **ONLY** push them to the `staging` branch (e.g. `git push origin staging` or `git push` if currently on staging branch).
2. **Never Push to Main Without Explicit Request**: You are strictly forbidden from pushing code to the `main` (production) branch unless the user explicitly requests you to do so (e.g., "push to main", "deploy to production").
3. **Commit Messages**: Write clear, descriptive commit messages for your changes.
