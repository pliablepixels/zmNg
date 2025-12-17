# Test Plan: Monitor Management

## Test: View and Interact with Monitors

### Purpose
Verify that users can view the monitor list, see live previews, download snapshots, and view monitor properties.

### Prerequisites
- User is logged into zmNg
- At least 2 monitors configured in ZoneMinder:
  - Monitor 1: "Front Door" (ID: 1)
  - Monitor 2: "Backyard" (ID: 2)
- Monitors are in "Running" state
- User has permissions to view monitors

### Test Steps

#### Step 1: Navigate to Monitors Page
**Action:** Click on "Monitors" in the sidebar navigation
**Expected Result:**
- URL changes to `/monitors`
- Page title displays "Monitors"
- Monitor grid becomes visible

**Implementation Details:**
- Selector: `getByRole('link', { name: 'Monitors' })`
- Assertion: `expect(page).toHaveURL(/.*monitors/)`
- Screenshot: Yes

**Example Code:**
```typescript
await test.step('Navigate to Monitors page', async () => {
  await page.getByRole('link', { name: 'Monitors' }).click();
  await expect(page).toHaveURL(/.*monitors/);
  await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
});
```

#### Step 2: Verify Monitor List Loads
**Action:** Wait for monitor cards to appear
**Expected Result:**
- At least 2 monitor cards are displayed
- Each card shows monitor name
- Each card shows online status indicator
- Live preview is loading/visible

**Implementation Details:**
- Selector: `getByTestId('monitor-card')`
- Count assertion: `expect(monitorCards).toHaveCount(2)`
- Visibility assertions for each required element

**Example Code:**
```typescript
await test.step('Verify monitor list loads', async () => {
  const monitorCards = page.getByTestId('monitor-card');
  await expect(monitorCards).toHaveCount(2, { timeout: 10000 });

  // Verify "Front Door" monitor
  const frontDoor = page.getByTestId('monitor-card').filter({ hasText: 'Front Door' });
  await expect(frontDoor).toBeVisible();
  await expect(frontDoor.getByTestId('monitor-status')).toBeVisible();
});
```

#### Step 3: Click on Monitor to View Live Feed
**Action:** Click on "Front Door" monitor card
**Expected Result:**
- Navigate to monitor detail page
- URL contains `/monitors/1`
- Live stream player loads
- Control buttons are visible (snapshot, fullscreen, etc.)

**Implementation Details:**
- Selector: Click on monitor card
- Wait for navigation
- Verify player element exists

**Example Code:**
```typescript
await test.step('Click on monitor to view live feed', async () => {
  await page.getByText('Front Door').click();
  await expect(page).toHaveURL(/.*monitors\/\d+/);
  await expect(page.getByTestId('monitor-player')).toBeVisible({ timeout: 15000 });
});
```

#### Step 4: Download Monitor Snapshot
**Action:** Click the "Download Snapshot" button
**Expected Result:**
- Download is triggered
- File is saved with name matching pattern: `Front_Door_YYYY-MM-DD_HH-MM-SS.jpg`
- Success toast notification appears

**Implementation Details:**
- Wait for download event
- Verify filename pattern
- Check toast message

**Example Code:**
```typescript
await test.step('Download monitor snapshot', async () => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Snapshot' }).click();

  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/Front_Door.*\.jpg/);

  await expect(page.getByText('Snapshot downloaded')).toBeVisible();
});
```

#### Step 5: View Monitor Properties
**Action:** Click on "Settings" or properties icon
**Expected Result:**
- Properties dialog opens
- Monitor ID is displayed
- Resolution is shown (e.g., "1920x1080")
- Streaming URL contains "/cgi-bin/nph-zms"
- Function status is shown (e.g., "Modect", "Monitor")

**Implementation Details:**
- Click properties button
- Wait for dialog
- Verify all fields present

**Example Code:**
```typescript
await test.step('View monitor properties', async () => {
  await page.getByRole('button', { name: 'Settings' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await expect(dialog.getByText(/Monitor ID:/)).toBeVisible();
  await expect(dialog.getByText(/Resolution:/)).toBeVisible();
  await expect(dialog.getByText(/1920x1080/)).toBeVisible();

  // Close dialog
  await page.getByRole('button', { name: 'Close' }).click();
});
```

#### Step 6: Return to Monitor List
**Action:** Click back button or navigate via breadcrumb
**Expected Result:**
- Return to `/monitors` page
- Monitor grid is still visible
- Previous state is preserved (scroll position, etc.)

**Implementation Details:**
- Click back navigation
- Verify URL
- Verify grid visibility

### Expected Final State
- User is on monitors list page
- All monitors are displayed
- No errors in console
- Download file exists in downloads folder

### Error Scenarios to Test
- What happens if monitor stream fails to load (network error)
- What happens if snapshot download fails
- What happens if monitor is offline/stopped
- What happens if user has no monitors configured

### Notes
- Live streams may take 5-10 seconds to load initially
- Snapshot quality depends on camera resolution
- Some monitors may not support PTZ controls
- Properties dialog content varies by monitor type

---

## Related Tests
- `event-browsing.md` - Events from specific monitors
- `montage-view.md` - Multiple monitor display
- `ptz-controls.md` - PTZ camera controls
