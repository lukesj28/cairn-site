## Overview
Cairn is a macOS menu bar app that remembers how you like your windows arranged and puts them back that way with one click. You save an arrangement as a named stack (for example one for coding, one for writing) and restore it from the menu bar instead of dragging windows into place by hand. Free and open source (MIT). Created by lukesj28 (github.com/lukesj28). Website: cairnstacks.app.

## Requirements
macOS 12 (Monterey) or later. Apple Silicon and Intel. Mac only; there is no Windows, Linux, iPhone or iPad version. Needs Accessibility permission, asked on first launch.

## Installing
Download Cairn.dmg from cairnstacks.app (Download for Mac button) or from GitHub Releases (github.com/lukesj28/cairn/releases). Open the DMG and drag Cairn into Applications. Launch it: it lives in the menu bar only, there is no Dock icon. Grant Accessibility access when prompted; Cairn cannot capture or apply layouts without it. Release builds are signed with a Developer ID and notarized by Apple, so the first time you open Cairn macOS only shows its standard confirmation for apps downloaded from the internet; click Open.

## Quick Start
1. Open the apps you want and arrange them roughly how you like.
2. Click the Cairn menu bar icon, then Snapshot to New Stack.
3. The layout saves as a new stack called New Stack 1 (or the next free number) and the Cairn window opens. Select it in the sidebar to rename it at the top of the editor.
4. Next time, click the Cairn menu bar icon and pick the stack by name to put every window back.

## Core Concepts
A stack is a named layout: which apps, where their windows sit, and how many displays (one or two) the layout uses. Positions are stored as fractions (0 to 1) of the screen's usable area instead of pixels, so a window at x 0.5, width 0.5 is always the right half of the screen, and a stack saved on a laptop still works on a big external monitor. Usable area excludes the menu bar and Dock. In a two-display stack each window is pinned to one display, and the editor shows one canvas per display. A stack stores the app and window position only; it does not remember which document, tab, folder or website a window had open.

## Menu bar
Click the Cairn icon to see, in order: Open Cairn; every saved stack by name (click to apply it right away; hover for a tooltip like "3 windows · 1 display"); Snapshot to New Stack; Settings… (Command-comma); Check for Updates (becomes Restart to Update once an update is downloaded); Quit Cairn (Command-Q). With no stacks it shows a disabled "(No Stacks Saved)". There are no number-key shortcuts for individual stacks. Stacks are listed in the order they were created and cannot be reordered. The menu bar icon adapts to light and dark menu bars, and there is no option to hide it.

## The Cairn window
Open Cairn opens the main window titled Cairn, Window Stacks. Left: a sidebar listing your stacks, each with a window count and display count. Right: the editor for the selected stack. The window remembers its size and position, and closing it just hides it; the app keeps running in the menu bar. The same window switches to Settings (Back returns to stacks). If Accessibility is not granted, a banner at the top says "Accessibility Permission Required" with a Grant Access… button. The window opens at 940 by 620 points and cannot be made smaller than 860 by 560. Cairn has no theme setting; it follows the Mac's light or dark appearance.

## Sidebar
Sidebar header shows Stacks and a count. Bottom bar: plus (New Empty Stack), minus (Delete Selected Stack), gear (Settings, Command-comma). Right-click a stack for Apply Layout, Duplicate, Delete. Duplicate makes "<name> Copy" with the same windows and selects it. Deleting from the right-click menu or the minus button is immediate with no confirmation; the trash button in the editor asks "Delete this stack?" first. There is no undo. Stacks cannot be reordered or renamed from the sidebar; rename in the editor. Two stacks can have the same name; nothing enforces unique names.

## Creating a stack
Snapshot to New Stack (menu bar item, or your global shortcut) scans the windows of your running apps and records each as a fraction of the screen it mostly sits on, then opens the Cairn window. Snapshots from the menu bar or shortcut are always one-display stacks and cover the display your mouse is on. The stack is named New Stack N using the first unused number. Alternatively start blank with the plus button in the sidebar (New Empty Stack), then add apps with Add App. With no stacks, the window offers New Blank Stack and Snapshot Current Windows buttons.

## What a snapshot captures
Only standard windows of regular apps (the ones with a Dock icon). Dialogs, palettes, panels and popovers are skipped, and menu-bar-only or background apps are skipped. Each window goes to the display holding its center. Minimum recorded size is 5 percent of the screen per axis. Needs Accessibility permission; without it nothing is captured. Apps are identified by bundle identifier, not by window title. Without Accessibility permission a snapshot sees no windows: Snapshot to New Stack then creates an empty stack, and Snapshot in the editor leaves the stack empty.

## Editing a stack
The editor header has the stack name, a window count, a 1 Display / 2 Displays picker, and buttons Add App, Snapshot, Apply and Delete Stack (trash). Each window appears as a tile with its real app icon, app name and size in percent on a canvas per display (Display 1 (Main), Display 2). Click a tile to select it. Drag to move. Drag any edge or corner of the selected tile to resize. Click empty canvas to deselect. Dragging a tile's center onto the other canvas moves it to that display. Dragging cannot make a tile smaller than one grid cell (1/12 of the width, 1/8 of the height). Remove a window by selecting its tile and clicking the small gray x in the tile's title bar, with Remove Window in the inspector, or with the Delete or Backspace key; the red, yellow and green dots on a tile are decoration only. Escape deselects. No undo, redo, copy/paste or arrow-key nudging. Rename the stack by editing its name at the top (Return or clicking away saves; empty names are ignored). An empty canvas shows No Windows on Main Display (or Display 2) and Click Add App above to place windows.

## Snap grid
Each canvas has a faint 12 by 8 grid. Dragging snaps window edges to grid lines, to the screen edges, and magnetically (about 2 percent) to the edges of neighboring tiles so windows line up flush. Hold Shift while dragging to place freely without snapping. Presets and typed values never snap.

## Inspector
The right panel shows Stack Overview (list of windows, click one to select it) when nothing is selected. For a selected window it shows the app, its bundle identifier, a Display picker (only when the stack has two displays), Quick Presets, Geometry and Remove Window. Presets: Left 1/2, Right 1/2, Top 1/2, Bottom 1/2, Full (whole screen), Center (70 percent wide, 80 percent tall, centered). Geometry fields X, Y, W, H are percentages from 0 to 100 with minus/plus steppers (5 per click); press Enter to commit; values are clamped to stay on screen. Typed values are saved only when you press Return; non-numeric input reverts. Typed values and presets are clamped to at least 5 percent per axis and kept fully on screen.

## Adding apps
Add App opens a file picker at /Applications limited to .app bundles; you can browse to apps in other folders and select several. Each new tile starts at 50 percent by 50 percent on Display 1, cascading down and right so they do not stack exactly. Add the same app more than once to place multiple windows of it (for example two browser windows). The tile is labeled with the app's file name.

## Applying a stack
Click Apply in the editor, pick the stack from the menu bar, or right-click it in the sidebar and choose Apply Layout. Cairn launches apps that are not running, waits for their windows, opens extra windows for apps that need more than one, moves and resizes everything into place, un-minimizes windows, leaves full screen, unhides hidden apps and brings the stack's apps to front. A one-display stack is applied to the display your mouse cursor is on. Other windows are not closed, minimized or moved; extra windows beyond what the stack lists are left alone. Applying does not restore documents or tabs. Cairn tries for roughly 7 seconds and then gives up quietly. There is no progress indicator and no undo.

## Applying: details
Stacks are independent of each other. Applying a second stack just positions windows again, so an app that appears in both stacks is moved to the position in whichever stack you applied last. Each saved window entry claims the nearest existing window of that app, so apps with several open windows are matched by position. A stack with no windows does nothing when applied. Without Accessibility permission, applying only shows the macOS permission prompt. Applying sets both the position and the size of each window. To open extra windows Cairn presses the app's New Window menu item, skipping tab, folder, private and incognito items, and falls back to Command-N, trying at most 3 times per app. Every window of the stack's apps comes to the front, not only the placed ones.

## Two displays
Choose 2 Displays in the editor picker to add a second canvas. Stacks span a main display and one secondary display; maximum two displays per stack. Display 1 is the display under your mouse cursor when you apply or capture, and Display 2 is the leftmost of your other displays, so which physical monitor is "main" depends on where your cursor is. Switching a stack from 2 displays to 1 deletes the windows placed on Display 2 without warning. If a two-display stack is applied with only one monitor connected, everything lands on that one display. To capture both monitors, set the stack to 2 Displays first and then press Snapshot in the editor. With only one monitor connected, Snapshot in the editor of a two-display stack captures just that monitor and leaves Display 2 empty. In the editor, move a tile to the other display by dragging its center onto the other canvas or with the Display picker in the inspector.

## Re-capturing a layout
Press Snapshot in the editor to replace every window in that stack with the current layout. It is a full overwrite, not a merge, there is no confirmation and no undo. It uses the stack's current display count and shows Capturing while it works.

## Settings
Open from the menu bar, the gear in the sidebar, or Command-comma while viewing stacks; Escape or Back returns. Three sections. Shortcut: a recorder labeled "Snapshot to New Stack" for a global keyboard shortcut that works from any app and saves your open windows as a new stack; none is set by default. Updates: toggle "Automatically install updates" (on by default); when off, use Check for Updates in the menu bar. Support: a Support Cairn button that opens ko-fi.com/lukesj28. There is no launch-at-login option, no Dock icon toggle and no theme setting. The update toggle controls both checking for and installing updates.

## Keyboard shortcuts
Command-comma: open Settings (while viewing stacks). Escape: back from Settings, or deselect a window tile in the editor. Delete or Backspace: remove the selected window tile. Shift while dragging: free placement without snapping. Command-Q: quit from the menu. Your own global shortcut for Snapshot to New Stack, recorded in Settings. There is no shortcut for applying a specific stack; pick it from the menu bar.

## Launch at login
Cairn has no built-in launch-at-login setting. To start it automatically, add Cairn.app to System Settings, General, Login Items yourself.

## Updates
Cairn updates through Sparkle. By default it checks and installs updates automatically in the background. Turn that off in Settings and use Check for Updates in the menu bar instead. When an update is downloaded and ready, the menu item changes to Restart to Update.

## How it works
Cairn uses the macOS accessibility API, the only way to move another app's windows. It sets a window's frame, checks what actually happened, and retries up to about five times because some apps enforce minimum sizes. If an app refuses to go smaller than its minimum, the window ends at that minimum size, kept on screen and anchored to the target. It runs on a background queue so Cairn stays responsive. To open extra windows for an app, it looks for the app's New Window menu item (or File menu New item) and falls back to Command-N.

## Privacy and Permissions
Accessibility is the only permission, used to read window positions on snapshot and set them on apply. Cairn has no analytics and never sends layouts, window titles or app usage anywhere; its only network use is checking for updates. Review or revoke access in System Settings, Privacy and Security, Accessibility.

## Your Data
Stacks are stored in one JSON file: ~/Library/Application Support/Cairn/stacks.json. It is local only, with no cloud sync, and there is no limit on the number of stacks that the app enforces. If the file is unreadable, Cairn renames it to stacks.json.corrupt (replacing an older .corrupt copy) and starts with an empty list instead of crashing or silently overwriting it. Older saves with pixel positions are converted to fractions automatically. The file is plain JSON: a list of stacks, each with id, name, screens (1 or 2) and windows; each window has appName, bundleIdentifier, rect as [[x, y], [width, height]] fractions from the top-left of the usable area, and screen (0 for Display 1, 1 for Display 2). Every change saves immediately; there is no Save button. Cairn reads the file only at launch, so quit Cairn before editing it by hand. One invalid entry makes the whole file unreadable, and then the whole file is set aside as stacks.json.corrupt. There is no import or export button; copy the file to move stacks to another Mac.

## Uninstalling
Quit Cairn from the menu bar, drag Cairn.app to the Trash. Optionally delete ~/Library/Application Support/Cairn/ (your stacks) and remove Cairn's entry in System Settings, Privacy and Security, Accessibility.

## Limitations
Two displays maximum per stack. No progress indicator while applying and no failure message (missing app, no permission, window never appeared: it just stops). No shortcut for applying a specific stack. No undo anywhere. Positions only: no documents, tabs or Spaces. Cairn has no special handling for macOS Spaces (virtual desktops); it places the windows macOS reports for the current desktop. Apps that are not installed on this Mac are skipped. Apps with no New Window command may end up with fewer windows than the stack lists. Menu bar snapshots capture one display only. No way to hide the menu bar icon or show a Dock icon. Stacks cannot be reordered. No import or export button. No theme setting.

## Is Cairn free
Yes. Free and open source under the MIT license; source at github.com/lukesj28/cairn. Optional support via the Support Cairn button in Settings or the buy me a coffee panel on the website (ko-fi.com/lukesj28).

## Troubleshooting Accessibility
Asks for Accessibility every launch, or capture and apply do nothing: open System Settings, Privacy and Security, Accessibility, confirm Cairn is listed and switched on. After reinstalling, remove the old Cairn entry first, then approve Cairn again and relaunch it. Cairn re-checks permission whenever you switch back to it.

## Troubleshooting Windows
A window did not move or ended up the wrong size: some apps enforce a minimum window size or refuse resizing. Resize it near the target by hand, then apply again. An app did not open: Cairn finds apps by bundle identifier and silently skips ones that are not installed on this Mac; remove that tile or add the app again. A second window of an app did not appear: the app may have no New Window command. Apps in full screen are taken out of full screen when placed. Windows went to the wrong monitor: Display 1 is the display under your mouse cursor when you apply, so move the cursor to the monitor you want and apply again. A new stack or snapshot is empty: Accessibility permission is missing; see Troubleshooting Accessibility.

## Troubleshooting Stacks
Stacks disappeared: look in ~/Library/Application Support/Cairn/ for stacks.json.corrupt. If present, the real file was unreadable and Cairn kept the old copy under that name. Cairn has no import or restore button; a corrupt file must be fixed by hand. A stack saved on a large monitor looks different on a small one only in size, not proportion, because positions are fractions.

## Support
Bugs and feature requests: github.com/lukesj28/cairn/issues. Source: github.com/lukesj28/cairn. Support the project: Support Cairn in Settings, or ko-fi.com/lukesj28.

## Building from source
Cairn is a Swift Package Manager project with no Xcode project file; it needs Xcode for the Swift toolchain and macOS 12 or later. git clone https://github.com/lukesj28/cairn.git, cd cairn, make dev (debug ad-hoc signed Cairn.app), make run. Other targets: make test (CairnKit tests), make app-release (signed with a Developer ID), make dmg (needs Python dmgbuild), make clean. Dependencies: Sparkle for updates and KeyboardShortcuts for the global shortcut. The package uses swift-tools-version 6.0, so it needs Swift 6.0 or newer (a recent Xcode). Dependencies: Sparkle 2.6.0 or later and KeyboardShortcuts 2.4.0 or later. make help lists every target. Tests cover the CairnKit engine (snapping, geometry, placement, models, storage), not the UI.

## Version history
1.0.0: first release with Sparkle auto-updates and DMG packaging, multi-monitor stacks, fractional positions, multiple windows per app. 1.1.0: Settings screen with automatic update toggle, global Snapshot to New Stack shortcut, fix so editors open with the right number of displays, larger clickable footer buttons, hardened accessibility handling. Latest release: github.com/lukesj28/cairn/releases/latest.

## App details
Bundle identifier com.lucassanjuan.Cairn. Current version 1.1.0 (build 2), minimum macOS 12.0. Cairn runs as a menu bar agent app, which is why it has no Dock icon. The Accessibility prompt reads: Cairn needs accessibility access to snapshot and arrange your windows. Sparkle checks https://lukesj28.github.io/cairn/appcast.xml for updates and verifies each update's EdDSA signature before installing. Releases are built by GitHub Actions, signed with a Developer ID under the hardened runtime, notarized and stapled.

## The website
cairnstacks.app is an interactive scroll-driven site. Scrolling, swiping, arrow keys, Page Up/Down, Home and End move through three stages; the Download for Mac button is on the first. The last stage shows a stacked cairn of four stones: the top stone opens the documentation, the second links to the GitHub source, the third shows what's new (the latest release), and the bottom stone opens a buy me a coffee support panel. Hover a stone for a label. The site respects reduced-motion settings. Documentation lives at cairnstacks.app/docs.

## The helper
The small flying character on the website is the helper. It answers questions about Cairn: common questions get instant written answers, and anything else goes to a small assistant that only knows Cairn. It only discusses Cairn, and it points to the docs page or the GitHub README when it is not sure. Messages are limited to 500 characters and the chat is rate limited per minute.
