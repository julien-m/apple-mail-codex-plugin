---
name: setup
description: Check the Apple Mail plugin connection, its iCloud service, and management permissions without sending or moving email.
---

# Apple Mail connection

1. Inspect the current catalog and call the plugin tool whose suffix is `mail_accounts_list`.
2. If it returns the expected account, check `mail_accounts_capabilities`, `mail_accounts_syncStatus`, and `mail_mailboxes_list` with its ID.
3. Report partial coverage. An initial page without messages does not prove that the mailbox is empty.
4. Search for a message with `mail_messages_search`, then read it only if relevant to the request. Do not send or classify email during this connection check.
5. If the service is unavailable or tools are missing, read the [installation guide](../../README.md) and identify the step actually blocked. Do not substitute another email provider for the account.
6. Enter secrets locally with `creds`; never include values in messages, logs, or plugin files. Do not request authorization again for the same previously authorized operation.
