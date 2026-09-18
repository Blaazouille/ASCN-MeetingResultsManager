"""
Appelle l'API Claude avec le diff de la PR et les règles du projet,
puis poste le résultat comme commentaire GitHub.
Appelé par : .github/workflows/code-review.yml
Suppression casserait : la revue de code automatique sur les PRs.
"""
import json
import os
import sys
import urllib.request

import anthropic

MAX_DIFF_CHARS = 100_000  # ~25k tokens — limite raisonnable pour un diff de PR
MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """Tu es un reviewer senior sur le projet ASCN-MeetingResultsManager
(Electron + React 18 + TypeScript strict + Tailwind CSS + SQLite).
Tu reçois un git diff et les règles du projet (KISS, DRY, YAGNI, 300 lignes max par fichier, etc.).
Réponds en français avec un rapport markdown structuré :
1. Résumé en une phrase (🟢 rien de bloquant / 🔴 N blocants / 🟡 N avertissements)
2. Issues bloquantes 🚫 (avec référence fichier:ligne si possible)
3. Avertissements ⚠️ (non bloquants mais à corriger)
4. Checklist des règles PR (✅ OK / ❌ échoue / ⏭️ non vérifiable depuis le diff)
Sois concis et actionnable. Ne répète pas le code, cite juste les patterns problématiques."""


def post_comment(repo: str, pr_number: str, token: str, body: str) -> None:
    data = json.dumps({"body": body}).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status != 201:
            print(f"Erreur GitHub API : {resp.status}", file=sys.stderr)
            sys.exit(1)


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY non définie — revue ignorée")
        sys.exit(0)

    with open("pr.diff", encoding="utf-8", errors="replace") as f:
        diff = f.read()

    with open("rules.md", encoding="utf-8") as f:
        rules = f.read()

    if not diff.strip():
        print("Diff vide — rien à analyser")
        sys.exit(0)

    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[... diff tronqué — fichiers volumineux non inclus ...]"

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"## Règles du projet\n\n{rules}\n\n## Diff à analyser\n\n```diff\n{diff}\n```",
            }
        ],
    )

    review_text = response.content[0].text
    comment = (
        "## 🤖 Revue automatique\n\n"
        + review_text
        + "\n\n---\n*Généré par Claude — à valider par un humain avant merge.*"
    )

    post_comment(
        repo=os.environ["REPO"],
        pr_number=os.environ["PR_NUMBER"],
        token=os.environ["GITHUB_TOKEN"],
        body=comment,
    )
    print("✅ Commentaire de revue posté")


if __name__ == "__main__":
    main()
