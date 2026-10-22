---
name: setup
description: Vérifier la connexion du plugin Apple Mail, son service iCloud et son profil de lecture sans envoyer ni déplacer d’email.
---

# Connexion Apple Mail

1. Consulte le catalogue courant et appelle l’outil du plugin dont le suffixe est `mail_accounts_list`.
2. S’il retourne le compte attendu, vérifie `mail_accounts_capabilities`, `mail_accounts_syncStatus` et `mail_mailboxes_list` avec son ID.
3. Signale la couverture partielle. Une première page sans message ne prouve pas que la boîte est vide.
4. Recherche un message avec `mail_messages_search` puis lis-le seulement si cela répond à la demande. N’envoie ni ne classe un email pendant ce contrôle de connexion.
5. Si le service est indisponible ou si les outils manquent, lis le [guide d’installation](../../README.md) et indique l’étape réellement bloquée. Ne remplace pas le compte par une autre messagerie.
6. Les secrets sont saisis localement avec `creds` ; aucune valeur dans les messages, logs ou fichiers du plugin. Ne redemande pas une autorisation déjà donnée pour la même opération.
