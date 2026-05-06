import streamlit as st
from backend.jd_processor import parse_jd, generate_simplified_jd
from backend.state import save, load

st.set_page_config(page_title="Upload JD", page_icon="📄", layout="wide")
st.title("Step 1: Upload Job Description")

tab1, tab2 = st.tabs(["Paste JD Text", "Upload File"])

jd_text = ""
with tab1:
    jd_text_input = st.text_area(
        "Paste your job description here",
        height=300,
        placeholder="Copy and paste the full job description...",
        key="jd_paste",
    )
    if jd_text_input:
        jd_text = jd_text_input

with tab2:
    uploaded = st.file_uploader("Upload JD (.txt or .pdf)", type=["txt", "pdf"])
    if uploaded:
        if uploaded.type == "application/pdf":
            import pdfplumber, io
            with pdfplumber.open(io.BytesIO(uploaded.read())) as pdf:
                jd_text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        else:
            jd_text = uploaded.read().decode("utf-8", errors="ignore")
        st.text_area("Extracted JD text (preview)", jd_text[:1000] + "...", height=200, disabled=True)

st.divider()

existing = load("jd_parsed")
if existing:
    st.success(f"JD already loaded: **{existing.get('title', 'Unknown')}** — re-parse to overwrite.")

if jd_text and st.button("Parse & Analyze JD", type="primary"):
    with st.spinner("Parsing job description with AI..."):
        parsed = parse_jd(jd_text)
        save("jd_parsed", parsed)
        save("jd_raw", jd_text)

    with st.spinner("Generating simplified JD..."):
        simplified = generate_simplified_jd(parsed)
        save("jd_simplified", simplified)

    st.success("JD parsed successfully!")
    st.rerun()

jd = load("jd_parsed")
if jd:
    st.subheader(f"Parsed JD: {jd.get('title', 'N/A')}")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Required Skills**")
        for s in jd.get("required_skills", []):
            st.markdown(f"- {s}")

        st.markdown(f"**Experience Required:** {jd.get('experience_years', 'N/A')} years")
        st.markdown(f"**Education:** {jd.get('education', 'N/A')}")

    with col2:
        st.markdown("**Preferred Skills**")
        for s in jd.get("preferred_skills", []):
            st.markdown(f"- {s}")

        st.markdown("**Domains**")
        for d in jd.get("domains", []):
            st.markdown(f"- {d}")

    st.markdown("**Responsibilities**")
    for r in jd.get("responsibilities", []):
        st.markdown(f"- {r}")

    st.divider()
    simplified = load("jd_simplified")
    if simplified:
        st.subheader("Simplified JD (for sharing)")
        st.markdown(simplified)

    st.info("Next: Go to **Upload Resumes** to add candidate resumes.")
