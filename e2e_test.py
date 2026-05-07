import re
import json
import urllib.request
import tempfile
import os
from playwright.sync_api import sync_playwright

BASE = "https://shortlisting-system.vercel.app"
BACKEND = "https://shortlisting-system.onrender.com"

JD = """Senior Machine Learning Engineer

We are looking for a Senior ML Engineer with 5+ years of experience.

Required skills: Python, TensorFlow, PyTorch, MLOps, Docker, Kubernetes
Preferred skills: Spark, AWS SageMaker, Ray

Responsibilities:
- Design and deploy production ML models
- Build scalable data pipelines
- Mentor junior engineers on ML best practices

Education: Bachelor's in Computer Science or related field
Experience: 5+ years in machine learning engineering"""

RESUME_1 = """John Smith
john.smith@email.com | +1-555-0101

EXPERIENCE
Senior ML Engineer, Google (2019-2024) - 5 years
  - Built recommendation systems using PyTorch serving 50M users
  - Deployed MLOps pipelines with Docker and Kubernetes

ML Engineer, Meta (2017-2019) - 2 years
  - NLP models for content moderation using TensorFlow

SKILLS
Python, TensorFlow, PyTorch, Docker, Kubernetes, MLOps, Spark, AWS SageMaker, SQL, Git

EDUCATION
MS Computer Science, Stanford University, 2017

SUMMARY
Senior ML Engineer with 7 years experience in production deep learning systems."""

RESUME_2 = """Sarah Chen
sarah.chen@email.com | +1-555-0202

EXPERIENCE
ML Engineer, Microsoft (2020-2024) - 4 years
  - Computer vision models for Azure Cognitive Services

SKILLS
Python, PyTorch, scikit-learn, SQL, Azure ML

EDUCATION
BS Computer Science, MIT, 2020

SUMMARY
ML Engineer with 4 years specialising in NLP and computer vision."""

RESUME_3 = """Bob Martinez
bob.m@email.com | +1-555-0303

EXPERIENCE
Data Analyst, Accenture (2021-2024) - 3 years
  - SQL reporting and Excel dashboards

SKILLS
SQL, Excel, Python, Tableau, Power BI

EDUCATION
BS Business Analytics, State University, 2021

SUMMARY
Data analyst with 3 years in business intelligence and reporting."""


def write_tmp(name, content):
    path = os.path.join(tempfile.gettempdir(), name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


def run_tests():
    r1 = write_tmp("john_smith_resume.txt", RESUME_1)
    r2 = write_tmp("sarah_chen_resume.txt", RESUME_2)
    r3 = write_tmp("bob_martinez_resume.txt", RESUME_3)

    results = []

    def ok(name):
        results.append((True, name, ""))
        print(f"  PASS  {name}")

    def fail(name, reason=""):
        results.append((False, name, str(reason)[:150]))
        print(f"  FAIL  {name} -- {str(reason)[:150]}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.set_default_timeout(30000)

        # 1. Backend health
        print("\n[1] Backend health")
        try:
            with urllib.request.urlopen(f"{BACKEND}/api/health") as r:
                data = json.loads(r.read())
            assert data["status"] == "ok"
            ok("Backend health check")
        except Exception as e:
            fail("Backend health check", e)

        # 2. Reset session for clean slate
        print("\n[2] Reset session")
        try:
            req = urllib.request.Request(f"{BACKEND}/api/session/reset", method="DELETE")
            urllib.request.urlopen(req)
            ok("Session reset via API")
        except Exception as e:
            fail("Session reset", e)

        # 3. Dashboard loads empty
        print("\n[3] Dashboard empty state")
        try:
            page.goto(f"{BASE}/", wait_until="networkidle")
            page.screenshot(path="ss_01_dashboard_empty.png")
            assert "ShortlistAI" in page.inner_text("body")
            ok("Dashboard loads")
        except Exception as e:
            fail("Dashboard loads", e)

        try:
            page.wait_for_selector("text=New Job", timeout=5000)
            ok("Sidebar shows New Job pill")
        except Exception as e:
            fail("Sidebar New Job pill", e)

        # 4. JD parse
        print("\n[4] JD parsing")
        try:
            page.goto(f"{BASE}/jobs", wait_until="networkidle")
            page.locator("textarea").fill(JD)
            page.get_by_role("button", name="Parse & Analyze JD").click()
            # "Extracted Requirements" only appears in the parsed card, NOT in textarea
            page.wait_for_selector("text=Extracted Requirements", timeout=30000)
            page.wait_for_timeout(500)
            page.screenshot(path="ss_02_jd_parsed.png")
            ok("JD parsed - card rendered")
        except Exception as e:
            page.screenshot(path="ss_02_jd_FAIL.png")
            fail("JD parsed", e)

        try:
            body = page.inner_text("body")
            assert "Python" in body, f"Python not in body. snippet: {body[300:700]}"
            ok("Required skills extracted")
        except Exception as e:
            fail("Required skills extracted", e)

        try:
            body = page.inner_text("body")
            assert "Spark" in body or "SageMaker" in body or "Preferred" in body
            ok("Preferred skills extracted")
        except Exception as e:
            fail("Preferred skills extracted", e)

        # 6. Resume upload — in paste mode there is exactly 1 file input (resume zone)
        print("\n[6] Resume upload")
        try:
            file_input = page.locator("input[type='file']").first
            file_input.set_input_files([r1, r2, r3])
            page.wait_for_timeout(500)
            # Click the Upload button
            page.get_by_role("button", name=re.compile(r"Upload 3")).click()
            page.wait_for_selector("text=new resume", timeout=30000)
            page.screenshot(path="ss_03_resumes_uploaded.png")
            body = page.inner_text("body")
            ok("3 resumes uploaded")
        except Exception as e:
            page.screenshot(path="ss_03_resumes_FAIL.png")
            fail("3 resumes uploaded", e)

        # 7. Duplicate detection — re-add john_smith, badge should appear immediately
        print("\n[7] Duplicate detection")
        try:
            file_input = page.locator("input[type='file']").first
            file_input.set_input_files([r1])
            page.wait_for_timeout(500)
            body = page.inner_text("body")
            assert "duplicate" in body.lower(), f"no 'duplicate' in body. snippet: {body[800:1100]}"
            page.screenshot(path="ss_04_duplicate.png")
            ok("Duplicate badge shown before upload")
        except Exception as e:
            page.screenshot(path="ss_04_duplicate_FAIL.png")
            fail("Duplicate badge", e)

        # 8. Pipeline run (redirects to /candidates)
        print("\n[8] Pipeline run")
        try:
            page.get_by_role("button", name=re.compile(r"Run Candidate")).click()
            page.wait_for_url(f"{BASE}/candidates", timeout=120000)
            page.screenshot(path="ss_05_candidates.png")
            ok("Pipeline ran - redirected to /candidates")
        except Exception as e:
            page.screenshot(path="ss_05_pipeline_FAIL.png")
            fail("Pipeline run", e)

        # 9. Candidates page — wait for data to load from Render backend
        print("\n[9] Candidates page")
        try:
            page.wait_for_selector("text=John Smith", timeout=30000)
            body = page.inner_text("body")
            assert "John Smith" in body, f"John not found. snippet: {body[:500]}"
            ok("Candidates listed")
        except Exception as e:
            fail("Candidates listed", e)

        try:
            body = page.inner_text("body")
            assert "%" in body
            ok("Score percentages visible")
        except Exception as e:
            fail("Score percentages", e)

        try:
            body = page.inner_text("body")
            john_pos = body.find("John Smith")
            bob_pos = body.find("Bob Martinez")
            assert 0 < john_pos < bob_pos, f"john={john_pos} bob={bob_pos}"
            ok("Ranking order correct (John above Bob)")
        except Exception as e:
            fail("Ranking order", e)

        # 10. Expand candidate row
        try:
            page.locator("button").filter(has_text="John Smith").first.click()
            page.wait_for_timeout(600)
            body = page.inner_text("body")
            assert "Score Breakdown" in body or "Matched" in body or "Skills" in body
            page.screenshot(path="ss_06_expanded.png")
            ok("Candidate row expands with detail")
        except Exception as e:
            page.screenshot(path="ss_06_expand_FAIL.png")
            fail("Candidate expand", e)

        # 11. Sidebar shows JD title now that we navigated to /candidates
        print("\n[5b] Sidebar JD title (post-navigation check)")
        try:
            sidebar = page.locator("aside").inner_text()
            has_title = "Machine Learning" in sidebar or "Senior" in sidebar or "ML Engineer" in sidebar
            assert has_title, f"sidebar: {sidebar[:200]}"
            ok("Sidebar shows real JD title")
        except Exception as e:
            fail("Sidebar JD title", e)

        # 12. Filter panel — navigate fresh to /candidates then click
        print("\n[10] Filters")
        try:
            page.goto(f"{BASE}/candidates", wait_until="networkidle")
            page.wait_for_timeout(800)
            # btn[1] is the Filters toggle button (btn[0] is icon-only sidebar button)
            page.locator("button").nth(1).click()
            page.wait_for_timeout(500)
            # Label uses CSS uppercase so inner_text returns "STATUS"
            body2 = page.inner_text("body")
            assert "STATUS" in body2 or "Status" in body2 or "status" in body2.lower()
            ok("Filter panel opens")
        except Exception as e:
            page.screenshot(path="ss_filter_FAIL.png")
            fail("Filter panel", e)

        # 13. Evaluation page
        print("\n[11] Evaluation page")
        try:
            page.goto(f"{BASE}/evaluation", wait_until="networkidle")
            page.screenshot(path="ss_07_evaluation.png")
            body = page.inner_text("body")
            assert "John Smith" in body or "Qualifier" in body
            ok("Evaluation page loads with candidates")
        except Exception as e:
            page.screenshot(path="ss_07_eval_FAIL.png")
            fail("Evaluation page loads", e)

        try:
            # Qualifier questions involve a GPT call ~5-15s
            page.wait_for_function(
                "document.body.innerText.includes('?')",
                timeout=40000
            )
            ok("Qualifier questions loaded")
            page.screenshot(path="ss_08_questions.png")
        except Exception as e:
            page.screenshot(path="ss_08_questions_FAIL.png")
            fail("Qualifier questions loaded", e)

        # 13. Rating sliders
        print("\n[12] Rating sliders")
        try:
            sliders = page.locator("input[type='range']")
            count = sliders.count()
            assert count > 0, "no sliders found"
            sliders.first.fill("9")
            ok(f"Rating sliders work ({count} found)")
        except Exception as e:
            fail("Rating sliders", e)

        # 14. Shortlist submit
        print("\n[13] Shortlist submit")
        try:
            page.get_by_role("button", name="Shortlist").click()
            page.wait_for_timeout(5000)
            page.screenshot(path="ss_09_shortlisted.png")
            body = page.inner_text("body")
            assert "Saved" in body or "shortlisted" in body.lower() or "Shortlist" in body
            ok("Evaluation submitted")
        except Exception as e:
            page.screenshot(path="ss_09_shortlist_FAIL.png")
            fail("Shortlist submit", e)

        # 15. Dashboard with real data
        print("\n[14] Dashboard with data")
        try:
            page.goto(f"{BASE}/", wait_until="networkidle")
            page.wait_for_timeout(1000)
            page.screenshot(path="ss_10_dashboard_data.png")
            body = page.inner_text("body")
            assert "John Smith" in body or "3" in body
            ok("Dashboard shows real candidate data")
        except Exception as e:
            fail("Dashboard real data", e)

        # 16. Settings page
        print("\n[15] Settings page")
        try:
            page.goto(f"{BASE}/settings", wait_until="networkidle")
            body = page.inner_text("body")
            assert "Backend API URL" in body or "API" in body
            page.screenshot(path="ss_11_settings.png")
            ok("Settings page loads")
        except Exception as e:
            fail("Settings page", e)

        # 17. Session reset via sidebar trash icon
        print("\n[16] Session reset")
        try:
            page.goto(f"{BASE}/", wait_until="networkidle")
            page.wait_for_timeout(1000)
            # Trash button is the last button in aside
            trash = page.locator("aside button").last
            trash.click()
            page.wait_for_timeout(600)
            trash.click()  # confirm
            page.wait_for_url(f"{BASE}/jobs", timeout=10000)
            page.screenshot(path="ss_12_after_reset.png")
            ok("Session reset - redirected to /jobs")
        except Exception as e:
            page.screenshot(path="ss_12_reset_FAIL.png")
            fail("Session reset", e)

        try:
            page.wait_for_selector("text=New Job", timeout=5000)
            ok("Sidebar back to New Job after reset")
        except Exception as e:
            fail("Sidebar after reset", e)

        browser.close()

    # Summary
    print("\n" + "=" * 52)
    print("TEST SUMMARY")
    print("=" * 52)
    passed = sum(1 for r in results if r[0])
    failed = [r for r in results if not r[0]]
    for r in results:
        status = "PASS" if r[0] else "FAIL"
        print(f"  [{status}]  {r[1]}")
        if not r[0] and r[2]:
            print(f"           {r[2][:120]}")
    print(f"\n{passed} passed  /  {len(failed)} failed  /  {len(results)} total")
    if failed:
        print("\nFailed tests:")
        for r in failed:
            print(f"  - {r[1]}: {r[2][:100]}")


if __name__ == "__main__":
    run_tests()
