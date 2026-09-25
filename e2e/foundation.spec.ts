import { expect, test } from "@playwright/test";

test("responsive foundation shell and safe database status are available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "A foundation for your progress" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Check system status" }).click();
  await expect(page.getByRole("heading", { name: "Application foundation" })).toBeVisible();
  await expect(page.getByText(/(Connected|Not connected)/)).toBeVisible();
});
