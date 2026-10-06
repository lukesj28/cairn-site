## Overview
Cairn is a macOS menu bar app that saves a window arrangement as a named stack and restores it with one click.

## Requirements
macOS 12 (Monterey) or later. Apple Silicon and Intel. Needs Accessibility permission, asked on first launch. Mac only; no Windows or Linux build.

## Installing
Download Cairn.dmg from cairnstacks.app or GitHub Releases, drag Cairn to Applications, launch it (menu bar only, no dock icon), grant Accessibility when prompted. Updates install automatically via Sparkle unless turned off in Settings; the menu shows Restart to Update when one is ready.

## Quick Start
Arrange your apps, click the Cairn menu bar icon, choose Snapshot to New Stack, name it if you like. Later, pick the stack from the menu bar to restore every window.

## Core Concepts
Stack: a named layout of apps, window positions, and number of displays (one or two). Positions are stored as fractions (0 to 1) of the screen, not pixels, so a stack saved on one monitor works on another. In a two-display stack each window is pinned to one display; the editor shows both canvases.

## Menu bar
Shows Open Cairn, each saved stack by name (click to apply), Snapshot to New Stack, Settings, update controls, Quit. No per-stack number shortcuts.

## Creating a stack
Snapshot scans all standard windows of running apps and records each as a fraction of the screen it mostly sits on. Or start blank with the plus button in the sidebar and add apps from a file picker.

## Editing a stack
Each window is a tile with its app icon and name on a canvas per display. Drag to move, drag edges or corners to resize. 12x8 snap grid; edges also snap to neighboring tiles; hold Shift to place freely. Inspector has presets (left, right, top, bottom half, full screen, centered) and exact X, Y, width, height percentages. Remove a tile with the trash icon or Delete. Switching from two displays to one drops windows on the second. Rename at the top of the editor; duplicate or delete from the sidebar right-click menu.

## Applying a stack
Click Apply in the editor or pick the stack from the menu bar. Launches apps that are not running, waits for their windows, and moves everything into place.

## Re-capturing a layout
Snapshot again in the editor to replace every window in the stack with the current layout (overwrite, not merge).

## Settings
Open from the menu bar or with Command-comma. Shortcut: record a global shortcut for Snapshot to New Stack (none by default). Updates: toggle automatic checks; use Check for Updates in the menu otherwise. Support: link to support the project. Esc returns to stacks. No shortcut exists for applying a specific stack.

## How it works
Uses the macOS accessibility API, setting a window frame, checking the result, and retrying because some apps enforce minimum sizes. Runs in the background so Cairn stays responsive.

## Privacy and Permissions
Accessibility is the only permission, used to read window positions on snapshot and set them on apply. No analytics; layouts and app usage are never sent anywhere; network is used only to check for updates. Review or revoke in System Settings, Privacy & Security, Accessibility.

## Your Data
Stacks are stored in ~/Library/Application Support/Cairn/stacks.json. If unreadable, Cairn renames it with a .corrupt suffix and starts with an empty list.

## Uninstalling
Quit Cairn, drag Cairn.app to the Trash. Optionally delete ~/Library/Application Support/Cairn/ and remove its Accessibility entry.

## Limitations
Two displays maximum per stack. No progress indicator while applying. No shortcut for applying a specific stack.

## FAQ
Free and open source under the MIT license (github.com/lukesj28/cairn). Works with a main and a secondary display. Mac only. Updates via Sparkle, automatic by default.

## Troubleshooting
Asks for Accessibility every launch: confirm Cairn is listed and on in System Settings, Privacy & Security, Accessibility; after reinstalling, remove the old entry first. Window did not move or wrong size: some apps resist minimum sizes; resize it near the target by hand, then re-apply. Stacks disappeared: look for a .corrupt file in ~/Library/Application Support/Cairn/.

## Support
Bugs and feature requests: github.com/lukesj28/cairn/issues. Source: github.com/lukesj28/cairn. Support link is in Settings.
