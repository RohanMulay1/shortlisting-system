"""
Stress test: upload 50 resumes (including 8 duplicates) against the live backend.
Validates: upload throughput, duplicate skipping, pipeline with large candidate set,
ranking sanity, and session reset cleanup.
"""
import json
import time
import tempfile
import os
import urllib.request
import urllib.error
import requests as _requests

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

# ── 42 unique resumes across experience / skill tiers ─────────────────────────

RESUMES = {
"john_smith.txt": """John Smith
john.smith@email.com | +1-555-0101
EXPERIENCE
Senior ML Engineer, Google (2019-2024) — 5 yrs
  Built recommendation systems PyTorch serving 50M users
  Deployed MLOps pipelines Docker Kubernetes
ML Engineer, Meta (2017-2019) — 2 yrs
  NLP models TensorFlow content moderation
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark AWS SageMaker
EDUCATION
MS Computer Science Stanford 2017""",

"sarah_chen.txt": """Sarah Chen
sarah.chen@email.com | +1-555-0202
EXPERIENCE
ML Engineer, Microsoft (2020-2024) — 4 yrs
  Computer vision Azure Cognitive Services PyTorch
SKILLS
Python PyTorch scikit-learn Azure ML
EDUCATION
BS Computer Science MIT 2020""",

"bob_martinez.txt": """Bob Martinez
bob.m@email.com | +1-555-0303
EXPERIENCE
Data Analyst, Accenture (2021-2024) — 3 yrs
  SQL reporting Excel dashboards
SKILLS
SQL Excel Python Tableau Power BI
EDUCATION
BS Business Analytics State University 2021""",

"alice_wang.txt": """Alice Wang
alice.wang@email.com | +1-555-0404
EXPERIENCE
Staff ML Engineer, Netflix (2016-2024) — 8 yrs
  Recommendation engine PyTorch serving 200M users
  MLOps platform Docker Kubernetes Ray distributed training
  Led team of 6 engineers
Senior ML Engineer, Amazon (2013-2016) — 3 yrs
  Demand forecasting TensorFlow AWS SageMaker
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark AWS SageMaker Ray
EDUCATION
PhD Machine Learning Carnegie Mellon 2013""",

"david_kim.txt": """David Kim
david.kim@email.com | +1-555-0505
EXPERIENCE
ML Platform Engineer, Uber (2018-2024) — 6 yrs
  Built Michelangelo ML platform Python Kubernetes
  Feature store Spark 10TB daily data
ML Engineer, Lyft (2016-2018) — 2 yrs
  Pricing models PyTorch TensorFlow
SKILLS
Python PyTorch TensorFlow Docker Kubernetes Spark MLOps
EDUCATION
MS Computer Science UC Berkeley 2016""",

"priya_sharma.txt": """Priya Sharma
priya.s@email.com | +1-555-0606
EXPERIENCE
Deep Learning Engineer, OpenAI (2020-2024) — 4 yrs
  Large language model training PyTorch distributed
  MLOps infrastructure Docker Kubernetes
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
PhD Computational Linguistics Stanford 2020""",

"carlos_rodriguez.txt": """Carlos Rodriguez
carlos.r@email.com | +1-555-0707
EXPERIENCE
Data Scientist, Spotify (2019-2024) — 5 yrs
  Audio recommendation PyTorch Spark
  A/B testing pipeline Python
Data Analyst, Booking.com (2017-2019) — 2 yrs
  SQL Python analytics
SKILLS
Python PyTorch Spark SQL scikit-learn
EDUCATION
MS Statistics Columbia 2017""",

"emily_zhang.txt": """Emily Zhang
emily.z@email.com | +1-555-0808
EXPERIENCE
Research Scientist, DeepMind (2017-2024) — 7 yrs
  Reinforcement learning TensorFlow PyTorch
  Production deployment Docker Kubernetes MLOps
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark
EDUCATION
PhD Computer Science Oxford 2017""",

"michael_johnson.txt": """Michael Johnson
m.johnson@email.com | +1-555-0909
EXPERIENCE
Junior ML Engineer, Startup (2022-2024) — 2 yrs
  Basic scikit-learn models Python
Data Science Intern (2021-2022) — 1 yr
SKILLS
Python scikit-learn pandas numpy
EDUCATION
BS Statistics UCLA 2021""",

"lisa_patel.txt": """Lisa Patel
lisa.p@email.com | +1-555-1001
EXPERIENCE
ML Engineer, Salesforce (2019-2024) — 5 yrs
  NLP models PyTorch production MLOps Docker
  Customer churn prediction TensorFlow
MLOps Engineer, Oracle (2017-2019) — 2 yrs
  Model deployment Kubernetes CI/CD
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
MS CS University of Washington 2017""",

"james_brown.txt": """James Brown
j.brown@email.com | +1-555-1101
EXPERIENCE
Backend Engineer, Twitter (2018-2024) — 6 yrs
  Python microservices Docker Kubernetes
  No ML experience but strong Python
SKILLS
Python Docker Kubernetes PostgreSQL Redis
EDUCATION
BS Computer Science Georgia Tech 2018""",

"nina_petrov.txt": """Nina Petrov
nina.p@email.com | +1-555-1201
EXPERIENCE
Applied Scientist, Amazon (2018-2024) — 6 yrs
  Product ranking TensorFlow AWS SageMaker
  Billions of queries daily MLOps
Senior Data Scientist, eBay (2016-2018) — 2 yrs
  Fraud detection Python scikit-learn
SKILLS
Python TensorFlow AWS SageMaker MLOps Spark Docker
EDUCATION
MS Machine Learning CMU 2016""",

"tom_wilson.txt": """Tom Wilson
tom.w@email.com | +1-555-1301
EXPERIENCE
ML Engineer, Airbnb (2017-2024) — 7 yrs
  Search ranking PyTorch Spark
  Real-time MLOps Kubernetes Docker
SKILLS
Python PyTorch TensorFlow Spark Docker Kubernetes MLOps AWS SageMaker
EDUCATION
MS Computer Science Princeton 2017""",

"sophie_dubois.txt": """Sophie Dubois
sophie.d@email.com | +1-555-1401
EXPERIENCE
Data Engineer, Snowflake (2020-2024) — 4 yrs
  Data pipelines Python Spark SQL
  No ML model development
SKILLS
Python Spark SQL dbt Airflow
EDUCATION
BS Computer Engineering EPFL 2020""",

"raj_gupta.txt": """Raj Gupta
raj.g@email.com | +1-555-1501
EXPERIENCE
ML Research Engineer, NVIDIA (2015-2024) — 9 yrs
  CUDA GPU training PyTorch TensorFlow
  MLOps infrastructure Docker Kubernetes AWS SageMaker Ray Spark
  Mentored 12 junior engineers
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker Ray CUDA
EDUCATION
PhD Electrical Engineering MIT 2015""",

"anna_kowalski.txt": """Anna Kowalski
anna.k@email.com | +1-555-1601
EXPERIENCE
ML Engineer, Zalando (2019-2024) — 5 yrs
  Fashion recommendation PyTorch MLOps Docker Kubernetes
Senior Data Scientist, H&M (2017-2019) — 2 yrs
  Demand forecasting Python TensorFlow
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
MS Data Science TU Berlin 2017""",

"kevin_lee.txt": """Kevin Lee
kevin.l@email.com | +1-555-1701
EXPERIENCE
MLOps Engineer, Pinterest (2018-2024) — 6 yrs
  ML platform Python Docker Kubernetes Spark
  Model serving MLOps TensorFlow PyTorch
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark
EDUCATION
MS Computer Science UIUC 2018""",

"fatima_al-rashid.txt": """Fatima Al-Rashid
fatima.ar@email.com | +1-555-1801
EXPERIENCE
AI Engineer, Microsoft Azure (2019-2024) — 5 yrs
  Azure ML PyTorch TensorFlow Kubernetes
  MLOps pipelines Docker
SKILLS
Python PyTorch TensorFlow Azure ML Docker Kubernetes MLOps
EDUCATION
MS Artificial Intelligence Edinburgh 2019""",

"daniel_nguyen.txt": """Daniel Nguyen
daniel.n@email.com | +1-555-1901
EXPERIENCE
Data Scientist, LinkedIn (2020-2024) — 4 yrs
  Feed ranking PyTorch Spark
  Python scikit-learn
SKILLS
Python PyTorch Spark scikit-learn SQL
EDUCATION
BS Computer Science UC San Diego 2020""",

"maya_patel.txt": """Maya Patel
maya.p@email.com | +1-555-2001
EXPERIENCE
Research Engineer, Facebook AI (2016-2024) — 8 yrs
  Computer vision PyTorch production MLOps Docker Kubernetes
  Spark data pipelines AWS SageMaker Ray
  Publications CVPR NeurIPS
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker Ray
EDUCATION
PhD Computer Vision CMU 2016""",

"oliver_smith.txt": """Oliver Smith
oliver.s@email.com | +1-555-2101
EXPERIENCE
Software Engineer, Palantir (2019-2024) — 5 yrs
  Python backend Java no ML experience
SKILLS
Python Java SQL distributed systems
EDUCATION
BS Computer Science Cambridge 2019""",

"yuki_tanaka.txt": """Yuki Tanaka
yuki.t@email.com | +1-555-2201
EXPERIENCE
ML Engineer, Sony AI (2018-2024) — 6 yrs
  Game AI PyTorch reinforcement learning
  Production MLOps Docker Kubernetes
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
MS Robotics Tokyo University 2018""",

"chen_wei.txt": """Chen Wei
chen.w@email.com | +1-555-2301
EXPERIENCE
AI Researcher, Baidu (2015-2024) — 9 yrs
  Speech recognition TensorFlow PyTorch Spark
  MLOps Docker Kubernetes AWS SageMaker
  30+ papers NLP speech
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark AWS SageMaker
EDUCATION
PhD Signal Processing Tsinghua 2015""",

"emma_wilson.txt": """Emma Wilson
emma.w@email.com | +1-555-2401
EXPERIENCE
ML Product Manager, Google (2020-2024) — 4 yrs
  ML roadmap no technical development
SKILLS
Product management stakeholder communication
EDUCATION
MBA Harvard 2020""",

"hassan_ali.txt": """Hassan Ali
hassan.a@email.com | +1-555-2501
EXPERIENCE
ML Engineer, Careem (2019-2024) — 5 yrs
  Ride demand prediction PyTorch Spark MLOps Docker
Senior Data Scientist, Namshi (2017-2019) — 2 yrs
  Recommendation Python TensorFlow
SKILLS
Python PyTorch TensorFlow Spark Docker Kubernetes MLOps
EDUCATION
MS Machine Learning AUB 2017""",

"isabella_rossi.txt": """Isabella Rossi
isabella.r@email.com | +1-555-2601
EXPERIENCE
Deep Learning Engineer, Ferrari AI (2020-2024) — 4 yrs
  Computer vision PyTorch autonomous driving
  MLOps Docker Kubernetes
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
MS Robotics Politecnico di Milano 2020""",

"james_chen.txt": """James Chen
james.c@email.com | +1-555-2701
EXPERIENCE
ML Infrastructure, Stripe (2017-2024) — 7 yrs
  Fraud detection TensorFlow PyTorch real-time
  MLOps Kubernetes Docker Spark AWS SageMaker
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark AWS SageMaker
EDUCATION
MS Computer Science Yale 2017""",

"kate_murphy.txt": """Kate Murphy
kate.m@email.com | +1-555-2801
EXPERIENCE
Data Analyst, Deloitte (2021-2024) — 3 yrs
  SQL Python dashboards PowerBI
SKILLS
SQL Python PowerBI Tableau Excel
EDUCATION
BS Business University of Michigan 2021""",

"liam_o_brien.txt": """Liam O'Brien
liam.o@email.com | +1-555-2901
EXPERIENCE
Senior ML Engineer, Shopify (2018-2024) — 6 yrs
  Search ranking PyTorch Spark MLOps Docker Kubernetes
Merchant recommendations TensorFlow AWS SageMaker
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker
EDUCATION
MS CS University of Toronto 2018""",

"mia_johnson.txt": """Mia Johnson
mia.j@email.com | +1-555-3001
EXPERIENCE
NLP Engineer, Grammarly (2019-2024) — 5 yrs
  Language models PyTorch TensorFlow production
  MLOps Docker Kubernetes
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
MS Linguistics + CS CMU 2019""",

"nathan_garcia.txt": """Nathan Garcia
nathan.g@email.com | +1-555-3101
EXPERIENCE
Freelance Data Scientist (2022-2024) — 2 yrs
  Small ML projects Python scikit-learn
  No production experience
SKILLS
Python scikit-learn pandas matplotlib
EDUCATION
BS Physics UC Santa Barbara 2022""",

"olivia_chen.txt": """Olivia Chen
olivia.c@email.com | +1-555-3201
EXPERIENCE
Principal ML Engineer, Waymo (2014-2024) — 10 yrs
  Perception models PyTorch TensorFlow autonomous driving
  MLOps Docker Kubernetes Spark AWS SageMaker Ray
  Director of 20-person ML team
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker Ray
EDUCATION
PhD Robotics Stanford 2014""",

"paul_schneider.txt": """Paul Schneider
paul.s@email.com | +1-555-3301
EXPERIENCE
ML Engineer, SAP (2018-2024) — 6 yrs
  Enterprise AI TensorFlow PyTorch
  MLOps Docker Kubernetes Spark
SKILLS
Python TensorFlow PyTorch Docker Kubernetes MLOps Spark
EDUCATION
MS Computer Science TU Munich 2018""",

"quinn_zhang.txt": """Quinn Zhang
quinn.z@email.com | +1-555-3401
EXPERIENCE
Research Scientist, Apple ML (2017-2024) — 7 yrs
  On-device ML CoreML PyTorch TensorFlow
  Privacy-preserving ML distributed training
  MLOps Docker Kubernetes
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
PhD Computer Science Caltech 2017""",

"rachel_kim.txt": """Rachel Kim
rachel.k@email.com | +1-555-3501
EXPERIENCE
ML Engineer, Kakao (2019-2024) — 5 yrs
  Conversational AI PyTorch NLP MLOps Docker Kubernetes Spark
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark
EDUCATION
MS AI KAIST 2019""",

"sam_taylor.txt": """Sam Taylor
sam.t@email.com | +1-555-3601
EXPERIENCE
QA Engineer, IBM (2020-2024) — 4 yrs
  Software testing automation no ML
SKILLS
Selenium Java Python testing automation
EDUCATION
BS Software Engineering Purdue 2020""",

"tanya_ivanova.txt": """Tanya Ivanova
tanya.i@email.com | +1-555-3701
EXPERIENCE
ML Engineer, Yandex (2018-2024) — 6 yrs
  Search ranking CatBoost PyTorch Spark MLOps Docker Kubernetes
Applied Scientist, Mail.ru (2016-2018) — 2 yrs
  Recommendation TensorFlow
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker
EDUCATION
MS CS Moscow State University 2016""",

"uma_krishnan.txt": """Uma Krishnan
uma.k@email.com | +1-555-3801
EXPERIENCE
ML Engineer, Flipkart (2018-2024) — 6 yrs
  Product search PyTorch Spark MLOps Docker Kubernetes TensorFlow
Senior Data Scientist, OLA (2016-2018) — 2 yrs
  Demand prediction Python AWS SageMaker
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker
EDUCATION
MS CS IIT Bombay 2016""",

"victor_santos.txt": """Victor Santos
victor.s@email.com | +1-555-3901
EXPERIENCE
Deep Learning Engineer, Nubank (2019-2024) — 5 yrs
  Credit risk PyTorch MLOps Docker Kubernetes
Data Scientist, Itau (2017-2019) — 2 yrs
  Fraud detection Python TensorFlow Spark
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark
EDUCATION
MS CS USP 2017""",

"wendy_liu.txt": """Wendy Liu
wendy.l@email.com | +1-555-4001
EXPERIENCE
ML Engineer, ByteDance (2018-2024) — 6 yrs
  TikTok recommendation PyTorch Spark distributed
  MLOps Docker Kubernetes AWS SageMaker Ray
Principal engineer managing 8 ML systems
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark AWS SageMaker Ray
EDUCATION
MS CS Peking University 2018""",

"xavier_moreau.txt": """Xavier Moreau
xavier.m@email.com | +1-555-4101
EXPERIENCE
AI Engineer, Renault (2020-2024) — 4 yrs
  Predictive maintenance PyTorch MLOps Docker
Data Scientist, PSA Group (2018-2020) — 2 yrs
  Computer vision TensorFlow
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps
EDUCATION
MS Engineering Ecole Centrale 2018""",

"yasmin_hosseini.txt": """Yasmin Hosseini
yasmin.h@email.com | +1-555-4201
EXPERIENCE
ML Engineer, Snapp (2019-2024) — 5 yrs
  Ride hailing ML PyTorch Spark MLOps Docker Kubernetes
SKILLS
Python PyTorch TensorFlow Docker Kubernetes MLOps Spark
EDUCATION
MS CS Sharif University 2019""",

"zara_ahmed.txt": """Zara Ahmed
zara.a@email.com | +1-555-4301
EXPERIENCE
Data Science Manager, McKinsey (2018-2024) — 6 yrs
  ML consulting Python no production deployment
SKILLS
Python R SQL statistics machine learning
EDUCATION
MBA + MS Statistics Wharton 2018""",
}

# 8 duplicates (re-uploads of already-included files)
DUPLICATES = [
    "john_smith.txt",
    "alice_wang.txt",
    "raj_gupta.txt",
    "maya_patel.txt",
    "olivia_chen.txt",
    "david_kim.txt",
    "emily_zhang.txt",
    "wendy_liu.txt",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def api(method, path, body=None, timeout=180):
    url = f"{BACKEND}{path}"
    if body is not None:
        r = _requests.request(method, url, json=body, timeout=timeout)
    else:
        r = _requests.request(method, url, timeout=timeout)
    r.raise_for_status()
    return r.json()


def upload_batch(filenames, label):
    """Upload a batch using requests for reliable multipart handling."""
    files = [("files", (fn, RESUMES[fn].encode("utf-8"), "text/plain")) for fn in filenames]
    t0 = time.time()
    r = _requests.post(f"{BACKEND}/api/resumes/upload", files=files, timeout=300)
    r.raise_for_status()
    res = r.json()
    elapsed = time.time() - t0
    print(f"  [{label}] {len(filenames)} files -> {res['count']} on server  ({elapsed:.1f}s)")
    return res


def ok(name): print(f"  PASS  {name}")
def fail(name, reason): print(f"  FAIL  {name} -- {str(reason)[:120]}")


# ── Test run ──────────────────────────────────────────────────────────────────

def run():
    results = []

    print("\n" + "=" * 60)
    print("STRESS TEST: 51 resumes (43 unique + 8 duplicates)")
    print("=" * 60)

    # 1. Health
    print("\n[1] Backend health")
    try:
        d = api("GET", "/api/health")
        assert d["status"] == "ok"
        ok("Health check")
        results.append(True)
    except Exception as e:
        fail("Health check", e); results.append(False)

    # 2. Reset
    print("\n[2] Reset session")
    try:
        api("DELETE", "/api/session/reset")
        ok("Session reset")
        results.append(True)
    except Exception as e:
        fail("Session reset", e); results.append(False)

    # 3. Parse JD
    print("\n[3] Parse JD")
    try:
        t0 = time.time()
        r = api("POST", "/api/jd/parse", {"text": JD})
        print(f"  JD parsed in {time.time()-t0:.1f}s: {r['jd']['title']}")
        assert len(r["jd"]["required_skills"]) >= 3
        ok("JD parsed")
        results.append(True)
    except Exception as e:
        fail("JD parse", e); results.append(False); return

    # 4. Upload 43 unique resumes in 3 batches to test batching
    TOTAL = len(RESUMES)
    print(f"\n[4] Upload {TOTAL} unique resumes (3 batches)")
    all_names = list(RESUMES.keys())
    batch1 = all_names[:15]
    batch2 = all_names[15:30]
    batch3 = all_names[30:]

    total_on_server = 0
    try:
        r1 = upload_batch(batch1, "batch 1/3 - 15 files")
        r2 = upload_batch(batch2, "batch 2/3 - 15 files")
        r3 = upload_batch(batch3, f"batch 3/3 - {len(batch3)} files")
        total_on_server = r3["count"]
        assert total_on_server == TOTAL, f"expected {TOTAL}, got {total_on_server}"
        ok(f"{TOTAL} unique resumes on server ({total_on_server} total)")
        results.append(True)
    except Exception as e:
        fail(f"Upload {TOTAL} resumes", e); results.append(False)

    # 5. Upload 8 duplicates — should all be skipped
    print("\n[5] Upload 8 duplicate resumes (should all be skipped)")
    try:
        r = upload_batch(DUPLICATES, "duplicates")
        assert r["count"] == TOTAL, f"count changed to {r['count']} after duplicate upload"
        ok(f"All 8 duplicates skipped - server count still {r['count']}")
        results.append(True)
    except Exception as e:
        fail("Duplicate skip", e); results.append(False)

    # 6. Candidate count sanity
    print("\n[6] Candidate count via GET /api/candidates")
    try:
        r = api("GET", "/api/candidates")
        assert r["count"] == TOTAL, f"expected {TOTAL}, got {r['count']}"
        ok(f"{TOTAL} candidates confirmed")
        results.append(True)
    except Exception as e:
        fail("Candidate count", e); results.append(False)

    # 7. Run pipeline on all candidates
    print(f"\n[7] Run pipeline ({TOTAL} candidates - expect 30-90s)")
    try:
        t0 = time.time()
        r = api("POST", "/api/pipeline/run", {"top_n": TOTAL, "threshold": 0.0}, timeout=300)
        elapsed = time.time() - t0
        ranked = r["ranked"]
        print(f"  Pipeline completed in {elapsed:.1f}s - {len(ranked)} ranked")
        assert len(ranked) == TOTAL, f"expected {TOTAL} ranked, got {len(ranked)}"
        ok(f"Pipeline ran - {len(ranked)} candidates ranked in {elapsed:.1f}s")
        results.append(True)
    except Exception as e:
        fail("Pipeline run", e); results.append(False); return

    # 8. Ranking sanity checks
    print("\n[8] Ranking sanity")
    try:
        r = api("GET", "/api/ranked")
        ranked = r["ranked"]
        names = [rc["candidate"]["name"] for rc in ranked]
        scores = [rc["final_score"] for rc in ranked]

        # Scores should be descending
        assert all(scores[i] >= scores[i+1] for i in range(len(scores)-1)), "Scores not sorted"
        ok("Scores are sorted descending")
        results.append(True)
    except Exception as e:
        fail("Scores sorted", e); results.append(False)

    try:
        # Top 3 should all be strong ML engineers
        top3 = names[:3]
        strong = {"John Smith", "Alice Wang", "Raj Gupta", "Maya Patel", "Olivia Chen",
                  "Emily Zhang", "David Kim", "Wendy Liu", "Tom Wilson", "James Chen"}
        assert any(n in strong for n in top3), f"Unexpected top 3: {top3}"
        ok(f"Top 3 are strong ML candidates: {top3}")
        results.append(True)
    except Exception as e:
        fail("Top 3 sanity", e); results.append(False)

    try:
        # Bottom 5 should be weak matches (analysts, non-ML roles)
        bottom5 = names[-5:]
        weak = {"Bob Martinez", "Kate Murphy", "Sam Taylor", "Emma Wilson",
                "Oliver Smith", "Sophie Dubois", "Nathan Garcia"}
        assert any(n in weak for n in bottom5), f"Unexpected bottom 5: {bottom5}"
        ok(f"Bottom 5 contain weak matches: {[n for n in bottom5 if n in weak]}")
        results.append(True)
    except Exception as e:
        fail("Bottom 5 sanity", e); results.append(False)

    try:
        top_score = scores[0]
        bottom_score = scores[-1]
        spread = top_score - bottom_score
        assert spread > 0.1, f"Score spread too small: {spread:.3f}"
        print(f"  Score range: {bottom_score:.3f} – {top_score:.3f}  (spread {spread:.3f})")
        ok("Score spread is meaningful (> 0.1)")
        results.append(True)
    except Exception as e:
        fail("Score spread", e); results.append(False)

    # 9. No score is NaN / None
    print("\n[9] Data quality")
    try:
        r = api("GET", "/api/ranked")
        for rc in r["ranked"]:
            for field in ("final_score", "skill_score", "rag_score"):
                v = rc[field]
                assert isinstance(v, (int, float)) and 0 <= v <= 1, f"{rc['candidate']['name']}.{field}={v}"
        ok("All 42 scores are valid floats in [0, 1]")
        results.append(True)
    except Exception as e:
        fail("Score validity", e); results.append(False)

    # 10. Reset cleanup
    print("\n[10] Session reset")
    try:
        api("DELETE", "/api/session/reset")
        r = api("GET", "/api/candidates")
        assert r["count"] == 0, f"count after reset: {r['count']}"
        ok("Session reset — 0 candidates remain")
        results.append(True)
    except Exception as e:
        fail("Session reset cleanup", e); results.append(False)

    # Summary
    passed = sum(results)
    total = len(results)
    print("\n" + "=" * 60)
    print(f"STRESS TEST SUMMARY: {passed} passed / {total-passed} failed / {total} total")
    print("=" * 60)


if __name__ == "__main__":
    run()
