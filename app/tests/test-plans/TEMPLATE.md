# Test Plan Template

## Test: [Test Name]

### Purpose
Brief description of what this test validates.

### Prerequisites
- User authentication state (logged in/out)
- Required data setup (monitors, events, profiles)
- Any specific server configuration needed

### Test Steps

#### Step 1: [Action Description]
**Action:** What the user does
**Expected Result:** What should happen

**Implementation Details:**
- Selector: `data-testid="element-name"` or role/text
- Assertion: What to verify
- Screenshot: Yes/No

**Example Code:**
```typescript
await test.step('Step 1 description', async () => {
  await page.getByTestId('element-name').click();
  await expect(page.getByText('Expected text')).toBeVisible();
});
```

#### Step 2: [Action Description]
**Action:**
**Expected Result:**

**Implementation Details:**
- Selector:
- Assertion:
- Screenshot:

#### Step 3: [Action Description]
**Action:**
**Expected Result:**

**Implementation Details:**
- Selector:
- Assertion:
- Screenshot:

### Expected Final State
What the application state should be after test completion.

### Error Scenarios to Test
- What happens if [error condition]
- What happens if [timeout/network error]

### Notes
- Any special considerations
- Known issues or limitations
- Performance expectations

---

## Related Tests
- Link to related test plans
- Dependencies on other tests
