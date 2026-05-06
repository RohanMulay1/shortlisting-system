import streamlit as st
from backend.resume_parser import extract_text_from_pdf, parse_resume
from backend.state import save, load

st.set_page_config(page_title="Upload Resumes", page_icon="📋", layout="wide")
st.title("Step 2: Upload Candidate Resumes")

jd = load("jd_parsed")
if not jd:
    st.warning("Please upload and parse a JD first (Step 1).")
    st.stop()

uploaded_files = st.file_uploader(
    "Upload resumes (PDF or TXT)",
    type=["pdf", "txt"],
    accept_multiple_files=True,
)

existing = load("candidates", [])
if existing:
    st.info(f"{len(existing)} resume(s) already parsed. Upload more to add, or clear session to restart.")

col1, col2 = st.columns([1, 1])
with col1:
    parse_btn = st.button("Parse All Resumes", type="primary", disabled=not uploaded_files)
with col2:
    if existing and st.button("Clear All Resumes", type="secondary"):
        save("candidates", [])
        save("skill_scores", [])
        save("rag_scores", [])
        save("ranked", [])
        st.success("Resumes cleared.")
        st.rerun()

if parse_btn and uploaded_files:
    existing_names = {c.get("filename") for c in existing}
    new_candidates = list(existing)

    progress = st.progress(0, text="Parsing resumes...")
    for i, f in enumerate(uploaded_files):
        if f.name in existing_names:
            st.info(f"Skipping {f.name} (already parsed)")
            continue

        with st.spinner(f"Parsing {f.name}..."):
            raw_bytes = f.read()
            if f.type == "application/pdf":
                text = extract_text_from_pdf(raw_bytes)
            else:
                text = raw_bytes.decode("utf-8", errors="ignore")

            candidate = parse_resume(text, filename=f.name)
            new_candidates.append(candidate)

        progress.progress((i + 1) / len(uploaded_files), text=f"Parsed {f.name}")

    save("candidates", new_candidates)
    save("skill_scores", [])
    save("rag_scores", [])
    save("ranked", [])
    st.success(f"Parsed {len(new_candidates)} resume(s) total.")
    st.rerun()

candidates = load("candidates", [])
if candidates:
    st.subheader(f"Parsed Candidates ({len(candidates)})")

    for i, c in enumerate(candidates):
        with st.expander(f"{i+1}. {c.get('name', 'Unknown')} — {c.get('total_years', 0)} yrs exp | {c.get('filename', '')}"):
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**Email:** {c.get('email', 'N/A')}")
                st.markdown(f"**Total Experience:** {c.get('total_years', 0)} years")
                st.markdown(f"**Education:** {c.get('education', 'N/A')}")
                st.markdown("**Skills:**")
                st.markdown(", ".join(c.get("skills", [])) or "None extracted")
            with col2:
                st.markdown("**Companies:**")
                st.markdown(", ".join(c.get("companies", [])) or "N/A")
                st.markdown("**Summary:**")
                st.markdown(c.get("summary", "N/A"))

    st.info("Next: Go to **Rankings** to see AI-ranked candidates.")
