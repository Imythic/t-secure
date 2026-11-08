import { test, expect } from '@playwright/test';
test('message checking explains risk and never turns suspicious input into a link',async ({page})=>{
  await page.goto('/#/messages');
  await page.getByLabel('Message or website address').fill('Send your verification code at https://bank.example@192.0.2.1/login');
  await page.getByRole('button',{name:'Check for warning signs',exact:true}).click();
  await expect(page.getByRole('heading',{name:'High-risk warning'})).toBeVisible();
  await expect(page.getByRole('link',{name:/192\.0\.2\.1/})).toHaveCount(0);
  await page.getByLabel('Message or website address').fill('<img src=x onerror=alert(1)> Hello there');
  await page.getByRole('button',{name:'Check for warning signs',exact:true}).click();
  await expect(page.locator('main img')).toHaveCount(0);
});
test('opt-in assessment is shared with T-Life and opt-out removes it',async ({page})=>{
  await page.goto('/#/settings');
  await page.getByLabel('Enable advanced AI analysis').check();
  await expect(page.getByText('Assessment ready.',{exact:true})).toBeVisible();
  await page.goto('/#/profile');
  await expect(page.getByTestId('vulnerability-score')).toHaveText('83');
  const timestamp=await page.getByTestId('assessment-time').textContent();
  await page.goto('/#/t-life');
  await expect(page.getByTestId('vulnerability-score')).toHaveText('83');
  await expect(page.getByTestId('assessment-time')).toHaveText(timestamp);
  await page.getByLabel('Enable advanced AI analysis').uncheck();
  await expect(page.getByTestId('vulnerability-score')).toHaveCount(0);
  await page.goto('/#/profile');
  await expect(page.getByTestId('vulnerability-score')).toHaveCount(0);
});
test('sample selection recalculates and insufficient evidence never displays zero',async ({page})=>{
  await page.goto('/#/settings');
  await page.getByLabel('Enable advanced AI analysis').check();
  await expect(page.getByText('Assessment ready.',{exact:true})).toBeVisible();
  await page.getByLabel('Sample conversation history').selectOption('limited');
  await expect(page.getByText('Assessment ready.',{exact:true})).toBeVisible();
  await page.goto('/#/profile');
  await expect(page.getByRole('heading',{name:'Insufficient information'})).toBeVisible();
  await expect(page.getByTestId('vulnerability-score')).toHaveCount(0);
});
test('trusted contact persists and is only dialed through an explicit action',async ({page})=>{
  await page.goto('/#/settings');
  await page.getByLabel('Contact name').fill('Jordan');
  await page.getByLabel('Relationship').fill('Family');
  await page.getByLabel('Phone number').fill('+1 202 555 0143');
  await page.getByRole('button',{name:'Save trusted contact'}).click();
  await page.reload();
  await expect(page.getByLabel('Contact name')).toHaveValue('Jordan');
  await page.goto('/#/home');
  await expect(page.getByRole('link',{name:'Call Jordan'})).toHaveAttribute('href','tel:+12025550143');
});
test('practice call can pause, resume, warn, and end',async ({page})=>{
  await page.goto('/#/calls');
  await page.getByLabel('Practice scenario').selectOption('support');
  await page.getByRole('button',{name:'Start practice call'}).click();
  await expect(page.getByText('We have detected a problem on your computer.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause call'}).click();
  await expect(page.getByText('Paused',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Resume call'}).click();
  await expect(page.getByRole('heading',{name:'High-risk warning'})).toBeVisible({timeout:16000});
  await page.getByRole('button',{name:'End demo call'}).click();
  await expect(page.getByText('Call ended',{exact:true})).toBeVisible();
});
test('navigation fits a narrow viewport and controls remain keyboard reachable',async ({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'A little pause. A safer next step.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
});
test('leaving a practice call ends it and returning allows a new practice',async({page})=>{
  await page.goto('/#/calls');
  await page.getByRole('button',{name:'Start practice call'}).click();
  const menu=page.getByRole('button',{name:'Menu',exact:true});
  if(await menu.isVisible())await menu.click();
  await page.getByRole('link',{name:'Safety guide',exact:true}).click();
  if(await menu.isVisible())await menu.click();
  await page.getByRole('link',{name:'Call protection',exact:true}).click();
  await expect(page.getByText('Call ended',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Practice again'})).toBeVisible();
});
test('small-screen menu exposes every destination with no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  await page.goto('/');
  const menu=page.getByRole('button',{name:'Menu',exact:true});
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('link',{name:'Recent activity',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'My profile',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your patterns. Your next steps.'})).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await menu.click();
  await page.getByRole('link',{name:'T-Life preview',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your T-Life profile preview.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('landscape phone keeps navigation in a compact menu',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('/');
  const menu=page.getByRole('button',{name:'Menu',exact:true});
  await expect(menu).toBeVisible();
  await menu.click();
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Protection, on your terms.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
