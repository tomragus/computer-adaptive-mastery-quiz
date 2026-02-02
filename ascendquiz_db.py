import streamlit as st
import sqlite3
import json
import random
from datetime import datetime

# ============== DATABASE SETUP (all in one file) ==============

DB_PATH = "ascendquiz.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pdf_name TEXT,
        questions JSON,
        final_score INTEGER,
        total_questions_answered INTEGER,
        mastery_achieved BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        question_text TEXT,
        difficulty INTEGER,
        correct BOOLEAN,
        topic TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id)
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS topic_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        topic TEXT,
        attempts INTEGER DEFAULT 0,
        correct INTEGER DEFAULT 0,
        last_attempted TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, topic)
    )''')
    
    conn.commit()
    conn.close()

def create_user(username):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username) VALUES (?)", (username,))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_id, None
    except sqlite3.IntegrityError:
        conn.close()
        return None, "Username already exists"

def get_user(username):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    return dict(user) if user else None

def save_quiz_session(user_id, pdf_name, questions, final_score, total_answered, mastery_achieved):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''INSERT INTO quiz_sessions 
                 (user_id, pdf_name, questions, final_score, total_questions_answered, mastery_achieved)
                 VALUES (?, ?, ?, ?, ?, ?)''',
              (user_id, pdf_name, json.dumps(questions), final_score, total_answered, mastery_achieved))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id

def save_response(session_id, question_text, difficulty, correct, topic=None):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''INSERT INTO responses (session_id, question_text, difficulty, correct, topic)
                 VALUES (?, ?, ?, ?, ?)''',
              (session_id, question_text, difficulty, correct, topic))
    conn.commit()
    conn.close()

def update_topic_stats(user_id, topic, correct):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''INSERT INTO topic_stats (user_id, topic, attempts, correct, last_attempted)
                 VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(user_id, topic) DO UPDATE SET
                 attempts = attempts + 1,
                 correct = correct + ?,
                 last_attempted = CURRENT_TIMESTAMP''',
              (user_id, topic, 1 if correct else 0, 1 if correct else 0))
    conn.commit()
    conn.close()

def get_user_history(user_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''SELECT id, pdf_name, final_score, total_questions_answered, mastery_achieved, created_at
                 FROM quiz_sessions WHERE user_id = ? ORDER BY created_at DESC''', (user_id,))
    sessions = [dict(row) for row in c.fetchall()]
    conn.close()
    return sessions

def get_user_stats(user_id):
    conn = get_connection()
    c = conn.cursor()
    
    c.execute('''SELECT 
                    COUNT(*) as total_quizzes,
                    AVG(final_score) as avg_score,
                    SUM(CASE WHEN mastery_achieved THEN 1 ELSE 0 END) as mastery_count,
                    SUM(total_questions_answered) as total_questions
                 FROM quiz_sessions WHERE user_id = ?''', (user_id,))
    overall = dict(c.fetchone())
    
    c.execute('''SELECT topic, attempts, correct,
                    ROUND(correct * 100.0 / attempts, 1) as accuracy
                 FROM topic_stats WHERE user_id = ? ORDER BY attempts DESC''', (user_id,))
    topics = [dict(row) for row in c.fetchall()]
    
    c.execute('''SELECT final_score, created_at FROM quiz_sessions 
                 WHERE user_id = ? ORDER BY created_at DESC LIMIT 5''', (user_id,))
    recent = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return {"overall": overall, "topics": topics, "recent": recent}

def get_weak_topics(user_id, threshold=60):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''SELECT topic, attempts, correct,
                    ROUND(correct * 100.0 / attempts, 1) as accuracy
                 FROM topic_stats 
                 WHERE user_id = ? AND attempts >= 2
                 AND (correct * 100.0 / attempts) < ?
                 ORDER BY accuracy ASC''', (user_id, threshold))
    weak = [dict(row) for row in c.fetchall()]
    conn.close()
    return weak

# Initialize DB
init_db()

# ============== PAGE CONFIG ==============
st.set_page_config(page_title="AscendQuiz", page_icon="📚", layout="wide")

# ============== SAMPLE QUESTIONS (NO API NEEDED) ==============
DEMO_QUESTIONS = [
    {
        "question": "What is the primary function of mitochondria in a cell?",
        "options": ["A. Protein synthesis", "B. ATP production through cellular respiration", "C. DNA replication", "D. Cell membrane formation"],
        "correct_answer": "B",
        "explanation": "Mitochondria are the 'powerhouses' of the cell, responsible for producing ATP through cellular respiration. Protein synthesis occurs in ribosomes, DNA replication in the nucleus, and cell membrane formation involves the endoplasmic reticulum and Golgi apparatus.",
        "topic": "Cell Biology",
        "estimated_correct_pct": 85
    },
    {
        "question": "In the equation y = mx + b, what does 'm' represent?",
        "options": ["A. Y-intercept", "B. X-intercept", "C. Slope of the line", "D. Origin point"],
        "correct_answer": "C",
        "explanation": "In slope-intercept form (y = mx + b), 'm' represents the slope (rate of change) and 'b' represents the y-intercept. The slope tells you how much y changes for each unit increase in x.",
        "topic": "Linear Equations",
        "estimated_correct_pct": 90
    },
    {
        "question": "Which data structure uses LIFO (Last In, First Out) ordering?",
        "options": ["A. Queue", "B. Stack", "C. Linked List", "D. Binary Tree"],
        "correct_answer": "B",
        "explanation": "A stack follows LIFO ordering - the last element added is the first one removed (like a stack of plates). Queues use FIFO (First In, First Out). Linked lists and binary trees don't have inherent LIFO/FIFO ordering.",
        "topic": "Data Structures",
        "estimated_correct_pct": 75
    },
    {
        "question": "What is the derivative of f(x) = x³?",
        "options": ["A. 3x", "B. x²", "C. 3x²", "D. x⁴/4"],
        "correct_answer": "C",
        "explanation": "Using the power rule: d/dx[xⁿ] = nxⁿ⁻¹. So d/dx[x³] = 3x³⁻¹ = 3x². Option A forgets to reduce the exponent, B forgets the coefficient, and D is the integral, not derivative.",
        "topic": "Calculus",
        "estimated_correct_pct": 70
    },
    {
        "question": "Which sorting algorithm has the best average-case time complexity?",
        "options": ["A. Bubble Sort - O(n²)", "B. Quick Sort - O(n log n)", "C. Selection Sort - O(n²)", "D. Insertion Sort - O(n²)"],
        "correct_answer": "B",
        "explanation": "Quick Sort has an average time complexity of O(n log n), which is significantly better than the O(n²) algorithms. Bubble, Selection, and Insertion sort all have quadratic time complexity on average.",
        "topic": "Algorithms",
        "estimated_correct_pct": 55
    },
    {
        "question": "In photosynthesis, where does the light-dependent reaction occur?",
        "options": ["A. Stroma", "B. Thylakoid membrane", "C. Mitochondria", "D. Cell wall"],
        "correct_answer": "B",
        "explanation": "Light-dependent reactions occur in the thylakoid membrane where chlorophyll absorbs light energy. The stroma is where the Calvin cycle (light-independent reactions) occurs. Mitochondria handle cellular respiration, not photosynthesis.",
        "topic": "Cell Biology",
        "estimated_correct_pct": 60
    },
    {
        "question": "What is the time complexity of binary search?",
        "options": ["A. O(n)", "B. O(n²)", "C. O(log n)", "D. O(1)"],
        "correct_answer": "C",
        "explanation": "Binary search divides the search space in half each iteration, resulting in O(log n) complexity. Linear search is O(n), and O(1) would mean constant time regardless of input size, which isn't possible for searching.",
        "topic": "Algorithms",
        "estimated_correct_pct": 65
    },
    {
        "question": "Which HTTP method is idempotent and used for completely replacing a resource?",
        "options": ["A. POST", "B. PUT", "C. PATCH", "D. GET"],
        "correct_answer": "B",
        "explanation": "PUT is idempotent (multiple identical requests have the same effect as one) and replaces the entire resource. POST creates new resources and isn't idempotent. PATCH partially updates. GET only retrieves data.",
        "topic": "Web Development",
        "estimated_correct_pct": 45
    },
    {
        "question": "What is the value of log₂(8)?",
        "options": ["A. 2", "B. 3", "C. 4", "D. 8"],
        "correct_answer": "B",
        "explanation": "log₂(8) asks '2 raised to what power equals 8?' Since 2³ = 8, the answer is 3. This is fundamental to understanding logarithms as the inverse of exponentiation.",
        "topic": "Logarithms",
        "estimated_correct_pct": 80
    },
    {
        "question": "In object-oriented programming, what is encapsulation?",
        "options": ["A. Creating multiple instances of a class", "B. Hiding internal state and requiring interaction through methods", "C. Inheriting properties from a parent class", "D. Defining multiple methods with the same name"],
        "correct_answer": "B",
        "explanation": "Encapsulation bundles data and methods together while hiding internal state, only allowing access through defined interfaces. Option A describes instantiation, C describes inheritance, and D describes method overloading.",
        "topic": "OOP Concepts",
        "estimated_correct_pct": 70
    },
    {
        "question": "What is the integral of 2x?",
        "options": ["A. x²", "B. x² + C", "C. 2", "D. 2x²"],
        "correct_answer": "B",
        "explanation": "The integral of 2x is x² + C, where C is the constant of integration. When integrating, we add 1 to the exponent and divide by the new exponent: 2x¹ → 2x²/2 = x². The +C is essential for indefinite integrals.",
        "topic": "Calculus",
        "estimated_correct_pct": 65
    },
    {
        "question": "Which of the following is NOT a valid Python data type?",
        "options": ["A. list", "B. tuple", "C. array", "D. dictionary"],
        "correct_answer": "C",
        "explanation": "Python has built-in types: list, tuple, dict (dictionary), set, etc. 'array' is not a built-in type - you need to import it from the array module or use NumPy. Lists are typically used instead.",
        "topic": "Python Basics",
        "estimated_correct_pct": 55
    },
    {
        "question": "What is the pH of a neutral solution at 25°C?",
        "options": ["A. 0", "B. 7", "C. 14", "D. 1"],
        "correct_answer": "B",
        "explanation": "A neutral solution has equal concentrations of H⁺ and OH⁻ ions, which at 25°C corresponds to pH 7. pH below 7 is acidic, above 7 is basic. pH 0 and 1 are very acidic, pH 14 is very basic.",
        "topic": "Chemistry",
        "estimated_correct_pct": 85
    },
    {
        "question": "In a relational database, what does SQL stand for?",
        "options": ["A. Simple Query Language", "B. Structured Query Language", "C. Standard Question Language", "D. System Query Logic"],
        "correct_answer": "B",
        "explanation": "SQL stands for Structured Query Language. It's the standard language for managing and manipulating relational databases, used for queries, updates, insertions, and deletions.",
        "topic": "Databases",
        "estimated_correct_pct": 80
    },
    {
        "question": "What is the Big O complexity of accessing an element by index in an array?",
        "options": ["A. O(n)", "B. O(log n)", "C. O(1)", "D. O(n²)"],
        "correct_answer": "C",
        "explanation": "Array access by index is O(1) - constant time - because arrays store elements in contiguous memory. The memory address can be calculated directly: base_address + (index × element_size), regardless of array size.",
        "topic": "Data Structures",
        "estimated_correct_pct": 60
    }
]

# ============== HELPER FUNCTIONS ==============

def assign_difficulty_label(estimated_pct):
    if estimated_pct < 30: return 8
    elif estimated_pct < 40: return 7
    elif estimated_pct < 50: return 6
    elif estimated_pct < 65: return 5
    elif estimated_pct < 75: return 4
    elif estimated_pct < 85: return 3
    elif estimated_pct < 90: return 2
    else: return 1

def compute_mastery_score(answers):
    if not answers:
        return 0
    correct = sum(1 for _, c in answers if c)
    return int((correct / len(answers)) * 100)

# ============== UI COMPONENTS ==============

def render_login_page():
    st.title("📚 AscendQuiz")
    st.markdown("### Your Personal Adaptive Learning Platform")
    
    st.markdown("""
    **Features:**
    - 🎯 Adaptive quizzes that adjust to your level
    - 📊 Track your progress over time  
    - 🔍 Identify weak topics to focus on
    - 📜 Review past quiz performance
    """)
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 🔑 Returning User")
        login_user = st.text_input("Username", key="login_username", placeholder="Enter your username")
        if st.button("Login", key="login_btn", use_container_width=True):
            if login_user:
                user = get_user(login_user)
                if user:
                    st.session_state.user = user
                    st.session_state.logged_in = True
                    st.rerun()
                else:
                    st.error("❌ User not found. Please sign up first.")
            else:
                st.warning("Please enter a username")
    
    with col2:
        st.markdown("#### ✨ New User")
        new_user = st.text_input("Choose a Username", key="signup_username", placeholder="Pick a username")
        if st.button("Create Account", key="signup_btn", use_container_width=True):
            if new_user:
                if len(new_user) < 3:
                    st.error("Username must be at least 3 characters")
                else:
                    user_id, error = create_user(new_user)
                    if user_id:
                        st.session_state.user = {"id": user_id, "username": new_user}
                        st.session_state.logged_in = True
                        st.success("✅ Account created!")
                        st.rerun()
                    else:
                        st.error(f"❌ {error}")
            else:
                st.warning("Please choose a username")

def render_sidebar():
    with st.sidebar:
        st.markdown(f"### 👤 {st.session_state.user['username']}")
        
        stats = get_user_stats(st.session_state.user["id"])
        if stats["overall"]["total_quizzes"]:
            st.metric("Quizzes Taken", stats["overall"]["total_quizzes"])
        
        st.markdown("---")
        
        page = st.radio(
            "Navigation",
            ["📝 Take Quiz", "📊 Dashboard", "📜 History"],
            label_visibility="collapsed"
        )
        
        st.markdown("---")
        
        if st.button("🚪 Logout", use_container_width=True):
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.rerun()
        
        return page

def render_dashboard():
    st.title("📊 Your Learning Dashboard")
    
    user_id = st.session_state.user["id"]
    stats = get_user_stats(user_id)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total = stats["overall"]["total_quizzes"] or 0
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin:0; font-size: 2.5em;">{total}</h1>
            <p style="margin:0;">Quizzes Taken</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        avg = stats["overall"]["avg_score"]
        avg_str = f"{avg:.0f}%" if avg else "N/A"
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                    padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin:0; font-size: 2.5em;">{avg_str}</h1>
            <p style="margin:0;">Avg Score</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        mastery = stats["overall"]["mastery_count"] or 0
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                    padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin:0; font-size: 2.5em;">{mastery}</h1>
            <p style="margin:0;">Mastery Achieved</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        questions = stats["overall"]["total_questions"] or 0
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); 
                    padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin:0; font-size: 2.5em;">{questions}</h1>
            <p style="margin:0;">Questions Answered</p>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🎯 Areas to Improve")
        weak_topics = get_weak_topics(user_id)
        if weak_topics:
            for topic in weak_topics[:5]:
                accuracy = topic["accuracy"]
                if accuracy < 40:
                    color = "#ff4444"
                    emoji = "🔴"
                elif accuracy < 60:
                    color = "#ffaa00"
                    emoji = "🟡"
                else:
                    color = "#44aa44"
                    emoji = "🟢"
                
                st.markdown(f"""
                <div style="background: #f8f9fa; padding: 10px 15px; border-radius: 8px; 
                            margin: 5px 0; border-left: 4px solid {color};">
                    {emoji} <strong>{topic['topic']}</strong>: {accuracy}% 
                    <span style="color: #888;">({topic['attempts']} attempts)</span>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("💡 Complete more quizzes to see personalized recommendations!")
    
    with col2:
        st.markdown("### 📈 Recent Performance")
        if stats["recent"]:
            for session in stats["recent"]:
                score = session["final_score"] or 0
                date = session["created_at"][:10] if session["created_at"] else "Unknown"
                
                bar_color = "#28a745" if score >= 70 else "#ffc107" if score >= 50 else "#dc3545"
                st.markdown(f"""
                <div style="background: #f8f9fa; padding: 10px 15px; border-radius: 8px; margin: 5px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span><strong>{score}%</strong></span>
                        <span style="color: #888;">{date}</span>
                    </div>
                    <div style="background: #e9ecef; border-radius: 4px; height: 8px;">
                        <div style="background: {bar_color}; width: {score}%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("📝 No quizzes completed yet. Start one now!")
    
    st.markdown("### 📚 Topic Performance Breakdown")
    if stats["topics"]:
        import pandas as pd
        topic_df = pd.DataFrame(stats["topics"])
        topic_df.columns = ["Topic", "Attempts", "Correct", "Accuracy %"]
        topic_df = topic_df.sort_values("Accuracy %", ascending=True)
        st.dataframe(topic_df, use_container_width=True, hide_index=True)
    else:
        st.info("Topic statistics will appear after you complete quizzes!")

def render_history():
    st.title("📜 Quiz History")
    
    user_id = st.session_state.user["id"]
    history = get_user_history(user_id)
    
    if not history:
        st.info("📝 No quizzes completed yet. Take your first quiz!")
        return
    
    st.markdown(f"**Total quizzes:** {len(history)}")
    st.markdown("---")
    
    for i, session in enumerate(history):
        score = session['final_score'] or 0
        status_color = "#28a745" if session['mastery_achieved'] else "#ffc107"
        status_text = "✅ Mastered" if session['mastery_achieved'] else "📖 In Progress"
        
        with st.expander(f"📄 {session['pdf_name'] or 'Demo Quiz'} — Score: {score}% — {session['created_at'][:10] if session['created_at'] else 'Unknown'}"):
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Final Score", f"{score}%")
            with col2:
                st.metric("Questions Answered", session['total_questions_answered'] or 0)
            with col3:
                st.markdown(f"**Status**")
                st.markdown(f"<span style='color: {status_color}; font-size: 1.2em;'>{status_text}</span>", 
                           unsafe_allow_html=True)

def render_quiz():
    st.title("📝 Take a Quiz")
    
    if "quiz_active" not in st.session_state:
        st.markdown("""
        ### Demo Mode 🎮
        
        This demo uses pre-loaded sample questions to show how the adaptive quiz works.
        
        **Topics covered:** Cell Biology, Linear Equations, Data Structures, Calculus, Algorithms, Web Development, Chemistry, Databases, Python, OOP
        
        *In the full version, you upload a PDF and AI generates custom questions!*
        """)
        
        if st.button("🚀 Start Demo Quiz", use_container_width=True):
            questions = DEMO_QUESTIONS.copy()
            random.shuffle(questions)
            
            st.session_state.quiz_active = True
            st.session_state.quiz_questions = questions
            st.session_state.current_q_idx = 0
            st.session_state.answers = []
            st.session_state.show_explanation = False
            
            st.session_state.current_session_id = save_quiz_session(
                st.session_state.user["id"],
                "Demo Quiz",
                questions,
                0, 0, False
            )
            st.rerun()
        return
    
    questions = st.session_state.quiz_questions
    idx = st.session_state.current_q_idx
    answers = st.session_state.answers
    
    if idx >= len(questions):
        render_quiz_complete()
        return
    
    q = questions[idx]
    score = compute_mastery_score(answers)
    
    progress = (idx / len(questions))
    st.progress(progress, text=f"Question {idx + 1} of {len(questions)}")
    
    mastery_color = "#28a745" if score >= 70 else "#ffc107" if score >= 50 else "#dc3545"
    st.markdown(f"""
    <div style="background: #e9ecef; border-radius: 10px; height: 30px; margin: 10px 0; position: relative;">
        <div style="background: {mastery_color}; width: {score}%; height: 100%; border-radius: 10px;"></div>
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 100%; 
                    display: flex; align-items: center; justify-content: center; font-weight: bold;">
            Mastery: {score}%
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    topic = q.get("topic", "General")
    difficulty = assign_difficulty_label(q.get("estimated_correct_pct", 50))
    
    st.markdown(f"""
    <div style="margin: 15px 0;">
        <span style="background: #e3f2fd; color: #1976d2; padding: 5px 12px; border-radius: 15px; font-size: 0.9em;">
            📚 {topic}
        </span>
        <span style="background: #fff3e0; color: #e65100; padding: 5px 12px; border-radius: 15px; font-size: 0.9em; margin-left: 8px;">
            ⚡ Level {difficulty}/8
        </span>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown(f"### {q['question']}")
    
    if not st.session_state.show_explanation:
        selected = st.radio("Choose your answer:", q["options"], key=f"q_{idx}", index=None)
        
        if st.button("Submit Answer", use_container_width=True):
            if selected is None:
                st.warning("Please select an answer!")
            else:
                selected_letter = selected[0]
                correct = selected_letter == q["correct_answer"]
                
                st.session_state.answers.append((difficulty, correct))
                st.session_state.last_correct = correct
                st.session_state.show_explanation = True
                
                save_response(
                    st.session_state.current_session_id,
                    q["question"][:200],
                    difficulty,
                    correct,
                    topic
                )
                update_topic_stats(st.session_state.user["id"], topic, correct)
                
                st.rerun()
    else:
        if st.session_state.last_correct:
            st.success("✅ Correct! Great job!")
        else:
            st.error(f"❌ Incorrect. The answer was {q['correct_answer']}.")
        
        st.info(f"**Explanation:** {q['explanation']}")
        
        if st.button("Next Question →", use_container_width=True):
            st.session_state.current_q_idx += 1
            st.session_state.show_explanation = False
            st.rerun()

def render_quiz_complete():
    answers = st.session_state.answers
    score = compute_mastery_score(answers)
    total = len(answers)
    correct = sum(1 for _, c in answers if c)
    mastery = score >= 70
    
    conn = get_connection()
    c = conn.cursor()
    c.execute('''UPDATE quiz_sessions SET final_score = ?, total_questions_answered = ?, mastery_achieved = ?
                WHERE id = ?''', (score, total, mastery, st.session_state.current_session_id))
    conn.commit()
    conn.close()
    
    st.markdown("## 🎉 Quiz Complete!")
    
    if mastery:
        st.balloons()
        st.success(f"🏆 Mastery Achieved! You scored {score}%")
    else:
        st.warning(f"📖 You scored {score}%. Keep practicing to reach 70% mastery!")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Final Score", f"{score}%")
    with col2:
        st.metric("Correct Answers", f"{correct}/{total}")
    with col3:
        st.metric("Status", "Mastered ✅" if mastery else "Keep Going 📖")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📊 View Dashboard", use_container_width=True):
            for key in ["quiz_active", "quiz_questions", "current_q_idx", "answers", 
                       "show_explanation", "last_correct", "current_session_id"]:
                if key in st.session_state:
                    del st.session_state[key]
            st.rerun()
    
    with col2:
        if st.button("🔄 Take Another Quiz", use_container_width=True):
            for key in ["quiz_active", "quiz_questions", "current_q_idx", "answers", 
                       "show_explanation", "last_correct", "current_session_id"]:
                if key in st.session_state:
                    del st.session_state[key]
            st.rerun()

# ============== MAIN ==============

def main():
    if not st.session_state.get("logged_in", False):
        render_login_page()
        return
    
    page = render_sidebar()
    
    if page == "📝 Take Quiz":
        render_quiz()
    elif page == "📊 Dashboard":
        render_dashboard()
    elif page == "📜 History":
        render_history()

if __name__ == "__main__":
    main()