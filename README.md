# Cook Picture

Cook Picture is a lightweight mobile app for personal recipes, family recipe sharing, family meal requests, cooking assignments, and local cooking reminders.

## Apps

- `mobile/`: React Native + Expo mobile app.
- `backend/`: FastAPI API server.

## Hugging Face Space

The Hugging Face Space deployment is backend-only and free-compatible with the Gradio Space SDK: it runs the FastAPI API and SQLite demo database. The phone app remains the frontend and should use the Space API URL, ending in `/api/v1`, as its backend base URL.

The Docker runtime stores demo data in SQLite under `/data/cook_picture.db` and uploaded recipe images under `/data/uploads`.

## MVP Milestones

1. Project foundation.
2. Registration, login, and account settings.
3. Recipes and image uploads.
4. Families and shared recipes.
5. Orders, task lists, and in-app notifications.
6. Local reminders and settings.

## Backend Development

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected response:

```json
{"status":"ok","app_name":"Cook Picture API","environment":"development"}
```

Run backend tests:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

## Mobile Development

```bash
cd mobile
npm install
npm run start
```

The committed Expo app config and API client fallback use `http://10.0.2.2:8000/api/v1`, which lets an Android emulator reach the backend running on the host machine. Override `EXPO_PUBLIC_API_BASE_URL` when targeting a different runtime, such as iOS simulator, web, or a physical device.

Typecheck:

```bash
cd mobile
npm run typecheck
```

## Foundation Verification

1. Start the backend with `uvicorn app.main:app --reload`.
2. Confirm `/api/v1/health` returns `status: ok`.
3. Start the mobile app with `npm run start`.
4. Open the temporary app route from the login screen.
5. Open 「设置」 and confirm `API 状态：ok` appears.

## Auth Milestone Verification

After backend dependencies are installed and the database is configured, run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth.py app/tests/test_security.py app/tests/test_auth_service.py app/tests/test_auth_api.py app/tests/test_users.py -v
```

Manual backend auth check:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"cook@example.com","password":"secret123","nickname":"Cook"}'
```

Expected response includes `access_token`, `token_type: bearer`, and user email `cook@example.com`.

Manual mobile auth check:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. Open register screen.
4. Register with email, nickname, and password.
5. Confirm the app routes to the tabs.
6. Open Settings and confirm account information appears.
7. Tap logout and confirm the app returns to login.

## Recipe Milestone Verification

Backend recipe and image checks:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_images.py app/tests/test_recipes_api.py -v
```

Expected result: image upload tests and recipe CRUD tests pass.

Full backend regression:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected result: all backend tests pass.

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

Expected result: TypeScript reports zero errors.

Manual recipe flow:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. Register or log in.
4. Open 「菜谱」.
5. Tap 「新建」.
6. Select a recipe main image.
7. Enter title, author, description, comma-separated tags, and at least one step.
8. Save and confirm the app opens the recipe detail screen.
9. Return to 「菜谱」 and confirm the recipe appears in the list.
10. Open the recipe detail screen, tap 「编辑」, change the title or steps, and save.
11. Open the recipe detail screen again and delete the recipe.
12. Confirm the deleted recipe no longer appears in the list.

## Family Milestone Verification

Backend family checks:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_families_api.py app/tests/test_family_recipes_api.py -v
```

Expected result: family, member permission, invite-code, and shared recipe tests pass.

Full backend regression:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected result: all backend tests pass.

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

Expected result: TypeScript reports zero errors.

Manual family flow:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. User A registers or logs in.
4. User A creates a family.
5. User A copies the invite code from family detail.
6. User B registers or logs in.
7. User B joins the family with the invite code.
8. User A creates a recipe if needed.
9. User A opens family detail and shares the recipe.
10. User B opens family recipes and sees the shared recipe.
11. User B cannot see member removal controls.
12. User A opens members and removes User B.

## Orders Milestone Verification

Backend order and notification checks:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_orders_api.py app/tests/test_notifications_api.py -v
```

Expected result: order creation, assignment notifications, status transitions, cancellation, reminder-time updates, notification listing, and read-state tests pass.

Full backend regression:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected result: all backend tests pass.

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

Expected result: TypeScript reports zero errors.

Manual orders and task-list flow:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. User A registers or logs in.
4. User A creates a family and shares at least one recipe.
5. User B registers or logs in and joins the family.
6. User A opens the family recipe detail screen.
7. User A taps 「点这道菜」.
8. User A selects User B as the cook, chooses a meal slot, enters date/time if needed, and submits.
9. User B opens 「清单」 and sees the task under 「我要做的菜」.
10. User B taps 「接单」 and confirms the task changes to accepted.
11. User A opens 「清单」 or 「动态」 and confirms an accepted notification appears.
12. User B taps 「完成」 and confirms the task moves to 「我做过的菜」.
13. User A confirms a completed notification appears.
14. Create another order and have User A cancel it from 「我点的菜」.
15. Confirm User B receives a cancelled notification.

## Local Reminders and Settings Milestone Verification

Backend settings checks:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_users.py app/tests/test_orders_api.py -v
```

Expected result: user settings, password/account updates, and order reminder-time update tests pass.

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

Expected result: TypeScript reports zero errors.

Manual settings and reminder flow:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. Register or log in.
4. Open 「设置」.
5. Open 「提醒管理」.
6. Turn notifications on and set a default reminder minute value.
7. Save settings and confirm the success message appears.
8. Create a family order with a future scheduled date and time.
9. Log in as the assignee and open 「清单」.
10. Tap 「接单」.
11. If running on iOS or Android, grant notification permission and confirm the app reports that a reminder was scheduled.
12. If running on Web, confirm the app reports that local reminders are unsupported while still accepting the order.
13. For an active order without a reminder, tap 「按默认时间提醒」.
14. Confirm the reminder label appears on the order.
15. Tap 「取消提醒」 and confirm the reminder label returns to 「未设置提醒」.
16. Return to 「设置」, open 「主题」, change theme mode or theme color, and confirm the app applies it.
17. Open 「账户」, update nickname, and confirm the new nickname persists.
18. Update password with current password and matching confirmation, then confirm login with the new password works.
