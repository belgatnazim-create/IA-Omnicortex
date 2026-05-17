# Templates de prompts

Ce fichier contient des modèles de prompts pour les agents d'Omnicortex.

## Modèle : Résumé de texte
- Objectif : Résumer un texte long en 3 à 5 phrases.
- Prompt : "Résume le texte suivant en 3 à 5 phrases claires et neutres :\n\n{{text}}"

## Modèle : Extraction d'entités
- Objectif : Extraire les personnes, organisations, dates et lieux.
- Prompt : "À partir du texte suivant, liste les personnes, organisations, dates et lieux mentionnés sous forme de JSON :\n\n{{text}}"

## Modèle : Génération d'actions
- Objectif : Proposer des actions concrètes à partir d'une analyse.
- Prompt : "Analyse le texte suivant et propose 5 actions concrètes, classées par priorité et avec des estimations de temps :\n\n{{text}}"

## Instructions d'utilisation
- Remplacez `{{text}}` par le contenu à traiter.
- Adaptez le ton et la longueur selon le contexte (ex : formel, familier, technique).
