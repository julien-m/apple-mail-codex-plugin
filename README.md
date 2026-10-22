# Apple Mail

Local plugin for using iCloud Mail in Codex. It connects through the independent `mail-api-service` HTTP/MCP backend rather than Mail.app. The management profile supports reading, drafts, replies, sending, attachments, tags, rules, and organizing messages and folders, including junk mail and trash.

## Installation

Requirements: macOS, Node.js 22+, the `creds` CLI, and an already configured `mail-api-service` instance. The server and database run separately; this package does not bundle them. An active worker is required to process submitted deliveries.

Create a private `~/Library/Application Support/apple-mail/config.json` file with permissions `600`. Set `version: 1`, `serviceRoot` (the absolute service path), `envFile` (the absolute MCP environment file path), and `credsCommand` (the absolute `creds` executable path). This configuration contains paths, not secrets.

The MCP environment must contain exactly `MAIL_API_URL` and `MAIL_API_TOKEN`. The token must be a `creds:namespace/env/name` reference. HTTP is allowed only on loopback; remote servers require HTTPS. The iCloud password stays in the backend's private environment and is never included in this plugin.

From this repository:

```bash
codex plugin marketplace add .
codex plugin add apple-mail@apple-mail-local
```

Open a new Codex conversation and select Apple Mail. Reload the application if the catalog has not refreshed. Read the [connection skill](skills/setup/SKILL.md) for the initial check. Local installation does not publish the plugin in a public directory and does not require a `plugin_asdk_app` identifier.

## Usage and limitations

Ask Apple Mail to prepare a reply, create a folder, move messages, or classify messages as junk. The `mail_…` tools come from the MCP server packaged with the plugin. The backend token determines the actual permissions; the plugin does not elevate privileges.

The management token uses `mail:read`, `mail:write`, `mail:send`, `mail:rules`, and `mail:purge`, restricted to the configured account. Permanent deletion requires a validated plan and an explicit request; moving to trash is a separate action. Sending follows draft → preparation → submission → worker processing; inspect the final delivery state.

A partial synchronization does not mean an empty mailbox. Local Mail.app folders, native Apple rules, and training Apple's spam filter are unsupported. This third-party plugin is neither provided by nor affiliated with Apple. Gmail tools remain separate.

## Verification

Run `bun run test` and `bun run check`. These tests verify credential-reference protection and transparent stdin/stdout forwarding without using a personal account. Then verify the installed package against its actual backend with an MCP client. Installation alone does not prove an iCloud connection.

Read the [official packaging documentation](https://developers.openai.com/plugins/build/plugins) for the package format and local marketplace.
