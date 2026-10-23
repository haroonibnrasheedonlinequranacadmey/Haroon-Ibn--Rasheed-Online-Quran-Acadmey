HAROON IBN RASHEED ONLINE QURAN ACADEMY — COMPLETE SUPABASE-READY BUILD

IMPORTANT
- Existing public website content/pages were retained; enhancements were added on top.
- The public site keeps the existing hero image/content and now uses the navy/teal/coral palette from the supplied reference design.
- A floating Message button is present across the public site (the website is a single-page multi-section structure).
- Messages are stored in Supabase and can be replied to from Admin > Messages.
- Payment Methods are managed from Admin > Payment Methods. Enabled methods automatically appear on the public Fees section.
- Student registration/login and Student Dashboard are included.
- Teacher login/dashboard and attendance workflow are included.
- Admin Portal Users page lets an admin promote registered accounts to Teacher.
- SEO helpers: sitemap.xml, robots.txt and 404.html.

SUPABASE SETUP
1. Open Supabase SQL Editor.
2. Run the ENTIRE supabase/schema.sql file.
3. Confirm the existing admin Auth user exists. The original schema attaches easyquranlearning10@gmail.com as admin.
4. In Supabase Authentication > URL Configuration, set Site URL to your deployed GitHub Pages URL and add the reset-password URL under Redirect URLs.
5. Verify js/config.js contains your Supabase project URL and publishable/anon key.
6. For public two-way messaging, the three RPC functions in schema.sql must be created; running the full schema does that.

PAYMENTS
Payment Methods are intentionally configurable, not hard-coded. Add any method such as:
- PayPal
- Bank Transfer
- EasyPaisa
- JazzCash
- Stripe
- Any custom method
Enter account name/number/instructions and toggle visibility. This publishes the method on the website. This build does NOT process card/PayPal transactions itself; it publishes your instructions/details for the method you configure.

SECURITY
- Public visitors can submit messages/leads but cannot directly read admin data.
- Admin tables are protected by the admin role/RLS.
- Student/teacher portal data is restricted by role and ownership/assignment.
- Never put Supabase service_role keys in frontend files.

PAGES
Public: index.html, portal-login.html, register.html, 404.html
Admin: login, forgot/reset password, dashboard, admissions, users, students, teachers, courses, fees, payment-methods, messages, FAQs, content, settings
Student: student/dashboard.html
Teacher: teacher/dashboard.html

DEPLOYMENT
Upload the complete folder contents to your GitHub Pages repository. Do not rename the repository/path unless you also update the Supabase Site URL, Redirect URLs and sitemap.

FINAL COMPLETION NOTES
- Teacher portal: dashboard, students, classes, schedule, attendance, courses, leaves, salary, profile.
- Student portal: dashboard, profile, teacher, courses, classes, schedule, attendance, fees, leaves.
- Admin: classes, attendance, payments, leaves, salaries are included in addition to the original admin modules.
- Existing public WhatsApp and message/chat buttons are retained.
- Run the complete supabase/schema.sql once before using portal data.
- Public registration creates a Student profile automatically. Admin can promote a user to Teacher from Portal Users and link the account UUID in Teachers/Students.
