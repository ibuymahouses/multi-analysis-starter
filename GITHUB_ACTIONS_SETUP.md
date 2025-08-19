# GitHub Actions Auto-Deploy Setup

This guide will help you set up automatic deployment from GitHub to your EC2 instance.

## 🚀 What This Does

- **Automatic Deployment**: Every time you push to `main` or `master` branch, your EC2 instance will automatically update
- **Health Checks**: Verifies that both frontend and API are responding after deployment
- **Manual Trigger**: You can also manually trigger deployments from the GitHub Actions tab

## 📋 Prerequisites

1. Your code is pushed to a GitHub repository
2. Your EC2 instance is running and accessible
3. You have SSH access to your EC2 instance

## 🔧 Setup Steps

### Step 1: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Secrets and variables** → **Actions**
4. Click **New repository secret** and add the following secrets:

#### Required Secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `EC2_HOST` | Your EC2 instance public IP or domain | `54.123.45.67` |
| `EC2_USERNAME` | SSH username for EC2 | `ec2-user` |
| `EC2_SSH_KEY` | Your private SSH key content | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `EC2_PORT` | SSH port (usually 22) | `22` |

### Step 2: Get Your SSH Key Content

1. **On Windows (PowerShell):**
   ```powershell
   Get-Content multi-analysis-key-496-new.pem
   ```

2. **On Linux/Mac:**
   ```bash
   cat multi-analysis-key-496-new.pem
   ```

3. Copy the entire content (including `-----BEGIN` and `-----END` lines)

### Step 3: Add Secrets to GitHub

1. **EC2_HOST**: Your EC2 public IP address
2. **EC2_USERNAME**: Usually `ec2-user` for Amazon Linux or `ubuntu` for Ubuntu
3. **EC2_SSH_KEY**: Paste the entire SSH key content
4. **EC2_PORT**: Usually `22` (default SSH port)

### Step 4: Test the Workflow

1. Make a small change to your code
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```

3. Go to your GitHub repository → **Actions** tab
4. You should see the "Deploy to EC2" workflow running

## 🔍 Monitoring Deployments

### GitHub Actions Dashboard
- Go to your repository → **Actions** tab
- Click on any workflow run to see detailed logs
- Green checkmark = successful deployment
- Red X = deployment failed

### Manual Deployment
You can manually trigger deployments:
1. Go to **Actions** tab
2. Click on **Deploy to EC2** workflow
3. Click **Run workflow** button
4. Select branch and click **Run workflow**

## 🚨 Troubleshooting

### Common Issues:

1. **SSH Connection Failed**
   - Verify `EC2_HOST` is correct
   - Check that `EC2_SSH_KEY` contains the full private key
   - Ensure EC2 security group allows SSH (port 22)

2. **Permission Denied**
   - Verify `EC2_USERNAME` is correct
   - Check SSH key permissions on EC2

3. **Build Failed**
   - Check the build logs in GitHub Actions
   - Ensure all dependencies are properly installed

4. **Health Check Failed**
   - Check if your application is running on EC2
   - Verify ports 3000 and 3001 are open in security group
   - Check application logs on EC2

### Debug Commands on EC2:

```bash
# SSH into your EC2 instance
ssh -i multi-analysis-key-496-new.pem ec2-user@YOUR_EC2_IP

# Check if application is running
docker-compose ps  # If using Docker
pm2 status         # If using PM2
sudo systemctl status multi-analysis  # If using systemd

# Check logs
docker-compose logs -f  # If using Docker
pm2 logs               # If using PM2
sudo journalctl -u multi-analysis -f  # If using systemd

# Check if ports are listening
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
```

## 🔄 Workflow Details

The GitHub Actions workflow does the following:

1. **Triggers**: On push to `main`/`master` branch or manual trigger
2. **Builds**: Installs dependencies and builds the application
3. **Deploys**: SSH into EC2 and runs the deployment script
4. **Health Checks**: Verifies both frontend and API are responding
5. **Reports**: Shows success/failure status

## 📈 Benefits

- **Zero Downtime**: Your application stays running during updates
- **Consistent Deployments**: Same process every time
- **Rollback Capability**: You can revert to previous commits
- **Monitoring**: Built-in health checks and logging
- **Team Collaboration**: Everyone's changes are automatically deployed

## 🔒 Security Notes

- Keep your SSH private key secure
- Use repository secrets (never commit secrets to code)
- Consider using GitHub's deploy keys for additional security
- Regularly rotate SSH keys

## 🎉 You're All Set!

Once configured, every push to your main branch will automatically deploy to EC2. Your frontend will always be up-to-date with your latest changes!
