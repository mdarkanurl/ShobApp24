# Repository event

## Description
This folder contains the logic for handling the repository event. A repository event has nine actions: deleted, created, archived, unarchived, edited, renamed, renamed, publicized and privatized. When user creates a repository, GitHub sends a “created” event with relevant data, and when user removes a repository, GitHub sends a “deleted” event. Other action GitHub sends when any update happened.

## How it works
- Check if the user is subscribed to the repository event by querying the workflow table.
- If the user is subscribed, fetch all actions associated with the workflow. Otherwise, call `act()` with the message.
- After retrieving all actions, execute them sequentially.
- At the end of the process, call `act()` or `nact()` depending on the outcome.

**Note:** If an action fails to execute, then the subsequent actions that are supposed to run after it will not execute.

## Supported actions
All created, deleted, archived, unarchived, edited, renamed, renamed, publicized and privatized:
- `send-email` action allows send email to any email address with repo data or whitout repo data

## Contributing
Contributions, issues, and feature requests are welcome!
If you want to contribute to ShobApp24, please follow the guidelines outlined in the [contributing.md](../../../../../../contributing.md) file.

## License
ShobApp24 is licensed under the MIT License - see the [LICENSE](../../../../../../LICENSE) file for details.
