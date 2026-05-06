import streamlit as st
import pandas as pd
from backend.scorer import compute_skill_score
from backend.rag_engine import compute_rag_scores
from backend.ranker import rank_candidates, select_top_n
from backend.state import save, load

st.set_page_config(page_title="Rankings", page_icon="📊", layout="wide")
st.title("Step 3: Candidate Rankings")

jd = load("jd_parsed")
candidates = load("candidates", [])

if not jd:
    st.warning("Please complete Step 1 (Upload JD) first.")
    st.stop()
if not candidates:
    st.warning("Please complete Step 2 (Upload Resumes) first.")
    st.stop()

with st.sidebar:
    st.subheader("Scoring Weights")
    st.caption("Adjust how scores are computed (must sum to 1.0)")

    w_skill_match = st.slider("Skill Match", 0.0, 1.0, 0.50, 0.05, key="w_skill_match")
    w_skill_exp = st.slider("Skill Experience", 0.0, 1.0, 0.30, 0.05, key="w_skill_exp")
    w_total_exp = st.slider("Total Experience", 0.0, 1.0, 0.15, 0.05, key="w_total_exp")
    w_bonus = st.slider("Bonus (Preferred Skills)", 0.0, 1.0, 0.05, 0.05, key="w_bonus")

    total = w_skill_match + w_skill_exp + w_total_exp + w_bonus
    st.metric("Weight Sum", f"{total:.2f}", delta=f"{total-1:.2f}" if abs(total-1) > 0.01 else None)
    if abs(total - 1.0) > 0.01:
        st.error("Weights must sum to 1.0")

    st.divider()
    st.subheader("Final Score Weights")
    fw_skill = st.slider("Skill Score Weight", 0.0, 1.0, 0.50, 0.05, key="fw_skill")
    fw_rag = st.slider("RAG Score Weight", 0.0, 1.0, 0.30, 0.05, key="fw_rag")
    fw_hr = st.slider("HR Eval Weight", 0.0, 1.0, 0.20, 0.05, key="fw_hr")

    st.divider()
    top_n = st.number_input("Top N Candidates", min_value=1, max_value=len(candidates), value=min(10, len(candidates)))
    threshold = st.slider("Min Score Threshold", 0.0, 1.0, 0.0, 0.05)

weights = {
    "skill_match": w_skill_match,
    "skill_exp": w_skill_exp,
    "total_exp": w_total_exp,
    "bonus": w_bonus,
}
final_weights = {"skill": fw_skill, "rag": fw_rag, "hr": fw_hr}

run_btn = st.button("Run Scoring Pipeline", type="primary")

ranked_existing = load("ranked", [])
if run_btn or not ranked_existing:
    with st.spinner("Computing skill scores..."):
        skill_scores = [compute_skill_score(jd, c, weights) for c in candidates]
        save("skill_scores", skill_scores)

    with st.spinner("Computing RAG semantic scores (calling OpenAI embeddings)..."):
        rag_scores = compute_rag_scores(jd, candidates)
        save("rag_scores", rag_scores)

    with st.spinner("Ranking candidates..."):
        hr_scores = load("hr_scores", [0.0] * len(candidates))
        if len(hr_scores) != len(candidates):
            hr_scores = [0.0] * len(candidates)

        ranked = rank_candidates(candidates, skill_scores, rag_scores, hr_scores, final_weights)
        save("ranked", ranked)

    st.success("Scoring complete!")
    ranked_existing = ranked

if ranked_existing:
    top = select_top_n(ranked_existing, n=int(top_n), threshold=threshold)
    st.subheader(f"Top {len(top)} Candidates (of {len(ranked_existing)} total)")

    rows = []
    for r in top:
        c = r["candidate"]
        rows.append({
            "Rank": r["rank"],
            "Name": c.get("name", "Unknown"),
            "Final Score": f"{r['final_score']:.1%}",
            "Skill Score": f"{r['skill_score']:.1%}",
            "RAG Score": f"{r['rag_score']:.1%}",
            "HR Score": f"{r['hr_score']:.1%}",
            "Skill Match": f"{r['skill_match']:.1%}",
            "Total Exp (yrs)": c.get("total_years", 0),
            "Matched Skills": ", ".join(r.get("matched_required", [])[:4]),
        })

    df = pd.DataFrame(rows)
    st.dataframe(df, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Detailed Score Breakdown")
    for r in top:
        c = r["candidate"]
        with st.expander(f"#{r['rank']} {c.get('name', 'Unknown')} — Final: {r['final_score']:.1%}"):
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Skill Score", f"{r['skill_score']:.1%}")
            col2.metric("RAG Score", f"{r['rag_score']:.1%}")
            col3.metric("HR Score", f"{r['hr_score']:.1%}")
            col4.metric("Final Score", f"{r['final_score']:.1%}")

            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown("**Matched Required Skills:**")
                st.markdown(", ".join(r.get("matched_required", [])) or "None")
                st.markdown("**Matched Preferred Skills:**")
                st.markdown(", ".join(r.get("matched_preferred", [])) or "None")
            with col_b:
                st.markdown(f"**Skill Match:** {r['skill_match']:.1%}")
                st.markdown(f"**Skill Exp Score:** {r['skill_exp_score']:.1%}")
                st.markdown(f"**Total Exp Score:** {r['total_exp_score']:.1%}")
                st.markdown(f"**Bonus Score:** {r['bonus_score']:.1%}")

    st.divider()
    csv_rows = []
    for r in ranked_existing:
        c = r["candidate"]
        csv_rows.append({
            "Rank": r["rank"],
            "Name": c.get("name", ""),
            "Email": c.get("email", ""),
            "Total Experience": c.get("total_years", 0),
            "Final Score": r["final_score"],
            "Skill Score": r["skill_score"],
            "RAG Score": r["rag_score"],
            "HR Score": r["hr_score"],
            "Matched Required Skills": ", ".join(r.get("matched_required", [])),
            "Matched Preferred Skills": ", ".join(r.get("matched_preferred", [])),
        })
    csv_df = pd.DataFrame(csv_rows)
    st.download_button(
        "Download Full Rankings CSV",
        csv_df.to_csv(index=False),
        file_name="candidate_rankings.csv",
        mime="text/csv",
    )

    st.info("Next: Go to **HR Evaluation** to evaluate top candidates with qualifier questions.")
