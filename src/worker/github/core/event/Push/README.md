# Push event

## Description
This folder contains the logic for handling the push event. A push event is triggered when one or more commits are pushed to a branch. GitHub sends this event with repository, branch, commit, pusher, and sender information.

## How it works
- Check if the user is subscribed to the push event by querying the workflow table.
- If the user is subscribed, fetch all actions associated with the workflow. Otherwise, return success.
- Create a workflow run entry and execute all actions sequentially.
- At the end of the process, update the workflow run status as `Succeeded` or `Failed`.

**Note:** If an action fails to execute, then the subsequent actions that are supposed to run after it will not execute.

## Supported actions
Push event:
- `send_email` action allows sending email to any email address with push info and optional AI analytics.
- `send_email_to_me` action allows sending email to user email address with push info and optional AI analytics.
- `send_email_to_who_push_the_commit` action allows sending email to the pusher email address.
- `webhook` action allows calling a webhook URL with push payload data.
- `send_telegram` action is currently not implemented.

## Contributing
Contributions, issues, and feature requests are welcome!
If you want to contribute to ShobApp24, please follow the guidelines outlined in the [contributing.md](../../../../../../contributing.md) file.

## License
ShobApp24 is licensed under the MIT License - see the [LICENSE](../../../../../../LICENSE) file for details.
