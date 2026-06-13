# HubZone — Esports & Gaming Community Platform

## Virtual Environment Setup

### Backend (Python/Django)

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate virtual environment:**
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD):**
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **Linux/Mac:**
     ```bash
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Start development server:**
   ```bash
   python manage.py runserver
   ```

### Frontend (React/Vite)

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

## Project Structure

```
gaming_platform/
├── backend/          # Django REST API
│   ├── venv/         # Python virtual environment
│   ├── authentication/
│   ├── chat/
│   ├── forum/
│   ├── tournaments/
│   └── ...
├── frontend/         # React + Vite
│   ├── src/
│   └── ...
└── README.md
```
