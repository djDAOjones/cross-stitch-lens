# ICE-WORKSPACE-01 — Automated Photoshop companion workspace

One button arranges Photoshop and Cross Stitch Lens into a useful
side-by-side workspace. Default: Photoshop left, Cross Stitch Lens
right in the narrow companion layout (M6), split calculated from the
usable dimensions of the selected display.

## Inputs to the calculation

Screen dimensions; usable area after menu bar / Dock / taskbar; display
scaling; multiple monitors; minimum usable width for Photoshop; minimum
useful width for Cross Stitch Lens; pattern aspect ratio; whether the
settings panel is collapsed; user-selected split percentage; restoring
the previous arrangement. Prioritise a useful workspace over matching
the browser window to the pattern's pixel dimensions.

## Browser capability (limited form)

Likely possible: detect screen dimensions; open a dedicated companion
window; size and position that window; auto-enter preview-focused mode;
preset workspace splits.

Documented as unlikely for an ordinary webpage: resizing a normal tab
reliably; controlling an existing multi-tab window; resizing or
repositioning Photoshop; running local OS automation. **Never describe
browser control of Photoshop as an expected capability.**

Browser options: open companion window; preset narrow-window sizes;
detachable preview; manual guidance for arranging Photoshop.

## Desktop capability (likely route to full automation)

A packaged build (see ICE-TAURI-01) could: detect monitors and usable
areas; resize/position its own window; identify Photoshop's display;
invoke a tightly controlled OS helper; resize/position the main
Photoshop window; apply and restore saved arrangements; remember
monitor, side, and split.

On macOS, investigate Accessibility-based UI scripting or AppleScript
to control Photoshop. Account for: Accessibility permission prompts;
Photoshop closed or with no document window; multiple Photoshop
windows; full-screen mode; multiple monitors; Photoshop version
differences; macOS window-management changes between versions; failure
to identify or move the correct window; security implications of
invoking local scripts. Treat Windows automation separately — do not
assume it behaves like macOS.

## Suggested layouts

Photoshop 65/70/75% vs Lens 35/30/25%; user-defined split; Lens on
either side; Lens on a separate monitor.

## Possible controls

Arrange workspace; open companion window; side toggle (Photoshop
left/right); monitor selection; split-percentage control; remember this
arrangement; restore previous arrangement; preview-only mode after
arranging.

## Spike questions (before committing the feature)

- What can be achieved reliably in a browser (overlaps M6-WIN-01)?
- Can a dedicated browser window be positioned consistently?
- Does Tauri provide the necessary monitor and window controls?
- Can Photoshop be resized reliably on macOS via Accessibility?
- What permissions and user prompts are required?
- Does the benefit justify desktop packaging?
- Is a manual / semi-automatic browser workflow an acceptable fallback?

## Dependencies

- M6-WIN-01 (browser companion-window findings).
- ICE-TAURI-01 (desktop packaging feasibility) for the full form.
