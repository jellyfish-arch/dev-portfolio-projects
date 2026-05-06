## 🧠 Core Concept

DevTrack AI is a developer growth and evaluation system designed to help users understand where they stand in their coding journey.

The project takes developer-related input from either:
- a GitHub profile, or
- manual user input

and converts it into:
- a structured score
- a skill level classification
- improvement suggestions
- AI-generated feedback
- a simple career roadmap

The core idea is to turn raw coding activity into meaningful developer insights.

This project combines:
- GitHub data analysis
- manual self-assessment
- scoring logic
- visual feedback
- local AI-powered analysis
- career guidance.

---

## ⚙️ How It Works

DevTrack AI works in a simple flow:

### 1. Input Collection
The user chooses one of two modes:

- **GitHub Mode**  
  Enter a GitHub username to analyze public repository data.

- **Manual Mode**  
  Enter personal details such as:
  - number of projects
  - DSA level
  - programming languages known.

---

### 2. Data Analysis
The app processes the input and evaluates developer progress using key indicators such as:
- number of projects
- language diversity
- GitHub stars
- recent repository activity
- DSA strength.

---

### 3. Score Generation
Using the analyzed data, the app generates a score out of 100.

This score reflects the user's overall developer profile and is used to classify them as:
- **Beginner**
- **Intermediate**
- **Advanced**.

---

### 4. AI Feedback
After scoring, the profile can be sent to a local AI model through Ollama.

The AI generates:
- strengths
- weaknesses
- next steps

This makes the feedback more useful, personalized, and human-readable.

---

### 5. Career Guidance
The user can select a career goal such as:
- Web Developer
- AI / ML Engineer
- Backend Developer

The app then suggests a basic roadmap for that path.

---

### 6. Progress Tracking
Each analysis is stored locally in the browser using `localStorage`, allowing users to review their past scores and track improvement over time.

---

## ✨ Features

### 🔍 GitHub Profile Analysis
- Accepts a GitHub username
- Fetches public repository data
- Analyzes:
  - total projects
  - programming languages
  - stars
  - update activity.

### ✍️ Manual Analysis Mode
- Lets users enter project count, DSA level, and languages
- Generates a score without GitHub input.

### 📊 Smart Scoring System
- Projects contribute to the score
- Language variety adds value
- Stars improve the score
- Recent activity increases the score.

### 🏷️ Skill Level Classification
- Beginner
- Intermediate
- Advanced.

### 🤖 AI-Powered Insights
- Uses a local LLM through Ollama
- Generates personalized developer feedback
- Shows strengths, weaknesses, and next steps.

### 📈 Score History
- Stores past analyses locally
- Saves score, level, languages, username, date, and time.

### 🛣️ Career Roadmap Generator
- Suggests learning paths based on user goals
- Useful for students and beginners choosing a direction.

### 🎨 Modern Interface
- Dark / light theme toggle
- Animated score display
- Language breakdown bars
- Top repository cards
- Toast notifications for quick feedback.

---

## 🔤 Important Terms Used

### GitHub API
A service that allows the app to fetch public GitHub data such as repositories, stars, languages, and update timestamps.

### localStorage
A browser feature that stores data on the user's device even after refreshing or closing the page.

### DSA
Short for **Data Structures and Algorithms**. In this project, it is used as a rough indicator of coding fundamentals.

### Ollama
A local AI runtime that allows large language models to run on the user's own machine instead of cloud servers.

### LLM
Short for **Large Language Model**. This is the AI model that generates written insights.

### Repository
A project folder on GitHub that contains code, files, and related project data.

### Activity Score
A value based on how recently the user's repositories were updated.

### Score Breakdown
A detailed view showing how the final score was calculated.

### Career Roadmap
A suggested learning path based on the user's selected career goal.

---

*🚀 Maintained by Jelly Fish | Last Updated: May 2026*
