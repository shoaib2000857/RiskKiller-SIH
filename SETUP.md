# TattvaDrishti - Team Setup Guide

## For New Team Members

### Prerequisites
- Git installed
- Python 3.11.x installed (NOT 3.12+)
- Node.js 18+ and npm installed

### First-Time Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Team-ASHTOJ/TattvaDrishti.git
   cd TattvaDrishti
   ```

2. **Backend Setup (Python 3.11)**
   ```bash
   # Verify Python version (must be 3.11.x)
   python3.11 --version
   
   # Create virtual environment
   python3.11 -m venv .venv
   
   # Activate (macOS/Linux)
   source .venv/bin/activate
   
   # Activate (Windows PowerShell)
   .venv\Scripts\Activate.ps1
   
   # Install dependencies
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Create environment file
   echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000' > .env.local
   
   # Install dependencies
   npm install
   ```

### Running the Application

**Terminal 1 - Backend**
```bash
cd TattvaDrishti
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```
✅ Backend running at http://localhost:8000

**Terminal 2 - Frontend**
```bash
cd TattvaDrishti/frontend
npm run dev
```
✅ Frontend running at http://localhost:3000

### Common Issues

**"Python 3.11.x is required" error**
- Install Python 3.11 (see README.md for platform-specific instructions)
- Recreate your `.venv` with `python3.11 -m venv .venv`

**Module not found errors**
- Ensure virtual environment is activated: `source .venv/bin/activate`
- Reinstall: `pip install -r requirements.txt`

**Frontend won't connect to backend**
- Check backend is running on port 8000
- Verify `frontend/.env.local` contains `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

### Git Workflow

```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, then commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### What's Gitignored (Don't Commit)

- `.venv/` - Virtual environment
- `__pycache__/` - Python cache
- `node_modules/` - NPM packages
- `.env` / `.env.local` - Environment files
- `data/` - Database files
- `frontend/.next/` - Next.js build
- `.DS_Store` - macOS files

### Need Help?

- Check the main [README.md](../README.md)
- Ask in team chat
- Review existing code in `app/` and `frontend/`
