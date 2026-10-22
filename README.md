# Apple Mail

Plugin local pour utiliser iCloud Mail dans Codex. Le moteur reste le service HTTP/MCP `mail-api-service`, indépendant de Mail.app. Le profil de test permet la lecture, la recherche et la synchronisation locale ; aucun envoi ni classement n’est autorisé par le token installé.

## Installation

Prérequis : macOS, Node.js 22+, le CLI `creds`, et une instance déjà configurée de `mail-api-service`. Le serveur et sa base restent des processus séparés du plugin ; ce paquet ne les embarque pas et ne démarre pas de worker d’envoi.

Crée un fichier privé `~/Library/Application Support/apple-mail/config.json` de permissions `600`. Renseigne `version: 1`, `serviceRoot` (chemin absolu du service), `envFile` (chemin absolu de son environnement MCP) et `credsCommand` (chemin absolu du CLI creds). Ce fichier contient des chemins, aucun secret.

L’environnement MCP contient exactement `MAIL_API_URL` et `MAIL_API_TOKEN`. La valeur du token doit être une référence `creds:namespace/env/nom`. Une URL HTTP est acceptée sur la boucle locale ; un serveur distant exige HTTPS. Le mot de passe iCloud reste dans l’environnement privé du service, jamais dans ce plugin.

Depuis ce dépôt :

```bash
codex plugin marketplace add .
codex plugin add apple-mail@apple-mail-local
```

Ouvre ensuite une nouvelle conversation Codex et sélectionne le plugin Apple Mail. Si le catalogue n’a pas été rafraîchi, recharge l’application. Lis le [skill de connexion](skills/setup/SKILL.md) pour le contrôle initial. L’installation locale ne publie rien dans un annuaire public et ne nécessite pas d’identifiant `plugin_asdk_app`.

## Utilisation et limites

Demande par exemple à Apple Mail de lister les dossiers ou de rechercher des emails iCloud. Les outils `mail_…` proviennent du MCP embarqué dans le paquet. Le token serveur conserve l’autorité réelle ; le plugin n’élève aucun droit.

Une synchronisation partielle n’est pas une boîte vide. Les dossiers locaux de Mail.app, les règles Apple natives et l’apprentissage du filtre spam Apple ne sont pas pris en charge. Ce plugin tiers n’est ni fourni ni affilié à Apple. Les outils Gmail restent séparés.

## Vérification

Exécute `bun run test` et `bun run check`. Les tests prouvent la protection des références et la transparence de stdin/stdout ; ils n’utilisent pas de compte personnel. Vérifie ensuite le paquet installé avec un client MCP et son service réel. Ne considère pas une installation comme une preuve de connexion à iCloud.

Lis la [documentation officielle de packaging](https://developers.openai.com/plugins/build/plugins) pour le format du paquet et le marketplace local.
