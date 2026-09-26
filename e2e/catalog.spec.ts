import { expect, test } from "@playwright/test";

test("Learn separates active learning from archived records", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/login", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Learn", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a Main Topic" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Archived learning" })).toBeVisible();
  await page.goto("/learn/archived");
  await expect(page.getByRole("heading", { name: "Archived learning" })).toBeVisible();
});

test("Create exposes focused flows and Main Topic quick form fields", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/login", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  await page.goto("/create");
  await expect(page.getByRole("link", { name: "Continue" })).toHaveCount(5);
  await page.goto("/create/main-topic");
  await expect(page.getByLabel("Category")).toBeVisible();
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.getByLabel("Description")).toBeVisible();
  await page.goto("/create/subtopic");
  await expect(page.getByLabel("Main Topic")).toBeVisible();
});

test("This Week, Practice, and Progress are reachable from the responsive shell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/login", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "This Week" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Create" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Learn" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Practice" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Progress" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "System status" })).toHaveCount(0);
  await page.goto("/this-week");
  await expect(page.getByRole("heading", { name: "This Week" })).toBeVisible();
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Log a practice session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice history" })).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
});