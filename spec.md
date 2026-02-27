# EduTrack AI - School Performance Manager

## Current State

The app has a fully working school management system with:
- Username/password login with admin and teacher roles
- Admin Dashboard showing total students, weak count, high-risk count, subject-wise bar chart, high-risk student list
- Teacher Dashboard showing the same view but without admin-specific controls
- Students page with CRUD and class/section filters
- Marks Entry, Feedback, AI Plans, Reports, Manage Teachers pages

The dashboard currently shows overall stats but does NOT break down students by class or section.

## Requested Changes (Diff)

### Add
- Class/section breakdown tabs or filter on the Dashboard (both admin and teacher view)
- A "Students by Class" section on the dashboard: shows a summary card/row per class (e.g. Class 7, 8, 9, 10) with count of total, weak, and high-risk students in that class
- A class/section filter dropdown on the dashboard so the stats cards and high-risk list update to show only the selected class/section
- Within the class breakdown, allow drilling into sections (Section A, B, etc.)

### Modify
- Dashboard page: add class/section filter UI at the top (after the page header), filter the stats cards and high-risk table based on selected class and section
- Dashboard: add a new "By Class" summary table/grid showing per-class breakdown of student counts and risk levels
- Keep all existing features intact

### Remove
- Nothing

## Implementation Plan

1. Update Dashboard.tsx to add:
   - Two filter dropdowns: "All Classes" and "All Sections"
   - Filter the students/marks data used for stats computation based on selected class/section
   - A "Students by Class" breakdown section showing a summary table with columns: Class, Total Students, Weak, High Risk, % At Risk
   - Color-coded rows (red for high % at risk, orange for moderate, green for good)
2. Ensure filters work for both admin and teacher roles

## UX Notes

- Class filter options: All Classes, then each unique class found in students data (7, 8, 9, 10, etc.)
- Section filter options: All Sections, A, B, C, D
- When a class is selected, show only sections present in that class
- Stats cards update live based on filters
- The "Students by Class" table always shows all classes (unfiltered) for a global overview
- On mobile, stack the filter dropdowns vertically
