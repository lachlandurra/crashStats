import { expect, test } from '@playwright/test';

const SUMMARY_TOTAL_TEST_ID = 'summary-total-crashes';

test('loads crash summary after injecting sample polygon', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('load-sample-polygon').click();
  const totalLocator = page.getByTestId(SUMMARY_TOTAL_TEST_ID);
  await expect(totalLocator).toHaveText('2');
  await expect(page.getByText('By severity')).toBeVisible();
  await expect(page.getByText('By crash type')).toBeVisible();
});
