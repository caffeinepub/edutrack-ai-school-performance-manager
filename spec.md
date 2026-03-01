# EduTrack AI - School Performance Manager

## Current State

The app has a full-stack school performance management system with:
- Login system with admin/teacher roles (username + password)
- Admin dashboard with class/section filters and stats
- Student CRUD with class/section dropdowns
- Marks entry, teacher feedback, AI improvement plans, reports
- Manage Teachers page (admin-only) for creating/deleting teacher accounts
- Layout with sidebar navigation and top bar with user dropdown (only logout option)
- The backend already has a `changePassword(sessionToken, oldPassword, newPassword)` function

## Requested Changes (Diff)

### Add
- **Admin Settings page** (`/settings`) accessible only to admin role
- **Change Password section** on the settings page: form with current password, new password, confirm new password fields; uses existing `changePassword` backend API; shows success/error feedback
- **Theme Selector section**: toggle between the current "Blue" theme and a "Dark" (dark mode) theme variant; theme preference persisted in localStorage
- **Profile section**: display current admin username and display name (read-only)
- Settings link in the sidebar nav (admin-only), using a Settings icon
- Settings shortcut in the top-bar user dropdown menu alongside logout

### Modify
- `Sidebar.tsx` - add Settings nav item to `adminNavItems`
- `Layout.tsx` - add "Settings" item in the user dropdown that navigates to `/settings`
- `App.tsx` - register the new `/settings` route
- `index.css` - add dark theme CSS variable block (`.dark` class on `<html>`)
- `AuthContext.tsx` or a new `ThemeContext` - manage dark/light theme toggle and persist to localStorage

### Remove
- Nothing removed

## Implementation Plan

1. Add dark mode CSS variables in `index.css` under a `.dark` selector (dark navy/charcoal palette)
2. Create `ThemeContext.tsx` to manage and persist theme preference in localStorage; apply `.dark` class to `<html>` element
3. Wrap `App.tsx` with `ThemeProvider`
4. Create `src/frontend/src/pages/Settings.tsx`:
   - Profile card: shows username and display name (read-only)
   - Change Password card: three-field form (current, new, confirm); calls `changePassword` API; inline validation (passwords must match, min 6 chars); success toast and error display
   - Theme card: two visual theme tiles (Blue/Default, Dark) with active indicator; clicking a tile switches and persists the theme
5. Register `/settings` route in `App.tsx`
6. Add Settings nav item to `adminNavItems` in `Sidebar.tsx`
7. Add Settings menu item to user dropdown in `Layout.tsx`
