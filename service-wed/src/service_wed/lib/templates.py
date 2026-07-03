"""Renders email templates. The only file that knows Jinja2 lives on disk
under templates/email/ — adapters call render(), nothing else."""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def render(template_key: str, context: dict[str, Any]) -> str:
    """`template_key` maps to templates/email/{template_key}.html"""
    template = _env.get_template(f"{template_key}.html")
    return template.render(**context)
