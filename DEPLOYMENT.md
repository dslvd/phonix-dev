# 🚀 Deployment Guide for Linggo

This guide walks you through deploying your Linggo app to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works great)
- Google Gemini API key (FREE)
- Google OAuth Client ID (optional)

---

## Step 1: Get Your API Keys

### Google Gemini API Key (Required for AI Features - FREE)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Get API Key** or **Create API Key**
4. Copy and save it securely (you'll need this for Vercel)

**Note**: Gemini 1.5 Flash is completely FREE with generous limits (1500 requests/day)!

### Google OAuth Client ID (Optional - for Google Sign-In)

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
6. Choose **Web application**
7. Add **Authorized JavaScript origins:**
   - For local dev: `http://localhost:3000`
   - For production: `https://your-app.vercel.app` (add after deployment)
8. Click **Create** and copy the **Client ID**

---

## Step 2: Push Your Code to GitHub

1. **Initialize Git (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Linggo app ready for deployment"
   ```

2. **Create a new repository on GitHub:**
   - Go to [github.com/new](https://github.com/new)
   - Name it (e.g., "linggo-app")
   - Don't initialize with README (your code already has one)
   - Click **Create repository**

3. **Push your code:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

---

## Step 3: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com) and sign in**
   - Use your GitHub account for easy integration

2. **Import your project:**
   - Click **New Project**
   - Select **Import Git Repository**
   - Choose your GitHub repository

3. **Configure the project:**
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (should auto-detect)
   - **Output Directory:** `dist` (should auto-detect)

4. **Add Environment Variables:**
   
   Click **Environment Variables** and add:
   
   | Name | Value |
   |------|-------|
   | `VITE_GEMINI_API_KEY` | Your FREE Google Gemini API key |
   | `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
   
   Make sure to select **All** environments (Production, Preview, Development)

5. **Deploy:**
   - Click **Deploy**
   - Wait 1-2 minutes for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

---

## Step 4: Configure Google OAuth (If Using)

1. **Get your Vercel deployment URL:**
   - After deployment, copy your Vercel URL (e.g., `https://linggo-app.vercel.app`)

2. **Update Google OAuth settings:**
   - Go back to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services → Credentials**
   - Click on your OAuth 2.0 Client ID
   - Under **Authorized JavaScript origins**, add:
     ```
     https://your-app.vercel.app
     ```
   - Click **Save**

3. **Test Google Sign-In:**
   - Visit your deployed app
   - Try signing in with Google
   - It should now work!

---

## Step 5: Custom Domain (Optional)

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Add your custom domain (e.g., `linggo-app.com`)
   - Follow Vercel's instructions to update your DNS

2. **Update Google OAuth:**
   - Add your custom domain to authorized JavaScript origins
   - Example: `https://linggo-app.com`

---

## 🔄 Continuous Deployment

Once set up, Vercel automatically:
- **Deploys on push to main:** Every commit to your main branch triggers a production deployment
- **Creates preview deploys:** Pull requests get their own preview URL
- **Keeps environment variables:** They persist across deployments

### To update your app:
```bash
git add .
git commit -m "Update feature X"
git push
```

Vercel will automatically build and deploy your changes in ~2 minutes.

---

## 🐛 Troubleshooting

### Build Fails

**Check build logs in Vercel:**
- Go to your project → Deployments → Click on failed deployment
- Review the build logs for errors

**Common issues:**
- Missing dependencies: Make sure all packages are in `package.json`
- TypeScript errors: Run `npm run type-check` locally first
- Environment variables not set: Verify in Vercel settings

### Google Sign-In Not Working

**Check:**
1. ✅ `VITE_GOOGLE_CLIENT_ID` is set in Vercel environment variables
2. ✅ Your Vercel domain is added to authorized JavaScript origins in Google Cloud Console
3. ✅ You clicked "Save" in Google Cloud Console after adding the domain
4. ✅ Hard refresh your deployed site (Ctrl+Shift+R or Cmd+Shift+R)

### AI Features Not Working

**Check:**
1. ✅ `VITE_GEMINI_API_KEY` is set in Vercel environment variables
2. ✅ Your Gemini API key is valid (test it at [aistudio.google.com](https://aistudio.google.com))
3. ✅ Check browser console for specific error messages
4. ✅ Ensure you haven't exceeded the free tier limits (1500 requests/day)

### Seeing Old Version After Deploy

**Try:**
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Try incognito/private mode
4. Check deployment status in Vercel dashboard

---

## 📊 Monitoring

### View Deployment Logs
- Go to Vercel Dashboard → Your Project → Deployments
- Click on any deployment to see build and runtime logs

### View Analytics
- Vercel provides free analytics
- Go to your project → Analytics
- See visitor stats, performance metrics, etc.

---

## 💰 Cost Considerations

### Vercel
- **Free tier includes:**
  - Unlimited deployments
  - 100 GB bandwidth/month
  - Automatic SSL
  - Custom domains
- Sufficient for most personal projects

### Google Gemini API
- **Completely FREE for Gemini 1.5 Flash**
- 1500 requests per day free tier
- 1 million tokens per minute
- Perfect for learning apps and personal projects
- Check [ai.google.dev/pricing](https://ai.google.dev/pricing) for details

### Google OAuth
- Free for most use cases
- No cost for authentication

---

## 🎉 You're Done!

Your Linggo app is now live and accessible to anyone with the URL. Share it with friends, students, or anyone learning Filipino languages!

**Next steps:**
- Share your app URL
- Monitor usage and feedback
- Continue developing new features
- Set up custom domain (optional)

Need help? Check the main README.md or create an issue on GitHub.
