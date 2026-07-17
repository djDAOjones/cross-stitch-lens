# Architecture

<!-- Generated during project initialization. Review and edit as needed. -->
<!-- Update this file when major structural decisions change. -->
<!-- Hot whole-file read. See pm_skills/memory-policy.md for limits. -->
<!-- Describe current structure only. Move historical batch notes to decision-log.md. -->

## Tech stack

<!-- List each technology choice with a one-line reason. -->

## Project structure

<!-- Folder tree showing the intended layout.
     A common pattern for modular projects (JS example shown):
     src/
       config/       — constants, keybindings, tuneable values
       core/         — foundational infrastructure (e.g. EventBus)
       models/       — data classes and entities
       services/     — single-responsibility service modules
       controllers/  — UI orchestration and section management
       components/   — reusable UI components
       handlers/     — input and interaction handling
       utils/        — shared utility functions
     styles/         — CSS files and design tokens
     Adapt directory names to your language's conventions.
     Not every subdirectory is needed. -->

## Key modules

<!-- For each module: name, file/folder path, one-sentence responsibility. -->

## Communication patterns

<!-- How do modules talk to each other?
     Common options:
     - Pub-sub event bus (decoupled, good for many-to-many communication)
     - Direct imports (simple, good for clear one-to-one dependencies)
     - State store (centralised, good for shared reactive state)
     Name the preferred pattern and state when exceptions are acceptable. -->

## Dependency policy

<!-- What's allowed? What needs approval? -->

## Dev workflow

<!-- How to install, run, build, and test the project.
     Example:
     - Install: npm install
     - Dev: npm run dev → http://localhost:3000
     - Build: npm run build → output in docs/
     - Test: npm test (Vitest)
     Include the canonical dev URL and port. -->
