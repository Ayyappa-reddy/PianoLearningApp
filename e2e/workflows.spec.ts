import { expect, test } from "@playwright/test";

test("planning, practice, repertoire, review, progress, and export routes are usable on mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/login", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  for (const [path, heading] of [
    ["/planning", "Weekly planning"], ["/practice", "Practice records"], ["/songs", "Songs and repertoire"],
    ["/reviews", "Reviews / exams / practice periods"], ["/progress", "Progress"], ["/export", "Export your data"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  }
});
