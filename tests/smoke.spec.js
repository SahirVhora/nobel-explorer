const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Nobel Prize Explorer' })).toBeVisible();
  page._runtimeErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page._runtimeErrors).toEqual([]);
});

test('search and category filters update laureate cards', async ({ page }) => {
  await page.getByRole('menuitem', { name: 'Explorer' }).click();
  await page.getByRole('searchbox', { name: 'Search laureates' }).fill('Einstein');
  await expect(page.locator('.card-nm')).toContainText(['Albert Einstein']);
  await expect(page.locator('#resultsInfo')).toContainText('of 4 laureates');

  await page.getByRole('searchbox', { name: 'Search laureates' }).fill('');
  await page.getByLabel('Filter by category').selectOption('peace');
  const visibleCategories = await page.locator('#explorer .cat-badge:visible').allTextContents();
  expect(visibleCategories.length).toBeGreaterThan(0);
  expect(visibleCategories.every(value => value.trim().startsWith('Peace'))).toBe(true);
});

test('quiz renders, accepts an answer, and advances', async ({ page }) => {
  await page.getByRole('menuitem', { name: 'Quiz' }).click();
  await expect(page.locator('.q-text')).toBeVisible();
  await expect(page.locator('.q-opt')).toHaveCount(4);

  await page.locator('.q-opt').first().click();
  await expect(page.locator('.q-explain')).toBeVisible();
  await expect(page.getByRole('button', { name: /Next Question|See Results/ })).toBeVisible();
  await page.getByRole('button', { name: /Next Question|See Results/ }).click();
  await expect(page.locator('.q-num')).toContainText('Question 2 of 5');
});
