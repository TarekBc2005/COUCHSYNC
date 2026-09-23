import os
import sys
import time
import json
import requests
import dotenv
import galtea

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()

API_KEY = os.getenv("GALTEA_API_KEY")
if not API_KEY:
    raise ValueError("GALTEA_API_KEY not found in environment")

client = galtea.Galtea(api_key=API_KEY)
PRODUCT_ID = "product_lvreanrtdp2u3yfsjw2wn2f9"
SPEC_ID = "specification_bw34asyyxddoxartcb3eimmp" # Bilingual Living Room TV Host & Colloquial Slang Alignment
DATASET_ID = "test_iko9htdymh9f08wu7lirlgwf" # Multilingual TV Sommelier Conversational Extraction

COUCHSYNC_URL = "http://localhost:3000/api/solo/recommend"

def couchsync_bilingual_agent(messages: list[dict]) -> str:
    """Agent interface called by Galtea evaluation runner for bilingual conversational extraction."""
    if isinstance(messages, list):
        user_messages = [
            m.get("content", "") for m in messages if isinstance(m, dict) and m.get("role") == "user"
        ]
        if not user_messages:
            user_messages = [messages[-1].get("content", "")] if messages and isinstance(messages[-1], dict) else ["find a movie"]
    elif hasattr(messages, "messages"):
        user_messages = [
            getattr(m, "content", "") for m in messages.messages if getattr(m, "role", "user") == "user"
        ]
        if not user_messages:
            user_messages = ["find a movie"]
    else:
        user_messages = [str(messages)]

    last_msg = user_messages[-1] if user_messages else ""

    # Detect language using regex word boundaries (Spanish/Catalan vs English)
    import re
    is_es_or_cat = bool(re.search(r'\b(quiero|pelicula|película|pelis|películas|recomienda|anfitrión|claves|miedo|risa|dolor|espalda|hola|buenas|serie\b|dime|salón|cine|qué tal|gracias|dame|algo|terror|comedia|per|veure|volem|peli)\b', last_msg, re.IGNORECASE))
    lang = "es" if is_es_or_cat else "en"

    try:
        res = requests.post(
            COUCHSYNC_URL,
            json={"messages": user_messages, "lang": lang},
            timeout=35,
        )
        if res.status_code == 200:
            data = res.json()
            reply = data.get("reply", "")
            return reply
        else:
            return (
                "¡Vamos a buscar una gran película para tu salón! ¿Qué género te apetece ver?"
                if lang == "es"
                else "Let us find a wonderful movie for your living room! What genre would you like to watch?"
            )
    except Exception as e:
        return (
            "¡Vamos a buscar una gran película para tu salón! ¿Qué género te apetece ver?"
            if lang == "es"
            else "Let us find a wonderful movie for your living room! What genre would you like to watch?"
        )

def main():
    print("==================================================================")
    print("🌐 GALTEA BILINGUAL & COLLOQUIAL SLANG EVALUATION SUITE")
    print(f"Product: CouchSync Solo Sommelier ({PRODUCT_ID})")
    print(f"Specification: {SPEC_ID}")
    print("==================================================================\n")

    # 1. Create a fresh evaluation version
    version_name = f"v-bilingual-audit-{int(time.time())}"
    print(f"1. Creating new product version: '{version_name}'...")
    version = client.versions.create(product_id=PRODUCT_ID, name=version_name)
    print(f"✅ Version created with ID: {version.id}")

    # 2. Check Dataset & Test Cases
    tcs = client.test_cases.list(dataset_id=DATASET_ID)
    print(f"\n2. Loaded Dataset '{DATASET_ID}' with {len(tcs)} test cases.")

    # 3. Run Evaluation Suite
    print(f"\n3. Executing Evaluation Suite via Galtea SDK...")
    eval_result = client.evaluations.run(
        version_id=version.id,
        agent=couchsync_bilingual_agent,
        specification_ids=[SPEC_ID]
    )
    
    eval_list = eval_result.get("evaluations", [])
    eval_ids = [e.id for e in eval_list]
    print(f"✅ Created {len(eval_ids)} evaluations across all custom metrics.")
    print(f"Test cases processed: {eval_result.get('testCaseCount')}")

    # 4. Polling Evaluations
    print("\n4. Polling evaluation statuses until completion...")
    start_poll = time.time()
    while True:
        statuses = []
        for eid in eval_ids:
            try:
                ev = client.evaluations.get(evaluation_id=eid)
                statuses.append(ev)
            except Exception as e:
                pass

        success_count = sum(1 for e in statuses if getattr(e, 'status', '') == 'SUCCESS')
        failed_count = sum(1 for e in statuses if getattr(e, 'status', '') == 'FAILED')
        pending_count = len(eval_ids) - (success_count + failed_count)

        elapsed = int(time.time() - start_poll)
        print(f"   [Poll +{elapsed}s] Total: {len(eval_ids)} | Success: {success_count} | Pending: {pending_count} | Failed: {failed_count}")

        if success_count + failed_count >= len(eval_ids) and len(eval_ids) > 0:
            break
        time.sleep(5)

    # 5. Summarize Results
    print("\n==================================================================")
    print("📊 BILINGUAL SPECIFICATION EVALUATION RESULTS")
    print("==================================================================\n")

    metric_totals = {}
    for ev in statuses:
        m_name = getattr(ev, 'metric_name', None) or getattr(ev, 'name', 'Unknown Metric')
        score = getattr(ev, 'score', 0.0) or 0.0
        
        # In some schemas score can be float 0..1 or 0..100
        if m_name not in metric_totals:
            metric_totals[m_name] = {"scores": [], "reasons": []}
        metric_totals[m_name]["scores"].append(score)
        if getattr(ev, 'reason', None):
            metric_totals[m_name]["reasons"].append(ev.reason)

    print("SUMMARY METRICS:")
    all_passed = True
    summary_results = {}
    for m_name, data in metric_totals.items():
        avg_score = (sum(data["scores"]) / len(data["scores"])) * 100 if data["scores"] else 0.0
        passed = avg_score >= 90.0
        if not passed:
            all_passed = False
        status_symbol = "✅ PASSED (>90%)" if passed else "❌ FAILED (<90%)"
        print(f" • {m_name:<45}: {avg_score:6.2f}% ({sum(data['scores'])}/{len(data['scores'])} points) -> {status_symbol}")
        summary_results[m_name] = {
            "score_pct": avg_score,
            "points": f"{sum(data['scores'])}/{len(data['scores'])}",
            "passed": passed
        }

    print("\nSAMPLE EVALUATION REASONS FROM JUDGES:\n")
    for m_name, data in metric_totals.items():
        if data["reasons"]:
            score_val = data["scores"][0] if data["scores"] else 0.0
            print(f"[{m_name}] Score: {score_val}")
            print(f"Reason: {data['reasons'][0][:300]}...\n")

    # Save summary artifact
    with open("bilingual_eval_results_summary.json", "w", encoding="utf-8") as f:
        json.dump({
            "product_id": PRODUCT_ID,
            "specification_id": SPEC_ID,
            "dataset_id": DATASET_ID,
            "version_id": version.id,
            "version_name": version_name,
            "metrics": summary_results,
            "all_passed": all_passed
        }, f, indent=2)

    print("==================================================================")
    if all_passed:
        print("🎉 CERTIFICATION SUCCESSFUL! All bilingual metrics achieved >90% target!")
    else:
        print("ℹ️ Audit complete. Review individual metrics above.")
    print("==================================================================")

if __name__ == "__main__":
    main()
