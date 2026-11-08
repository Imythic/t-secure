import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e/auth',workers:1,timeout:45000,
  use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5174',trace:'retain-on-failure',launchOptions:{channel:'chrome'}},
  webServer:{
    command:'node scripts/dev.mjs',url:'http://127.0.0.1:5174',reuseExistingServer:false,timeout:60000,
    env:{TSECURE_PORT:'5174',VITE_USE_FIREBASE_EMULATORS:'true',VITE_FIREBASE_API_KEY:'demo-test-key',VITE_FIREBASE_AUTH_DOMAIN:'demo-tsecure.firebaseapp.com',VITE_FIREBASE_PROJECT_ID:'demo-tsecure',VITE_FIREBASE_APP_ID:'demo-app',FIREBASE_PROJECT_ID:'demo-tsecure',OPENROUTER_API_KEY:'',FIREBASE_SERVICE_ACCOUNT_JSON:''},
  },
});
