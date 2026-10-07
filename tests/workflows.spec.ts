import { test, expect } from "@playwright/test";

test("create, edit, reload, and guide progress survives beginner practice", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "On your hook" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: /Blank canvas/ }).click();
  await page.getByLabel("Project name (optional)").fill("Keyboard flower");
  await page.getByRole("button", { name: "Open my canvas" }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Keyboard flower",
  );
  const chart = page.getByRole("application");
  await chart.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Open Keyboard flower", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start crocheting", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.getByRole("button", { name: "Complete & next" }).click();
  await expect(page.getByText(/1 \/ \d+ pattern steps complete/)).toBeVisible();
  await page.getByText("Beginner Mode", { exact: true }).click();
  await expect(page.getByText(/1 \/ \d+ pattern steps complete/)).toBeVisible();
  await page.getByRole("button", { name: "Show me sc", exact: true }).click();
  await page.getByRole("button", { name: "Next demonstration action" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByText(/1 \/ \d+ pattern steps complete/)).toBeVisible();
  await page
    .getByRole("button", { name: "Undo completion", exact: true })
    .click();
  await expect(page.getByText(/0 \/ \d+ pattern steps complete/)).toBeVisible();
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Open Keyboard flower", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume crochet", exact: true })
    .click();
  await expect(page.getByText(/0 \/ \d+ pattern steps complete/)).toBeVisible();
});
test("required beanie adaptation and impossible reduction", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open 40 → 60 · crown study", exact: true })
    .click();
  await page.getByRole("button", { name: "Adapt", exact: true }).click();
  await expect(page.locator(".adapt-stats strong").first()).toBeVisible();
  await page.getByRole("button", { name: "Apply adaptation" }).click();
  await page
    .getByRole("button", { name: "Pattern & source", exact: true })
    .click();
  await expect(
    page
      .locator(".written-row")
      .filter({ hasText: "HDC BLO · 8 Black, 8 Red, 44 Black" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".written-row")
      .filter({ hasText: "HDC BLO · 42 Black, 9 Red, 9 Black" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByRole("button", { name: "Adapt", exact: true }).click();
  await page.getByLabel("Target stitches", { exact: true }).fill("12");
  await expect(
    page.getByRole("button", { name: "Apply adaptation" }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Requested fabric cannot contain protected motif/),
  ).toBeVisible();
});
test("written import is reviewed, source is retained, unsupported construction stays disabled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Make a pattern fit" }).click();
  await page.getByRole("button", { name: "Use labelled example rows" }).click();
  await page.getByRole("button", { name: "Review interpretation" }).click();
  await expect(page.getByText("40 stitches × 2 rows")).toBeVisible();
  await page.getByRole("button", { name: "Save & review in studio" }).click();
  await page
    .getByRole("button", { name: "Pattern & source", exact: true })
    .click();
  await expect(
    page
      .locator(".written-row")
      .filter({ hasText: "HDC BLO · 8 Black, 8 Red, 24 Black" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page.getByRole("button", { name: "Make a pattern fit" }).click();
  await page
    .getByLabel("Structured rows")
    .fill("Work in rounds. Increase every stitch.");
  await page.getByRole("button", { name: "Review interpretation" }).click();
  await page.getByRole("button", { name: "Save & review in studio" }).click();
  await page.getByRole("button", { name: "Adapt", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply adaptation" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Automatic resizing supports flat rectangular panels only."),
  ).toBeVisible();
});
test("appearance, keyboard controls, and responsive layout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Studio settings", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}-dark.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Open Little bloom wall hanging",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const chart = page.getByRole("application");
  await chart.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Motifs", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Name & protect selection" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/editor-${test.info().project.name}-dark.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("image conversion and project backup round trip", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "From image to artwork" }).click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    const x = c.getContext("2d")!;
    x.fillStyle = "#e8dfcf";
    x.fillRect(0, 0, 8, 8);
    x.fillStyle = "#bb4444";
    x.fillRect(2, 2, 4, 4);
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Image file").setInputFiles({
    name: "art.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await page.getByLabel("Stitches", { exact: true }).fill("8");
  await page.getByLabel("Rows", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Review interpretation" }).click();
  await expect(
    page.getByText("8 stitches × 8 rows", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save & review in studio" }).click();
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Preserved original image" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const d = await download;
  const path = await d.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page.getByRole("button", { name: "Restore a project backup" }).click();
  await page.getByLabel("Project backup file").setInputFiles(path!);
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Image study (imported)",
  );
  await expect(
    page.getByText("8 stitches × 8 rows · Add a swatch for measurements", {
      exact: true,
    }),
  ).toBeVisible();
});
test("caption upload preserves timestamps and rejects invalid YouTube links", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bring a tutorial along" }).click();
  await page
    .getByLabel("YouTube link")
    .fill("https://notyoutube.test/watch?v=abcdefghijk");
  await page.getByLabel("Transcript or timed captions").fill("Row 1: 4 Red");
  await page.getByRole("button", { name: "Review interpretation" }).click();
  await expect(
    page.getByText("Enter a valid YouTube video link."),
  ).toBeVisible();
  await page.getByLabel("YouTube link").fill("https://youtu.be/abcdefghijk");
  await page.getByLabel("Caption file").setInputFiles({
    name: "demo.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from(
      "WEBVTT\n\n00:12.500 --> 00:15.000\nRow 1 [left-to-right]: 4 Red\n",
    ),
  });
  await page
    .getByText("Confirmed: turning chain does not count", { exact: true })
    .click();
  await page.getByRole("button", { name: "Review interpretation" }).click();
  await expect(
    page.getByText("4 stitches × 1 rows", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save & review in studio" }).click();
  await page
    .getByRole("button", { name: "Pattern & source", exact: true })
    .click();
  await expect(
    page.locator(".written-row").filter({ hasText: "12.5s" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Foundation/ })).toHaveValue(
    "",
  );
});
test("active sessions retain frozen revisions after design changes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open 40 → 60 · crown study", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start crocheting", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.getByRole("button", { name: "Complete & next" }).click();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByRole("application").focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Crochet guide", exact: true })
    .click();
  await expect(page.getByText(/guide uses frozen revision 1/)).toBeVisible();
  await expect(page.getByText(/1 \/ \d+ pattern steps complete/)).toBeVisible();
  await page.getByText("Beginner Mode", { exact: true }).click();
  await expect(page.getByRole("img", { name: /back loop only/ })).toBeVisible();
  await page.screenshot({
    path: `test-results/guide-${test.info().project.name}-light.png`,
    fullPage: true,
  });
});
