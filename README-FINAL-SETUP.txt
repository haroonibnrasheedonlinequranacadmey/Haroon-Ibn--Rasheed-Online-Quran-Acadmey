HAROON IBN RASHEED ONLINE QURAN ACADEMY — FINAL BUILD

This package contains:
- Public website
- Supabase Auth login/register/forgot/reset
- Admin portal
- Teacher portal
- Student portal
- Courses, teachers, students, admissions
- Fees and student payments
- Schedules and classes
- Attendance
- Leaves
- Teacher salaries
- FAQs/content/settings
- Role-based Supabase RLS

ONE-TIME SETUP
1. Upload the contents of this folder to your GitHub Pages repository (the index.html must be at the published site root).
2. Open Supabase SQL Editor and run: supabase/final-schema.sql
3. In Supabase Authentication > URL Configuration, set Site URL to your GitHub Pages URL.
4. Add Redirect URL:
   YOUR-GITHUB-PAGES-URL/admin/reset-password.html
5. The existing admin seed uses easyquranlearning10@gmail.com if that Auth account already exists.
6. New users can register from Admin Login > Create account. New accounts start as Student.
7. Admin can use User Roles to promote an account to Teacher. The database automatically creates the teacher record.
8. Admin then manages teacher/student assignments, schedules, classes, payments, salaries, leaves and attendance.

IMPORTANT
- Supabase Auth accounts cannot be securely created from GitHub Pages using the public anon/publishable key. This build deliberately does NOT expose a service-role key.
- Never put a Supabase service-role/secret key in GitHub Pages.
- The package is designed so all normal runtime operations use the public Supabase key plus database RLS.

SECURITY
- Admin data is restricted to admin role.
- Teachers see only their assigned students/classes/attendance/salary/leaves.
- Students see only their own data.
- Public admissions can be submitted anonymously.
