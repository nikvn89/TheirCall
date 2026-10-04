"""
Golden id vectors shared with the frontend (tests/js/ids.test.ts reads the same
file). Ids are computed by the contract code itself on the real SDK Keccak256.

Regenerate:  WRITE_VECTORS=1 python3 -m pytest tests/contract/test_id_vectors.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = ROOT / "tests" / "js" / "id-vectors.json"
CONTRACT = str(ROOT / "contracts" / "WhoElects.py")

AUTHOR = "0x3065e31b1d993d7c0d59e6786844cba56780b2d3"
TEXTS = [
    "Either grade of material is open to us.",
    "Either grade of material is open to you.",
    "We may deliver to you in one shipment or in several.",
    "You may require the work on site or remotely.",
    "  The Buyer may call\tfor delivery\nin one shipment or in several.  ",
    "\u001cWe decide which of the two routes is taken.\u001f",
    "Payment\u0085may\u001dbe taken\u001eby card.",
    "\ufeffThe pick is ours.",
    "Livraison — au choix\u3000de l'acheteur. \U0001F69A",
]


def build(contract):
    rows = []
    for t in TEXTS:
        norm = contract._normalize_text(t.strip())
        rows.append({"text": t, "normalized": norm, "py_len": len(norm),
                     "option_id": contract._option_id_for(AUTHOR, norm)})
    return {"author": AUTHOR, "options": rows}


def test_vectors_match_contract(direct_deploy):
    data = build(direct_deploy(CONTRACT))
    if os.environ.get("WRITE_VECTORS") == "1":
        VECTORS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(VECTORS.read_text(encoding="utf-8")) == data
