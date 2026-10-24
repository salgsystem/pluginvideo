"""Avalia uma expressão JS na página (ex.: python peek.py "SH.ideias.raw")."""
import sys
from playwright.sync_api import sync_playwright
from render import open_page
with sync_playwright() as pw:
    b, p = open_page(pw)
    for e in sys.argv[1:]: print(e, '=>', p.evaluate(e))
    b.close()
