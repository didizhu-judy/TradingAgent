"""
Local proxy for Trading 212 API (avoids CORS when extension calls from browser).
Set env: API_KEY, API_SECRET, ENVIRONMENT=live|demo. Default port 8765.
"""
import os
import base64
import requests
from flask import Flask, request, Response

app = Flask(__name__)

BASE = {
    "live": "https://live.trading212.com/api/v0",
    "demo": "https://demo.trading212.com/api/v0",
}


def get_auth_header():
    key = os.environ.get("API_KEY", "").strip()
    secret = os.environ.get("API_SECRET", "").strip()
    if not key or not secret:
        return None
    raw = f"{key}:{secret}"
    enc = base64.b64encode(raw.encode("utf-8")).decode("ascii")
    return f"Basic {enc}"


@app.route("/equity/<path:subpath>", methods=["GET", "POST", "DELETE"])
def proxy(subpath):
    env = os.environ.get("ENVIRONMENT", "demo").strip().lower()
    if env != "live":
        env = "demo"
    base = BASE[env]
    path = f"/equity/{subpath}"
    url = f"{base}{path}"
    auth = get_auth_header()
    if not auth:
        return {"error": "API_KEY and API_SECRET must be set"}, 500
    headers = {"Authorization": auth, "Content-Type": "application/json"}
    try:
        if request.method == "POST":
            r = requests.post(url, headers=headers, data=request.get_data(), params=request.args, timeout=15)
        elif request.method == "DELETE":
            r = requests.delete(url, headers=headers, params=request.args, timeout=15)
        else:
            r = requests.get(url, headers=headers, params=request.args, timeout=15)
        resp = Response(r.content, status=r.status_code)
        resp.headers["Content-Type"] = "application/json"
        return resp
    except Exception as e:
        return {"error": str(e)}, 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8765))
    app.run(host="127.0.0.1", port=port, debug=False)
