# Contributing to AbangCebuAI 🏝️🤖

Welcome to **AbangCebuAI**! To keep the central repository stable, secure, and clean, our team uses the **Fork & Pull Request Workflow**.

Direct pushes to the main repository (`hermarDev/Abang_Cebu_AI_Group2`) are strictly disabled. All teammates contribute by working on their own personal fork and submitting Pull Requests for review by the Team Lead (**@hermarDev**).

---

## 🚀 Step-by-Step Contribution Workflow

```mermaid
flowchart TD
    Upstream["Upstream Repo<br/>hermarDev/Abang_Cebu_AI_Group2"]
    Fork["Your GitHub Fork<br/>your-username/Abang_Cebu_AI_Group2"]
    Local["Your Local Computer<br/>(Feature Branch)"]

    Upstream -->|1. Fork on GitHub| Fork
    Fork -->|2. git clone| Local
    Upstream -.->|3. git pull upstream main<br/>(Stay up to date)| Local
    Local -->|4. git push origin feature/...| Fork
    Fork -->|5. Submit Pull Request| Upstream
    Upstream -->|6. Review & Merge by @hermarDev| Upstream
```

---

### Step 1: Fork the Central Repository
1. Navigate to the main repository on GitHub:  
   👉 **[https://github.com/hermarDev/Abang_Cebu_AI_Group2](https://github.com/hermarDev/Abang_Cebu_AI_Group2)**
2. Click the **"Fork"** button in the top-right corner.
3. Choose your personal GitHub account as the destination and click **"Create fork"**.
4. You now have your own repository copy at:  
   `https://github.com/<your-username>/Abang_Cebu_AI_Group2`

---

### Step 2: Clone Your Fork to Your Local Computer
Open your terminal and clone **your fork** (replace `<your-username>` with your GitHub handle):

```bash
git clone https://github.com/<your-username>/Abang_Cebu_AI_Group2.git
cd Abang_Cebu_AI_Group2
```

---

### Step 3: Configure the `upstream` Remote
To keep your local code synchronized with the latest updates from the main repository, configure the `upstream` remote:

```bash
# Add the main repository as "upstream"
git remote add upstream https://github.com/hermarDev/Abang_Cebu_AI_Group2.git

# Verify your remotes (origin points to your fork, upstream points to main repo)
git remote -v
```

Before starting any new task, always fetch the latest changes from `upstream`:
```bash
git checkout main
git pull upstream main
```

---

### Step 4: Create a Feature Branch
Never work directly on the `main` branch. Create a feature branch named after your Jira ticket:

```bash
# Format: feature/SCRUM-<id>-<short-description>
git checkout -b feature/SCRUM-54-users-table
```

---

### Step 5: Develop and Test Locally
Install dependencies and run the local development server:

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Start development server
pnpm dev --turbopack
```

---

### Step 6: Verify Code Quality (Mandatory Before PR)
Before committing, you **must** run these three verification commands to ensure zero broken builds:

```bash
# 1. TypeScript compilation check
pnpm tsc --noEmit

# 2. ESLint code standard check
pnpm lint

# 3. Production build test
pnpm build
```
*(All 3 checks must pass with zero errors!)*

---

### Step 7: Commit and Push to Your Fork
Write a descriptive commit message referencing your Jira ticket:

```bash
git add .
git commit -m "feat(SCRUM-54): define users and profiles table schema"

# Push to YOUR fork (origin)
git push -u origin feature/SCRUM-54-users-table
```

---

### Step 8: Open a Pull Request into the Main Repository
1. Go to your fork on GitHub: `https://github.com/<your-username>/Abang_Cebu_AI_Group2`.
2. Click the green button: **"Compare & pull request"**.
3. Ensure the base repository is:
   * **Base repository**: `hermarDev/Abang_Cebu_AI_Group2` (`main`)
   * **Head repository**: `<your-username>/Abang_Cebu_AI_Group2` (`feature/...`)
4. Fill out the **Pull Request Template** checklist.
5. Link your Jira ticket (e.g. `SCRUM-54`).
6. Click **"Create pull request"**.

---

### Step 9: Code Review & Merging
* The Team Lead (**@hermarDev**) will review your code.
* If any changes are requested, make the changes locally, commit, and push again to your branch — the Pull Request will update automatically.
* Once approved, the Team Lead will **Squash and Merge** your code into the central `main` branch! 🎉
