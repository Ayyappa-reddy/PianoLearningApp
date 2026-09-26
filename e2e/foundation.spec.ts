import { expect, test } from "@playwright/test";

test("responsive foundation shell and safe database status are available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/login", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.goto("/status");
  await expect(page.getByRole("heading", { name: "Application foundation" })).toBeVisible();
  await expect(page.getByText(/(Connected|Not connected)/)).toBeVisible();
});
