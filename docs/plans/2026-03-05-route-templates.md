# Route Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let drivers save routes as shared templates and create new daily routes from them in one tap.

**Architecture:** Two new Prisma models (RouteTemplate, TemplateStop) with 4 API endpoints. Mobile gets a template picker at the top of RoutesScreen and a "Save as Template" action on route details. Templates are shared — all drivers see all templates.

**Tech Stack:** Prisma + Express (backend), React Native (mobile), SQLite (local dev), PostgreSQL (prod)

---

### Task 1: Schema — Add RouteTemplate and TemplateStop models

**Files:**

- Modify: `apps/api/prisma/schema.prisma` (after line 283)
- Modify: `apps/api/prisma/schema.local.prisma` (after line 283)

**Step 1: Add models to both schema files**

Add to both `schema.prisma` and `schema.local.prisma` (use `Float` instead of `Decimal` in local):

```prisma
// ─── Route Templates ────────────────────────────────────────

model RouteTemplate {
  id             String         @id @default(cuid())
  name           String
  platformLinkId String?
  notes          String?
  createdBy      String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  creator        User           @relation("templateCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  platformLink   PlatformLink?  @relation(fields: [platformLinkId], references: [id], onDelete: SetNull)
  stops          TemplateStop[]

  @@index([createdBy])
}

model TemplateStop {
  id             String        @id @default(cuid())
  templateId     String
  address        String
  city           String?
  state          String?
  zipCode        String?
  sequence       Int
  facilityName   String?
  facilityType   String?
  contactName    String?
  contactPhone   String?
  deliveryWindow String?

  template       RouteTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@index([templateId, sequence])
}
```

**Step 2: Add relation to User model**

In the User model, add:

```prisma
  routeTemplates RouteTemplate[] @relation("templateCreator")
```

**Step 3: Add relation to PlatformLink model**

In the PlatformLink model, add:

```prisma
  routeTemplates RouteTemplate[]
```

**Step 4: Push schema to local SQLite**

Run: `cd apps/api && PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --schema=prisma/schema.local.prisma --force-reset`
Then re-seed: `npx tsx prisma/seed.ts`
Expected: "Your database is now in sync" + 3 platforms seeded

**Step 5: Verify build**

Run: `cd apps/api && npm run build`
Expected: Clean build, no errors

**Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/schema.local.prisma
git commit -m "feat: add RouteTemplate and TemplateStop schema models"
```

---

### Task 2: Backend — Template API endpoints

**Files:**

- Create: `apps/api/src/routes/templates.ts`
- Modify: `apps/api/src/index.ts` (register route)

**Step 1: Create the template routes file**

Create `apps/api/src/routes/templates.ts`:

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();
router.use(authenticate);

// ─── POST /templates — Save route as template ──────────────

const saveTemplateSchema = z.object({
  routeId: z.string().min(1),
  name: z.string().min(1).max(100),
});

router.post(
  "/",
  validate(saveTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { routeId, name } = req.body;

    const route = await prisma.route.findFirst({
      where: { id: routeId, userId },
      include: {
        stops: {
          orderBy: { sequence: "asc" },
          select: {
            address: true,
            city: true,
            state: true,
            zipCode: true,
            sequence: true,
            facilityName: true,
            facilityType: true,
            contactName: true,
            contactPhone: true,
            deliveryWindow: true,
          },
        },
      },
    });
    if (!route) throw AppError.notFound("Route not found");

    const template = await prisma.routeTemplate.create({
      data: {
        name,
        platformLinkId: route.platformLinkId,
        notes: route.notes,
        createdBy: userId,
        stops: {
          create: route.stops.map((stop) => ({
            address: stop.address,
            city: stop.city,
            state: stop.state,
            zipCode: stop.zipCode,
            sequence: stop.sequence,
            facilityName: stop.facilityName,
            facilityType: stop.facilityType,
            contactName: stop.contactName,
            contactPhone: stop.contactPhone,
            deliveryWindow: stop.deliveryWindow,
          })),
        },
      },
      include: {
        stops: { orderBy: { sequence: "asc" } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        platformLink: { include: { platform: { select: { id: true, name: true, slug: true } } } },
      },
    });

    res.status(201).json({ template });
  }),
);

// ─── GET /templates — List all shared templates ─────────────

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const templates = await prisma.routeTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        stops: { orderBy: { sequence: "asc" } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        platformLink: { include: { platform: { select: { id: true, name: true, slug: true } } } },
      },
    });

    res.json({
      templates,
      total: templates.length,
    });
  }),
);

// ─── POST /templates/:id/use — Create route from template ──

router.post(
  "/:id/use",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const templateId = req.params.id;

    const template = await prisma.routeTemplate.findUnique({
      where: { id: templateId },
      include: { stops: { orderBy: { sequence: "asc" } } },
    });
    if (!template) throw AppError.notFound("Template not found");

    const route = await prisma.route.create({
      data: {
        userId,
        platformLinkId: template.platformLinkId,
        name: template.name,
        date: new Date(),
        notes: template.notes,
        totalStops: template.stops.length,
        stops: {
          create: template.stops.map((stop) => ({
            address: stop.address,
            city: stop.city,
            state: stop.state,
            zipCode: stop.zipCode,
            sequence: stop.sequence,
            facilityName: stop.facilityName,
            facilityType: stop.facilityType,
            contactName: stop.contactName,
            contactPhone: stop.contactPhone,
            deliveryWindow: stop.deliveryWindow,
          })),
        },
      },
      include: {
        stops: { orderBy: { sequence: "asc" } },
        platformLink: { include: { platform: { select: { id: true, name: true, slug: true } } } },
      },
    });

    res.status(201).json({ route });
  }),
);

// ─── DELETE /templates/:id — Creator can delete ─────────────

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const templateId = req.params.id;

    const template = await prisma.routeTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw AppError.notFound("Template not found");
    if (template.createdBy !== userId) {
      throw new AppError(403, "Only the creator can delete a template");
    }

    await prisma.routeTemplate.delete({ where: { id: templateId } });
    res.json({ message: "Template deleted" });
  }),
);

export default router;
```

**Step 2: Register the route in index.ts**

In `apps/api/src/index.ts`, add import and registration alongside existing routes:

```typescript
import templateRoutes from "./routes/templates.js";
// ...
app.use("/api/templates", apiLimiter, templateRoutes);
```

**Step 3: Verify build**

Run: `cd apps/api && npm run build`
Expected: Clean build

**Step 4: Commit**

```bash
git add apps/api/src/routes/templates.ts apps/api/src/index.ts
git commit -m "feat: add template CRUD endpoints (save, list, use, delete)"
```

---

### Task 3: Mobile — Types and API client

**Files:**

- Modify: `apps/mobile/src/types/index.ts`
- Modify: `apps/mobile/src/services/api.ts`

**Step 1: Add template types**

In `apps/mobile/src/types/index.ts`, add after the Route types:

```typescript
export interface TemplateStop {
  id: string;
  templateId: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  sequence: number;
  facilityName?: string;
  facilityType?: string;
  contactName?: string;
  contactPhone?: string;
  deliveryWindow?: string;
}

export interface RouteTemplate {
  id: string;
  name: string;
  platformLinkId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  creator: { id: string; firstName: string; lastName: string };
  platformLink?: { platform: { id: string; name: string; slug: string } };
  stops: TemplateStop[];
}
```

**Step 2: Add API methods**

In `apps/mobile/src/services/api.ts`, add template methods:

```typescript
  // ─── Templates ────────────────────────────────────────────

  async getTemplates(): Promise<{ templates: RouteTemplate[]; total: number }> {
    return this.request("/templates");
  }

  async saveAsTemplate(routeId: string, name: string): Promise<{ template: RouteTemplate }> {
    return this.request("/templates", {
      method: "POST",
      body: JSON.stringify({ routeId, name }),
    });
  }

  async useTemplate(templateId: string): Promise<{ route: Route }> {
    return this.request(`/templates/${templateId}/use`, { method: "POST" });
  }

  async deleteTemplate(templateId: string): Promise<{ message: string }> {
    return this.request(`/templates/${templateId}`, { method: "DELETE" });
  }
```

Don't forget to add `RouteTemplate` to the imports in api.ts from types.

**Step 3: Commit**

```bash
git add apps/mobile/src/types/index.ts apps/mobile/src/services/api.ts
git commit -m "feat: add template types and API client methods"
```

---

### Task 4: Mobile — Template picker in RoutesScreen

**Files:**

- Modify: `apps/mobile/src/screens/RoutesScreen.tsx`

**Step 1: Add template state and fetch**

In RoutesScreen, add state for templates alongside existing route state:

```typescript
const [templates, setTemplates] = useState<RouteTemplate[]>([]);
const [loadingTemplates, setLoadingTemplates] = useState(false);
const [showTemplatePicker, setShowTemplatePicker] = useState(false);
const [usingTemplate, setUsingTemplate] = useState<string | null>(null);
```

Add fetch function:

```typescript
const fetchTemplates = async () => {
  setLoadingTemplates(true);
  try {
    const data = await api.getTemplates();
    setTemplates(data.templates);
  } catch {
    // non-fatal
  } finally {
    setLoadingTemplates(false);
  }
};
```

Call `fetchTemplates()` in the existing `useEffect` alongside route fetching.

**Step 2: Add "Start from Template" button**

Above the filter tabs and route list, add:

```tsx
<TouchableOpacity
  style={styles.templateBtn}
  onPress={() => {
    fetchTemplates();
    setShowTemplatePicker(true);
  }}
  activeOpacity={0.7}
>
  <Text style={styles.templateBtnText}>Start from Template</Text>
</TouchableOpacity>
```

**Step 3: Add template picker overlay**

When `showTemplatePicker` is true, render a full-screen overlay with template cards:

```tsx
{
  showTemplatePicker && (
    <View style={styles.templateOverlay}>
      <View style={styles.templateHeader}>
        <Text style={styles.templateTitle}>Choose a Template</Text>
        <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
          <Text style={styles.templateClose}>Close</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.templateList}>
        {templates.length === 0 ? (
          <View style={styles.templateEmpty}>
            <Text style={styles.templateEmptyTitle}>No templates yet</Text>
            <Text style={styles.templateEmptyBody}>
              Complete a route, then save it as a template for quick reuse
            </Text>
          </View>
        ) : (
          templates.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.templateCard}
              onPress={() => handleUseTemplate(t.id)}
              disabled={usingTemplate === t.id}
              activeOpacity={0.7}
            >
              <Text style={styles.templateCardName}>{t.name}</Text>
              <View style={styles.templateCardMeta}>
                {t.platformLink && (
                  <Text style={styles.templateCardPlatform}>{t.platformLink.platform.name}</Text>
                )}
                <Text style={styles.templateCardStops}>
                  {t.stops.length} stop{t.stops.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={styles.templateCardCreator}>
                By {t.creator.firstName} {t.creator.lastName}
              </Text>
              {usingTemplate === t.id && (
                <Text style={styles.templateCardLoading}>Creating route...</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
```

**Step 4: Add handleUseTemplate function**

```typescript
const handleUseTemplate = async (templateId: string) => {
  setUsingTemplate(templateId);
  try {
    const data = await api.useTemplate(templateId);
    setShowTemplatePicker(false);
    onViewRoute(data.route);
    fetchRoutes(); // refresh route list
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create route from template";
    if (isWeb) window.alert(msg);
    else Alert.alert("Error", msg);
  } finally {
    setUsingTemplate(null);
  }
};
```

**Step 5: Add styles**

```typescript
templateBtn: {
  marginHorizontal: 20,
  marginBottom: 12,
  backgroundColor: "#1E3A5F",
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#2563EB",
},
templateBtnText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#93C5FD",
},
templateOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "#0F172A",
  zIndex: 10,
},
templateHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingTop: 56,
  paddingBottom: 16,
},
templateTitle: {
  fontSize: 24,
  fontWeight: "700",
  color: "#F8FAFC",
},
templateClose: {
  fontSize: 15,
  fontWeight: "600",
  color: "#3B82F6",
},
templateList: {
  flex: 1,
  paddingHorizontal: 20,
},
templateEmpty: {
  padding: 36,
  alignItems: "center",
},
templateEmptyTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#94A3B8",
  marginBottom: 8,
},
templateEmptyBody: {
  fontSize: 14,
  color: "#64748B",
  textAlign: "center",
},
templateCard: {
  backgroundColor: "#1E293B",
  borderRadius: 14,
  padding: 18,
  marginBottom: 12,
},
templateCardName: {
  fontSize: 17,
  fontWeight: "700",
  color: "#F8FAFC",
  marginBottom: 8,
},
templateCardMeta: {
  flexDirection: "row",
  gap: 12,
  marginBottom: 6,
},
templateCardPlatform: {
  fontSize: 13,
  fontWeight: "600",
  color: "#93C5FD",
},
templateCardStops: {
  fontSize: 13,
  color: "#94A3B8",
},
templateCardCreator: {
  fontSize: 12,
  color: "#64748B",
},
templateCardLoading: {
  fontSize: 13,
  color: "#34D399",
  marginTop: 6,
},
```

**Step 6: Verify the app renders**

Open http://localhost:8081, navigate to Routes tab, confirm the "Start from Template" button appears.

**Step 7: Commit**

```bash
git add apps/mobile/src/screens/RoutesScreen.tsx
git commit -m "feat: add template picker UI to Routes screen"
```

---

### Task 5: Mobile — "Save as Template" on route detail

**Files:**

- Modify: `apps/mobile/src/screens/ActiveRouteScreen.tsx`

**Step 1: Add save template state**

```typescript
const [showSaveTemplate, setShowSaveTemplate] = useState(false);
const [templateName, setTemplateName] = useState("");
const [savingTemplate, setSavingTemplate] = useState(false);
```

**Step 2: Add save handler**

```typescript
const handleSaveTemplate = async () => {
  if (!templateName.trim()) {
    if (isWeb) window.alert("Please enter a template name");
    else Alert.alert("Error", "Please enter a template name");
    return;
  }
  setSavingTemplate(true);
  try {
    await api.saveAsTemplate(routeId, templateName.trim());
    setShowSaveTemplate(false);
    setTemplateName("");
    if (isWeb) window.alert("Template saved!");
    else Alert.alert("Success", "Template saved! It's now available for all drivers.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save template";
    if (isWeb) window.alert(msg);
    else Alert.alert("Error", msg);
  } finally {
    setSavingTemplate(false);
  }
};
```

**Step 3: Add "Save as Template" button in the route detail UI**

Add a button in the action area of ActiveRouteScreen (near the status controls):

```tsx
<TouchableOpacity
  style={styles.saveTemplateBtn}
  onPress={() => {
    setTemplateName(route?.name || "");
    setShowSaveTemplate(true);
  }}
  activeOpacity={0.7}
>
  <Text style={styles.saveTemplateBtnText}>Save as Template</Text>
</TouchableOpacity>
```

**Step 4: Add inline save form**

When `showSaveTemplate` is true, show a name input + save/cancel buttons:

```tsx
{
  showSaveTemplate && (
    <View style={styles.saveTemplateForm}>
      <Text style={styles.saveTemplateLabel}>Template Name</Text>
      <TextInput
        style={styles.saveTemplateInput}
        value={templateName}
        onChangeText={setTemplateName}
        placeholder="e.g. Monday McKesson Run"
        placeholderTextColor="#64748B"
      />
      <View style={styles.saveTemplateActions}>
        <TouchableOpacity
          style={styles.saveTemplateCancelBtn}
          onPress={() => setShowSaveTemplate(false)}
        >
          <Text style={styles.saveTemplateCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveTemplateConfirmBtn, savingTemplate && { opacity: 0.5 }]}
          onPress={handleSaveTemplate}
          disabled={savingTemplate}
        >
          <Text style={styles.saveTemplateConfirmText}>
            {savingTemplate ? "Saving..." : "Save Template"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**Step 5: Add styles**

```typescript
saveTemplateBtn: {
  backgroundColor: "#1E3A5F",
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#2563EB",
  marginTop: 10,
},
saveTemplateBtnText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#93C5FD",
},
saveTemplateForm: {
  backgroundColor: "#1E293B",
  borderRadius: 14,
  padding: 18,
  marginTop: 12,
},
saveTemplateLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#94A3B8",
  marginBottom: 8,
},
saveTemplateInput: {
  backgroundColor: "#0F172A",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#334155",
  marginBottom: 12,
},
saveTemplateActions: {
  flexDirection: "row",
  gap: 10,
},
saveTemplateCancelBtn: {
  flex: 1,
  backgroundColor: "#0F172A",
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: "center",
},
saveTemplateCancelText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#94A3B8",
},
saveTemplateConfirmBtn: {
  flex: 1,
  backgroundColor: "#2563EB",
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: "center",
},
saveTemplateConfirmText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#FFFFFF",
},
```

**Step 6: Commit**

```bash
git add apps/mobile/src/screens/ActiveRouteScreen.tsx
git commit -m "feat: add Save as Template action to route detail"
```

---

### Task 6: Build verification and manual test

**Step 1: Build backend**

Run: `cd apps/api && npm run build`
Expected: Clean build

**Step 2: Restart API**

Kill and restart: `cd apps/api && npm run dev`

**Step 3: Manual test flow**

1. Open http://localhost:8081
2. Register/login
3. Go to Routes tab — verify "Start from Template" button shows
4. Tap it — should show empty state ("No templates yet")
5. Create a new route, add a couple stops
6. Open route detail, tap "Save as Template"
7. Enter name, save
8. Go back to Routes, tap "Start from Template" — template should appear
9. Tap template — new route created with all stops pre-filled

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: route templates — save, share, and reuse delivery routes"
```
