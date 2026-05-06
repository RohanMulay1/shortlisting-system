import streamlit as st
import pandas as pd
from backend.qualifier import generate_questions
from backend.ranker import rank_candidates, select_top_n
from backend.state import save, load

st.set_page_config(page_title="HR Evaluation", page_icon="✅", layout="wide")
st.title("Step 4: HR Evaluation & Final Shortlist")

jd = load("jd_parsed")
candidates = load("candidates", [])
ranked = load("ranked", [])
skill_scores = load("skill_scores", [])
rag_scores = load("rag_scores", [])

if not jd:
    st.warning("Please complete Step 1 (Upload JD) first.")
    st.stop()
if not ranked:
    st.warning("Please complete Step 3 (Rankings) first.")
    st.stop()

with st.sidebar:
    eval_top_n = st.number_input(
        "Evaluate Top N candidates",
        min_value=1,
        max_value=len(ranked),
        value=min(5, len(ranked)),
    )
    st.divider()
    fw_skill = st.slider("Skill Weight", 0.0, 1.0, 0.50, 0.05, key="hr_fw_skill")
    fw_rag = st.slider("RAG Weight", 0.0, 1.0, 0.30, 0.05, key="hr_fw_rag")
    fw_hr = st.slider("HR Weight", 0.0, 1.0, 0.20, 0.05, key="hr_fw_hr")

final_weights = {"skill": fw_skill, "rag": fw_rag, "hr": fw_hr}

top_candidates = ranked[:int(eval_top_n)]

st.subheader(f"Evaluating Top {len(top_candidates)} Candidates")
st.markdown("For each candidate, rate their qualifier answers on a scale of 0-10. The system will compute the final score.")

qualifier_cache = load("qualifier_questions", {})
hr_evaluations = load("hr_evaluations", {})

for entry in top_candidates:
    c = entry["candidate"]
    name = c.get("name", "Unknown")
    filename = c.get("filename", name)
    key = filename

    with st.expander(f"#{entry['rank']} {name} — Current Final Score: {entry['final_score']:.1%}", expanded=(entry["rank"] == 1)):
        col1, col2 = st.columns([1, 1])
        with col1:
            st.markdown(f"**Experience:** {c.get('total_years', 0)} years")
            st.markdown(f"**Skills:** {', '.join(c.get('skills', [])[:8])}")
            st.markdown(f"**Summary:** {c.get('summary', 'N/A')}")
        with col2:
            st.markdown(f"**Skill Score:** {entry['skill_score']:.1%}")
            st.markdown(f"**RAG Score:** {entry['rag_score']:.1%}")
            st.markdown(f"**Matched Skills:** {', '.join(entry.get('matched_required', []))}")

        st.divider()

        if key not in qualifier_cache:
            if st.button(f"Generate Qualifier Questions for {name}", key=f"gen_{key}"):
                with st.spinner(f"Generating questions for {name}..."):
                    c_with_match = dict(c)
                    c_with_match["matched_required"] = entry.get("matched_required", [])
                    questions = generate_questions(jd, c_with_match)
                    qualifier_cache[key] = questions
                    save("qualifier_questions", qualifier_cache)
                st.rerun()
        else:
            questions = qualifier_cache[key]
            st.markdown("**Qualifier Questions & HR Ratings:**")

            existing_eval = hr_evaluations.get(key, {})
            ratings = []

            for qi, q in enumerate(questions):
                st.markdown(f"**Q{qi+1}:** {q}")
                rating = st.slider(
                    f"Rating (0-10)",
                    0, 10,
                    value=existing_eval.get(f"q{qi}", 5),
                    key=f"rating_{key}_{qi}",
                    label_visibility="collapsed",
                )
                ratings.append(rating)
                st.markdown("---")

            notes = st.text_area(
                "HR Notes / Feedback",
                value=existing_eval.get("notes", ""),
                key=f"notes_{key}",
                height=80,
            )

            if st.button(f"Save Evaluation for {name}", key=f"save_{key}", type="primary"):
                avg_rating = sum(ratings) / len(ratings) if ratings else 0
                hr_evaluations[key] = {
                    **{f"q{i}": r for i, r in enumerate(ratings)},
                    "notes": notes,
                    "avg_rating": avg_rating,
                    "hr_score_normalized": round(avg_rating / 10, 3),
                }
                save("hr_evaluations", hr_evaluations)
                st.success(f"Saved! Average HR Score: {avg_rating:.1f}/10")

st.divider()

if hr_evaluations:
    st.subheader("Final Scores with HR Evaluation")

    if st.button("Recompute Final Rankings with HR Scores", type="primary"):
        hr_scores_list = []
        for c in candidates:
            key = c.get("filename", c.get("name", ""))
            eval_data = hr_evaluations.get(key, {})
            hr_scores_list.append(eval_data.get("hr_score_normalized", 0.0))

        new_ranked = rank_candidates(candidates, skill_scores, rag_scores, hr_scores_list, final_weights)
        save("ranked", new_ranked)
        save("hr_scores", hr_scores_list)
        st.success("Rankings updated with HR scores!")
        st.rerun()

    st.markdown("**Saved HR Evaluations:**")
    eval_rows = []
    for key, eval_data in hr_evaluations.items():
        eval_rows.append({
            "Candidate": key,
            "HR Avg Score": f"{eval_data.get('avg_rating', 0):.1f}/10",
            "Normalized": f"{eval_data.get('hr_score_normalized', 0):.1%}",
            "Notes": eval_data.get("notes", "")[:60],
        })
    st.dataframe(pd.DataFrame(eval_rows), use_container_width=True, hide_index=True)

st.divider()
st.subheader("Final Shortlist")

final_ranked = load("ranked", [])
final_top_n = st.number_input("Final Shortlist Size", min_value=1, max_value=len(final_ranked), value=min(5, len(final_ranked)), key="final_n")
min_threshold = st.slider("Minimum Final Score", 0.0, 1.0, 0.0, 0.05, key="final_thresh")

final_shortlist = select_top_n(final_ranked, n=int(final_top_n), threshold=min_threshold)

shortlist_rows = []
for r in final_shortlist:
    c = r["candidate"]
    key = c.get("filename", c.get("name", ""))
    eval_data = hr_evaluations.get(key, {})
    shortlist_rows.append({
        "Rank": r["rank"],
        "Name": c.get("name", "Unknown"),
        "Email": c.get("email", ""),
        "Experience (yrs)": c.get("total_years", 0),
        "Final Score": f"{r['final_score']:.1%}",
        "Skill Score": f"{r['skill_score']:.1%}",
        "RAG Score": f"{r['rag_score']:.1%}",
        "HR Score": f"{r['hr_score']:.1%}",
        "HR Notes": eval_data.get("notes", ""),
        "Matched Skills": ", ".join(r.get("matched_required", [])),
        "Status": "SHORTLISTED",
    })

if shortlist_rows:
    st.dataframe(pd.DataFrame(shortlist_rows), use_container_width=True, hide_index=True)

    csv_df = pd.DataFrame(shortlist_rows)
    st.download_button(
        "Download Final Shortlist CSV",
        csv_df.to_csv(index=False),
        file_name="final_shortlist.csv",
        mime="text/csv",
        type="primary",
    )
else:
    st.info("No candidates meet the current threshold. Lower the minimum score or adjust weights.")
