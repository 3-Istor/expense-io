---
id: T-0025
title: "Le RH n'a pas de liste des notes à rembourser"
status: todo
risk: 2
source: session
created: 2026-10-30
links: [T-0014]
---

## Contexte

Vu pendant la répétition 4 : `POST /api/hr/expense-notes/{id}/reimburse` marque une note remboursée, mais aucune route
ne liste les notes `approved` de l'entreprise. `GET /api/hr/expense-notes` ne renvoie que les notes en attente des
auteurs sans manager. Le RH doit connaître l'identifiant par un autre moyen.

## Critères d'acceptation

- [ ] Nouvelle opération du contrat (mineure) qui liste les notes `approved` des autres membres de l'entreprise du RH,
      plus anciennes d'abord ; test d'API et ligne de la matrice d'autorisations (RH d'une autre entreprise : rien).
