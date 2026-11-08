import {test,expect} from '@playwright/test';

test('API handles plain-text platform crashes and malformed responses without exposing JSON parser errors',async({page})=>{
  await page.goto('/');
  const scenarios=[
    {status:500,type:'text/plain',body:'A server error has occurred\nFUNCTION_INVOCATION_FAILED',expectedStatus:500},
    {status:502,type:'text/html',body:'<!doctype html><h1>Bad gateway</h1>',expectedStatus:502},
    {status:200,type:'application/json',body:'{"consent":',expectedStatus:502},
    {status:200,type:'text/html',body:'<html>Vite fallback page</html>',expectedStatus:502},
    {status:200,type:'application/json',body:'null',expectedStatus:502},
  ];
  for(const scenario of scenarios){
    await page.route('**/api/profile',route=>route.fulfill({status:scenario.status,contentType:scenario.type,body:scenario.body}));
    const error=await page.evaluate(async()=>{
      const {Client}=await import('/src/client.js');
      const client=new Client();
      client.auth={currentUser:{emailVerified:true,getIdToken:async()=>'synthetic-test-token'}};
      try{await client.api('/api/profile');return null;}catch(error){return {message:error.message,status:error.status};}
    });
    expect(error?.message).toMatch(/server.*(?:unavailable|unexpected response)/i);
    expect(error?.message).not.toMatch(/Unexpected token|FUNCTION_INVOCATION_FAILED|Bad gateway|Vite fallback/);
    expect(error?.status).toBe(scenario.expectedStatus);
    await page.unroute('**/api/profile');
  }
});

test('API retains reviewed JSON errors and accepts a normal profile response',async({page})=>{
  await page.goto('/');
  await page.route('**/api/profile',route=>route.fulfill({status:403,json:{error:'Please verify your email to continue.'}}));
  const error=await page.evaluate(async()=>{
    const {Client}=await import('/src/client.js');const client=new Client();
    client.auth={currentUser:{emailVerified:true,getIdToken:async()=>'synthetic-test-token'}};
    try{await client.api('/api/profile');}catch(error){return {message:error.message,status:error.status};}
  });
  expect(error).toEqual({message:'Please verify your email to continue.',status:403});
  await page.unroute('**/api/profile');
  await page.route('**/api/profile',route=>route.fulfill({status:200,json:{consent:{enabled:false,revision:1},assessment:null}}));
  const result=await page.evaluate(async()=>{
    const {Client}=await import('/src/client.js');const client=new Client();
    client.auth={currentUser:{emailVerified:true,getIdToken:async()=>'synthetic-test-token'}};
    return client.api('/api/profile');
  });
  expect(result).toEqual({consent:{enabled:false,revision:1},assessment:null});
});
