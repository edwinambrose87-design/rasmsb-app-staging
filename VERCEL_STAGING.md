# Vercel Staging Preview Guide

This guide keeps production safe while testing the repaired attendance flow.

## What To Deploy First

Use the copied project first:

```text
C:\Users\edwin\Desktop\rasmsb-app - Copy
```

Do not replace the original `rasmsb-app` folder until the preview link is tested.

Do not use **Vercel Drop** for this Next.js app. Use GitHub import or Vercel CLI instead, because the app needs Vercel to run the Next.js install and build process.

## Option A: Safest Vercel Preview

Create a separate staging project in Vercel.

1. Put this copy into its own GitHub repository, for example `rasmsb-app-staging`.
2. In Vercel, choose **Add New Project**.
3. Import the staging repository.
4. Set the same environment variables used by the original app:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

5. Keep the framework as **Next.js**.
6. Keep the build command as:

```text
npm run build
```

7. Deploy.
8. Open the generated Vercel preview link and test:

```text
/mobile
/dashboard/attendance
```

## Option A2: Deploy Preview With Vercel CLI

From this copied project folder, run:

```text
npm install
npx vercel
```

When Vercel asks questions:

```text
Set up and deploy? Yes
Which scope? Choose your Vercel account
Link to existing project? Yes, if you already created rasmsb-app-staging
Root directory? ./
Build command? npm run build
Output directory? leave default
Development command? npm run dev
```

For a staging/preview deploy, use:

```text
npx vercel
```

For production, use this only after testing:

```text
npx vercel --prod
```

## Option B: Preview Branch On The Original Vercel Project

Use this only after Option A feels good.

1. In the original app repository, create a new branch, for example:

```text
staging/attendance-mobile-fix
```

2. Copy only the changed files from this repaired copy into that branch.
3. Push the branch to GitHub.
4. Vercel will create a Preview Deployment automatically.
5. Test the preview URL.
6. Merge to `main` only after attendance sign-in and sign-out are confirmed.

## Important Mobile Camera Note

The attendance selfie camera works best on HTTPS.

Local testing with `http://192.168.1.11:3000/mobile` may allow login but can still block camera access on some phones. A Vercel preview URL uses HTTPS, so it is the better test for the final mobile attendance flow.

## Attendance Test Checklist

1. Login as the guard.
2. Confirm the officer name appears.
3. Confirm the assigned project/post appears.
4. Tap the Attendance tile or the green **Sign In** button.
5. Allow camera permission.
6. Snap and clock in.
7. Refresh the page.
8. Confirm it still shows the guard as clocked in.
9. Tap **Sign-Out Shift**.
10. Confirm Supabase updates `clock_out_time` and `status` becomes `CLOCKED_OUT`.
11. Confirm the dashboard attendance page shows the in/out record.

## If The Dashboard Shows A Yellow Project Warning

That means attendance rows exist, but their `project_id` does not match the selected dashboard project.

Check these two places in Supabase:

```text
guards.project_id
guard_attendance.project_id
```

They should match the project selected in the dashboard.
