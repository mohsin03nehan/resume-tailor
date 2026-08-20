const { test, expect } = require('@playwright/test')

test('completes the primary tailor flow', async ({ page }) => {
  test.setTimeout(45_000)

  const examplePrompt = "I'm a frontend developer applying for a React role"
  const input = page.getByPlaceholder('Paste job description and ask for a tailored cover letter...')

  await page.goto('/tailor')

  await expect(page.getByText("Start by describing the job you're applying for")).toBeVisible()
  await expect(page.getByRole('button', { name: examplePrompt })).toBeVisible()

  await page.getByRole('button', { name: examplePrompt }).click()
  await expect(input).toHaveValue(examplePrompt)

  const sendButton = page.getByRole('button', { name: 'Send' })
  await sendButton.click()
  await expect(sendButton).toBeDisabled({ timeout: 5_000 })
  await expect(sendButton).toBeEnabled({ timeout: 45_000 })
})
