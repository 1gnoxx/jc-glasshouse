# 📋 Pending Manual Steps After Deploy

## 1. ⚠️ Update UptimeRobot URL (Important!)

Change the UptimeRobot monitor URL from:
```
https://jc-glasshouse-api.onrender.com/
```
to:
```
https://jc-glasshouse-api.onrender.com/health
```

This keeps **both Flask AND database connections alive**!

---

## 2. Optional: Enable Neon Connection Pooler

1. Go to **Render Dashboard** → Your backend service
2. Click **Environment** tab
3. Find `DATABASE_URL`
4. Add `?pgbouncer=true` at the end
5. Save (auto-redeploys)

---

## Already Fixed in Code ✅

- SSL connection timeout (pool_pre_ping + pool_recycle)
- /health endpoint with DB ping
- Dark mode UI issues
- Rounded containers
