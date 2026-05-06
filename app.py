import streamlit as st
from backend.state import init_db

st.set_page_config(
    page_title="Candidate Shortlisting System",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_db()

st.title("Intelligent Hybrid Candidate Shortlisting System")
st.markdown("""
**Workflow:**
1. **Upload JD** — Parse job description and extract requirements
2. **Upload Resumes** — Batch process candidate resumes
3. **Rankings** — View AI-ranked candidates with score breakdown
4. **HR Evaluation** — Rate candidates with qualifier questions & finalize shortlist

Use the sidebar to navigate between steps.
""")

st.info("Get started by navigating to **Upload JD** in the sidebar.")

with st.sidebar:
    st.markdown("### Navigation")
    st.markdown("""
- 📄 Upload JD
- 📋 Upload Resumes
- 📊 Rankings
- ✅ HR Evaluation
    """)

    st.divider()
    from backend.state import load, clear_all
    jd = load("jd_parsed")
    candidates = load("candidates", [])
    st.metric("JD Loaded", "Yes" if jd else "No")
    st.metric("Resumes Uploaded", len(candidates))

    if st.button("Reset Session", type="secondary"):
        clear_all()
        st.success("Session cleared.")
        st.rerun()
