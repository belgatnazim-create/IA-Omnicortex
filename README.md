# Omnicortex

Dépôt minimal contenant des ressources pour agents et prompts.

## Nouveautés
- Ajout du dossier `agents/` contenant :
	- `prompt_templates.md` — modèles de prompts réutilisables
	- `simple_agent.js` — agent Node.js minimal pour tests locaux

## Utilisation rapide
Installer Node.js si nécessaire, puis exécuter :

```bash
node agents/simple_agent.js resume "Votre texte ici..."
```

ou pour utiliser un template personnalisé :

```bash
node agents/simple_agent.js "Mon prompt personnalisé : {{text}}" "Le texte à analyser"
```

## Export CSV / Google Sheets
Pour générer un export structuré après quiz :

```bash
node agents/simple_agent.js quiz "les volcans" --export csv --score 85 --time 15 --status réussi --notes "Test local" --student "Jean Dupont jean@example.com quartier Belleville 29 ans"
```

Pour tester l'authentification Google Sheets :

```bash
node agents/simple_agent.js --check-sheets-auth --spreadsheet your_spreadsheet_id_here
```

Pour exporter directement vers une feuille Google Sheets :

```bash
node agents/simple_agent.js quiz "les volcans" --export sheets --score 90 --time 20 --status réussi --student "Test Anonyme" --spreadsheet your_spreadsheet_id_here --sheet-name Sheet1
```

Si `SHEETS_SPREADSHEET_ID` est défini dans `.env`, vous pouvez vous passer du flag `--spreadsheet`.

## Prochaines étapes recommandées
- Brancher un vrai appel à une API LLM dans `agents/simple_agent.js`.
- Ajouter des tests et exemples de prompts.
