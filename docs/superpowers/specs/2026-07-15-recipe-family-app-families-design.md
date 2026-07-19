# Milestone 4 Families and Shared Recipes Design

Date: 2026-07-15

## Goal

Milestone 4 adds family spaces and shared recipes to Cook Picture. Users can create multiple families, join families by invite code, view family members, manage basic administrator actions, share their own recipes into a family, and browse recipes shared by other family members.

This milestone deliberately stops before ordering/cooking tasks. Pointing at a family recipe and creating an order belongs to Milestone 5.

## Confirmed Scope Decisions

- The app supports multiple families.
- The mobile Family tab shows a family list first; users open a family detail screen from the list.
- Family detail uses an overview-first layout.
- Sharing is initiated from the family detail context through a “share my recipe” flow.
- Administrator features are included in the mobile app: show/copy invite code, refresh invite code, and remove ordinary members.
- Recipe detail entry from family recipes is read-only for this milestone. Ordering is excluded.

## Backend Domain Model

### Family

Represents a family space.

Fields:

- `id`
- `name`
- `description`
- `owner_user_id`
- `avatar_image_id`
- `cover_image_id`
- `invite_code`
- `invite_code_expires_at`
- `theme_config`
- `created_at`
- `updated_at`

Rules:

- Creating a family creates an active admin membership for the creator.
- `invite_code` must be unique and generated server-side.
- `invite_code_expires_at`, avatar, cover, and theme config are persisted or reserved, but rich UI for them is not required in this milestone.

### FamilyMember

Represents a user’s membership in a family.

Fields:

- `id`
- `family_id`
- `user_id`
- `role`: `admin` or `member`
- `nickname_in_family`
- `joined_at`
- `status`: `active`, `removed`, or `left`

Rules:

- `family_id + user_id` is unique.
- Active members can view family details, members, and shared recipes.
- Admins can refresh invite codes and remove ordinary active members.
- Admins cannot remove themselves through the remove-member endpoint.
- Removed or left members are not treated as active members for authorization.

### FamilyRecipe

Represents a user sharing one of their personal recipes into a family.

Fields:

- `id`
- `family_id`
- `recipe_id`
- `shared_by_user_id`
- `created_at`
- `status`: `active` or `removed`

Rules:

- `family_id + recipe_id` is unique.
- Only active family members can share recipes into a family.
- Only the recipe owner can share that recipe.
- Active family members can list shared recipes.
- The recipe owner or a family admin can remove a shared recipe.
- Shared recipes reference the personal recipe. They are not copied.
- If a personal recipe changes, the family recipe view reflects the latest active recipe data.

## Backend API

Add authenticated endpoints under `/api/v1`.

### Families

```text
GET    /families
POST   /families
GET    /families/{family_id}
PATCH  /families/{family_id}
POST   /families/join
POST   /families/{family_id}/invite-code/refresh
GET    /families/{family_id}/members
DELETE /families/{family_id}/members/{user_id}
```

Behavior:

- `GET /families` returns all active memberships for the current user, including role and basic family metadata.
- `POST /families` creates the family and admin membership.
- `GET /families/{family_id}` requires active membership.
- `PATCH /families/{family_id}` is admin-only. It updates name and description in this milestone.
- `POST /families/join` accepts an invite code and adds the current user as a member.
- Joining a family the user already actively belongs to returns the existing membership/family payload rather than creating duplicates.
- `POST /families/{family_id}/invite-code/refresh` is admin-only and returns the updated family payload.
- `GET /families/{family_id}/members` requires active membership.
- `DELETE /families/{family_id}/members/{user_id}` is admin-only and removes ordinary active members.

### Family recipes

```text
GET    /families/{family_id}/recipes
POST   /families/{family_id}/recipes
DELETE /families/{family_id}/recipes/{recipe_id}
```

Behavior:

- `GET /families/{family_id}/recipes` returns active shared recipes for active family members.
- `POST /families/{family_id}/recipes` accepts `recipe_id` and shares the current user’s recipe into the family.
- Re-sharing an already removed family recipe reactivates it.
- Re-sharing an already active family recipe returns the existing active relation.
- `DELETE /families/{family_id}/recipes/{recipe_id}` soft-removes the relation.
- Non-members receive 404 for family-scoped resources to avoid leaking family existence.
- Permission failures for active members use 403.

## Mobile UX

### Family tab

The Family tab starts with one of two states.

No active families:

- Show an empty state: “创建或加入一个家庭，开始一起点菜”.
- Provide create-family action.
- Provide join-by-invite-code action.

With active families:

- Show a list of families the user belongs to.
- Each item shows family name, role, description if present, and member count if available.
- Opening a family navigates to the family detail screen.
- Also show lightweight create and join actions so users can add more families.

### Family detail overview

The family detail screen is overview-first.

Content:

- Family name.
- Description if present.
- Current user role.
- Invite code block with copy affordance.
- Member count.
- Shared recipe count.
- Primary actions:
  - View members.
  - View family recipes.
  - Share my recipe.
- Admin-only actions:
  - Refresh invite code.
  - Remove ordinary members from the member list.

### Create family

Form fields:

- Family name, required.
- Description, optional.

On success:

- Invalidate family list query.
- Navigate to the new family detail screen.

### Join family

Form fields:

- Invite code, required.

On success:

- Invalidate family list query.
- Navigate to the joined family detail screen.

### Members

The member list shows:

- Display name.
- Role.
- Join time if available.

Admin behavior:

- Admins see a remove action for ordinary members.
- Admins do not see a remove action for themselves.

Ordinary member behavior:

- Ordinary members can view the member list.
- Ordinary members do not see remove actions.

### Share my recipe

The share-my-recipe screen is launched from a family detail screen.

Behavior:

- Load the current user’s active personal recipes.
- Load the family’s active shared recipes.
- Mark already-shared recipes as “已共享”.
- Allow sharing unshared personal recipes.
- On success, invalidate family recipe queries and return or stay with updated state.

### Family recipe list

The family recipe list shows:

- Recipe main image when available.
- Recipe title.
- Creator name.
- Shared-by user display name if available.
- Step count.

Actions:

- Open a read-only family recipe detail or reuse the existing recipe detail display if the current user is the owner.
- Show remove-share action only when current user is the recipe owner or family admin.

Ordering actions are not included in this milestone.

## Data Flow

Create family:

1. Mobile submits name and description.
2. Backend creates `Family` and admin `FamilyMember`.
3. Backend returns family payload.
4. Mobile invalidates `families` query and navigates to detail.

Join family:

1. Mobile submits invite code.
2. Backend looks up active invite code.
3. Backend creates or reactivates active member relationship as ordinary member.
4. Mobile invalidates `families` query and navigates to detail.

Share recipe:

1. Mobile opens family-scoped share screen.
2. Mobile loads personal recipes and family recipes.
3. User selects a personal recipe.
4. Backend verifies active family membership and recipe ownership.
5. Backend creates or reactivates `FamilyRecipe`.
6. Mobile invalidates family recipe queries.

Remove member:

1. Admin taps remove on an ordinary member.
2. Backend verifies current user is active admin.
3. Backend sets member status to `removed`.
4. Mobile invalidates family member and family detail queries.

## Error Handling

Backend:

- Missing or invalid token returns 401 through existing auth dependencies.
- Non-member access to family resources returns 404.
- Active member lacking permission returns 403.
- Invalid invite code returns 404.
- Attempts to remove self return 400.
- Attempts to share another user’s recipe return 404.
- Duplicate active share returns the existing active share payload.

Mobile:

- Empty form fields show inline validation messages.
- API failures show short Chinese error copy near the action.
- Loading states use the existing activity indicator pattern.
- Empty states guide the next action.
- Admin-only actions are hidden for ordinary members.

## Testing Strategy

### Backend automated tests

Add API/service tests for:

- Creating a family creates an admin membership.
- Listing families returns only current user’s active memberships.
- Joining by invite code adds a second user as ordinary member.
- Active members can view family detail and member list.
- Admin can refresh invite code.
- Ordinary member cannot refresh invite code.
- Admin can remove ordinary member.
- Ordinary member cannot remove another member.
- Admin cannot remove self.
- User can share their own recipe into a family they belong to.
- Family members can list shared recipes.
- Non-members cannot list family recipes.
- User cannot share another user’s recipe.
- Recipe owner or admin can remove a shared recipe.
- Ordinary non-owner member cannot remove another user’s shared recipe.

### Mobile verification

Run:

```bash
cd mobile
npm run typecheck
```

Manual flow:

1. User A registers/logs in.
2. User A creates a family.
3. User A copies the invite code.
4. User B registers/logs in.
5. User B joins the family with the invite code.
6. User A creates a recipe if needed.
7. User A opens family detail and shares the recipe.
8. User B opens the family recipe list and sees the shared recipe.
9. User B cannot see remove-member controls.
10. User A can remove User B.

## Out of Scope

- Ordering family recipes.
- Cooking task creation.
- In-app notifications.
- Local reminders.
- Family theme editing beyond reserved fields.
- Family cover/avatar upload UI.
- Complex family roles beyond admin/member.
- Family dissolution and admin transfer.
- Family recipe approval workflows.
