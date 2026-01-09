from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def start_static_server():
    handler = partial(SimpleHTTPRequestHandler, directory=str(PROJECT_ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def stop_static_server(server):
    server.shutdown()
    server.server_close()


def test_firebase_status_and_login_display():
    playwright = pytest.importorskip("playwright.sync_api")
    expect = playwright.expect
    sync_playwright = playwright.sync_playwright
    server, port = start_static_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(
                f"http://127.0.0.1:{port}/index.html?testMode=1&testUserEmail=playwright@example.com",
                wait_until="networkidle",
            )
            expect(page.get_by_test_id("app-shell")).to_be_visible()
            expect(page.get_by_test_id("firebase-status")).to_contain_text("測試模式")
            expect(page.get_by_test_id("user-display-name")).to_have_text("playwright")
            browser.close()
    finally:
        stop_static_server(server)
