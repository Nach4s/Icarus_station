### 1. Backend Setup

1.  **Navigate to the backend directory:**
    
    cd backend
    

2.  **Create a virtual environment:**
    
    python -m venv venv

    # Windows
    venv\Scripts\activate

    # macOS/Linux
    source venv/bin/activate
    

3.  **Install dependencies:**
    
    pip install -r requirements.txt
    

4.  **Environment Setup (.env):**
    *   In the `backend` folder, find the `.env.example` file.
    *   Copy it and rename it to `.env`:
    *   **Important:** Open the `.env` file in a text editor and configure:
        *   `CONFIG_PATH`: Full path to the `config/mission_config.yaml` file.
        *   `OPENAI_API_KEY`: Your OpenAI API key (if used).

5.  **Run the server:**
    
    python app.py
    
    The server will start at: `http://localhost:5000`

---

### 2. Frontend Setup
1.  **Navigate to the frontend directory:**
    
    cd frontend
    

2.  **Install dependencies:**
    
    npm install


3.  **Run:**
    
    npm run dev
    
    The application will be available at: `http://localhost:3000` (check the terminal output)
